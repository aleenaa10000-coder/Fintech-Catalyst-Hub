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
import { logger } from "../lib/logger";
import {
  getSiteUrl,
  notifySearchEnginesOfPublish,
} from "../lib/seo";
import { invalidateSitemapCache } from "./sitemapIndex";

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
  seoTitle: z.string().max(100).nullable().optional(),
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
    const slug = String(req.params["slug"] ?? "");
    const [row] = await db
      .select()
      .from(glossaryTermsTable)
      .where(eq(glossaryTermsTable.slug, slug))
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
    if (!row) {
      res.status(500).json({ error: "Failed to insert glossary term" });
      return;
    }

    // Fire-and-forget IndexNow + Google sitemap ping so Bing/Yandex/etc
    // learn about the new glossary term immediately.
    const siteUrl = getSiteUrl();
    void notifySearchEnginesOfPublish([
      `${siteUrl}/glossary/${row.slug}`,
      `${siteUrl}/sitemap.xml`,
    ]).catch((err) =>
      logger.warn({ err, slug: row.slug }, "IndexNow ping for new glossary term failed (non-fatal)"),
    );

    // Flush sitemap cache so the new term appears in sitemap-glossary.xml immediately.
    invalidateSitemapCache();

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
      const paramSlug = String(req.params["slug"] ?? "");
      const body = UpdateGlossaryTermBody.parse(req.body);
      const [row] = await db
        .update(glossaryTermsTable)
        .set(body)
        .where(eq(glossaryTermsTable.slug, paramSlug))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      // Fire-and-forget IndexNow ping so search engines recrawl the updated term.
      const siteUrl = getSiteUrl();
      void notifySearchEnginesOfPublish([
        `${siteUrl}/glossary/${row.slug}`,
        `${siteUrl}/sitemap.xml`,
      ]).catch((err) =>
        logger.warn({ err, slug: row.slug }, "IndexNow ping for updated glossary term failed (non-fatal)"),
      );

      // Flush sitemap cache so the updated lastmod appears immediately.
      invalidateSitemapCache();

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
      const delSlug = String(req.params["slug"] ?? "");
      const [row] = await db
        .delete(glossaryTermsTable)
        .where(eq(glossaryTermsTable.slug, delSlug))
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
