/**
 * Setup-check CLI.
 *
 * Prints a one-shot health report identical to what `/api/healthz` returns,
 * but from the terminal. Useful for owners who just imported the repo and
 * want to verify the database is provisioned, demo content seeded, and an
 * email provider configured — without having to start the API server or
 * open the preview in a browser.
 *
 * Exits 0 when everything is healthy, 1 when at least one check is degraded.
 *
 * Run with: `pnpm run setup:check`
 */
import { sql } from "drizzle-orm";
import {
  pool,
  db,
  blogPostsTable,
  authorsTable,
  servicesTable,
  testimonialsTable,
  pricingPlansTable,
  siteStatsTable,
} from "@workspace/db";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

const useColor =
  process.stdout.isTTY === true && process.env["NO_COLOR"] === undefined;

function color(c: string, s: string): string {
  return useColor ? `${c}${s}${RESET}` : s;
}

function ok(s: string): string {
  return color(GREEN, s);
}
function bad(s: string): string {
  return color(RED, s);
}
function warn(s: string): string {
  return color(YELLOW, s);
}
function bold(s: string): string {
  return color(BOLD, s);
}
function dim(s: string): string {
  return color(DIM, s);
}
function head(s: string): string {
  return color(CYAN + BOLD, s);
}

function badge(passed: boolean): string {
  return passed ? ok("PASS") : bad("FAIL");
}

type EmailProvider = "resend" | "smtp" | "none";

function detectEmailProvider(): EmailProvider {
  if (process.env["RESEND_API_KEY"]) return "resend";
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) return "smtp";
  return "none";
}

async function probeDb(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeSeed(): Promise<{
  ok: boolean;
  counts: Record<string, number>;
  error?: string;
}> {
  try {
    const [
      blogPosts,
      authors,
      services,
      testimonials,
      pricingPlans,
      siteStats,
    ] = await Promise.all([
      db.$count(blogPostsTable),
      db.$count(authorsTable),
      db.$count(servicesTable),
      db.$count(testimonialsTable),
      db.$count(pricingPlansTable),
      db.$count(siteStatsTable),
    ]);
    const counts = {
      blogPosts,
      authors,
      services,
      testimonials,
      pricingPlans,
      siteStats,
    };
    return {
      ok: Object.values(counts).every((n) => n > 0),
      counts,
    };
  } catch (err) {
    return {
      ok: false,
      counts: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<void> {
  console.log("");
  console.log(head("FintechPressHub — Setup Check"));
  console.log(dim("Same checks as the /api/healthz endpoint."));
  console.log("");

  if (!process.env["DATABASE_URL"]) {
    console.log(`${badge(false)} ${bold("Database")}`);
    console.log(
      `       ${bad("DATABASE_URL is not set.")} Provision a PostgreSQL database in the Replit ` +
        "Database tool — Replit will set this for you automatically.",
    );
    console.log("");
    console.log(`${bold("Overall:")} ${bad("DEGRADED")}`);
    console.log("");
    process.exitCode = 1;
    return;
  }

  const dbResult = await probeDb();
  console.log(`${badge(dbResult.ok)} ${bold("Database")}`);
  if (dbResult.ok) {
    console.log(
      `       ${dim("connected")} · ${dbResult.latencyMs}ms round-trip`,
    );
  } else {
    console.log(`       ${bad(dbResult.error ?? "connection failed")}`);
  }

  const provider = detectEmailProvider();
  const emailOk = provider !== "none";
  console.log(`${badge(emailOk)} ${bold("Email provider")}`);
  if (emailOk) {
    console.log(`       ${dim("provider:")} ${provider}`);
  } else {
    console.log(
      `       ${warn(
        "no provider configured.",
      )} Add either RESEND_API_KEY or all four SMTP_* secrets ` +
        "(see SETUP.md step 2).",
    );
  }

  let seedResult: Awaited<ReturnType<typeof probeSeed>> = {
    ok: false,
    counts: {},
    error: "skipped — database probe failed",
  };
  if (dbResult.ok) {
    seedResult = await probeSeed();
  }
  console.log(`${badge(seedResult.ok)} ${bold("Seed data")}`);
  if (seedResult.ok) {
    const formatted = Object.entries(seedResult.counts)
      .map(([k, n]) => `${k}=${n}`)
      .join("  ");
    console.log(`       ${dim(formatted)}`);
  } else if (seedResult.error) {
    console.log(`       ${warn(seedResult.error)}`);
  } else {
    const empty = Object.entries(seedResult.counts)
      .filter(([, n]) => n === 0)
      .map(([k]) => k);
    console.log(
      `       ${warn(`empty tables: ${empty.join(", ")}`)} — restart the API Server ` +
        "workflow to re-run the seeder, or run `pnpm seed:auto`.",
    );
  }

  const overallOk = dbResult.ok && emailOk && seedResult.ok;
  console.log("");
  console.log(
    `${bold("Overall:")} ${overallOk ? ok("OK") : warn("DEGRADED")}  ${dim(
      `(checked at ${new Date().toISOString()})`,
    )}`,
  );
  console.log("");

  if (!overallOk) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(bad("[setup-check] Unexpected error:"), err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {
      /* ignore cleanup errors */
    });
  });
