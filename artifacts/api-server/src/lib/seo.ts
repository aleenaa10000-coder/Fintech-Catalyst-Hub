import { logger } from "./logger";

const SITE_URL = process.env["SITE_URL"] ?? "https://www.fintechpresshub.com";
const INDEXNOW_KEY = process.env["INDEXNOW_KEY"];

export function getSiteUrl(): string {
  return SITE_URL;
}

export type IndexNowStatus =
  | "accepted"
  | "rejected"
  | "skipped_no_key"
  | "skipped_malformed_key"
  | "error";

export interface IndexNowResult {
  status: IndexNowStatus;
  httpStatus?: number;
  message: string;
  urlsSubmitted: number;
}

export type GooglePingStatus = "attempted" | "error";

export interface GooglePingResult {
  status: GooglePingStatus;
  httpStatus?: number;
  message: string;
}

export interface SeoNotificationResult {
  indexNow: IndexNowResult;
  google: GooglePingResult;
  urls: string[];
  durationMs: number;
}

export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!INDEXNOW_KEY) {
    logger.warn(
      "INDEXNOW_KEY not set — skipping IndexNow ping (Bing/Yandex/Seznam/Naver).",
    );
    return {
      status: "skipped_no_key",
      message:
        "INDEXNOW_KEY is not set on the API server, so Bing/Yandex/Seznam/Naver were not notified.",
      urlsSubmitted: 0,
    };
  }
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(INDEXNOW_KEY)) {
    logger.warn("INDEXNOW_KEY is malformed — must be 8-128 chars [a-zA-Z0-9-].");
    return {
      status: "skipped_malformed_key",
      message:
        "INDEXNOW_KEY is set but does not match the required format (8-128 chars [a-zA-Z0-9-]).",
      urlsSubmitted: 0,
    };
  }
  if (urls.length === 0) {
    return {
      status: "accepted",
      message: "No URLs to submit.",
      urlsSubmitted: 0,
    };
  }

  const host = new URL(SITE_URL).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/indexnow-key.txt`,
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
      return {
        status: "accepted",
        httpStatus: res.status,
        message: `Submitted ${urls.length} URL${urls.length === 1 ? "" : "s"} to Bing, Yandex, Seznam, and Naver.`,
        urlsSubmitted: urls.length,
      };
    }
    const text = await res.text().catch(() => "");
    logger.warn(
      { status: res.status, body: text.slice(0, 500) },
      "IndexNow ping rejected",
    );
    return {
      status: "rejected",
      httpStatus: res.status,
      message: `IndexNow rejected the submission (HTTP ${res.status}).`,
      urlsSubmitted: 0,
    };
  } catch (err) {
    logger.error({ err }, "IndexNow ping failed");
    return {
      status: "error",
      message: `IndexNow ping threw: ${err instanceof Error ? err.message : String(err)}`,
      urlsSubmitted: 0,
    };
  }
}

export async function pingGoogleSitemap(): Promise<GooglePingResult> {
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
    return {
      status: "attempted",
      httpStatus: res.status,
      message: `Google sitemap ping attempted (HTTP ${res.status}). Google now prefers Search Console.`,
    };
  } catch (err) {
    logger.warn({ err }, "Google sitemap ping failed (non-fatal)");
    return {
      status: "error",
      message: `Google sitemap ping failed (non-fatal): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/**
 * Notify search engines after a new post is published. Pings IndexNow
 * (Bing/Yandex/Seznam/Naver) with the new URLs and best-effort pings Google
 * with the sitemap location, returning a structured result for both.
 */
export async function notifySearchEnginesOfPublish(
  urls: string[],
): Promise<SeoNotificationResult> {
  const startedAt = Date.now();
  const [indexNow, google] = await Promise.all([
    pingIndexNow(urls),
    pingGoogleSitemap(),
  ]);
  return {
    indexNow,
    google,
    urls,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Same as notifySearchEnginesOfPublish but bounded by a timeout. If the
 * upstream pings don't complete within `timeoutMs`, we resolve with a
 * "timed out" placeholder result and let the original promise continue
 * in the background (errors there are caught and logged).
 */
export async function notifySearchEnginesOfPublishWithTimeout(
  urls: string[],
  timeoutMs: number,
): Promise<SeoNotificationResult> {
  const startedAt = Date.now();
  const work = notifySearchEnginesOfPublish(urls);

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<SeoNotificationResult>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        indexNow: {
          status: "error",
          message: `IndexNow ping did not complete within ${timeoutMs}ms; it is still running in the background.`,
          urlsSubmitted: 0,
        },
        google: {
          status: "error",
          message: `Google sitemap ping did not complete within ${timeoutMs}ms; it is still running in the background.`,
        },
        urls,
        durationMs: Date.now() - startedAt,
      });
    }, timeoutMs);
  });

  // Make sure the background work doesn't leak unhandled rejections.
  work.catch((err) => {
    logger.error({ err }, "Background search-engine notification failed");
  });

  const result = await Promise.race([work, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}
