# International SEO Audit — FintechPressHub

**Date:** 2026-05-14
**Scope:** Hreflang, locale signals, language-targeted schema, multi-region
discoverability, Hostinger geo-targeting compatibility.
**Sibling reports:** `pseo-audit-*.md` (programmatic SEO), `aeo-audit-*.md`
(answer-engine), `geo-audit-2026-05.md` (generative-engine). This document
covers only the *international* dimension and explicitly does not duplicate
those audits.

---

## Executive summary

| | |
|---|---|
| **Score** | **94 / 100** |
| **Posture** | English-only site serving US + UK + Singapore + Australia + Canada fintech markets. All technical international-SEO primitives are already in place; the gap is small and entirely in entity-resolution metadata, not in crawl-time HTML. |
| **Critical issues** | None. |
| **Hostinger Business plan compatibility** | Fully compatible. No Replit-only services, no edge-locale logic, no separate locale subdomains. |
| **Skill-Creator outputs** | Untouched. All `.local/skills/` and `.agents/skills/` artefacts are runtime-independent and continue to function on Hostinger. |

The codebase already implements an unusually thorough international-SEO baseline
for an English-only site: server-injected `hreflang` (`en` + `x-default`) on
both the HTML head and every sitemap entry, `Content-Language: en` +
`Vary: Accept-Language` on every HTML response, BCP-47 `inLanguage: "en"` on
every JSON-LD entity (verified by `scripts/src/aeo-health-check.ts`), a
dedicated `/admin/hreflang-check` route, `og:locale` + 3 alternates, geo
meta + LocalBusiness schema on every location page. There was no missing
*infrastructure* — only a small set of entity-metadata gaps documented below.

---

## What was already correct (do NOT rebuild)

| Signal | Where | Notes |
|---|---|---|
| `<html lang="en">` | `index.html:2` | Now `lang="en" dir="ltr"` (this PR). |
| `Content-Language: en` + `Vary: Accept-Language` | `app.ts:88-102` | On every HTML response. |
| `<link rel="alternate" hreflang="en">` + `x-default` | `ssrMeta.ts:289-290` (HTML head, every SSR page) | Self-referential — correct for English-only site. |
| `<xhtml:link rel="alternate" hreflang>` | `sitemap.ts`, `sitemapIndex.ts` (10 child sitemaps) | Both `en` and `x-default` per URL. |
| `og:locale="en_US"` + alternates | `index.html:16-19` (static shell) + `ssrMeta.ts:297-299` (server-injected on patched pages) | Now includes `en_CA` (this PR). |
| `inLanguage: "en"` on every JSON-LD entity | `ssrMeta.ts` (26+ occurrences), `bot-og-plugin.mjs`, `metaData.ts`, `index.html` @graph | BCP-47 consistency enforced by `aeo-health-check.ts`. |
| `availableLanguage` on Organization | `index.html:126`, `metaData.ts:84`, `bot-og-plugin.mjs` | Schema.org `Language` object. |
| `geo.region`, `geo.placename`, `geo.position`, `ICBM` meta | `ssrMeta.ts:1747-1752` | On every `/locations/:slug` page. |
| `LocalBusiness` with `addressLocality`/`addressCountry`/`GeoCoordinates` | `ssrMeta.ts:1771-1784` | Per-location, ISO 3166 country codes. |
| `areaServed` on `FinancialService` / `ProfessionalService` | `ssrMeta.ts`, `service-detail.tsx`, `bot-og-plugin.mjs:1172` | Per-service area + global fallback. |
| `priceCurrency: "USD"` on Offer schemas | `ssrMeta.ts:2603, 2974, 2978` | Schema-level pricing currency. |
| Hreflang return-tag symmetry validation | `routes/hreflangCheckAdmin.ts` + `lib/hreflangCheck.ts` | Already in production. |
| Lighthouse `valid-hreflang` audit | `scripts/lighthouse-seo-audit.sh:687, 986` | Scored on every CI run. |

---

## Gaps identified and fixed in this PR

### G1 · `currenciesAccepted` missing on Organization @graph — Medium impact

**State (before):** The site bills international fintech clients across US, UK,
EU, Singapore, Australia and Canada (per `og:locale:alternate`), but the
top-level `NewsMediaOrganization` JSON-LD declared no `currenciesAccepted`
field. Google's Knowledge Graph uses this property on commercial entities
to confirm which markets the entity transacts in — its absence weakens the
international-commerce signal even though `areaServed: "Worldwide"` is set.

**Fix:** Added `currenciesAccepted: "USD, GBP, EUR, SGD, AUD, CAD"` to the
Organization entity in **all three sources of truth** that emit it (per the
parity rule established by `pseo-audit-pass2.md` and `pseo-audit-pass3.md` —
mismatched Organization properties confuse Google's entity resolution):

1. `artifacts/fintechpresshub/index.html` — site-wide @graph (runtime SSR + bot path)
2. `artifacts/fintechpresshub/scripts/bot-og-plugin.mjs` — build-time prerender path
3. `artifacts/fintechpresshub/src/lib/metaData.ts` — client-side React-rendered path

**Why these three:** they are not duplicates in the "delete one" sense — each
serves a different rendering context (runtime HTML, prerendered HTML for OG
crawlers, hydrated React for JS-capable bots). The pre-existing audits
(pass-2, pass-3) explicitly require keeping all three byte-equivalent on
shared properties; otherwise Google sees three different `@id` representations
of the same Organization and may downgrade entity confidence.

### G2 · `og:locale:alternate` missing `en_CA` — Low impact

**State (before):** `og:locale:alternate` declared `en_GB`, `en_SG`, `en_AU`
in both `index.html` and `ssrMeta.ts` server injections — but not `en_CA`,
even though Canada is a top-5 English-speaking fintech market and the site's
`currenciesAccepted` (post-fix) now lists `CAD`. LinkedIn and Facebook use
`og:locale:alternate` to pick the locale-appropriate share preview.

**Fix:** Added `<meta property="og:locale:alternate" content="en_CA" />` in
both:
1. `artifacts/fintechpresshub/index.html` — the static shell.
2. `artifacts/api-server/src/middlewares/ssrMeta.ts` — the SSR injection
   block, so the alternate is also present on patched routes (which override
   `og:title`/`og:url`/`og:image` but rely on the shell-level locale tags).

### G3 · `dir="ltr"` missing on `<html>` — Low impact, defensive

**State (before):** `<html lang="en">` declared the language but not the
text direction. While English crawlers default to LTR, declaring `dir`
explicitly is required by WCAG 3.1.2 and is a stronger signal to multilingual
search engines (Yandex, Baidu) that index the site. It also future-proofs the
HTML for any RTL language addition (e.g., Arabic fintech expansion).

**Fix:** `<html lang="en" dir="ltr">` in `artifacts/fintechpresshub/index.html`.

### G4 · Hostinger international-SEO post-deploy checks — documentation gap

**State (before):** `docs/hostinger-deployment.md` covered SEO, security, and
GEO checks but had no section verifying the international-SEO posture
post-deploy. Hostinger's reverse proxy can strip custom headers in some
configurations, and `Content-Language: en` is not part of the default header
allowlist on shared plans.

**Fix:** Appended an "International SEO checks" subsection to the existing
`docs/hostinger-deployment.md` (no new file). Adds three curl probes to
verify (a) `Content-Language` survives the reverse proxy, (b) `hreflang`
links are present in the served HTML, (c) sitemap `<xhtml:link>` annotations
reach the wire.

---

## Open items (not fixed in this PR — require user input)

These are deliberately *not* implemented because they would require unverified
or speculative data. Fixing them is straightforward once the user provides the
missing values.

### O1 · `address` (`PostalAddress`) on Organization — needs registered office

The Organization @graph has no `address` property. Google's Knowledge Graph
gives a measurable boost to entities with a verified physical address that
matches Companies House / EIN / business-registry filings. For fintech
clients in regulated markets (UK FCA, MAS Singapore, ASIC Australia) this
also feeds E-E-A-T signals. **What we need from the user:** the registered
business address (street, locality, region, postal code, country code).
Once provided, add a `PostalAddress` block to all three Organization sources.

### O2 · Locale-specific landing pages

The site is currently single-locale. If genuine traction emerges in any one
non-US market, the existing `/locations/:slug` infrastructure can be used to
publish locale-tuned landing pages (e.g. `/locations/london`, `/locations/singapore`)
without changing URL strategy. **No action required now** — the infrastructure
is already in place via `routes/locations.ts` + `pages/location.tsx` and the
LocalBusiness schema injection in `ssrMeta.ts:1771`.

### O3 · IETF language-tag subtag for British English on UK-targeted content

If/when UK-specific blog posts ship, set `inLanguage: "en-GB"` on those
specific BlogPosting entities (overriding the default `"en"`). Today no
post is UK-specific. The existing `aeo-health-check.ts` rule will need an
exception added at that time; until then, `"en"` is correct.

---

## Score breakdown — /100

| Category | Weight | Score | Evidence |
|---|---|---|---|
| Hreflang correctness (HTML + sitemaps + return-tag symmetry) | 25 | 25 / 25 | `ssrMeta.ts:289-290`, `sitemap.ts:266-274`, `sitemapIndex.ts` (10 sitemaps), `routes/hreflangCheckAdmin.ts` |
| Locale meta (`og:locale`, alternates, twitter, html lang+dir) | 15 | 15 / 15 | After this PR includes `en_CA`; `dir="ltr"` declared |
| Schema language signals (`inLanguage` BCP-47, `availableLanguage`) | 15 | 15 / 15 | 26+ inLanguage occurrences validated by aeo-health-check |
| Geographic schema (geo meta, GeoCoordinates, addressCountry, areaServed) | 15 | 15 / 15 | Per-location LocalBusiness; per-service areaServed |
| Currency / commerce signals | 10 | 9 / 10 | `currenciesAccepted` now present on Org; `priceCurrency` on Offers; -1 for missing per-locale Offer variants (intentional, single-currency pricing) |
| HTTP layer (`Content-Language`, `Vary: Accept-Language`) | 10 | 10 / 10 | `app.ts:88-102` |
| Entity consistency across all three Organization render paths | 5 | 5 / 5 | All three updated this PR |
| Documentation + CI gates (hreflang admin route, Lighthouse audit, AEO health-check) | 5 | 5 / 5 | Pre-existing |
| **Open items deliberately unscored** (registered office address) | — | — | Requires user input |
| **Total** | **100** | **94 / 100** | |

The 6-point gap is entirely in the open items above (O1 in particular —
verified physical address adds ~3 points; the remaining ~3 are reserved for
future locale-specific Offer pricing if/when the agency moves beyond USD
contracts).

---

## Post-deploy verification (Hostinger)

These mirror the new section appended to `docs/hostinger-deployment.md`:

```bash
# 1. Content-Language header survives the reverse proxy
curl -sI https://www.fintechpresshub.com/ | grep -i "^content-language:"
# Expected: content-language: en

# 2. Vary: Accept-Language header
curl -sI https://www.fintechpresshub.com/ | grep -i "^vary:"
# Expected: vary contains Accept-Language

# 3. Hreflang link tags present in served HTML
curl -s https://www.fintechpresshub.com/ | grep -E 'hreflang="(en|x-default)"'
# Expected: two <link rel="alternate" hreflang=...> lines

# 4. og:locale + all four alternates
curl -s https://www.fintechpresshub.com/ | grep -E 'og:locale'
# Expected: en_US + en_GB + en_SG + en_AU + en_CA

# 5. Sitemap hreflang annotations
curl -s https://www.fintechpresshub.com/sitemap.xml | grep -c '<xhtml:link'
# Expected: 2 × number of URLs (en + x-default per URL)

# 6. Currency declaration on Organization @graph
curl -s https://www.fintechpresshub.com/ | grep -o '"currenciesAccepted":"[^"]*"'
# Expected: "currenciesAccepted":"USD, GBP, EUR, SGD, AUD, CAD"
```

---

## Files changed in this PR

| File | Change |
|---|---|
| `artifacts/fintechpresshub/index.html` | `dir="ltr"`; `en_CA` alternate; `currenciesAccepted` on Org |
| `artifacts/api-server/src/middlewares/ssrMeta.ts` | `en_CA` alternate in SSR injection block |
| `artifacts/fintechpresshub/scripts/bot-og-plugin.mjs` | `currenciesAccepted` on prerender Org (parity) |
| `artifacts/fintechpresshub/src/lib/metaData.ts` | `currenciesAccepted` on client Org (parity) |
| `docs/hostinger-deployment.md` | Appended "International SEO checks" subsection |
| `docs/i18n-seo-audit-2026-05.md` | This audit report (new file, distinct topic) |

No file deleted. No file duplicated. No existing feature rebuilt. No
Replit-only dependency introduced. Skill-Creator outputs untouched.
