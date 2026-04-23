import { Router, type IRouter } from "express";
import { db, pricingPlansTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/pricing/plans", async (_req, res) => {
  const rows = await db
    .select()
    .from(pricingPlansTable)
    .orderBy(asc(pricingPlansTable.sortOrder));
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      tagline: r.tagline,
      priceMonthly: r.priceMonthly,
      priceUnit: r.priceUnit,
      description: r.description,
      features: r.features ?? [],
      ctaLabel: r.ctaLabel,
      highlighted: r.highlighted,
      sortOrder: r.sortOrder,
    })),
  );
});

export default router;
