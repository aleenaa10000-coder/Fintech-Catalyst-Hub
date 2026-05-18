import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { db, guestPostSubmissionsTable, contactSubmissionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const EDITORIAL_STATUS_VALUES = [
  "submitted",
  "reviewing",
  "approved",
  "revisions",
  "published",
  "rejected",
] as const;

const EditorialBody = z
  .object({
    editorialStatus: z.enum(EDITORIAL_STATUS_VALUES).optional(),
    adminNotes: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.editorialStatus !== undefined || d.adminNotes !== undefined,
    { message: "At least one of editorialStatus or adminNotes is required" },
  );

const STATUS_VALUES = ["unread", "handled"] as const;
type SubmissionStatus = (typeof STATUS_VALUES)[number];
const StatusFilter = z.enum(["all", ...STATUS_VALUES]);

function parseStatusFilter(raw: unknown): "all" | SubmissionStatus {
  const parsed = StatusFilter.safeParse(raw);
  return parsed.success ? parsed.data : "unread";
}

const StatusBody = z.object({ status: z.enum(STATUS_VALUES) });

router.patch(
  "/admin/pitch-submissions/:id/editorial",
  requireAdmin,
  async (req, res, next) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = EditorialBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }
    try {
      const set: Record<string, unknown> = {};
      if (parsed.data.editorialStatus !== undefined) {
        set["editorialStatus"] = parsed.data.editorialStatus;
      }
      if ("adminNotes" in parsed.data) {
        set["adminNotes"] = parsed.data.adminNotes;
      }
      const [row] = await db
        .update(guestPostSubmissionsTable)
        .set(set)
        .where(eq(guestPostSubmissionsTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      res.json({ ok: true, submission: row });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/pitch-submissions", requireAdmin, async (req, res, next) => {
  try {
    const status = parseStatusFilter(req.query["status"]);
    const base = db
      .select()
      .from(guestPostSubmissionsTable)
      .orderBy(desc(guestPostSubmissionsTable.createdAt));
    const rows =
      status === "all"
        ? await base
        : await db
            .select()
            .from(guestPostSubmissionsTable)
            .where(eq(guestPostSubmissionsTable.status, status))
            .orderBy(desc(guestPostSubmissionsTable.createdAt));
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/admin/pitch-submissions/:id",
  requireAdmin,
  async (req, res, next) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = StatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }
    try {
      const status = parsed.data.status;
      const [row] = await db
        .update(guestPostSubmissionsTable)
        .set({
          status,
          handledAt: status === "handled" ? new Date() : null,
          handledBy:
            status === "handled" ? req.user?.email ?? "admin" : null,
        })
        .where(eq(guestPostSubmissionsTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      res.json({ ok: true, submission: row });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/contact-submissions", requireAdmin, async (req, res, next) => {
  try {
    const status = parseStatusFilter(req.query["status"]);
    const rows =
      status === "all"
        ? await db
            .select()
            .from(contactSubmissionsTable)
            .orderBy(desc(contactSubmissionsTable.createdAt))
        : await db
            .select()
            .from(contactSubmissionsTable)
            .where(eq(contactSubmissionsTable.status, status))
            .orderBy(desc(contactSubmissionsTable.createdAt));
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/admin/contact-submissions/:id",
  requireAdmin,
  async (req, res, next) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = StatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }
    try {
      const status = parsed.data.status;
      const [row] = await db
        .update(contactSubmissionsTable)
        .set({
          status,
          handledAt: status === "handled" ? new Date() : null,
          handledBy:
            status === "handled" ? req.user?.email ?? "admin" : null,
        })
        .where(eq(contactSubmissionsTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      res.json({ ok: true, submission: row });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
