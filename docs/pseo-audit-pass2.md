# Programmatic SEO Audit — Pass 2
**Date:** 2026-05-11  
**Auditor:** Agent (second-pass, post-compression)  
**Scope:** Full codebase re-audit after Pass 1 changes; seo-auditor + skill-creator skills active.

---

## Summary

Pass 1 fixed 4 issues. Pass 2 found 4 additional genuine gaps not present or introduced during the first pass. All 4 have been implemented. No existing features were broken.

---

## What Was Already Excellent (Not Touched)

| Area | Status |
|------|--------|
| 10 child sitemaps (pages, blog, tags, authors, locations, glossary, services, tools, compare, news) | ✅ Complete |
| All sitemaps include `<image:image>`, `<xhtml:link hreflang>`, TTL cache, and `lastmod` from DB | ✅ Complete |
| SSR meta injection covers ALL route types (blog, location, glossary, service, author, category, tag, compare, tool, all statics) | ✅ Complete |
| BreadcrumbList JSON-LD on every dynamic and static route | ✅ Complete |
| `article:published_time`, `article:modified_time`, `article:author` on blog posts | ✅ Complete |
| `meta name="author"` on blog posts (added Pass 1) | ✅ Complete |
| `twitter:creator` injected from DB author social data | ✅ Complete |
| Hreflang `en` + `x-default` injected server-side in both HTML and sitemaps | ✅ Complete |
| `og:locale` in index.html (en_US, correct for English-only site) | ✅ Complete |
| RSS: main + per-category + per-author + per-tag feeds | ✅ Complete |
| `llms.txt`, `llms-full.txt`, `ai.txt` / `.well-known/ai.txt` | ✅ Complete |
| IndexNow key + daily ping job | ✅ Complete |
| `Link: <url>; rel="cite-as"` header on all HTML responses | ✅ Complete |
| `Content-Language: en` + `Vary: Accept-Language` headers | ✅ Complete |
| Security headers (HSTS, CSP, CORP, COOP, X-Frame-Options, etc.) | ✅ Complete |
| www → canonical 301 redirect in Express | ✅ Complete |
| Trailing-slash 301 canonicalization | ✅ Complete |
| Dynamic OG image API (`/api/og`) | ✅ Complete |
| FAQPage schema on blog posts, glossary, locations, pricing, compare | ✅ Complete |
| Per-page specific schemas (BlogPosting, ProfilePage, DefinedTerm, SoftwareApplication, LocalBusiness, etc.) | ✅ Complete |
| SpeakableSpecification on blog and glossary pages | ✅ Complete |
| E-E-A-T signals: author sameAs, jobTitle, image in BlogPosting JSON-LD | ✅ Complete |
| WebPage entity alongside all content type schemas | ✅ Complete |
| `HowTo` schema on relevant tool pages | ✅ Complete |
| Tag prerender + tag sitemap (added Pass 1) | ✅ Complete |
| Bot-OG prerender plugin covers all route types | ✅ Complete |

---

## Pass 2 Changes

### Fix 1 — `robots.txt`: blank line inside `User-agent: *` block

**File:** `artifacts/api-server/src/app.ts`

**Problem:**  
The `User-agent: *` block contained blank lines between its `Allow:` and `Disallow:` directives. In the Robots Exclusion Protocol, a blank line terminates a record group. Many crawlers (Bing, Yandex, strict parsers) would interpret the blank lines as ending the `User-agent: *` block, leaving `Allow: /api/og`, `Disallow: /api/`, `Disallow: /admin`, `Disallow: /404`, and `Disallow: /status` as **orphaned directives** belonging to no agent — effectively making them no-ops. This would allow crawlers to index `/api/` routes.

**Fix:**  
Removed all blank lines from within the `User-agent: *` block. Comments are preserved (they do not end records). The block now forms a single continuous group from `User-agent: *` through `Disallow: /status`.

**Before:**
```
User-agent: *
Allow: /

# Dynamic OG image API — allow so social crawlers and Google Images
# can validate og:image tags. Must come before the broader /api/ Disallow.
Allow: /api/og

# Internal API — never index
Disallow: /api/
...
```

**After:**
```
User-agent: *
Allow: /
# Dynamic OG image API — allow so social crawlers and Google Images
# can validate og:image tags. Must come before the broader /api/ Disallow.
Allow: /api/og
# Internal API — never index
Disallow: /api/
# Admin dashboard — never index
Disallow: /admin
...
```

---

### Fix 2 — Font: restore `rel="preload"` for Inter CSS

**File:** `artifacts/fintechpresshub/index.html`

**Problem:**  
Pass 1 correctly removed duplicate font preload links. However, the fix over-corrected by leaving **zero** `rel="preload"` hints. The recommended async font pattern requires **both**:
1. `<link rel="preload" as="style">` — tells the browser to start downloading the font CSS during head parsing, before stylesheet evaluation
2. `<link rel="stylesheet" media="print" onload="this.media='all'">` — loads the font non-blocking once the preload completes

Without the preload hint, the browser only discovers the font URL after the `media="print"` stylesheet fires, which is one render cycle later. This delays First Contentful Paint on slow connections.

**Fix:**  
Added back exactly ONE `<link rel="preload" as="style">` pointing to the same Inter URL, positioned above the non-blocking stylesheet.

**Added:**
```html
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
```

---

### Fix 3 — Organization schema: add `inLanguage` in `index.html`

**File:** `artifacts/fintechpresshub/index.html`

**Problem:**  
The site-wide Organization @graph in index.html lacked an `inLanguage` property. The identical Organization entity in `bot-og-plugin.mjs` (used for build-time prerendering) already had `inLanguage: "en-US"`. Google's Knowledge Graph and AI crawlers use `inLanguage` on an Organization to determine which language variant to associate content with. Missing it from the canonical HTML shell means runtime SSR responses and build-time prerendered pages would produce structurally different Organization entities.

**Fix:**  
Added `"inLanguage": "en"` to the Organization entity in the @graph. Used `"en"` (BCP-47) rather than `"en-US"` for consistency with all other `inLanguage` values across the codebase.

**Added line:**
```json
"inLanguage": "en",
```

---

### Fix 4 — Organization description mismatch between `index.html` and `bot-og-plugin.mjs`

**File:** `artifacts/fintechpresshub/scripts/bot-og-plugin.mjs`

**Problem:**  
The Organization `description` differed between:
- `index.html` (runtime): `"Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands."`
- `bot-og-plugin.mjs` (build-time prerender): `"Specialized content marketing and SEO agency for fintech companies."`

The shorter description is a placeholder from initial scaffolding and was never updated. Google's entity resolution merges these into one Organization entity — when the descriptions differ, the Knowledge Graph has conflicting signals for the same `@id`. This weakens entity authority and can cause inconsistent brand Knowledge Panels.

Additionally, `inLanguage` in bot-og-plugin.mjs was `"en-US"` (locale code) while all other inLanguage values in the codebase use `"en"` (BCP-47 language tag). Unified to `"en"`.

**Fix:**  
Updated `bot-og-plugin.mjs` to use the authoritative description from index.html, and changed `inLanguage` from `"en-US"` to `"en"`.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/api-server/src/app.ts` | robots.txt: removed blank lines inside `User-agent: *` block |
| `artifacts/fintechpresshub/index.html` | Re-added single font preload; added `inLanguage` to Organization |
| `artifacts/fintechpresshub/scripts/bot-og-plugin.mjs` | Aligned Organization description and `inLanguage` with index.html |

---

## Verification

- `pnpm run build` (api-server): ✅ Clean — 3.0mb bundle, no errors
- `pnpm run typecheck` (workspace): ✅ Clean — all 4 packages pass
- `curl /robots.txt` live server: ✅ `User-agent: *` block has no blank lines; all Disallow directives properly grouped
- `index.html` diff: ✅ One preload + one non-blocking stylesheet; `inLanguage` present in Organization

---

## Complete Pass 1 + Pass 2 Change Log

| Pass | Fix | File | What |
|------|-----|------|------|
| 1 | Remove duplicate font preload | `index.html` | Had two identical `rel="preload"` for Inter — removed one |
| 1 | Remove `maximum-scale=1` from viewport | `index.html` | Was restricting user zoom (accessibility + ranking signal) |
| 1 | Add `getAllTags`/`loadTags` to bot-og-plugin | `bot-og-plugin.mjs`, `prerender.mjs` | Tag pages were not prerendered at build time |
| 1 | Add `meta name="author"` for blog posts | `ssrMeta.ts` | Missing authorship signal for Googlebot |
| 2 | Fix blank lines in `User-agent: *` robots.txt block | `app.ts` | Orphaned directives; `Disallow: /api/` was effectively a no-op |
| 2 | Restore one font `rel="preload"` | `index.html` | Pass 1 over-corrected; zero preloads left font discovery delayed |
| 2 | Add `inLanguage` to Organization in index.html | `index.html` | Missing from site-wide @graph; present in bot-og plugin but not HTML shell |
| 2 | Align Organization description + `inLanguage` in bot-og-plugin | `bot-og-plugin.mjs` | Placeholder description; `en-US` vs `en` inconsistency |

---

## Remaining Recommendations (Not Implemented — No Code Change Required)

These are operational/content tasks, not code gaps:

1. **Google Search Console verification** — The GSC meta tag is commented out in `index.html`. Replace `REPLACE_WITH_YOUR_GSC_VERIFICATION_TOKEN` and uncomment when verifying ownership after Hostinger deployment.

2. **IndexNow key** — Set `INDEXNOW_KEY` environment variable on Hostinger. The infrastructure is already in place; it simply needs the key value.

3. **`STATIC_PAGE_LASTMOD` and `STATIC_PAGE_CREATED` dates** — Keep these updated in `ssrMeta.ts` whenever static page content changes, so Google's freshness signal stays accurate.

4. **News sitemap window** — Currently covers the last 48 hours. If post cadence drops below one per two days, the news sitemap will occasionally be empty — acceptable behaviour, no code change needed.
