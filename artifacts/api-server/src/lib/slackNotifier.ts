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
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  slackWebhookUrl: null,
  slackEnabled: false,
  lastTestAt: null,
  lastTestOk: null,
  lastTestError: null,
};

export interface PublicNotificationSettings {
  slackConfigured: boolean;
  slackEnabled: boolean;
  /** Last 4 chars of the webhook URL for admin recognition (never the
   *  full URL — webhooks are bearer secrets). */
  slackWebhookHint: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
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
    lastTestAt: typeof raw?.lastTestAt === "string" ? raw.lastTestAt : null,
    lastTestOk:
      typeof raw?.lastTestOk === "boolean" ? raw.lastTestOk : null,
    lastTestError:
      typeof raw?.lastTestError === "string" ? raw.lastTestError : null,
  };
}

export function toPublicSettings(
  s: NotificationSettings,
): PublicNotificationSettings {
  return {
    slackConfigured: !!s.slackWebhookUrl,
    slackEnabled: s.slackEnabled,
    slackWebhookHint: maskWebhookUrl(s.slackWebhookUrl),
    lastTestAt: s.lastTestAt,
    lastTestOk: s.lastTestOk,
    lastTestError: s.lastTestError,
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
}): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const trimmed = input.slackWebhookUrl?.trim() || null;
  if (trimmed !== null && !isValidSlackWebhookUrl(trimmed)) {
    throw new Error(
      `Invalid Slack webhook URL — must start with ${SLACK_WEBHOOK_PREFIX}`,
    );
  }
  const next: NotificationSettings = {
    ...current,
    slackWebhookUrl: trimmed,
    // If they cleared the URL we force `enabled` off so we never sit in a
    // "enabled but no URL" state that would silently swallow alerts.
    slackEnabled: trimmed === null ? false : input.slackEnabled,
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
