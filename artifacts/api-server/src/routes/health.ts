import { Router, type IRouter } from "express";
import * as fs from "fs";
import * as path from "path";
import { sql } from "drizzle-orm";
import {
  db,
  blogPostsTable,
  authorsTable,
  servicesTable,
  testimonialsTable,
  pricingPlansTable,
  siteStatsTable,
} from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const startedAt = Date.now();

type EmailProvider = "resend" | "smtp" | "none";

function detectEmailProvider(): EmailProvider {
  if (process.env["RESEND_API_KEY"]) return "resend";
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) return "smtp";
  return "none";
}

router.get("/healthz", async (_req, res) => {
  // Redirect browsers to the visual status dashboard
  const accept = _req.headers["accept"] ?? "";
  if (accept.includes("text/html") && !accept.startsWith("application/")) {
    res.redirect(302, "/status");
    return;
  }
  const t0 = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    await db.execute(sql`select 1`);
    dbOk = true;
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbLatencyMs = Date.now() - t0;
    // Store a generic code — the real error is logged server-side only,
    // never returned to callers to avoid leaking connection strings or
    // schema details via the public health endpoint.
    dbError = "database_unavailable";
    logger.warn({ err }, "Health check: database probe failed");
  }

  const provider = detectEmailProvider();
  const email = { ok: provider !== "none", provider };

  let seedCounts: Record<string, number> = {};
  let seedOk = false;
  let seedError: string | undefined;

  if (dbOk) {
    try {
      const [
        blogPosts,
        authors,
        services,
        testimonials,
        pricingPlans,
        siteStats,
      ] = await Promise.all([
        db.$count(blogPostsTable),
        db.$count(authorsTable),
        db.$count(servicesTable),
        db.$count(testimonialsTable),
        db.$count(pricingPlansTable),
        db.$count(siteStatsTable),
      ]);
      seedCounts = {
        blogPosts,
        authors,
        services,
        testimonials,
        pricingPlans,
        siteStats,
      };
      seedOk = Object.values(seedCounts).every((n) => n > 0);
    } catch (err) {
      seedError = "seed_check_failed";
      logger.warn({ err }, "Health check: seed-data probe failed");
    }
  } else {
    seedError = "skipped_db_unavailable";
  }

  const seedData = {
    ok: seedOk,
    counts: seedCounts,
    ...(seedError ? { error: seedError } : {}),
  };

  const overallOk = dbOk && email.ok && seedOk;
  const status = overallOk ? "ok" : "degraded";

  const payload = {
    status,
    db: { ok: dbOk, latencyMs: dbLatencyMs, ...(dbError ? { error: dbError } : {}) },
    email,
    seedData,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checkedAt: new Date().toISOString(),
  };

  const data = HealthCheckResponse.parse(payload);
  res.status(dbOk ? 200 : 503).json(data);
});

router.get("/healthz/deep", async (_req, res) => {
  const probeDb = async (): Promise<{ ok: boolean; latencyMs: number; error?: string }> => {
    const t0 = Date.now();
    try {
      await db.execute(sql`select 1`);
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      logger.warn({ err }, "Deep health: DB probe failed");
      return { ok: false, latencyMs: Date.now() - t0, error: "database_unavailable" };
    }
  };

  const probeEmail = async (): Promise<{ ok: boolean; latencyMs: number; provider: string; error?: string }> => {
    const t0 = Date.now();
    const provider = detectEmailProvider();
    return { ok: provider !== "none", latencyMs: Date.now() - t0, provider };
  };

  const probeStorage = async (): Promise<{ ok: boolean; latencyMs: number; error?: string }> => {
    const t0 = Date.now();
    // Must match the LOCAL_UPLOADS_DIR env var used by objectStorage.ts
    // so this probe tests the directory the upload service actually writes to.
    const uploadsDir = process.env["LOCAL_UPLOADS_DIR"] ?? path.join(process.cwd(), "data", "uploads");
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      logger.warn({ err }, "Deep health: storage probe failed");
      return { ok: false, latencyMs: Date.now() - t0, error: "storage_not_writable" };
    }
  };

  const [dbResult, emailResult, storageResult] = await Promise.allSettled([
    probeDb(),
    probeEmail(),
    probeStorage(),
  ]);

  const db_ = dbResult.status === "fulfilled" ? dbResult.value : { ok: false, latencyMs: 0, error: "probe_threw" };
  const email_ = emailResult.status === "fulfilled" ? emailResult.value : { ok: false, latencyMs: 0, provider: "none", error: "probe_threw" };
  const storage_ = storageResult.status === "fulfilled" ? storageResult.value : { ok: false, latencyMs: 0, error: "probe_threw" };

  const allOk = db_.ok && email_.ok && storage_.ok;
  const payload = {
    status: allOk ? "ok" : "degraded",
    db: db_,
    email: email_,
    storage: storage_,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checkedAt: new Date().toISOString(),
  };

  res.status(allOk ? 200 : 503).json(payload);
});

export default router;
