import { Router, type IRouter } from "express";
import { db, blogPostsTable, glossaryTermsTable, locationPagesTable, authorsTable } from "@workspace/db";
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

  const [recentPosts, glossaryTerms, locationPages, authorTeam] = await Promise.all([
    db
      .select({
        title:    blogPostsTable.title,
        slug:     blogPostsTable.slug,
        excerpt:  blogPostsTable.excerpt,
        category: blogPostsTable.category,
        noIndex:  blogPostsTable.noIndex,
      })
      .from(blogPostsTable)
      .where(lte(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(20)
      .catch(() => [] as Array<{ title: string | null; slug: string | null; excerpt: string | null; category: string | null; noIndex: boolean | null }>),

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

    db
      .select({
        name:            authorsTable.name,
        role:            authorsTable.role,
        slug:            authorsTable.slug,
        shortBio:        authorsTable.shortBio,
        yearsExperience: authorsTable.yearsExperience,
      })
      .from(authorsTable)
      .orderBy(asc(authorsTable.name))
      .limit(10)
      .catch(() => [] as Array<{ name: string; role: string; slug: string; shortBio: string; yearsExperience: number }>),
  ]);

  const indexable = recentPosts.filter((p) => p.slug && p.title && !p.noIndex);

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

${authorTeam.length > 0
  ? authorTeam.map((a) => {
      const yoe = a.yearsExperience > 0 ? `, ${a.yearsExperience} years experience` : "";
      const bio = a.shortBio ? ` — ${a.shortBio.slice(0, 120).replace(/\n/g, " ")}` : "";
      return `- **${a.name}** (${a.role}${yoe})${bio} — [${siteUrl}/authors/${a.slug}](${siteUrl}/authors/${a.slug})`;
    }).join("\n")
  : "- No authors published yet."}

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
- [Blog Tags](${siteUrl}/blog/tag) — Browse articles by topic tag (e.g. /blog/tag/payments, /blog/tag/open-banking)
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
- [Tags Sitemap](${siteUrl}/sitemap-tags.xml)
- [Authors Sitemap](${siteUrl}/sitemap-authors.xml)
- [Tools Sitemap](${siteUrl}/sitemap-tools.xml)
- [Compare Sitemap](${siteUrl}/sitemap-compare.xml)
- [Locations Sitemap](${siteUrl}/sitemap-locations.xml)
- [Glossary Sitemap](${siteUrl}/sitemap-glossary.xml)

## Optional

- [Full content index](${siteUrl}/llms-full.txt): Extended version with fuller blog excerpts, complete glossary definitions, full author bios, and complete tool descriptions — for AI systems that need richer context.
`;

  res
    .type("text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
    .send(txt);
});

/**
 * /llms-full.txt — Extended AI-readable content index.
 *
 * The llmstxt.org specification recommends a companion "full" file that
 * exposes more complete content so AI tools (Perplexity, ChatGPT Search,
 * Claude, Gemini) can ingest full context rather than just summaries.
 *
 * Differences from /llms.txt:
 *   - Blog posts: up to 50 entries with 500-char excerpts (vs 20 / 120 chars)
 *   - Glossary: all published terms with full shortDef (vs 30 / 100 chars)
 *   - Authors: full short bio text (vs truncated)
 *   - Location pages: all entries with headline (vs all, same)
 *   - Pricing: complete plan descriptions
 *   - Tools: full descriptions of all 10 free tools
 *   - FAQ: expanded answers
 */
router.get("/llms-full.txt", async (_req, res) => {
  const siteUrl = getSiteUrl();

  const [recentPosts, glossaryTerms, locationPages, authorTeam] = await Promise.all([
    db
      .select({
        title:    blogPostsTable.title,
        slug:     blogPostsTable.slug,
        excerpt:  blogPostsTable.excerpt,
        category: blogPostsTable.category,
        publishedAt: blogPostsTable.publishedAt,
        noIndex:  blogPostsTable.noIndex,
      })
      .from(blogPostsTable)
      .where(lte(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(50)
      .catch(() => [] as Array<{ title: string | null; slug: string | null; excerpt: string | null; category: string | null; publishedAt: Date; noIndex: boolean | null }>),

    db
      .select({
        slug:     glossaryTermsTable.slug,
        term:     glossaryTermsTable.term,
        shortDef: glossaryTermsTable.shortDef,
        category: glossaryTermsTable.category,
      })
      .from(glossaryTermsTable)
      .orderBy(asc(glossaryTermsTable.term))
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

    db
      .select({
        name:            authorsTable.name,
        role:            authorsTable.role,
        slug:            authorsTable.slug,
        shortBio:        authorsTable.shortBio,
        yearsExperience: authorsTable.yearsExperience,
      })
      .from(authorsTable)
      .orderBy(asc(authorsTable.name))
      .catch(() => [] as Array<{ name: string; role: string; slug: string; shortBio: string; yearsExperience: number }>),
  ]);

  const indexable = recentPosts.filter((p) => p.slug && p.title && !p.noIndex);

  const blogLines = indexable
    .map((p) => {
      const pubDate = p.publishedAt instanceof Date
        ? p.publishedAt.toISOString().slice(0, 10)
        : String(p.publishedAt).slice(0, 10);
      const excerpt = p.excerpt ? `\n  Excerpt: ${p.excerpt.slice(0, 500).replace(/\n/g, " ")}` : "";
      return `- [${p.title}](${siteUrl}/blog/${p.slug}) [${p.category ?? "General"}, ${pubDate}]${excerpt}`;
    })
    .join("\n\n");

  const glossaryLines = glossaryTerms.length > 0
    ? glossaryTerms
        .map((t) => `- **${t.term}** [${t.category ?? "General"}]: ${t.shortDef}\n  URL: ${siteUrl}/glossary/${t.slug}`)
        .join("\n\n")
    : "- No glossary terms published yet.";

  const locationLines = locationPages.length > 0
    ? locationPages
        .map((l) => `- [${l.headline}](${siteUrl}/locations/${l.slug}) — ${l.city}, ${l.country}`)
        .join("\n")
    : "- No location pages published yet.";

  const txt = `# FintechPressHub — Full Content Index for AI Systems
> This is the extended version of /llms.txt following the llmstxt.org specification.
> It provides fuller content for AI systems that need complete context for accurate citations.

## About FintechPressHub

FintechPressHub is a specialist digital marketing agency serving fintech, payments, lending, embedded finance, neobanking, wealthtech, and RegTech companies. Founded 2021. Remote-first, serving worldwide.

We do NOT offer generalist marketing services. We only work with fintech and adjacent regulated-finance companies.

**Core belief**: Fintech SEO requires domain expertise. A generalist agency cannot write credibly about ISO 20022, PSD3, or DORA compliance. Our writers have worked inside the companies they now write about.

## Services (complete descriptions)

### Fintech Content Writing
URL: ${siteUrl}/services/fintech-content-writing
Expert-written long-form content by writers with direct fintech operating experience. Deliverables include pillar pages (3,000–8,000 words), comparison guides, explainers, technical documentation for developer audiences, data-driven studies, and white papers. All content is fact-checked against primary sources and complies with applicable financial promotion regulations.

Sub-verticals: Fintech Content Marketing, Payments Content, Embedded Finance, B2B Lending Content, Open Banking, Neobanking, RegTech Content, Wealthtech Content, BNPL Content, Financial Services Copywriting.

### Off-Page SEO & Link Building
URL: ${siteUrl}/services/off-page-seo
Tier-1 dofollow placements on Finextra, The Fintech Times, Tearsheet, Finovate, AltFi, FinanceMagnates, and 50+ niche finance publications. Average 15+ placements per month per client. All links are earned through editorial outreach and original research — no paid link schemes, no PBNs.

### Guest Posting
URL: ${siteUrl}/services/guest-posting
Managed guest post campaigns on high-DR fintech publications. Includes topic ideation, pitch writing, full article production, editing, and live placement tracking. Each campaign is reported monthly with Domain Rating, traffic estimates, and anchor text distribution.

### Topical Authority Building
URL: ${siteUrl}/services/topical-authority
Technical SEO, topical authority, and content cluster strategy for regulated finance verticals. Covers site audits, Core Web Vitals optimisation, structured data implementation, internal linking, content gap analysis, and keyword mapping. Typically delivered as a 90-day sprint followed by a quarterly maintenance retainer.

### Fintech SEO Audit
URL: ${siteUrl}/services/fintech-seo-audit
Comprehensive 30-day technical and content audit with a prioritised 90-day roadmap. Deliverables: technical audit report (crawl errors, Core Web Vitals, structured data), content gap analysis against top-3 competitors, keyword opportunity map, and a roadmap with effort/impact scoring. One-time engagement; no retainer required.

## Pricing (full plan descriptions)

- **Starter** (~$3,500/month): 4 SEO-optimised articles per month + 5 dofollow guest post placements + monthly performance report. Best for early-stage fintechs building topical authority.
- **Growth** (~$7,000/month): 8 articles + 10 placements + digital PR coverage + quarterly strategy session. Best for Series A fintechs scaling organic acquisition.
- **Authority** (~$12,000/month): 16 articles + 20 placements + full PR programme (press releases, journalist outreach, data studies) + dedicated strategist. Best for Series B+ companies targeting media coverage.
- **Enterprise**: Custom scope for public companies and large financial institutions. Includes compliance review of all content before publication.
- Full pricing page: ${siteUrl}/pricing

All retainers run on 6-month minimums. Month-to-month is available at a 20% premium.

## Free Tools

- **Financial Health Score Calculator** (${siteUrl}/tools/financial-health-score-calculator): Generates a 0–100 personal financial health score from debt-to-income ratio, savings rate, emergency fund coverage, and total debt load. Suitable for consumer fintech content about financial wellness.

- **Meta Description Generator** (${siteUrl}/tools/meta-description-generator): Produces 3 ready-to-use SEO meta descriptions (150–160 characters each) for any page title and target keyword.

- **Guest Post Pitch Generator** (${siteUrl}/tools/guest-post-pitch-generator): Creates a personalised pitch email for any fintech publication based on the user's name, company, expertise, and proposed article title.

- **Readability Checker** (${siteUrl}/tools/readability-checker): Calculates Flesch Reading Ease score, Flesch-Kincaid Grade Level, average sentence length, average syllables per word, and improvement recommendations.

- **Keyword Difficulty Estimator** (${siteUrl}/tools/keyword-difficulty-estimator): Returns a 0–100 difficulty score, search intent classification, estimated monthly volume range, and 6 long-tail keyword variations for any fintech keyword.

- **Backlink Value Estimator** (${siteUrl}/tools/backlink-value-estimator): Scores any referring domain using a weighted formula across Domain Authority, monthly organic traffic, and topical relevance (1–10 scale).

- **Content Brief Generator** (${siteUrl}/tools/content-brief-generator): Produces a full SEO content brief with recommended headings (H2/H3), target word count, questions to answer, key statistics to include, and internal linking suggestions.

- **Headline Analyzer** (${siteUrl}/tools/headline-analyzer): Scores headlines across SEO power words, emotional impact, readability, and clarity. Returns an overall score and per-dimension breakdown with improvement suggestions.

- **Link Prospector** (${siteUrl}/tools/link-prospector): Generates link-building prospect lists by tactic (guest posting, resource page links, digital PR, broken link building) filtered by fintech sub-vertical.

- **Outreach Email Generator** (${siteUrl}/tools/outreach-email-generator): Produces personalised link-building outreach emails with multiple subject line variants scored on predicted open rates.

## Editorial team

${authorTeam.length > 0
  ? authorTeam.map((a) => {
      const yoe = a.yearsExperience > 0 ? `, ${a.yearsExperience} years experience` : "";
      return `### ${a.name} (${a.role}${yoe})\nBio: ${a.shortBio}\nProfile: ${siteUrl}/authors/${a.slug}\nRSS feed: ${siteUrl}/authors/${a.slug}/rss.xml`;
    }).join("\n\n")
  : "No authors published yet."}

## Blog posts (up to 50 most recent)

${blogLines || "- No published posts yet."}

## Fintech glossary (all published terms)

${glossaryLines}

Full glossary: ${siteUrl}/glossary

## Location pages

${locationLines}

## Comparison pages (full list)

- [Agency vs In-House SEO for Fintech](${siteUrl}/compare/agency-vs-in-house): When to hire an agency vs build an in-house SEO team, with a decision framework for fintech companies at different growth stages.
- [FintechPressHub vs Freelancers](${siteUrl}/compare/vs-freelancers): Cost, quality, accountability, and delivery speed comparison between a specialist agency and independent freelancers.
- [Agency vs SEO Tools](${siteUrl}/compare/vs-seo-tools): What a managed agency delivers that tools like Ahrefs, Semrush, or Clearscope cannot replace.
- [Agency vs PR Agencies](${siteUrl}/compare/vs-pr-agencies): How fintech SEO agencies and traditional PR firms differ in goals, deliverables, and measurement.
- [Content-Led vs Paid Acquisition](${siteUrl}/compare/content-led-vs-paid): Organic content vs paid search and social for fintech customer acquisition, including CAC and payback period analysis.
- [Specialist vs Generalist Agency](${siteUrl}/compare/specialist-vs-generalist): Why domain expertise matters in fintech content and the risks of working with generalist agencies on regulated financial topics.

## Structured data

This site publishes JSON-LD structured data on every page including: Organization, WebSite (with SearchAction), BlogPosting, FAQPage, BreadcrumbList, FinancialService, DefinedTerm, DefinedTermSet, SoftwareApplication, HowTo, CollectionPage, ItemList, ProfilePage, Person, LocalBusiness, ContactPage, WriteAction, and Offer schemas.

## AI citation policy

FintechPressHub explicitly permits citation of its published content in AI-generated answers. When citing, use the canonical URL of the specific page. Content may not be reproduced verbatim beyond fair-use excerpts.

## Sitemaps and feeds

- Sitemap index: ${siteUrl}/sitemap_index.xml (10 child sitemaps)
- Blog sitemap: ${siteUrl}/sitemap-blog.xml
- Glossary sitemap: ${siteUrl}/sitemap-glossary.xml
- Locations sitemap: ${siteUrl}/sitemap-locations.xml
- Authors sitemap: ${siteUrl}/sitemap-authors.xml
- Tools sitemap: ${siteUrl}/sitemap-tools.xml
- Compare sitemap: ${siteUrl}/sitemap-compare.xml
- Services sitemap: ${siteUrl}/sitemap-services.xml
- Google News sitemap: ${siteUrl}/news-sitemap.xml
- RSS feed (all): ${siteUrl}/rss.xml
- RSS feed (per author): ${siteUrl}/authors/:slug/rss.xml
- RSS feed (per category): ${siteUrl}/blog/category/:slug/rss.xml
- RSS feed (per tag): ${siteUrl}/blog/tag/:slug/rss.xml
- Tags sitemap: ${siteUrl}/sitemap-tags.xml
- Compact summary: ${siteUrl}/llms.txt
`;

  res
    .type("text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
    .send(txt);
});

export default router;
