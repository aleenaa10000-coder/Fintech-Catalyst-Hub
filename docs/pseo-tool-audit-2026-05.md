# pSEO Tool Pages Audit — May 2026

**Scope:** 9 remaining free-tool pages (financial-health-score-calculator is separately audited)
**Audited:** 11 May 2026

---

## Summary Table

| Tool | speakable-summary | Methodology section | Benchmark table | Schema complete | Priority |
|---|---|---|---|---|---|
| readability-checker | ✅ | ✅ (grade bands) | ⚠️ Inline only | ✅ | Medium |
| meta-description-generator | ⚠️ Missing | ❌ | ❌ | ✅ | **High** |
| guest-post-pitch-generator | ⚠️ Missing | ❌ | ❌ | ✅ | **High** |
| keyword-difficulty-estimator | ✅ | ✅ (score bands) | ⚠️ Inline only | ✅ | Medium |
| backlink-value-estimator | ✅ | ✅ (weight breakdown) | ⚠️ Inline only | ✅ | Medium |
| content-brief-generator | ⚠️ Missing | ❌ | ❌ | ✅ | **High** |
| headline-analyzer | ⚠️ Missing | ⚠️ Partial (dimensions listed) | ❌ | ✅ | **High** |
| link-prospector | ⚠️ Missing | ⚠️ Partial | ❌ | ✅ | **High** |
| outreach-email-generator | ⚠️ Missing | ❌ | ❌ | ✅ | **High** |

---

## Prioritised Fix List

### P1 — High Impact / Low Effort

#### 1. Add `<p class="speakable-summary">` to 6 tool pages
**Affected:** meta-description-generator, guest-post-pitch-generator, content-brief-generator, headline-analyzer, link-prospector, outreach-email-generator

The `.speakable-summary` CSS class is targeted by `SpeakableSpecification` JSON-LD already emitted by the SSR middleware for all tool pages. Without the class on a visible paragraph, Google has no extractable text for voice-first and AEO answers.

**Fix:** Add directly under `<PageHero>` on each page:
```tsx
<div className="container mx-auto px-4 pb-2">
  <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
    [One-sentence BLUF describing what the tool does and the key output.]
  </p>
</div>
```

**SEO impact:** Unlocks Speakable rich result eligibility and voice assistant extraction for "[tool name] explained" and "how does [tool] work?" queries.

---

#### 2. Add named methodology disclosure sections to 4 tool pages
**Affected:** meta-description-generator, guest-post-pitch-generator, content-brief-generator, outreach-email-generator

These text-generation tools don't expose the scoring or generation logic to users, which leaves a 3-point E-E-A-T gap vs. the calculation tools that show their formula tables.

**Fix:** Add a collapsible `<h2>How [tool name] works</h2>` section below the output explaining:
- Input processing steps
- Logic rules applied (keyword density, CTR patterns, pitch structure, etc.)
- Output format rationale
- Any thresholds or limits

**SEO impact:** Closes E-E-A-T methodology gap; qualifies for "How It Works" HowTo JSON-LD extension; helps ranking on informational variants like "how does meta description generator work?".

---

#### 3. Add benchmark comparison tables to 3 existing tool pages
**Affected:** readability-checker, keyword-difficulty-estimator, backlink-value-estimator

These tools already show inline benchmark text (e.g. "Flesch 50–70 = plain English"), but the data is not structured as a dedicated table section, so it won't capture featured snippet placement for head-term queries like "what is a good Flesch reading score?" or "what is a good domain authority?".

**Fix (readability-checker):** Add table after output:
| Score | Grade | Audience | Fintech recommendation |
|---|---|---|---|
| 90–100 | Very Easy | 5th grade | Consumer apps, landing pages |
| 70–90 | Easy | 6th–7th grade | B2C fintech, neobanks |
| 50–70 | Standard | 8th–9th grade | B2B fintech ✅ Target |
| 30–50 | Difficult | College | Complex regulatory content |
| 0–30 | Very Difficult | Professional | Avoid for web content |

**Fix (keyword-difficulty-estimator):** Add table showing 0–30/31–60/61–100 ranges with expected timeline and required DA.

**Fix (backlink-value-estimator):** Add table showing score ranges with expected DR/traffic thresholds and ROI signal.

**SEO impact:** Each table targets a featured snippet slot for 2–5 head-term queries with 100–5,000 monthly searches.

---

### P2 — Medium Impact / Medium Effort

#### 4. Add methodology disclosure to headline-analyzer and link-prospector
**Affected:** headline-analyzer, link-prospector

Both tools show partial methodology (dimension labels for headline-analyzer; domain-scoring for link-prospector) but lack the dedicated named disclosure section with exact thresholds and source citations.

**Fix:** Add a `<h2 id="methodology">How we score [headlines / backlinks]</h2>` section with a table of each scoring dimension, its weight, and source authority (e.g. CoSchedule headline study, Ahrefs DR methodology).

**SEO impact:** 2–3 E-E-A-T points; qualifies for "How we calculate" passage-based indexing.

---

#### 5. Add TOOLS_FAQ auto-hook for new tools
When a new tool page is added to `TOOL_SLUGS` in `seoConstants.ts`, the server now warns at startup if `TOOLS_FAQ` in `ssrMeta.ts` has no matching entry. Extend this by adding a corresponding check in the admin tool-management flow so the warning surfaces in the UI before deployment.

**Fix:** Add a pre-flight check in the admin dashboard that lists TOOL_SLUGS missing TOOLS_FAQ entries.

---

### P3 — Low Impact / Reference

#### 6. pSEO audit for compare pages
Run the same audit matrix across the 6 comparison pages (`/compare/:slug`). Initial review shows all have FAQPage schema and BreadcrumbList but some lack a `.speakable-summary` paragraph and none have a methodology disclosure for the comparison criteria used.

#### 7. Glossary page audit
Glossary term pages (`/glossary/:slug`) all have DefinedTerm + FAQPage + BreadcrumbList schema. The gap is that `relatedTerms` is not emitted as `SameAs` or `mentions` links in the DefinedTerm JSON-LD, which weakens the Knowledge Graph entity graph for fintech terminology clusters.

---

## Baseline Schema Coverage (all 9 tool pages)

All 9 tool pages currently emit:
- ✅ SoftwareApplication JSON-LD with `offers`, `featureList`, `datePublished`, `dateModified`
- ✅ HowTo JSON-LD (via TOOLS_HOWTO map)
- ✅ FAQPage JSON-LD (via TOOLS_FAQ map, 3+ Q&As per tool)
- ✅ WebPage entity with `speakable: SpeakableSpecification`
- ✅ BreadcrumbList (Home → Free Tools → [Tool Name])
- ✅ `isAccessibleForFree: true` on SoftwareApplication

**No tool page has:**
- ❌ `<p class="speakable-summary">` visible text for voice extraction (6 of 9 tools)
- ❌ Named methodology section as a dedicated page section (5 of 9 tools)
- ❌ Standalone benchmark comparison table (all 9 tools, though 3 have inline benchmarks)
