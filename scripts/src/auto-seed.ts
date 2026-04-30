/**
 * Auto-seed script.
 *
 * Re-runs the per-table empty-check seeder from `@workspace/db`. Because
 * `runSeed` only inserts into tables whose `COUNT(*) === 0`, this script is
 * fully idempotent — it's safe to run on every install / post-merge / cron
 * tick. A freshly-imported account (with an empty database) gets the demo
 * blog posts, testimonials, services, pricing plans, authors, and site
 * stats populated automatically without depending on the api-server's
 * first-run bootstrap firing.
 *
 * Wired into `scripts/post-merge.sh` so it runs after `pnpm install` and
 * `drizzle-kit push`. Also exposed as `pnpm seed:auto` for manual reruns.
 */
import { pool, runSeed, db } from "@workspace/db";

async function main(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    console.warn(
      "[auto-seed] DATABASE_URL not set — skipping seed (no database to populate).",
    );
    return;
  }

  const start = Date.now();
  let report;
  try {
    report = await runSeed(db);
  } catch (err) {
    console.error("[auto-seed] Seeding failed:", err);
    throw err;
  }

  const inserted = Object.entries(report).filter(([, n]) => n > 0);
  const elapsed = Date.now() - start;

  if (inserted.length === 0) {
    console.log(
      `[auto-seed] All seeded tables already populated — nothing to insert (checked in ${elapsed}ms).`,
    );
    return;
  }

  const summary = inserted
    .map(([table, n]) => `${table}=${n}`)
    .join(", ");
  console.log(
    `[auto-seed] Seeded empty tables in ${elapsed}ms: ${summary}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {
      /* pool already closed */
    });
  });
