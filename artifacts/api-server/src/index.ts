import app from "./app";
import { db, runSeed } from "@workspace/db";
import { logger } from "./lib/logger";
import { bootstrapAdminFromEnv } from "./lib/bootstrapAdmin";
import { scheduleIndexNowDaily } from "./jobs/indexNowDaily";
import { scheduleLinkCheckDaily } from "./jobs/linkCheckDaily";
import { scheduleNoIndexExpiryHourly } from "./jobs/noindexExpiryHourly";
import { scheduleWeeklyDigest } from "./jobs/weeklyDigest";
import { schedulePublishNotifyHourly } from "./jobs/scheduledPostPublishNotify";
import { schedulePitchDigestDaily } from "./jobs/pitchDigestDaily";
import { scheduleSchemaHealthDaily } from "./jobs/schemaHealthDaily";
import { scheduleInternalLinkCheckDaily } from "./jobs/internalLinkCheckDaily";

// ── Startup environment validation (F1) ──────────────────────────────────────
// These vars are required for the server to function correctly. The process
// exits with code 1 immediately if any are missing so Hostinger's process
// monitor (PM2) surfaces the misconfiguration instead of running a broken app.
// Optional-but-important vars emit a warning but do not abort startup.

// DATABASE_URL is required in every environment — the server cannot function without it.
const REQUIRED_ENV: string[] = ["DATABASE_URL"];

// SITE_URL is required in production: sitemaps, RSS, canonical tags, and CORS
// all need the canonical public URL. In development the default value is used
// as a fallback so the dev server can start without a .env entry.
const REQUIRED_PROD_ENV: string[] = ["SITE_URL"];

const WARN_ENV: { key: string; hint: string }[] = [
  { key: "SITE_URL",        hint: "sitemaps, RSS, canonical tags, and CORS will use a fallback URL" },
  { key: "SESSION_SECRET",  hint: "sessions will not survive server restarts" },
  { key: "ADMIN_EMAILS",    hint: "no admin access will be granted" },
  { key: "ADMIN_PASSWORD",  hint: "password-based admin login is disabled" },
  { key: "RESEND_API_KEY",  hint: "all outbound email (digests, alerts, contact replies) will silently fail unless SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS are also set" },
];

function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";

  // Always required
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  // Required in production only
  if (isProduction) {
    missing.push(...REQUIRED_PROD_ENV.filter((k) => !process.env[k]?.trim()));
  }

  if (missing.length > 0) {
    for (const k of missing) {
      process.stderr.write(`[startup] FATAL: required env var "${k}" is not set.\n`);
    }
    process.stderr.write(
      "[startup] Set missing variables in .env (dev) or hPanel → Environment Variables (Hostinger).\n",
    );
    process.exit(1);
  }

  // Warn about important-but-optional vars (dev only for SITE_URL; always for auth vars)
  for (const { key, hint } of WARN_ENV) {
    if (isProduction && REQUIRED_PROD_ENV.includes(key)) continue; // already required-checked
    if (!process.env[key]?.trim()) {
      logger.warn(
        { envVar: key },
        `[startup] Optional env var "${key}" is not set — ${hint}. See .env.example.`,
      );
    }
  }
}

// Run env validation synchronously before anything else so the error message
// is clear and unambiguous if the server is misconfigured.
validateEnv();

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}". Set PORT to a valid integer (e.g. PORT=3000).`);
}

async function bootstrap() {
  try {
    const report = await runSeed(db);
    const inserted = Object.entries(report).filter(([, n]) => (n as number) > 0);
    if (inserted.length > 0) {
      logger.info(
        { seeded: Object.fromEntries(inserted) },
        "Seeded empty tables on startup",
      );
    }
  } catch (err) {
    logger.error(
      { err },
      "Database seeding failed — continuing to start server",
    );
  }

  try {
    await bootstrapAdminFromEnv();
  } catch (err) {
    logger.error(
      { err },
      "Admin bootstrap from ADMIN_EMAILS/ADMIN_PASSWORD failed",
    );
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    scheduleIndexNowDaily();
    scheduleLinkCheckDaily();
    scheduleNoIndexExpiryHourly();
    scheduleWeeklyDigest();
    schedulePublishNotifyHourly();
    schedulePitchDigestDaily();
    scheduleSchemaHealthDaily();
    scheduleInternalLinkCheckDaily();
  });
}

void bootstrap();
