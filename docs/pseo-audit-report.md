# FintechPressHub — Exhaustive Programmatic SEO Audit Report

**Date:** 2026-05-11
**Auditor:** Replit Agent (pSEO specialist — Pass 3, exhaustive)
**Scope:** All SEO infrastructure files — ssrMeta.ts (2496 lines), bot-og-plugin.mjs (1298 lines), sitemapIndex.ts, sitemap.ts, llmsTxt.ts, rss.ts, newsSitemap.ts, seoConstants.ts, app.ts, index.html
**Build target:** Hostinger Node.js Business Plan (single `node dist/index.mjs`)

---

## Executive Summary

Three exhaustive audit passes have been completed across the entire pSEO stack. The site has a highly mature SEO infrastructure with full SSR meta injection via a dual-system (Express middleware + Vite build-time plugin), a 10-child sitemap index, per-entity RSS feeds, llms.txt / llms-full.txt, AEO-optimised schemas, and comprehensive breadcrumb/entity graph coverage.

This report is the canonical record of every gap found across all three passes and confirms implementation status for each item.

---

## Infrastructure Architecture

| Component | Location | Purpose |
|---|---|---|
| SSR meta middleware | `api-server/src/middlewares/ssrMeta.ts` | Injects title, canonical, OG, LD+JSON into served HTML for Googlebot / crawlers in production |
| Build-time bot plugin | `fintechpresshub/scripts/bot-og-plugin.mjs` | Identical meta injection for Vite dev-mode bot requests and build-time prerender |
| Sitemap index | `api-server/src/routes/sitemapIndex.ts` | 10-child sitemap index: pages, blog, tags, authors, locations, glossary, tools, compare, services, news |
| Legacy sitemap | `api-server/src/routes/sitemap.ts` | `STATIC_ROUTES` array for `/sitemap.xml` and link-checker |
| LLMs.txt | `api-server/src/routes/llmsTxt.ts` | `/llms.txt` and `/llms-full.txt` for AI crawler discoverability |
| RSS feeds | `api-server/src/routes/rss.ts` | Main feed + per-author + per-category + per-tag autodiscovery |
| News sitemap | `api-server/src/routes/newsSitemap.ts` | Google News sitemap (`/news-sitemap.xml`) for article freshness signals |
| SEO constants | `api-server/src/lib/seoConstants.ts` | Single source of truth for slugs, labels, lastmod dates, BREADCRUMB_LABELS (server copy) |
| Global shell | `fintechpresshub/index.html` | Organization + WebSite @graph, OG, Twitter Card, non-blocking font loading, robots meta |
| Security/AEO headers | `api-server/src/app.ts` | HSTS, CSP, `cite-as` Link header on all pages |

---

## All Findings Across Three Audit Passes

### Pass 1 — Initial Audit

| ID | File | Finding | Severity | Status |
|---|---|---|---|---|
| P1-01 | `ssrMeta.ts` | Category hub itemListElement limit was 20 — insufficient for large categories | Medium | **Fixed** — raised to 50 |
| P1-02 | `ssrMeta.ts` | `isPartOf` on CollectionPage/WebPage schemas missing `@type` field throughout | Medium | **Fixed** — `@type: "WebPage"` added to all isPartOf objects |
| P1-03 | `ssrMeta.ts` | `numberOfItems` missing from locations, press mentions, blog hub, authors hub, services hub, homepage services, category pages ItemLists | High | **Fixed** — added to all affected ItemLists |
| P1-04 | `ssrMeta.ts` | Location pages missing `geo.placename` + `geo.region` HTML meta head tags | Medium | **Fixed** — `headLinks` with geo meta added to location page SSR patches |
| P1-05 | `bot-og-plugin.mjs` | Local `BREADCRUMB_LABELS` copy missing `tag` and `category` entries — breadcrumb inconsistency between dev and prod | Medium | **Fixed** — both entries added |

### Pass 2 — Deep Re-Audit

| ID | File | Finding | Severity | Status |
|---|---|---|---|---|
| P2-01 | `ssrMeta.ts` | Author ProfilePage `knowsAbout` array missing | Medium | **Fixed** |
| P2-02 | `ssrMeta.ts` | Glossary DefinedTerm missing `inDefinedTermSet` back-reference | Medium | **Fixed** |
| P2-03 | `ssrMeta.ts` | Service ProfessionalService missing `areaServed` | Low | **Fixed** |
| P2-04 | `ssrMeta.ts` | Blog post Article schema missing `speakable` CSS selectors | Low | **Fixed** |

### Pass 3 — Exhaustive Re-Audit (This Session)

| ID | File | Finding | Severity | Status |
|---|---|---|---|---|
| P3-01 | `ssrMeta.ts` | `/pricing` ItemList missing `numberOfItems` | Medium | **Fixed** — `numberOfItems: pricingList.length` |
| P3-02 | `ssrMeta.ts` | `/glossary` hub ItemList missing `numberOfItems` | Medium | **Fixed** — `numberOfItems: hubTerms.length` |
| P3-03 | `ssrMeta.ts` | `/tools` hub ItemList missing `numberOfItems` | Medium | **Fixed** — `numberOfItems: Object.keys(TOOLS_META).length` |
| P3-04 | `ssrMeta.ts` | `/compare` hub ItemList missing `numberOfItems` | Medium | **Fixed** — `numberOfItems: Object.keys(COMPARISON_META).length` |
| P3-05 | `bot-og-plugin.mjs` | `itemListSchema()` shared helper missing `numberOfItems` — all services/authors/blog prerender pages affected | High | **Fixed** — `numberOfItems: items.length` added to helper |
| P3-06 | `bot-og-plugin.mjs` | Category CollectionPage `isPartOf` had bare `@id` without `@type: "WebPage"` — inconsistent with ssrMeta.ts | Medium | **Fixed** — `@type: "WebPage"` added |
| P3-07 | `bot-og-plugin.mjs` | Location page `@type: "LocalBusiness"` missing `"ProfessionalService"` co-type present in ssrMeta.ts | Medium | **Fixed** — changed to `["LocalBusiness", "ProfessionalService"]` |

---

## Confirmed Clean — No Gaps Found

| Area | Verdict |
|---|---|
| `index.html` Organization + WebSite @graph | Complete — SearchAction, logo ImageObject, knowsAbout (20 topics), sameAs, Wikidata |
| `index.html` font loading | Correct — preconnect → preload → `media="print"` non-blocking pattern |
| `index.html` robots meta | `max-snippet:-1, max-image-preview:large, max-video-preview:-1` |
| `index.html` RSS + sitemap autodiscovery links | Both present |
| 10-child sitemap index | All children implemented: pages, blog, tags, authors, locations, glossary, tools, compare, services, news |
| `sitemap-tags.xml` | DB-driven from `blog_posts.tags` JSONB — no manual slug maintenance needed |
| News sitemap | Last 48 h posts, Google News namespace, `<news:publication_date>` |
| Per-tag RSS feed + autodiscovery | Implemented — `<link rel="alternate">` in SSR patches for tag pages |
| Per-category RSS feed + autodiscovery | Implemented — `<link rel="alternate">` in category page SSR patches |
| `llms.txt` + `llms-full.txt` | Both served — DB-dynamic blog, glossary, locations, authors sections |
| `robots.txt` | Dynamic, env-aware, allows beneficial AI bots explicitly, IndexNow endpoint advertised |
| `cite-as` Link header | Applied globally in `app.ts` and per-page in `ssrMeta.ts` |
| HSTS + CSP + security headers | All present in `app.ts`, CSP production-only |
| CORS | Restricted to `SITE_URL` in production |
| `hreflang` in sitemaps | All child sitemaps include `hreflang="en"` and `hreflang="x-default"` entries |
| Blog post Article schema | Complete — headline, author (@id), publisher, dates, speakable, isPartOf, image |
| Author ProfilePage schema | Complete — knowsAbout, jobTitle, sameAs (LinkedIn/Twitter), numberOfArticlesWritten, worksFor |
| Glossary DefinedTerm schema | Complete — termCode, inDefinedTermSet, description, url |
| Service ProfessionalService schema | Complete — areaServed, serviceType, offers with PriceSpecification |
| Location LocalBusiness + ProfessionalService | Complete in both ssrMeta.ts and bot-og-plugin.mjs after P3-07 fix |
| Compare FAQPage | Complete — primary question + COMPARE_FAQ_EXTRAS per slug |
| Tools SoftwareApplication + HowTo | Complete — HowTo steps where available, Offer price:0, UseAction |
| BreadcrumbList on all routes | Consistent — `buildCrumbsForPath` used across all dynamic + static handlers |
| `BREADCRUMB_LABELS` three-way sync | seoConstants.ts ↔ metaData.ts ↔ bot-og-plugin.mjs all include `tag`, `category`, `blog`, `compare`, `tools`, `locations`, `glossary`, `authors`, `services` |
| `STATIC_ROUTES` in sitemap.ts | All static pages present; compare/tool sub-pages correctly excluded (covered by child sitemaps) |
| `STATIC_META` in ssrMeta.ts | All 20 static routes present including legal pages and resource pages |
| `STATIC_PAGE_LASTMOD` | All routes have explicit lastmod dates |
| `STATIC_PAGE_CREATED` | All routes have explicit creation dates for `datePublished` |
| Pricing FAQPage | Present — featured snippet eligibility on pricing queries |
| Homepage WebPage + services ItemList | Present — crawler classification without JS |
| `/about` AboutPage + employee list | Present — DB-backed employee array for E-E-A-T |
| `/contact` ContactPage + contactPoint | Present |
| `/write-for-us` WriteAction | Present |
| `/press` CollectionPage + NewsArticle ItemList | Present — DB-backed press mentions with `about: @organization` |
| HTTP compression | gzip/deflate via `compression()` middleware |
| In-memory sitemap TTL cache | 5-min TTL, `stale-while-revalidate=86400` |
| In-memory SSR meta cache | 60-second TTL on all dynamic routes, cleared by `invalidateSsrMetaCache()` |
| IndexNow pings | Implemented on blog post publish/update |
| AEO health check | Passes on all 61 page files (`pnpm --filter @workspace/scripts run aeo:check`) |

---

## Schema Coverage Matrix (Final State After All Passes)

| Page Type | Primary Schema | Secondary Schemas | BreadcrumbList | numberOfItems |
|---|---|---|---|---|
| Homepage `/` | WebPage | ItemList (services) | No (root) | ✅ |
| `/about` | AboutPage | employee[] | ✅ | n/a |
| `/services` | CollectionPage | ItemList | ✅ | ✅ |
| `/services/:slug` | ProfessionalService | WebPage | ✅ | n/a |
| `/pricing` | WebPage | ItemList (plans), FAQPage | ✅ | ✅ |
| `/blog` | CollectionPage | ItemList (posts) | ✅ | ✅ |
| `/blog/:slug` | Article | WebPage, Person (author) | ✅ | n/a |
| `/blog/category/:slug` | CollectionPage | ItemList | ✅ | ✅ |
| `/blog/tag/:slug` | CollectionPage | ItemList | ✅ | ✅ |
| `/authors` | CollectionPage | ItemList | ✅ | ✅ |
| `/authors/:slug` | ProfilePage | Person | ✅ | n/a |
| `/glossary` | DefinedTermSet | ItemList | ✅ | ✅ |
| `/glossary/:slug` | DefinedTerm | WebPage | ✅ | n/a |
| `/locations` | CollectionPage | ItemList | ✅ | ✅ |
| `/locations/:slug` | LocalBusiness + ProfessionalService | WebPage | ✅ | n/a |
| `/tools` | CollectionPage | ItemList | ✅ | ✅ |
| `/tools/:slug` | SoftwareApplication | HowTo, WebPage | ✅ | n/a |
| `/compare` | CollectionPage | ItemList | ✅ | ✅ |
| `/compare/:slug` | FAQPage | WebPage | ✅ | n/a |
| `/press` | CollectionPage | ItemList (NewsArticle) | ✅ | ✅ |
| `/contact` | ContactPage | Organization contactPoint | ✅ | n/a |
| `/write-for-us` | CollectionPage | WriteAction | ✅ | n/a |
| `/resources/fintech-publications` | CollectionPage | ItemList | ✅ | ✅ |

---

## Sitemap Index — 10 Children (Final State)

| Child | Route | Content | Image entries | hreflang |
|---|---|---|---|---|
| pages | `/sitemap-pages.xml` | All STATIC_ROUTES | ✅ | ✅ |
| blog | `/sitemap-blog.xml` | All published non-noIndex posts | ✅ cover images | ✅ |
| tags | `/sitemap-tags.xml` | All unique tags from `blog_posts.tags` JSONB | ✅ OG card | ✅ |
| authors | `/sitemap-authors.xml` | All author profiles | ✅ avatar | ✅ |
| locations | `/sitemap-locations.xml` | All location pages from DB | ✅ OG card | ✅ |
| glossary | `/sitemap-glossary.xml` | All glossary terms from DB | ✅ OG card | ✅ |
| tools | `/sitemap-tools.xml` | All tool pages from TOOL_SLUGS | ✅ OG card | ✅ |
| compare | `/sitemap-compare.xml` | All comparison pages from COMPARE_SLUGS | ✅ OG card | ✅ |
| services | `/sitemap-services.xml` | All services from DB (fallback: SERVICE_SLUGS) | ✅ OG card | ✅ |
| news | `/news-sitemap.xml` | Posts published in last 48 h | — | — |

---

## Dual SSR System Sync Status

`ssrMeta.ts` = production Googlebot path. `bot-og-plugin.mjs` = Vite dev bots + build-time prerender.

| Property | ssrMeta.ts | bot-og-plugin.mjs | Sync Status |
|---|---|---|---|
| Location `@type` | `["LocalBusiness", "ProfessionalService"]` | `["LocalBusiness", "ProfessionalService"]` | ✅ Synced (P3-07) |
| Category `isPartOf` | `{ "@type": "WebPage", "@id": url }` | `{ "@type": "WebPage", "@id": url }` | ✅ Synced (P3-06) |
| ItemList `numberOfItems` | All present | All present via helper | ✅ Synced (P3-05) |
| BREADCRUMB_LABELS `tag` + `category` | Present | Present | ✅ Synced (P1-05) |
| BreadcrumbList on all dynamic routes | All routes | All routes | ✅ Synced |

---

## Infrastructure Files Modified By This Audit

| File | Changes |
|---|---|
| `artifacts/api-server/src/middlewares/ssrMeta.ts` | `numberOfItems` added to `/pricing`, `/glossary`, `/tools`, `/compare` ItemLists (Pass 3); `numberOfItems` on locations hub, press mentions, blog hub, authors hub, services hub, homepage services, category pages (Pass 1); `@type: "WebPage"` on all `isPartOf` objects; geo meta headLinks on location pages; category hub limit raised to 50; author knowsAbout; glossary inDefinedTermSet; service areaServed; blog speakable |
| `artifacts/fintechpresshub/scripts/bot-og-plugin.mjs` | `numberOfItems: items.length` in `itemListSchema()` helper (P3-05); `@type: "WebPage"` on category `isPartOf` (P3-06); location `@type` changed to `["LocalBusiness", "ProfessionalService"]` (P3-07); `tag` and `category` added to BREADCRUMB_LABELS (P1-05) |

---

## Key Architecture Notes

- **SSR meta is production-only** by default — activated by `NODE_ENV=production` or `SSR_META_DEV=1`.
- **SSR meta cache TTL** — 60 s per route slug. `invalidateSsrMetaCache()` called after admin publish.
- **Sitemap cache TTL** — 5 min. `invalidateSitemapCache()` called after content changes.
- **Dual-path probe** — `ssrMeta.ts` resolves the frontend dist by probing both `../../fintechpresshub/dist/public` (Replit) and `../../../fintechpresshub/dist/public` (Hostinger). Works on both without env config.
- **Prerender** — `scripts/prerender.mjs` runs after `vite build`. Tags, locations, and glossary terms fetched from API at build time. Falls back to empty list on unreachable API.
- **IndexNow** — pings Bing + Yandex on every publish/update via `api-server/src/routes/indexNow.ts`.
- **No Replit-only dependencies** in any production code path — safe to deploy to Hostinger.

---

## Hostinger Deploy Checklist

```bash
# 1. Build API server
pnpm --filter @workspace/api-server run build

# 2. Build frontend (runs vite build + prerender.mjs)
pnpm --filter @workspace/fintechpresshub run build

# 3. On Hostinger: upload dist folders, set env vars, restart Node process
#    Required env vars: DATABASE_URL, SITE_URL, NODE_ENV=production
#    Optional: OBJECT_STORAGE_URL (for cover image serving)
```
