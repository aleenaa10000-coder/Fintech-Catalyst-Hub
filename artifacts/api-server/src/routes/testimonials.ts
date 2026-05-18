import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db, testimonialsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import { logger } from "../lib/logger";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const email = (req.user as { email?: string } | undefined)?.email;
  if (!email || !isAdminEmail(email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  quote: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5).default(5),
  sortOrder: z.number().int().default(0),
});

const updateSchema = createSchema.partial();

const router: IRouter = Router();

router.get("/testimonials", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(testimonialsTable)
      .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.createdAt));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to fetch testimonials");
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.post("/admin/testimonials", requireAdmin, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const [row] = await db.insert(testimonialsTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create testimonial");
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

router.patch("/admin/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const [row] = await db
      .update(testimonialsTable)
      .set(parsed.data)
      .where(eq(testimonialsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to update testimonial");
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

router.delete("/admin/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .delete(testimonialsTable)
      .where(eq(testimonialsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Failed to delete testimonial");
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

export default router;
