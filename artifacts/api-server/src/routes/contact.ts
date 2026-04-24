import { Router, type IRouter } from "express";
import { db, contactSubmissionsTable } from "@workspace/db";
import { SubmitContactFormBody } from "@workspace/api-zod";
import { sendMail } from "../lib/mailer";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/contact", async (req, res) => {
  const parsed = SubmitContactFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const [row] = await db
    .insert(contactSubmissionsTable)
    .values({
      name: body.name,
      email: body.email,
      company: body.company ?? null,
      phone: body.phone ?? null,
      service: body.service ?? null,
      budget: body.budget ?? null,
      message: body.message,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to save" });
    return;
  }

  const notifyTo =
    process.env["CONTACT_NOTIFY_TO"] ?? process.env["SMTP_USER"];
  if (notifyTo) {
    const subject = `New contact form submission from ${body.name}`;
    const lines = [
      `Name:    ${body.name}`,
      `Email:   ${body.email}`,
      body.company ? `Company: ${body.company}` : null,
      body.phone ? `Phone:   ${body.phone}` : null,
      body.service ? `Service: ${body.service}` : null,
      body.budget ? `Budget:  ${body.budget}` : null,
      "",
      "Message:",
      body.message,
    ].filter((l): l is string => l !== null);
    const text = lines.join("\n");
    const html = `
      <h2 style="font-family:system-ui,sans-serif;color:#0a2540">New contact form submission</h2>
      <table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td><b>Name</b></td><td>${escapeHtml(body.name)}</td></tr>
        <tr><td><b>Email</b></td><td>${escapeHtml(body.email)}</td></tr>
        ${body.company ? `<tr><td><b>Company</b></td><td>${escapeHtml(body.company)}</td></tr>` : ""}
        ${body.phone ? `<tr><td><b>Phone</b></td><td>${escapeHtml(body.phone)}</td></tr>` : ""}
        ${body.service ? `<tr><td><b>Service</b></td><td>${escapeHtml(body.service)}</td></tr>` : ""}
        ${body.budget ? `<tr><td><b>Budget</b></td><td>${escapeHtml(body.budget)}</td></tr>` : ""}
      </table>
      <p style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap;border-left:3px solid #0052FF;padding-left:12px;margin-top:16px">${escapeHtml(body.message)}</p>
    `;
    // Send asynchronously — don't block the response on SMTP latency / failures.
    void sendMail({ to: notifyTo, subject, text, html, replyTo: body.email }).catch(
      (err) => logger.error({ err }, "Contact notification email failed"),
    );
  }

  res.json({
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
