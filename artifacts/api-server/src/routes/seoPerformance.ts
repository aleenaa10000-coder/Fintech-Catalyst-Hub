import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, blogPostsTable, linkCheckResultsTable, referringDomainsTable } from "@workspace/db";
import { sql, lte, count, gte } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import { fetchGscDetail } from "../lib/gscClient";

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

router.get(
  "/admin/seo-performance",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const [posts, linkResults, [counts]] = await Promise.all([
        // All published posts with SEO fields
        db.execute(sql`
          SELECT
            bp.id,
            bp.slug,
            bp.title,
            bp.category,
            bp.published_at  AS "publishedAt",
            bp.updated_at    AS "updatedAt",
            bp.view_count    AS "viewCount",
            bp.no_index      AS "noIndex",
            bp.noindex_until AS "noindexUntil",
            bp.last_seo_ping_at     AS "lastSeoPingAt",
            bp.last_seo_ping_status AS "lastSeoPingStatus",
            (bp.seo_title IS NOT NULL)       AS "hasSeoTitle",
            (bp.seo_description IS NOT NULL) AS "hasSeoDescription",
            (bp.seo_og_image IS NOT NULL)    AS "hasSeoOgImage",
            lcr.is_broken        AS "isBroken",
            lcr.last_status_code AS "lastStatusCode",
            lcr.broken_since     AS "brokenSince",
            lcr.last_checked_at  AS "lastCheckedAt"
          FROM blog_posts bp
          LEFT JOIN link_check_results lcr
            ON lcr.url LIKE '%/blog/' || bp.slug
          WHERE bp.published_at <= NOW()
          ORDER BY bp.view_count DESC
        `),

        // Aggregate broken link count for blog posts
        db.execute(sql`
          SELECT COUNT(*)::int AS broken_count
          FROM link_check_results
          WHERE url LIKE '%/blog/%'
            AND is_broken = TRUE
        `),

        // Summary totals
        db
          .select({
            totalPosts: count(blogPostsTable.id).mapWith(Number),
          })
          .from(blogPostsTable)
          .where(lte(blogPostsTable.publishedAt, new Date())),
      ]);

      const rows = (posts.rows ?? []) as Array<{
        id: number;
        slug: string;
        title: string;
        category: string;
        publishedAt: string;
        updatedAt: string;
        viewCount: number;
        noIndex: boolean;
        noindexUntil: string | null;
        lastSeoPingAt: string | null;
        lastSeoPingStatus: string | null;
        hasSeoTitle: boolean;
        hasSeoDescription: boolean;
        hasSeoOgImage: boolean;
        isBroken: boolean | null;
        lastStatusCode: number | null;
        brokenSince: string | null;
        lastCheckedAt: string | null;
      }>;

      const totalIndexed = rows.filter((r) => !r.noIndex).length;
      const totalHidden = rows.filter((r) => r.noIndex).length;
      const pingAccepted = rows.filter(
        (r) => r.lastSeoPingStatus === "accepted",
      ).length;
      const pingPending = rows.filter((r) => r.lastSeoPingAt === null).length;
      const brokenLinks =
        ((linkResults.rows[0] as { broken_count: number } | undefined)
          ?.broken_count ?? 0);

      const statusBreakdown: Record<string, number> = {};
      for (const row of rows) {
        const key = row.lastSeoPingStatus ?? "not_pinged";
        statusBreakdown[key] = (statusBreakdown[key] ?? 0) + 1;
      }

      res.json({
        summary: {
          totalPublished: counts?.totalPosts ?? rows.length,
          totalIndexed,
          totalHidden,
          pingAccepted,
          pingPending,
          brokenLinks,
        },
        statusBreakdown,
        posts: rows,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Link Velocity: new referring domains bucketed by ISO week over the last 90 days.
// Grouped by the Monday that starts each week (date_trunc('week', ...)) so the
// chart always shows full calendar weeks and the label is a stable "Mon DD" string.
router.get(
  "/admin/seo-performance/link-velocity",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const [weekRows, [totals]] = await Promise.all([
        db.execute(sql`
          SELECT
            date_trunc('week', first_seen_at AT TIME ZONE 'UTC') AS week_start,
            COUNT(*)::int AS new_domains
          FROM referring_domains
          WHERE first_seen_at >= ${cutoff}
          GROUP BY week_start
          ORDER BY week_start
        `),
        db
          .select({ total: count(referringDomainsTable.id).mapWith(Number) })
          .from(referringDomainsTable)
          .where(gte(referringDomainsTable.firstSeenAt, cutoff)),
      ]);

      const rows = (weekRows.rows ?? []) as Array<{
        week_start: string | Date;
        new_domains: number;
      }>;

      const weeks = rows.map((r) => {
        const d = new Date(r.week_start);
        const label = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        return {
          weekLabel: label,
          weekStart: d.toISOString().slice(0, 10),
          newDomains: r.new_domains,
        };
      });

      const totalDomains = totals?.total ?? 0;
      const avgPerWeek = weeks.length > 0 ? totalDomains / weeks.length : 0;

      res.json({ weeks, totalDomains, avgPerWeek });
    } catch (err) {
      next(err);
    }
  },
);

// Google Search Console: organic clicks, impressions, avg position (last 28 days).
// Returns { configured: false } when GSC env vars are absent so the UI can
// show a setup card instead of an error.
router.get(
  "/admin/seo-performance/gsc",
  requireAdmin,
  async (req, res, next) => {
    try {
      const daysParam = parseInt((req.query.days as string) ?? "28", 10);
      const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90
        ? daysParam
        : 28;

      const result = await fetchGscDetail(days);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
