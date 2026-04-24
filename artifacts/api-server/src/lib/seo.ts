import { logger } from "./logger";

const SITE_URL = process.env["SITE_URL"] ?? "https://www.fintechpresshub.com";
const INDEXNOW_KEY = process.env["INDEXNOW_KEY"];

export function getSiteUrl(): string {
  return SITE_URL;
}

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!INDEXNOW_KEY) {
    logger.warn(
      "INDEXNOW_KEY not set — skipping IndexNow ping (Bing/Yandex/Seznam/Naver).",
    );
    return;
  }
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(INDEXNOW_KEY)) {
    logger.warn("INDEXNOW_KEY is malformed — must be 8-128 chars [a-zA-Z0-9-].");
    return;
  }
  if (urls.length === 0) return;

  const host = new URL(SITE_URL).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    if (res.ok || res.status === 202) {
      logger.info(
        { status: res.status, count: urls.length, host },
        "IndexNow ping accepted",
      );
    } else {
      const text = await res.text().catch(() => "");
      logger.warn(
        { status: res.status, body: text.slice(0, 500) },
        "IndexNow ping rejected",
      );
    }
  } catch (err) {
    logger.error({ err }, "IndexNow ping failed");
  }
}

export async function pingGoogleSitemap(): Promise<void> {
  // Google deprecated their unauthenticated sitemap-ping endpoint in 2023.
  // We still issue a best-effort GET so a future re-enablement is captured,
  // and it costs nothing if the endpoint 404s.
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(
    sitemapUrl,
  )}`;
  try {
    const res = await fetch(pingUrl, { method: "GET" });
    logger.info(
      { status: res.status, sitemapUrl },
      "Google sitemap ping attempted (note: Google now prefers Search Console)",
    );
  } catch (err) {
    logger.warn({ err }, "Google sitemap ping failed (non-fatal)");
  }
}

/**
 * Fire-and-forget notification to search engines after a new post is published.
 * Pings IndexNow (Bing, Yandex, Seznam, Naver) with the new URLs and best-effort
 * pings Google with the sitemap location. Errors are swallowed and logged.
 */
export async function notifySearchEnginesOfPublish(
  urls: string[],
): Promise<void> {
  await Promise.allSettled([pingIndexNow(urls), pingGoogleSitemap()]);
}
