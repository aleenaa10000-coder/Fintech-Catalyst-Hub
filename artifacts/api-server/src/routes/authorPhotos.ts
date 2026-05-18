import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, authorPhotoOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const upsertSchema = z.object({
  photoUrl: z.string().min(1).max(2000),
});

const SLUG_RE = /^[a-z0-9-]{1,200}$/;

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

// Public — used by the website to merge overrides into the static authors map.
router.get("/author-photos", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        slug: authorPhotoOverridesTable.slug,
        photoUrl: authorPhotoOverridesTable.photoUrl,
      })
      .from(authorPhotoOverridesTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.slug] = r.photoUrl;
    res.json({ overrides: map });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/author-photos", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db.select().from(authorPhotoOverridesTable);
    res.json({ overrides: rows });
  } catch (err) {
    next(err);
  }
});

router.put("/admin/author-photos/:slug", requireAdmin, async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    if (!isValidSlug(slug)) {
      res.status(400).json({ error: "Invalid author slug" });
      return;
    }
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const [row] = await db
      .insert(authorPhotoOverridesTable)
      .values({
        slug,
        photoUrl: parsed.data.photoUrl,
        updatedBy: req.user?.email ?? null,
      })
      .onConflictDoUpdate({
        target: authorPhotoOverridesTable.slug,
        set: {
          photoUrl: parsed.data.photoUrl,
          updatedBy: req.user?.email ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ ok: true, override: row });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/author-photos/:slug", requireAdmin, async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    if (!isValidSlug(slug)) {
      res.status(400).json({ error: "Invalid author slug" });
      return;
    }
    const [removed] = await db
      .delete(authorPhotoOverridesTable)
      .where(eq(authorPhotoOverridesTable.slug, slug))
      .returning();
    if (!removed) {
      res.status(404).json({ error: "No override to remove" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
