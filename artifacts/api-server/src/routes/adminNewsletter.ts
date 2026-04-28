import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadDetail() {
  const rows = await db
    .select({
      id: newsletterSubscribersTable.id,
      email: newsletterSubscribersTable.email,
      createdAt: newsletterSubscribersTable.createdAt,
      source: newsletterSubscribersTable.source,
    })
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.createdAt));

  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  since90d.setUTCHours(0, 0, 0, 0);

  const last30DayCount = rows.filter((r) => r.createdAt >= since30d).length;
  const last7DayCount = rows.filter((r) => r.createdAt >= since7d).length;

  // Build daily signup buckets: zero-filled for the last 90 calendar days (UTC).
  const buckets = new Map<string, number>();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(utcDayKey(d), 0);
  }
  for (const r of rows) {
    if (r.createdAt < since90d) continue;
    const k = utcDayKey(r.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }

  return {
    totalCount: rows.length,
    last30DayCount,
    last7DayCount,
    latestSubscribedAt: rows[0]?.createdAt?.toISOString() ?? null,
    subscribers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      source: r.source,
    })),
    dailySignups: Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
}

router.get("/admin/newsletter/subscribers", requireAdmin, async (_req, res) => {
  const detail = await loadDetail();
  res.json(detail);
});

// CSV export — served outside OpenAPI (binary-ish response). Same auth gate.
router.get(
  "/admin/newsletter/subscribers.csv",
  requireAdmin,
  async (_req, res) => {
    const detail = await loadDetail();

    const header = ["email", "subscribed_at", "source"].join(",");
    const lines = detail.subscribers.map((s) =>
      [
        escapeCsv(s.email),
        escapeCsv(s.createdAt),
        escapeCsv(s.source ?? ""),
      ].join(","),
    );
    const body = [header, ...lines].join("\n") + "\n";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(body);
  },
);

export default router;
