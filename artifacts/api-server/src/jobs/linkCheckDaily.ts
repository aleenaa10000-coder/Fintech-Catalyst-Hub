import { logger } from "../lib/logger";
import { sendMail, cleanEmail } from "../lib/mailer";
import { getSiteUrl } from "../lib/seo";
import {
  runSitemapCheck,
  markNotified,
  type SerializedResult,
} from "../lib/sitemapHealth";
import { postPersistentAlertToSlack } from "../lib/slackNotifier";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const JOB_LOG = logger.child({ job: "link-check-daily" });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Window after which a still-broken URL counts as "persistently broken"
 * and earns its own follow-up alert (separate from the OK→broken alert
 * that fires on day 1). Configurable via `HEALTH_ALERT_HOURS`; defaults
 * to 48h so a brief upstream blip doesn't trigger a re-page on day 2.
 */
function persistentBreakageWindowMs(): number {
  const raw = process.env["HEALTH_ALERT_HOURS"]?.trim();
  if (!raw) return 48 * ONE_HOUR_MS;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 48 * ONE_HOUR_MS;
  return n * ONE_HOUR_MS;
}

/**
 * Throttle on the *re*-notification email for persistently-broken URLs
 * — once we've sent an alert about a URL, we won't re-alert about that
 * same URL until this many hours have passed. Stops the daily job from
 * spamming admins about the same dead link every morning.
 */
function persistentRenotifyWindowMs(): number {
  const raw = process.env["HEALTH_RENOTIFY_HOURS"]?.trim();
  if (!raw) return 7 * 24 * ONE_HOUR_MS;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 7 * 24 * ONE_HOUR_MS;
  return n * ONE_HOUR_MS;
}
// Stagger the link-check kickoff so it doesn't collide with the IndexNow
// daily run (which fires 30s after boot). 5 minutes after boot gives the
// API server time to settle and lets us interleave with the more
// time-sensitive IndexNow ping.
const INITIAL_DELAY_MS = 5 * 60 * 1000;

function adminEmails(): string[] {
  const raw = process.env["ADMIN_EMAILS"]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => cleanEmail(e))
    .filter(Boolean);
}

function fmtUtc(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

async function probeDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function hoursAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffH = (Date.now() - t) / ONE_HOUR_MS;
  if (diffH < 1) return `${Math.round(diffH * 60)} min ago`;
  if (diffH < 48) return `${Math.round(diffH)}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

function buildPersistentAlertEmail(
  persistent: SerializedResult[],
  dbStatus: { ok: boolean; error?: string },
  windowHours: number,
): { subject: string; text: string } {
  const siteUrl = getSiteUrl();
  const dbBad = !dbStatus.ok;
  const subjectBits: string[] = [];
  if (dbBad) subjectBits.push("DB unreachable");
  if (persistent.length > 0) {
    subjectBits.push(
      `${persistent.length} URL${persistent.length === 1 ? "" : "s"} still broken >${windowHours}h`,
    );
  }
  const subject = `[FintechPressHub] Health alert — ${subjectBits.join(", ")}`;

  const lines: string[] = [
    `The daily health check found infrastructure that has been failing for longer than the alert window (${windowHours}h).`,
    ``,
  ];

  if (dbBad) {
    lines.push(`DATABASE`);
    lines.push(
      `   The Postgres probe failed during this run: ${dbStatus.error ?? "unknown error"}`,
    );
    lines.push(
      `   Open the admin health badge for the live latency / uptime numbers: ${siteUrl}/admin/blog`,
    );
    lines.push(``);
  }

  if (persistent.length > 0) {
    lines.push(
      `PERSISTENTLY BROKEN URLS (${persistent.length}, broken longer than ${windowHours}h)`,
    );
    persistent.forEach((r, i) => {
      const status = r.lastStatusCode ? `HTTP ${r.lastStatusCode}` : "no response";
      const detail = r.lastError ? ` — ${r.lastError}` : "";
      lines.push(`${i + 1}. ${r.url}`);
      lines.push(`   Status: ${status}${detail}`);
      lines.push(`   Source: ${r.source}`);
      lines.push(
        `   Broken since: ${fmtUtc(r.brokenSince)} UTC (${hoursAgo(r.brokenSince)})`,
      );
      lines.push(`   Last OK: ${fmtUtc(r.lastOkAt)} UTC`);
    });
    lines.push(``);
    lines.push(`Open the admin dashboard to triage: ${siteUrl}/admin/blog`);
  }

  lines.push(``);
  lines.push(`— FintechPressHub link-checker`);

  return { subject, text: lines.join("\n") };
}

function buildAlertEmail(
  newlyBroken: SerializedResult[],
): { subject: string; text: string } {
  const siteUrl = getSiteUrl();
  const subject = `[FintechPressHub] ${newlyBroken.length} new broken link${
    newlyBroken.length === 1 ? "" : "s"
  } detected in sitemap`;

  const lines = newlyBroken.map((r, i) => {
    const status = r.lastStatusCode ? `HTTP ${r.lastStatusCode}` : "no response";
    const detail = r.lastError ? ` — ${r.lastError}` : "";
    return [
      `${i + 1}. ${r.url}`,
      `   Status: ${status}${detail}`,
      `   Source: ${r.source}`,
      `   Broken since: ${fmtUtc(r.brokenSince)} UTC`,
      `   Last OK: ${fmtUtc(r.lastOkAt)} UTC`,
    ].join("\n");
  });

  const text = [
    `The daily sitemap link-checker found ${newlyBroken.length} URL${
      newlyBroken.length === 1 ? "" : "s"
    } that returned 4xx/5xx (or didn't respond) on this run.`,
    ``,
    `These URLs were OK on the previous run, so the breakage is fresh.`,
    ``,
    ...lines,
    ``,
    `Open the admin dashboard to triage: ${siteUrl}/admin/blog`,
    ``,
    `— FintechPressHub link-checker`,
  ].join("\n");

  return { subject, text };
}

/**
 * Walks the sitemap, fetches every URL, persists status, and emails
 * admins about *fresh* breakage (URLs that flipped OK→broken since the
 * last run). Designed to be called once per 24h.
 */
export async function runDailyLinkCheck(): Promise<void> {
  const recipients = adminEmails();
  if (recipients.length === 0) {
    JOB_LOG.info(
      "ADMIN_EMAILS not set — running the link-check anyway so the dashboard report stays fresh, but no email will be sent.",
    );
  }

  // Probe the DB up-front so a "DB unreachable" alert can ride along with
  // the persistent-breakage email below. We do this even if the sitemap
  // check throws — DB outages are exactly the case where we most want to
  // page admins.
  const dbStatus = await probeDatabase();
  if (!dbStatus.ok) {
    JOB_LOG.error({ err: dbStatus.error }, "DB probe failed during daily health check");
  }

  let outcome;
  try {
    outcome = await runSitemapCheck({ detectTransitions: true });
  } catch (err) {
    JOB_LOG.error({ err }, "Sitemap link-check threw; will retry tomorrow");
    // Still send the DB alert if the sitemap walk blew up but the DB
    // itself is unreachable — admins need to know.
    if (!dbStatus.ok && recipients.length > 0) {
      const windowHours = Math.round(persistentBreakageWindowMs() / ONE_HOUR_MS);
      const { subject, text } = buildPersistentAlertEmail(
        [],
        dbStatus,
        windowHours,
      );
      for (const to of recipients) {
        await sendMail({ to, subject, text }).catch((mailErr) => {
          JOB_LOG.error({ err: mailErr, to }, "Failed to email DB-down alert");
          return false;
        });
      }
      // Slack post is best-effort — its failure must NEVER mask the
      // sitemap-walk failure that brought us down this branch.
      await postPersistentAlertToSlack({
        persistent: [],
        dbStatus,
        windowHours,
        siteUrl: getSiteUrl(),
      }).catch((slackErr) => {
        JOB_LOG.warn({ err: slackErr }, "Slack DB-down alert failed");
      });
    }
    return;
  }

  // ── 1. Fresh OK→broken alert (existing behavior) ───────────────────
  if (outcome.newlyBroken.length > 0 && recipients.length > 0) {
    const { subject, text } = buildAlertEmail(outcome.newlyBroken);
    let allSent = true;
    for (const to of recipients) {
      const ok = await sendMail({ to, subject, text }).catch((err) => {
        JOB_LOG.error({ err, to }, "Failed to email admin about broken links");
        return false;
      });
      if (!ok) allSent = false;
    }

    if (allSent) {
      await markNotified(outcome.newlyBroken.map((r) => r.url));
      JOB_LOG.info(
        {
          recipients: recipients.length,
          newlyBroken: outcome.newlyBroken.length,
        },
        "Sent broken-link alert and marked URLs as notified",
      );
    } else {
      JOB_LOG.warn(
        { newlyBroken: outcome.newlyBroken.length },
        "Some alert emails failed; leaving notifiedAt unset so we retry tomorrow",
      );
    }
  } else if (outcome.newlyBroken.length > 0) {
    JOB_LOG.warn(
      { newlyBroken: outcome.newlyBroken.length },
      "Detected new broken URLs but ADMIN_EMAILS is unset — no email sent",
    );
  }

  // ── 2. Persistent-breakage alert (new) ─────────────────────────────
  // A URL is "persistently broken" when:
  //   - it's still broken on this run,
  //   - it has been broken for longer than HEALTH_ALERT_HOURS, AND
  //   - we either never alerted about it, or our last alert was longer
  //     than HEALTH_RENOTIFY_HOURS ago (so we don't spam every day).
  // Newly-broken URLs are excluded — they were already covered by the
  // OK→broken email above on day 1.
  const breakageWindowMs = persistentBreakageWindowMs();
  const renotifyWindowMs = persistentRenotifyWindowMs();
  const cutoff = Date.now() - breakageWindowMs;
  const renotifyCutoff = Date.now() - renotifyWindowMs;
  const newlyBrokenUrls = new Set(outcome.newlyBroken.map((r) => r.url));

  const persistent = outcome.results.filter((r) => {
    if (!r.isBroken) return false;
    if (newlyBrokenUrls.has(r.url)) return false;
    const brokenAt = r.brokenSince ? new Date(r.brokenSince).getTime() : NaN;
    if (!Number.isFinite(brokenAt) || brokenAt > cutoff) return false;
    if (!r.notifiedAt) return true;
    const notifiedAt = new Date(r.notifiedAt).getTime();
    return Number.isFinite(notifiedAt) && notifiedAt < renotifyCutoff;
  });

  const shouldEmailPersistent = persistent.length > 0 || !dbStatus.ok;
  if (shouldEmailPersistent && recipients.length > 0) {
    const windowHours = Math.round(breakageWindowMs / ONE_HOUR_MS);
    const { subject, text } = buildPersistentAlertEmail(
      persistent,
      dbStatus,
      windowHours,
    );
    let allSent = true;
    for (const to of recipients) {
      const ok = await sendMail({ to, subject, text }).catch((err) => {
        JOB_LOG.error({ err, to }, "Failed to email admin about persistent failures");
        return false;
      });
      if (!ok) allSent = false;
    }

    if (allSent && persistent.length > 0) {
      // Re-stamp notifiedAt on the persistent URLs so the renotify
      // throttle resets — next persistent alert can fire HEALTH_RENOTIFY_HOURS
      // from now if they're still down.
      await markNotified(persistent.map((r) => r.url));
    }

    // Mirror the email to Slack when configured. Best-effort — Slack
    // failure must never reverse `markNotified` (the email already went
    // out and we don't want to spam admins with duplicate emails next
    // run just because the webhook hiccuped).
    const slackResult = await postPersistentAlertToSlack({
      persistent: persistent.map((r) => ({
        url: r.url,
        source: r.source,
        isBroken: r.isBroken,
        lastStatusCode: r.lastStatusCode,
        lastError: r.lastError,
        brokenSince: r.brokenSince,
        lastOkAt: r.lastOkAt,
      })),
      dbStatus,
      windowHours,
      siteUrl: getSiteUrl(),
    }).catch((err) => ({ ok: false, error: String(err) }));

    JOB_LOG.info(
      {
        recipients: recipients.length,
        persistent: persistent.length,
        dbDown: !dbStatus.ok,
        allSent,
        slackOk: slackResult.ok,
        slackErr: slackResult.error ?? null,
      },
      "Persistent-failure alert evaluated",
    );
  } else if (shouldEmailPersistent) {
    JOB_LOG.warn(
      { persistent: persistent.length, dbDown: !dbStatus.ok },
      "Persistent failures detected but ADMIN_EMAILS is unset — no email sent",
    );
  } else {
    JOB_LOG.info(
      {
        total: outcome.results.length,
        recovered: outcome.recovered.length,
      },
      "Link-check complete — no persistent failures past alert window",
    );
  }
}

let scheduled = false;

export function scheduleLinkCheckDaily(): void {
  if (scheduled) return;
  scheduled = true;

  // The link-checker walks the public sitemap and HEADs every URL. The
  // sitemap is built against `SITE_URL` (default
  // `https://www.fintechpresshub.com`), which only resolves in
  // production — in a dev / preview environment that domain isn't this
  // server, so every URL would be reported as "broken" and the daily
  // alert would either spam admins or pollute the dashboard with
  // false-positives.
  //
  // We skip when not in production unless the operator has *explicitly*
  // set `SITE_URL` (e.g. to a Replit preview URL) so they can still
  // opt-in to dry-runs against a reachable host.
  const isProd = process.env["NODE_ENV"] === "production";
  const siteUrlOverride = process.env["SITE_URL"]?.trim();
  if (!isProd && !siteUrlOverride) {
    JOB_LOG.info(
      "Skipping daily sitemap link-check — non-production environment and no SITE_URL override set. Set SITE_URL=<your preview URL> to enable in dev.",
    );
    return;
  }

  setTimeout(() => {
    void runDailyLinkCheck();
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runDailyLinkCheck();
  }, ONE_DAY_MS);

  JOB_LOG.info(
    "Scheduled daily sitemap link-check (initial run in 5 min, then every 24h)",
  );
}
