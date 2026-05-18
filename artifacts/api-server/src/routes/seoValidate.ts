import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../lib/routeHelpers";

const router = Router();

/**
 * GET /api/seo/validate?url=<absolute-url>
 *
 * Calls the Google Rich Results Test API to validate structured data on the
 * given page URL. Requires the GOOGLE_RICH_RESULTS_API_KEY env var to be set.
 * Returns the raw Google API response so the admin can inspect which rich
 * result types were detected and any validation errors.
 *
 * Admin-only — page URLs may contain unpublished content paths.
 */
router.get("/seo/validate", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = (req.query.url as string | undefined)?.trim();
    if (!url) {
      res.status(400).json({ error: "Missing required ?url= query parameter." });
      return;
    }
    // Basic absolute URL guard — prevents SSRF against internal endpoints.
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid URL — must be an absolute URL (https://...)." });
      return;
    }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "URL must use http or https protocol." });
      return;
    }

    const apiKey = process.env.GOOGLE_RICH_RESULTS_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error: "GOOGLE_RICH_RESULTS_API_KEY is not configured.",
        hint:  "Set the GOOGLE_RICH_RESULTS_API_KEY environment variable to enable live Rich Results validation. The key is obtained from Google Cloud Console — enable the 'Search Console API'.",
      });
      return;
    }

    const apiUrl = `https://searchconsole.googleapis.com/v1/urlTestingTools/richResultsTest:run?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, userAgent: "DESKTOP" }),
    });

    const json = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error:   "Google Rich Results API returned an error.",
        details: json,
      });
      return;
    }

    res.json(json);
  } catch (err) {
    next(err);
  }
});

export default router;
