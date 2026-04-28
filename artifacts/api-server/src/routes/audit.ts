import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, bulkNoIndexAuditLogTable } from "@workspace/db";
import type { BulkNoIndexAuditPostSnapshot } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import { logger } from "../lib/logger";

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

function serializeRow(row: typeof bulkNoIndexAuditLogTable.$inferSelect) {
  return {
    id: row.id,
    actorEmail: row.actorEmail,
    actorUserId: row.actorUserId,
    mode: row.mode,
    snoozeDays: row.snoozeDays,
    requestedSlugCount: row.requestedSlugCount,
    updatedCount: row.updatedCount,
    totalViewsHidden: row.totalViewsHidden,
    posts: row.posts ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

const router: IRouter = Router();

router.get("/admin/audit/bulk-noindex", requireAdmin, async (req, res, next) => {
  try {
    const raw = req.query["limit"];
    let limit = 50;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n)) {
        limit = Math.min(200, Math.max(1, n));
      }
    }

    const rows = await db
      .select()
      .from(bulkNoIndexAuditLogTable)
      .orderBy(desc(bulkNoIndexAuditLogTable.createdAt))
      .limit(limit);

    res.json(rows.map(serializeRow));
  } catch (err) {
    next(err);
  }
});

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildAuditCsv(snapshot: BulkNoIndexAuditPostSnapshot[]): string {
  const header = [
    "slug",
    "title",
    "category",
    "view_count_at_action",
    "featured",
    "was_noindex",
    "published_at",
  ];
  const rows = snapshot.map((p) => [
    p.slug,
    p.title,
    p.category,
    p.viewCount,
    p.featured ? "true" : "false",
    p.wasNoIndex ? "true" : "false",
    p.publishedAt,
  ]);
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(","));
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

router.get(
  "/admin/audit/bulk-noindex/:id/csv",
  requireAdmin,
  async (req, res, next) => {
    try {
      const idRaw = req.params["id"];
      const idStr = typeof idRaw === "string" ? idRaw : "";
      const id = Number.parseInt(idStr, 10);
      if (!Number.isFinite(id) || id < 1) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      const [row] = await db
        .select()
        .from(bulkNoIndexAuditLogTable)
        .where(eq(bulkNoIndexAuditLogTable.id, id))
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const csv = buildAuditCsv(row.posts ?? []);
      const ts = row.createdAt
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
      const filename = `bulk-${row.mode}_${row.id}_${ts}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csv);
    } catch (err) {
      logger.error({ err }, "Failed to build audit CSV");
      next(err);
    }
  },
);

export default router;
