import { db, blogPostsTable, kvStoreTable } from "@workspace/db";
import { and, gt, lte, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendMail } from "../lib/mailer";
import { getNotificationSettings } from "../lib/slackNotifier";
import { getSiteUrl } from "../lib/seo";

const JOB_LOG = logger.child({ job: "scheduled-post-publish-notify" });

const ONE_HOUR_MS = 60 * 60 * 1000;
const INITIAL_DELAY_MS = 90_000;

/** kv_store key that persists the last time we scanned for newly-live posts. */
const KV_LAST_CHECK = "publish_notify_last_check_at";

async function getLastCheckAt(): Promise<Date> {
  const [row] = await db
    .select()
    .from(kvStoreTable)
    .where(eq(kvStoreTable.key, KV_LAST_CHECK))
    .limit(1);
  if (!row?.value || typeof (row.value as { iso?: unknown }).iso !== "string") {
    return new Date(0);
  }
  const d = new Date((row.value as { iso: string }).iso);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

async function setLastCheckAt(at: Date): Promise<void> {
  await db
    .insert(kvStoreTable)
    .values({ key: KV_LAST_CHECK, value: { iso: at.toISOString() } })
    .onConflictDoUpdate({
      target: kvStoreTable.key,
      set: { value: { iso: at.toISOString() }, updatedAt: at },
    });
}

/**
 * Find posts whose `publishedAt` is now in the past but was still in the
 * future at the last check. These are the posts that just went live during
 * the current interval.
 */
async function findNewlyPublishedPosts(since: Date, now: Date) {
  return db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      category: blogPostsTable.category,
      publishedAt: blogPostsTable.publishedAt,
    })
    .from(blogPostsTable)
    .where(
      and(
        gt(blogPostsTable.publishedAt, since),
        lte(blogPostsTable.publishedAt, now),
      ),
    );
}

function buildEmailBody(
  posts: { slug: string; title: string; category: string; publishedAt: Date }[],
  siteUrl: string,
): { subject: string; text: string; html: string } {
  const subject =
    posts.length === 1
      ? `✅ Scheduled post now live: "${posts[0]!.title}"`
      : `✅ ${posts.length} scheduled posts just went live`;

  const textLines = posts.map(
    (p) =>
      `• ${p.title}\n  Live at: ${siteUrl}/blog/${p.slug}\n  Category: ${p.category}\n  Published: ${p.publishedAt.toUTCString()}`,
  );

  const htmlItems = posts
    .map(
      (p) => `
    <li style="margin-bottom:12px;">
      <strong><a href="${siteUrl}/blog/${p.slug}" style="color:#0052FF;">${p.title}</a></strong><br>
      <span style="color:#6b7280;font-size:13px;">${p.category} · Published ${p.publishedAt.toUTCString()}</span><br>
      <a href="${siteUrl}/blog/${p.slug}" style="font-size:13px;">View live post →</a>
    </li>`,
    )
    .join("");

  const text = `${subject}\n\nThe following scheduled post${posts.length > 1 ? "s have" : " has"} just auto-published:\n\n${textLines.join("\n\n")}\n\nReview the live site: ${siteUrl}/blog`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#0052FF;margin-bottom:4px;">📣 Scheduled post${posts.length > 1 ? "s" : ""} just went live</h2>
  <p style="color:#6b7280;margin-top:0;">FintechPressHub auto-publish notification</p>
  <ul style="padding-left:20px;line-height:1.8;">${htmlItems}</ul>
  <p style="margin-top:24px;">
    <a href="${siteUrl}/blog" style="background:#0052FF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View all posts →</a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin-top:32px;">
  <p style="color:#9ca3af;font-size:12px;">
    You're receiving this because publish notifications are enabled in your
    <a href="${siteUrl}/admin/notifications" style="color:#6b7280;">admin notification settings</a>.
  </p>
</body>
</html>`;

  return { subject, text, html };
}

export async function runScheduledPostPublishNotify(): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.publishNotifyEnabled || !settings.publishNotifyEmail) {
    return;
  }

  const now = new Date();
  const lastCheck = await getLastCheckAt();

  // Protect against an uninitialized store sending one huge catch-up
  // email on first run — treat anything older than 2 hours as "2 hours ago".
  const effectiveSince =
    lastCheck.getTime() === 0
      ? new Date(now.getTime() - 2 * ONE_HOUR_MS)
      : lastCheck;

  let posts: Awaited<ReturnType<typeof findNewlyPublishedPosts>>;
  try {
    posts = await findNewlyPublishedPosts(effectiveSince, now);
  } catch (err) {
    JOB_LOG.error({ err }, "DB query failed; will retry next hour");
    return;
  }

  // Always advance the cursor so we don't re-scan the same window.
  await setLastCheckAt(now);

  if (posts.length === 0) {
    JOB_LOG.debug({ since: effectiveSince.toISOString() }, "No newly-published posts");
    return;
  }

  JOB_LOG.info(
    { count: posts.length, slugs: posts.map((p: { slug: string }) => p.slug) },
    "Found newly auto-published posts — sending email notification",
  );

  const siteUrl = getSiteUrl();
  const { subject, text, html } = buildEmailBody(posts, siteUrl);

  const sent = await sendMail({
    to: settings.publishNotifyEmail,
    subject,
    text,
    html,
  });

  if (sent) {
    JOB_LOG.info({ to: settings.publishNotifyEmail, count: posts.length }, "Publish notification email sent");
  } else {
    JOB_LOG.warn({ to: settings.publishNotifyEmail }, "Publish notification email could not be sent (no mail transport configured?)");
  }
}

let scheduled = false;

export function schedulePublishNotifyHourly(): void {
  if (scheduled) return;
  scheduled = true;

  setTimeout(() => {
    void runScheduledPostPublishNotify();
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runScheduledPostPublishNotify();
  }, ONE_HOUR_MS);

  JOB_LOG.info(
    "Scheduled publish-notify job (initial run in 90s, then every 1h)",
  );
}
