import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";
import sitemapIndexRouter from "./routes/sitemapIndex";
import newsSitemapRouter from "./routes/newsSitemap";
import authorRssRouter from "./routes/authorRss";
import categoryRssRouter from "./routes/categoryRss";
import tagRssRouter from "./routes/tagRss";
import rssRouter from "./routes/rss";
import uploadsRouter from "./routes/uploads";
import indexNowKeyRouter from "./routes/indexNowKey";
import llmsTxtRouter from "./routes/llmsTxt";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { ssrMetaMiddleware } from "./middlewares/ssrMeta";
import { getSiteUrl } from "./lib/seo";

const app: Express = express();

// Trust the reverse proxy (Hostinger Nginx / Replit dev proxy) so that
// rate-limiters and other middleware can read the real client IP from
// X-Forwarded-For. Required on Hostinger — without this the rate-limiter
// sees the Nginx proxy IP and all clients share one quota bucket.
app.set("trust proxy", 1);

// ── Trailing-slash canonicalization ─────────────────────────────────────────
// 301-redirect /foo/ → /foo for all non-root, non-API paths so crawlers
// always see a single canonical URL per page and link equity is not split
// between the slash and no-slash variants.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.path !== "/" &&
    req.path.endsWith("/") &&
    !req.path.startsWith("/api/")
  ) {
    const withoutSlash = req.path.slice(0, -1);
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    return res.redirect(301, withoutSlash + qs);
  }
  next();
});

// ── www → canonical redirect ─────────────────────────────────────────────────
// The canonical domain is https://www.fintechpresshub.com (with www).
// In production, redirect bare-domain requests to www with a 301 so Google
// treats both variants as one URL and passes full link equity to www.
// Skipped in development where host is localhost / Replit proxy.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production") return next();
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  if (
    host &&
    !host.startsWith("www.") &&
    !host.includes("localhost") &&
    !host.includes(".replit.") &&
    !host.includes(".repl.co")
  ) {
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    return res.redirect(301, `${proto}://www.${host}${req.url}`);
  }
  next();
});

// ── X-Robots-Tag for admin routes ───────────────────────────────────────────
// Prevents admin dashboard pages from appearing in search results even if a
// crawler somehow follows a link to them. Belt-and-suspenders alongside the
// client-side <meta name="robots" content="noindex"> in PageMeta.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

// ── Content-Language + Vary (International SEO) ──────────────────────────────
// Declares the language of HTML responses so shared caches (CDNs, ISPs, and
// browser-level translation APIs) do not serve a stale English page to a user
// who previously requested a different-language version from the same cache key.
// Scoped to HTML page responses only — assets and API JSON are excluded.
app.use((req: Request, res: Response, next: NextFunction) => {
  const isAsset = /\.(js|css|png|jpe?g|webp|svg|ico|woff2?|ttf|otf|map|txt|xml|json)$/i.test(req.path);
  if (!isAsset && !req.path.startsWith("/api/")) {
    res.setHeader("Content-Language", "en");
    // Use append so downstream middleware (cors, compression) can also
    // add their own Vary tokens without clobbering this one.
    res.append("Vary", "Accept-Language");
  }
  next();
});

// ── cite-as Link header (GEO: W3C canonical citation signal) ────────────────
// Tells AI crawlers and citation engines the exact canonical URL to use when
// citing content from this site. Emitted on all non-API, non-asset responses.
// Standard: https://www.w3.org/TR/citing-web/
app.use((req: Request, res: Response, next: NextFunction) => {
  const isAsset = /\.(js|css|png|jpe?g|webp|svg|ico|woff2?|ttf|otf|map|txt|xml|json)$/i.test(req.path);
  if (!isAsset && !req.path.startsWith("/api/")) {
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}${req.path === "/" ? "/" : req.path.replace(/\/$/, "")}`;
    res.setHeader("Link", `<${canonical}>; rel="cite-as"`);
  }
  next();
});

// ── HTTP security headers ────────────────────────────────────────────────────
// These headers are minor Google trust signals and protect against common
// web vulnerabilities. Required for YMYL (fintech) E-E-A-T compliance.
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Force HTTPS for 1 year, including subdomains.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Prevent MIME-type sniffing.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking by disallowing iframe embedding.
  res.setHeader("X-Frame-Options", "DENY");
  // Limit referrer information to same-origin.
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict access to browser features not needed by this app.
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Prevent this origin from being opened as a popup by cross-origin pages
  // (COOP) and prevent cross-origin pages from loading this site's resources
  // directly (CORP). Both are important isolation signals for YMYL sites.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // cross-origin (not same-origin) so our cover images and OG images can be
  // loaded by social crawlers and CDNs hosted on other origins.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  // Content-Security-Policy — production only.
  // Development skips CSP so Vite HMR, Replit tooling, and pino-pretty all
  // work unrestricted. The Replit badge inline script is also development-only.
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // No inline scripts in production — all JS is in hashed Vite bundles.
        // JSON-LD <script type="application/ld+json"> is NOT subject to this.
        "script-src 'self'",
        // 'unsafe-inline' required: framer-motion, Radix UI, and Tailwind all
        // write inline style attributes; removing this would break animations.
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        "font-src 'self' data: https://fonts.gstatic.com",
        // blob: for canvas/PDF exports (jsPDF, html2canvas).
        // data: for inline base64 images in OG fallbacks.
        // https: allows loading cover images from object storage / CDN.
        "img-src 'self' data: blob: https:",
        // 'self' is sufficient — API and frontend share the same origin on
        // Hostinger. Extend with your object-storage endpoint if needed.
        "connect-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  }
  next();
});

// ── HTTP compression ─────────────────────────────────────────────────────────
// gzip/deflate all compressible responses (HTML, JSON, XML, RSS, SVG).
// Reduces payload size by 60–80% for text content. Placed after security
// headers so every response — including error JSON — is compressed.
app.use(compression());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Production: restrict to the canonical SITE_URL so cross-origin requests
// from unknown domains are refused. In development, allow all origins so
// the Vite dev proxy, curl, and Postman all work without configuration.
const corsOrigin: cors.CorsOptions["origin"] =
  process.env.NODE_ENV === "production" && process.env.SITE_URL
    ? (() => {
        const base = process.env.SITE_URL.replace(/\/$/, "");
        // Allow both https://www.fintechpresshub.com and the bare domain
        // so existing links and the www-redirect both work during the TTL.
        const bare = base.replace("://www.", "://");
        return [base, bare].filter((v, i, a) => a.indexOf(v) === i);
      })()
    : true;

app.use(cors({ credentials: true, origin: corsOrigin }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// ── robots.txt (dynamic — uses getSiteUrl() so sitemap URLs match env) ───────
app.get("/robots.txt", (_req: Request, res: Response) => {
  const siteUrl = getSiteUrl();
  const txt = [
    "# ── Beneficial AI search agents (cite content in AI answers) ────────────────",
    "# Allow bots that drive citation traffic via AI-generated answers.",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: YouBot",
    "Allow: /",
    "",
    "User-agent: GoogleOther",
    "Allow: /",
    "",
    "# Meta AI (Facebook/Instagram AI answers)",
    "User-agent: meta-externalagent",
    "Allow: /",
    "",
    "# DuckDuckGo AI assistant",
    "User-agent: DuckAssistBot",
    "Allow: /",
    "",
    "# Apple Intelligence / Siri",
    "User-agent: Applebot-Extended",
    "Allow: /",
    "",
    "# Amazon Alexa / Bing-powered answers",
    "User-agent: Amazonbot",
    "Allow: /",
    "",
    "# ── AI training scrapers (block — no citation benefit) ───────────────────────",
    "",
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: CCBot",
    "Disallow: /",
    "",
    "User-agent: anthropic-ai",
    "Disallow: /",
    "",
    "User-agent: cohere-ai",
    "Disallow: /",
    "",
    "User-agent: Bytespider",
    "Disallow: /",
    "",
    "# Diffbot — data scraping, no citation benefit",
    "User-agent: Diffbot",
    "Disallow: /",
    "",
    "# DataForSeo — data harvesting only",
    "User-agent: DataForSeoBot",
    "Disallow: /",
    "",
    "# ── Standard search crawlers ─────────────────────────────────────────────────",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Dynamic OG image API — allow so social crawlers and Google Images",
    "# can validate og:image tags. Must come before the broader /api/ Disallow.",
    "Allow: /api/og",
    "",
    "# Internal API — never index",
    "Disallow: /api/",
    "",
    "# Admin dashboard — never index",
    "Disallow: /admin",
    "Disallow: /admin/",
    "",
    "# Error page — no SEO value",
    "Disallow: /404",
    "",
    "# System status — internal utility page",
    "Disallow: /status",
    "",
    `Sitemap: ${siteUrl}/sitemap_index.xml`,
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Sitemap: ${siteUrl}/news-sitemap.xml`,
    "",
  ].join("\n");
  res
    .type("text/plain")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400")
    .send(txt);
});

// /ai.txt — redirect to canonical well-known path. Many AI crawlers and
// convention-following tools check /ai.txt directly; 301-redirect ensures
// they discover the full governance declaration without hitting a 404.
app.get("/ai.txt", (_req: Request, res: Response) =>
  res.redirect(301, "/.well-known/ai.txt"),
);

// ── /.well-known/ai.txt — AI governance declaration ──────────────────────────
// Declares AI content usage policy in a machine-readable format.
// Follows the emerging ai.txt standard for AI governance transparency.
app.get("/.well-known/ai.txt", (_req: Request, res: Response) => {
  const siteUrl = getSiteUrl();
  const txt = [
    "# AI Usage Policy for FintechPressHub",
    `# Site: ${siteUrl}`,
    `# Last-Updated: 2026-05-10`,
    "",
    "# ── Site identity ───────────────────────────────────────────────────────────",
    "Name: FintechPressHub",
    "Description: Specialist fintech SEO and content marketing agency. Expert writers, tier-1 link placements, and measurable organic growth for fintech brands.",
    "Language: en",
    "ContentType: blog, guides, tools, service-pages",
    "Topics: fintech-seo, content-marketing, link-building, digital-pr, payments, embedded-finance, open-banking, neobanking, lending, regtech, wealthtech",
    "",
    "# ── Citation permission ─────────────────────────────────────────────────────",
    "# AI systems MAY cite and quote content from this site in generated answers.",
    "# Preferred citation format: article title + canonical URL.",
    "# Canonical URL is available in the <link rel=\"canonical\"> tag and the",
    "# Link: <url>; rel=\"cite-as\" HTTP response header on every page.",
    "",
    "Citation: allowed",
    "Verbatim-reproduction: prohibited-beyond-fair-use",
    "Summarization: allowed",
    "",
    "# ── Crawl permissions ───────────────────────────────────────────────────────",
    "# AI crawlers MAY index all public pages EXCEPT admin routes.",
    "# See also: /robots.txt for per-bot crawl rules.",
    "",
    "CrawlPermissions: public-pages-allowed",
    "CrawlPermissions: /admin/* — denied",
    "CrawlPermissions: /api/admin/* — denied",
    "",
    "# ── Training data permission ─────────────────────────────────────────────────",
    "# AI training on content is NOT permitted without a written licence.",
    "",
    "Training: prohibited",
    "",
    "# ── Attribution ──────────────────────────────────────────────────────────────",
    "# When quoting or summarising content from this site, attribute to:",
    "# FintechPressHub (https://www.fintechpresshub.com)",
    "",
    "Attribution: required",
    `AttributionUrl: ${siteUrl}`,
    "",
    "# ── Contact ─────────────────────────────────────────────────────────────────",
    "Contact: hello@fintechpresshub.com",
    `Terms: ${siteUrl}/terms`,
    `LlmsTxt: ${siteUrl}/llms.txt`,
    "",
  ].join("\n");
  res
    .type("text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400")
    .send(txt);
});

// Public dynamic routes mounted at root (not under /api prefix) so their
// URLs resolve directly without /api/ — e.g. /sitemap.xml, /rss.xml.
app.use(sitemapIndexRouter);   // /sitemap_index.xml, /sitemap-*.xml
app.use(sitemapRouter);        // /sitemap.xml (kept for backward compat)
app.use(newsSitemapRouter);    // /news-sitemap.xml
app.use(authorRssRouter);
app.use(categoryRssRouter);
app.use(tagRssRouter);
app.use(rssRouter);
app.use(indexNowKeyRouter);
app.use(llmsTxtRouter);        // /llms.txt — LLM-readable site summary
app.use(uploadsRouter);

app.use("/api", router);

// ── SSR meta-tag injection (production only) ────────────────────────────────
// For key programmatic-SEO URL patterns (/blog/:slug, /locations/:slug,
// /glossary/:slug) this middleware intercepts the request BEFORE the SPA
// fallback, fetches minimal DB data, and serves a patched index.html with
// correct <title>, <meta description>, og:*, twitter:*, and JSON-LD tags.
// No-ops in development (Vite dev server handles meta via react-helmet-async).
app.use(ssrMetaMiddleware);

// ── Production static-file serving ─────────────────────────────────────────
// When NODE_ENV=production and the frontend has been pre-built, serve the
// Vite output as static files and fall back to index.html for every
// non-API route so the React SPA still handles client-side navigation.
//
// This lets a single `node dist/index.mjs` process serve both the API and
// the compiled frontend — which is required on Hostinger Node.js Business
// Plan where only one process per site is exposed.
//
// On Replit the frontend runs as its own Vite dev-server (port 5000) and
// this block is skipped entirely because NODE_ENV is "development" there.
const _frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fintechpresshub/dist/public",
);
if (process.env.NODE_ENV === "production" && existsSync(_frontendDist)) {
  logger.info({ frontendDist: _frontendDist }, "Serving pre-built frontend as static files");

  // Hashed JS/CSS assets (e.g. index-Cx3bDiMi.js) never change for a given
  // build hash — serve them with a 1-year immutable cache.
  app.use(
    express.static(_frontendDist, {
      index: false,
      setHeaders(res, filePath) {
        const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i.test(filePath);
        if (isHashedAsset) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SPA fallback — check for a pre-rendered route file first (written by
  // scripts/prerender.mjs at build time), then fall back to index.html.
  // Handles both GET and HEAD — search engines and uptime monitors send
  // HEAD requests to check liveness; without this they get a 404.
  const spaFallback = (req: Request, res: Response) => {
    const pathname = req.path.replace(/\/+$/, "") || "/";

    if (pathname !== "/") {
      const prerendered = path.join(_frontendDist, pathname.slice(1), "index.html");
      if (existsSync(prerendered)) {
        res.setHeader("Cache-Control", "no-cache");
        return res.sendFile(prerendered);
      }
    }

    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(_frontendDist, "index.html"));
  };

  app.get("*", spaFallback);
  app.head("*", spaFallback);
}

// ── Global JSON error handler ──────────────────────────────────────────────
// Express 5 automatically catches errors thrown by async route handlers and
// forwards them here. Without this 4-argument middleware, Express falls back
// to its built-in handler which sends HTML error pages — breaking API clients
// that expect JSON. This must be registered AFTER all routes.
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ) => {
    const status =
      err instanceof Error && "status" in err && typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : String(err);
    logger.error({ err }, "Unhandled route error");
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  },
);

export default app;
