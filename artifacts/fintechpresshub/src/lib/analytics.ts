/**
 * Consent-gated Plausible Analytics helper.
 *
 * Uses Plausible's manual-mode script (`script.manual.js`) so no pageview
 * fires automatically — we control every event explicitly. The script is
 * injected into the DOM only once the visitor has opted into analytics
 * cookies, keeping the site GDPR-compliant without any server-side logic.
 *
 * Configuration
 * ─────────────
 * Set VITE_PLAUSIBLE_DOMAIN in your .env file (or Replit Secrets for
 * production builds) to the bare domain registered in your Plausible
 * account, e.g.:
 *
 *   VITE_PLAUSIBLE_DOMAIN=fintechpresshub.com
 *
 * When the env var is absent the helper falls back to console.debug so
 * the consent-gating logic remains observable in development without
 * sending any data.
 *
 * Call sites (unchanged from before)
 * ────────────────────────────────────
 *   trackPageview(location)   — called from ScrollToTop on every route change
 *   trackEvent(name, props)   — called ad-hoc from tool components
 */

// Plausible domain set at build time via VITE_PLAUSIBLE_DOMAIN.
const PLAUSIBLE_DOMAIN = (
  import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined
)?.trim() || "";

// ── Consent helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "cookie-consent.v1";
const CONSENT_EVENT = "cookie-consent:change";

type StoredConsent = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

let cachedAllowed: boolean | null = null;

function readAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return parsed?.analytics === true;
  } catch {
    return false;
  }
}

// ── Plausible script loader ───────────────────────────────────────────────────

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

let plausibleLoaded = false;

/**
 * Dynamically inject the Plausible manual-mode script. Idempotent — safe
 * to call multiple times. Only runs when VITE_PLAUSIBLE_DOMAIN is set and
 * the visitor has already granted analytics consent.
 *
 * After the script loads an initial `pageview` is fired so mid-session
 * consent grants still capture the page the visitor is on.
 */
function loadPlausibleScript(): void {
  if (!PLAUSIBLE_DOMAIN || plausibleLoaded || typeof document === "undefined") {
    return;
  }
  plausibleLoaded = true;

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  // Manual mode: the script never fires pageviews automatically — we call
  // window.plausible("pageview") ourselves on every SPA navigation.
  script.src = "https://plausible.io/js/script.manual.js";

  script.onload = () => {
    // Fire a pageview for whichever page the visitor is on when consent
    // was granted (or when the app first boots for a returning visitor).
    window.plausible?.("pageview");
  };

  document.head.appendChild(script);
}

// ── Subscription ─────────────────────────────────────────────────────────────

function ensureSubscribed() {
  if (typeof window === "undefined") return;
  if ((ensureSubscribed as { _bound?: boolean })._bound) return;
  (ensureSubscribed as { _bound?: boolean })._bound = true;

  cachedAllowed = readAllowed();

  // Returning visitor who already consented — load immediately.
  if (cachedAllowed) loadPlausibleScript();

  window.addEventListener(CONSENT_EVENT, () => {
    cachedAllowed = readAllowed();
    if (cachedAllowed) loadPlausibleScript();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      cachedAllowed = readAllowed();
      if (cachedAllowed) loadPlausibleScript();
    }
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isAnalyticsAllowed(): boolean {
  ensureSubscribed();
  return cachedAllowed ?? readAllowed();
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Forward an event to Plausible. Strips null/undefined prop values since
 * Plausible only accepts string | number | boolean.
 *
 * Falls back to console.debug when VITE_PLAUSIBLE_DOMAIN is not configured
 * so the consent-gating path stays visible during development.
 */
function sendToProvider(name: string, props?: EventProps) {
  if (PLAUSIBLE_DOMAIN && typeof window !== "undefined" && window.plausible) {
    const safeProps: Record<string, string | number | boolean> = {};
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v != null) safeProps[k] = v;
      }
    }
    window.plausible(
      name,
      Object.keys(safeProps).length > 0 ? { props: safeProps } : undefined,
    );
    return;
  }

  // Dev fallback: log to console when Plausible is not configured.
  if (typeof console !== "undefined") {
    console.debug("[analytics]", name, props ?? {});
  }
}

/**
 * Track a SPA pageview. Called from ScrollToTop on every route change.
 * Plausible reads window.location automatically — no need to pass the URL.
 */
export function trackPageview(_path: string) {
  ensureSubscribed();
  if (!isAnalyticsAllowed()) return;
  sendToProvider("pageview");
}

/**
 * Track a named custom event with optional properties.
 * Example: trackEvent("Tool Used", { tool: "readability-checker" })
 */
export function trackEvent(name: string, props?: EventProps) {
  ensureSubscribed();
  if (!isAnalyticsAllowed()) return;
  sendToProvider(name, props);
}
