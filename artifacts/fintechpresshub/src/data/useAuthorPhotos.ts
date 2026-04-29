import { useEffect, useState } from "react";

let cachedOverrides: Record<string, string> | null = null;
let inFlight: Promise<Record<string, string>> | null = null;
const subscribers = new Set<(map: Record<string, string>) => void>();

async function fetchOverrides(): Promise<Record<string, string>> {
  if (cachedOverrides) return cachedOverrides;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/author-photos");
      if (!res.ok) return {};
      const json = (await res.json()) as { overrides?: Record<string, string> };
      const map = json.overrides ?? {};
      cachedOverrides = map;
      subscribers.forEach((cb) => cb(map));
      return map;
    } catch {
      return {};
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Hook returning the slug→photoUrl override map. Cached process-wide so
 * mounting many author cards doesn't trigger duplicate requests.
 */
export function useAuthorPhotoOverrides(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(
    cachedOverrides ?? {},
  );
  useEffect(() => {
    let active = true;
    const sub = (next: Record<string, string>) => {
      if (active) setMap(next);
    };
    subscribers.add(sub);
    if (cachedOverrides) {
      setMap(cachedOverrides);
    } else {
      fetchOverrides().then((next) => {
        if (active) setMap(next);
      });
    }
    return () => {
      active = false;
      subscribers.delete(sub);
    };
  }, []);
  return map;
}

export function resolveAuthorPhoto(
  slug: string | undefined | null,
  fallback: string | undefined | null,
  overrides: Record<string, string>,
): string | undefined {
  if (slug && overrides[slug]) return overrides[slug];
  return fallback ?? undefined;
}

/**
 * Manually evict the cached override map — call after the admin uploads or
 * removes an override so the next render picks up the change immediately.
 */
export function invalidateAuthorPhotoOverrides() {
  cachedOverrides = null;
  inFlight = null;
}
