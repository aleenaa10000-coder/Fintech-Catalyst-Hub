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
  "/authors": () => import("@/pages/authors"),
  "/editorial-guidelines": () => import("@/pages/editorial-guidelines"),
  "/community-guidelines": () => import("@/pages/community-guidelines"),
  "/privacy-policy": () => import("@/pages/privacy-policy"),
  "/refund-policy": () => import("@/pages/refund-policy"),
  "/cookie-policy": () => import("@/pages/cookie-policy"),
  "/terms": () => import("@/pages/terms"),
  "/status": () => import("@/pages/status"),
  "/tools": () => import("@/pages/tools/index"),
  "/tools/financial-health-score-calculator": () =>
    import("@/pages/tools/financial-health-score-calculator"),
  "/tools/meta-description-generator": () =>
    import("@/pages/tools/meta-description-generator"),
  "/tools/guest-post-pitch-generator": () =>
    import("@/pages/tools/guest-post-pitch-generator"),
  "/tools/readability-checker": () =>
    import("@/pages/tools/readability-checker"),
  "/tools/keyword-difficulty-estimator": () =>
    import("@/pages/tools/keyword-difficulty-estimator"),
  "/tools/backlink-value-estimator": () =>
    import("@/pages/tools/backlink-value-estimator"),
  "/tools/content-brief-generator": () =>
    import("@/pages/tools/content-brief-generator"),
  "/tools/headline-analyzer": () =>
    import("@/pages/tools/headline-analyzer"),
  "/tools/link-prospector": () =>
    import("@/pages/tools/link-prospector"),
  "/tools/outreach-email-generator": () =>
    import("@/pages/tools/outreach-email-generator"),
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
 * fallback. Loaders fire in small parallel batches so the full bundle
 * warms quickly without competing with user interactions.
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
  () => import("@/pages/tools/index"),
  () => import("@/pages/tools/financial-health-score-calculator"),
  () => import("@/pages/tools/meta-description-generator"),
  () => import("@/pages/tools/guest-post-pitch-generator"),
  () => import("@/pages/tools/readability-checker"),
  () => import("@/pages/tools/keyword-difficulty-estimator"),
  () => import("@/pages/tools/backlink-value-estimator"),
  () => import("@/pages/tools/content-brief-generator"),
  () => import("@/pages/tools/headline-analyzer"),
  () => import("@/pages/tools/link-prospector"),
  () => import("@/pages/tools/outreach-email-generator"),
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
  () => import("@/pages/admin-analytics"),
  () => import("@/pages/admin-pricing"),
  () => import("@/pages/admin-authors"),
  () => import("@/pages/admin-seo-performance"),
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
    setTimeout(fn, 800);
  }
}

/**
 * Run loaders in parallel batches of `batchSize`. Each batch fires
 * during a single idle slice so we don't starve user interactions.
 */
function runBatched(
  loaders: ReadonlyArray<() => Promise<unknown>>,
  batchSize = 3,
): void {
  let i = 0;
  const next = () => {
    const batch = loaders.slice(i, i + batchSize);
    if (batch.length === 0) return;
    i += batchSize;
    Promise.all(batch.map((l) => l().catch(() => undefined))).finally(() => {
      if (i < loaders.length) scheduleIdle(next);
    });
  };
  scheduleIdle(next);
}

export function prefetchAdminBundle(): void {
  if (typeof window === "undefined") return;
  if (adminBundlePrefetched) return;
  adminBundlePrefetched = true;
  runBatched(ADMIN_LOADERS, 3);
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
  runBatched(PUBLIC_LOADERS, 3);
}
