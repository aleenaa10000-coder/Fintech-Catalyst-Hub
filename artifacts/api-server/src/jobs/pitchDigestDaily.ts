import { db, guestPostSubmissionsTable } from "@workspace/db";
import { gte, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendMail, cleanEmail } from "../lib/mailer";
import { escapeHtml } from "../lib/routeHelpers";

const JOB_LOG = logger.child({ job: "pitch-digest-daily" });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Fire 3 minutes after boot — staggered from the link-check (5 min) and
// IndexNow (30s) so the scheduled jobs don't all hit the network simultaneously.
const INITIAL_DELAY_MS = 3 * 60 * 1000;

/**
 * Recipients for the pitch digest. Prefers PITCH_NOTIFY_TO (allows the
 * editorial team to receive pitches independently from sysadmin alerts)
 * and falls back to the full ADMIN_EMAILS list when unset.
 */
function digestRecipients(): string[] {
  const explicit = cleanEmail(process.env["PITCH_NOTIFY_TO"]);
  if (explicit) return [explicit];

  const raw = process.env["ADMIN_EMAILS"]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => cleanEmail(e))
    .filter(Boolean);
}

function fmtUtc(d: Date): string {
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

type PitchRow = typeof guestPostSubmissionsTable.$inferSelect;

function buildTextBody(rows: PitchRow[], hours: number, since: Date): string {
  if (rows.length === 0) {
    return `No new guest-post pitch submissions in the last ${hours} hours (since ${fmtUtc(since)} UTC). Quiet day!`;
  }

  const items = rows
    .map((r, i) => {
      const meta = [
        r.category ? `Category: ${r.category}` : null,
        r.website ? `Website: ${r.website}` : null,
        r.sampleUrl ? `Sample URL: ${r.sampleUrl}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const pitchPreview = r.pitch.replace(/\s+/g, " ").slice(0, 400);
      const truncated = r.pitch.length > 400 ? "…" : "";

      return [
        `${i + 1}. "${r.topic}" — ${r.name} <${r.email}>`,
        `   Received: ${fmtUtc(new Date(r.createdAt))} UTC`,
        meta ? `   ${meta}` : null,
        `   Pitch: ${pitchPreview}${truncated}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `${rows.length} new guest-post pitch${rows.length === 1 ? "" : "es"} in the last ${hours} hours (since ${fmtUtc(since)} UTC):`,
    ``,
    items,
    ``,
    `Review and respond via the editorial moderation panel.`,
    ``,
    `— FintechPressHub pitch digest`,
  ].join("\n");
}

function buildHtmlBody(rows: PitchRow[], hours: number, since: Date): string {
  const heading =
    rows.length === 0
      ? `No new pitches in the last ${hours}h`
      : `${rows.length} new pitch${rows.length === 1 ? "" : "es"} in the last ${hours}h`;

  const submissionCards =
    rows.length === 0
      ? `<p style="font-size:14px;color:#64748b;margin:0">No new pitch submissions in this window. Quiet day!</p>`
      : rows
          .map(
            (r) => `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px">
            <div style="font-weight:700;font-size:15px;color:#0a2540">${escapeHtml(r.topic)}</div>
            <div style="font-size:11px;color:#94a3b8">${escapeHtml(fmtUtc(new Date(r.createdAt)))} UTC</div>
          </div>
          <div style="font-size:13px;color:#0052FF;margin-bottom:8px">
            ${escapeHtml(r.name)} &lt;<a href="mailto:${escapeHtml(r.email)}" style="color:#0052FF;text-decoration:none">${escapeHtml(r.email)}</a>&gt;
          </div>
          ${r.category ? `<span style="display:inline-block;font-size:11px;background:#eff6ff;color:#0052FF;padding:2px 8px;border-radius:999px;margin-right:6px">${escapeHtml(r.category)}</span>` : ""}
          ${r.website ? `<span style="display:inline-block;font-size:11px;background:#f1f5f9;color:#334155;padding:2px 8px;border-radius:999px;margin-right:6px">${escapeHtml(r.website)}</span>` : ""}
          <div style="margin-top:10px;font-size:13px;color:#334155;line-height:1.6;border-left:3px solid #e2e8f0;padding-left:10px">${escapeHtml(
            r.pitch.replace(/\s+/g, " ").slice(0, 500),
          )}${r.pitch.length > 500 ? "…" : ""}</div>
          ${
            r.sampleUrl
              ? `<div style="margin-top:8px;font-size:12px;color:#64748b">Sample: <a href="${escapeHtml(r.sampleUrl)}" style="color:#0052FF">${escapeHtml(r.sampleUrl)}</a></div>`
              : ""
          }
        </div>`,
          )
          .join("");

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;color:#0a2540">
      <div style="background:linear-gradient(135deg,#0052FF 0%,#0040CC 100%);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;margin-bottom:6px">FintechPressHub · Pitch Digest</div>
        <h1 style="margin:0;font-size:22px;font-weight:700">${escapeHtml(heading)}</h1>
        <div style="font-size:12px;opacity:0.85;margin-top:6px">Since ${escapeHtml(fmtUtc(since))} UTC</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:24px 28px;border-radius:0 0 12px 12px">
        ${submissionCards}
        ${
          rows.length > 0
            ? `<p style="font-size:12px;color:#94a3b8;margin-top:20px;margin-bottom:0">Review and respond via the editorial moderation panel.</p>`
            : ""
        }
      </div>
    </div>`.trim();
}

/**
 * Query the last `hours` hours of guest-post pitch submissions, build a
 * digest email, and send it to the configured recipients.
 *
 * Skips the send when there are no new submissions — an empty-digest
 * email every day at 06:00 is noise; silence means "quiet day".
 */
export async function runPitchDigest(
  hours = 24,
): Promise<{ sent: boolean; count: number; reason?: string }> {
  const recipients = digestRecipients();
  if (recipients.length === 0) {
    JOB_LOG.warn(
      "Neither PITCH_NOTIFY_TO nor ADMIN_EMAILS is set — skipping pitch digest",
    );
    return { sent: false, count: 0, reason: "no_recipients" };
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  let rows: PitchRow[];
  try {
    rows = await db
      .select()
      .from(guestPostSubmissionsTable)
      .where(gte(guestPostSubmissionsTable.createdAt, since))
      .orderBy(desc(guestPostSubmissionsTable.createdAt));
  } catch (err) {
    JOB_LOG.error({ err }, "Pitch digest DB query failed");
    return { sent: false, count: 0, reason: "db_error" };
  }

  // Don't send an email for a quiet day — silence is the signal.
  if (rows.length === 0) {
    JOB_LOG.info(
      { hours, since: since.toISOString() },
      "Pitch digest: no new submissions in window — skipping email",
    );
    return { sent: false, count: 0, reason: "no_submissions" };
  }

  const subject = `[FintechPressHub] Pitch digest — ${rows.length} new guest-post pitch${
    rows.length === 1 ? "" : "es"
  } in the last ${hours}h`;

  const text = buildTextBody(rows, hours, since);
  const html = buildHtmlBody(rows, hours, since);

  let allSent = true;
  for (const to of recipients) {
    const ok = await sendMail({ to, subject, text, html }).catch((err) => {
      JOB_LOG.error({ err, to }, "Failed to send pitch digest email");
      return false;
    });
    if (!ok) allSent = false;
  }

  if (allSent) {
    JOB_LOG.info(
      { recipients: recipients.length, count: rows.length, hours },
      "Pitch digest sent",
    );
  } else {
    JOB_LOG.warn(
      { recipients: recipients.length, count: rows.length },
      "Pitch digest: some sends failed",
    );
  }

  return { sent: allSent, count: rows.length };
}

let scheduled = false;

export function schedulePitchDigestDaily(): void {
  if (scheduled) return;
  scheduled = true;

  setTimeout(() => {
    void runPitchDigest().catch((err) =>
      JOB_LOG.error({ err }, "Pitch digest threw on startup tick"),
    );
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runPitchDigest().catch((err) =>
      JOB_LOG.error({ err }, "Pitch digest threw on daily tick"),
    );
  }, ONE_DAY_MS);

  JOB_LOG.info(
    "Scheduled daily pitch digest (initial run in 3 min, then every 24h)",
  );
}
