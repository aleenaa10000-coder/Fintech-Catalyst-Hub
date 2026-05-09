import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { db, glossaryTermsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
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

const GlossaryTermBody = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
  term: z.string().min(1).max(200),
  shortDef: z.string().min(1).max(500),
  body: z.string().min(1),
  category: z.string().optional(),
  relatedTerms: z.array(z.string()).default([]),
});

const UpdateGlossaryTermBody = GlossaryTermBody.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field is required" },
);

router.get("/glossary", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(glossaryTermsTable)
      .orderBy(asc(glossaryTermsTable.term));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/glossary/:slug", async (req, res, next) => {
  try {
    const [row] = await db
      .select()
      .from(glossaryTermsTable)
      .where(eq(glossaryTermsTable.slug, req.params["slug"] ?? ""))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/glossary", requireAdmin, async (req, res, next) => {
  try {
    const body = GlossaryTermBody.parse(req.body);
    const [row] = await db.insert(glossaryTermsTable).values(body).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid body", issues: err.issues });
      return;
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      res.status(409).json({ error: "A term with this slug already exists" });
      return;
    }
    next(err);
  }
});

router.patch(
  "/admin/glossary/:slug",
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = UpdateGlossaryTermBody.parse(req.body);
      const [row] = await db
        .update(glossaryTermsTable)
        .set(body)
        .where(eq(glossaryTermsTable.slug, req.params["slug"] ?? ""))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid body", issues: err.issues });
        return;
      }
      next(err);
    }
  },
);

router.delete(
  "/admin/glossary/:slug",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [row] = await db
        .delete(glossaryTermsTable)
        .where(eq(glossaryTermsTable.slug, req.params["slug"] ?? ""))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ ok: true, deleted: row });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
