import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent.v1";
const CONSENT_EVENT = "cookie-consent:change";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

function readStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.decidedAt !== "string") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

function writeStoredConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent<CookieConsent>(CONSENT_EVENT, { detail: consent }));
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readStoredConsent());

  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      if (detail) setConsent(detail);
    }
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setConsent(readStoredConsent());
    }
    window.addEventListener(CONSENT_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const save = useCallback((analytics: boolean) => {
    const next: CookieConsent = {
      necessary: true,
      analytics,
      decidedAt: new Date().toISOString(),
    };
    writeStoredConsent(next);
  }, []);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
  }, []);

  return {
    consent,
    hasDecided: consent !== null,
    analyticsAllowed: consent?.analytics === true,
    save,
    reset,
  };
}
