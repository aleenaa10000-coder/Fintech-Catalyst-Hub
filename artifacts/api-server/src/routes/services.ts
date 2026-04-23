import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/services", async (_req, res) => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.id));
  res.json(
    rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      deliverables: r.deliverables ?? [],
      icon: r.icon,
    })),
  );
});

export default router;
