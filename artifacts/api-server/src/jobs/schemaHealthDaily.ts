import { logger } from "../lib/logger";
import { sendMail, cleanEmail } from "../lib/mailer";
import { validateJsonLd, buildSchemaFixtures, type ValidationResult } from "../lib/schemaValidator";
import { TOOL_SLUGS, SERVICE_SLUGS } from "../lib/seoConstants";
import { getSiteUrl } from "../lib/seo";
import { db, schemaHealthRunsTable } from "@workspace/db";

const JOB_LOG = logger.child({ job: "schema-health-daily" });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Fire 4 minutes after boot — staggered from IndexNow (30s), pitch digest
// (3 min), and link check (5 min) so scheduled jobs don't all hit the
// network simultaneously.
const INITIAL_DELAY_MS = 4 * 60 * 1000;

function alertRecipients(): string[] {
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

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildResults(): ValidationResult[] {
  const fixtures = buildSchemaFixtures();
  const results: ValidationResult[] = [];

  for (const [ld, ctx] of fixtures) {
    results.push(validateJsonLd(ld, ctx));
  }

  // Coverage checks: warn if slug arrays are unexpectedly empty
  if (TOOL_SLUGS.length === 0) {
    results.push({
      schemaType: "SoftwareApplication",
      context:    "coverage: TOOL_SLUGS is empty — no tool pages will emit schema",
      valid:      false,
      missing:    ["tool slugs"],
      warnings:   [],
    });
  }
  if (SERVICE_SLUGS.length === 0) {
    results.push({
      schemaType: "FinancialService",
      context:    "coverage: SERVICE_SLUGS is empty — no service pages will emit schema",
      valid:      false,
      missing:    ["service slugs"],
      warnings:   [],
    });
  }

  return results;
}

function buildTextBody(failures: ValidationResult[], warnings: ValidationResult[], checkedAt: Date): string {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  const lines: string[] = [
    `FintechPressHub — Schema Health Alert`,
    `Checked at: ${fmtUtc(checkedAt)} UTC`,
    `Admin panel: ${siteUrl}/admin/schema-test`,
    ``,
  ];

  if (failures.length > 0) {
    lines.push(`FAILURES (${failures.length}):`);
    for (const f of failures) {
      lines.push(`  ✗ ${f.schemaType} — ${f.context}`);
      if (f.missing.length > 0) lines.push(`    Missing fields: ${f.missing.join(", ")}`);
    }
    lines.push(``);
  }

  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      lines.push(`  ⚠ ${w.schemaType} — ${w.context}`);
      for (const msg of w.warnings) lines.push(`    ${msg}`);
    }
    lines.push(``);
  }

  lines.push(`Fix these regressions before they affect Google rich-result eligibility.`);
  lines.push(`— FintechPressHub schema health monitor`);
  return lines.join("\n");
}

function buildHtmlBody(failures: ValidationResult[], warnings: ValidationResult[], checkedAt: Date): string {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");

  const failureCards = failures
    .map(
      (f) => `
    <div style="border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:10px;background:#fff5f5">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <span style="font-weight:700;color:#dc2626">${escHtml(f.schemaType)}</span>
        <span style="font-size:11px;color:#94a3b8">${escHtml(f.context)}</span>
      </div>
      ${f.missing.length > 0 ? `<p style="margin:6px 0 0;font-size:12px;color:#7f1d1d">Missing: <code style="background:#fee2e2;padding:1px 5px;border-radius:3px">${escHtml(f.missing.join(", "))}</code></p>` : ""}
    </div>`,
    )
    .join("");

  const warningCards = warnings
    .map(
      (w) => `
    <div style="border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:10px;background:#fffbeb">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <span style="font-weight:700;color:#92400e">${escHtml(w.schemaType)}</span>
        <span style="font-size:11px;color:#94a3b8">${escHtml(w.context)}</span>
      </div>
      ${w.warnings.map((msg) => `<p style="margin:4px 0 0;font-size:12px;color:#78350f">⚠ ${escHtml(msg)}</p>`).join("")}
    </div>`,
    )
    .join("");

  const totalIssues = failures.length + warnings.length;
  const heading = `${failures.length} failure${failures.length !== 1 ? "s" : ""}${warnings.length > 0 ? `, ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}` : ""} detected`;

  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:660px;margin:0 auto;color:#0a2540">
  <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;margin-bottom:6px">FintechPressHub · Schema Health Monitor</div>
    <h1 style="margin:0;font-size:22px;font-weight:700">⚠ Schema Health Alert</h1>
    <div style="font-size:13px;opacity:0.9;margin-top:6px">${escHtml(heading)} — checked ${escHtml(fmtUtc(checkedAt))} UTC</div>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:24px 28px;border-radius:0 0 12px 12px">

    ${failures.length > 0 ? `
    <h2 style="font-size:14px;font-weight:700;color:#dc2626;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em">
      Failures — ${failures.length} schema type${failures.length !== 1 ? "s" : ""} failing required fields
    </h2>
    ${failureCards}` : ""}

    ${warnings.length > 0 ? `
    <h2 style="font-size:14px;font-weight:700;color:#92400e;margin:${failures.length > 0 ? "20px" : "0"} 0 12px;text-transform:uppercase;letter-spacing:0.06em">
      Warnings — ${warnings.length} schema type${warnings.length !== 1 ? "s" : ""} with E-E-A-T signals missing
    </h2>
    ${warningCards}` : ""}

    <div style="margin-top:20px;padding:14px 16px;background:#eff6ff;border-radius:8px;font-size:13px">
      Fix these regressions in <code style="font-size:12px">ssrMeta.ts</code> before they affect Google rich-result eligibility.
      <div style="margin-top:10px">
        <a href="${escHtml(siteUrl)}/admin/schema-test"
           style="display:inline-block;background:#0052FF;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">
          Open Schema &amp; Rich Results panel →
        </a>
      </div>
    </div>

    <p style="font-size:11px;color:#94a3b8;margin-top:20px;margin-bottom:0">
      This alert fires daily whenever schema validation finds ${totalIssues > 0 ? "issues" : "failures"}. Silence means all ${escHtml(String(failures.length + warnings.length + 8))} schema types are healthy.
    </p>
  </div>
</div>`.trim();
}

/**
 * Run the full schema validation fixture suite, then email ADMIN_EMAILS
 * if any schema type fails required-field checks or has E-E-A-T warnings.
 *
 * Silence = healthy: no email is sent when all fixtures pass cleanly.
 */
async function persistRun(row: {
  trigger: "scheduled" | "manual";
  total: number;
  passed: number;
  failures: number;
  warnings: number;
  emailSent: boolean;
  skipReason: string | null;
  issues: Array<{ schemaType: string; context: string; valid: boolean; warnings: string[] }>;
}): Promise<void> {
  try {
    await db.insert(schemaHealthRunsTable).values(row);
  } catch (err) {
    JOB_LOG.error({ err }, "Failed to persist schema health run to DB");
  }
}

export async function runSchemaHealthCheck(
  trigger: "scheduled" | "manual" = "scheduled",
): Promise<{
  sent: boolean;
  failures: number;
  warnings: number;
  reason?: string;
}> {
  const recipients = alertRecipients();
  if (recipients.length === 0) {
    JOB_LOG.warn("ADMIN_EMAILS not set — schema health check ran but cannot send alert email");
    await persistRun({
      trigger, total: 0, passed: 0, failures: 0, warnings: 0,
      emailSent: false, skipReason: "no_recipients", issues: [],
    });
    return { sent: false, failures: 0, warnings: 0, reason: "no_recipients" };
  }

  const now = new Date();
  let results: ValidationResult[];
  try {
    results = buildResults();
  } catch (err) {
    JOB_LOG.error({ err }, "Schema health check: failed to build validation results");
    await persistRun({
      trigger, total: 0, passed: 0, failures: 0, warnings: 0,
      emailSent: false, skipReason: "build_error", issues: [],
    });
    return { sent: false, failures: 0, warnings: 0, reason: "build_error" };
  }

  const failures = results.filter((r) => !r.valid);
  const warnings = results.filter((r) => r.valid && r.warnings.length > 0);
  const issueSnapshot = [...failures, ...warnings].map((r) => ({
    schemaType: r.schemaType,
    context:    r.context,
    valid:      r.valid,
    warnings:   r.warnings,
  }));

  if (failures.length === 0 && warnings.length === 0) {
    JOB_LOG.info(
      { total: results.length },
      "Schema health check: all schemas valid — no alert sent",
    );
    await persistRun({
      trigger,
      total:      results.length,
      passed:     results.length,
      failures:   0,
      warnings:   0,
      emailSent:  false,
      skipReason: "all_healthy",
      issues:     [],
    });
    return { sent: false, failures: 0, warnings: 0, reason: "all_healthy" };
  }

  const subject = failures.length > 0
    ? `[FintechPressHub] Schema health alert — ${failures.length} failure${failures.length !== 1 ? "s" : ""} detected`
    : `[FintechPressHub] Schema health warning — ${warnings.length} E-E-A-T signal${warnings.length !== 1 ? "s" : ""} missing`;

  const text = buildTextBody(failures, warnings, now);
  const html = buildHtmlBody(failures, warnings, now);

  let allSent = true;
  for (const to of recipients) {
    const ok = await sendMail({ to, subject, text, html }).catch((err) => {
      JOB_LOG.error({ err, to }, "Failed to send schema health alert email");
      return false;
    });
    if (!ok) allSent = false;
  }

  if (allSent) {
    JOB_LOG.warn(
      { failures: failures.length, warnings: warnings.length, recipients: recipients.length },
      "Schema health alert sent — schema regressions detected",
    );
  } else {
    JOB_LOG.error(
      { failures: failures.length, warnings: warnings.length },
      "Schema health alert: email send(s) failed",
    );
  }

  await persistRun({
    trigger,
    total:      results.length,
    passed:     results.filter((r) => r.valid && r.warnings.length === 0).length,
    failures:   failures.length,
    warnings:   warnings.length,
    emailSent:  allSent,
    skipReason: null,
    issues:     issueSnapshot,
  });

  return { sent: allSent, failures: failures.length, warnings: warnings.length };
}

let scheduled = false;

export function scheduleSchemaHealthDaily(): void {
  if (scheduled) return;
  scheduled = true;

  setTimeout(() => {
    void runSchemaHealthCheck().catch((err) =>
      JOB_LOG.error({ err }, "Schema health check threw on startup tick"),
    );
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runSchemaHealthCheck().catch((err) =>
      JOB_LOG.error({ err }, "Schema health check threw on daily tick"),
    );
  }, ONE_DAY_MS);

  JOB_LOG.info(
    "Scheduled daily schema health check (initial run in 4 min, then every 24h)",
  );
}
