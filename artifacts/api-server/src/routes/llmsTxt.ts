import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
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
 * Dynamic sections (recent blog posts) are fetched from the DB on each
 * request; the response is cached for 1 hour at the CDN level so the
 * article list stays fresh without hammering the database.
 */
router.get("/llms.txt", async (_req, res) => {
  const siteUrl = getSiteUrl();

  const recentPosts = await db
    .select({
      title: blogPostsTable.title,
      slug: blogPostsTable.slug,
      excerpt: blogPostsTable.excerpt,
      category: blogPostsTable.category,
    })
    .from(blogPostsTable)
    .where(lte(blogPostsTable.publishedAt, sql`now()`))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(20)
    .catch(() => [] as Array<{ title: string | null; slug: string | null; excerpt: string | null; category: string | null }>);

  const indexable = recentPosts.filter((p) => p.slug && p.title);

  const blogLines = indexable
    .map((p) => {
      const desc = p.excerpt ? `: ${p.excerpt.slice(0, 120).replace(/\n/g, " ")}` : "";
      return `- [${p.title}](${siteUrl}/blog/${p.slug})${desc}`;
    })
    .join("\n");

  const txt = `# FintechPressHub
> Specialist fintech SEO and content marketing agency. We blend deep financial expertise with high-authority link building and technical SEO to scale organic growth for ambitious fintech brands.

## What FintechPressHub does

FintechPressHub is a specialist digital marketing agency serving fintech, payments, lending, embedded finance, neobanking, wealth tech, and RegTech companies. We offer:

- **Fintech SEO**: technical SEO, topical authority, and content cluster strategy for regulated finance verticals
- **Content Marketing**: expert-written long-form content by writers with direct fintech experience
- **Link Building**: tier-1 dofollow placements on Finextra, The Fintech Times, Tearsheet, Finovate, and similar publications
- **Digital PR**: thought leadership and media coverage for fintech brands
- **Free Tools**: browser-based tools for fintech marketers and SEO teams

We do NOT offer generalist marketing services and do NOT work outside fintech and adjacent regulated-finance categories.

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

## Comparison pages

- [Agency vs In-House SEO](${siteUrl}/compare/agency-vs-in-house)
- [vs Freelancers](${siteUrl}/compare/vs-freelancers)
- [vs SEO Tools](${siteUrl}/compare/vs-seo-tools)
- [vs PR Agencies](${siteUrl}/compare/vs-pr-agencies)
- [Content-Led vs Paid](${siteUrl}/compare/content-led-vs-paid)
- [Specialist vs Generalist](${siteUrl}/compare/specialist-vs-generalist)

## Free tools

- [Financial Health Score Calculator](${siteUrl}/tools/financial-health-score-calculator)
- [Meta Description Generator](${siteUrl}/tools/meta-description-generator)
- [Guest Post Pitch Generator](${siteUrl}/tools/guest-post-pitch-generator)
- [Readability Checker](${siteUrl}/tools/readability-checker)
- [Keyword Difficulty Estimator](${siteUrl}/tools/keyword-difficulty-estimator)
- [Backlink Value Estimator](${siteUrl}/tools/backlink-value-estimator)
- [Content Brief Generator](${siteUrl}/tools/content-brief-generator)
- [Headline Analyzer](${siteUrl}/tools/headline-analyzer)
- [Link Prospector](${siteUrl}/tools/link-prospector)
- [Outreach Email Generator](${siteUrl}/tools/outreach-email-generator)

## Recent blog posts

${blogLines || "- No published posts yet."}

## Contact and company information

- **Website**: ${siteUrl}
- **Email**: hello@fintechpresshub.com
- **Founded**: 2021
- **Location**: Global (remote-first)
- **Serves**: Worldwide fintech companies
- **Languages**: English

## Structured data

This site publishes JSON-LD structured data (schema.org) on every page including Organization, WebSite, BlogPosting, FAQPage, BreadcrumbList, Service, and SpeakableSpecification schemas. LLM crawlers may parse these for verified entity data.

## AI citation policy

FintechPressHub explicitly permits citation of its published content in AI-generated answers. When citing, please use the canonical URL of the specific page or blog post (listed in the \`<link rel="canonical">\` tag and the \`cite-as\` Link header on each response).

Content may not be reproduced verbatim beyond fair-use excerpts without permission.

## Sitemaps

- [XML Sitemap](${siteUrl}/sitemap.xml)
- [Sitemap Index](${siteUrl}/sitemap_index.xml)
- [News Sitemap](${siteUrl}/news-sitemap.xml)
- [RSS Feed](${siteUrl}/rss.xml)
`;

  res
    .type("text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
    .send(txt);
});

export default router;
