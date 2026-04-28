import { logger } from "../lib/logger";
import { sendMail, cleanEmail } from "../lib/mailer";
import { getSiteUrl } from "../lib/seo";
import {
  runSitemapCheck,
  markNotified,
  type SerializedResult,
} from "../lib/sitemapHealth";

const JOB_LOG = logger.child({ job: "link-check-daily" });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
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

  let outcome;
  try {
    outcome = await runSitemapCheck({ detectTransitions: true });
  } catch (err) {
    JOB_LOG.error({ err }, "Sitemap link-check threw; will retry tomorrow");
    return;
  }

  if (outcome.newlyBroken.length === 0) {
    JOB_LOG.info(
      {
        total: outcome.results.length,
        recovered: outcome.recovered.length,
      },
      "Link-check complete — no new breakage",
    );
    return;
  }

  if (recipients.length === 0) {
    JOB_LOG.warn(
      { newlyBroken: outcome.newlyBroken.length },
      "Detected new broken URLs but ADMIN_EMAILS is unset — no email sent",
    );
    return;
  }

  const { subject, text } = buildAlertEmail(outcome.newlyBroken);
  let allSent = true;
  for (const to of recipients) {
    const ok = await sendMail({ to, subject, text }).catch((err) => {
      JOB_LOG.error({ err, to }, "Failed to email admin about broken links");
      return false;
    });
    if (!ok) allSent = false;
  }

  // Only mark `notifiedAt` for URLs we actually emailed about — if the
  // email send failed, the next daily run will retry the alert.
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
