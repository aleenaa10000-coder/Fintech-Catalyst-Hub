import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { db, siteStatsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdmin } from "../lib/routeHelpers";
import { z } from "zod";

const router: IRouter = Router();

router.get("/stats/trust", async (_req, res, next: NextFunction) => {
  try {
    const [row] = await db.select().from(siteStatsTable).limit(1);
    if (!row) {
      res.json({
        clientsServed: 0,
        articlesPublished: 0,
        backlinksAcquired: 0,
        averageDomainRating: 0,
      });
      return;
    }
    res.json({
      clientsServed: row.clientsServed,
      articlesPublished: row.articlesPublished,
      backlinksAcquired: row.backlinksAcquired,
      averageDomainRating: row.averageDomainRating,
    });
  } catch (err) {
    logger.error({ err }, "stats: failed to fetch trust stats");
    next(err);
  }
});

const patchStatsSchema = z.object({
  clientsServed: z.number().int().min(0).optional(),
  articlesPublished: z.number().int().min(0).optional(),
  backlinksAcquired: z.number().int().min(0).optional(),
  averageDomainRating: z.number().int().min(0).max(100).optional(),
});

router.patch(
  "/admin/stats",
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = patchStatsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
      }

      const updates = parsed.data;
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const [existing] = await db.select().from(siteStatsTable).limit(1);

      if (!existing) {
        await db.insert(siteStatsTable).values({
          clientsServed: updates.clientsServed ?? 0,
          articlesPublished: updates.articlesPublished ?? 0,
          backlinksAcquired: updates.backlinksAcquired ?? 0,
          averageDomainRating: updates.averageDomainRating ?? 0,
        });
      } else {
        await db.update(siteStatsTable).set(updates);
      }

      const [row] = await db.select().from(siteStatsTable).limit(1);
      res.json({
        clientsServed: row!.clientsServed,
        articlesPublished: row!.articlesPublished,
        backlinksAcquired: row!.backlinksAcquired,
        averageDomainRating: row!.averageDomainRating,
      });
    } catch (err) {
      logger.error({ err }, "stats: failed to update trust stats");
      next(err);
    }
  },
);

export default router;
