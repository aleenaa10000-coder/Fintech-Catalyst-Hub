import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { isAdminEmail } from "../lib/auth";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import {
  getNotificationSettings,
  updateNotificationSettings,
  toPublicSettings,
  sendSlackTest,
  postBrokenUrlsToSlack,
  type BrokenUrlPayload,
} from "../lib/slackNotifier";
import { runWeeklyDigest } from "../jobs/weeklyDigest";

const ROUTE_LOG = logger.child({ route: "notifications" });

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

const router: IRouter = Router();

router.get(
  "/admin/notifications/settings",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const s = await getNotificationSettings();
      res.json(toPublicSettings(s));
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/admin/notifications/settings",
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = req.body as
        | {
            slackWebhookUrl?: string | null;
            slackEnabled?: boolean;
            weeklyDigestEnabled?: boolean;
          }
        | undefined;
      if (!body || typeof body.slackEnabled !== "boolean") {
        res.status(400).json({ error: "slackEnabled is required" });
        return;
      }
      // Accept null, empty string (treated as null), or a valid string.
      const rawUrl =
        body.slackWebhookUrl == null || body.slackWebhookUrl === ""
          ? null
          : String(body.slackWebhookUrl);
      try {
        const next = await updateNotificationSettings({
          slackWebhookUrl: rawUrl,
          slackEnabled: body.slackEnabled,
          // Forward `undefined` when the client didn't include the
          // field so the storage helper falls back to the saved value
          // (lets older PUT callers keep working).
          weeklyDigestEnabled:
            typeof body.weeklyDigestEnabled === "boolean"
              ? body.weeklyDigestEnabled
              : undefined,
        });
        res.json(toPublicSettings(next));
      } catch (validationErr) {
        res.status(400).json({
          error:
            validationErr instanceof Error
              ? validationErr.message
              : "Invalid input",
        });
      }
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/notifications/slack/test",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await sendSlackTest(getSiteUrl());
      res.json({ ok: result.ok, error: result.error ?? null });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/notifications/slack/weekly-digest/send-now",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const result = await runWeeklyDigest({ force: true });
      if (!result.ok) {
        const reason = result.reason ?? "unknown";
        ROUTE_LOG.warn(
          { reason },
          "Weekly digest preview send-now did not post",
        );
        res.status(400).json({ ok: false, error: reason, sentAt: null });
        return;
      }
      res.json({ ok: true, error: null, sentAt: result.sentAt ?? null });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/notifications/slack/broken-urls",
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = req.body as { broken?: unknown } | undefined;
      const rawList = Array.isArray(body?.broken) ? body!.broken : [];
      const broken: BrokenUrlPayload[] = [];
      for (const item of rawList) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        const slug = typeof r["slug"] === "string" ? r["slug"] : null;
        const title = typeof r["title"] === "string" ? r["title"] : null;
        const url = typeof r["url"] === "string" ? r["url"] : null;
        if (!slug || !title || !url) continue;
        broken.push({
          slug,
          title,
          url,
          statusCode:
            typeof r["statusCode"] === "number" ? r["statusCode"] : null,
          error: typeof r["error"] === "string" ? r["error"] : null,
          checkedAt: typeof r["checkedAt"] === "string" ? r["checkedAt"] : null,
        });
      }
      if (broken.length === 0) {
        res.status(400).json({
          ok: false,
          error: "Empty or invalid broken URL list",
          posted: null,
        });
        return;
      }
      // Triggered-by label powers the Slack message context line —
      // helps the channel spot who kicked off the alert. Falls back to
      // the user id when the email is null (anonymous admin sessions).
      const triggeredBy = req.user?.email ?? req.user?.id ?? "admin";
      const result = await postBrokenUrlsToSlack({
        broken,
        siteUrl: getSiteUrl(),
        triggeredBy,
      });
      if (!result.ok) {
        ROUTE_LOG.warn(
          { err: result.error, count: broken.length },
          "Slack broken-url post returned not-ok",
        );
        res.status(400).json({
          ok: false,
          error: result.error ?? "Failed to post to Slack",
          posted: null,
        });
        return;
      }
      res.json({ ok: true, posted: result.posted ?? broken.length, error: null });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
