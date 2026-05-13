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
        title:       blogPostsTable.title,
        slug:        blogPostsTable.slug,
        excerpt:     blogPostsTable.excerpt,
        category:    blogPostsTable.category,
        noIndex:     blogPostsTable.noIndex,
        publishedAt: blogPostsTable.publishedAt,
      })
      .from(blogPostsTable)
      .where(lte(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(20)
      .catch(() => [] as Array<{ title: string | null; slug: string | null; excerpt: string | null; category: string | null; noIndex: boolean | null; publishedAt: Date }>),

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

  // Use the most-recently published post date as Last-Updated so AI bots see
  // a stable date that only changes when content actually changes, rather than
  // the HTTP request timestamp which changes on every cache miss.
  const mostRecentPost = indexable[0] ?? recentPosts[0];
  const lastUpdated = mostRecentPost?.publishedAt instanceof Date
    ? mostRecentPost.publishedAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

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

Last-Updated: ${lastUpdated}

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

- Plan: Starter | Price: ~$3,500/mo | Includes: 4 SEO articles + 5 guest post placements + monthly report
- Plan: Growth | Price: ~$7,000/mo | Includes: 8 articles + 10 placements + digital PR + quarterly strategy
- Plan: Authority | Price: ~$12,000/mo | Includes: 16 articles + 20 placements + full PR programme + dedicated strategist
- Plan: Enterprise | Price: Custom | Includes: Custom scope for Series B+ and public companies
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
- [Blog](${siteUrl}/blog) — Fintech SEO strategy, content marketing playbooks, and industry analysis. Topic tag feeds at /blog/tag/:slug (e.g. /blog/tag/payments, /blog/tag/open-banking)
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

## Authority signals

- PublishingPrinciples: ${siteUrl}/editorial-guidelines
- EditorialStandards: Expert-authored, fact-checked against primary sources, compliance-aware
- CorrectionsPolicy: corrections@fintechpresshub.com — corrections published within 48 hours
- ContentCategories: Fintech SEO, content marketing, link building, digital PR, payments, embedded finance, open banking, neobanking, lending, regtech, wealthtech
- YMYL: true (financial services content — Your Money or Your Life category)
- E-E-A-T: Authors are verified fintech professionals with direct industry experience
- LinkedInPage: https://www.linkedin.com/company/fintechpresshub

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

- [Full content index](${siteUrl}/llms-full.txt): Extended version with fuller blog excerpts, complete glossary definitions, full author bios, service FAQs, comparison FAQs, and complete tool descriptions — for AI systems that need richer context.
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
 *   - Pricing: formatted table with plan details
 *   - Tools: full descriptions of all 10 free tools
 *   - FAQ: expanded answers
 *   - Service FAQs: all 15 curated Q&As from service pages
 *   - Comparison FAQs: all expert Q&As from comparison pages
 *   - Authority signals: E-E-A-T and publishing principles
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

  // Use the most-recently published post date as Last-Updated so AI bots see
  // a stable date that only changes when content actually changes, rather than
  // the HTTP request timestamp which changes on every cache miss.
  const mostRecentPost = indexable[0] ?? recentPosts[0];
  const fullLastUpdated = mostRecentPost?.publishedAt instanceof Date
    ? mostRecentPost.publishedAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

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

Last-Updated: ${fullLastUpdated}

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

## Pricing (full plan details)

| Plan | Price (USD/month) | Articles/month | Placements/month | Target client |
|---|---|---|---|---|
| Starter | ~$3,500 | 4 | 5 | Early-stage fintechs building topical authority |
| Growth | ~$7,000 | 8 | 10 | Series A fintechs scaling organic acquisition |
| Authority | ~$12,000 | 16 | 20 | Series B+ companies targeting media coverage |
| Enterprise | Custom | Custom | Custom | Public companies and large financial institutions |

All retainers run on 6-month minimums. Month-to-month available at 20% premium. Full pricing: ${siteUrl}/pricing

## Service FAQs

### Fintech Content Writing — Frequently Asked Questions

**Q: What is fintech content writing?**
A: Fintech content writing is the creation of expert, compliance-aware written content — articles, whitepapers, case studies, and landing pages — tailored to audiences in financial technology. It requires deep knowledge of products like payments, lending, and open banking, as well as an understanding of regulatory requirements in markets such as the UK, US, EU, and APAC.

**Q: Why do fintech companies need specialist content writers?**
A: Fintech content sits in a YMYL (Your Money or Your Life) category that Google scrutinises under strict E-E-A-T criteria. Generic writers produce factual errors and compliance risks. Specialist fintech writers understand regulatory nuance, communicate complex financial products clearly, and produce content Google rewards with sustainable rankings.

**Q: What does a fintech content writing retainer include?**
A: A FintechPressHub content writing retainer includes topic research, full SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, on-page optimisation, internal linking, unlimited revisions before publication, and optional CMS upload.

### Off-Page SEO — Frequently Asked Questions

**Q: What is off-page SEO for fintech?**
A: Off-page SEO for fintech is the practice of building editorial backlinks, brand mentions, and authority signals from high-Domain Rating publications relevant to financial technology. It includes guest posting on Finextra, The Fintech Times, and similar outlets, as well as digital PR and strategic link placements.

**Q: Why is off-page SEO harder for fintech companies?**
A: Financial content is heavily scrutinised by editors and regulated by compliance requirements, making it far harder to earn placements on tier-1 finance publications than on generic blogs. Fintech companies need specialist editorial relationships and proven writer credentials to secure links that actually move rankings.

**Q: How long does off-page SEO take to show results for fintech?**
A: First links can be placed within 4–6 weeks. Meaningful ranking movement typically emerges after 3–4 months of consistent link acquisition. Compounding authority — where each new link amplifies the impact of existing ones — becomes visible around month 6–9 for most fintech keywords.

### Guest Posting — Frequently Asked Questions

**Q: What is guest posting for fintech?**
A: Guest posting for fintech is the process of placing expert articles on high-authority financial publications — such as Finextra, Tearsheet, and The Fintech Times — that include a dofollow editorial backlink to your site. Each placement builds domain authority and exposes your brand to the readership of those publications.

**Q: Are the guest post backlinks dofollow?**
A: Yes. FintechPressHub secures permanent, dofollow backlinks from publications with Domain Rating 60 or higher. We do not use PBNs, link farms, or paid-placement networks that violate Google's guidelines.

**Q: How do you pitch guest posts for fintech companies?**
A: Our team researches the editorial calendar and contributor requirements of each target publication, crafts a tailored pitch matching the publication's current coverage gaps, and writes the article once the pitch is accepted. The entire process — pitch, writing, editing, and placement — is managed on your behalf.

### Topical Authority — Frequently Asked Questions

**Q: What is topical authority in fintech SEO?**
A: Topical authority is the degree to which Google treats a website as the definitive source on a given subject. For fintech, it means systematically covering every angle of a topic cluster — from introductory definitions to advanced practitioner guides — so Google's algorithms rank your content preferentially across the entire subject area.

**Q: How do you build topical authority for a fintech brand?**
A: Topical authority is built through a structured content cluster strategy: one high-quality pillar page per major topic (e.g. payment orchestration) supported by 8–15 cluster articles covering related subtopics, definitions, comparisons, and use cases. Internal linking ties the cluster together, and supporting backlinks signal authority to Google.

**Q: How long does it take to establish topical authority in fintech?**
A: A well-executed topical authority programme typically takes 4–6 months to show measurable ranking gains on cluster content and 9–12 months for the pillar page to rank in positions 1–5 for competitive head terms. The compounding effect accelerates after the 6-month mark as internal linking density and backlink volume reach critical thresholds.

### Fintech SEO Audit — Frequently Asked Questions

**Q: What is a fintech SEO audit?**
A: A fintech SEO audit is a comprehensive analysis of a financial technology company's organic search performance — covering technical site health, on-page optimisation, content gaps, E-E-A-T signals, backlink profile quality, and YMYL compliance. The output is a prioritised action plan with clear effort-to-impact estimates.

**Q: What does a FintechPressHub SEO audit include?**
A: Our audit covers: technical crawlability and Core Web Vitals, structured data validation, content gap analysis against top-ranking competitors, E-E-A-T signals (author credentials, trust signals, editorial standards), backlink profile health and disavow recommendations, site architecture and internal linking, and a 90-day action roadmap.

**Q: How often should a fintech company run an SEO audit?**
A: A comprehensive SEO audit is recommended at least once per year, and after any major site redesign, CMS migration, or Google core update. Fintech companies in regulated verticals should also audit after any significant product launch or regulatory change that affects their content strategy.

## Comparison page FAQs

### Agency vs In-House — Frequently Asked Questions

**Q: What does a fintech SEO agency cost compared to an in-house team?**
A: A mid-tier fintech SEO retainer typically runs $5,000–$15,000/month, covering strategy, content, and link building. Building an equivalent in-house team (SEO lead, writer, digital PR) typically costs $200,000–$350,000/year in salaries, benefits, and tooling — 3–4× the retainer cost for comparable output in year one.

**Q: When should a fintech company hire in-house SEO instead of using an agency?**
A: In-house SEO makes sense when your company has Series B+ funding, a content roadmap requiring 20+ pieces per month, or a need for deeply embedded institutional knowledge. For most pre-Series B fintechs, the speed-to-output and specialist expertise of a focused agency outweigh the control benefits of an in-house hire.

### Agency vs Freelancers — Frequently Asked Questions

**Q: Are freelance fintech writers cheaper than an agency?**
A: Per-piece rates from experienced freelance fintech writers range from $300–$1,500 per article. When all costs are included — brief creation, editing rounds, keyword research, and internal coordination — a managed agency is typically 20–40% cheaper at equivalent quality and produces more consistent output.

**Q: What is the biggest risk of using freelance fintech writers?**
A: The primary risks are inconsistency and compliance exposure. Freelancers vary in quality between assignments, have no obligation to follow your evolving messaging guidelines, and rarely carry professional indemnity insurance for factual errors in regulated-finance content.

### Agency vs SEO Tools — Frequently Asked Questions

**Q: Can Ahrefs or Semrush replace a fintech SEO agency?**
A: SEO tools provide data — keyword volumes, backlink counts, technical audits — but not execution. A tool can tell you that "payment orchestration" is a high-value keyword; it cannot create authoritative content, build links from Finextra, or maintain a topical-authority content cluster. Agencies own the strategy and do the work; tools are inputs.

**Q: How much do enterprise SEO tools cost versus a fintech SEO agency?**
A: Enterprise Ahrefs or Semrush plans run $500–$1,000/month. Add a content writer, link-builder, and strategist and you're at $11,500–$22,000/month to replicate what a specialist fintech SEO retainer delivers at $5,000–$12,000/month.

### Agency vs PR Agencies — Frequently Asked Questions

**Q: What is the difference between fintech SEO and traditional PR?**
A: Traditional PR targets brand awareness through press placements measured in reach and impressions. Fintech SEO targets organic search rankings through keyword-optimised content and editorial backlinks measured in traffic and conversions. The best fintech programmes combine both — digital PR earns links that amplify SEO, while SEO content gives journalists data worth covering.

**Q: Can a PR agency do fintech SEO?**
A: Most PR agencies lack the technical SEO knowledge (structured data, Core Web Vitals, topical clustering) and content production bandwidth to run an effective SEO programme. PR and SEO are complementary channels that require different skill sets — specialist agencies for each typically outperform a generalist trying to do both.

### Content-Led vs Paid — Frequently Asked Questions

**Q: Is content SEO or Google Ads better for fintech?**
A: For fintech B2B companies with average contract values above $10,000/year, content SEO typically delivers better long-term ROI. Paid search has an immediate impact but stops generating leads the day you pause spend. Content compounds: a well-ranked pillar page published in year one continues driving qualified pipeline in year three with minimal ongoing investment.

**Q: What is the customer acquisition cost (CAC) difference between content SEO and paid search for fintech?**
A: Mature content SEO programmes typically achieve CAC of $500–$2,000 per B2B fintech lead at scale. Comparable paid search CAC in competitive fintech verticals (payments, lending) typically runs $2,000–$8,000 per lead. The crossover point where content becomes more efficient than paid usually occurs around month 9–12 of a consistent content programme.

### Specialist vs Generalist — Frequently Asked Questions

**Q: Why does specialisation matter for fintech SEO?**
A: Google's Quality Rater Guidelines require demonstrable expertise, authoritativeness, and trustworthiness (E-E-A-T) for YMYL content. A generalist agency writing about payment orchestration or DORA compliance cannot demonstrate the first-hand expertise Google rewards. Specialist agencies command credible placement on trade publications, produce factually accurate content that passes editorial review, and avoid the compliance errors that can trigger manual penalties.

**Q: How do I evaluate whether an SEO agency understands fintech?**
A: Ask them to name the top 10 fintech publications by Domain Rating, explain the E-E-A-T implications of PSD3 for UK fintech companies, and describe how topical authority clusters apply to a payments company's keyword strategy. If they cannot answer all three fluently, they are generalists who will treat your brand as a case study.

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

## Authority signals

- PublishingPrinciples: ${siteUrl}/editorial-guidelines
- EditorialStandards: Expert-authored, fact-checked against primary sources, compliance-aware for YMYL financial content
- CorrectionsPolicy: corrections@fintechpresshub.com — corrections published within 48 hours of confirmation
- ContentCategories: Fintech SEO, content marketing, link building, digital PR, payments, embedded finance, open banking, neobanking, lending, regtech, wealthtech
- YMYL: true (financial services content — Your Money or Your Life category under Google's Quality Rater Guidelines)
- E-E-A-T: Authors are verified fintech professionals with direct industry operating experience
- LinkedInPage: https://www.linkedin.com/company/fintechpresshub

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
