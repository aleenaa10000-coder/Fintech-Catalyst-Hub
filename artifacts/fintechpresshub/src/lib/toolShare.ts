/**
 * Tool share-state and embed helpers.
 *
 * Two cross-cutting features for all 10 free tools:
 *
 * 1. **Sharable result-state URLs** — encode the tool's form state into a
 *    single `?s=<base64url>` query parameter so a user can paste it into
 *    Slack/Twitter/LinkedIn and the recipient lands on the same input
 *    state. Pre-fill on mount via `readSharedState(defaults)`. Trigger the
 *    share copy via `buildShareUrl(state)`.
 *
 * 2. **Embeddable tool URL** — every tool also responds at `/embed/:slug`
 *    with no header/footer chrome, allowing third parties to iframe the
 *    tool on their own site. The iframe carries a "Powered by
 *    FintechPressHub" backlink — a clean, white-hat backlink hook with
 *    zero deceptive markup.
 *
 * The encoder uses URL-safe base64 (RFC 4648 §5) so the resulting share
 * link is URL-safe in every transport (email, Slack, Twitter, QR codes)
 * without further escaping. Failure modes — malformed/long/empty params,
 * tampered payloads — fall back silently to defaults so the tool never
 * crashes for visitors arriving from a bad link.
 */

const MAX_SHARE_LEN = 4000;

export function encodeStateToParam(state: unknown): string {
  const json = JSON.stringify(state);
  if (typeof btoa !== "function") return "";
  // encodeURIComponent → unescape pair handles UTF-8 → binary string for btoa
  // (legitimate use; the modern TextEncoder path adds ~1KB without browser benefit here).
  const b64 =
    typeof window !== "undefined" && "btoa" in window
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeStateFromParam<T>(param: string): T | null {
  if (!param || param.length > MAX_SHARE_LEN) return null;
  try {
    const padded = param.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined" && "atob" in window
        ? decodeURIComponent(escape(atob(padded)))
        : Buffer.from(padded, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: unknown): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = `?s=${encodeStateToParam(state)}`;
  url.hash = "";
  return url.toString();
}

/**
 * Read shared state from `?s=` on initial mount. Returns the merged
 * `{ ...defaults, ...parsed }` so older share links missing newer fields
 * still hydrate cleanly when the tool's schema evolves. Always returns
 * defaults when running outside the browser (SSR).
 */
export function readSharedState<T extends object>(defaults: T): T {
  if (typeof window === "undefined") return defaults;
  const s = new URLSearchParams(window.location.search).get("s");
  if (!s) return defaults;
  const parsed = decodeStateFromParam<Partial<T>>(s);
  return parsed ? { ...defaults, ...parsed } : defaults;
}

export const SITE_ORIGIN = "https://www.fintechpresshub.com";

export function buildEmbedSnippet(slug: string, height = 900): string {
  return [
    `<iframe`,
    `  src="${SITE_ORIGIN}/embed/${slug}"`,
    `  width="100%"`,
    `  height="${height}"`,
    `  loading="lazy"`,
    `  style="border:0;border-radius:12px;max-width:760px"`,
    `  title="Free FintechPressHub tool"`,
    `  referrerpolicy="no-referrer-when-downgrade"`,
    `></iframe>`,
  ].join("\n");
}
