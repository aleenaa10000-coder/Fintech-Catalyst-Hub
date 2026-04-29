import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, contentReportsTable } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { isAdminEmail } from "../lib/auth";

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
