import { Router, type IRouter } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { EmailFinancialHealthScoreReportBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import { sendMail } from "../lib/mailer";
import { formRateLimiter } from "../lib/rateLimiter";
import { escapeHtml } from "../lib/routeHelpers";

// ── SSRF guard ────────────────────────────────────────────────────────────────
// Both /tools/site-preview and /tools/fetch-title are public endpoints that
// proxy outbound HTTP requests on behalf of users. Without this guard an
// attacker could point them at 127.0.0.1, 169.254.169.254 (AWS IMDS), or any
// private-network address reachable from the server host — leaking internal
// configuration or data. The check operates on the raw hostname string from
// the parsed URL (before any DNS resolution), which is sufficient to block
// direct IP references and common alias forms. DNS-rebinding is mitigated at
// the infrastructure level (Hostinger's isolated container network).

/**
 * Returns true when the URL's hostname is a known private/loopback/reserved
 * address that must never be reached by a server-side fetch proxy.
 */
function isPrivateHostname(hostname: string): boolean {
  // Strip IPv6 brackets (e.g. "[::1]" → "::1") and normalise case.
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Loopback aliases
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;

  // Decimal-only "IP" like 2130706433 (= 127.0.0.1) — block unconditionally.
  if (/^\d+$/.test(h)) return true;

  // Standard dotted-decimal IPv4 range checks
  const oct = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (oct) {
    const [a, b] = [Number(oct[1]), Number(oct[2])];
    if (a === 0)                              return true; // 0.x.x.x unspecified
    if (a === 10)                             return true; // 10.x.x.x private A
    if (a === 100 && b >= 64 && b <= 127)    return true; // 100.64-127.x CGNAT
    if (a === 127)                            return true; // 127.x.x.x loopback
    if (a === 169 && b === 254)               return true; // 169.254.x.x link-local / AWS IMDS
    if (a === 172 && b >= 16 && b <= 31)     return true; // 172.16-31.x private B
    if (a === 192 && b === 168)               return true; // 192.168.x.x private C
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18-19.x benchmarking
  }

  // IPv6 private / link-local prefixes
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 unique-local
  if (h.startsWith("fe80"))                      return true; // fe80::/10 link-local

  // Cloud provider instance metadata hostnames. These resolve to private IPs
  // (169.254.169.254 on GCP/AWS/Azure) so they're blocked by the IPv4 check
  // above when used as IPs, but also need blocking as hostnames.
  if (
    h === "metadata.google.internal" || // GCP instance metadata
    h === "metadata.internal"           // Azure / generic cloud metadata
  ) return true;

  return false;
}

// ── Site Preview Cache ────────────────────────────────────────────────────────
// In-memory TTL cache so repeated hovers on the same domain don't re-fetch.
type PreviewEntry = { title: string; description: string; fetchedAt: number };
const PREVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const PREVIEW_CACHE_MAX = 500;
const previewCache = new Map<string, PreviewEntry>();

function prunePreviewCache() {
  if (previewCache.size <= PREVIEW_CACHE_MAX) return;
  const cutoff = Date.now() - PREVIEW_CACHE_TTL_MS;
  for (const [k, v] of previewCache) {
    if (v.fetchedAt < cutoff) previewCache.delete(k);
    if (previewCache.size <= PREVIEW_CACHE_MAX) break;
  }
}

function extractMeta(html: string): { title: string; description: string } {
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .trim();

  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<>]+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:title["']/i)?.[1] ?? "";

  const rawTitle =
    html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? "";

  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"'<>]+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:description["']/i)?.[1] ?? "";

  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"'<>]+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']description["']/i)?.[1] ?? "";

  return {
    title: decode(ogTitle || rawTitle),
    description: decode(ogDesc || metaDesc),
  };
}

const router: IRouter = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_FROM_EMAIL =
  process.env.REPORT_FROM_EMAIL ?? "FintechPressHub <reports@fintechpresshub.com>";

function bandColor(score: number): { bg: string; fg: string; ring: string } {
  if (score >= 85) return { bg: "#E6F8F0", fg: "#0BAC6E", ring: "#0BAC6E" };
  if (score >= 70) return { bg: "#E6EFFF", fg: "#0052FF", ring: "#0052FF" };
  if (score >= 55) return { bg: "#FEF4E0", fg: "#B5760B", ring: "#F2A516" };
  if (score >= 40) return { bg: "#FBE8DC", fg: "#E67324", ring: "#E67324" };
  return { bg: "#FBE0DD", fg: "#D8362A", ring: "#D8362A" };
}

type ReportInput = {
  score: number;
  label: string;
  metrics: {
    dti: number;
    savingsRate: number;
    emergencyFundMonths: number;
    expenseRatio: number;
  };
  tips: { title: string; body: string }[];
};

function buildReportText(input: ReportInput): string {
  const siteUrl = getSiteUrl();
  const calcUrl = `${siteUrl}/tools/financial-health-score-calculator`;
  const m = input.metrics;
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const tipsText = input.tips
    .map((tip, i) => `${i + 1}. ${tip.title}\n   ${tip.body}`)
    .join("\n\n");

  return [
    "YOUR FINANCIAL HEALTH SCORE REPORT",
    "FintechPressHub",
    "",
    `Score: ${input.score}/100 — ${input.label}`,
    `Calculated: ${dateStr}`,
    "",
    "YOUR KEY RATIOS",
    "──────────────────────────────────────",
    `Debt-to-Income (DTI):  ${m.dti.toFixed(1)}%   (Target ≤ 35%)`,
    `Savings Rate:          ${m.savingsRate.toFixed(1)}%   (Target ≥ 10%)`,
    `Emergency Fund:        ${m.emergencyFundMonths.toFixed(1)} months  (Target ≥ 3 months)`,
    `Expense Ratio:         ${m.expenseRatio.toFixed(1)}%   (Target ≤ 75%)`,
    "",
    "PERSONALIZED TIPS",
    "──────────────────────────────────────",
    tipsText,
    "",
    "──────────────────────────────────────",
    "A NOTE ON THIS REPORT",
    "This is an educational snapshot, not financial advice. For decisions",
    "involving taxes, investments, or debt restructuring, consult a licensed",
    "financial professional in your jurisdiction.",
    "",
    `Re-run the calculator: ${calcUrl}`,
    "",
    "You're receiving this because you requested a Financial Health Score",
    `report on FintechPressHub. © ${new Date().getFullYear()} FintechPressHub`,
    siteUrl,
  ].join("\n");
}

function buildReportHtml(input: ReportInput): string {
  const siteUrl = getSiteUrl();
  const colors = bandColor(input.score);
  const m = input.metrics;
  const metricRow = (
    label: string,
    value: string,
    target: string,
    good: boolean,
  ) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(label)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:${good ? "#0BAC6E" : "#D8362A"};font-weight:700;text-align:right;">${escapeHtml(value)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-align:right;">${escapeHtml(target)}</td>
    </tr>`;

  const tipsHtml = input.tips
    .map(
      (tip, i) => `
        <tr>
          <td style="padding:18px 16px 18px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top;width:36px;">
            <div style="width:28px;height:28px;border-radius:6px;background:#0052FF;color:#ffffff;font-weight:700;font-size:14px;text-align:center;line-height:28px;">${i + 1}</div>
          </td>
          <td style="padding:18px 16px 18px 4px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">${escapeHtml(tip.title)}</div>
            <div style="font-size:14px;color:#475569;line-height:1.55;">${escapeHtml(tip.body)}</div>
          </td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your Financial Health Score Report</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="background:#0A1628;padding:28px 32px;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:6px;">FintechPressHub</div>
                <div style="font-size:22px;font-weight:800;line-height:1.25;">Your Financial Health Score Report</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-bottom:8px;">
                      <div style="display:inline-block;width:160px;height:160px;border-radius:50%;background:${colors.bg};text-align:center;line-height:160px;border:8px solid ${colors.ring};">
                        <span style="font-size:48px;font-weight:800;color:${colors.fg};line-height:1;">${input.score}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:16px;">
                      <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${colors.bg};color:${colors.fg};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${colors.ring}33;">${escapeHtml(input.label)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:12px;font-size:13px;color:#64748b;">
                      Score out of 100 · Calculated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                </table>

                <h2 style="margin:32px 0 12px 0;font-size:16px;font-weight:700;color:#0f172a;">Your Key Ratios</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
                  ${metricRow("Debt-to-Income (DTI)", `${m.dti.toFixed(1)}%`, "Target \u2264 35%", m.dti <= 35)}
                  ${metricRow("Savings Rate", `${m.savingsRate.toFixed(1)}%`, "Target \u2265 10%", m.savingsRate >= 10)}
                  ${metricRow("Emergency Fund", `${m.emergencyFundMonths.toFixed(1)} months`, "Target \u2265 3 months", m.emergencyFundMonths >= 3)}
                  ${metricRow("Expense Ratio", `${m.expenseRatio.toFixed(1)}%`, "Target \u2264 75%", m.expenseRatio <= 75)}
                </table>

                <h2 style="margin:32px 0 8px 0;font-size:16px;font-weight:700;color:#0f172a;">Personalized Tips</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
                  ${tipsHtml}
                </table>

                <div style="margin-top:32px;padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">A note on this report</div>
                  <div style="font-size:12px;color:#64748b;line-height:1.55;">
                    This is an educational snapshot, not financial advice. For decisions involving taxes, investments, or debt restructuring, consult a licensed financial professional in your jurisdiction.
                  </div>
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td align="center">
                      <a href="${siteUrl}/tools/financial-health-score-calculator" style="display:inline-block;background:#0052FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;">Re-run the calculator \u2192</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;text-align:center;">
                You requested this report on FintechPressHub's Financial Health Score tool.<br />
                This is a transactional email — no marketing content.<br />
                &copy; ${new Date().getFullYear()} FintechPressHub &middot;
                <a href="${siteUrl}" style="color:#0052FF;text-decoration:none;">fintechpresshub.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
  listUnsubscribeUrl: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, reason: "no_provider" };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REPORT_FROM_EMAIL,
        to: [args.to],
        reply_to: args.replyTo,
        subject: args.subject,
        html: args.html,
        text: args.text,
        headers: {
          "List-Unsubscribe": `<${args.listUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": `fph-health-report-${Date.now()}`,
        },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        ok: false,
        reason: `resend_${resp.status}:${text.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `network:${(err as Error).message}` };
  }
}

router.post("/tools/financial-health-score/email-report", async (req, res) => {
  const parsed = EmailFinancialHealthScoreReportBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const marketingOptIn = data.marketingOptIn ?? true;

  let alreadySubscribed = false;
  if (marketingOptIn) {
    const existing = await db
      .select()
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      alreadySubscribed = true;
    } else {
      await db
        .insert(newsletterSubscribersTable)
        .values({ email, source: "financial-health-tool" });
    }
  }

  const siteUrl = getSiteUrl();
  const reportInput: ReportInput = {
    score: data.score,
    label: data.label,
    metrics: data.metrics,
    tips: data.tips,
  };

  const html = buildReportHtml(reportInput);
  const text = buildReportText(reportInput);
  const subject = `Your Financial Health Score: ${data.score}/100 (${data.label})`;

  const replyTo = process.env["REPORT_FROM_EMAIL"]
    ? process.env["REPORT_FROM_EMAIL"].replace(/^.*<(.+)>.*$/, "$1").trim()
    : "hello@fintechpresshub.com";

  const sendResult = await sendViaResend({
    to: email,
    subject,
    html,
    text,
    replyTo,
    listUnsubscribeUrl: `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}`,
  });

  if (sendResult.ok) {
    res.json({
      delivered: true,
      deliveryStatus: "sent",
      alreadySubscribed,
      message:
        "Your report has been emailed. Check your inbox in the next minute or two.",
    });
    return;
  }

  if (sendResult.reason === "no_provider") {
    res.json({
      delivered: false,
      deliveryStatus: "skipped_no_provider",
      alreadySubscribed,
      message: marketingOptIn
        ? "You're subscribed. Email delivery isn't configured yet — we'll send your report as soon as it's enabled."
        : "Email delivery isn't configured yet on this site.",
    });
    return;
  }

  logger.warn({ reason: sendResult.reason }, "[tools] Resend email failed");
  res.json({
    delivered: false,
    deliveryStatus: "failed",
    alreadySubscribed,
    message:
      "We saved your request but couldn't send the email right now. Please try again shortly.",
  });
});

router.get("/tools/site-preview", async (req, res) => {
  const domain = (req.query.domain as string | undefined)?.trim().toLowerCase();
  if (!domain) {
    res.status(400).json({ error: "Missing domain parameter." });
    return;
  }

  // Serve from cache if still fresh
  const cached = previewCache.get(domain);
  if (cached && Date.now() - cached.fetchedAt < PREVIEW_CACHE_TTL_MS) {
    res.set("X-Preview-Cache", "HIT");
    res.json({ title: cached.title, description: cached.description });
    return;
  }

  let targetUrl: string;
  try {
    const parsed = new URL(domain.startsWith("http") ? domain : `https://${domain}`);
    if (isPrivateHostname(parsed.hostname)) {
      res.status(400).json({ error: "That domain is not publicly accessible." });
      return;
    }
    targetUrl = parsed.href;
  } catch {
    res.status(400).json({ error: "Invalid domain." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FintechPressHub-Analyzer/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!resp.ok) {
      res.status(502).json({ error: `Site returned HTTP ${resp.status}.` });
      return;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      res.status(400).json({ error: "URL doesn't point to an HTML page." });
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: "Could not read response." });
      return;
    }

    let html = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    while (bytes < 60_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const { title, description } = extractMeta(html);

    const entry: PreviewEntry = { title, description, fetchedAt: Date.now() };
    previewCache.set(domain, entry);
    prunePreviewCache();

    res.set("X-Preview-Cache", "MISS");
    res.json({ title, description });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    res.status(502).json({
      error: isAbort
        ? "The site took too long to respond."
        : "Couldn't reach that site.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

router.get("/tools/fetch-title", async (req, res) => {
  const rawUrl = req.query.url as string | undefined;
  if (!rawUrl) {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Bad protocol");
    }
  } catch {
    res.status(400).json({ error: "Invalid URL. Make sure it starts with https://." });
    return;
  }

  if (isPrivateHostname(parsedUrl.hostname)) {
    res.status(400).json({ error: "That URL is not publicly accessible." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FintechPressHub-Analyzer/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!resp.ok) {
      res.status(400).json({ error: `Page returned ${resp.status}. Make sure the URL is publicly accessible.` });
      return;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      res.status(400).json({ error: "URL doesn't point to an HTML page." });
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: "Could not read response." });
      return;
    }

    let html = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    while (bytes < 50_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<>]+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);

    const raw = ogMatch?.[1] ?? titleMatch?.[1] ?? "";
    const title = raw
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!title) {
      res.status(400).json({ error: "No title tag found on that page." });
      return;
    }

    res.json({ title });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    res.status(400).json({
      error: isAbort
        ? "The page took too long to respond. Try a different URL."
        : "Couldn't reach that page. Make sure it's publicly accessible.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

const SendPitchBody = z.object({
  senderEmail: z.string().email().max(254),
  recipientEmail: z.string().email().max(254),
  subject: z.string().min(1).max(500),
  body: z.string().min(10).max(5000),
});

router.post("/tools/send-pitch", formRateLimiter, async (req, res) => {
  const parsed = SendPitchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const { senderEmail, recipientEmail, subject, body } = parsed.data;

  const sent = await sendMail({
    to: recipientEmail,
    subject,
    text: body,
    replyTo: senderEmail,
  });

  if (!sent) {
    logger.warn({ to: recipientEmail }, "[tools] send-pitch email failed");
    res.status(502).json({ ok: false, error: "Couldn't send the email right now. Please try again." });
    return;
  }

  logger.info({ to: recipientEmail }, "[tools] send-pitch sent");
  res.json({ ok: true });
});

// ── Suggest Topic Cache ───────────────────────────────────────────────────────
type TopicEntry = { topic: string; fetchedAt: number };
const TOPIC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const topicCache = new Map<string, TopicEntry>();

const EXACT_TOPIC_MAP: Record<string, string> = {
  "nerdwallet": "Personal Finance Tips for Gen Z",
  "moz": "How to Build Domain Authority for Fintech Brands",
  "searchengineland": "SEO Strategies for Financial Services Websites",
  "finextra": "Open Banking Trends Reshaping the Payments Industry",
  "thefinancialbrand": "Digital Banking UX Trends That Drive Customer Loyalty",
  "paymentsdive": "The Future of Embedded Payments in B2B SaaS",
  "bankingdive": "How Digital-First Banks Are Winning Millennials",
  "pymnts": "How AI Is Transforming Fraud Detection in Real-Time Payments",
  "crowdfundinsider": "Equity Crowdfunding Regulations: What Founders Need to Know",
  "techcrunch": "Fintech Startups Disrupting the $10T Global Lending Market",
  "businessinsider": "10 Fintech Apps That Are Changing How Americans Save Money",
  "forbes": "The Wealthiest Fintech Companies Reshaping Personal Finance",
  "investopedia": "A Beginner's Guide to DeFi Investing",
  "bankrate": "How to Choose the Best High-Yield Savings Account in 2025",
  "creditkarma": "Credit Score Improvement Strategies That Actually Work",
  "wealthsimple": "Passive Investing for Beginners: ETFs vs. Index Funds",
  "robinhood": "Commission-Free Trading: What It Means for Retail Investors",
  "coinbase": "A Beginner's Guide to Buying Your First Cryptocurrency",
  "stripe": "Payment Processing Fees Explained: How to Minimize Costs",
  "plaid": "Open Banking APIs: How Fintechs Are Building Data-Driven Products",
  "chime": "Why Gen Z Is Ditching Traditional Banks for Neobanks",
  "sofi": "Student Loan Refinancing: A Step-by-Step Guide",
  "mint": "Budgeting Apps Compared: What to Look for in 2025",
  "acorns": "Micro-Investing for Beginners: Growing Wealth $5 at a Time",
  "betterment": "Robo-Advisors vs. Human Advisors: Which Is Right for You?",
  "wealthfront": "Automated Investing: How Tax-Loss Harvesting Works",
  "affirm": "Buy Now Pay Later: Pros, Cons and Hidden Risks",
  "klarna": "BNPL Regulations: How New Rules Will Change Consumer Credit",
  "paypal": "Digital Wallets and the Future of Online Checkout",
  "venmo": "Peer-to-Peer Payments: How Social Finance Is Evolving",
  "cashapp": "Mobile Banking Without the Bank: The Cash App Story",
  "zelle": "Bank-Backed P2P Payments: Why Zelle Is Winning in the US",
  "experian": "How Credit Bureaus Work and How to Fix Errors Fast",
  "equifax": "Understanding Your Credit Report: A Complete Guide",
  "transunion": "Credit Monitoring Services: Are They Worth the Cost?",
};

const KEYWORD_TOPIC_MAP: Array<[RegExp, string]> = [
  [/crypto|bitcoin|blockchain|defi|web3|coin|token|nft/i, "DeFi Investment Strategies for Risk-Averse Retail Investors"],
  [/invest|wealth|asset|portfolio|fund|etf|stock|equity|trade|market|roth|ira/i, "Passive Wealth Building Strategies for Working Professionals"],
  [/bank|lend|loan|credit|debt|mortgage|borrow|refinanc/i, "How to Refinance High-Interest Debt in a Rising Rate Environment"],
  [/pay|payment|wallet|money|transfer|remit|send|checkout|pos/i, "The Rise of Instant Payments: What Businesses Need to Know"],
  [/insur|protect|cover|underwrite|risk|claim/i, "Embedded Insurance: The Next Frontier in Fintech Bundling"],
  [/tax|account|bookkeep|audit|cpa|payroll|expense/i, "Tax-Loss Harvesting Strategies for Self-Employed Fintech Professionals"],
  [/forex|fx|currency|exchange|international/i, "How Retail Traders Are Leveraging AI-Powered FX Analytics"],
  [/sav|budget|plan|retire|pension|401k|emergency/i, "The 50/30/20 Budget Rule: A Modern Take for High Earners"],
  [/startup|vc|venture|angel|seed|raise|founder|pitch/i, "Fintech Fundraising: What Investors Look For in 2025"],
  [/seo|search|content|media|market|blog|press|news|journal|magazine|publish/i, "SEO Content Strategy for Fintech Brands: A Practical Guide"],
  [/tech|software|saas|api|platform|data|ai|ml|cloud|developer/i, "How Embedded Finance APIs Are Enabling the Next Wave of B2B SaaS"],
  [/regtech|comply|legal|law|govern|policy|regulat|aml|kyc/i, "Navigating AML Compliance: A Practical Guide for Fintech Startups"],
  [/property|mortgage|home|real.?estate|reit|proptech/i, "PropTech Meets Fintech: Digital Mortgages and What They Mean for Buyers"],
  [/small.?biz|smb|sme|entrepreneur|freelanc|self.?employ|gig/i, "Cash Flow Management Tips for Freelancers and Small Business Owners"],
  [/score|rating|report|bureau|monitor/i, "Improving Your Credit Score: Strategies That Move the Needle"],
  [/reward|cashback|loyalty|point|miles|card|perk/i, "Maximising Credit Card Rewards: A Strategy Guide for Frequent Spenders"],
];

function suggestGuestPostTopic(domain: string): string {
  const name = domain
    .toLowerCase()
    .replace(/\.(com|io|net|org|co\.uk|co|uk|us|ca|au|eu|me|app|dev|info|biz)$/, "")
    .replace(/^(www|blog|finance|fintech|pay|bank|the|my|get|go|try|use)\./i, "")
    .replace(/[-_.]/g, " ")
    .trim();

  for (const [key, topic] of Object.entries(EXACT_TOPIC_MAP)) {
    if (name.includes(key)) return topic;
  }

  for (const [pattern, topic] of KEYWORD_TOPIC_MAP) {
    if (pattern.test(name)) return topic;
  }

  return "Guest Post Pitching Guide for Fintech Content Marketers in 2025";
}

router.get("/tools/suggest-topic", (req, res) => {
  const domain = (req.query.domain as string | undefined)?.trim().toLowerCase();
  if (!domain) {
    res.status(400).json({ error: "Missing domain parameter." });
    return;
  }

  const cached = topicCache.get(domain);
  if (cached && Date.now() - cached.fetchedAt < TOPIC_CACHE_TTL_MS) {
    res.set("X-Topic-Cache", "HIT");
    res.json({ topic: cached.topic });
    return;
  }

  const topic = suggestGuestPostTopic(domain);
  topicCache.set(domain, { topic, fetchedAt: Date.now() });

  res.set("X-Topic-Cache", "MISS");
  res.json({ topic });
});

export default router;
