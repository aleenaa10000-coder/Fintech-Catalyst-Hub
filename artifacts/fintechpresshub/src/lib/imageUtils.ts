/**
 * Utilities for serving optimally sized, modern-format images.
 *
 * Unsplash CDN (images.unsplash.com) honours URL query params that allow us
 * to request the exact dimensions we need and let the CDN transcode to WebP
 * automatically — meaning zero server-side work and a significant bandwidth
 * saving for browsers that support the format (all modern browsers do).
 *
 * Supported Unsplash params:
 *   auto=format  — CDN serves WebP to browsers that accept it (via Accept header)
 *   fm=webp      — force WebP regardless of Accept header (belt-and-suspenders)
 *   fit=crop     — crop to fill exact dimensions rather than letter-boxing
 *   w=<px>       — resize to this width (maintains aspect ratio with crop)
 *   q=<0-100>    — JPEG/WebP quality (75 is a good balance of quality vs size)
 */

const UNSPLASH_HOST = "images.unsplash.com";

function isUnsplash(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === UNSPLASH_HOST;
  } catch {
    return false;
  }
}

/**
 * Returns a URL that asks the Unsplash CDN for a specific width and
 * WebP format. Non-Unsplash URLs are returned unchanged.
 *
 * Uses `fm=webp` in addition to `auto=format` so the CDN delivers WebP
 * even when the browser's Accept header is missing (e.g. SSR crawlers,
 * curl, some CDN edge nodes) — reducing file size by ~30-40% vs JPEG.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  width: number,
  quality = 75,
): string {
  if (!url) return "";
  if (!isUnsplash(url)) return url;

  const parsed = new URL(url);
  parsed.searchParams.set("auto", "format");
  parsed.searchParams.set("fm", "webp");
  parsed.searchParams.set("fit", "crop");
  parsed.searchParams.set("w", String(width));
  parsed.searchParams.set("q", String(quality));
  return parsed.toString();
}

/**
 * Builds a `srcset` attribute string for Unsplash images at multiple widths.
 * Non-Unsplash URLs get a single-entry srcset pointing to the base URL.
 *
 * Every entry requests WebP format so the browser always downloads the most
 * compressed format regardless of srcset entry chosen. Pair this with a
 * `sizes` attribute so the browser selects the right width descriptor.
 *
 * @param url     — raw image URL (may be Unsplash or any other host)
 * @param widths  — ordered list of pixel widths to include in srcset
 * @param quality — Unsplash quality param (default 75)
 */
export function buildSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = 75,
): string {
  if (!url) return "";
  if (!isUnsplash(url)) return url;

  return widths
    .map((w) => `${optimizeImageUrl(url, w, quality)} ${w}w`)
    .join(", ");
}
