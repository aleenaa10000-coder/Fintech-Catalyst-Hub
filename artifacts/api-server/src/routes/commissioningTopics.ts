import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, commissioningTopicsTable } from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import { CreateCommissioningTopicBody } from "@workspace/api-zod";
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

function serialize(row: typeof commissioningTopicsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    angle: row.angle ?? "",
    category: row.category ?? "",
    priority: row.priority,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/commissioning-topics", async (_req, res) => {
  const rows = await db
    .select()
    .from(commissioningTopicsTable)
    .where(eq(commissioningTopicsTable.isActive, true))
    .orderBy(asc(commissioningTopicsTable.priority), desc(commissioningTopicsTable.createdAt));
  res.json(rows.map(serialize));
});

router.get("/admin/commissioning-topics", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(commissioningTopicsTable)
    .orderBy(asc(commissioningTopicsTable.priority), desc(commissioningTopicsTable.createdAt));
  res.json(rows.map(serialize));
});

router.post("/admin/commissioning-topics", requireAdmin, async (req, res) => {
  const parsed = CreateCommissioningTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const [row] = await db
    .insert(commissioningTopicsTable)
    .values({
      title: body.title,
      angle: body.angle ?? "",
      category: body.category ?? "",
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to create" });
    return;
  }
  res.json(serialize(row));
});

router.patch("/admin/commissioning-topics/:id", requireAdmin, async (req, res) => {
  const id = Number.parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = CreateCommissioningTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const [row] = await db
    .update(commissioningTopicsTable)
    .set({
      title: body.title,
      angle: body.angle ?? "",
      category: body.category ?? "",
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
    })
    .where(eq(commissioningTopicsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  res.json(serialize(row));
});

router.delete("/admin/commissioning-topics/:id", requireAdmin, async (req, res) => {
  const id = Number.parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(commissioningTopicsTable).where(eq(commissioningTopicsTable.id, id));
  res.status(204).end();
});

export default router;
