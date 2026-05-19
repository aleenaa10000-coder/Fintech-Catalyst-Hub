import * as fs from "fs";
import * as path from "path";

const ACL_POLICY_METADATA_KEY = "aclPolicy";

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

/**
 * Represents a local-disk file.  Replaces @google-cloud/storage File
 * throughout the object-storage layer.
 */
export class LocalFile {
  readonly filePath: string;
  readonly name: string;
  contentType: string;

  constructor(filePath: string, name: string, contentType = "") {
    this.filePath = filePath;
    this.name = name;
    this.contentType = contentType;
  }

  /** Path to the sidecar JSON metadata file. */
  get metaPath(): string {
    return `${this.filePath}.meta.json`;
  }
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}
  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

/**
 * Persist the ACL policy as a JSON sidecar file next to the upload.
 */
export async function setObjectAclPolicy(
  objectFile: LocalFile,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  if (!fs.existsSync(objectFile.filePath)) {
    throw new Error(`Object not found: ${objectFile.filePath}`);
  }
  const meta = readMeta(objectFile);
  meta[ACL_POLICY_METADATA_KEY] = aclPolicy;
  if (aclPolicy) {
    const rawType = objectFile.contentType || "";
    if (rawType) meta["contentType"] = rawType;
  }
  writeMeta(objectFile, meta);
}

/**
 * Read the ACL policy from the JSON sidecar file.
 */
export async function getObjectAclPolicy(
  objectFile: LocalFile,
): Promise<ObjectAclPolicy | null> {
  const meta = readMeta(objectFile);
  const policy = meta[ACL_POLICY_METADATA_KEY];
  if (!policy) return null;
  if (objectFile.contentType === "" && meta["contentType"]) {
    objectFile.contentType = meta["contentType"] as string;
  }
  return policy as ObjectAclPolicy;
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: LocalFile;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }
  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }
  return false;
}

function readMeta(objectFile: LocalFile): Record<string, unknown> {
  try {
    if (fs.existsSync(objectFile.metaPath)) {
      return JSON.parse(fs.readFileSync(objectFile.metaPath, "utf8"));
    }
  } catch { /* malformed or missing meta JSON — return empty object as safe default */ }
  return {};
}

function writeMeta(
  objectFile: LocalFile,
  meta: Record<string, unknown>,
): void {
  fs.writeFileSync(objectFile.metaPath, JSON.stringify(meta, null, 2), "utf8");
}
