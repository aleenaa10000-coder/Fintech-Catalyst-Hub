# Technical SEO Audit — FintechPressHub

**Date:** 2026-05-14
**Scope:** Crawlability, indexation control, HTTP correctness, performance,
security headers, URL hygiene, structured-data validity, mobile/viewport,
error pages, CI gates.
**Sibling reports:** `pseo-audit-*.md` (programmatic SEO), `aeo-audit-*.md`
(answer-engine), `geo-audit-2026-05.md` (generative-engine),
`i18n-seo-audit-2026-05.md` (international). This document covers only the
*technical* dimension and does not duplicate those audits.

---

## Executive summary

| | |
|---|---|
| **Score** | **96 / 100** |
| **Critical issue found** | One — soft-404 in production SPA fallback (fixed this PR). |
| **Posture** | Already exceptional: dynamic robots.txt + 11 sitemaps with image extensions, IndexNow + Google ping on publish, SSR meta injection with per-route 404 status, full strict CSP + HSTS + COOP/COEP/CORP, immutable cache for hashed assets, gzip compression, lazy/srcset images, code-splitting, Web Vitals → /api/vitals, Lighthouse 0.90 hard gate in CI, dedicated schema-validate + AEO health-check + hreflang admin route. |
| **Hostinger Business compatibility** | Fully compatible. The single Hostinger-specific concern (LiteSpeed brotli for static assets) is documented as an `.htaccess` configuration item — no Node-level dependency added. |
| **Skill-Creator outputs** | Untouched. |

The codebase has been through three prior pSEO passes plus AEO, GEO, and i18n
audits. The technical-SEO surface area was already in very strong shape; the
one *real* indexation bug found is the soft-404, which is fixed in this PR.
Two smaller hardening items follow.

---

## What was already correct (do NOT rebuild)

| Area | Where | Notes |
|---|---|---|
| Dynamic `robots.txt` with AI-bot allow/disallow + LLM-Content hints | `app.ts:237-356` | Per `geo-audit-2026-05.md` Fix #1 |
| Sitemap index + 10 child sitemaps + Google News sitemap | `routes/sitemapIndex.ts`, `routes/newsSitemap.ts` | Hreflang + image extensions on every URL |
| IndexNow + Google sitemap ping on publish | `lib/seo.ts:39-143`, `routes/blog.ts:527-546` | |
| SSR meta injection w/ per-route 404 for missing entities | `middlewares/ssrMeta.ts` (8 routes) | |
| Canonical tag on every page (HTML + HTTP `Link: rel="canonical"`) | `ssrMeta.ts:225-228, 1338-1344, 3624-3644`, `PageMeta.tsx:400-401` | |
| `noindex` toggle per blog post + global X-Robots-Tag | `routes/blog.ts:494`, `PageMeta.tsx:320`, `app.ts:81-86, 108` | |
| 410 Gone for permanently deleted posts | `routes/blog.ts:413` | |
| HTTPS + www + trailing-slash redirects (production-only) | `app.ts:39-75` | |
| Immutable cache for hashed assets, no-cache for HTML shell | `app.ts:482-498` | `Vary: Accept-Encoding` set so CDNs cache compressed/identity separately |
| `compression()` middleware (gzip/deflate) | `app.ts:193` | Brotli is reverse-proxy concern; documented in hostinger-deployment.md |
| `Link: rel="cite-as"` (W3C AI citation) | `app.ts:125`, `ssrMeta.ts` (3 sites) | |
| Image WebP transcoding + lazy + srcset | `lib/imageUtils.ts:36-76`, `home.tsx:387` | Unsplash CDN preconnected |
| Preconnect / dns-prefetch to fonts.googleapis.com, fonts.gstatic.com, storage.googleapis.com, images.unsplash.com | `index.html:68-83` | |
| Code splitting via `React.lazy()` + `<Suspense>` | `home.tsx:29-31` etc. | |
| Web Vitals reporting → `/api/vitals` | `hooks/useWebVitals.ts`, `routes/vitals.ts` | |
| HSTS w/ preload, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy | `app.ts:140-147` | |
| Strict CSP `default-src 'self'` (production-only) | `app.ts:159-185` | |
| COOP / COEP / CORP | `app.ts:152-155` | |
| Lowercase + hyphen URL slugs enforced by Zod | `routes/blog.ts:113` | |
| Viewport, theme-color, manifest, touch icons | `index.html:11-13`, `public/site.webmanifest` | |
| Lighthouse 0.90 SEO + 0.90 Accessibility CI hard gate | `scripts/lh-threshold-check.mjs` | |
| Schema validator | `scripts/src/schema-validate.ts` | |
| AEO health check (BCP-47, inLanguage, schema fields) | `scripts/src/aeo-health-check.ts` | |
| Hreflang return-tag symmetry validator | `routes/hreflangCheckAdmin.ts`, `lib/hreflangCheck.ts` | |
| Sitemap validator | `scripts/validate-seo-files.mjs` | |
| Charset declared in both `<meta>` and HTTP `Content-Type` header | `index.html:4`, `app.ts:514` | Required for Lighthouse charset audit |
| HEAD request handling on SPA fallback | `app.ts:528` | Prevents 404 on uptime monitors / search engine HEAD probes |
| Per-route `res.status(404)` in `ssrMeta.ts` for missing entities | 8 sites in `ssrMeta.ts` | Status preserved through `sendFile` in fallback |

---

## Gaps identified and fixed in this PR

### T1 · SPA fallback returned 200 for unknown URLs — soft 404 (CRITICAL)

**State (before):** In production, `app.get("*", spaFallback)` (line 527 of
`app.ts`) sent `index.html` with HTTP 200 for **any** unknown URL. So a
typo'd path like `/random-junk-xyz`, a malicious crawler probing
`/wp-admin`, or a referral link with a stale slug all returned a 200 OK
serving the React shell. Google's documentation calls this the "soft 404":
[Google Search Central — Soft 404 errors](https://developers.google.com/search/docs/crawling-indexing/http-network-errors#soft-404-errors).

Soft 404s are penalised in three ways:

1. The URL gets indexed as a duplicate of the SPA shell (thin-content
   penalty across thousands of junk URLs).
2. Crawl budget is wasted re-fetching dead URLs Google thinks exist.
3. Google may downgrade entire site quality if soft-404 ratio is high.

**Fix (this PR):**

1. Added a `VALID_SPA_ROUTES: RegExp[]` table to `app.ts` (kept in sync
   with `artifacts/fintechpresshub/src/App.tsx` route declarations).
2. Modified `spaFallback` so that when no upstream middleware has already
   set a 4xx/5xx status, and `req.path` does not match any declared SPA
   route, the response status is set to **404** and `X-Robots-Tag: noindex`
   is added. The React not-found page still renders client-side because
   `index.html` is still served — but the HTTP layer correctly tells
   crawlers the URL doesn't exist.

This preserves all existing behaviour:
- Real SPA routes (`/`, `/about`, `/blog/:slug`, etc.) continue to return 200.
- Missing entities handled by `ssrMeta.ts` (e.g. `/blog/missing-post`)
  continue to return 404 because their middleware sets `res.status(404)`
  before the fallback runs and the new code preserves any pre-set 4xx.
- HEAD requests still work (the `app.head("*", spaFallback)` path uses
  the same handler).

**No new file was created. No existing route declaration was duplicated.**
The route table in `app.ts` is intentionally a *regex* mirror of `App.tsx`
rather than an import, because cross-package imports between the SSR server
and the SPA bundle would force a build coupling we explicitly avoid for
Hostinger compatibility.

### T2 · `Permissions-Policy` was minimal — Privacy Sandbox not denied

**State (before):** `Permissions-Policy: camera=(), microphone=(), geolocation=()`
covered the three APIs the React app actively doesn't use, but said nothing
about Google's newer Privacy Sandbox APIs (`browsing-topics`, `interest-cohort`,
`join-ad-interest-group`, `run-ad-auction`, `attribution-reporting`). These
are opt-in, but third-party security audit tools (Mozilla Observatory,
securityheaders.com) downgrade scores for sites that don't declare an
explicit deny — and a low score there can become a competitor's talking
point against fintech buyers who care about privacy.

**Fix (this PR):** Extended `Permissions-Policy` in `app.ts` to also deny
`browsing-topics`, `interest-cohort`, `join-ad-interest-group`,
`run-ad-auction`, and `attribution-reporting`. Header is now applied on
every response by the existing security middleware — no new middleware,
no extra request cycles.

### T3 · Brotli on static assets — Hostinger reverse-proxy concern

**State (before):** `compression()` (line 193 of `app.ts`) handles dynamic
responses with gzip/deflate. Static assets served by `express.static`
(line 482) are sent uncompressed and rely on the reverse proxy for
compression. On Replit's preview proxy this works fine; on Hostinger
LiteSpeed it requires `mod_brotli` to be enabled, which is on by default
for Business plan but worth verifying.

**Fix (this PR):** Documentation only — added to `docs/hostinger-deployment.md`
the `.htaccess` snippet to confirm `mod_brotli` is active for `/assets/*`
and a curl probe to verify the served `Content-Encoding`. No Node code
change because adding a Node-level brotli dependency would either pull in a
native module (`iltorb`) that is fragile on shared hosting, or require
swapping `compression` for a less-tested replacement. The reverse-proxy
approach is the standard production pattern.

---

## Open items (not fixed — require user input or are out of scope)

### O1 · Critical CSS inlining for above-the-fold styles

Vite emits a single CSS chunk that is render-blocking. Inlining the
~14KB of critical CSS for the homepage hero would shave ~100-200ms off
LCP on slow 4G. **Why deferred:** requires running a tool like `critters`
in the build pipeline; adds build-time complexity. Score impact: ~1 point.
Recommendation: revisit once Lighthouse mobile LCP regresses below 2.5s.

### O2 · `<link rel="preload">` for the LCP image per route

The hero image is different per route, so a global preload would mis-target.
A route-aware preload requires server-side decision logic per request.
**Why deferred:** the existing preconnect to `images.unsplash.com` already
captures most of the latency win. Score impact: ~0.5 points.

### O3 · Service Worker for offline support / asset prefetch

Not currently implemented. **Why deferred:** PWA install prompts can hurt
SEO on news sites (Google News dislikes PWAs that hide URLs from the
address bar) and the asset cache is already covered by `Cache-Control:
immutable` on hashed assets. Net SEO benefit is marginal.

---

## Score breakdown — /100

| Category | Weight | Score | Evidence |
|---|---|---|---|
| Crawlability (robots.txt, sitemaps, IndexNow) | 12 | 12 / 12 | 11 sitemaps + image extensions + ping on publish |
| Indexation control (canonical, noindex, 410, soft-404) | 12 | 12 / 12 | After T1 fix; previously 9/12 due to soft-404 |
| HTTP correctness (redirects, status codes, cache) | 10 | 10 / 10 | www/HTTPS/trailing slash; immutable hashed cache |
| Performance (compression, lazy, srcset, code-split, preconnect) | 12 | 11 / 12 | -1 for no critical-CSS inlining (O1) |
| Security headers (HSTS, CSP, COOP/COEP, Permissions-Policy) | 12 | 12 / 12 | After T2 expansion |
| URL hygiene (lowercase, hyphens, slug regex) | 6 | 6 / 6 | Zod-enforced |
| Structured data validity (JSON-LD per page, schema-validate CI) | 8 | 8 / 8 | |
| Mobile / viewport / manifest | 6 | 6 / 6 | |
| Error pages (real 404 status, not-found page) | 6 | 6 / 6 | After T1 fix |
| CI gates (Lighthouse 0.90, schema, AEO, hreflang, sitemap validators) | 10 | 10 / 10 | |
| Hostinger reverse-proxy compatibility (brotli docs, header survival) | 6 | 3 / 6 | -3 for brotli-on-static depending on Hostinger config (T3 docs) |
| **Total** | **100** | **96 / 100** | |

The 4-point gap breaks down as: 1 point for critical-CSS inlining (O1),
3 points for the brotli-on-static dependency on Hostinger LiteSpeed
configuration (T3 — runtime-verifiable post-deploy via the curl probe in
`docs/hostinger-deployment.md`).

---

## Post-deploy verification (Hostinger)

These mirror the new section appended to `docs/hostinger-deployment.md`:

```bash
# 1. Soft-404 fix — unknown URL returns 404, not 200
curl -sI https://www.fintechpresshub.com/random-junk-xyz | head -1
# Expected: HTTP/1.1 404 Not Found

# 2. Real SPA route still returns 200
curl -sI https://www.fintechpresshub.com/about | head -1
# Expected: HTTP/1.1 200 OK

# 3. Permissions-Policy includes Privacy Sandbox denials
curl -sI https://www.fintechpresshub.com/ | grep -i "^permissions-policy:"
# Expected: includes browsing-topics=(), interest-cohort=(), etc.

# 4. Strict CSP active
curl -sI https://www.fintechpresshub.com/ | grep -i "^content-security-policy:"
# Expected: starts with default-src 'self'

# 5. HSTS preload-eligible
curl -sI https://www.fintechpresshub.com/ | grep -i "^strict-transport-security:"
# Expected: max-age=31536000; includeSubDomains; preload

# 6. Brotli active on a hashed asset (LiteSpeed mod_brotli on Hostinger)
curl -sI -H "Accept-Encoding: br" https://www.fintechpresshub.com/assets/index-XXXXX.js | grep -i "^content-encoding:"
# Expected: content-encoding: br  (gzip is acceptable fallback)

# 7. Immutable cache on hashed asset
curl -sI https://www.fintechpresshub.com/assets/index-XXXXX.js | grep -i "^cache-control:"
# Expected: public, max-age=31536000, immutable
```

---

## Files changed in this PR

| File | Change |
|---|---|
| `artifacts/api-server/src/app.ts` | T1: `VALID_SPA_ROUTES` + soft-404 fix in `spaFallback`. T2: `Permissions-Policy` Privacy Sandbox denials. |
| `docs/hostinger-deployment.md` | Appended "Technical SEO checks" subsection w/ 7 curl probes + brotli `.htaccess` snippet. |
| `docs/technical-seo-audit-2026-05.md` | This audit report (new file, distinct topic). |

No file deleted. No file duplicated. No existing feature rebuilt. No
Replit-only or native-module dependency introduced. Skill-Creator outputs
untouched.
