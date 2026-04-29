import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { db, pricingPlansTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
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

function mapRow(r: typeof pricingPlansTable.$inferSelect) {
  return {
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
  };
}

router.get("/pricing/plans", async (_req, res) => {
  const rows = await db
    .select()
    .from(pricingPlansTable)
    .orderBy(asc(pricingPlansTable.sortOrder));
  res.json(rows.map(mapRow));
});

const PlanBody = z.object({
  name: z.string().trim().min(1).max(100),
  tagline: z.string().trim().min(1).max(200),
  priceMonthly: z.number().int().nonnegative(),
  priceUnit: z.string().trim().min(1).max(50).default("USD/month"),
  description: z.string().trim().min(1).max(2000),
  features: z.array(z.string().trim().min(1)).default([]),
  ctaLabel: z.string().trim().min(1).max(60).default("Get started"),
  highlighted: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

router.post("/admin/pricing/plans", requireAdmin, async (req, res, next) => {
  try {
    const body = PlanBody.parse(req.body);
    const [row] = await db
      .insert(pricingPlansTable)
      .values(body)
      .returning();
    res.status(201).json(mapRow(row));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    next(err);
  }
});

router.put("/admin/pricing/plans/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = PlanBody.partial().parse(req.body);
    const [row] = await db
      .update(pricingPlansTable)
      .set(body)
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(mapRow(row));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    next(err);
  }
});

router.delete("/admin/pricing/plans/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .delete(pricingPlansTable)
      .where(eq(pricingPlansTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
