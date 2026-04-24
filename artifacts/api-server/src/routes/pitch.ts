import { Router, type IRouter } from "express";
import { z } from "zod";
import nodemailer, { type Transporter } from "nodemailer";
import validator from "validator";
import { db, guestPostSubmissionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

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

const router: IRouter = Router();

router.post("/pitch", async (req, res) => {
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

  try {
    await transporter.sendMail({
      from: `"FintechPressHub Pitches" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: safe.email,
      subject: `New pitch: ${safe.topic} — ${safe.name}`,
      text: buildText(safe),
      html: buildHtml(safe),
    });
    res.status(200).json({ ok: true, emailed: true });
  } catch (err) {
    logger.error({ err }, "pitch: failed to send email");
    res
      .status(502)
      .json({ ok: false, error: "Failed to send email. Please try again later." });
  }
});

export default router;
