import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

let cachedTransporter: Transporter | null | undefined;

function buildTransporter(): Transporter | null {
  const host = process.env["SMTP_HOST"];
  const port = process.env["SMTP_PORT"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !port || !user || !pass) {
    logger.warn(
      {
        hasHost: !!host,
        hasPort: !!port,
        hasUser: !!user,
        hasPass: !!pass,
      },
      "SMTP credentials missing — outbound email is disabled",
    );
    return null;
  }

  const portNum = Number(port);
  if (Number.isNaN(portNum) || portNum <= 0) {
    logger.error({ port }, "Invalid SMTP_PORT — outbound email is disabled");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: { user, pass },
  });
}

export function getTransporter(): Transporter | null {
  if (cachedTransporter === undefined) {
    cachedTransporter = buildTransporter();
  }
  return cachedTransporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"];
  if (!from) {
    logger.error("SMTP_FROM / SMTP_USER not set — cannot send mail");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    logger.info(
      { messageId: info.messageId, to: opts.to },
      "Outbound email sent",
    );
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send outbound email");
    return false;
  }
}
