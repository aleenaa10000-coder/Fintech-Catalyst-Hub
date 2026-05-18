import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { isAdminEmail } from "../lib/auth";
import { getStoredInternalLinkReport, runInternalLinkCheck } from "../lib/internalLinkCheck";

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

/**
 * Returns the latest persisted internal-link check results without
 * triggering a fresh crawl. Fast enough to poll on page focus.
 */
router.get("/admin/internal-link-check", requireAdmin, async (_req, res, next) => {
  try {
    const report = await getStoredInternalLinkReport();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * Synchronously crawls all sitemap pages, extracts internal <a href> links,
 * probes each one, persists the results, and returns the report.
 * Called by the admin dashboard "Run check now" button.
 */
router.post("/admin/internal-link-check", requireAdmin, async (_req, res, next) => {
  try {
    const report = await runInternalLinkCheck();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
