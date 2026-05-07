import { Router, type IRouter } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { EmailFinancialHealthScoreReportBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import { sendMail } from "../lib/mailer";
import { formRateLimiter } from "../lib/rateLimiter";

const router: IRouter = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_FROM_EMAIL =
  process.env.REPORT_FROM_EMAIL ?? "FintechPressHub <reports@fintechpresshub.com>";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

export default router;
