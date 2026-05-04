import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { isAdminEmail } from "../lib/auth";
import { getSiteUrl, pingIndexNow, pingGoogleSitemap } from "../lib/seo";
import { buildSitemapEntries } from "./sitemap";
import { logger } from "../lib/logger";

function isIndexNowConfigured(): boolean {
  const key = process.env["INDEXNOW_KEY"];
  return typeof key === "string" && /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

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

const router: IRouter = Router();

/**
 * POST /api/admin/sitemap/ping
 *
 * Submits the full sitemap to IndexNow (Bing/Yandex/Seznam/Naver) and
 * issues a best-effort Google sitemap ping. Returns a structured result
 * so the admin UI can show real success/failure feedback.
 *
 * The sitemap itself is always live (generated fresh from the DB on every
 * request to /sitemap.xml), so this endpoint is purely about notifying
 * search engines that the sitemap has changed — useful after bulk edits,
 * no-index toggles, or any operation that doesn't trigger the per-post
 * IndexNow ping that happens automatically on publish/update.
 */
router.post(
  "/admin/sitemap/ping",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const startedAt = Date.now();
      const siteUrl = getSiteUrl();

      const entries = await buildSitemapEntries();
      const urls = entries
        .filter((e) => e.source !== "rss")
        .map((e) => e.loc);

      const sitemapUrl = `${siteUrl}/sitemap.xml`;
      const allUrls = [sitemapUrl, ...urls];

      logger.info(
        { urlCount: urls.length },
        "Admin-triggered full sitemap ping to search engines",
      );

      const [indexNow, google] = await Promise.all([
        pingIndexNow(allUrls),
        pingGoogleSitemap(),
      ]);

      res.json({
        ok: indexNow.status === "accepted",
        indexNow,
        google,
        urlCount: urls.length,
        sitemapUrl,
        durationMs: Date.now() - startedAt,
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/admin/sitemap/entries
 *
 * Returns the current list of sitemap entries as JSON so the admin UI
 * can show a live count and preview without downloading the full XML.
 */
router.get(
  "/admin/sitemap/entries",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const entries = await buildSitemapEntries();
      const bySource = entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.source] = (acc[e.source] ?? 0) + 1;
        return acc;
      }, {});

      res.json({
        total: entries.length,
        bySource,
        entries,
        indexNowConfigured: isIndexNowConfigured(),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
