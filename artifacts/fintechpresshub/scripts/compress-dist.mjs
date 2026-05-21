/**
 * Post-build asset compression script.
 *
 * Generates .gz (gzip) and .br (brotli) versions of every compressible static
 * asset in dist/public. The Express server reads these pre-compressed files
 * and serves them directly, eliminating per-request CPU overhead for gzip and
 * enabling Brotli compression (20% smaller than gzip on average) for JS/CSS.
 *
 * This script uses Node.js built-in `zlib` — no extra npm packages required.
 *
 * Skips files that are already compressed (images, fonts, .gz/.br files).
 * Reports total size savings at the end.
 */

import { readdirSync, statSync, createReadStream, createWriteStream } from "node:fs";
import { createGzip, createBrotliCompress, constants as zlibConstants } from "node:zlib";
import { join, extname, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "..", "dist", "public");

const COMPRESSIBLE_EXTS = new Set([".js", ".css", ".html", ".json", ".svg", ".xml", ".txt", ".map"]);

// High-quality gzip (level 9) + maximum brotli compression for production assets.
// Build time is not a concern here — we want the smallest files.
const GZIP_OPTIONS = { level: 9 };
const BROTLI_OPTIONS = {
  params: {
    [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
  },
};

let totalOriginal = 0;
let totalGz = 0;
let totalBr = 0;
let fileCount = 0;

async function compressFile(filepath) {
  const size = statSync(filepath).size;
  if (size === 0) return;

  totalOriginal += size;

  const gzPath = filepath + ".gz";
  await pipeline(createReadStream(filepath), createGzip(GZIP_OPTIONS), createWriteStream(gzPath));
  const gzSize = statSync(gzPath).size;
  totalGz += gzSize;

  const brPath = filepath + ".br";
  await pipeline(createReadStream(filepath), createBrotliCompress(BROTLI_OPTIONS), createWriteStream(brPath));
  const brSize = statSync(brPath).size;
  totalBr += brSize;

  fileCount++;
  const pctGz = Math.round((1 - gzSize / size) * 100);
  const pctBr = Math.round((1 - brSize / size) * 100);
  console.log(
    `  ${relative(DIST, filepath).padEnd(60)} ${formatBytes(size)} → gz:${formatBytes(gzSize)} (-${pctGz}%) br:${formatBytes(brSize)} (-${pctBr}%)`,
  );
}

function formatBytes(b) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}kB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
}

async function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (
        COMPRESSIBLE_EXTS.has(extname(entry.name)) &&
        !entry.name.endsWith(".gz") &&
        !entry.name.endsWith(".br")
      ) {
        await compressFile(full);
      }
    }),
  );
}

console.log("Compressing build output (gzip + brotli)...");
await walk(DIST);

console.log("");
console.log(
  `Compressed ${fileCount} files — saved ${formatBytes(totalOriginal - totalGz)} with gzip, ${formatBytes(totalOriginal - totalBr)} with brotli`,
);
