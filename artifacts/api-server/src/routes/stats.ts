import { Router, type IRouter } from "express";
import { db, siteStatsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/trust", async (_req, res) => {
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
});

export default router;
