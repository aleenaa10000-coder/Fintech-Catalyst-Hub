import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "node:child_process";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import botOgPlugin from "./scripts/bot-og-plugin.mjs";

/**
 * Inject the git mtime of a tracked source file as a build-time constant so
 * legal pages (Terms, Privacy, etc.) can display an accurate "Last updated"
 * date that auto-tracks file edits without manual bumps.
 *
 * Returns an ISO-8601 timestamp string, or an empty string if the file is
 * untracked / outside a git repo (in which case the page falls back to its
 * hard-coded date).
 */
function gitFileMtimeIso(relPath: string): string {
  try {
    const out = execSync(`git log -1 --format=%cI -- ${relPath}`, {
      cwd: import.meta.dirname,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || "";
  } catch {
    return "";
  }
}

const TERMS_LAST_UPDATED_ISO = gitFileMtimeIso("src/pages/terms.tsx");

const replitDevPlugins =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
    : [];

export default defineConfig(({ command }) => {
  const rawPort = process.env.PORT;
  const basePath = process.env.BASE_PATH;
  const isServing = command === "serve";

  if (isServing && !rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = rawPort ? Number(rawPort) : 5173;

  if (rawPort && (Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  if (isServing && !basePath) {
    throw new Error(
      "BASE_PATH environment variable is required but was not provided.",
    );
  }

  return {
  base: basePath ?? "/",
  define: {
    __TERMS_LAST_UPDATED_ISO__: JSON.stringify(TERMS_LAST_UPDATED_ISO),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    botOgPlugin({
      root: path.resolve(import.meta.dirname),
      siteUrl:
        process.env.SITE_URL ?? "https://www.fintechpresshub.com",
    }),
    ...replitDevPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      // Per-author RSS feeds (e.g. /authors/marcus-webb/rss.xml) are served
      // dynamically by the API. The regex limits the proxy to URLs that end
      // in `/rss.xml`, so the SPA still handles plain `/authors/<slug>` and
      // `/authors` index requests.
      "^/authors/[^/]+/rss\\.xml$": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      // IndexNow verification key file (served by the API at a fixed path
      // — the IndexNow `keyLocation` field is what tells search engines
      // where to look, so we don't need a per-key URL).
      "/indexnow-key.txt": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/objects": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});
