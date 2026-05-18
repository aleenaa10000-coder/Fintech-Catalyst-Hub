import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db, postAuditLogTable } from "@workspace/db";
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

const LogActionSchema = z.object({
  action: z.enum(["published", "updated", "deleted", "unpublished", "scheduled"]),
  postId: z.string(),
  postSlug: z.string(),
  postTitle: z.string(),
  changedFields: z.record(z.unknown()).optional(),
});

const router: IRouter = Router();

router.get("/admin/audit/post-actions", requireAdmin, async (req, res, next) => {
  try {
    const limitRaw = req.query["limit"];
    let limit = 100;
    if (typeof limitRaw === "string") {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n)) limit = Math.min(500, Math.max(1, n));
    }

    const postIdFilter = req.query["postId"];
    let rows;
    if (typeof postIdFilter === "string" && postIdFilter.trim()) {
      rows = await db
        .select()
        .from(postAuditLogTable)
        .where(eq(postAuditLogTable.postId, postIdFilter.trim()))
        .orderBy(desc(postAuditLogTable.createdAt))
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(postAuditLogTable)
        .orderBy(desc(postAuditLogTable.createdAt))
        .limit(limit);
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        actorEmail: r.actorEmail,
        actorUserId: r.actorUserId,
        action: r.action,
        postId: r.postId,
        postSlug: r.postSlug,
        postTitle: r.postTitle,
        changedFields: r.changedFields ?? {},
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/admin/audit/post-actions", requireAdmin, async (req, res, next) => {
  try {
    const parsed = LogActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }
    const { action, postId, postSlug, postTitle, changedFields } = parsed.data;
    const actorEmail = req.user!.email ?? "";
    const actorUserId = req.user!.id;

    const [row] = await db
      .insert(postAuditLogTable)
      .values({ actorEmail, actorUserId, action, postId, postSlug, postTitle, changedFields: changedFields ?? {} })
      .returning();

    res.status(201).json({
      id: row!.id,
      createdAt: row!.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to insert post audit log entry");
    next(err);
  }
});

export default router;

export async function logPostAction(params: {
  actorEmail: string;
  actorUserId?: string | null;
  action: "published" | "updated" | "deleted" | "unpublished" | "scheduled";
  postId: string;
  postSlug: string;
  postTitle: string;
  changedFields?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(postAuditLogTable).values({
      actorEmail: params.actorEmail,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      postId: params.postId,
      postSlug: params.postSlug,
      postTitle: params.postTitle,
      changedFields: params.changedFields ?? {},
    });
  } catch (err) {
    logger.error({ err }, "Failed to write post audit log entry");
  }
}
