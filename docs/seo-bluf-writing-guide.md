# BLUF Writing Guide for FintechPressHub

**BLUF** stands for **Bottom Line Up Front** — a writing technique borrowed from military intelligence briefings that puts the most important conclusion or recommendation in the very first sentence, before any background or evidence.

## Why BLUF matters for fintech SEO

1. **AI Overviews**: Google's generative search surfaces BLUF-style sentences as the leading citation. A crisp one-liner that directly answers the query is far more likely to be pulled into an AI Overview than a three-paragraph introduction.
2. **SpeakableSpecification**: The BLUF sentence populates the `SpeakableSpecification` JSON-LD schema, telling voice assistants and smart speakers which part of the page to read aloud.
3. **Featured snippets**: Google's paragraph snippet algorithm prefers the first complete sentence that answers the query directly. BLUF gives it exactly that.
4. **Reader experience**: Fintech decision-makers — your core audience — are time-poor. A BLUF respects their time and earns trust.

---

## The BLUF formula

```
[Core finding/recommendation] + [key qualifier] + [time/scope context if needed].
```

### Good BLUF examples

> "Open banking APIs cut payment failure rates by 40% compared with card-not-present transactions, making them the lowest-friction settlement rail for B2B SaaS platforms in 2025."

> "PSD3 will require all EU payment institutions to share transaction data with authorised third parties by Q4 2026, regardless of whether they currently offer open-banking services."

> "Embedded lending raises approval rates by up to 60% when pre-fill data from the host platform's user record replaces manual form entry."

### Weak openers to avoid

| Weak | Problem | Better |
|------|---------|--------|
| "In this article, we will explore..." | Meta, adds no value | Start with the finding |
| "The fintech landscape is evolving rapidly..." | Vague truism | Specific claim |
| "There are many reasons why..." | Hedge | State the primary reason |
| "According to our research..." | Buries the lede | Lead with the number |

---

## How to write a BLUF for your post

### Step 1 – Identify the core finding
Ask yourself: if a busy VP of Payments read only the first sentence, what single thing do you most want them to know?

### Step 2 – Make it falsifiable
A good BLUF contains a specific claim that could, in theory, be wrong. Avoid vague statements like "open banking is important" — that's unfalsifiable. Use specifics: percentages, timelines, regulatory references.

### Step 3 – Keep it under 40 words
The `SpeakableSpecification` character limit and voice-assistant attention spans both cap at roughly 40 words. Test by reading the sentence aloud. If you need to breathe mid-sentence, it's too long.

### Step 4 – Match the search intent
- **Informational query** ("what is PSD3"): State the definition + the most important implication.
- **Commercial query** ("best open banking API provider"): State the decision framework or top recommendation.
- **Navigational query**: Not typical for blog posts — skip BLUF optimisation.

---

## Entering the BLUF in the admin editor

1. Open the post in `/admin/blog`.
2. In the edit form, expand **"Structured content (optional)"**.
3. Paste your BLUF sentence into **"Bottom-line summary"** (max 400 characters).
4. Save the post.

The BLUF renders as a highlighted callout box (`border-l-4 border-[#0052FF]`) above the article body with the CSS class `.speakable-summary`. PageMeta picks this up for `SpeakableSpecification` JSON-LD automatically.

---

## BLUF checklist

- [ ] ≤ 40 words
- [ ] Contains at least one specific, falsifiable claim (number, date, or proper noun)
- [ ] Directly answers the primary search query
- [ ] No meta-commentary ("In this article...")
- [ ] Written in active voice
- [ ] Does not start with "According to..."
- [ ] Does not repeat the article title word-for-word
- [ ] Entered in the admin editor "Bottom-line summary" field

---

## Common fintech BLUF patterns

### Regulatory BLUF
```
[Regulation] requires [who] to [action] by [deadline], impacting [scope].
```
> "DORA requires all EU financial entities and their critical third-party ICT providers to implement continuous resilience testing by January 2025, covering an estimated 22,000 organisations."

### Product/feature BLUF
```
[Product/feature] [solves/reduces/enables] [outcome] for [audience], [by how much/under what conditions].
```
> "Variable recurring payments reduce checkout abandonment by 28% for subscription fintech products compared with direct debit mandates, primarily by eliminating the bank redirect step."

### Market/data BLUF
```
[Market/data point] shows [trend] which means [implication for the reader's business].
```
> "BNPL transaction volume grew 34% YoY in 2024 but credit losses doubled, signalling that underwriting models built on velocity signals alone are no longer sufficient."
