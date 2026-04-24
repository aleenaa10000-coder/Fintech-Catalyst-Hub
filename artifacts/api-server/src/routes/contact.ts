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

  // Auto-reply confirmation to the person who submitted the form
  const replyFromAddr = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"];
  const ackSubject = "Thanks for reaching out to FintechPressHub";
  const ackText = `Hi ${body.name},

Thanks for getting in touch with FintechPressHub — we've received your message and a member of our team will follow up within one business day.

For your records, here's a copy of what you sent:

${body.message}

In the meantime, feel free to browse our latest insights on the blog: https://fintechpresshub.com/blog

Best regards,
The FintechPressHub Team${replyFromAddr ? `\n${replyFromAddr}` : ""}`;
  const ackHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
      <div style="background:linear-gradient(135deg,#0052FF 0%,#0040CC 100%);color:#fff;padding:28px 32px;border-radius:12px 12px 0 0">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;margin-bottom:6px">FintechPressHub</div>
        <h1 style="margin:0;font-size:24px;font-weight:700">Thanks for reaching out, ${escapeHtml(body.name.split(" ")[0] ?? body.name)}!</h1>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px">
          We've received your message and a member of our team will follow up within <b>one business day</b>.
        </p>
        <p style="font-size:13px;color:#64748b;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">For your records</p>
        <div style="border-left:3px solid #0052FF;background:#f1f5ff;padding:14px 16px;border-radius:6px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(body.message)}</div>
        <p style="font-size:14px;line-height:1.6;color:#334155;margin:24px 0 0">
          In the meantime, browse our latest insights on
          <a href="https://fintechpresshub.com/blog" style="color:#0052FF;text-decoration:none;font-weight:600">the blog</a>.
        </p>
        <p style="font-size:14px;color:#334155;margin-top:28px;margin-bottom:0">
          Best regards,<br/>
          <b>The FintechPressHub Team</b>
        </p>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">
        This is an automated confirmation. Please reply directly if you need to add to your message.
      </p>
    </div>
  `;
  void sendMail({
    to: body.email,
    subject: ackSubject,
    text: ackText,
    html: ackHtml,
    ...(replyFromAddr ? { replyTo: replyFromAddr } : {}),
  }).catch((err) =>
    logger.error({ err }, "Contact auto-reply email failed"),
  );

  res.json({
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
