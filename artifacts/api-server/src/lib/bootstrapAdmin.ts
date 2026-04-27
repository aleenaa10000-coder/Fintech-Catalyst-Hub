import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

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

  const hash = await bcrypt.hash(rawPassword, 10);

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
    if (
      !existing.passwordHash ||
      !(await bcrypt.compare(rawPassword, existing.passwordHash))
    ) {
      await db
        .update(usersTable)
        .set({ passwordHash: hash })
        .where(eq(usersTable.id, existing.id));
      logger.info({ email }, "Updated admin password from env");
    }
  }
}
