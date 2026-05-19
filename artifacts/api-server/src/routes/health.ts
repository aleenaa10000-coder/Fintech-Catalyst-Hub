import { Router, type IRouter } from "express";
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

export default router;
