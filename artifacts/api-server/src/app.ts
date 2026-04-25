import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";
import uploadsRouter from "./routes/uploads";
import indexNowKeyRouter from "./routes/indexNowKey";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

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

// Serves the IndexNow ownership-verification key file at /<key>.txt when
// INDEXNOW_KEY is configured. Mounted at root for the same reason.
app.use(indexNowKeyRouter);

// Upload presign + finalize endpoints (under /api/uploads) and public
// /objects/:path file serving (under root). Mounted here instead of inside
// the /api subrouter so /objects URLs work as cover image src on the public site.
app.use(uploadsRouter);

app.use("/api", router);

export default app;
