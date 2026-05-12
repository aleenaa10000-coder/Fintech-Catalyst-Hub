#!/usr/bin/env node
/**
 * lighthouse-store.mjs
 *
 * Reads Lighthouse CI JSON results from .lighthouseci/ and persists one row
 * per page into the `lighthouse_scores` PostgreSQL table.
 *
 * Uses ON CONFLICT DO UPDATE so re-running the weekly job for the same date
 * is safe and idempotent.
 *
 * Required env vars:
 *   DATABASE_URL  — PostgreSQL connection string
 *
 * Optional env vars:
 *   LHCI_DIR      — path to lhci output dir (default: .lighthouseci)
 *   RUN_DATE      — ISO date to tag the run (default: today, UTC)
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const LHCI_DIR = resolve(process.env.LHCI_DIR ?? ".lighthouseci");
const RUN_DATE =
  process.env.RUN_DATE ?? new Date().toISOString().slice(0, 10);

if (!DATABASE_URL) {
  console.error("[lighthouse-store] DATABASE_URL is not set — aborting.");
  process.exit(1);
}

// ── Parse LHR files ──────────────────────────────────────────────────────────

function readLhrFiles(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    console.error(`[lighthouse-store] Cannot read LHCI dir: ${dir}`);
    process.exit(1);
  }
  return files
    .filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function catScore(val) {
  return val != null ? Math.round(val * 100) : null;
}

function ms(lhr, key) {
  const v = lhr.audits?.[key]?.numericValue;
  return v != null ? Math.round(v) : null;
}

function raw(lhr, key) {
  const v = lhr.audits?.[key]?.numericValue;
  return v != null ? v : null;
}

// ── Upsert into DB ───────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UPSERT_SQL = `
  INSERT INTO lighthouse_scores
    (run_date, page_url, performance, accessibility, best_practices, seo,
     lcp_ms, tbt_ms, fcp_ms, tti_ms, cls)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  ON CONFLICT (run_date, page_url) DO UPDATE SET
    performance    = EXCLUDED.performance,
    accessibility  = EXCLUDED.accessibility,
    best_practices = EXCLUDED.best_practices,
    seo            = EXCLUDED.seo,
    lcp_ms         = EXCLUDED.lcp_ms,
    tbt_ms         = EXCLUDED.tbt_ms,
    fcp_ms         = EXCLUDED.fcp_ms,
    tti_ms         = EXCLUDED.tti_ms,
    cls            = EXCLUDED.cls;
`;

const lhrs = readLhrFiles(LHCI_DIR);

if (lhrs.length === 0) {
  console.warn("[lighthouse-store] No LHR files found — nothing to store.");
  process.exit(0);
}

let stored = 0;
for (const lhr of lhrs) {
  const params = [
    RUN_DATE,
    lhr.requestedUrl,
    catScore(lhr.categories?.performance?.score),
    catScore(lhr.categories?.accessibility?.score),
    catScore(lhr.categories?.["best-practices"]?.score),
    catScore(lhr.categories?.seo?.score),
    ms(lhr, "largest-contentful-paint"),
    ms(lhr, "total-blocking-time"),
    ms(lhr, "first-contentful-paint"),
    ms(lhr, "interactive"),
    raw(lhr, "cumulative-layout-shift"),
  ];
  await pool.query(UPSERT_SQL, params);
  console.log(`[lighthouse-store] Stored ${lhr.requestedUrl} (${RUN_DATE})`);
  stored++;
}

await pool.end();
console.log(`[lighthouse-store] Done — ${stored} row(s) upserted.`);
