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
import rssRouter from "./routes/rss";
import uploadsRouter from "./routes/uploads";
import indexNowKeyRouter from "./routes/indexNowKey";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
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
    "# ── Beneficial AI search agents ─────────────────────────────────────────────",
    "# These bots cite content inside AI-generated answers (Perplexity, ChatGPT",
    "# search, Claude.ai search, You.com). Allowing them drives citation traffic.",
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
    "# ── AI training scrapers ─────────────────────────────────────────────────────",
    "# These bots feed training datasets only — no search citation benefit.",
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
    "# ── Standard search crawlers ─────────────────────────────────────────────────",
    "",
    "User-agent: *",
    "Allow: /",
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

// Public dynamic routes mounted at root (not under /api prefix) so their
// URLs resolve directly without /api/ — e.g. /sitemap.xml, /rss.xml.
app.use(sitemapIndexRouter);   // /sitemap_index.xml, /sitemap-*.xml
app.use(sitemapRouter);        // /sitemap.xml (kept for backward compat)
app.use(newsSitemapRouter);    // /news-sitemap.xml
app.use(authorRssRouter);
app.use(categoryRssRouter);
app.use(rssRouter);
app.use(indexNowKeyRouter);
app.use(uploadsRouter);

app.use("/api", router);

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
  app.get("*", (req: Request, res: Response) => {
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
  });
}

export default app;
