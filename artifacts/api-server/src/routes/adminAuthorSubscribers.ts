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
} from "@workspace/db";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import {
  authors,
  getAuthorBySlug,
} from "../../../fintechpresshub/src/data/authors";

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

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get(
  "/admin/authors/subscribers/summary",
  requireAdmin,
  async (_req, res) => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totals = await db
      .select({
        authorSlug: authorSubscriptionsTable.authorSlug,
        count: sql<number>`count(*)::int`,
        latestSubscribedAt: sql<
          Date | null
        >`max(${authorSubscriptionsTable.createdAt})`,
      })
      .from(authorSubscriptionsTable)
      .groupBy(authorSubscriptionsTable.authorSlug);

    const recents = await db
      .select({
        authorSlug: authorSubscriptionsTable.authorSlug,
        count: sql<number>`count(*)::int`,
      })
      .from(authorSubscriptionsTable)
      .where(gte(authorSubscriptionsTable.createdAt, since30d))
      .groupBy(authorSubscriptionsTable.authorSlug);

    const totalsBySlug = new Map(totals.map((r) => [r.authorSlug, r]));
    const recentsBySlug = new Map(recents.map((r) => [r.authorSlug, r.count]));

    const summary = authors
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
  },
);

async function loadAuthorDetail(slug: string) {
  const author = getAuthorBySlug(slug);
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
  const last30DayCount = rows.filter((r) => r.createdAt >= since30d).length;

  // Build daily signup buckets: zero-filled for the last 90 calendar days (UTC).
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
    subscribers: rows.map((r) => ({
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
    const slug = String(req.params.slug ?? "").toLowerCase();
    const detail = await loadAuthorDetail(slug);
    if (!detail) {
      res.status(404).json({ error: "Unknown author" });
      return;
    }
    res.json(detail);
  },
);

// CSV export — served outside OpenAPI (binary-ish response). Same auth gate.
router.get(
  "/admin/authors/:slug/subscribers.csv",
  requireAdmin,
  async (req, res) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const detail = await loadAuthorDetail(slug);
    if (!detail) {
      res.status(404).type("text/plain").send("Unknown author");
      return;
    }

    const header = ["email", "subscribed_at", "source"].join(",");
    const lines = detail.subscribers.map((s) =>
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
  },
);

// Suppress unused-import warning for `and` (kept available for future filters).
void and;

export default router;
