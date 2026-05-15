import { Router, type IRouter } from "express";
import { db, glossaryTermsTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { escapeXml } from "../lib/seoConstants";

const router: IRouter = Router();

function cdata(value: string): string {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/**
 * /glossary/rss.xml — RSS 2.0 feed of all published fintech glossary terms.
 *
 * Programmatic SEO: providing a dedicated RSS feed for the glossary gives
 * search engines and AI citation engines (Perplexity, ChatGPT Search) a
 * structured, machine-readable discovery channel for all 100+ glossary
 * terms — independent of the HTML sitemap and llms.txt routes.
 *
 * Off-Page: RSS subscribers and feed aggregators (Feedly, Inoreader, RSS
 * readers used by fintech journalists) distribute the feed passively,
 * generating awareness and potential link opportunities without active
 * outreach (Off-Page O-7).
 *
 * Technical: feed is cached for 1 hour (s-maxage=3600) to avoid DB pressure
 * under heavy crawl; stale-while-revalidate=86400 keeps it fresh on CDN.
 */
router.get("/glossary/rss.xml", async (_req, res) => {
  const siteUrl = getSiteUrl();

  const terms = await db
    .select({
      slug:      glossaryTermsTable.slug,
      term:      glossaryTermsTable.term,
      shortDef:  glossaryTermsTable.shortDef,
      category:  glossaryTermsTable.category,
      updatedAt: glossaryTermsTable.updatedAt,
      publishedAt: glossaryTermsTable.publishedAt,
    })
    .from(glossaryTermsTable)
    .orderBy(asc(glossaryTermsTable.term))
    .catch(() => [] as Array<{
      slug: string; term: string; shortDef: string;
      category: string | null; updatedAt: Date; publishedAt: Date;
    }>);

  const buildDate = terms.length > 0
    ? new Date(Math.max(...terms.map((t) => t.updatedAt.getTime()))).toUTCString()
    : new Date().toUTCString();

  const items = terms
    .map((t) => {
      const url = `${siteUrl}/glossary/${t.slug}`;
      const pubDate = t.publishedAt.toUTCString();
      const category = t.category ?? "Fintech";
      return (
        `    <item>\n` +
        `      <title>${cdata(t.term)}</title>\n` +
        `      <link>${escapeXml(url)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
        `      <description>${cdata(t.shortDef)}</description>\n` +
        `      <category>${cdata(category)}</category>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        `      <dc:creator>FintechPressHub Editorial Team</dc:creator>\n` +
        `    </item>`
      );
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>FintechPressHub Fintech Glossary</title>
    <link>${escapeXml(siteUrl)}/glossary</link>
    <description>Plain-English definitions for 100+ fintech terms — payments, embedded finance, open banking, regtech, neobanking, wealthtech, and lending. Written by fintech domain specialists.</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/glossary/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(siteUrl)}/api/og?title=Fintech+Glossary&amp;category=Glossary</url>
      <title>FintechPressHub Fintech Glossary</title>
      <link>${escapeXml(siteUrl)}/glossary</link>
    </image>
${items}
  </channel>
</rss>`;

  res
    .type("application/rss+xml; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
    .send(xml);
});

export default router;
