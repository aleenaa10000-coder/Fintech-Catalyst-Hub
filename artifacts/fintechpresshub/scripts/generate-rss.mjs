import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SITE_URL = process.env.VITE_SITE_URL || "https://www.fintechpresshub.com";
const SITE_NAME = "FintechPressHub";
const SITE_DESCRIPTION =
  "Insights, playbooks, and field reports on fintech SEO, content marketing, and digital PR.";

const escapeXml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cdata = (s) => `<![CDATA[${String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

const postsModule = await import(
  pathToFileURL(resolve(projectRoot, "src/data/posts.js")).href
);
const posts = (postsModule.default ?? [])
  .slice()
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const lastBuildDate = new Date().toUTCString();

const items = posts
  .map((p) => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    const pubDate = new Date(p.date).toUTCString();
    return (
      `    <item>\n` +
      `      <title>${cdata(p.title)}</title>\n` +
      `      <link>${escapeXml(url)}</link>\n` +
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
      `      <pubDate>${pubDate}</pubDate>\n` +
      (p.author ? `      <dc:creator>${cdata(p.author)}</dc:creator>\n` : "") +
      (p.category ? `      <category>${cdata(p.category)}</category>\n` : "") +
      (p.excerpt
        ? `      <description>${cdata(p.excerpt)}</description>\n`
        : "") +
      (p.content
        ? `      <content:encoded>${cdata(p.content)}</content:encoded>\n`
        : "") +
      `    </item>`
    );
  })
  .join("\n");

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<rss version="2.0"\n` +
  `  xmlns:content="http://purl.org/rss/1.0/modules/content/"\n` +
  `  xmlns:dc="http://purl.org/dc/elements/1.1/"\n` +
  `  xmlns:atom="http://www.w3.org/2005/Atom">\n` +
  `  <channel>\n` +
  `    <title>${escapeXml(SITE_NAME)}</title>\n` +
  `    <link>${escapeXml(SITE_URL)}</link>\n` +
  `    <description>${escapeXml(SITE_DESCRIPTION)}</description>\n` +
  `    <language>en-us</language>\n` +
  `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
  `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />\n` +
  `${items}\n` +
  `  </channel>\n` +
  `</rss>\n`;

const outPath = resolve(projectRoot, "public/rss.xml");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, xml, "utf8");

console.log(`Wrote ${posts.length} items to ${outPath}`);
