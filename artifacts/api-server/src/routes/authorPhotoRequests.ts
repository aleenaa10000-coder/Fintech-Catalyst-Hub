import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  db,
  authorPhotoRequestsTable,
  authorPhotoOverridesTable,
} from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import { z } from "zod";

import { sendMail, cleanEmail } from "../lib/mailer";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import { formRateLimiter } from "../lib/rateLimiter";
import { escapeHtml, requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const SLUG_RE = /^[a-z0-9-]{1,200}$/;

const submitSchema = z.object({
  slug: z.string().regex(SLUG_RE, "Invalid author slug"),
  photoUrl: z.string().min(1).max(2000),
  submitterName: z.string().trim().max(120).optional(),
  submitterEmail: z
    .string()
    .trim()
    .email("Invalid email")
    .max(254)
    .optional(),
  note: z.string().trim().max(800).optional(),
});

const patchSchema = z.object({
  status: z.enum(["approved", "dismissed"]),
});

// Public submission — readers / contributors can submit a replacement
// headshot for any author. Lands in the same admin queue as override edits.
router.post("/author-photo-requests", formRateLimiter, async (req, res, next) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }

    const [row] = await db
      .insert(authorPhotoRequestsTable)
      .values({
        slug: parsed.data.slug,
        photoUrl: parsed.data.photoUrl,
        submitterName: parsed.data.submitterName ?? null,
        submitterEmail: parsed.data.submitterEmail ?? null,
        note: parsed.data.note ?? null,
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "Failed to save request" });
      return;
    }

    // Editorial alert — same recipient cascade as content reports.
    const notifyTo = cleanEmail(
      process.env["REPORT_NOTIFY_TO"] ??
        process.env["CONTACT_NOTIFY_TO"] ??
        process.env["SMTP_USER"],
    );
    if (notifyTo) {
      const reviewUrl = `${getSiteUrl()}/admin/author-photos`;
      const submitter = parsed.data.submitterEmail
        ? `${parsed.data.submitterName ? parsed.data.submitterName + " " : ""}<${parsed.data.submitterEmail}>`
        : parsed.data.submitterName ?? "Anonymous";
      const subject = `New headshot submitted for ${parsed.data.slug}`;
      const text = [
        `A new headshot has been submitted for the /authors/${parsed.data.slug} profile.`,
        ``,
        `Submitter: ${submitter}`,
        parsed.data.note ? `Note:\n${parsed.data.note}` : null,
        ``,
        `Preview: ${parsed.data.photoUrl.startsWith("http") ? parsed.data.photoUrl : getSiteUrl() + parsed.data.photoUrl}`,
        ``,
        `Approve or dismiss in the admin queue: ${reviewUrl}`,
      ]
        .filter((l): l is string => l !== null)
        .join("\n");
      const html = `
        <div style="font-family:system-ui,sans-serif;color:#0a2540">
          <h2 style="margin:0 0 8px 0;color:#0052FF">New headshot submission</h2>
          <p style="margin:0 0 16px 0;color:#475569;font-size:14px">
            Author: <strong>${escapeHtml(parsed.data.slug)}</strong>
          </p>
          <p style="margin:0 0 12px 0;font-size:14px"><b>Submitter:</b> ${escapeHtml(submitter)}</p>
          ${parsed.data.note ? `<div style="border-left:3px solid #0052FF;padding:8px 12px;background:#f0f5ff;font-size:14px;white-space:pre-wrap;margin-bottom:16px">${escapeHtml(parsed.data.note)}</div>` : ""}
          <div style="margin:16px 0;text-align:center">
            <img src="${escapeHtml(parsed.data.photoUrl.startsWith("http") ? parsed.data.photoUrl : getSiteUrl() + parsed.data.photoUrl)}" alt="Submitted headshot preview" style="max-width:240px;height:auto;border-radius:12px;border:1px solid #e2e8f0" />
          </div>
          <p style="margin:16px 0 0 0;font-size:14px">
            <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#0052FF;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600">
              Review in admin queue →
            </a>
          </p>
          <p style="margin-top:24px;font-size:12px;color:#94a3b8">Request #${row.id} · automated alert</p>
        </div>
      `;
      void sendMail({
        to: notifyTo,
        subject,
        text,
        html,
        ...(parsed.data.submitterEmail
          ? { replyTo: parsed.data.submitterEmail }
          : {}),
      }).catch((err) =>
        logger.error({ err, requestId: row.id }, "Headshot request email failed"),
      );
    }

    res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    next(err);
  }
});

// Admin list — defaults to pending, filter via ?status=
router.get("/admin/author-photo-requests", requireAdmin, async (req, res, next) => {
  try {
    const status = (req.query["status"] ?? "pending") as string;
    const validStatuses = ["pending", "approved", "dismissed", "all"] as const;
    if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    const rows = await (status === "all"
      ? db
          .select()
          .from(authorPhotoRequestsTable)
          .orderBy(desc(authorPhotoRequestsTable.createdAt))
      : db
          .select()
          .from(authorPhotoRequestsTable)
          .where(
            eq(
              authorPhotoRequestsTable.status,
              status as "pending" | "approved" | "dismissed",
            ),
          )
          .orderBy(desc(authorPhotoRequestsTable.createdAt)));

    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authorPhotoRequestsTable)
      .where(eq(authorPhotoRequestsTable.status, "pending"));

    res.json({ requests: rows, pendingCount: pendingCount?.count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// Admin approve / dismiss — approve also writes the override.
router.patch(
  "/admin/author-photo-requests/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }

      const [request] = await db
        .select()
        .from(authorPhotoRequestsTable)
        .where(
          and(
            eq(authorPhotoRequestsTable.id, id),
            eq(authorPhotoRequestsTable.status, "pending"),
          ),
        );
      if (!request) {
        res.status(404).json({ error: "Pending request not found" });
        return;
      }

      if (parsed.data.status === "approved") {
        await db
          .insert(authorPhotoOverridesTable)
          .values({
            slug: request.slug,
            photoUrl: request.photoUrl,
            updatedBy: req.user?.email ?? null,
          })
          .onConflictDoUpdate({
            target: authorPhotoOverridesTable.slug,
            set: {
              photoUrl: request.photoUrl,
              updatedBy: req.user?.email ?? null,
              updatedAt: new Date(),
            },
          });
      }

      const [updated] = await db
        .update(authorPhotoRequestsTable)
        .set({
          status: parsed.data.status,
          reviewedAt: new Date(),
          reviewedBy: req.user?.email ?? null,
        })
        .where(eq(authorPhotoRequestsTable.id, id))
        .returning();

      res.json({ ok: true, request: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
