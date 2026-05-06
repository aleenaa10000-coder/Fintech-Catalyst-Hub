import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, newsletterSubscribersTable, BRIEF_LEAD_STATUSES, type BriefLeadStatus } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";
import { z } from "zod";

const UpdateBriefStatusBody = z.object({
  status: z.enum(BRIEF_LEAD_STATUSES),
});

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

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadDetail() {
  const rows = await db
    .select({
      id: newsletterSubscribersTable.id,
      email: newsletterSubscribersTable.email,
      createdAt: newsletterSubscribersTable.createdAt,
      source: newsletterSubscribersTable.source,
      keyword: newsletterSubscribersTable.keyword,
      briefStatus: newsletterSubscribersTable.briefStatus,
      briefStatusUpdatedAt: newsletterSubscribersTable.briefStatusUpdatedAt,
    })
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.createdAt));

  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  since90d.setUTCHours(0, 0, 0, 0);

  const last30DayCount = rows.filter((r: { createdAt: Date }) => r.createdAt >= since30d).length;
  const last7DayCount = rows.filter((r: { createdAt: Date }) => r.createdAt >= since7d).length;

  // Build daily signup buckets: zero-filled for the last 90 calendar days (UTC).
  const buckets = new Map<string, number>();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(utcDayKey(d), 0);
  }
  for (const r of rows) {
    if (r.createdAt < since90d) continue;
    const k = utcDayKey(r.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }

  return {
    totalCount: rows.length,
    last30DayCount,
    last7DayCount,
    latestSubscribedAt: rows[0]?.createdAt?.toISOString() ?? null,
    subscribers: rows.map((r: { id: number; email: string | null; createdAt: Date; source: string | null; keyword: string | null; briefStatus: BriefLeadStatus | null; briefStatusUpdatedAt: Date | null }) => ({
      id: r.id,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      source: r.source,
      keyword: r.keyword,
      briefStatus: r.briefStatus ?? null,
      briefStatusUpdatedAt: r.briefStatusUpdatedAt?.toISOString() ?? null,
    })),
    dailySignups: Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
}

router.get("/admin/newsletter/subscribers", requireAdmin, async (_req, res) => {
  const detail = await loadDetail();
  res.json(detail);
});

router.patch(
  "/admin/newsletter/brief-leads/:id/status",
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = UpdateBriefStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid status", issues: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(newsletterSubscribersTable)
      .set({
        briefStatus: parsed.data.status,
        briefStatusUpdatedAt: new Date(),
      })
      .where(eq(newsletterSubscribersTable.id, id))
      .returning({ id: newsletterSubscribersTable.id, briefStatus: newsletterSubscribersTable.briefStatus });

    if (!updated) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json({ id: updated.id, briefStatus: updated.briefStatus });
  },
);

// CSV export — served outside OpenAPI (binary-ish response). Same auth gate.
router.get(
  "/admin/newsletter/subscribers.csv",
  requireAdmin,
  async (_req, res) => {
    const detail = await loadDetail();

    const header = ["email", "subscribed_at", "source", "keyword"].join(",");
    const lines = detail.subscribers.map((s: { email: string | null; createdAt: string; source: string | null; keyword: string | null }) =>
      [
        escapeCsv(s.email),
        escapeCsv(s.createdAt),
        escapeCsv(s.source ?? ""),
        escapeCsv(s.keyword ?? ""),
      ].join(","),
    );
    const body = [header, ...lines].join("\n") + "\n";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(body);
  },
);

export default router;
