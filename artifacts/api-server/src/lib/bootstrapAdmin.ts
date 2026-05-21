import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

// Bcrypt hash pattern — $2a$, $2b$, or $2y$ prefix followed by cost + salt + hash.
// If ADMIN_PASSWORD starts with this pattern it is treated as a pre-computed
// bcrypt hash and used directly, skipping the bcrypt.hash() call on startup.
// This lets operators store the hash in hPanel instead of the plaintext password.
//
// To pre-hash your password:
//   node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD', 12).then(console.log)"
const BCRYPT_HASH_RE = /^\$2[aby]?\$\d{2}\$/;

/**
 * Idempotent admin-user bootstrap. When the deployment sets both
 * `ADMIN_EMAILS` and `ADMIN_PASSWORD`, ensure each allowlisted email has
 * a row in `users` with a bcrypt hash of the supplied password so the
 * email-and-password login flow works on first start.
 *
 * Re-runs on every server start, but is idempotent: if a user already
 * has the correct password hash we skip them; if the password rotated
 * we update the hash. Removing `ADMIN_PASSWORD` does NOT rotate any
 * existing hash — existing admins keep their last set password.
 *
 * ADMIN_PASSWORD may be either:
 *   - Plaintext (e.g. "MyStr0ngP@ssword!") — hashed with bcrypt cost 12 on startup
 *   - A pre-computed bcrypt hash (starting with $2b$12$) — used as-is, no re-hashing
 */
export async function bootstrapAdminFromEnv(): Promise<void> {
  const rawEmails = process.env.ADMIN_EMAILS?.trim();
  const rawPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!rawEmails || !rawPassword) {
    return;
  }

  const emails = rawEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  // Support pre-hashed passwords: if the value looks like a bcrypt hash,
  // use it directly. This avoids storing plaintext passwords in hPanel
  // environment variables and eliminates the bcrypt.hash() CPU cost on startup.
  const isPreHashed = BCRYPT_HASH_RE.test(rawPassword);
  const hash = isPreHashed ? rawPassword : await bcrypt.hash(rawPassword, 12);

  for (const email of emails) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!existing) {
      await db.insert(usersTable).values({
        email,
        passwordHash: hash,
      });
      logger.info({ email }, "Bootstrapped admin user");
      continue;
    }

    // Re-hash on every boot when the env-supplied password differs from
    // the stored one. Compare against the existing hash so we don't
    // churn the row needlessly.
    //
    // When the env value is already a bcrypt hash (isPreHashed=true), compare
    // the stored hash strings directly. bcrypt.compare() treats its first
    // argument as plaintext, so passing a hash string as the first arg always
    // returns false — which would trigger a useless DB write on every boot.
    // Short-circuit to false when passwordHash is null so bcrypt.compare never
    // receives null (it expects string for both arguments).
    const storedHash = existing.passwordHash;
    const passwordMatches =
      !!storedHash &&
      (isPreHashed
        ? rawPassword === storedHash
        : await bcrypt.compare(rawPassword, storedHash));

    if (!storedHash || !passwordMatches) {
      await db
        .update(usersTable)
        .set({ passwordHash: hash })
        .where(eq(usersTable.id, existing.id));
      logger.info({ email }, "Updated admin password from env");
    }
  }
}
