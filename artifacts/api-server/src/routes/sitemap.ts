import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";

const router: IRouter = Router();

const STATIC_ROUTES: Array<{
  path: string;
  changefreq: string;
  priority: string;
}> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "monthly", priority: "0.9" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/write-for-us", changefreq: "monthly", priority: "0.6" },
  { path: "/editorial-guidelines", changefreq: "yearly", priority: "0.4" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const posts = await db
    .select({
      slug: blogPostsTable.slug,
      publishedAt: blogPostsTable.publishedAt,
    })
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.publishedAt));

  const entries = [
    ...STATIC_ROUTES.map((r) => ({
      loc: `${siteUrl}${r.path === "/" ? "" : r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    })),
    ...posts.map((p) => ({
      loc: `${siteUrl}/blog/${p.slug}`,
      lastmod: p.publishedAt.toISOString().slice(0, 10),
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  const body = entries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `\n</urlset>\n`
  );
}

async function handleSitemap(
  _req: import("express").Request,
  res: import("express").Response,
): Promise<void> {
  const xml = await buildSitemapXml();
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
}

// Mounted at the root of the app (not under /api) so /sitemap.xml resolves
// directly. We also expose /api/sitemap.xml for callers that prefer the
// namespaced path.
router.get("/sitemap.xml", handleSitemap);

export default router;
