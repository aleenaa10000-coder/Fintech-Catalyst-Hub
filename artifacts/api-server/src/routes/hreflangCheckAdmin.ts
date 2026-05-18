import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { getSiteUrl } from "../lib/seo";
import {
  runHreflangConsistencyCheck,
  getCachedHreflangReport,
  setCachedHreflangReport,
} from "../lib/hreflangCheck";
import { logger } from "../lib/logger";
import { requireAdmin } from "../lib/routeHelpers";

const LOG = logger.child({ component: "hreflang-check-admin" });

const router: IRouter = Router();

/**
 * Read-only — returns the cached results from the last daily run (or
 * the last on-demand check). Returns a "never run" report when the
 * server has just started and no check has completed yet.
 */
router.get(
  "/admin/hreflang-check",
  requireAdmin,
  (_req: Request, res: Response) => {
    res.json(getCachedHreflangReport());
  },
);

/**
 * Trigger an on-demand hreflang consistency check. Synchronously
 * fetches the representative sample of pages, validates tags, updates
 * the in-memory cache, and returns the report — same data shape as the
 * GET endpoint so the admin dashboard can optimistically update.
 */
router.post(
  "/admin/hreflang-check",
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const siteUrl = getSiteUrl();
      const { mismatches, checkedCount } = await runHreflangConsistencyCheck(siteUrl);
      setCachedHreflangReport(mismatches, checkedCount);
      // Overwrite with a fresh report that has the real checkedCount
      // from the cache-setter — the dashboard will re-fetch anyway.
      const report = getCachedHreflangReport();
      LOG.info(
        { mismatches: mismatches.length },
        "On-demand hreflang check completed by admin",
      );
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
