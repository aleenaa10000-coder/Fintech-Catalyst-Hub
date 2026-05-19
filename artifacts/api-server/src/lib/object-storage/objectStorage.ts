import * as fs from "fs";
import * as path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";
import { logger } from "../logger";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
  LocalFile,
} from "./objectAcl";

/**
 * Local-disk storage root. Uploads are persisted here on any Node.js host
 * (Replit, Hostinger, etc.). The directory is created on first use.
 * Set LOCAL_UPLOADS_DIR to override the default path.
 */
const UPLOADS_DIR = path.resolve(
  process.env.LOCAL_UPLOADS_DIR ||
    path.join(process.cwd(), "data", "uploads"),
);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Shim exported so existing import sites compile without changes.
 * The real object-storage client was removed when the service migrated
 * from Replit Object Storage / Google Cloud Storage to local-disk storage.
 * This empty object satisfies any import without introducing Replit-only deps.
 */
export const objectStorageClient: Record<string, never> = {};

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageUnavailableError extends Error {
  constructor() {
    super("Object storage is not available in this environment.");
    this.name = "ObjectStorageUnavailableError";
    Object.setPrototypeOf(this, ObjectStorageUnavailableError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {
    ensureDir(UPLOADS_DIR);
  }

  getPublicObjectSearchPaths(): Array<string> {
    return [UPLOADS_DIR];
  }

  getPrivateObjectDir(): string {
    return UPLOADS_DIR;
  }

  /**
   * Upload a buffer to local disk and return the canonical
   * /objects/uploads/<uuid> path.
   */
  async uploadObjectEntityFromBuffer(
    buffer: Buffer,
    contentType: string,
    userId: string,
  ): Promise<string> {
    ensureDir(UPLOADS_DIR);
    const objectId = randomUUID();
    const filePath = path.join(UPLOADS_DIR, objectId);
    fs.writeFileSync(filePath, buffer);

    const localFile = new LocalFile(filePath, objectId, contentType);
    await setObjectAclPolicy(localFile, { owner: userId, visibility: "public" });

    return `/objects/uploads/${objectId}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<LocalFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    // objectPath is /objects/uploads/<uuid> — strip the leading /objects/uploads/
    // so entityId is just the <uuid> stored directly in UPLOADS_DIR.
    const withoutPrefix = objectPath.slice("/objects/uploads/".length);
    const entityId = withoutPrefix;
    const filePath = path.join(UPLOADS_DIR, entityId);

    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }
    return new LocalFile(filePath, entityId);
  }

  async downloadObject(
    file: LocalFile,
    res: Response,
    cacheTtlSec: number = 3600,
  ) {
    try {
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      const stat = fs.statSync(file.filePath);
      const rawType = (file.contentType || "").toLowerCase();
      const SAFE_INLINE_TYPES = new Set([
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
        "image/x-icon", "image/vnd.microsoft.icon",
        "video/mp4", "video/webm", "video/ogg",
        "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
        "application/pdf",
      ]);
      const isSafeInline = SAFE_INLINE_TYPES.has(rawType);
      const safeContentType = isSafeInline ? rawType : "application/octet-stream";

      res.set({
        "Content-Type": safeContentType,
        "Content-Length": String(stat.size),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        "X-Content-Type-Options": "nosniff",
        ...(isSafeInline ? {} : { "Content-Disposition": "attachment" }),
      });

      const stream = fs.createReadStream(file.filePath);
      stream.on("error", (err) => {
        logger.error({ err }, "Stream error");
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      logger.error({ err: error }, "Error downloading file");
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Previously normalised Google Cloud Storage URLs to local paths.
   * GCS was removed when the service migrated to local-disk storage, so
   * the method now returns the path unchanged. Kept for API compatibility.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: LocalFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
