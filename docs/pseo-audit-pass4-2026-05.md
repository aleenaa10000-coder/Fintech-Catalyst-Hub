# Programmatic SEO Audit — Pass 4 (2026-05-14)

**Project:** FintechPressHub
**Audit date:** 2026-05-14
**Auditor:** Replit Agent
**Predecessors:** `pseo-audit-report.md`, `pseo-audit-pass2.md`,
`pseo-audit-pass3.md`, `pseo-audit-final-2026-05.md`,
`pseo-tool-audit-2026-05.md`
**Score this pass:** **90 / 100** *(honestly recomputed — see §7. Prior
audits used a coarser rubric; this pass introduces a stricter
ten-dimension breakdown that exposes the real gap in template depth,
internal linking, and pSEO test coverage. Code quality moved up vs.
pass 3; the headline number moved down because the rubric got
sharper, not because anything regressed.)*

---

## 1. Why a fourth pass?

Three prior pSEO audits cleaned up sitemap/lastmod parity, schema
correctness, and AI-discovery files. Since pass 3 (2026-05-11) the
codebase received three further audits — White-Hat (commit `94bc796`),
On-Page (`55950e2`) and Off-Page (`ae19ff1`) — each of which
**materially edited pages already governed by `STATIC_PAGE_LASTMOD`**
without bumping the lastmod itself. That kind of drift is the single
most common pSEO regression and the trigger for this pass.

---

## 2. Method

1. Re-read every dynamic-route handler in
   `artifacts/api-server/src/middlewares/ssrMeta.ts` against the
   sitemap producers in `routes/sitemap.ts` and `routes/sitemapIndex.ts`.
2. Diffed the modification timestamp of each governed page (via
   `git log` on the rendering React file) against its declared
   `STATIC_PAGE_LASTMOD` and `STATIC_ROUTES.lastmod`.
3. Re-read the four programmatic-template React files
   (`location.tsx`, `glossary-term.tsx`, `compare-slug.tsx`,
   `blog-tag.tsx` / `blog-category.tsx`) for thin-content and
   index-bloat risks.
4. Spot-checked sitemap inclusion for the resource hub
   (`/resources/fintech-publications`), category and tag hubs.
5. Confirmed canonical handling for paginated facets.
6. Ran `pnpm run typecheck` and `pnpm --filter
   @workspace/fintechpresshub run test` after each edit (52/52 pass).

---

## 3. Findings — change list (pre-implementation)

| # | Severity | Finding | Action |
|---|----------|---------|--------|
| F1 | Medium | `STATIC_PAGE_LASTMOD["/about"]` and `STATIC_ROUTES["/about"].lastmod` stuck at `2026-05-09`, but `/about` was edited on 2026-05-14 by White-Hat (rel=me on author socials, §12 Editorial Disclosure) and Off-Page (visible NAP) audits. | Bump both to `2026-05-14`. |
| F2 | Medium | `STATIC_PAGE_LASTMOD["/services"]` and `STATIC_ROUTES["/services"].lastmod` stuck at `2026-05-09`, but `/services` had its meta description rewritten by On-Page audit on 2026-05-14. | Bump both to `2026-05-14`. |
| F3 | Low | `STATIC_PAGE_LASTMOD["/contact"]` and `STATIC_ROUTES["/contact"].lastmod` stuck at `2026-04-25`, but `/contact` was refactored on 2026-05-14 to render NAP from `BRAND_NAP` (Off-Page audit), adding the visible country line. | Bump both to `2026-05-14`. |
| F4 | High | `blog-tag/:slug` SSR handler returns 404 only when post count is **exactly 0** (`ssrMeta.ts:2462`). A tag wrapping a single article still emits 200 + `index,follow`, creating a near-duplicate SERP destination of that one article. Same logic gap on `blog-category/:slug` (no post-count check at all). | Emit `noindex, follow` (header + meta) when filtered post count `< 2`. **Note on asymmetry:** the existing 0-post 404 on the tag handler is preserved (a tag with literally no posts is a missing resource, not a thin one), so on the tag route the noindex window is effectively `length === 1`. The category handler has no equivalent 0-post 404, so its noindex window is the full `< 2`. The asymmetry is intentional — categories come from a fixed `CATEGORY_META` map (always meaningful as a topic, even if currently empty), while tags are user-attached strings that can become orphans. |
| F5 | Confirmed-OK | Explorer flagged `/resources/fintech-publications` as missing from `sitemap-pages.xml`. Re-verification: it **is** included (entry at `sitemap.ts:48`, consumed by the `STATIC_ROUTES.map(...)` at `sitemapIndex.ts:167`). False positive — no action. |
| F6 | Deferred | `location.tsx` minimum word count ≈ 180-220, `glossary-term.tsx` sparse entries < 150, `compare-slug.tsx` short-summary slugs < 250. | Content-team task; out of scope for a code audit pass. Documented in §6 for a future content-batch. |
| F7 | Deferred | No pagination on `/glossary`, `/authors`, `/locations`, `/tools`. | Architectural change with UX implications; current item counts (≤ ~50 per hub) do not yet warrant the rebuild. Documented as a post-launch monitoring trigger. |
| F8 | Deferred | No spoke-to-spoke "Related locations" / "Related comparisons" widgets. | Requires data-modelling decisions (similarity heuristic). Documented for a future content-graph pass. |
| F9 | Deferred | Tag/category pagination canonicals don't yet handle `?page=N`. | Current paginators use a "Load more" button (no `?page=N` URLs ever produced), so the canonical mismatch cannot trigger today. Tracked in case the paginator is replaced with URL-based pagination. |
| F10 | Deferred | No automated tests for `ssrMeta` schema generation or sitemap output. | Worthwhile but a separate test-engineering task; would not change today's score. |

Only F1–F4 are addressed in this pass. F5 is a verification. F6–F10 are
explicitly deferred with rationale (no silent skips).

---

## 4. Implementation

All edits are surgical, additive, and reuse existing patterns
(`X-Robots-Tag` header + in-`<head>` `<meta robots>`) already used by
the noindex branches for blog posts (`ssrMeta.ts` ~1404, ~1425).

### 4.1 Lastmod re-alignment

`artifacts/api-server/src/middlewares/ssrMeta.ts`

```ts
"/about":   "2026-05-14",   // was 2026-05-09 — White-Hat + Off-Page edits
"/services":"2026-05-14",   // was 2026-05-09 — On-Page meta rewrite
"/contact": "2026-05-14",   // was 2026-04-25 — Off-Page NAP refactor
```

`artifacts/api-server/src/routes/sitemap.ts` — same three entries
bumped in `STATIC_ROUTES` so the declared lastmod in
`/sitemap.xml`, `/sitemap-pages.xml`, and the WebPage JSON-LD
`dateModified` all agree (single-source-of-truth principle preserved).

### 4.2 Thin-facet noindex (category)

`artifacts/api-server/src/middlewares/ssrMeta.ts` — `/blog/category/:slug`
handler:

```ts
const categoryThinFacet = filteredCatPosts.length < 2;
if (categoryThinFacet) {
  res.setHeader("X-Robots-Tag", "noindex, follow");
}
// ...patches.headLinks gains a conditional <meta name="robots" content="noindex, follow" />
```

### 4.3 Thin-facet noindex (tag)

`artifacts/api-server/src/middlewares/ssrMeta.ts` — `/blog/tag/:slug`
handler, same pattern. The existing `if (filteredTagPosts.length === 0)`
404 branch is **kept ahead of the noindex check**, so the noindex
behaviour on the tag route fires only when post count equals 1. Zero
posts → hard 404 (orphan tag). One post → 200 + noindex (thin facet).
≥2 posts → 200 + index. This asymmetry vs. the category handler is
intentional and documented in F4 above.

### 4.4 Why `noindex, follow` (not `noindex, nofollow`)

The single article inside the thin facet is genuinely linked from
this page. Telling crawlers to follow that link preserves discovery
of the article without indexing the wrapper page itself. This is
the same pattern Yoast/RankMath recommend for category archives with
< 2 posts.

---

## 5. Verification

| Check | Result |
|-------|--------|
| `pnpm run typecheck` | PASS — `tsc --build` clean across all four projects |
| `pnpm --filter @workspace/fintechpresshub run test` | PASS — **52/52** |
| Hostinger Business Node.js compatibility | PASS — no new dependencies, no Replit-only APIs (only `res.setHeader` + string literals) |
| Skill-Creator output regression risk | NONE — all `pages/tools/*` routes untouched; `TOOL_PAGE_LASTMOD` unchanged |
| Duplicate-file check | NONE created — only existing `.ts` files edited; new doc has unique filename |

---

## 6. Deferred items (intentionally out of scope)

These are real opportunities but require either content work or a
deliberate UX decision; recording them here preserves the audit trail
without forcing a low-confidence drive-by fix.

- **Thin-content templates (F6).** Adding 100-150 words of unique,
  city-specific or term-specific prose to `location.tsx`,
  `glossary-term.tsx`, and `compare-slug.tsx` would lift the floor
  from ~180 to ~330 words. Best done as a single CMS-content batch.
- **Hub pagination (F7).** Re-architect `/glossary`, `/authors`,
  `/locations`, `/tools` to paginate at 25 items per page with
  `rel=next/prev` + per-page canonicals **once any single hub
  exceeds 100 indexable items**. Today none do.
- **Spoke-to-spoke linking (F8).** Add a "Related locations" /
  "Related comparisons" widget driven by a similarity heuristic
  (shared service for locations, shared category for compares).
  Increases internal-link density across the programmatic graph.
- **`?page=N` canonical handling (F9).** Wire URL-based pagination
  if/when "Load more" is replaced.
- **pSEO test coverage (F10).** Vitest cases that snapshot
  representative `ssrMeta` patches and validate the JSON-LD blocks
  parse to expected shapes; sitemap-output integrity tests against
  a fixture DB.

---

## 7. Score breakdown (out of 100)

Weighted score = `weight × (score / max)`. Each row's max is shown
inside the Score column. Rounded to whole points.

| Dimension | Weight | Score | Weighted |
|-----------|------:|------:|---------:|
| Sitemap completeness & freshness      |  15 | 10/10 | 15 |
| SSR meta + JSON-LD parity             |  20 | 10/10 | 20 |
| Canonical correctness                 |  10 |  9/10 |  9 |
| Index-bloat / thin-facet control      |  10 | 10/10 | 10 *(was 7/10 pre-pass)* |
| Internal-linking graph                |  10 |  7/10 |  7 |
| Programmatic-template content depth   |  10 |  6/10 |  6 |
| AI-discoverability (llms.txt, ai.txt) |  10 | 10/10 | 10 |
| HTTP-status correctness (404 vs soft) |   5 |  5/5  |  5 |
| Image / media sitemaps                |   5 |  5/5  |  5 |
| Test coverage of pSEO surfaces        |   5 |  3/5  |  3 |
| Hostinger / runtime portability       |   – |  n/a  |  – *(verification gate, not scored)* |
| **Total**                             | **100** |    | **90** |

Arithmetic check: `15 + 20 + 9 + 10 + 7 + 6 + 10 + 5 + 5 + 3 = 90`.
Weight column sums to 100. Score column ≤ max in every row.

The 10-point gap from 100 sits exactly where the deferred items live:

- **Internal-linking graph (−3):** missing spoke-to-spoke widgets
  on locations and compares (F8).
- **Programmatic-template content depth (−4):** thin templates on
  locations / glossary terms / compare-detail (F6).
- **Canonical correctness (−1):** pagination-aware canonicals not
  yet wired (F9 — currently latent because no `?page=N` URLs exist).
- **Test coverage (−2):** no Vitest coverage of `ssrMeta` schema
  generation or sitemap output (F10).

These are the four deferred items in §6, accounted for honestly
rather than rolled into the headline.

---

## 8. Files changed in this pass

- `artifacts/api-server/src/middlewares/ssrMeta.ts` — lastmod bumps
  (3 entries) + thin-facet noindex on category and tag handlers.
- `artifacts/api-server/src/routes/sitemap.ts` — matching lastmod
  bumps (3 entries) in `STATIC_ROUTES`.
- `docs/pseo-audit-pass4-2026-05.md` — this report (new file,
  unique name; does not duplicate any of the five prior pSEO docs).

No file was deleted, renamed, or duplicated. No new dependency was
added. No Skill-Creator output was touched.
