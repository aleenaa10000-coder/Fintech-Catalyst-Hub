import { Router, type IRouter } from "express";
import { db, testimonialsTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/testimonials", async (_req, res) => {
  const rows = await db.select().from(testimonialsTable).orderBy(asc(testimonialsTable.id));
  res.json(rows);
});

export default router;
