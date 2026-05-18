import { Router, type IRouter, type Request, type Response} from "express";
import { z } from "zod";
import { db, pressMentionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";

const MentionBody = z.object({
  title: z.string().trim().min(1).max(500),
  publication: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2000),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "year must be a 4-digit string e.g. '2026'"),
  excerpt: z.string().trim().max(500).nullish(),
  logoUrl: z.string().trim().url().max(2000).nullish(),
  category: z.enum(["trade-press", "national", "industry-blog", "podcast", "award"]).nullish(),
  sortOrder: z.number().int().default(0),
});

const router: IRouter = Router();

router.get("/press-mentions", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(pressMentionsTable)
      .orderBy(asc(pressMentionsTable.sortOrder), asc(pressMentionsTable.createdAt));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/press-mentions", requireAdmin, async (req, res, next) => {
  try {
    const parsed = MentionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const [row] = await db
      .insert(pressMentionsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/press-mentions/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = MentionBody.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const [row] = await db
      .update(pressMentionsTable)
      .set(parsed.data)
      .where(eq(pressMentionsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/press-mentions/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(pressMentionsTable).where(eq(pressMentionsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
