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

/**
 * Every individual blog post URL (`/blog/:slug`) renders the same
 * `blog-post.tsx` component, so its chunk only needs to be prefetched
 * once per session — not per card. Exposed as a dedicated function
 * (rather than a path entry above) because there is no single literal
 * pathname that maps to it. The blog index calls this both from an
 * IntersectionObserver as cards scroll into view and from per-card
 * hover/focus, both deduped by the flag below.
 */
const BLOG_POST_LOADER = () => import("@/pages/blog-post");
let blogPostPrefetched = false;

export function prefetchBlogPost(): void {
  if (typeof window === "undefined") return;
  if (blogPostPrefetched) return;
  blogPostPrefetched = true;
  BLOG_POST_LOADER().catch(() => {
    blogPostPrefetched = false;
  });
}

/**
 * `/services/:slug` always renders `service-detail.tsx`, so it follows
 * the same one-shot pattern as blog posts.
 */
const SERVICE_DETAIL_LOADER = () => import("@/pages/service-detail");
let serviceDetailPrefetched = false;

export function prefetchServiceDetail(): void {
  if (typeof window === "undefined") return;
  if (serviceDetailPrefetched) return;
  serviceDetailPrefetched = true;
  SERVICE_DETAIL_LOADER().catch(() => {
    serviceDetailPrefetched = false;
  });
}

/**
 * `/authors/:slug` always renders `author.tsx`, same one-shot pattern.
 */
const AUTHOR_LOADER = () => import("@/pages/author");
let authorPrefetched = false;

export function prefetchAuthor(): void {
  if (typeof window === "undefined") return;
  if (authorPrefetched) return;
  authorPrefetched = true;
  AUTHOR_LOADER().catch(() => {
    authorPrefetched = false;
  });
}
