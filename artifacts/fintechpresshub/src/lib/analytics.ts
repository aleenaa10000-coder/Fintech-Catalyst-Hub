/**
 * Consent-gated analytics helper.
 *
 * Reads the cookie-consent decision from the same versioned localStorage key
 * the cookie-consent banner writes to, and only forwards events to an
 * analytics provider when the visitor has opted in to analytics cookies.
 *
 * The actual transport (Google Analytics, Plausible, PostHog, …) is
 * intentionally left as a single `sendToProvider` function with a TODO so
 * the integration choice can be made later without changing call sites.
 */

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

function ensureSubscribed() {
  if (typeof window === "undefined") return;
  if ((ensureSubscribed as { _bound?: boolean })._bound) return;
  (ensureSubscribed as { _bound?: boolean })._bound = true;

  cachedAllowed = readAllowed();

  window.addEventListener(CONSENT_EVENT, () => {
    cachedAllowed = readAllowed();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) cachedAllowed = readAllowed();
  });
}

export function isAnalyticsAllowed(): boolean {
  ensureSubscribed();
  return cachedAllowed ?? readAllowed();
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

function sendToProvider(name: string, props?: EventProps) {
  // TODO: wire to a real provider (e.g. Plausible, PostHog, GA4) when chosen.
  // Until then, log to the debug console so the gating behavior is observable
  // in development without exfiltrating any data.
  if (typeof console !== "undefined") {
    console.debug("[analytics]", name, props ?? {});
  }
}

export function trackEvent(name: string, props?: EventProps) {
  if (!isAnalyticsAllowed()) return;
  sendToProvider(name, props);
}

export function trackPageview(path: string) {
  if (!isAnalyticsAllowed()) return;
  sendToProvider("pageview", { path });
}
