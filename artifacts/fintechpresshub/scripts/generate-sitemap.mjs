import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SITE_URL = process.env.VITE_SITE_URL || "https://www.fintechpresshub.com";

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "monthly", priority: "0.9" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/authors", changefreq: "monthly", priority: "0.7" },
  { path: "/write-for-us", changefreq: "monthly", priority: "0.6" },
  { path: "/editorial-guidelines", changefreq: "yearly", priority: "0.4" },
  {
    path: "/tools/financial-health-score-calculator",
    changefreq: "monthly",
    priority: "0.7",
  },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

const postsModule = await import(
  pathToFileURL(resolve(projectRoot, "src/data/posts.js")).href
);
const posts = postsModule.default ?? [];

// authors.ts is TypeScript and can't be dynamically imported in plain Node.
// The data file is a flat array of object literals — extract slugs with a regex.
const authorsSource = await readFile(
  resolve(projectRoot, "src/data/authors.ts"),
  "utf8",
);
const authors = Array.from(
  authorsSource.matchAll(/slug:\s*["']([a-z0-9-]+)["']/g),
).map((m) => ({ slug: m[1] }));

// Service slugs come from the canonical seed-data JSON used by the API server.
const servicesJson = await readFile(
  resolve(projectRoot, "..", "..", "lib", "db", "src", "seed-data", "services.json"),
  "utf8",
);
const services = JSON.parse(servicesJson);

const today = new Date().toISOString().slice(0, 10);

const urlEntries = [
  ...STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastmod: today,
    changefreq: r.changefreq,
    priority: r.priority,
  })),
  ...services.map((s) => ({
    loc: `${SITE_URL}/services/${s.slug}`,
    lastmod: today,
    changefreq: "monthly",
    priority: "0.8",
  })),
  ...posts.map((p) => ({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: p.date || today,
    changefreq: "monthly",
    priority: "0.7",
  })),
  ...authors.map((a) => ({
    loc: `${SITE_URL}/authors/${a.slug}`,
    lastmod: today,
    changefreq: "monthly",
    priority: "0.6",
  })),
];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urlEntries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${u.loc}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

const outPath = resolve(projectRoot, "public/sitemap.xml");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, xml, "utf8");

console.log(
  `Wrote ${urlEntries.length} URLs (${STATIC_ROUTES.length} static + ${posts.length} posts + ${authors.length} authors) to ${outPath}`,
);
