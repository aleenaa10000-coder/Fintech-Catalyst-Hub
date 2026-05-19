import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, toolRatingsTable } from "@workspace/db";
import { eq, avg, count, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";
import { ratingRateLimiter } from "../lib/rateLimiter";
import { logger } from "../lib/logger";

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
  try {
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
  } catch (err) {
    logger.error({ err, slug }, "toolRatings: failed to fetch ratings");
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

const RatingBody = z.object({
  rating: z.number().int().min(1).max(5),
});

router.post("/tools/:slug/ratings", ratingRateLimiter, async (req: Request, res: Response) => {
  const slug = req.params["slug"] as string;
  if (!VALID_TOOL_SLUGS.has(slug)) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  const parsed = RatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    return;
  }
  try {
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
  } catch (err) {
    logger.error({ err, slug }, "toolRatings: failed to insert rating");
    res.status(500).json({ error: "Failed to save rating" });
  }
});

router.get("/admin/tools/ratings/summary", requireAdmin, async (_req: Request, res: Response) => {
  try {
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
  } catch (err) {
    logger.error({ err }, "toolRatings: failed to fetch admin summary");
    res.status(500).json({ error: "Failed to fetch ratings summary" });
  }
});

export default router;
