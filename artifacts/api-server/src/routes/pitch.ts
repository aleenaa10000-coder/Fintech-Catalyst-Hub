import { Router, type IRouter } from "express";
import { z } from "zod";
import nodemailer, { type Transporter } from "nodemailer";
import validator from "validator";
import { db, guestPostSubmissionsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { formRateLimiter } from "../lib/rateLimiter";

const PitchBody = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  website: z.string().trim().url().max(500).optional().or(z.literal("")),
  topic: z.string().trim().min(4).max(200),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  pitch: z.string().trim().min(30).max(4000),
  sampleUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

type PitchInput = z.infer<typeof PitchBody>;

type SanitizedPitch = {
  name: string;
  email: string;
  website: string;
  topic: string;
  category: string;
  pitch: string;
  sampleUrl: string;
};

function sanitize(input: PitchInput): SanitizedPitch {
  const safe = (value: string | undefined): string => validator.escape((value ?? "").trim());
  return {
    name: safe(input.name),
    email: validator.normalizeEmail(input.email.trim()) || safe(input.email),
    website: safe(input.website),
    topic: safe(input.topic),
    category: safe(input.category),
    pitch: safe(input.pitch),
    sampleUrl: safe(input.sampleUrl),
  };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

function buildHtml(s: SanitizedPitch): string {
  const row = (label: string, value: string): string =>
    value
      ? `<tr><td style="padding:6px 12px;color:#475569;font-weight:600;vertical-align:top">${label}</td><td style="padding:6px 12px;color:#0f172a">${value}</td></tr>`
      : "";
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a8a;color:#ffffff;padding:20px 24px"><h1 style="margin:0;font-size:18px">New Guest-Post Pitch</h1><p style="margin:4px 0 0;font-size:13px;opacity:0.85">FintechPressHub · Write For Us</p></div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row("Name", s.name)}
        ${row("Email", s.email)}
        ${row("Website", s.website)}
        ${row("Topic", s.topic)}
        ${row("Category", s.category)}
        ${row("Sample URL", s.sampleUrl)}
      </table>
      <div style="padding:16px 24px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;color:#64748b;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:8px">The Pitch</div>
        <div style="font-size:14px;line-height:1.55;white-space:pre-wrap;color:#0f172a">${s.pitch}</div>
      </div>
    </div>
  </body></html>`;
}

function buildText(s: SanitizedPitch): string {
  return [
    "New Guest-Post Pitch — FintechPressHub",
    "",
    `Name:       ${s.name}`,
    `Email:      ${s.email}`,
    s.website ? `Website:    ${s.website}` : null,
    `Topic:      ${s.topic}`,
    s.category ? `Category:   ${s.category}` : null,
    s.sampleUrl ? `Sample URL: ${s.sampleUrl}` : null,
    "",
    "The Pitch:",
    s.pitch,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildConfirmationHtml(s: SanitizedPitch): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a8a;color:#ffffff;padding:24px 28px">
        <h1 style="margin:0;font-size:20px;line-height:1.3">Pitch Received</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.85">FintechPressHub · Editorial Team</p>
      </div>
      <div style="padding:24px 28px;font-size:15px;line-height:1.6">
        <p style="margin:0 0 14px">Hi ${s.name},</p>
        <p style="margin:0 0 14px">Thanks for sending us your guest-post pitch — we've received it and added it to our editorial review queue.</p>
        <p style="margin:0 0 14px">Our editors will read it carefully and get back to you at this email address within <strong>3–5 business days</strong>. If we'd like to move forward, we'll reply with next steps and a writer brief; if the pitch isn't a fit, we'll let you know quickly so you can take it elsewhere.</p>
        <div style="margin:20px 0;padding:14px 16px;background:#f1f5f9;border-radius:8px;font-size:13px;color:#334155">
          <div style="font-weight:600;color:#0f172a;margin-bottom:6px">Your pitch summary</div>
          <div><strong>Working title:</strong> ${s.topic}</div>
          ${s.category ? `<div><strong>Category:</strong> ${s.category}</div>` : ""}
        </div>
        <p style="margin:0 0 6px">In the meantime, please don't submit the same article elsewhere while we evaluate it.</p>
        <p style="margin:18px 0 0">— The FintechPressHub Editorial Team</p>
      </div>
      <div style="padding:14px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
        This is an automated confirmation. You can simply reply to this email if you need to add anything to your pitch.
      </div>
    </div>
  </body></html>`;
}

function buildConfirmationText(s: SanitizedPitch): string {
  return [
    `Hi ${s.name},`,
    "",
    "Thanks for sending us your guest-post pitch — we've received it and added it to our editorial review queue.",
    "",
    "Our editors will read it carefully and get back to you at this email address within 3–5 business days. If we'd like to move forward, we'll reply with next steps and a writer brief; if the pitch isn't a fit, we'll let you know quickly so you can take it elsewhere.",
    "",
    "Your pitch summary",
    `  Working title: ${s.topic}`,
    s.category ? `  Category:      ${s.category}` : null,
    "",
    "In the meantime, please don't submit the same article elsewhere while we evaluate it.",
    "",
    "— The FintechPressHub Editorial Team",
    "",
    "This is an automated confirmation. You can simply reply to this email if you need to add anything to your pitch.",
  ]
    .filter(Boolean)
    .join("\n");
}

const router: IRouter = Router();

router.post("/pitch", formRateLimiter, async (req, res) => {
  const parsed = PitchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }

  const safe = sanitize(parsed.data);
  const recipient = process.env.PITCH_RECIPIENT_EMAIL;

  try {
    await db.insert(guestPostSubmissionsTable).values({
      name: safe.name,
      email: safe.email,
      website: safe.website || null,
      topic: safe.topic,
      category: safe.category || null,
      pitch: safe.pitch,
      sampleUrl: safe.sampleUrl || null,
    });
  } catch (err) {
    logger.error({ err }, "pitch: failed to persist submission");
  }

  const transporter = getTransporter();
  if (!transporter || !recipient) {
    logger.warn(
      "pitch: SMTP credentials or PITCH_RECIPIENT_EMAIL not configured; submission accepted but email not sent",
    );
    res.status(202).json({
      ok: true,
      emailed: false,
      message: "Pitch received. Email delivery is not configured.",
    });
    return;
  }

  // Hostinger requires the envelope From to match the authenticated SMTP_USER.
  const smtpUser = process.env.SMTP_USER ?? "";
  const fromPitches = `"FintechPressHub Pitches" <${smtpUser}>`;
  const fromEditorial = `"FintechPressHub Editorial" <${smtpUser}>`;

  try {
    await transporter.sendMail({
      from: fromPitches,
      to: recipient,
      replyTo: safe.email,
      subject: `New pitch: ${safe.topic} — ${safe.name}`,
      text: buildText(safe),
      html: buildHtml(safe),
    });
  } catch (err) {
    logger.error({ err }, "pitch: failed to send editorial notification");
    res
      .status(502)
      .json({ ok: false, error: "Failed to send email. Please try again later." });
    return;
  }

  let confirmationEmailed = true;
  try {
    await transporter.sendMail({
      from: fromEditorial,
      to: safe.email,
      replyTo: recipient,
      subject: "We received your pitch — FintechPressHub",
      text: buildConfirmationText(safe),
      html: buildConfirmationHtml(safe),
    });
  } catch (err) {
    confirmationEmailed = false;
    logger.warn({ err }, "pitch: failed to send confirmation to contributor");
  }

  res.status(200).json({ ok: true, emailed: true, confirmationEmailed });
});

export default router;
