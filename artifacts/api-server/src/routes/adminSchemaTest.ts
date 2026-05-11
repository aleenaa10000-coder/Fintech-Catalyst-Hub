import { Router, type Request, type Response, type NextFunction } from "express";
import { isAdminEmail } from "../lib/auth";
import { TOOL_SLUGS, SERVICE_SLUGS } from "../lib/seoConstants";
import { validateJsonLd, buildSchemaFixtures } from "../lib/schemaValidator";
import { runSchemaHealthCheck } from "../jobs/schemaHealthDaily";

const router = Router();

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

/**
 * GET /api/admin/schema-test
 *
 * Validates the JSON-LD structured data emitted by key route types against
 * Schema.org required fields. Surfaces regressions introduced by code changes
 * before they reach production and affect rich-result eligibility.
 *
 * Returns a JSON report grouped by route type with per-schema pass/fail
 * status, missing required fields, and E-E-A-T warnings.
 */
router.get("/admin/schema-test", requireAdmin, async (_req, res, next) => {
  try {
    const fixtures = buildSchemaFixtures();
    const results = fixtures.map(([ld, ctx]) => validateJsonLd(ld, ctx));

    // ── Audit summary ──────────────────────────────────────────────────────────
    const passed  = results.filter((r) => r.valid).length;
    const failed  = results.filter((r) => !r.valid).length;
    const warned  = results.filter((r) => r.warnings.length > 0).length;

    // Tool slug coverage check
    const toolCoverageWarnings: string[] = [];
    for (const slug of TOOL_SLUGS) {
      if (!slug) toolCoverageWarnings.push(`Tool slug "${slug}" has no TOOLS_FAQ entry`);
    }

    // Service slug coverage check
    const serviceCoverageWarnings: string[] = [];
    for (const slug of SERVICE_SLUGS) {
      if (!slug) serviceCoverageWarnings.push(`Service slug "${slug}" missing`);
    }

    res.json({
      summary: {
        total:  results.length,
        passed,
        failed,
        warned,
        toolSlugs:    TOOL_SLUGS.length,
        serviceSlugs: SERVICE_SLUGS.length,
      },
      coverageWarnings: [...toolCoverageWarnings, ...serviceCoverageWarnings],
      results,
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/schema-health/send-now
 *
 * Manually triggers the daily schema health check immediately and returns the
 * result. Useful for verifying alert emails without waiting 24 h for the
 * scheduled run. Returns { sent, failures, warnings, reason }.
 */
router.post("/admin/schema-health/send-now", requireAdmin, async (_req, res, next) => {
  try {
    const result = await runSchemaHealthCheck();
    res.json({
      ok: true,
      sent: result.sent,
      failures: result.failures,
      warnings: result.warnings,
      reason: result.reason ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
