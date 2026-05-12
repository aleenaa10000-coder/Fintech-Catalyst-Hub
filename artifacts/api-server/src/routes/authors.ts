import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { db, authorsTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import { invalidateSitemapCache } from "./sitemapIndex";
import { getSiteUrl, notifySearchEnginesOfPublishWithTimeout } from "../lib/seo";

const SEO_NOTIFY_TIMEOUT_MS = 4000;

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

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SocialSchema = z.object({
  linkedin: z.string().trim().url().max(500).optional().or(z.literal("")),
  twitter: z.string().trim().url().max(500).optional().or(z.literal("")),
  website: z.string().trim().url().max(500).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
});

const AuthorBody = z.object({
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE, "Slug must be lowercase letters, numbers, and dashes"),
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(160),
  photo: z.string().trim().min(1).max(1000),
  shortBio: z.string().trim().min(20).max(800),
  fullBio: z.array(z.string().trim().min(1).max(4000)).min(1).max(10),
  expertise: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  credentials: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  yearsExperience: z.number().int().min(0).max(80),
  location: z.string().trim().max(160).default(""),
  social: SocialSchema.default({}),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  datePublished: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
});

function pruneSocial(s: z.infer<typeof SocialSchema>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s ?? {})) {
    if (typeof v === "string" && v.trim().length > 0) out[k] = v.trim();
  }
  return out;
}

router.get("/authors", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(authorsTable)
      .orderBy(asc(authorsTable.sortOrder), asc(authorsTable.name));
    res.json({ authors: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/authors/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params["slug"] ?? "").trim();
    const [row] = await db
      .select()
      .from(authorsTable)
      .where(eq(authorsTable.slug, slug))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Author not found" });
      return;
    }
    res.json({ author: row });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/authors", requireAdmin, async (req, res, next) => {
  const parsed = AuthorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    const data = parsed.data;
    const existing = await db
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(eq(authorsTable.slug, data.slug))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An author with this slug already exists" });
      return;
    }
    const [row] = await db
      .insert(authorsTable)
      .values({
        slug: data.slug,
        name: data.name,
        role: data.role,
        photo: data.photo,
        shortBio: data.shortBio,
        fullBio: data.fullBio,
        expertise: data.expertise,
        credentials: data.credentials,
        yearsExperience: data.yearsExperience,
        location: data.location,
        social: pruneSocial(data.social),
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    invalidateSitemapCache();
    notifySearchEnginesOfPublishWithTimeout(
      [`${getSiteUrl()}/authors/${data.slug}`, `${getSiteUrl()}/authors`],
      SEO_NOTIFY_TIMEOUT_MS,
    ).catch(() => {});
    res.status(201).json({ ok: true, author: row });
  } catch (err) {
    next(err);
  }
});

router.put("/admin/authors/:slug", requireAdmin, async (req, res, next) => {
  const slug = String(req.params["slug"] ?? "").trim();
  const parsed = AuthorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    const data = parsed.data;
    if (data.slug !== slug) {
      const conflict = await db
        .select({ id: authorsTable.id })
        .from(authorsTable)
        .where(eq(authorsTable.slug, data.slug))
        .limit(1);
      if (conflict.length > 0) {
        res.status(409).json({ error: "Another author already uses that slug" });
        return;
      }
    }
    const [row] = await db
      .update(authorsTable)
      .set({
        slug: data.slug,
        name: data.name,
        role: data.role,
        photo: data.photo,
        shortBio: data.shortBio,
        fullBio: data.fullBio,
        expertise: data.expertise,
        credentials: data.credentials,
        yearsExperience: data.yearsExperience,
        location: data.location,
        social: pruneSocial(data.social),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      })
      .where(eq(authorsTable.slug, slug))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Author not found" });
      return;
    }
    invalidateSitemapCache();
    notifySearchEnginesOfPublishWithTimeout(
      [`${getSiteUrl()}/authors/${row.slug ?? slug}`, `${getSiteUrl()}/authors`],
      SEO_NOTIFY_TIMEOUT_MS,
    ).catch(() => {});
    res.json({ ok: true, author: row });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/authors/:slug", requireAdmin, async (req, res, next) => {
  try {
    const slug = String(req.params["slug"] ?? "").trim();
    const [row] = await db
      .delete(authorsTable)
      .where(eq(authorsTable.slug, slug))
      .returning({ slug: authorsTable.slug });
    if (!row) {
      res.status(404).json({ error: "Author not found" });
      return;
    }
    invalidateSitemapCache();
    res.json({ ok: true, slug: row.slug });
  } catch (err) {
    next(err);
  }
});

export default router;
