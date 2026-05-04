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
  "/tools/content-calendar-generator": () =>
    import("@/pages/tools/content-calendar-generator"),
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

/**
 * Public route bundle. After first paint, silently warm every public
 * page chunk during browser idle time so that any in-app navigation
 * resolves instantly from cache instead of showing the Suspense
 * fallback. Each loader fires sequentially during idle slices so we
 * never compete with actual user-initiated work for network or CPU.
 */
const PUBLIC_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  () => import("@/pages/about"),
  () => import("@/pages/services"),
  () => import("@/pages/service-detail"),
  () => import("@/pages/pricing"),
  () => import("@/pages/blog"),
  () => import("@/pages/blog-post"),
  () => import("@/pages/author"),
  () => import("@/pages/authors"),
  () => import("@/pages/write-for-us"),
  () => import("@/pages/contact"),
  () => import("@/pages/privacy-policy"),
  () => import("@/pages/refund-policy"),
  () => import("@/pages/cookie-policy"),
  () => import("@/pages/terms"),
  () => import("@/pages/editorial-guidelines"),
  () => import("@/pages/community-guidelines"),
  () => import("@/pages/tools/financial-health-score-calculator"),
];

let publicBundlePrefetched = false;

/**
 * Admin route bundle. Once a logged-in admin user is detected anywhere
 * on the site, we want to silently warm every admin page chunk so that
 * navigating between them never shows a Suspense fallback. Each loader
 * fires sequentially during browser idle time so we never compete with
 * actual user-initiated work for network or CPU.
 *
 * Visitors who are not admins never trigger this — the bundle is large
 * enough (~150 KB total across all admin chunks) that we don't want to
 * waste bandwidth on the 99% of traffic who will never see /admin.
 */
const ADMIN_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  () => import("@/pages/admin-dashboard"),
  () => import("@/pages/admin-blog"),
  () => import("@/pages/admin-services"),
  () => import("@/pages/admin-newsletter"),
  () => import("@/pages/admin-moderation"),
  () => import("@/pages/admin-audit-log"),
  () => import("@/pages/admin-notifications"),
  () => import("@/pages/admin-author-photos"),
  () => import("@/pages/admin-authors-subscribers"),
  () => import("@/pages/admin-author-subscribers"),
  () => import("@/pages/admin-commissioning-topics"),
];

let adminBundlePrefetched = false;

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: IdleRequestCallback,
    opts?: { timeout: number },
  ) => number;
};

function scheduleIdle(fn: () => void): void {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(() => fn(), { timeout: 3000 });
  } else {
    // Safari fallback. 1500ms is long enough that we're past the
    // initial render burst on virtually every device.
    setTimeout(fn, 1500);
  }
}

export function prefetchAdminBundle(): void {
  if (typeof window === "undefined") return;
  if (adminBundlePrefetched) return;
  adminBundlePrefetched = true;

  // Stagger imports one per idle slice so we never block a real
  // user interaction. Failures are swallowed — if a chunk genuinely
  // can't load, the user will hit the normal Suspense fallback when
  // they navigate to that route, which is the same UX as before.
  let i = 0;
  const next = () => {
    const loader = ADMIN_LOADERS[i++];
    if (!loader) return;
    loader()
      .catch(() => undefined)
      .finally(() => {
        if (i < ADMIN_LOADERS.length) scheduleIdle(next);
      });
  };
  scheduleIdle(next);
}

/**
 * Warm every public-page chunk during browser idle time after the
 * initial render. Called once on first mount so that any subsequent
 * in-app navigation resolves instantly from cache and the Suspense
 * fallback spinner never appears for normal browsing.
 */
export function prefetchPublicBundle(): void {
  if (typeof window === "undefined") return;
  if (publicBundlePrefetched) return;
  publicBundlePrefetched = true;

  let i = 0;
  const next = () => {
    const loader = PUBLIC_LOADERS[i++];
    if (!loader) return;
    loader()
      .catch(() => undefined)
      .finally(() => {
        if (i < PUBLIC_LOADERS.length) scheduleIdle(next);
      });
  };
  scheduleIdle(next);
}
