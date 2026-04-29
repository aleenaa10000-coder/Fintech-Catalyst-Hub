/**
 * Route prefetching utility.
 *
 * The same dynamic-import expressions that App.tsx uses inside React.lazy()
 * are mirrored here so that hover/focus on a nav link can warm the browser
 * cache for that route's code chunk before the user clicks. Because Vite/
 * Rollup deduplicates dynamic imports by module path, the chunk fetched
 * here is the exact same file that React.lazy() would later request — so
 * the actual navigation resolves instantly from cache.
 *
 * Each route is prefetched at most once per session.
 */

const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/pages/about"),
  "/services": () => import("@/pages/services"),
  "/pricing": () => import("@/pages/pricing"),
  "/blog": () => import("@/pages/blog"),
  "/contact": () => import("@/pages/contact"),
  "/write-for-us": () => import("@/pages/write-for-us"),
  "/tools/financial-health-score-calculator": () =>
    import("@/pages/tools/financial-health-score-calculator"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string): void {
  if (typeof window === "undefined") return;
  if (prefetched.has(path)) return;
  const loader = ROUTE_LOADERS[path];
  if (!loader) return;
  prefetched.add(path);
  loader().catch(() => {
    // Allow a retry on the next hover if the chunk failed to load
    // (e.g. transient network error).
    prefetched.delete(path);
  });
}
