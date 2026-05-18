import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, toolRatingsTable } from "@workspace/db";
import { eq, avg, count, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const VALID_TOOL_SLUGS = new Set([
  "financial-health-score-calculator",
  "meta-description-generator",
  "guest-post-pitch-generator",
  "readability-checker",
  "keyword-difficulty-estimator",
  "backlink-value-estimator",
  "content-brief-generator",
  "headline-analyzer",
  "link-prospector",
  "outreach-email-generator",
]);

router.get("/tools/:slug/ratings", async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  if (!VALID_TOOL_SLUGS.has(slug)) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  const rows = await db
    .select({
      ratingValue: avg(toolRatingsTable.rating),
      ratingCount: count(toolRatingsTable.id),
    })
    .from(toolRatingsTable)
    .where(eq(toolRatingsTable.toolSlug, slug));
  const row = rows[0];
  res.json({
    toolSlug: slug,
    ratingValue: row?.ratingValue ? parseFloat(Number(row.ratingValue).toFixed(1)) : null,
    ratingCount: Number(row?.ratingCount ?? 0),
  });
});

const RatingBody = z.object({
  rating: z.number().int().min(1).max(5),
});

router.post("/tools/:slug/ratings", async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  if (!VALID_TOOL_SLUGS.has(slug)) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  const parsed = RatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }
  await db.insert(toolRatingsTable).values({ toolSlug: slug, rating: parsed.data.rating });

  const rows = await db
    .select({
      ratingValue: avg(toolRatingsTable.rating),
      ratingCount: count(toolRatingsTable.id),
    })
    .from(toolRatingsTable)
    .where(eq(toolRatingsTable.toolSlug, slug));
  const row = rows[0];
  res.status(201).json({
    toolSlug: slug,
    ratingValue: row?.ratingValue ? parseFloat(Number(row.ratingValue).toFixed(1)) : null,
    ratingCount: Number(row?.ratingCount ?? 0),
  });
});

router.get("/admin/tools/ratings/summary", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      toolSlug: toolRatingsTable.toolSlug,
      ratingValue: avg(toolRatingsTable.rating),
      ratingCount: count(toolRatingsTable.id),
    })
    .from(toolRatingsTable)
    .groupBy(toolRatingsTable.toolSlug)
    .orderBy(sql`count(${toolRatingsTable.id}) desc`);
  res.json(
    rows.map((r) => ({
      toolSlug: r.toolSlug,
      ratingValue: r.ratingValue ? parseFloat(Number(r.ratingValue).toFixed(1)) : null,
      ratingCount: Number(r.ratingCount),
    }))
  );
});

export default router;
