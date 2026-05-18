import { logger } from "../lib/logger";
import { runInternalLinkCheck } from "../lib/internalLinkCheck";
import { sendMail, cleanEmail } from "../lib/mailer";

const LOG = logger.child({ job: "internal-link-check-daily" });

// Wait 7 minutes after server boot so the sitemap routes are warm and we
// don't collide with the sitemap-health job (which starts at 5 min).
const INITIAL_DELAY_MS = 7 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Track the set of broken link URLs from the previous run so we only
// alert on genuinely NEW breakages, not the same ones every day.
let previouslyBrokenUrls = new Set<string>();

function isEnabled(): boolean {
  if (process.env["NODE_ENV"] === "production") return true;
  return Boolean(process.env["SITE_URL"]?.trim());
}

function getAdminEmails(): string[] {
  const raw = process.env["ADMIN_EMAILS"] ?? "";
  return raw
    .split(",")
    .map((e) => cleanEmail(e))
    .filter(Boolean);
}

function buildBrokenLinksEmail(
  newBroken: Array<{ linkUrl: string; sourcePage: string; statusCode?: number | null }>,
  totalBroken: number,
): { subject: string; text: string; html: string } {
  const siteUrl = process.env["SITE_URL"] ?? "your site";
  const subject = `[FintechPressHub] ${newBroken.length} new broken internal link${newBroken.length !== 1 ? "s" : ""} detected`;

  const linkLines = newBroken
    .slice(0, 20)
    .map((l) => `  • [${l.statusCode ?? "ERR"}] ${l.linkUrl}\n    Found on: ${l.sourcePage}`)
    .join("\n\n");

  const text = [
    `The daily internal link scan found ${newBroken.length} new broken link${newBroken.length !== 1 ? "s" : ""} on ${siteUrl}.`,
    "",
    newBroken.length < totalBroken
      ? `(${totalBroken} total broken links; showing first 20 new ones)`
      : "",
    "",
    linkLines,
    "",
    "View the full report in the admin dashboard.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const rowsHtml = newBroken
    .slice(0, 20)
    .map(
      (l) => `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 12px;font-family:monospace;color:#dc2626;font-weight:600">${l.statusCode ?? "ERR"}</td>
        <td style="padding:8px 12px;word-break:break-all"><a href="${l.linkUrl}" style="color:#2563eb">${l.linkUrl}</a></td>
        <td style="padding:8px 12px;word-break:break-all;color:#6b7280">${l.sourcePage}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px">
      <h2 style="color:#111827;margin-top:0">🔗 ${newBroken.length} new broken internal link${newBroken.length !== 1 ? "s" : ""} detected</h2>
      <p style="color:#374151">The daily internal link scan found new broken links on <strong>${siteUrl}</strong>.</p>
      ${newBroken.length < totalBroken ? `<p style="color:#6b7280;font-size:14px">${totalBroken} total broken links; showing first 20 new ones.</p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Broken URL</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Found on page</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:13px">View the full report in your admin dashboard.</p>
    </div>`;

  return { subject, text, html };
}

export function scheduleInternalLinkCheckDaily(): void {
  if (!isEnabled()) {
    LOG.info("Internal-link-check daily job disabled in this environment — set SITE_URL to enable");
    return;
  }

  LOG.info(
    { initialDelayMs: INITIAL_DELAY_MS, intervalMs: ONE_DAY_MS },
    "Scheduled daily internal link check (initial run in 7 min, then every 24h)",
    { job: "internal-link-check-daily" },
  );

  setTimeout(async function tick() {
    LOG.info("Running daily internal link check");
    try {
      const report = await runInternalLinkCheck();
      LOG.info(
        { pagesChecked: report.pagesChecked, totalLinks: report.totalLinks, broken: report.brokenCount },
        "Daily internal link check complete",
      );

      if (report.brokenCount > 0 && report.brokenLinks && report.brokenLinks.length > 0) {
        const currentBrokenUrls = new Set(report.brokenLinks.map((l) => l.linkUrl));

        // Only alert on links that are genuinely new — not ones we already saw last run.
        const newBroken = report.brokenLinks.filter((l) => !previouslyBrokenUrls.has(l.linkUrl));

        if (newBroken.length > 0) {
          const admins = getAdminEmails();
          if (admins.length > 0) {
            const { subject, text, html } = buildBrokenLinksEmail(newBroken, report.brokenCount);
            for (const to of admins) {
              const sent = await sendMail({ to, subject, text, html });
              if (sent) {
                LOG.info({ to, newBroken: newBroken.length }, "Sent broken-link alert email");
              } else {
                LOG.warn({ to }, "Failed to send broken-link alert email — no mail transport configured");
              }
            }
          } else {
            LOG.warn("ADMIN_EMAILS not set — skipping broken-link email alert");
          }
        } else {
          LOG.info("No new broken links since last run — skipping email alert");
        }

        previouslyBrokenUrls = currentBrokenUrls;
      } else {
        previouslyBrokenUrls = new Set();
      }
    } catch (err) {
      LOG.error({ err }, "Daily internal link check failed");
    }
    setTimeout(tick, ONE_DAY_MS);
  }, INITIAL_DELAY_MS);
}
