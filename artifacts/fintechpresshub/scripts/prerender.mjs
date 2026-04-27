// Build-time prerender for the FintechPressHub SPA.
//
// After `vite build` writes the SPA shell to dist/public/index.html, this
// script reuses the same `buildMeta` + `shellInject` helpers the bot-og dev
// plugin uses, and emits one rich-meta HTML file per known route:
//
//   dist/public/blog/<slug>/index.html
//   dist/public/services/<slug>/index.html
//   dist/public/authors/<slug>/index.html
//   dist/public/about/index.html
//   dist/public/pricing/index.html
//   ...
//
// The static deployment serves these files directly. Social crawlers
// (LinkedIn, Facebook, Slack, Discord) — which don't execute JavaScript —
// now see the correct per-page Open Graph tags, BlogPosting JSON-LD, and a
// visible <h1> + intro paragraph instead of the generic SPA shell. The SPA
// JS still runs on top for real users (React's createRoot replaces the
// `<div data-bot-og="body">…</div>` cleanly with no hydration mismatch).
//
// New blog posts published via the admin dashboard *after* a deploy will
// fall through to the existing SPA fallback (same as today). Re-deploying
// the web artifact picks them up, since this script also queries the API
// at build time when one is reachable.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMeta,
  shellInject,
  getAllPosts,
  getAllServices,
} from "./bot-og-plugin.mjs";
import { PAGE_META, AUTHORS } from "./bot-og-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(projectRoot, "dist/public");
const indexPath = path.resolve(distDir, "index.html");

const SITE_URL =
  process.env.SITE_URL ?? "https://www.fintechpresshub.com";
const API_BASE = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080";

async function ensureBuildExists() {
  try {
    await fs.access(indexPath);
  } catch {
    throw new Error(
      `prerender: ${indexPath} not found. Run \`vite build\` before this script.`,
    );
  }
}

// Routes whose canonical URL is `/` keep `index.html` (the original built
// shell already serves the home page). Every other route gets its own
// directory + index.html so the static server resolves it directly.
function outputPathForRoute(pathname) {
  if (!pathname || pathname === "/" || pathname === "") {
    return path.resolve(distDir, "index.html");
  }
  // Normalize: strip leading and trailing slashes.
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return path.resolve(distDir, trimmed, "index.html");
}

async function writeRoute(pathname, html) {
  const outPath = outputPathForRoute(pathname);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, "utf8");
}

async function prerender() {
  await ensureBuildExists();
  const baseShell = await fs.readFile(indexPath, "utf8");

  // Build the master list of routes to render. Order matters only for the
  // summary log — the writes themselves are independent.
  const routes = new Set();

  // Static pages (home, about, services, pricing, blog, authors, contact, etc.)
  for (const meta of Object.values(PAGE_META)) {
    if (meta.path) routes.add(meta.path);
  }

  // Author profile pages.
  for (const a of AUTHORS) {
    if (a.slug) routes.add(`/authors/${a.slug}`);
  }

  // Service detail pages.
  const services = await getAllServices();
  for (const s of services) {
    if (s.slug) routes.add(`/services/${s.slug}`);
  }

  // Blog post pages — pulled from API when available, falling back to the
  // bundled static seed posts when the API isn't reachable at build time.
  const posts = await getAllPosts(API_BASE);
  for (const p of posts) {
    if (p.slug) routes.add(`/blog/${p.slug}`);
  }

  const summary = {
    total: routes.size,
    written: 0,
    skipped: 0,
    failed: 0,
    byType: { static: 0, services: 0, authors: 0, blog: 0, home: 0 },
  };

  // Process routes in parallel — disk I/O dominates and `buildMeta` is pure.
  await Promise.all(
    Array.from(routes).map(async (pathname) => {
      try {
        const meta = await buildMeta(pathname, SITE_URL, API_BASE);
        if (!meta) {
          summary.skipped += 1;
          return;
        }
        const html = shellInject(baseShell, meta);
        await writeRoute(pathname, html);
        summary.written += 1;

        if (pathname === "/") summary.byType.home += 1;
        else if (pathname.startsWith("/blog/")) summary.byType.blog += 1;
        else if (pathname.startsWith("/services/")) summary.byType.services += 1;
        else if (pathname.startsWith("/authors/")) summary.byType.authors += 1;
        else summary.byType.static += 1;
      } catch (err) {
        summary.failed += 1;
        console.error(
          `[prerender] failed for ${pathname}: ${err?.message ?? err}`,
        );
      }
    }),
  );

  const breakdown = Object.entries(summary.byType)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  console.log(
    `[prerender] wrote ${summary.written}/${summary.total} routes (${breakdown})` +
      (summary.skipped ? `, skipped ${summary.skipped}` : "") +
      (summary.failed ? `, ${summary.failed} failed` : ""),
  );
}

prerender().catch((err) => {
  console.error("[prerender] fatal:", err);
  // Don't fail the build — the SPA shell already exists and would still serve
  // every route via the static fallback. A failed prerender is a soft regression
  // (worse social previews) but not a deploy-blocker.
  process.exit(0);
});
