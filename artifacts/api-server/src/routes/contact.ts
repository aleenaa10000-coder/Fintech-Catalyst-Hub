import { Router, type IRouter } from "express";
import { gte, desc } from "drizzle-orm";
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
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

// ---------------------------------------------------------------------------
// Daily digest endpoint
// ---------------------------------------------------------------------------
// GET /api/contact/digest?hours=24&dryRun=0
// Auth: Authorization: Bearer <DIGEST_TOKEN>  (or ?token=<DIGEST_TOKEN>)
//
// Pulls every contact submission from the last N hours (default 24) and
// emails a formatted summary to CONTACT_NOTIFY_TO. Designed to be hit by a
// scheduled job (Replit Scheduled Deployment, cron, GitHub Actions, etc.).
// ---------------------------------------------------------------------------
router.get("/contact/digest", async (req, res) => {
  const expectedToken = process.env["DIGEST_TOKEN"];
  if (!expectedToken) {
    res.status(503).json({
      error:
        "DIGEST_TOKEN is not configured on the server. Set it in Secrets to enable digest delivery.",
    });
    return;
  }

  const headerToken = (() => {
    const auth = req.header("authorization") ?? "";
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    return m?.[1]?.trim() ?? "";
  })();
  const queryToken =
    typeof req.query["token"] === "string" ? req.query["token"] : "";
  const provided = headerToken || queryToken;

  if (!provided || !timingSafeEqual(provided, expectedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hoursParam =
    typeof req.query["hours"] === "string" ? Number(req.query["hours"]) : 24;
  const hours =
    Number.isFinite(hoursParam) && hoursParam > 0 && hoursParam <= 24 * 30
      ? hoursParam
      : 24;
  const dryRun = req.query["dryRun"] === "1" || req.query["dryRun"] === "true";

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(contactSubmissionsTable)
    .where(gte(contactSubmissionsTable.createdAt, since))
    .orderBy(desc(contactSubmissionsTable.createdAt));

  const notifyTo =
    process.env["CONTACT_NOTIFY_TO"] ?? process.env["SMTP_USER"];
  if (!notifyTo) {
    res.status(503).json({
      error:
        "CONTACT_NOTIFY_TO / SMTP_USER not configured — cannot deliver digest.",
    });
    return;
  }

  const fmtDate = (d: Date) =>
    d.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });

  const subject = `FintechPressHub digest — ${rows.length} contact submission${
    rows.length === 1 ? "" : "s"
  } in the last ${hours}h`;

  const textBody = (() => {
    if (rows.length === 0) {
      return `No new contact submissions in the last ${hours} hours (since ${fmtDate(
        since,
      )} UTC).`;
    }
    const items = rows
      .map((r, i) => {
        const meta = [
          r.company ? `Company: ${r.company}` : null,
          r.phone ? `Phone: ${r.phone}` : null,
          r.service ? `Service: ${r.service}` : null,
          r.budget ? `Budget: ${r.budget}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        return [
          `${i + 1}. ${r.name} <${r.email}>`,
          `   ${fmtDate(new Date(r.createdAt))} UTC`,
          meta ? `   ${meta}` : null,
          `   Message: ${r.message.replace(/\s+/g, " ").slice(0, 400)}${
            r.message.length > 400 ? "…" : ""
          }`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
    return `${rows.length} contact submission${
      rows.length === 1 ? "" : "s"
    } in the last ${hours} hours (since ${fmtDate(since)} UTC):\n\n${items}`;
  })();

  const htmlBody = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;color:#0a2540">
      <div style="background:linear-gradient(135deg,#0052FF 0%,#0040CC 100%);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;margin-bottom:6px">FintechPressHub · Daily Digest</div>
        <h1 style="margin:0;font-size:22px;font-weight:700">${rows.length} new submission${
          rows.length === 1 ? "" : "s"
        } in the last ${hours}h</h1>
        <div style="font-size:12px;opacity:0.85;margin-top:6px">Since ${escapeHtml(
          fmtDate(since),
        )} UTC</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:24px 28px;border-radius:0 0 12px 12px">
        ${
          rows.length === 0
            ? `<p style="font-size:14px;color:#64748b;margin:0">No new contact submissions in this window. Quiet day!</p>`
            : rows
                .map(
                  (r) => `
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px">
                <div style="font-weight:700;font-size:15px;color:#0a2540">${escapeHtml(r.name)}</div>
                <div style="font-size:11px;color:#94a3b8">${escapeHtml(fmtDate(new Date(r.createdAt)))} UTC</div>
              </div>
              <div style="font-size:13px;color:#0052FF;margin-bottom:8px">
                <a href="mailto:${escapeHtml(r.email)}" style="color:#0052FF;text-decoration:none">${escapeHtml(r.email)}</a>
              </div>
              ${[
                r.company ? `<span style="display:inline-block;font-size:11px;background:#eff6ff;color:#0052FF;padding:2px 8px;border-radius:999px;margin-right:6px">${escapeHtml(r.company)}</span>` : "",
                r.service ? `<span style="display:inline-block;font-size:11px;background:#f1f5f9;color:#334155;padding:2px 8px;border-radius:999px;margin-right:6px">${escapeHtml(r.service)}</span>` : "",
                r.budget ? `<span style="display:inline-block;font-size:11px;background:#f1f5f9;color:#334155;padding:2px 8px;border-radius:999px;margin-right:6px">${escapeHtml(r.budget)}</span>` : "",
                r.phone ? `<span style="display:inline-block;font-size:11px;background:#f1f5f9;color:#334155;padding:2px 8px;border-radius:999px">${escapeHtml(r.phone)}</span>` : "",
              ].join("")}
              <p style="font-size:13px;line-height:1.55;color:#334155;margin:10px 0 0;white-space:pre-wrap">${escapeHtml(
                r.message.length > 600
                  ? r.message.slice(0, 600) + "…"
                  : r.message,
              )}</p>
            </div>
          `,
                )
                .join("")
        }
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:14px">
        Automated digest from FintechPressHub · last ${hours}h
      </p>
    </div>
  `;

  if (dryRun) {
    res.json({
      dryRun: true,
      windowHours: hours,
      since: since.toISOString(),
      count: rows.length,
      notifyTo,
      subject,
      preview: {
        text: textBody.slice(0, 800),
      },
    });
    return;
  }

  const sent = await sendMail({
    to: notifyTo,
    subject,
    text: textBody,
    html: htmlBody,
  });
  if (!sent) {
    logger.error({ count: rows.length }, "Digest email failed to send");
    res.status(502).json({
      error:
        "Digest email failed to send. Check server logs and SMTP credentials.",
      count: rows.length,
    });
    return;
  }

  res.json({
    sent: true,
    windowHours: hours,
    since: since.toISOString(),
    count: rows.length,
    notifyTo,
  });
});

export default router;
