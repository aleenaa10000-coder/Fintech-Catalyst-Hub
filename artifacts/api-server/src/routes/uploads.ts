import express, { Router, type IRouter } from "express";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  ObjectStorageUnavailableError,
} from "../lib/object-storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * Single-step upload endpoint.
 *
 * Accepts the raw file bytes as the request body (Content-Type must match the
 * file's MIME type).  The server streams the data directly to GCS using the
 * working Replit sidecar credentials, marks the object as publicly readable,
 * and returns the canonical /objects/uploads/<uuid> path.
 *
 * Auth-gated so only signed-in admins can upload files.
 */
router.post(
  "/api/uploads/upload",
  express.raw({ type: "*/*", limit: "20mb" }),
  async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const contentType =
        (req.headers["content-type"] ?? "").split(";")[0]?.trim() ||
        "application/octet-stream";
      const userId =
        (req.user as { id?: string } | undefined)?.id ?? "anonymous";
      const buffer = req.body as Buffer;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        res.status(400).json({ error: "Empty or missing file body" });
        return;
      }
      const objectPath = await objectStorageService.uploadObjectEntityFromBuffer(
        buffer,
        contentType,
        userId,
      );
      res.json({ objectPath });
    } catch (err) {
      if (err instanceof ObjectStorageUnavailableError) {
        res.status(503).json({
          error:
            "File uploads are not available in this environment. Configure Replit Object Storage to enable uploads.",
        });
        return;
      }
      logger.error({ err }, "Failed to upload file");
      res.status(500).json({ error: "Failed to upload file" });
    }
  },
);

/**
 * Public file serving for uploaded objects.
 * Mounted at the application root (not under /api) so cover image URLs look
 * like /objects/uploads/<uuid> on both dev and production hosts.
 */
router.get("/objects/*objectPath", async (req, res) => {
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(
      req.path,
    );
    const allowed = await objectStorageService.canAccessObjectEntity({
      objectFile,
    });
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await objectStorageService.downloadObject(objectFile, res);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (err instanceof ObjectStorageUnavailableError) {
      res.status(503).json({ error: "File storage is not available in this environment." });
      return;
    }
    logger.error({ err }, "Failed to serve object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
