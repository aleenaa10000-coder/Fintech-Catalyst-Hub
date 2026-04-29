import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, contentReportsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isAdminEmail } from "../lib/auth";
import { sendMail, cleanEmail } from "../lib/mailer";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

const REASONS = [
  "spam",
  "inaccurate",
  "inappropriate",
  "copyright",
  "broken",
  "other",
] as const;

const REASON_LABELS: Record<(typeof REASONS)[number], string> = {
  spam: "Spam / promotional",
  inaccurate: "Factually inaccurate",
  inappropriate: "Inappropriate or harmful",
  copyright: "Copyright / plagiarism",
  broken: "Broken link or media",
  other: "Other",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReportEmail(args: {
  id: number;
  contentType: string;
  contentId: string;
  contentTitle: string | null;
  contentUrl: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  reason: (typeof REASONS)[number];
  details: string | null;
}): { subject: string; text: string; html: string } {
  const reasonLabel = REASON_LABELS[args.reason];
  const titleLine =
    args.contentTitle ?? `${args.contentType} · ${args.contentId}`;
  const subject = `New content report (${reasonLabel}): ${titleLine}`;

  const moderationUrl = `${getSiteUrl()}/admin/moderation`;

  const lines = [
    `A reader has flagged content on FintechPressHub.`,
    ``,
    `Reason:        ${reasonLabel}`,
    `Content type:  ${args.contentType}`,
    `Content title: ${titleLine}`,
    args.contentUrl ? `Content URL:   ${args.contentUrl}` : null,
    `Reporter:      ${args.reporterEmail ?? "Anonymous"}${args.reporterName ? ` (${args.reporterName})` : ""}`,
    ``,
    `Details:`,
    args.details ?? "(no additional details provided)",
    ``,
    `Triage in the moderation inbox: ${moderationUrl}`,
  ].filter((l): l is string => l !== null);

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0a2540">
      <h2 style="margin:0 0 8px 0;color:#dc2626">New content report</h2>
      <p style="margin:0 0 16px 0;color:#475569;font-size:14px">A reader has flagged content on FintechPressHub.</p>
      <table cellpadding="6" style="font-size:14px;border-collapse:collapse;margin-bottom:16px">
        <tr><td><b>Reason</b></td><td>${escapeHtml(reasonLabel)}</td></tr>
        <tr><td><b>Content type</b></td><td>${escapeHtml(args.contentType)}</td></tr>
        <tr><td><b>Title</b></td><td>${escapeHtml(titleLine)}</td></tr>
        ${args.contentUrl ? `<tr><td><b>URL</b></td><td><a href="${escapeHtml(args.contentUrl)}" style="color:#0052FF">${escapeHtml(args.contentUrl)}</a></td></tr>` : ""}
        <tr><td><b>Reporter</b></td><td>${args.reporterEmail ? `<a href="mailto:${escapeHtml(args.reporterEmail)}" style="color:#0052FF">${escapeHtml(args.reporterEmail)}</a>` : "Anonymous"}${args.reporterName ? ` (${escapeHtml(args.reporterName)})` : ""}</td></tr>
      </table>
      ${
        args.details
          ? `<div style="border-left:3px solid #dc2626;padding:8px 12px;background:#fef2f2;font-size:14px;white-space:pre-wrap;margin-bottom:16px">${escapeHtml(args.details)}</div>`
          : `<p style="font-size:13px;color:#94a3b8;font-style:italic">No additional details provided.</p>`
      }
      <p style="margin:16px 0 0 0;font-size:14px">
        <a href="${escapeHtml(moderationUrl)}" style="display:inline-block;background:#0052FF;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600">
          Triage in moderation inbox →
        </a>
      </p>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Report #${args.id} · automated alert</p>
    </div>
  `;

  return { subject, text: lines.join("\n"), html };
}

const STATUSES = ["open", "resolved", "dismissed"] as const;

const createReportSchema = z.object({
  contentType: z.enum(["blog_post", "comment", "other"]),
  contentId: z.string().min(1).max(500),
  contentTitle: z.string().max(500).optional().nullable(),
  contentUrl: z.string().max(1000).optional().nullable(),
  reporterName: z.string().max(200).optional().nullable(),
  reporterEmail: z.string().email().max(320).optional().nullable(),
  reason: z.enum(REASONS),
  details: z.string().max(2000).optional().nullable(),
});

const updateReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolutionNote: z.string().max(1000).optional().nullable(),
});

const ipReportTimestamps = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = 5;
  const timestamps = (ipReportTimestamps.get(ip) ?? []).filter(
    (t) => now - t < windowMs,
  );
  if (timestamps.length >= max) {
    ipReportTimestamps.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  ipReportTimestamps.set(ip, timestamps);
  return false;
}

router.post("/reports", async (req, res, next) => {
  try {
    const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").toString();
    if (rateLimited(ip)) {
      res.status(429).json({
        error: "Too many reports from this address. Try again later.",
      });
      return;
    }

    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid report payload.",
        issues: parsed.error.flatten(),
      });
      return;
    }

    const [row] = await db
      .insert(contentReportsTable)
      .values({
        contentType: parsed.data.contentType,
        contentId: parsed.data.contentId,
        contentTitle: parsed.data.contentTitle ?? null,
        contentUrl: parsed.data.contentUrl ?? null,
        reporterName: parsed.data.reporterName ?? null,
        reporterEmail: parsed.data.reporterEmail ?? null,
        reason: parsed.data.reason,
        details: parsed.data.details ?? null,
      })
      .returning({ id: contentReportsTable.id });

    // Fire-and-forget editorial alert. Falls through to CONTACT_NOTIFY_TO and
    // then SMTP_USER so the same env you configured for contact leads can be
    // reused. Won't block the public response if email transport is missing.
    const notifyTo = cleanEmail(
      process.env["REPORT_NOTIFY_TO"] ??
        process.env["CONTACT_NOTIFY_TO"] ??
        process.env["SMTP_USER"],
    );
    if (notifyTo && row) {
      const email = buildReportEmail({
        id: row.id,
        contentType: parsed.data.contentType,
        contentId: parsed.data.contentId,
        contentTitle: parsed.data.contentTitle ?? null,
        contentUrl: parsed.data.contentUrl ?? null,
        reporterName: parsed.data.reporterName ?? null,
        reporterEmail: parsed.data.reporterEmail ?? null,
        reason: parsed.data.reason,
        details: parsed.data.details ?? null,
      });
      void sendMail({
        to: notifyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(parsed.data.reporterEmail
          ? { replyTo: parsed.data.reporterEmail }
          : {}),
      }).catch((err) =>
        logger.error({ err, reportId: row.id }, "Content report alert email failed"),
      );
    } else if (!notifyTo) {
      logger.warn(
        { reportId: row?.id },
        "Content report saved but no recipient configured (set REPORT_NOTIFY_TO, CONTACT_NOTIFY_TO, or SMTP_USER).",
      );
    }

    res.status(201).json({ ok: true, id: row?.id ?? null });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/reports", requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "open");
    const where = STATUSES.includes(status as (typeof STATUSES)[number])
      ? eq(contentReportsTable.status, status)
      : undefined;

    const rows = await db
      .select()
      .from(contentReportsTable)
      .where(where)
      .orderBy(desc(contentReportsTable.createdAt))
      .limit(200);

    const counts = await db
      .select({
        status: contentReportsTable.status,
        total: sql<number>`count(*)::int`,
      })
      .from(contentReportsTable)
      .groupBy(contentReportsTable.status);

    const countsByStatus: Record<string, number> = {
      open: 0,
      resolved: 0,
      dismissed: 0,
    };
    for (const c of counts) countsByStatus[c.status] = Number(c.total) || 0;

    res.json({ reports: rows, counts: countsByStatus });
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/reports/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid report id" });
      return;
    }
    const parsed = updateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid update payload" });
      return;
    }

    const [updated] = await db
      .update(contentReportsTable)
      .set({
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote ?? null,
        resolvedBy: req.user?.email ?? null,
        resolvedAt: new Date(),
      })
      .where(eq(contentReportsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ ok: true, report: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
