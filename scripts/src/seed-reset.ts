/**
 * Seed reset script.
 *
 * Wipes one or more of the demo-data tables, then re-runs the idempotent
 * `runSeed` so they are repopulated from the JSON seed files. Useful during
 * development when you want to refresh stale demo content without dropping
 * the whole database.
 *
 * Usage:
 *   pnpm seed:reset --table=blog_posts
 *   pnpm seed:reset --table=blog_posts,testimonials
 *   pnpm seed:reset --all
 *
 * Production guardrail: refuses to run when NODE_ENV=production unless
 * `--force` is also passed, since this is destructive.
 */
import { sql } from "drizzle-orm";
import { db, pool, runSeed } from "@workspace/db";

const SEEDABLE_TABLES = [
  "pricing_plans",
  "services",
  "testimonials",
  "site_stats",
  "blog_posts",
  "authors",
] as const;

type SeedableTable = (typeof SEEDABLE_TABLES)[number];

interface ParsedArgs {
  tables: SeedableTable[];
  all: boolean;
  force: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { tables: [], all: false, force: false, help: false };
  for (const raw of argv) {
    if (raw === "--all") {
      out.all = true;
    } else if (raw === "--force") {
      out.force = true;
    } else if (raw === "--help" || raw === "-h") {
      out.help = true;
    } else if (raw.startsWith("--table=")) {
      const list = raw.slice("--table=".length).split(",").map((s) => s.trim()).filter(Boolean);
      for (const name of list) {
        if (!isSeedable(name)) {
          throw new Error(
            `Unknown table "${name}". Allowed: ${SEEDABLE_TABLES.join(", ")}`,
          );
        }
        out.tables.push(name);
      }
    } else {
      throw new Error(`Unrecognized argument: ${raw}`);
    }
  }
  return out;
}

function isSeedable(name: string): name is SeedableTable {
  return (SEEDABLE_TABLES as readonly string[]).includes(name);
}

function printHelp(): void {
  console.log(`Usage: pnpm seed:reset [--table=<name>[,<name>...]] [--all] [--force]

Wipes the listed seeded tables and re-runs the idempotent demo-data seeder.

Options:
  --table=<list>  Comma-separated list of tables to reset.
                  Allowed: ${SEEDABLE_TABLES.join(", ")}
  --all           Reset every seedable table.
  --force         Bypass the production guard (NODE_ENV=production).
  -h, --help      Print this help.

Examples:
  pnpm seed:reset --table=blog_posts
  pnpm seed:reset --table=blog_posts,testimonials
  pnpm seed:reset --all
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!process.env["DATABASE_URL"]) {
    throw new Error(
      "DATABASE_URL is not set — refusing to run without a database connection.",
    );
  }

  if (process.env["NODE_ENV"] === "production" && !args.force) {
    throw new Error(
      "Refusing to run in production. Pass --force if you really mean it.",
    );
  }

  const targets: SeedableTable[] = args.all
    ? [...SEEDABLE_TABLES]
    : args.tables;

  if (targets.length === 0) {
    printHelp();
    throw new Error("No tables selected. Pass --table=<name> or --all.");
  }

  console.log(`[seed:reset] Truncating: ${targets.join(", ")}`);
  // RESTART IDENTITY resets serial sequences so re-seeded ids start at 1
  // again. CASCADE is included for safety in case future schemas add
  // dependent rows; today the seeded tables have no incoming FKs.
  const ident = targets.map((t) => `"${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${ident} RESTART IDENTITY CASCADE`));

  console.log("[seed:reset] Re-running runSeed to repopulate from seed files...");
  const report = await runSeed(db);
  const inserted = Object.entries(report).filter(([, n]) => n > 0);

  if (inserted.length === 0) {
    console.log("[seed:reset] Done — nothing was inserted (unexpected).");
    return;
  }

  const summary = inserted.map(([table, n]) => `${table}=${n}`).join(", ");
  console.log(`[seed:reset] Repopulated: ${summary}`);
}

main()
  .catch((err) => {
    console.error(`[seed:reset] ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {
      /* pool already closed */
    });
  });
