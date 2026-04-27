import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { isAdminEmail } from "../lib/auth";
import {
  getStoredSitemapHealth,
  runSitemapCheck,
  buildReport,
} from "../lib/sitemapHealth";

/**
 * Same admin-gating semantics as the blog admin endpoints:
 * - 401 when no session
 * - 403 when signed in but not on the ADMIN_EMAILS allowlist
 */
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
 * Read-only — returns the latest persisted state without firing any
 * fetches. Cheap enough that the admin dashboard can poll on focus.
 */
router.get("/admin/sitemap-health", requireAdmin, async (_req, res, next) => {
  try {
    const report = await getStoredSitemapHealth();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * Synchronously runs a fresh check (with bounded per-URL timeout) and
 * returns the resulting report. Same admin gate. The dashboard's
 * "Run check now" button calls this.
 */
router.post("/admin/sitemap-health", requireAdmin, async (_req, res, next) => {
  try {
    // detectTransitions=false because the daily-job is the canonical
    // place to send alert emails; an admin manually triggering a check
    // doesn't need a same-second email about what's already on screen.
    const outcome = await runSitemapCheck({ detectTransitions: false });
    res.json(buildReport(outcome.results));
  } catch (err) {
    next(err);
  }
});

export default router;
