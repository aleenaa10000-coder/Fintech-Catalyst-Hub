import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/object-storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * Step 1 of the upload flow.
 * Returns a short-lived presigned PUT URL the client uploads the raw file to,
 * plus the canonical objectPath we'll later use to finalize and serve it.
 *
 * Auth-gated so only signed-in admins can mint upload URLs.
 */
router.post("/api/uploads/request-url", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    logger.error({ err }, "Failed to generate upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

const FinalizeBody = z.object({
  uploadURL: z.string().url(),
});

/**
 * Step 2 of the upload flow.
 * After the client PUTs the file to the presigned URL, it calls this endpoint
 * to mark the object as publicly readable and to receive the canonical
 * /objects/<id> path that can be stored as e.g. a blog post cover image URL.
 */
router.post("/api/uploads/finalize", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { uploadURL } = FinalizeBody.parse(req.body);
    const userId =
      (req.user as { id?: string } | undefined)?.id ?? "anonymous";
    const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
      uploadURL,
      { owner: userId, visibility: "public" },
    );
    res.json({ objectPath });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid body", issues: err.issues });
      return;
    }
    logger.error({ err }, "Failed to finalize upload");
    res.status(500).json({ error: "Failed to finalize upload" });
  }
});

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
    logger.error({ err }, "Failed to serve object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
