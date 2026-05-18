import { Router, type IRouter, type NextFunction } from "express";
import { db, siteStatsTable } from "@workspace/db";
import { logger } from "../lib/logger";

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

export default router;
