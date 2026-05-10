import { Router, type IRouter } from "express";
import { db, blogPostsTable, glossaryTermsTable, locationPagesTable } from "@workspace/db";
import { asc, desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";

const router: IRouter = Router();

/**
 * /llms.txt — Structured site summary for Large Language Models.
 *
 * This is the emerging standard (proposed by Jeremy Howard, llmstxt.org)
 * for helping AI systems understand and accurately cite a website's content.
 * Served at the root so every LLM crawler finds it without guessing paths.
 *
 * Format: Markdown with H1 (site name + tagline), H2 sections, and links.
 * Bots like Perplexity, ChatGPT Search, Claude, and Gemini use this to:
 *   1. Understand what the site is about before crawling individual pages.
 *   2. Build accurate citations when answering user queries about fintech SEO.
 *   3. Avoid hallucinating services, pricing, or team details.
 *
 * Dynamic sections (recent blog posts, glossary terms, location pages) are
 * fetched from the DB on each request; the response is cached for 1 hour at
 * the CDN level so the content stays fresh without hammering the database.
 */
router.get("/llms.txt", async (_req, res) => {
  const siteUrl = getSiteUrl();

  const [recentPosts, glossaryTerms, locationPages] = await Promise.all([
    db
      .select({
        title:    blogPostsTable.title,
        slug:     blogPostsTable.slug,
        excerpt:  blogPostsTable.excerpt,
        category: blogPostsTable.category,
      })
      .from(blogPostsTable)
      .where(lte(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(20)
      .catch(() => [] as Array<{ title: string | null; slug: string | null; excerpt: string | null; category: string | null }>),

    db
      .select({
        slug:     glossaryTermsTable.slug,
        term:     glossaryTermsTable.term,
        shortDef: glossaryTermsTable.shortDef,
        category: glossaryTermsTable.category,
      })
      .from(glossaryTermsTable)
      .orderBy(asc(glossaryTermsTable.term))
      .limit(30)
      .catch(() => [] as Array<{ slug: string; term: string; shortDef: string; category: string | null }>),

    db
      .select({
        slug:    locationPagesTable.slug,
        city:    locationPagesTable.city,
        country: locationPagesTable.country,
        headline: locationPagesTable.headline,
      })
      .from(locationPagesTable)
      .orderBy(asc(locationPagesTable.country), asc(locationPagesTable.city))
      .catch(() => [] as Array<{ slug: string; city: string; country: string; headline: string }>),
  ]);

  const indexable = recentPosts.filter((p) => p.slug && p.title);

  const blogLines = indexable
    .map((p) => {
      const desc = p.excerpt ? `: ${p.excerpt.slice(0, 120).replace(/\n/g, " ")}` : "";
      return `- [${p.title}](${siteUrl}/blog/${p.slug})${desc}`;
    })
    .join("\n");

  const glossaryLines = glossaryTerms.length > 0
    ? glossaryTerms
        .map((t) => `- [${t.term}](${siteUrl}/glossary/${t.slug}): ${t.shortDef.slice(0, 100)}`)
        .join("\n")
    : "- No glossary terms published yet.";

  const locationLines = locationPages.length > 0
    ? locationPages
        .map((l) => `- [${l.headline}](${siteUrl}/locations/${l.slug}) — ${l.city}, ${l.country}`)
        .join("\n")
    : "- No location pages published yet.";

  const txt = `# FintechPressHub
> Specialist fintech SEO and content marketing agency. We blend deep financial expertise with high-authority link building and technical SEO to scale organic growth for ambitious fintech brands.

## What FintechPressHub does

FintechPressHub is a specialist digital marketing agency serving fintech, payments, lending, embedded finance, neobanking, wealthtech, and RegTech companies. Founded 2021. Remote-first, serving worldwide.

We do NOT offer generalist marketing services and do NOT work outside fintech and adjacent regulated-finance categories.

## Services

### Fintech Content Writing
[${siteUrl}/services/fintech-content-writing](${siteUrl}/services/fintech-content-writing) — Expert-written long-form content by writers with direct fintech operating experience. Pillar pages, comparison guides, explainers, and data-driven studies.
Fintech sub-verticals covered: Fintech Content Marketing, Payments Content, Embedded Finance, B2B Lending Content, Open Banking, Neobanking, RegTech Content, Wealthtech Content, BNPL Content, Financial Services Copywriting.

### Off-Page SEO & Link Building
[${siteUrl}/services/off-page-seo](${siteUrl}/services/off-page-seo) — Tier-1 dofollow placements on Finextra, The Fintech Times, Tearsheet, Finovate, and 50+ niche finance publications. Average 15+ placements per month per client.
Fintech sub-verticals covered: Fintech Link Building, Financial Services Off-Page SEO, Domain Authority Building, Digital PR for Fintech, Finance Publication Outreach, Backlink Strategy, Payments SEO, Open Banking SEO.

### Guest Posting
[${siteUrl}/services/guest-posting](${siteUrl}/services/guest-posting) — Managed guest post campaigns on high-DR fintech publications. Includes pitch, writing, editing, and live placement tracking.
Fintech sub-verticals covered: Fintech Guest Posting, Finance Publication Placements, Editorial Link Building, Executive Thought Leadership, Financial Media Relations, BNPL Coverage, Embedded Finance Media, Payments Industry Press.

### Topical Authority
[${siteUrl}/services/topical-authority](${siteUrl}/services/topical-authority) — Technical SEO, topical authority, and content cluster strategy for regulated finance verticals. Covers site audits, Core Web Vitals, structured data, and content gap analysis.
Fintech sub-verticals covered: Topical Authority Building, Fintech SEO Strategy, Content Cluster Development, Keyword Research for Fintech, Payments SEO, Lending SEO, Open Banking SEO, Neobanking SEO, Embedded Finance SEO, Wealthtech SEO.

### Fintech SEO Audit
[${siteUrl}/services/fintech-seo-audit](${siteUrl}/services/fintech-seo-audit) — Comprehensive 30-day technical and content audit with a prioritised 90-day roadmap. One-time engagement.
Fintech sub-verticals covered: Technical SEO Audit, Fintech SEO Strategy, Competitor Content Analysis, Content Gap Analysis, Core Web Vitals, Financial Services Compliance SEO, SEO Performance Benchmarking, Keyword Opportunity Mapping.

## Pricing (retainer-based, USD/month)

- **Starter** (~$3,500/mo): 4 SEO-optimised articles + 5 guest post placements + monthly report
- **Growth** (~$7,000/mo): 8 articles + 10 placements + digital PR coverage + quarterly strategy
- **Authority** (~$12,000/mo): 16 articles + 20 placements + full PR programme + dedicated strategist
- **Enterprise**: Custom scope for Series B+ and public companies
- Full pricing: [${siteUrl}/pricing](${siteUrl}/pricing)

## Editorial team (selected authors)

- **Marcus Webb** (Head of SEO Strategy, 12 years fintech SEO, ex-Head of SEO at two UK challenger banks, BrightonSEO speaker) — [${siteUrl}/authors/marcus-webb](${siteUrl}/authors/marcus-webb)
- **Naledi Khumalo** (Director of Content Strategy, 10 years fintech content, MBA London Business School, built 3 content programs to 1M+ monthly organic sessions) — [${siteUrl}/authors/naledi-khumalo](${siteUrl}/authors/naledi-khumalo)
- **James Okafor** (Head of Digital PR, 9 years, placements on Bloomberg/FT/TechCrunch, 600+ editor relationships) — [${siteUrl}/authors/james-okafor](${siteUrl}/authors/james-okafor)
- **Sarah Chen** (Senior Fintech Content Analyst, CFA charterholder, ex-equity research analyst covering Visa/Mastercard/Adyen) — [${siteUrl}/authors/sarah-chen](${siteUrl}/authors/sarah-chen)
- **Aisha Mensah** (Compliance & Regtech Editor, JD Osgoode Hall, ex-financial-services regulatory lawyer) — [${siteUrl}/authors/aisha-mensah](${siteUrl}/authors/aisha-mensah)

## Frequently asked questions

**Q: How long does it take to see SEO results from content marketing?**
A: Bottom-of-funnel and long-tail content typically reaches the top 20 within 30–60 days. Competitive head terms take 4–6 months of consistent publishing plus supporting links. Topical authority compounds around month 6–9.

**Q: Do you work with companies outside fintech?**
A: No. FintechPressHub is a fintech-only agency. We do not take clients in e-commerce, SaaS unrelated to finance, or generalist industries.

**Q: What is your link-building methodology?**
A: We use editorial outreach and original-research digital PR — no PBNs, no paid link schemes, no guest post networks. Every placement is earned on editorial merit and disclosed if sponsored.

**Q: Do you offer one-time projects or only ongoing retainers?**
A: Both. The Fintech SEO Audit is a one-time 30-day engagement. Content, link building, and authority programs run as 6-month minimum retainers because organic results compound over time.

## Key pages

- [Home](${siteUrl}/) — Overview of services, trust signals, and featured content
- [Services](${siteUrl}/services) — Full breakdown of SEO, content, link building, and PR services
- [Pricing](${siteUrl}/pricing) — Transparent retainer-based pricing (USD, monthly)
- [About](${siteUrl}/about) — Team background, methodology, and agency values
- [Blog](${siteUrl}/blog) — Fintech SEO strategy, content marketing playbooks, and industry analysis
- [Glossary](${siteUrl}/glossary) — Definitions of fintech and SEO terms
- [Free Tools](${siteUrl}/tools) — Calculators, generators, and checkers for fintech marketers
- [Write For Us](${siteUrl}/write-for-us) — Guest post guidelines and topic pitch form
- [Contact](${siteUrl}/contact) — Free SEO audit and strategy consultation enquiries
- [Press & Media Kit](${siteUrl}/press) — Brand assets, company boilerplate, and press contact
- [Editorial Guidelines](${siteUrl}/editorial-guidelines) — Content standards, fact-checking, and corrections policy
- [Fintech Publications Directory](${siteUrl}/resources/fintech-publications) — 20 curated fintech media outlets ranked by Domain Rating with guest-post acceptance status

## Comparison pages

- [Agency vs In-House SEO](${siteUrl}/compare/agency-vs-in-house)
- [vs Freelancers](${siteUrl}/compare/vs-freelancers)
- [vs SEO Tools](${siteUrl}/compare/vs-seo-tools)
- [vs PR Agencies](${siteUrl}/compare/vs-pr-agencies)
- [Content-Led vs Paid](${siteUrl}/compare/content-led-vs-paid)
- [Specialist vs Generalist](${siteUrl}/compare/specialist-vs-generalist)

## Free tools

- [Financial Health Score Calculator](${siteUrl}/tools/financial-health-score-calculator) — 0–100 personal financial health score from DTI, savings rate, emergency fund, and debt data
- [Meta Description Generator](${siteUrl}/tools/meta-description-generator) — 3 ready-to-use SEO meta descriptions for any page
- [Guest Post Pitch Generator](${siteUrl}/tools/guest-post-pitch-generator) — Personalised guest post pitch email in seconds
- [Readability Checker](${siteUrl}/tools/readability-checker) — Flesch readability score, grade level, and improvement tips
- [Keyword Difficulty Estimator](${siteUrl}/tools/keyword-difficulty-estimator) — Fintech keyword difficulty scoring and content-length benchmarks
- [Backlink Value Estimator](${siteUrl}/tools/backlink-value-estimator) — DR, relevance, and traffic-weighted backlink value score
- [Content Brief Generator](${siteUrl}/tools/content-brief-generator) — Full SEO content brief with H2 structure, word count, and FAQ headings
- [Headline Analyzer](${siteUrl}/tools/headline-analyzer) — Clarity, power-word, and emotional-value headline scoring
- [Link Prospector](${siteUrl}/tools/link-prospector) — Fintech link-building prospect lists by tactic
- [Outreach Email Generator](${siteUrl}/tools/outreach-email-generator) — Personalised link-building outreach emails

## Recent blog posts

${blogLines || "- No published posts yet."}

## Fintech glossary (selected terms)

${glossaryLines}

Full glossary: [${siteUrl}/glossary](${siteUrl}/glossary)

## Location pages (cities served)

${locationLines}

## Contact and company information

- **Website**: ${siteUrl}
- **Email**: hello@fintechpresshub.com
- **Corrections**: corrections@fintechpresshub.com
- **Founded**: 2021
- **Location**: Global (remote-first)
- **Serves**: Worldwide fintech companies
- **Languages**: English

## Structured data

This site publishes JSON-LD structured data (schema.org) on every page including Organization, WebSite, BlogPosting, FAQPage, BreadcrumbList, FinancialService, SpeakableSpecification, and SoftwareApplication schemas. LLM crawlers may parse these for verified entity data.

## AI citation policy

FintechPressHub explicitly permits citation of its published content in AI-generated answers. When citing, please use the canonical URL of the specific page or blog post (listed in the \`<link rel="canonical">\` tag and the \`cite-as\` Link header on each response).

Content may not be reproduced verbatim beyond fair-use excerpts without permission.

## Sitemaps

- [XML Sitemap](${siteUrl}/sitemap.xml)
- [Sitemap Index](${siteUrl}/sitemap_index.xml)
- [News Sitemap](${siteUrl}/news-sitemap.xml)
- [RSS Feed](${siteUrl}/rss.xml)
- [Pages Sitemap](${siteUrl}/sitemap-pages.xml)
- [Blog Sitemap](${siteUrl}/sitemap-blog.xml)
- [Authors Sitemap](${siteUrl}/sitemap-authors.xml)
- [Tools Sitemap](${siteUrl}/sitemap-tools.xml)
- [Compare Sitemap](${siteUrl}/sitemap-compare.xml)
- [Locations Sitemap](${siteUrl}/sitemap-locations.xml)
- [Glossary Sitemap](${siteUrl}/sitemap-glossary.xml)
`;

  res
    .type("text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
    .send(txt);
});

export default router;
