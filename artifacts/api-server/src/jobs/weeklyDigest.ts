import { db, blogPostsTable } from "@workspace/db";
import { gt, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import {
  getNotificationSettings,
  postWeeklyDigestToSlack,
  recordWeeklyDigestSent,
  type WeeklyDigestPayload,
  type WeeklyDigestTopPost,
} from "../lib/slackNotifier";

const JOB_LOG = logger.child({ job: "weekly-digest" });

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** How many top-by-views posts to surface in the digest. Five matches
 *  the convention used elsewhere in the admin UI (top-5 by traffic in
 *  the bulk no-index dialog) so the channel reads consistently. */
const TOP_BY_VIEWS_LIMIT = 5;

/**
 * Pull the data the weekly digest needs in a single round-trip-ish.
 * Runs two cheap reads against `blog_posts`:
 *   1. Posts published since `since` (newest-first, slug+title)
 *   2. Top N by lifetime view count + the SUM of view counts
 */
export async function buildWeeklyDigestPayload(args: {
  since: Date;
  now: Date;
}): Promise<WeeklyDigestPayload> {
  const { since, now } = args;

  const newPosts = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      publishedAt: blogPostsTable.publishedAt,
    })
    .from(blogPostsTable)
    .where(gt(blogPostsTable.publishedAt, since))
    .orderBy(desc(blogPostsTable.publishedAt));

  const topRows = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      viewCount: blogPostsTable.viewCount,
    })
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.viewCount))
    .limit(TOP_BY_VIEWS_LIMIT);

  // SUM(view_count) — coalesce to 0 in case the table is empty so the
  // digest still produces a coherent "0 lifetime views" headline
  // instead of throwing on the type-narrowing below.
  const sumRow = await db
    .select({
      total: sql<number>`COALESCE(SUM(${blogPostsTable.viewCount}), 0)::int`,
    })
    .from(blogPostsTable);
  const totalLifetimeViews = sumRow[0]?.total ?? 0;

  const topByViews: WeeklyDigestTopPost[] = topRows
    // Hide entries with 0 views — surfacing "0 views" in a "top by
    // views" list looks broken; better to render a shorter list.
    .filter((r) => (r.viewCount ?? 0) > 0)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      viewCount: r.viewCount ?? 0,
    }));

  return {
    windowStart: since.toISOString(),
    windowEnd: now.toISOString(),
    postsPublishedInWindow: newPosts.length,
    newPostTitles: newPosts.map((p) => p.title),
    totalLifetimeViews,
    topByViews,
  };
}

/**
 * Run the weekly digest end-to-end: gate-check the toggle + cadence,
 * build the payload, post to Slack, persist the success timestamp.
 *
 * `force=true` bypasses the toggle + cadence check — used by the
 * "Send sample digest now" admin button so previews always work even
 * before the recurring schedule is on.
 */
export async function runWeeklyDigest(
  options: { force?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; sentAt?: string }> {
  const force = options.force === true;
  const settings = await getNotificationSettings();

  if (!settings.slackWebhookUrl) {
    return { ok: false, reason: "no_webhook" };
  }
  if (!force && !settings.weeklyDigestEnabled) {
    return { ok: false, reason: "digest_disabled" };
  }

  const now = new Date();
  if (!force && settings.weeklyDigestLastSentAt) {
    const last = new Date(settings.weeklyDigestLastSentAt);
    const elapsed = now.getTime() - last.getTime();
    if (elapsed < SEVEN_DAYS_MS) {
      return { ok: false, reason: "cadence_not_met" };
    }
  }

  // Window: last 7 days from now (the "this week" the digest reports
  // on). For the very first run when there's no `weeklyDigestLastSentAt`
  // we still use a 7-day lookback so the message is meaningful — the
  // alternative ("everything since the dawn of time") would dump the
  // entire publishing history into the channel.
  const since = new Date(now.getTime() - SEVEN_DAYS_MS);

  let payload: WeeklyDigestPayload;
  try {
    payload = await buildWeeklyDigestPayload({ since, now });
  } catch (err) {
    JOB_LOG.error({ err }, "Failed to build weekly digest payload");
    return { ok: false, reason: "build_failed" };
  }

  const result = await postWeeklyDigestToSlack({
    payload,
    siteUrl: getSiteUrl().replace(/\/+$/, ""),
    isPreview: force,
  });

  if (!result.ok) {
    JOB_LOG.warn(
      { err: result.error, force },
      "Weekly digest Slack post returned not-ok",
    );
    return { ok: false, reason: result.error ?? "post_failed" };
  }

  // Only stamp `weeklyDigestLastSentAt` on the recurring path —
  // previews are explicit one-off sends and shouldn't reset the
  // cadence clock (otherwise an admin clicking "Send sample" would
  // postpone the next real digest by 7 days).
  if (!force) {
    try {
      await recordWeeklyDigestSent(now);
    } catch (err) {
      JOB_LOG.warn(
        { err },
        "Posted weekly digest but failed to persist lastSentAt — will re-post on next tick",
      );
    }
  }

  JOB_LOG.info(
    {
      force,
      postsThisWeek: payload.postsPublishedInWindow,
      topByViews: payload.topByViews.length,
    },
    force ? "Sent weekly digest preview to Slack" : "Sent weekly digest to Slack",
  );

  return { ok: true, sentAt: now.toISOString() };
}

let scheduled = false;

export function scheduleWeeklyDigest(): void {
  if (scheduled) return;
  scheduled = true;

  // Initial check ~90s after boot so we don't compete with the other
  // schedulers all firing in the same tick. After that, check hourly:
  // the function itself enforces the 7-day cadence, so a once-per-hour
  // tick is overkill-but-safe — it lets a fresh enable-toggle pick up
  // within an hour without us needing a per-settings invalidation.
  setTimeout(() => {
    void runWeeklyDigest().catch((err) =>
      JOB_LOG.error({ err }, "Weekly digest threw on startup tick"),
    );
  }, 90_000);

  setInterval(() => {
    void runWeeklyDigest().catch((err) =>
      JOB_LOG.error({ err }, "Weekly digest threw on hourly tick"),
    );
  }, ONE_HOUR_MS);

  JOB_LOG.info(
    "Scheduled weekly Slack digest (initial check in 90s, then hourly; cadence enforced inside the job)",
  );
}
