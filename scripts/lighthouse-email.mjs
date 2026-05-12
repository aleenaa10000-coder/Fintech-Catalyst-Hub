#!/usr/bin/env node
/**
 * lighthouse-email.mjs
 *
 * Reads Lighthouse CI JSON results from .lighthouseci/ and sends a formatted
 * HTML report via the Resend API. Includes both category scores and Core Web
 * Vitals (LCP, CLS, TBT, FCP, TTI) per page.
 *
 * Required env vars:
 *   RESEND_API_KEY   — Resend API key (already used by the app's mailer)
 *
 * Optional env vars:
 *   REPORT_TO_EMAIL   — recipient address (default: hello@fintechpresshub.com)
 *   REPORT_FROM_EMAIL — from address     (default: FintechPressHub <hello@...>)
 *   LHCI_DIR          — path to lhci output dir (default: .lighthouseci)
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.REPORT_TO_EMAIL ?? "hello@fintechpresshub.com";
const FROM_EMAIL =
  process.env.REPORT_FROM_EMAIL ??
  "FintechPressHub <hello@fintechpresshub.com>";
const LHCI_DIR = resolve(process.env.LHCI_DIR ?? ".lighthouseci");

if (!RESEND_API_KEY) {
  console.error("[lighthouse-email] RESEND_API_KEY is not set — aborting.");
  process.exit(1);
}

// ── Parse LHR files ──────────────────────────────────────────────────────────

function readLhrFiles(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    console.error(`[lighthouse-email] Cannot read LHCI dir: ${dir}`);
    process.exit(1);
  }
  return files
    .filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ── Category score helpers ───────────────────────────────────────────────────

function catScore(val) {
  return val != null ? Math.round(val * 100) : null;
}

function catColor(s) {
  if (s == null) return "#6b7280";
  if (s >= 90) return "#16a34a";
  if (s >= 70) return "#d97706";
  return "#dc2626";
}

function scoreBadge(s) {
  const color = catColor(s);
  const label = s != null ? `${s}` : "n/a";
  return `<span style="display:inline-block;min-width:36px;text-align:center;
    background:${color};color:#fff;border-radius:4px;
    padding:2px 8px;font-weight:700;font-size:15px">${label}</span>`;
}

// ── Core Web Vitals helpers ──────────────────────────────────────────────────

function cwvMs(lhr, auditKey) {
  const v = lhr.audits?.[auditKey]?.numericValue;
  return v != null ? Math.round(v) : null;
}

function cwvRaw(lhr, auditKey) {
  const v = lhr.audits?.[auditKey]?.numericValue;
  return v != null ? v : null;
}

/** Format milliseconds as "1 234 ms" or "2.4 s" depending on magnitude. */
function fmtMs(ms) {
  if (ms == null) return "n/a";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

/** Format CLS (unitless, 3 decimal places). */
function fmtCls(v) {
  return v != null ? v.toFixed(3) : "n/a";
}

/**
 * CWV thresholds — Google "Good" / "Needs improvement" / "Poor" bands.
 * Returns a hex colour for the badge background.
 */
function lcpColor(ms) {
  if (ms == null) return "#6b7280";
  if (ms <= 2500) return "#16a34a";
  if (ms <= 4000) return "#d97706";
  return "#dc2626";
}
function clsColor(v) {
  if (v == null) return "#6b7280";
  if (v <= 0.1) return "#16a34a";
  if (v <= 0.25) return "#d97706";
  return "#dc2626";
}
function tbtColor(ms) {
  if (ms == null) return "#6b7280";
  if (ms <= 200) return "#16a34a";
  if (ms <= 600) return "#d97706";
  return "#dc2626";
}
function fcpColor(ms) {
  if (ms == null) return "#6b7280";
  if (ms <= 1800) return "#16a34a";
  if (ms <= 3000) return "#d97706";
  return "#dc2626";
}
function ttiColor(ms) {
  if (ms == null) return "#6b7280";
  if (ms <= 3800) return "#16a34a";
  if (ms <= 7300) return "#d97706";
  return "#dc2626";
}

function cwvBadge(label, color) {
  return `<span style="display:inline-block;min-width:54px;text-align:center;
    background:${color};color:#fff;border-radius:4px;
    padding:2px 7px;font-weight:600;font-size:13px;white-space:nowrap">${label}</span>`;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}

// ── Build tables ─────────────────────────────────────────────────────────────

const lhrs = readLhrFiles(LHCI_DIR);

if (lhrs.length === 0) {
  console.error("[lighthouse-email] No LHR files found — nothing to send.");
  process.exit(1);
}

const sorted = [...lhrs].sort((a, b) =>
  a.requestedUrl.localeCompare(b.requestedUrl),
);

// Category score rows
const catRows = sorted
  .map((lhr) => {
    const perf = catScore(lhr.categories?.performance?.score);
    const a11y = catScore(lhr.categories?.accessibility?.score);
    const bp   = catScore(lhr.categories?.["best-practices"]?.score);
    const seo  = catScore(lhr.categories?.seo?.score);
    return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 12px;font-family:monospace;font-size:13px;color:#374151">
          ${shortUrl(lhr.requestedUrl)}
        </td>
        <td style="padding:10px 12px;text-align:center">${scoreBadge(perf)}</td>
        <td style="padding:10px 12px;text-align:center">${scoreBadge(a11y)}</td>
        <td style="padding:10px 12px;text-align:center">${scoreBadge(bp)}</td>
        <td style="padding:10px 12px;text-align:center">${scoreBadge(seo)}</td>
      </tr>`;
  })
  .join("");

// Core Web Vitals rows
const cwvRows = sorted
  .map((lhr) => {
    const lcp = cwvMs(lhr, "largest-contentful-paint");
    const cls = cwvRaw(lhr, "cumulative-layout-shift");
    const tbt = cwvMs(lhr, "total-blocking-time");
    const fcp = cwvMs(lhr, "first-contentful-paint");
    const tti = cwvMs(lhr, "interactive");
    return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 12px;font-family:monospace;font-size:13px;color:#374151">
          ${shortUrl(lhr.requestedUrl)}
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${cwvBadge(fmtMs(lcp), lcpColor(lcp))}
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${cwvBadge(fmtCls(cls), clsColor(cls))}
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${cwvBadge(fmtMs(tbt), tbtColor(tbt))}
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${cwvBadge(fmtMs(fcp), fcpColor(fcp))}
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${cwvBadge(fmtMs(tti), ttiColor(tti))}
        </td>
      </tr>`;
  })
  .join("");

const now = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

// ── HTML email ───────────────────────────────────────────────────────────────

const thStyle =
  `padding:10px 12px;text-align:center;color:#475569;` +
  `font-weight:600;font-size:12px;text-transform:uppercase`;
const thLeftStyle =
  `padding:10px 12px;text-align:left;color:#475569;` +
  `font-weight:600;font-size:12px;text-transform:uppercase`;
const sectionHead = (title) =>
  `<h2 style="margin:24px 0 12px;font-size:15px;font-weight:700;color:#1e3a5f;
              letter-spacing:.02em;text-transform:uppercase">${title}</h2>`;

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:8px;
              box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden">

    <div style="background:#1e3a5f;padding:24px 32px">
      <p style="margin:0;color:#93c5fd;font-size:13px;font-weight:600;
                letter-spacing:.05em;text-transform:uppercase">FintechPressHub</p>
      <h1 style="margin:4px 0 0;color:#fff;font-size:22px;font-weight:700">
        Weekly Lighthouse Report
      </h1>
      <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px">${now}</p>
    </div>

    <div style="padding:24px 32px 8px">

      ${sectionHead("Category Scores")}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="${thLeftStyle}">Page</th>
            <th style="${thStyle}">Perf</th>
            <th style="${thStyle}">A11y</th>
            <th style="${thStyle}">BP</th>
            <th style="${thStyle}">SEO</th>
          </tr>
        </thead>
        <tbody>${catRows}</tbody>
      </table>

      ${sectionHead("Core Web Vitals")}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="${thLeftStyle}">Page</th>
            <th style="${thStyle}">LCP</th>
            <th style="${thStyle}">CLS</th>
            <th style="${thStyle}">TBT</th>
            <th style="${thStyle}">FCP</th>
            <th style="${thStyle}">TTI</th>
          </tr>
        </thead>
        <tbody>${cwvRows}</tbody>
      </table>

      <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;
                  border-radius:6px;border:1px solid #e2e8f0">
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.8">
          <strong style="color:#374151">Score key (0–100):</strong>
          <span style="color:#16a34a;font-weight:700">90+</span> Good &nbsp;·&nbsp;
          <span style="color:#d97706;font-weight:700">70–89</span> Needs improvement &nbsp;·&nbsp;
          <span style="color:#dc2626;font-weight:700">&lt;70</span> Poor<br>
          <strong style="color:#374151">CWV thresholds:</strong>
          LCP ≤ 2.5 s &nbsp;·&nbsp; CLS ≤ 0.1 &nbsp;·&nbsp;
          TBT ≤ 200 ms &nbsp;·&nbsp; FCP ≤ 1.8 s &nbsp;·&nbsp; TTI ≤ 3.8 s<br>
          Audited as desktop with simulated throttling — timing values may differ
          from real-user measurements.
        </p>
      </div>
    </div>

    <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Sent automatically every Monday by FintechPressHub CI.
      </p>
    </div>

  </div>
</body>
</html>`;

// ── Plain-text fallback ──────────────────────────────────────────────────────

const text = sorted
  .map((lhr) => {
    const perf = catScore(lhr.categories?.performance?.score) ?? "n/a";
    const a11y = catScore(lhr.categories?.accessibility?.score) ?? "n/a";
    const bp   = catScore(lhr.categories?.["best-practices"]?.score) ?? "n/a";
    const seo  = catScore(lhr.categories?.seo?.score) ?? "n/a";
    const lcp  = fmtMs(cwvMs(lhr, "largest-contentful-paint"));
    const cls  = fmtCls(cwvRaw(lhr, "cumulative-layout-shift"));
    const tbt  = fmtMs(cwvMs(lhr, "total-blocking-time"));
    const fcp  = fmtMs(cwvMs(lhr, "first-contentful-paint"));
    const tti  = fmtMs(cwvMs(lhr, "interactive"));
    return (
      `${shortUrl(lhr.requestedUrl)}\n` +
      `  Scores — Perf:${perf} A11y:${a11y} BP:${bp} SEO:${seo}\n` +
      `  CWV    — LCP:${lcp} CLS:${cls} TBT:${tbt} FCP:${fcp} TTI:${tti}`
    );
  })
  .join("\n\n");

// ── Send via Resend ──────────────────────────────────────────────────────────

const payload = {
  from: FROM_EMAIL,
  to: [TO_EMAIL],
  subject: `Weekly Lighthouse Report — ${now}`,
  html,
  text: `Weekly Lighthouse Report — ${now}\n\n${text}`,
};

const resp = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!resp.ok) {
  const body = await resp.text().catch(() => "");
  console.error(`[lighthouse-email] Resend error ${resp.status}: ${body}`);
  process.exit(1);
}

const { id } = await resp.json();
console.log(`[lighthouse-email] Report sent to ${TO_EMAIL} (id: ${id})`);
