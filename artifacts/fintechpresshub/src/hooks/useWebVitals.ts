import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * useWebVitals — Core Web Vitals reporting hook.
 *
 * Dynamically imports the `web-vitals` library (code-split, ~3 kB gzipped)
 * and sends each metric to POST /api/vitals once the browser is idle.
 * Uses `sendBeacon` so reports are never dropped on navigation/unload.
 *
 * Mount once at the top of App.tsx. The hook reads the current page path
 * from wouter so each metric is attributed to the correct URL.
 *
 * Silently no-ops when the API call fails — CWV reporting is best-effort
 * telemetry and must never surface errors to users.
 */
export function useWebVitals() {
  const [location] = useLocation();

  useEffect(() => {
    let cancelled = false;

    function report(metric: { name: string; value: number; rating: string; delta: number }) {
      if (cancelled) return;
      const payload = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        page: location,
      });

      // sendBeacon is fire-and-forget — ideal for analytics on navigation.
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/vitals", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => undefined);
      }
    }

    // Dynamically import web-vitals so it never blocks the main bundle.
    // web-vitals v5 dropped onFID (First Input Delay) — INP is its replacement.
    import("web-vitals").then(({ onLCP, onCLS, onINP, onTTFB }) => {
      if (cancelled) return;
      onLCP(report, { reportAllChanges: false });
      onCLS(report, { reportAllChanges: false });
      onINP(report, { reportAllChanges: false });
      onTTFB(report);
    }).catch(() => undefined);

    return () => { cancelled = true; };
  // Re-register on every page navigation so metrics are attributed correctly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}
