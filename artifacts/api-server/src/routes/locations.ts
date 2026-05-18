import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { db, locationPagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

import { logger } from "../lib/logger";
import {
  getSiteUrl,
  notifySearchEnginesOfPublish,
} from "../lib/seo";
import { invalidateSitemapCache } from "./sitemapIndex";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const LocationPageBody = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase and hyphenated"),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  country: z.string().min(1).max(100),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "countryCode must be an ISO 3166-1 alpha-2 code"),
  headline: z.string().min(1).max(200),
  body: z.string().min(1),
  seoTitle: z.string().max(100).nullable().optional(),
  seoDescription: z.string().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const UpdateLocationPageBody = LocationPageBody.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field is required" },
);

router.get("/locations", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(locationPagesTable)
      .orderBy(asc(locationPagesTable.country), asc(locationPagesTable.city));
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/locations/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params["slug"] ?? "");
    const [row] = await db
      .select()
      .from(locationPagesTable)
      .where(eq(locationPagesTable.slug, slug))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/locations", requireAdmin, async (req, res, next) => {
  try {
    const body = LocationPageBody.parse(req.body);
    const [row] = await db
      .insert(locationPagesTable)
      .values(body)
      .returning();
    if (!row) {
      res.status(500).json({ error: "Failed to insert location page" });
      return;
    }

    // Fire-and-forget IndexNow + Google sitemap ping so Bing/Yandex/etc
    // learn about the new location page immediately.
    const siteUrl = getSiteUrl();
    void notifySearchEnginesOfPublish([
      `${siteUrl}/locations/${row.slug}`,
      `${siteUrl}/sitemap.xml`,
    ]).catch((err) =>
      logger.warn({ err, slug: row.slug }, "IndexNow ping for new location page failed (non-fatal)"),
    );

    // Flush sitemap cache so the new page appears in sitemap-locations.xml immediately.
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
      res.status(409).json({ error: "A location page with this slug already exists" });
      return;
    }
    next(err);
  }
});

router.patch(
  "/admin/locations/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params["id"]);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const body = UpdateLocationPageBody.parse(req.body);
      const [row] = await db
        .update(locationPagesTable)
        .set(body)
        .where(eq(locationPagesTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      // Fire-and-forget IndexNow ping so search engines recrawl the updated page.
      const siteUrl = getSiteUrl();
      void notifySearchEnginesOfPublish([
        `${siteUrl}/locations/${row.slug}`,
        `${siteUrl}/sitemap.xml`,
      ]).catch((err) =>
        logger.warn({ err, slug: row.slug }, "IndexNow ping for updated location page failed (non-fatal)"),
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

router.delete("/admin/locations/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [row] = await db
      .delete(locationPagesTable)
      .where(eq(locationPagesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true, deleted: row });
  } catch (err) {
    next(err);
  }
});

export default router;
