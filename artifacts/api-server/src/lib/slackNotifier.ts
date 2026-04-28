import { db, kvStoreTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Lightweight Slack incoming-webhook integration. We deliberately keep
 * this scoped to *outgoing* notifications via a single webhook URL —
 * no OAuth, no Slack app install, no `xoxb-` tokens. The admin pastes
 * a webhook URL from `https://api.slack.com/apps/.../incoming-webhooks`
 * (channel-bound on Slack's side), we POST JSON to it.
 *
 * Storage piggy-backs on `kv_store` so we don't need a dedicated table
 * for what is effectively a single-row settings document.
 */

const SLACK_LOG = logger.child({ lib: "slack-notifier" });

const KV_KEY = "notification_settings";

const SLACK_WEBHOOK_PREFIX = "https://hooks.slack.com/services/";

/** Hard ceiling on how long a Slack POST may take before we bail. Slack's
 *  incoming-webhook endpoint usually responds in <300ms; anything past
 *  10s is almost certainly a transient routing problem and we'd rather
 *  fail fast than block the daily job loop. */
const SLACK_REQUEST_TIMEOUT_MS = 10_000;

export interface NotificationSettings {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  /** When true, the weekly digest scheduler will post a summary of
   *  publishing activity + post traffic to the Slack webhook every 7
   *  days. Independent of `slackEnabled` (which gates *alert*-class
   *  messages) so admins can opt into the digest without subscribing
   *  to noisier breakage alerts, and vice-versa. */
  weeklyDigestEnabled: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  /** Persisted timestamp of the last successful weekly digest post.
   *  Used by the scheduler to enforce the 7-day cadence across server
   *  restarts so an admin restarting the API doesn't double-post. */
  weeklyDigestLastSentAt: string | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  slackWebhookUrl: null,
  slackEnabled: false,
  weeklyDigestEnabled: false,
  lastTestAt: null,
  lastTestOk: null,
  lastTestError: null,
  weeklyDigestLastSentAt: null,
};

export interface PublicNotificationSettings {
  slackConfigured: boolean;
  slackEnabled: boolean;
  weeklyDigestEnabled: boolean;
  /** Last 4 chars of the webhook URL for admin recognition (never the
   *  full URL — webhooks are bearer secrets). */
  slackWebhookHint: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  weeklyDigestLastSentAt: string | null;
}

export function isValidSlackWebhookUrl(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed.startsWith(SLACK_WEBHOOK_PREFIX)) return false;
  // Basic shape: prefix + 3 path segments separated by /. We don't
  // validate the body of the segments — Slack rotates them and we don't
  // want to lock out any future formats.
  const tail = trimmed.slice(SLACK_WEBHOOK_PREFIX.length);
  const parts = tail.split("/").filter(Boolean);
  return parts.length === 3 && parts.every((p) => p.length >= 8);
}

export function maskWebhookUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.length < 4) return "****";
  return "…" + url.slice(-4);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const [row] = await db
    .select()
    .from(kvStoreTable)
    .where(eq(kvStoreTable.key, KV_KEY))
    .limit(1);
  if (!row) return { ...DEFAULT_SETTINGS };
  const raw = row.value as Partial<NotificationSettings> | null;
  return {
    slackWebhookUrl:
      typeof raw?.slackWebhookUrl === "string" ? raw.slackWebhookUrl : null,
    slackEnabled: raw?.slackEnabled === true,
    weeklyDigestEnabled: raw?.weeklyDigestEnabled === true,
    lastTestAt: typeof raw?.lastTestAt === "string" ? raw.lastTestAt : null,
    lastTestOk:
      typeof raw?.lastTestOk === "boolean" ? raw.lastTestOk : null,
    lastTestError:
      typeof raw?.lastTestError === "string" ? raw.lastTestError : null,
    weeklyDigestLastSentAt:
      typeof raw?.weeklyDigestLastSentAt === "string"
        ? raw.weeklyDigestLastSentAt
        : null,
  };
}

export function toPublicSettings(
  s: NotificationSettings,
): PublicNotificationSettings {
  return {
    slackConfigured: !!s.slackWebhookUrl,
    slackEnabled: s.slackEnabled,
    weeklyDigestEnabled: s.weeklyDigestEnabled,
    slackWebhookHint: maskWebhookUrl(s.slackWebhookUrl),
    lastTestAt: s.lastTestAt,
    lastTestOk: s.lastTestOk,
    lastTestError: s.lastTestError,
    weeklyDigestLastSentAt: s.weeklyDigestLastSentAt,
  };
}

async function writeSettings(next: NotificationSettings): Promise<void> {
  await db
    .insert(kvStoreTable)
    .values({ key: KV_KEY, value: next })
    .onConflictDoUpdate({
      target: kvStoreTable.key,
      set: { value: next, updatedAt: new Date() },
    });
}

export async function updateNotificationSettings(input: {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  /** Optional — `undefined` leaves the saved value untouched, so the
   *  existing PUT contract for callers that only care about the
   *  webhook URL + alerts toggle keeps working unchanged. */
  weeklyDigestEnabled?: boolean;
}): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const trimmed = input.slackWebhookUrl?.trim() || null;
  if (trimmed !== null && !isValidSlackWebhookUrl(trimmed)) {
    throw new Error(
      `Invalid Slack webhook URL — must start with ${SLACK_WEBHOOK_PREFIX}`,
    );
  }
  // Same "URL cleared ⇒ force everything off" rule as `slackEnabled` —
  // a digest with no webhook to post to would silently no-op forever.
  const nextWeeklyDigest =
    trimmed === null
      ? false
      : input.weeklyDigestEnabled ?? current.weeklyDigestEnabled;
  const next: NotificationSettings = {
    ...current,
    slackWebhookUrl: trimmed,
    // If they cleared the URL we force `enabled` off so we never sit in a
    // "enabled but no URL" state that would silently swallow alerts.
    slackEnabled: trimmed === null ? false : input.slackEnabled,
    weeklyDigestEnabled: nextWeeklyDigest,
    // Wipe stale test status when the URL changes — a "ok 3 days ago"
    // pill against a fresh URL would be misleading.
    lastTestAt:
      trimmed !== current.slackWebhookUrl ? null : current.lastTestAt,
    lastTestOk:
      trimmed !== current.slackWebhookUrl ? null : current.lastTestOk,
    lastTestError:
      trimmed !== current.slackWebhookUrl ? null : current.lastTestError,
  };
  await writeSettings(next);
  return next;
}

/** Stamp the most recent successful weekly-digest send time. The
 *  scheduler reads this on every tick to decide whether to fire. */
export async function recordWeeklyDigestSent(at: Date): Promise<void> {
  const current = await getNotificationSettings();
  await writeSettings({
    ...current,
    weeklyDigestLastSentAt: at.toISOString(),
  });
}

async function recordTestResult(ok: boolean, error: string | null): Promise<void> {
  const current = await getNotificationSettings();
  await writeSettings({
    ...current,
    lastTestAt: new Date().toISOString(),
    lastTestOk: ok,
    lastTestError: ok ? null : error,
  });
}

/* ---------- Posting -------------------------------------------------- */

/**
 * Low-level POST to a Slack incoming webhook. Returns `{ ok, error }` so
 * callers can surface the failure to the user instead of throwing —
 * Slack alerts must NEVER block the underlying admin action.
 */
async function postToWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSlackWebhookUrl(url)) {
    return { ok: false, error: "Invalid Slack webhook URL" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Slack returned HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }
    // Slack's success body is literally the string "ok" — but we don't
    // need to check it; HTTP 200 is sufficient.
    return { ok: true };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Slack request timed out after 10s" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Send the test ping shown by the admin "Test connection" button.
 *  Records the outcome on the settings row so the UI can show a
 *  status pill without re-pinging on every page load. */
export async function sendSlackTest(siteUrl: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const settings = await getNotificationSettings();
  if (!settings.slackWebhookUrl) {
    return { ok: false, error: "No Slack webhook URL configured" };
  }
  const result = await postToWebhook(settings.slackWebhookUrl, {
    text: `:white_check_mark: *FintechPressHub Slack alerts test* — connection works. Persistent-failure alerts and bulk-probe results will be posted here. (${siteUrl})`,
  });
  await recordTestResult(result.ok, result.error ?? null);
  return result;
}

export interface SerializedHealthResult {
  url: string;
  source: string;
  isBroken: boolean;
  lastStatusCode: number | null;
  lastError: string | null;
  brokenSince: string | null;
  lastOkAt: string | null;
}

/**
 * Persistent-failure alert (twin of `buildPersistentAlertEmail`). Posted
 * by the daily link-check job whenever the email path fires. Caller is
 * responsible for skipping the post when slack is disabled / unconfigured.
 */
export async function postPersistentAlertToSlack(args: {
  persistent: SerializedHealthResult[];
  dbStatus: { ok: boolean; error?: string };
  windowHours: number;
  siteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const settings = await getNotificationSettings();
  if (!settings.slackEnabled || !settings.slackWebhookUrl) {
    return { ok: false, error: "Slack notifications not enabled" };
  }

  const { persistent, dbStatus, windowHours, siteUrl } = args;
  const headerBits: string[] = [];
  if (!dbStatus.ok) headerBits.push("DB unreachable");
  if (persistent.length > 0) {
    headerBits.push(
      `${persistent.length} URL${persistent.length === 1 ? "" : "s"} broken >${windowHours}h`,
    );
  }
  const headerText = `:rotating_light: *FintechPressHub health alert* — ${headerBits.join(", ") || "infra check"}`;

  const blocks: Array<Record<string, unknown>> = [
    { type: "section", text: { type: "mrkdwn", text: headerText } },
  ];

  if (!dbStatus.ok) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Database*\nPostgres probe failed: \`${(dbStatus.error ?? "unknown error").slice(0, 200)}\``,
      },
    });
  }

  if (persistent.length > 0) {
    // Slack truncates long blocks at ~3000 chars per text — cap to the
    // first 15 URLs and dump the rest into a "+N more" footer so the
    // message always reaches the channel.
    const display = persistent.slice(0, 15);
    const overflow = persistent.length - display.length;
    const lines = display.map((r, i) => {
      const status = r.lastStatusCode
        ? `HTTP ${r.lastStatusCode}`
        : "no response";
      return `${i + 1}. <${r.url}|${r.url}> — \`${status}\`${r.lastError ? ` (${r.lastError.slice(0, 100)})` : ""}`;
    });
    if (overflow > 0) lines.push(`_…and ${overflow} more — see admin dashboard_`);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Persistently broken URLs (>${windowHours}h)*\n${lines.join("\n")}`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<${siteUrl}/admin/blog|Open admin dashboard>`,
      },
    ],
  });

  const result = await postToWebhook(settings.slackWebhookUrl, {
    text: headerText, // fallback for notifications
    blocks,
  });
  if (!result.ok) {
    SLACK_LOG.warn(
      { err: result.error },
      "Slack persistent-alert post failed",
    );
  }
  return result;
}

export interface BrokenUrlPayload {
  slug: string;
  title: string;
  url: string;
  statusCode: number | null;
  error: string | null;
  checkedAt: string | null;
}

/**
 * Post the bulk-probe broken-URL list to Slack. Triggered on demand from
 * the admin dashboard (the same surface that already has CSV / Markdown
 * export buttons), so we want a richly-formatted message that's
 * scannable in the channel.
 */
export async function postBrokenUrlsToSlack(args: {
  broken: BrokenUrlPayload[];
  siteUrl: string;
  triggeredBy: string;
}): Promise<{ ok: boolean; error?: string; posted?: number }> {
  const settings = await getNotificationSettings();
  if (!settings.slackEnabled || !settings.slackWebhookUrl) {
    return { ok: false, error: "Slack notifications not enabled" };
  }
  if (args.broken.length === 0) {
    return { ok: false, error: "Nothing to post — broken URL list is empty" };
  }

  const display = args.broken.slice(0, 15);
  const overflow = args.broken.length - display.length;
  const headerText = `:warning: *Bulk URL probe — ${args.broken.length} broken URL${args.broken.length === 1 ? "" : "s"}* (triggered by ${args.triggeredBy})`;

  const lines = display.map((r, i) => {
    const status = r.statusCode != null ? `HTTP ${r.statusCode}` : "no response";
    return `${i + 1}. <${r.url}|${r.slug}> — \`${status}\`${r.error ? ` (${r.error.slice(0, 100)})` : ""}`;
  });
  if (overflow > 0) lines.push(`_…and ${overflow} more — full list in admin dashboard_`);

  const blocks: Array<Record<string, unknown>> = [
    { type: "section", text: { type: "mrkdwn", text: headerText } },
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${args.siteUrl}/admin/blog|Open admin dashboard>`,
        },
      ],
    },
  ];

  const result = await postToWebhook(settings.slackWebhookUrl, {
    text: headerText,
    blocks,
  });
  if (!result.ok) {
    SLACK_LOG.warn(
      { err: result.error, count: args.broken.length },
      "Slack broken-URL post failed",
    );
    return result;
  }
  return { ok: true, posted: args.broken.length };
}

/* ---------- Weekly digest -------------------------------------------- */

export interface WeeklyDigestTopPost {
  slug: string;
  title: string;
  viewCount: number;
}

export interface WeeklyDigestPayload {
  /** Inclusive ISO timestamp of the start of the digest window. */
  windowStart: string;
  /** Exclusive ISO timestamp of the end of the digest window (= now). */
  windowEnd: string;
  /** Number of posts published *inside* the window. */
  postsPublishedInWindow: number;
  /** Titles of posts published inside the window (newest-first, capped
   *  at 10 in the message body — anything beyond goes into a +N footer
   *  so the Slack section block doesn't exceed the 3000-char limit). */
  newPostTitles: string[];
  /** Total view count across every blog post (lifetime). Cheaper to
   *  compute than per-window views (which we don't track) and gives
   *  admins a running headline metric. */
  totalLifetimeViews: number;
  /** Top N posts by lifetime view count — the engine that powers the
   *  "Most read" sort on the public blog. */
  topByViews: WeeklyDigestTopPost[];
}

/** Build the Slack Block Kit payload for a weekly digest. Pure
 *  function so the route handler can preview the message body in tests
 *  / dry-runs without touching the network. */
export function buildWeeklyDigestBlocks(args: {
  payload: WeeklyDigestPayload;
  siteUrl: string;
  isPreview: boolean;
}): { headerText: string; blocks: Array<Record<string, unknown>> } {
  const { payload, siteUrl, isPreview } = args;
  const windowEndDate = new Date(payload.windowEnd);
  const windowStartDate = new Date(payload.windowStart);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const headerText = isPreview
    ? `:bar_chart: *FintechPressHub weekly digest (preview)* — ${fmtDate(windowStartDate)} → ${fmtDate(windowEndDate)}`
    : `:bar_chart: *FintechPressHub weekly digest* — ${fmtDate(windowStartDate)} → ${fmtDate(windowEndDate)}`;

  const blocks: Array<Record<string, unknown>> = [
    { type: "section", text: { type: "mrkdwn", text: headerText } },
  ];

  // Headline numbers row — kept compact so the channel preview shows
  // the whole thing without needing to expand the message.
  blocks.push({
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Posts published this week*\n${payload.postsPublishedInWindow}`,
      },
      {
        type: "mrkdwn",
        text: `*Lifetime post views*\n${payload.totalLifetimeViews.toLocaleString("en-US")}`,
      },
    ],
  });

  // New posts section — only render when there's at least one, so an
  // empty week doesn't get a confusing "_(none)_" line.
  if (payload.newPostTitles.length > 0) {
    const display = payload.newPostTitles.slice(0, 10);
    const overflow = payload.newPostTitles.length - display.length;
    const lines = display.map((t, i) => `${i + 1}. ${t}`);
    if (overflow > 0)
      lines.push(`_…and ${overflow} more — see the blog index_`);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New posts*\n${lines.join("\n")}`,
      },
    });
  }

  if (payload.topByViews.length > 0) {
    const lines = payload.topByViews.map(
      (p, i) =>
        `${i + 1}. <${siteUrl}/blog/${p.slug}|${p.title}> — *${p.viewCount.toLocaleString("en-US")}* views`,
    );
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Top posts by lifetime views*\n${lines.join("\n")}`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<${siteUrl}/admin/blog|Open admin dashboard> · <${siteUrl}/blog|View public blog>`,
      },
    ],
  });

  return { headerText, blocks };
}

/**
 * Post a weekly digest to Slack. Uses `weeklyDigestEnabled` (not
 * `slackEnabled`) so admins can opt into the digest separately from
 * breakage alerts. When `isPreview` is true the gating flag is
 * bypassed — that path powers the admin "Send sample digest now"
 * button which we want to work even before the recurring schedule is
 * turned on.
 */
export async function postWeeklyDigestToSlack(args: {
  payload: WeeklyDigestPayload;
  siteUrl: string;
  isPreview?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const settings = await getNotificationSettings();
  const isPreview = args.isPreview === true;
  if (!settings.slackWebhookUrl) {
    return { ok: false, error: "No Slack webhook URL configured" };
  }
  if (!isPreview && !settings.weeklyDigestEnabled) {
    return { ok: false, error: "Weekly digest is not enabled" };
  }

  const { headerText, blocks } = buildWeeklyDigestBlocks({
    payload: args.payload,
    siteUrl: args.siteUrl,
    isPreview,
  });

  const result = await postToWebhook(settings.slackWebhookUrl, {
    text: headerText,
    blocks,
  });
  if (!result.ok) {
    SLACK_LOG.warn(
      { err: result.error },
      "Slack weekly-digest post failed",
    );
  }
  return result;
}
