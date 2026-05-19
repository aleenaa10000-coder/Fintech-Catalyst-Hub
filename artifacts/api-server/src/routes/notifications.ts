import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { z } from "zod";
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
import { requireAdmin } from "../lib/routeHelpers";

const ROUTE_LOG = logger.child({ route: "notifications" });

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

const notificationSettingsSchema = z.object({
  slackWebhookUrl: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  slackEnabled: z.boolean({
    required_error: "slackEnabled is required",
    invalid_type_error: "slackEnabled must be a boolean",
  }),
  weeklyDigestEnabled: z.boolean().optional(),
  publishNotifyEnabled: z.boolean().optional(),
  publishNotifyEmail: z
    .string()
    .email("publishNotifyEmail must be a valid email address")
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
});

router.put(
  "/admin/notifications/settings",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = notificationSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        res.status(400).json({
          error: firstIssue?.message ?? "Invalid request body",
          details: parsed.error.flatten(),
        });
        return;
      }
      const body = parsed.data;
      try {
        const result = await updateNotificationSettings({
          slackWebhookUrl: body.slackWebhookUrl,
          slackEnabled: body.slackEnabled,
          weeklyDigestEnabled: body.weeklyDigestEnabled,
          publishNotifyEnabled: body.publishNotifyEnabled,
          publishNotifyEmail: body.publishNotifyEmail,
        });
        res.json(toPublicSettings(result));
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
