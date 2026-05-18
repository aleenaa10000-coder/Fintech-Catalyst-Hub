import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  db,
  newsletterSubscribersTable,
  authorSubscriptionsTable,
  authorsTable,
} from "@workspace/db";
import { eq, sql, desc, and, gte, asc } from "drizzle-orm";

import { logger } from "../lib/logger";
import { escapeCsv, requireAdmin, utcDayKey } from "../lib/routeHelpers";

const router: IRouter = Router();

router.get(
  "/admin/authors/subscribers/summary",
  requireAdmin,
  async (_req, res) => {
    try {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [allAuthors, totals, recents] = await Promise.all([
        db
          .select({
            slug:  authorsTable.slug,
            name:  authorsTable.name,
            role:  authorsTable.role,
            photo: authorsTable.photo,
          })
          .from(authorsTable)
          .orderBy(asc(authorsTable.sortOrder)),
        db
          .select({
            authorSlug: authorSubscriptionsTable.authorSlug,
            count: sql<number>`count(*)::int`,
            latestSubscribedAt: sql<
              Date | null
            >`max(${authorSubscriptionsTable.createdAt})`,
          })
          .from(authorSubscriptionsTable)
          .groupBy(authorSubscriptionsTable.authorSlug),
        db
          .select({
            authorSlug: authorSubscriptionsTable.authorSlug,
            count: sql<number>`count(*)::int`,
          })
          .from(authorSubscriptionsTable)
          .where(gte(authorSubscriptionsTable.createdAt, since30d))
          .groupBy(authorSubscriptionsTable.authorSlug),
      ]);

      type TotalRow = { authorSlug: string; count: number; latestSubscribedAt: Date | null };
      const totalsBySlug = new Map<string, TotalRow>(
        (totals as TotalRow[]).map((r) => [r.authorSlug, r]),
      );
      const recentsBySlug = new Map<string, number>(
        (recents as { authorSlug: string; count: number }[]).map((r) => [r.authorSlug, r.count]),
      );

      const summary = allAuthors
        .map((a) => {
          const t = totalsBySlug.get(a.slug);
          return {
            authorSlug: a.slug,
            authorName: a.name,
            authorRole: a.role,
            authorPhoto: a.photo,
            subscriberCount: t?.count ?? 0,
            last30DayCount: recentsBySlug.get(a.slug) ?? 0,
            latestSubscribedAt: t?.latestSubscribedAt
              ? new Date(t.latestSubscribedAt).toISOString()
              : null,
          };
        })
        .sort((a, b) => b.subscriberCount - a.subscriberCount);

      res.json(summary);
    } catch (err) {
      logger.error({ err }, "Failed to load author subscriber summary");
      res.status(500).json({ error: "Failed to load subscriber summary" });
    }
  },
);

async function loadAuthorDetail(slug: string) {
  const [author] = await db
    .select({
      slug:  authorsTable.slug,
      name:  authorsTable.name,
      role:  authorsTable.role,
      photo: authorsTable.photo,
    })
    .from(authorsTable)
    .where(eq(authorsTable.slug, slug))
    .limit(1);

  if (!author) return null;

  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  since90d.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: authorSubscriptionsTable.id,
      email: newsletterSubscribersTable.email,
      createdAt: authorSubscriptionsTable.createdAt,
      source: newsletterSubscribersTable.source,
    })
    .from(authorSubscriptionsTable)
    .innerJoin(
      newsletterSubscribersTable,
      eq(authorSubscriptionsTable.subscriberId, newsletterSubscribersTable.id),
    )
    .where(eq(authorSubscriptionsTable.authorSlug, author.slug))
    .orderBy(desc(authorSubscriptionsTable.createdAt));

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30DayCount = rows.filter((r: { createdAt: Date }) => r.createdAt >= since30d).length;

  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(utcDayKey(d), 0);
  }
  for (const r of rows) {
    if (r.createdAt < since90d) continue;
    const k = utcDayKey(r.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }

  return {
    author: {
      authorSlug: author.slug,
      authorName: author.name,
      authorRole: author.role,
      authorPhoto: author.photo,
      subscriberCount: rows.length,
      last30DayCount,
      latestSubscribedAt:
        rows[0]?.createdAt?.toISOString() ?? null,
    },
    subscribers: rows.map((r: { id: number; email: string | null; createdAt: Date; source: string | null }) => ({
      id: r.id,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      source: r.source,
    })),
    dailySignups: Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
}

router.get(
  "/admin/authors/:slug/subscribers",
  requireAdmin,
  async (req, res) => {
    try {
      const slug = String(req.params.slug ?? "").toLowerCase();
      const detail = await loadAuthorDetail(slug);
      if (!detail) {
        res.status(404).json({ error: "Unknown author" });
        return;
      }
      res.json(detail);
    } catch (err) {
      logger.error({ err }, "Failed to load author subscribers");
      res.status(500).json({ error: "Failed to load author subscribers" });
    }
  },
);

router.get(
  "/admin/authors/:slug/subscribers.csv",
  requireAdmin,
  async (req, res) => {
    try {
      const slug = String(req.params.slug ?? "").toLowerCase();
      const detail = await loadAuthorDetail(slug);
      if (!detail) {
        res.status(404).type("text/plain").send("Unknown author");
        return;
      }

      const header = ["email", "subscribed_at", "source"].join(",");
      const lines = detail.subscribers.map((s: { email: string | null; createdAt: string; source: string | null }) =>
        [escapeCsv(s.email), escapeCsv(s.createdAt), escapeCsv(s.source ?? "")].join(
          ",",
        ),
      );
      const body = [header, ...lines].join("\n") + "\n";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${slug}-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.setHeader("Cache-Control", "no-store");
      res.send(body);
    } catch (err) {
      logger.error({ err }, "Failed to export author subscribers CSV");
      res.status(500).json({ error: "Failed to export author subscribers" });
    }
  },
);

void and;

export default router;
