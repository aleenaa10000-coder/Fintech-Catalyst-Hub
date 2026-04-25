import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

/**
 * Strip common formatting artifacts that can end up in env-var email addresses:
 * surrounding parentheses, angle brackets, quotes, and extra whitespace.
 * e.g. "(hello@example.com)" → "hello@example.com"
 *      "<hello@example.com>" → "hello@example.com"
 */
export function cleanEmail(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^[('"<]+|[)'">\s]+$/g, "").trim();
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
}

// ---------------------------------------------------------------------------
// SMTP transport (Nodemailer)
// ---------------------------------------------------------------------------

let cachedTransporter: Transporter | null | undefined;

function buildTransporter(): Transporter | null {
  const host = process.env["SMTP_HOST"];
  const port = process.env["SMTP_PORT"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !port || !user || !pass) {
    return null;
  }

  const portNum = Number(port);
  if (Number.isNaN(portNum) || portNum <= 0) {
    logger.error({ port }, "Invalid SMTP_PORT — SMTP transport disabled");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: { user, pass },
  });
}

function getTransporter(): Transporter | null {
  if (cachedTransporter === undefined) {
    cachedTransporter = buildTransporter();
  }
  return cachedTransporter;
}

function smtpFromAddress(display: string): string {
  const smtpUser = process.env["SMTP_USER"] ?? "";
  const rawFrom = process.env["SMTP_FROM"] ?? "";
  const match = rawFrom.match(/^"?([^"<]+)"?\s*</);
  const name = match ? match[1].trim() : display;
  return `"${name}" <${smtpUser}>`;
}

async function sendViaSMTP(opts: SendMailOptions & { from: string }): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    const info = await transporter.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    logger.info({ messageId: info.messageId, to: opts.to }, "Outbound email sent via SMTP");
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send email via SMTP");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Resend transport (REST API)
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const DEFAULT_FROM_EMAIL =
  process.env["REPORT_FROM_EMAIL"] ?? "FintechPressHub <onboarding@resend.dev>";

async function sendViaResend(opts: SendMailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  const from = opts.from ?? DEFAULT_FROM_EMAIL;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      logger.error({ status: resp.status, body: text.slice(0, 200), to: opts.to }, "Resend API error");
      return false;
    }

    logger.info({ to: opts.to }, "Outbound email sent via Resend");
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send email via Resend");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Unified sendMail — tries SMTP first, falls back to Resend
// ---------------------------------------------------------------------------

export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const transporter = getTransporter();

  if (transporter) {
    const smtpFrom = smtpFromAddress(opts.from ?? "FintechPressHub");
    return sendViaSMTP({ ...opts, from: smtpFrom });
  }

  if (RESEND_API_KEY) {
    return sendViaResend(opts);
  }

  logger.warn(
    { to: opts.to },
    "No email transport configured (SMTP credentials and RESEND_API_KEY both missing)",
  );
  return false;
}
