# Programmatic SEO Audit — Pass 3

**Date:** 2026-05-11
**Auditor:** Agent (Pass 3 of 3)
**Scope:** Full codebase audit — all SSR routes, sitemaps, JSON-LD schemas, AI/LLM signals, robots governance, font loading, canonical/hreflang, E-E-A-T, prerender coverage.

---

## Summary

Pass 3 found **4 issues** — all fixable, none breaking. Two relate to language-tag consistency that Pass 2 partially fixed but did not fully propagate. Two relate to AI/LLM discoverability completeness (`llms.txt` / `ai.txt`).

All 4 fixes were implemented in this pass.

---

## Findings & Fixes

### Issue 9 — `inLanguage: "en-US"` in client-side `ORGANIZATION_SCHEMA` (metaData.ts)

**Severity:** Low-Medium  
**File:** `artifacts/fintechpresshub/src/lib/metaData.ts`, line 78

**Problem:**  
Pass 2 corrected `bot-og-plugin.mjs` (the prerender/server-side Organization entity) from `"en-US"` to `"en"`, and added `inLanguage: "en"` to `index.html`. However, `metaData.ts` exports an `ORGANIZATION_SCHEMA` constant used by client-side React components — it still had `inLanguage: "en-US"`. 

The audit notes in `SKILL.md` explicitly state: *"Use BCP-47 `"en"` (not `"en-US"`) for `inLanguage` across all JSON-LD throughout the codebase."* When JavaScript executes in a browser (or a JS-capable crawler), the React-rendered Organization entity would emit `"en-US"` while the SSR-injected entity emits `"en"` — conflicting representations of the same `@id` entity that can confuse Google's Knowledge Graph entity resolution.

**Fix applied:**  
Changed `inLanguage: "en-US"` → `inLanguage: "en"` in `ORGANIZATION_SCHEMA` in `artifacts/fintechpresshub/src/lib/metaData.ts`.

---

### Issue 10 — `llms-full.txt` reports "(9 child sitemaps)" — actual count is 10

**Severity:** Low  
**File:** `artifacts/api-server/src/routes/llmsTxt.ts`, line 462

**Problem:**  
The `/llms-full.txt` "Sitemaps and feeds" section stated:  
`Sitemap index: ${siteUrl}/sitemap_index.xml (9 child sitemaps)`

The actual `buildSitemapIndexXml()` function in `sitemapIndex.ts` emits 10 child sitemaps:
- sitemap-pages.xml
- sitemap-blog.xml
- sitemap-tags.xml
- sitemap-authors.xml
- sitemap-locations.xml
- sitemap-glossary.xml
- sitemap-services.xml
- sitemap-tools.xml
- sitemap-compare.xml
- news-sitemap.xml

AI crawlers that parse `/llms-full.txt` to understand the site's crawl architecture receive incorrect metadata, which can lead to incomplete indexing or misrepresentation in AI-generated answers about the site.

**Fix applied:**  
Changed `(9 child sitemaps)` → `(10 child sitemaps)` in `llmsTxt.ts`.

---

### Issue 11 — `ai.txt` declares `LlmsTxt` but not `LlmsFullTxt`

**Severity:** Low  
**File:** `artifacts/api-server/src/app.ts`, line 361

**Problem:**  
The `/.well-known/ai.txt` governance declaration included:  
```
LlmsTxt: https://www.fintechpresshub.com/llms.txt
```
But did not include the companion extended index at `/llms-full.txt`. AI agents that read `ai.txt` to discover machine-readable content files only learn about the compact summary — they cannot discover the richer 50-post, full-biography, full-glossary version at `/llms-full.txt` unless they independently probe for it.

**Fix applied:**  
Added `LlmsFullTxt: ${siteUrl}/llms-full.txt` immediately after the `LlmsTxt:` line in the `ai.txt` response in `app.ts`.

---

### Issue 12 — `/llms.txt` body has no pointer to the companion `/llms-full.txt`

**Severity:** Low  
**File:** `artifacts/api-server/src/routes/llmsTxt.ts`

**Problem:**  
The llmstxt.org specification recommends that the compact `/llms.txt` file include an "Optional" section listing companion files — in particular the full extended index — so AI crawlers that only read `/llms.txt` know a richer version exists. Without this, crawlers that don't separately probe `/llms-full.txt` get incomplete context and may hallucinate or under-represent the site's content depth.

**Fix applied:**  
Added an `## Optional` section at the bottom of the `/llms.txt` output body:
```markdown
## Optional

- [Full content index](https://www.fintechpresshub.com/llms-full.txt): Extended version with fuller
  blog excerpts, complete glossary definitions, full author bios, and complete tool descriptions —
  for AI systems that need richer context.
```

---

## Areas confirmed clean in Pass 3 (no action needed)

| Area | Status |
|---|---|
| Font loading pattern (`rel="preload"` + `media="print"` + `<noscript>`) | ✅ Correct — one preload, one stylesheet, one noscript |
| `robots.txt` `User-agent: *` block — no blank lines within | ✅ Fixed Pass 2, verified clean |
| Organization `inLanguage` in `index.html` | ✅ `"en"` — correct |
| Organization `inLanguage` in `bot-og-plugin.mjs` | ✅ `"en"` — correct |
| Organization `inLanguage` in `ssrMeta.ts` (all pages) | ✅ `"en"` throughout (26 occurrences) |
| `og:locale` content in `index.html` | ✅ `en_US` — correct OG locale, no per-page patching needed |
| `hreflang="en"` + `hreflang="x-default"` in all 10 child sitemaps | ✅ Present on every `<url>` entry |
| `hreflang` self-referential `<link>` in SSR HTML head | ✅ Injected by `patchHtml` for every SSR route |
| `<meta name="author">` on blog posts | ✅ Added Pass 1 |
| `BreadcrumbList` on all covered routes | ✅ Emitted by `buildBreadcrumbLd()` — all non-homepage routes |
| `SpeakableSpecification` on blog posts + glossary terms | ✅ Conditional on `blufSummary` existing |
| `news-sitemap.xml` — `<news:publication>`, `<news:publication_date>`, `<news:title>` | ✅ All required fields present |
| `sitemap_index.xml` includes all 10 child sitemaps | ✅ All 10 listed (matches SKILL.md architecture table) |
| `ai.txt` `LlmsTxt:` field present | ✅ Was already present; `LlmsFullTxt:` added this pass |
| `Link: cite-as` header on all SSR responses | ✅ Emitted in both `ssrMeta.ts` and `app.ts` cite-as middleware |
| `Content-Language: en` + `Vary: Accept-Language` on HTML responses | ✅ Applied in `app.ts` middleware |
| Admin routes — `X-Robots-Tag: noindex, nofollow` header | ✅ Applied in `app.ts` |
| Trailing-slash → canonical 301 redirect | ✅ Present in `app.ts` |
| www → non-www 301 (canonical is `www.`) | ✅ Correct — non-www redirects to www |
| `E-E-A-T` signals — author `sameAs`, `knowsAbout`, `award`, photo | ✅ All included in SSR `ssrMeta.ts` author handler |
| `isAccessibleForFree`, `accessMode` on BlogPosting | ✅ Present |
| `datePublished` / `dateModified` on all WebPage entities | ✅ Present via `STATIC_PAGE_CREATED` / `STATIC_PAGE_LASTMOD` maps |
| `llms-full.txt` — 50 posts, full glossary, full bios, all tools | ✅ Confirmed |
| `BREADCRUMB_LABELS` duplication between packages | ✅ Intentional by design |
| `og:image:type`, `og:image:width`, `og:image:height` patching | ✅ Dynamic resolution via `resolveOgImageType()` |

---

## Cumulative changes across all 3 passes

| # | Issue | Pass | File(s) changed |
|---|---|---|---|
| 1 | Duplicate font preload | 1 | `index.html` |
| 2 | `maximum-scale=1` in viewport | 1 | `index.html` |
| 3 | `/blog/tag/:slug` missing from prerender | 1 | `bot-og-plugin.mjs`, `prerender.mjs` |
| 4 | `<meta name="author">` missing on blog posts | 1 | `ssrMeta.ts` |
| 5 | `robots.txt` blank line inside `User-agent: *` block | 2 | `app.ts` |
| 6 | Zero font preloads after Pass 1 over-correction | 2 | `index.html` |
| 7 | Organization `inLanguage` absent in `index.html` @graph | 2 | `index.html` |
| 8 | Organization `description` + `inLanguage` mismatch in `bot-og-plugin.mjs` | 2 | `bot-og-plugin.mjs` |
| 9 | `inLanguage: "en-US"` in `metaData.ts` `ORGANIZATION_SCHEMA` | 3 | `metaData.ts` |
| 10 | `llms-full.txt` reports "(9 child sitemaps)" — actual count 10 | 3 | `llmsTxt.ts` |
| 11 | `ai.txt` missing `LlmsFullTxt:` declaration | 3 | `app.ts` |
| 12 | `/llms.txt` body missing `## Optional` pointer to `/llms-full.txt` | 3 | `llmsTxt.ts` |
