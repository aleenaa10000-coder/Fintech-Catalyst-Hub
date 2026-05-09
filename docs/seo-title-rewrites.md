# SEO Title Rewrite Playbook for FintechPressHub

This guide covers how to rewrite blog post and page titles to maximise click-through rate (CTR) in Google SERPs, improve AEO (AI Overview citations), and protect YMYL (Your Money Your Life) compliance.

## Core principles

1. **Primary keyword first** — search engines truncate titles at ~60 characters. Lead with the term that matters most.
2. **Specificity over vagueness** — "Open Banking API Compliance Checklist (PSD3, 2025)" beats "A Guide to Open Banking Compliance".
3. **Match search intent** — informational, commercial, or navigational queries each call for a different title formula.
4. **YMYL caution** — avoid sensational or misleading superlatives on finance/legal pages. Google's QRG penalises titles that overstate certainty.
5. **Brand at the end** — `| FintechPressHub` appended after the pipe. Never at the start (wastes click-real-estate).

---

## Title formulas by content type

### Definition / "What is" articles
```
What Is [Term]? [Qualifier or Key Fact] | FintechPressHub
```
Examples:
- `What Is Open Banking? A Plain-English Guide for Fintech Teams | FintechPressHub`
- `What Is PSD3? Key Changes From PSD2 Explained | FintechPressHub`

### Comparison articles
```
[A] vs [B]: [Differentiator] for [Audience] | FintechPressHub
```
Examples:
- `SEPA vs SWIFT: Which Rail for B2B Cross-Border Payments? | FintechPressHub`
- `Stripe vs Adyen vs Braintree: Fee & Feature Comparison (2025) | FintechPressHub`

### How-to / instructional articles
```
How to [Action] [Object]: [Step Count or Qualifier] | FintechPressHub
```
Examples:
- `How to Apply for an EMI Licence in the UK: 9-Step Guide | FintechPressHub`
- `How to Build an Open Banking Integration: API Checklist | FintechPressHub`

### List / roundup articles
```
[Number] [Adjective] [Noun] for [Audience/Use Case] ([Year]) | FintechPressHub
```
Examples:
- `11 Best Fintech Compliance Tools for EU Fintechs (2025) | FintechPressHub`
- `7 Open Banking Use Cases Driving Revenue in 2025 | FintechPressHub`

### Opinion / analysis articles
```
[Strong claim or finding]: [Supporting evidence or qualifier] | FintechPressHub
```
Examples:
- `Why BNPL Underwriting Is Broken — and How to Fix It | FintechPressHub`
- `The Hidden Cost of Chargeback Fraud in Embedded Finance | FintechPressHub`

### Case study articles
```
How [Company/Type] [Achieved Result] with [Method] | FintechPressHub
```
Examples:
- `How a UK Neobank Reduced Onboarding Drop-Off by 38% | FintechPressHub`
- `How Embedded Lending Boosted GMV for a B2B SaaS Platform | FintechPressHub`

---

## Rewrite workflow

### Step 1 — Pull the current title and target keyword
Identify the primary keyword from the post's URL slug or opening paragraph.

### Step 2 — Check character length
Target ≤ 60 characters including `| FintechPressHub` (18 chars). Aim for 42 characters for the core title.

**Length checker:**
```
Core title length = 60 − 18 (brand) − 3 (space + pipe + space) = 39 chars target
```

### Step 3 — Check search intent
- **Informational**: use "What Is", "How to", "Guide", "Explained"
- **Commercial investigation**: use "Best", "vs", "Comparison", "Review", "Alternatives"
- **Transactional**: use "Services", "Agency", "for Hire", "Pricing"

### Step 4 — Apply YMYL filter
On finance/legal/regulatory topics, avoid:
- Superlatives that may mislead: "guaranteed", "100% safe", "never fails"
- Clickbait that misrepresents the content
- Unverified statistics in the title itself

### Step 5 — Test with 3 variants
Write 3 candidate titles. Score each on:
- Keyword placement (1–5)
- Specificity (1–5)
- CTR appeal (1–5)
- YMYL compliance (pass/fail)

Choose the highest combined score that passes YMYL.

---

## Common rewrite patterns

| Before | Problem | After |
|--------|---------|-------|
| "Open Banking: Everything You Need to Know" | Vague, no keyword | "Open Banking API Guide: PSD2, PSD3 & Integration (2025)" |
| "Our Guide to Fintech Compliance" | Possessive, generic | "Fintech Compliance Checklist: FCA, PSD2 & DORA Requirements" |
| "The Best Payment APIs" | No audience, vague | "Best Payment APIs for Fintech Startups: 2025 Comparison" |
| "What Founders Need to Know About Embedded Finance" | Weak keyword placement | "Embedded Finance Explained: What Founders Need to Know in 2025" |
| "5 Tips for Better Fintech Content" | Low specificity | "5 Fintech Content Marketing Tactics That Drive Organic Leads" |

---

## AEO-specific title rules

For pages targeting AI Overviews and voice search:

1. **Start with the question word** for definition content: "What", "How", "Why", "When"
2. **Mirror the BLUF** — the title should be a compressed version of the BLUF sentence
3. **Include the year** for time-sensitive regulatory or market content
4. **Avoid articles** at the start ("The", "A", "An") — wastes character budget

---

## Applying title rewrites in the admin

1. Open the post in `/admin/blog`.
2. In the edit form, find **"SEO title"** (separate from the display title).
3. Enter the rewritten title **without** the brand suffix — the admin UI appends `| FintechPressHub` automatically.
4. Check the live preview of the title + meta description below the field.
5. Save and re-ping IndexNow using the "Re-ping" button on the post row.
