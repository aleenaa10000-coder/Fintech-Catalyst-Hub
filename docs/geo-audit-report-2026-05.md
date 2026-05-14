# GEO (Generative Engine Optimization) Audit — FintechPressHub

**Audit date:** 2026-05-14
**Scope:** Whole monorepo (`artifacts/api-server`, `artifacts/fintechpresshub`, `scripts`, root config)
**Methodology:** Static code review + live HTTP probes against the running dev server
**Hosting target:** Hostinger Business plan (Node.js)
**Distinction from prior reports:** This audit is *generative*-engine focused (ChatGPT Search, Perplexity, Claude, Gemini, Google AI Overviews citation). It deliberately does **not** re-cover material from `docs/aeo-audit-report-2026-05.md` (answer-engine markup) or `docs/seo-upgrade-roadmap.md` (classic SEO).

---

## Executive summary

**Overall GEO score: 92 / 100.**

The project is in the top decile of GEO maturity for a content site. The
heavy lifting — `llms.txt` + `llms-full.txt`, AI-bot allow/disallow lists,
a comprehensive `@graph` of structured data, E-E-A-T signals (author
profiles with `sameAs`/`knowsAbout`, editorial-guidelines policy URLs,
Wikidata entity link), `dateModified`/`lastmod` freshness, `Speakable`
schema, `BLUF` summaries, definition lists, and a static-page AEO
health-check — is already shipped. There is no need to "build" GEO from
scratch.

The remaining gap (the missing 8 points) is concentrated in three
*small* enhancements that improve discoverability of the existing
`llms.txt` artefacts and tighten one Hostinger-portability rough edge.
Everything in this report is implementable without duplicating existing
files or rebuilding working features.

### Top wins (already in)

| Signal | Where | Strength |
|---|---|---|
| Allow-list of beneficial AI bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, meta-externalagent, DuckAssistBot, YouBot, Amazonbot) | `artifacts/api-server/src/app.ts:237-280` | Excellent |
| Block-list of training-only scrapers (GPTBot, CCBot, anthropic-ai, cohere-ai, Bytespider, Diffbot, DataForSeoBot) | `artifacts/api-server/src/app.ts:280-310` | Excellent |
| `/llms.txt` + `/llms-full.txt` per llmstxt.org spec | `artifacts/api-server/src/routes/llmsTxt.ts` | Best-in-class |
| Site-wide `@graph` (NewsMediaOrganization + WebSite + Wikidata `sameAs`) | `artifacts/fintechpresshub/index.html:101-148` | Excellent |
| Dual-typed `["BlogPosting", "NewsArticle"]` for blog posts | `artifacts/api-server/src/middlewares/ssrMeta.ts:1480` | Excellent |
| `Person` schema with `sameAs` (LinkedIn/Twitter/website) on every author | `ssrMeta.ts:1517`, `ssrMeta.ts:2209` | Excellent |
| `Speakable` selectors on home, contact, write-for-us, blog, services, tools | `ssrMeta.ts` (multiple) | Excellent |
| `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">` survives on every SSR page (ssrMeta only replaces title/description/og:*) | `index.html:62`, verified against `ssrMeta.ts:220-240` replace logic | Excellent |
| AEO health-check script (`pnpm aeo:check`) gates `MISSING_META`, `RAW_HELMET`, `RAW_JSONLD`, `STALE_DATE`, `MISSING_SSR_FIELD` | `scripts/src/aeo-health-check.ts` | Excellent |
| `BLUF` summaries (`post.blufSummary`), Table of Contents (`BlogPostToc`), definition lists for stats | `blog-post.tsx:733-770, 847, 945` | Excellent |
| `dateModified` in JSON-LD + `lastmod` in every child sitemap | `ssrMeta.ts:1474`, `sitemapIndex.ts:127-136` | Excellent |
| Replit-only services gated behind `REPL_ID` so the server boots cleanly on Hostinger | `auth.ts:42`, `objectStorage.ts:20` | Good |

---

## Audit findings — every signal, ruthlessly enumerated

### 1. AI-bot crawlability — robots.txt

**State:** Strong. `app.ts:237-310` serves a dynamic `robots.txt` that explicitly enumerates 10 beneficial AI agents (Allow) and 7 training-only scrapers (Disallow), plus Sitemap declarations for `sitemap_index.xml`, legacy `sitemap.xml`, and `news-sitemap.xml`.

**Gap (minor):** No discovery hint for `/llms.txt` or `/llms-full.txt` inside `robots.txt`. The llmstxt.org community convention (still emerging) is to reference these files alongside `Sitemap:` lines so AI crawlers can discover them in a single fetch instead of guessing the path.

**Fix (this PR):** Append `# LLM-Content:` comment lines and treat `/llms.txt` + `/llms-full.txt` as additional discovery references inside the existing `robots.txt` handler. No new file, no route change.

---

### 2. llms.txt + llms-full.txt

**State:** Best-in-class. `artifacts/api-server/src/routes/llmsTxt.ts:25-293` serves `/llms.txt` with site overview, services, pricing, recent authors and posts; `:314-650` serves `/llms-full.txt` with the extended index (full glossary, service FAQs, complete tool descriptions). Both use `text/plain; charset=utf-8` with a 1-hour cache and `stale-while-revalidate=86400`.

**Gap (minor):** HTML pages do not advertise the existence of these artefacts via an HTTP `Link:` header. AI crawlers that already have the HTML in hand cannot easily learn that a higher-fidelity Markdown version exists at the same origin.

**Fix (this PR):** When the SSR middleware serves the patched `index.html`, emit a `Link: </llms.txt>; rel="alternate"; type="text/plain"` HTTP response header. This is a one-liner in the existing middleware — no new file.

---

### 3. Structured data / JSON-LD coverage

**State:** Comprehensive. Inventory of types currently emitted per route:

| Route family | Schema types | Source |
|---|---|---|
| Site-wide `@graph` | `NewsMediaOrganization`, `WebSite` (with `SearchAction`), `sameAs` to Twitter, LinkedIn, Crunchbase, **Wikidata Q130531885** | `index.html:101-148` |
| `/` | `WebPage` + `ItemList` (services) + `AggregateRating` (live testimonials) + `BreadcrumbList` | `ssrMeta.ts:3438+` |
| `/blog/:slug` | `["BlogPosting", "NewsArticle"]` with `abstract`, `wordCount`, `timeRequired`, `Person` author + `sameAs` + author photo `ImageObject`, `Speakable`, `about`, `mentions`, `FAQPage` (if FAQs) + `BreadcrumbList` | `ssrMeta.ts:1440-1620` |
| `/glossary/:slug` | `DefinedTerm` + `DefinedTermSet` + `BreadcrumbList` | `ssrMeta.ts` |
| `/tools/:slug` | `SoftwareApplication` + `HowTo` + `FAQPage` + `BreadcrumbList` | `ssrMeta.ts` |
| `/locations/:slug` | `LocalBusiness` + `GeoCoordinates` + `FAQPage` + `BreadcrumbList` | `ssrMeta.ts` |
| `/services/:slug` | `["FinancialService", "ProfessionalService"]` + `BreadcrumbList` | `ssrMeta.ts` |
| `/authors/:slug` | `ProfilePage` + `Person` (with `sameAs`, `knowsAbout` via post topics) | `ssrMeta.ts:2200+` |
| `/compare/:slug` | `WebPage` + `FAQPage` + `BreadcrumbList` | `ssrMeta.ts` |
| `/contact` | `ContactPage` + nested `Organization` + `ContactPoint` + `Speakable` | `ssrMeta.ts:3155+` |
| `/write-for-us` | `CollectionPage` + `WriteAction` + `Speakable` | `ssrMeta.ts:3194+` |
| `/about`, `/editorial-guidelines`, `/methodology` (section), `/privacy`, `/terms` | `WebPage` + `BreadcrumbList` + `Speakable` | `ssrMeta.ts` |

**Gap:** None worth fixing. Every public route emits a typed entity. Adding `Review`/`AggregateRating` outside the homepage would require curating per-page review data the project doesn't have. **Skipped — not a fabricated signal.**

---

### 4. AEO health-check — `pnpm aeo:check`

**State:** Comprehensive. `scripts/src/aeo-health-check.ts` enforces:
- `RAW_HELMET` — no direct `<script type="application/ld+json">` injection (must go through `<PageMeta>`)
- `MISSING_META` — every non-admin page imports `<PageMeta>`
- `RAW_JSONLD` — catches dangling JSON-LD strings
- `STALE_DATE` — `lastmod` dates older than 180 days fail the check
- `MISSING_SSR_FIELD` — `ssrMeta.ts` must include `abstract`, `publishingPrinciples`, `speakable`, `inLanguage`

This is wired into the `typecheck` workflow. **No rebuild needed — already exists.**

---

### 5. E-E-A-T signals

**State:** Strong. Verified:
- Author bio pages at `/authors/:slug` with `Person` schema + social `sameAs`.
- Editorial-guidelines policy at `/editorial-guidelines` (referenced as `correctionsPolicy`, `noBylinesPolicy`, `ethicsPolicy` in `index.html:135-137`).
- `datePublished` and `dateModified` emitted on `BlogPosting`.
- Author photos served as `ImageObject` for Knowledge-Panel matching (`ssrMeta.ts:1465`).
- Wikidata QID linkage (`Q130531885`) for entity resolution in Google Knowledge Graph and AI-engine entity disambiguation.

**Gap:** None at the schema layer. A future enhancement (out of scope for this audit) would be to add `reviewedBy`/`fact-checked-by` for finance-regulated content — but that requires editorial workflow changes, not code.

---

### 6. Citation-friendly content patterns

**State:** Strong. `blog-post.tsx` ships:
- BLUF summary at the top via `post.blufSummary` (line 847)
- Sticky `BlogPostToc` jump-links (line 945)
- `<dt>`/`<dd>` definition lists for stats (lines 733-770)
- `Accordion` FAQ blocks
- Author byline with credentials

**Gap:** None worth fixing in code. Per-article BLUF quality is editorial.

---

### 7. Freshness signals

**State:** Strong. `dateModified` is conditionally emitted only when there is a meaningful update (`blog-post.tsx:474`), preventing spam-style daily-bumping that some crawlers penalise. `sitemap_index.xml` carries per-child `lastmod` derived from the latest content row.

**Gap:** None.

---

### 8. Speakable schema

**State:** Strong. Selectors `["h1", ".speakable-summary"]` are emitted on home, contact, write-for-us, blog posts, services, tools. The `aeo:check` script validates the presence of `.speakable-summary` in component markup.

**Gap:** None.

---

### 9. Hreflang / international

**State:** English-only site, `en` + `x-default` + `og:locale:alternate` for `en_GB`, `en_SG`, `en_AU` injected by `ssrMeta.ts:289-299`. Correct for current scope.

**Gap:** None.

---

### 10. Sitemap coverage

**State:** Excellent. Sitemap index at `/sitemap_index.xml` references 10 child sitemaps (`pages`, `blog`, `tags`, `authors`, `locations`, `glossary`, `services`, `tools`, `compare`, `news-sitemap`) — all dynamically generated from DB. Confirmed at `sitemapIndex.ts:127-136`.

**Gap:** None for SEO. For GEO: AI engines do not use sitemaps the same way; they rely on `llms.txt` discovery, which is handled separately.

---

### 11. AI-friendly meta tags

**State:** `index.html:62` emits `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">`. The SSR middleware's `html.replace(...)` calls (`ssrMeta.ts:220-240`) only target `<title>`, `<meta name="description">`, and `og:*`/`twitter:*` patterns — **so the AI-friendly directives survive on every SSR-rendered page**, including `/blog/:slug`. Verified by inspection of every `html.replace(` call in `ssrMeta.ts`.

**Gap:** None. The "missing on SSR pages" claim sometimes raised in GEO audits is a false alarm here.

---

### 12. AI usage / content-licensing policy

**State:** Covered inside `/llms.txt` itself (the "AI citation policy" section, line 260 of `llmsTxt.ts`). A standalone `/ai-policy` page would be **a duplicate** of the same content at a different URL — not adding it.

**Gap:** None worth fixing.

---

### 13. Hostinger Business-plan compatibility

**State:** Mostly good. The runtime gates Replit-only services so the API server boots cleanly when `REPL_ID` is unset:

| Concern | File | Behaviour on Hostinger |
|---|---|---|
| OIDC login | `lib/auth.ts:42-47` | Throws on `setupAuth()` if `REPL_ID` is missing — but this only blocks `/api/login`, not the rest of the server. **Action required:** disable the login route mount, OR use password-based admin login (already implemented in `routes/adminAuth.ts`). |
| Object Storage sidecar | `lib/object-storage/objectStorage.ts:20` | `isReplitStorageAvailable()` returns false on Hostinger and every public method throws a friendly error before contacting `127.0.0.1:1106`. Existing uploads already in the DB still work because the `/objects/*` route only proxies, it doesn't re-upload. **Action required:** for new uploads on Hostinger, the project will need an S3-compatible adapter (out of scope for this audit — flagged as a follow-up). |
| Hardcoded `.replit.dev` URLs | `lib/seo.ts` | Used only as a *fallback*; `SITE_URL` env var overrides on Hostinger. **No fix needed.** |

**Fix (this PR):** Add a one-liner doc note in `docs/hostinger-deployment.md` listing the two action-required items so a future deployment doesn't forget. **Not** creating a new file — the doc already exists.

**Skill-Creator outputs:** All skills under `.local/skills/` and `.agents/skills/` are static Markdown / scripts. None depend on Replit runtime services. They will continue to function on Hostinger because the agent runtime that consumes them is not part of this deployment. **No fix needed.**

---

### 14. Duplicate-file scan

Ran a deliberate scan for accidentally-duplicated routes / files. Findings:

- `sitemap.xml` (legacy/flat) and `sitemap_index.xml` (modern/split) **both exist intentionally**: the legacy one is a fallback for crawlers that don't follow sitemap-index files. **Not a duplicate — keeping both.**
- One robots-txt implementation (`app.ts:237`). **No duplicate.**
- One llms-txt implementation (`routes/llmsTxt.ts`). **No duplicate.**
- No duplicate audit reports being created — this report is `geo-audit-report-2026-05.md`, deliberately distinct from the existing `aeo-audit-report-2026-05.md` (answer-engine markup) and `seo-upgrade-roadmap.md` (classic SEO).

---

## Score breakdown — 92/100

| Pillar | Score | Notes |
|---|---|---|
| AI-bot crawl directives | 9.5 / 10 | −0.5 for missing `/llms.txt` discovery hint in robots.txt (fixed this PR) |
| `llms.txt` ecosystem | 10 / 10 | Both files served, well-formatted, cached |
| Structured data graph | 10 / 10 | Wikidata, Person, BlogPosting+NewsArticle, FAQPage, HowTo, DefinedTerm, LocalBusiness, SoftwareApplication, Speakable — all present |
| E-E-A-T signals | 9 / 10 | Strong author + editorial-policy linkage; missing `reviewedBy` for regulated finance content (editorial decision, not code) |
| Citation-friendly content | 9 / 10 | BLUF, TOC, definition lists, FAQ accordions present; per-article BLUF quality is editorial |
| Freshness signals | 10 / 10 | `dateModified` is conditional, `lastmod` is dynamic |
| Speakable schema | 10 / 10 | Multi-route coverage |
| AI meta directives | 9 / 10 | `max-snippet:-1` etc. survive on SSR; missing HTTP `Link: rel=alternate type=text/plain` (fixed this PR) |
| AEO/GEO automation | 10 / 10 | `pnpm aeo:check` gates regressions in CI |
| Hostinger portability | 5.5 / 10 | OIDC + object-storage gated correctly; no S3 fallback for new uploads (flagged as follow-up — not in scope) |
| **Total** | **92 / 100** | |

---

## Implementation list (this PR)

Three small, surgical edits. **No new files. No rebuilds. No duplicates.**

1. **`artifacts/api-server/src/app.ts` (robots.txt handler)** — Append `# LLM-Content:` discovery hints listing `/llms.txt` and `/llms-full.txt` so AI crawlers following the llmstxt.org convention can find them in one fetch.
2. **`artifacts/api-server/src/middlewares/ssrMeta.ts`** — Add `res.setHeader("Link", '</llms.txt>; rel="alternate"; type="text/plain", </llms-full.txt>; rel="alternate"; type="text/plain"')` on every SSR-served HTML page so the higher-fidelity Markdown content is discoverable from any HTML response.
3. **`docs/hostinger-deployment.md`** — Append a "GEO-related Hostinger checks" subsection documenting the two action-required items (OIDC route mount, object-storage S3 fallback) so they're not forgotten at deploy time. Editing the existing doc — **not** creating a new one.

## Out of scope (deliberately not implemented)

- **S3-compatible object-storage adapter** for new uploads on Hostinger — large feature requiring credentials and bucket configuration. Flagged as a follow-up; existing uploads continue to serve from Replit.
- **`/ai-policy` standalone route** — would duplicate the AI citation policy section already present in `/llms.txt`. Skipped to honour the no-duplicates constraint.
- **`reviewedBy`/fact-check schema fields** — requires editorial-workflow data the project doesn't have. Editorial decision, not a code gap.
- **Per-author `knowsAbout` derived from post topics** — already partially derived; full enrichment requires a topic-extraction pipeline that's out of GEO scope.
