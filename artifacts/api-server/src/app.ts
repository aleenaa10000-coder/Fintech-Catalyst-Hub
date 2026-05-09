import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import express, { type Express } from "express";
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
  app.use(express.static(_frontendDist, { index: false }));
  // SPA fallback — must be last so API routes take priority
  app.get("*", (_req, res) => {
    res.sendFile(path.join(_frontendDist, "index.html"));
  });
}

export default app;
