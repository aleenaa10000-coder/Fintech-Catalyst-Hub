import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const startedAt = Date.now();

router.get("/healthz", async (_req, res) => {
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
    dbError = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, "Health check: database probe failed");
  }

  const status = dbOk ? "ok" : "degraded";
  const payload = {
    status,
    db: { ok: dbOk, latencyMs: dbLatencyMs, ...(dbError ? { error: dbError } : {}) },
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checkedAt: new Date().toISOString(),
  };

  const data = HealthCheckResponse.parse(payload);
  res.status(dbOk ? 200 : 503).json(data);
});

export default router;
