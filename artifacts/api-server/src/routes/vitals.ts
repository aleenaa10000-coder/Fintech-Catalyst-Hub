import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, webVitalsTable } from "@workspace/db";
import { sql, gte, count } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated?.() || !isAdminEmail(req.user?.email)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const VitalsBody = z.object({
  name: z.enum(["LCP", "CLS", "INP", "FID", "TTFB"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number().finite().optional(),
  page: z.string().max(2000).default("/"),
});

/**
 * POST /api/vitals
 * Accepts a Core Web Vitals report from the browser (via useWebVitals hook).
 * Public endpoint — no auth required. sendBeacon-compatible.
 */
router.post("/vitals", async (req: Request, res: Response) => {
  const parsed = VitalsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid vitals payload" });
    return;
  }

  await db.insert(webVitalsTable).values({
    name: parsed.data.name,
    value: parsed.data.value,
    rating: parsed.data.rating,
    delta: parsed.data.delta ?? null,
    page: parsed.data.page.slice(0, 2000),
  });

  res.status(201).json({ ok: true });
});

/**
 * GET /api/admin/vitals/summary?days=30
 * Returns aggregated CWV metrics for the admin SEO dashboard.
 * Grouped by metric name and rating bucket.
 */
router.get(
  "/admin/vitals/summary",
  requireAdmin as (req: Request, res: Response, next: () => void) => void,
  async (req: Request, res: Response, next: (err?: unknown) => void) => {
    try {
      const days = Math.min(Number(req.query.days ?? 30), 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          name: webVitalsTable.name,
          rating: webVitalsTable.rating,
          cnt: count(),
          avg: sql<number>`round(avg(${webVitalsTable.value})::numeric, 2)`,
          p75: sql<number>`round(percentile_cont(0.75) within group (order by ${webVitalsTable.value})::numeric, 2)`,
        })
        .from(webVitalsTable)
        .where(gte(webVitalsTable.createdAt, since))
        .groupBy(webVitalsTable.name, webVitalsTable.rating);

      type RatingBucket = { count: number; avg: number; p75: number };
      const summary: Record<string, Record<string, RatingBucket>> = {};
      for (const row of rows) {
        if (!summary[row.name]) summary[row.name] = {};
        summary[row.name][row.rating] = {
          count: Number(row.cnt),
          avg: Number(row.avg),
          p75: Number(row.p75),
        };
      }

      const totals: Record<string, number> = {};
      for (const [name, ratings] of Object.entries(summary)) {
        totals[name] = Object.values(ratings).reduce((s, r) => s + r.count, 0);
      }

      res.json({ summary, totals, days, since: since.toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
