import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";
import authorRssRouter from "./routes/authorRss";
import rssRouter from "./routes/rss";
import uploadsRouter from "./routes/uploads";
import indexNowKeyRouter from "./routes/indexNowKey";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// Trust the reverse proxy (Replit / Vite dev proxy) so that rate-limiters
// and other middleware can read the real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

// ── www → canonical redirect ────────────────────────────────────────────────
// The canonical domain is https://www.fintechpresshub.com (with www).
// In production, redirect bare-domain requests to www with a 301 so Google
// treats both variants as one URL and passes full link equity to www.
// Skipped in development where host is localhost / Replit proxy.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production") return next();
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  // Only redirect if the host is a bare domain (no www) and looks like the
  // production domain. Avoids redirecting Replit .replit.app previews.
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

// ── HTTP security headers ───────────────────────────────────────────────────
// These headers are minor Google trust signals and protect against common
// web vulnerabilities. Required for YMYL (fintech) E-E-A-T compliance.
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Force HTTPS for 1 year, including subdomains.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Prevent MIME-type sniffing — stops browsers from guessing content types.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking by disallowing iframe embedding.
  res.setHeader("X-Frame-Options", "DENY");
  // Limit referrer information to same-origin — avoids leaking internal URLs.
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict access to browser features not needed by this app.
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

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
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Public, dynamic sitemap mounted at the root so /sitemap.xml resolves
// directly without needing an /api prefix.
app.use(sitemapRouter);

// Per-author RSS feeds at /authors/<slug>/rss.xml. Mounted at root so the
// feed URL mirrors the public author-profile URL pattern.
app.use(authorRssRouter);

// Site-wide RSS feed at /rss.xml — dynamically merges static seed posts with
// DB-published posts so feed readers always see the latest content.
app.use(rssRouter);

// Serves the IndexNow ownership-verification key file at /<key>.txt when
// INDEXNOW_KEY is configured. Mounted at root for the same reason.
app.use(indexNowKeyRouter);

// Upload presign + finalize endpoints (under /api/uploads) and public
// /objects/:path file serving (under root). Mounted here instead of inside
// the /api subrouter so /objects URLs work as cover image src on the public site.
app.use(uploadsRouter);

app.use("/api", router);

// ── Production static-file serving ─────────────────────────────────────────
// When NODE_ENV=production and the frontend has been pre-built, serve the
// Vite output as static files and fall back to index.html for every
// non-API route so the React SPA still handles client-side navigation.
//
// This lets a single `node dist/index.mjs` process serve both the API and
// the compiled frontend — which is required on Node.js hosts like Hostinger
// that only expose one process per site.
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
  // build hash — serve them with a 1-year immutable cache so returning
  // visitors don't re-download unchanged bundles.
  app.use(
    express.static(_frontendDist, {
      index: false,
      setHeaders(res, filePath) {
        // Vite content-hashes all JS, CSS, and font files. Detect hashed
        // chunks by the 8-char hex segment in the filename (e.g. `-Cx3bDiMi`).
        const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i.test(filePath);
        if (isHashedAsset) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          // HTML, robots.txt, sitemap: always revalidate.
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SPA fallback — check for a pre-rendered route file first (written by
  // `scripts/prerender.mjs` at build time), then fall back to index.html.
  // Pre-rendered files contain the correct per-page <title>, <meta>, and
  // JSON-LD so social bots and AI crawlers see rich metadata without JS.
  app.get("*", (req: Request, res: Response) => {
    const pathname = req.path.replace(/\/+$/, "") || "/";

    // For non-root paths, check for a pre-rendered index.html in the
    // matching subdirectory (e.g. /blog/my-post → dist/public/blog/my-post/index.html).
    if (pathname !== "/") {
      const prerendered = path.join(_frontendDist, pathname.slice(1), "index.html");
      if (existsSync(prerendered)) {
        // Pre-rendered pages: revalidate on each request so stale content
        // after a redeploy is not served from a CDN cache.
        res.setHeader("Cache-Control", "no-cache");
        return res.sendFile(prerendered);
      }
    }

    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(_frontendDist, "index.html"));
  });
}

export default app;
