import express, {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, referringDomainsTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";

// Parses the request body as plain text for any content-type.
// Scoped to this router only — does not affect the global middleware stack.
const textParser = express.text({ type: "*/*", limit: "2mb" });

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

// ── CSV parsing helpers ────────────────────────────────────────────────────

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function isValidDomain(s: string): boolean {
  return DOMAIN_RE.test(s) && s.length <= 253;
}

function normaliseDomain(s: string): string {
  // Strip protocol / path so "https://techcrunch.com/foo" → "techcrunch.com"
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0];
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parses a raw CSV string into an array of { domain, firstSeenAt } rows.
 * Handles the following formats (auto-detected by header inspection):
 *
 *   • Ahrefs  — header contains "Referring Domain" and optionally "First seen"
 *   • Majestic — header contains "Domain" and optionally "First Seen"
 *   • SEMrush  — header contains "Referring Domain" and optionally "First Seen"
 *   • Our own — header is "domain,first_seen_at[,source]"
 *   • Simple   — no header / one domain per line
 */
function parseCsv(
  raw: string,
): Array<{ domain: string; firstSeenAt: Date | null; source: string }> {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Split a CSV line respecting double-quoted fields
  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const firstLine = lines[0].toLowerCase();

  // Detect if there's a structured header
  const hasHeader =
    firstLine.includes("domain") ||
    firstLine.includes("referring") ||
    firstLine.includes("first seen") ||
    firstLine.includes("first_seen");

  if (!hasHeader) {
    // Plain list: one domain per line, no dates
    return lines
      .map((l) => ({
        domain: normaliseDomain(l.split(",")[0]),
        firstSeenAt: null as Date | null,
        source: "csv_import",
      }))
      .filter((r) => isValidDomain(r.domain));
  }

  const headerFields = splitLine(lines[0]).map((f) =>
    f.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
  );

  // Map column index for domain and date
  let domainIdx = -1;
  let dateIdx = -1;

  for (let i = 0; i < headerFields.length; i++) {
    const h = headerFields[i];
    // Domain column: "referring_domain", "domain", "referring domain"
    if (
      domainIdx === -1 &&
      (h === "referring_domain" ||
        h === "domain" ||
        h.startsWith("referring_d"))
    ) {
      domainIdx = i;
    }
    // Date column: "first_seen", "first_seen_at", "first seen"
    if (
      dateIdx === -1 &&
      (h.startsWith("first_seen") || h === "first_seen_at")
    ) {
      dateIdx = i;
    }
  }

  if (domainIdx === -1) {
    // Header present but no recognisable domain column — fall back to col 0
    domainIdx = 0;
  }

  return lines
    .slice(1) // skip header
    .map((line) => {
      const fields = splitLine(line);
      const rawDomain = fields[domainIdx] ?? "";
      const domain = normaliseDomain(rawDomain);
      const firstSeenAt =
        dateIdx >= 0 ? parseDate(fields[dateIdx]) : null;
      return { domain, firstSeenAt, source: "csv_import" };
    })
    .filter((r) => isValidDomain(r.domain));
}

// ── POST /api/admin/referring-domains/import ───────────────────────────────
// Accepts a CSV (or plain domain list) as raw text body. Upserts domains —
// existing entries are skipped (ON CONFLICT DO NOTHING) so re-importing the
// same file is idempotent. Returns { imported, skipped, errors }.

const MAX_ROWS = 5000;

router.post(
  "/admin/referring-domains/import",
  requireAdmin,
  // Parse the raw CSV/text body before the main handler.
  // express.text with type '*/*' accepts text/csv, text/plain, and
  // application/octet-stream without the caller needing a specific Content-Type.
  textParser,
  async (req, res, next) => {
    try {
      const raw = typeof req.body === "string" ? req.body : "";
      if (!raw.trim()) {
        res.status(400).json({ error: "Empty body — send your CSV as the request body." });
        return;
      }

      const rows = parseCsv(raw);

      if (rows.length === 0) {
        res.status(400).json({
          error:
            "No valid domains found. Make sure the file has a 'Referring Domain' or 'Domain' column, or one domain per line.",
        });
        return;
      }

      const limited = rows.slice(0, MAX_ROWS);
      const now = new Date();

      // Batch insert; ON CONFLICT DO NOTHING skips duplicates
      const inserted = await db
        .insert(referringDomainsTable)
        .values(
          limited.map((r) => ({
            domain: r.domain,
            firstSeenAt: r.firstSeenAt ?? now,
            source: r.source,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: referringDomainsTable.id });

      const importedCount = inserted.length;
      const skippedCount = limited.length - importedCount;
      const truncated = rows.length > MAX_ROWS;

      res.json({
        imported: importedCount,
        skipped: skippedCount,
        totalInFile: rows.length,
        truncated,
        maxRows: MAX_ROWS,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/admin/referring-domains ──────────────────────────────────────
// Returns summary stats and the 50 most recently added domains.
router.get(
  "/admin/referring-domains",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const [[totals], recent] = await Promise.all([
        db
          .select({ total: count(referringDomainsTable.id).mapWith(Number) })
          .from(referringDomainsTable),
        db
          .select({
            id: referringDomainsTable.id,
            domain: referringDomainsTable.domain,
            firstSeenAt: referringDomainsTable.firstSeenAt,
            source: referringDomainsTable.source,
          })
          .from(referringDomainsTable)
          .orderBy(desc(referringDomainsTable.firstSeenAt))
          .limit(50),
      ]);
      res.json({ total: totals?.total ?? 0, recent });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
