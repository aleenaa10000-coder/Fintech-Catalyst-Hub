import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAGE_META,
  HOME_FAQS,
  PRICING_FAQS,
  CONTACT_FAQS,
  ABOUT_PAGE,
  SERVICE_FAQS,
  AUTHORS,
} from "./bot-og-data.mjs";

const BOT_REGEX =
  /(googlebot|bingbot|yandex|baiduspider|duckduckbot|twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|embedly|pinterest|redditbot|applebot|skypeuripreview|vkshare|tumblr|bitrix|xing-contenttabreceiver|google-inspectiontool|googleother|chatgpt|gptbot|perplexitybot|claudebot|amazonbot|mj12bot|ahrefsbot|semrushbot)/i;

const BREADCRUMB_LABELS = {
  about: "About",
  services: "Services",
  pricing: "Pricing",
  blog: "Blog",
  authors: "Authors",
  "write-for-us": "Write For Us",
  contact: "Contact",
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Refund Policy",
  "cookie-policy": "Cookie Policy",
  terms: "Terms",
  "editorial-guidelines": "Editorial Guidelines",
  tools: "Tools",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ldEscape(jsonString) {
  return jsonString
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function fmtSlug(slug) {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ---------- schema builders ----------

function organizationSchema(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: "FintechPressHub",
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    description:
      "Specialized content marketing and SEO agency for fintech companies.",
    sameAs: [
      "https://twitter.com/fintechpresshub",
      "https://www.linkedin.com/company/fintechpresshub",
    ],
  };
}

function websiteSchema(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "FintechPressHub",
    url: siteUrl,
    publisher: { "@id": `${siteUrl}#organization` },
    inLanguage: "en",
  };
}

function breadcrumbSchema(pathname, leafTitle, siteUrl) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items = [{ name: "Home", item: siteUrl }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLeaf = i === segments.length - 1;
    const known = BREADCRUMB_LABELS[seg];
    const fallback = fmtSlug(seg);
    const name = isLeaf ? leafTitle || known || fallback : known || fallback;
    items.push({ name, item: `${siteUrl}${acc}` });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };
}

function faqSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

function articleSchema({ post, image, url, siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? "",
    image: [image],
    datePublished: post.date ?? post.publishedAt ?? undefined,
    dateModified:
      post.dateModified ?? post.updatedAt ?? post.date ?? post.publishedAt ?? undefined,
    author: post.author
      ? {
          "@type": "Person",
          name: post.author,
          ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "FintechPressHub",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/apple-touch-icon.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category ?? undefined,
    keywords:
      Array.isArray(post.tags) && post.tags.length
        ? post.tags.join(", ")
        : undefined,
    url,
    inLanguage: "en",
  };
}

function serviceSchema({ service, url, siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    serviceType: service.name,
    areaServed: "Worldwide",
    url,
    provider: {
      "@type": "Organization",
      name: "FintechPressHub",
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
    },
    ...(Array.isArray(service.deliverables) && service.deliverables.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${service.name} — what's included`,
            itemListElement: service.deliverables.map((d) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: d },
            })),
          },
        }
      : {}),
  };
}

function personSchema({ author, url, siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: author.name,
      jobTitle: author.role,
      description: author.shortBio,
      image: `${siteUrl}${author.photo}`,
      url,
      sameAs: [author.social?.linkedin, author.social?.twitter, author.social?.website].filter(
        Boolean,
      ),
      knowsAbout: author.expertise,
      ...(Array.isArray(author.credentials) && author.credentials.length > 0
        ? { award: author.credentials }
        : {}),
      address: author.location
        ? { "@type": "PostalAddress", addressLocality: author.location }
        : undefined,
      worksFor: {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "FintechPressHub",
        url: siteUrl,
      },
    },
  };
}

function aboutPageSchema({ url, siteUrl, employees }) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url,
    name: PAGE_META.about.title,
    description: ABOUT_PAGE.description,
    mainEntity: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "FintechPressHub",
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description: ABOUT_PAGE.description,
      slogan: ABOUT_PAGE.slogan,
      knowsAbout: ABOUT_PAGE.knowsAbout,
      numberOfEmployees: {
        "@type": "QuantitativeValue",
        value: employees.length,
      },
      employee: employees.map((e) => ({
        "@type": "Person",
        name: e.name,
        jobTitle: e.role,
        url: `${siteUrl}/authors/${e.slug}`,
        image: `${siteUrl}${e.photo}`,
        knowsAbout: e.expertise,
        sameAs: [e.social?.linkedin, e.social?.twitter, e.social?.website].filter(Boolean),
        worksFor: { "@type": "Organization", name: "FintechPressHub" },
      })),
    },
  };
}

function itemListSchema({ name, items }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

// ---------- HTML injection ----------

function shellInject(html, meta) {
  const {
    title,
    description,
    canonical,
    ogType,
    ogImage,
    ogImageAlt,
    schemas,
    extraMeta,
  } = meta;

  const setContent = (regex, value) => {
    html = html.replace(regex, (match) =>
      match.replace(/content="[^"]*"/, `content="${escapeHtml(value)}"`),
    );
  };

  if (title) {
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    );
  }
  if (description) {
    setContent(/<meta\s+name="description"[^>]*>/, description);
  }

  setContent(/<meta\s+property="og:type"[^>]*>/, ogType ?? "website");
  setContent(/<meta\s+property="og:url"[^>]*>/, canonical);
  if (title) setContent(/<meta\s+property="og:title"[^>]*>/, title);
  if (description) setContent(/<meta\s+property="og:description"[^>]*>/, description);
  setContent(/<meta\s+property="og:image"(?!:)[^>]*>/, ogImage);
  setContent(/<meta\s+property="og:image:secure_url"[^>]*>/, ogImage);
  if (ogImageAlt) setContent(/<meta\s+property="og:image:alt"[^>]*>/, ogImageAlt);

  setContent(/<meta\s+name="twitter:url"[^>]*>/, canonical);
  if (title) setContent(/<meta\s+name="twitter:title"[^>]*>/, title);
  if (description) setContent(/<meta\s+name="twitter:description"[^>]*>/, description);
  setContent(/<meta\s+name="twitter:image"(?!:)[^>]*>/, ogImage);
  if (ogImageAlt) setContent(/<meta\s+name="twitter:image:alt"[^>]*>/, ogImageAlt);

  // Strip any pre-existing canonical, then inject the per-route canonical.
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");

  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" data-bot-og="canonical" />`;

  const ldScripts = (schemas || [])
    .filter(Boolean)
    .map((s) => {
      const json = JSON.stringify(s, (_k, v) => (v === undefined ? undefined : v));
      return `<script type="application/ld+json" data-bot-og="schema">${ldEscape(json)}</script>`;
    })
    .join("\n    ");

  const extra = (extraMeta || []).join("\n    ");

  html = html.replace(
    /<\/head>/i,
    `    ${canonicalTag}${extra ? "\n    " + extra : ""}${ldScripts ? "\n    " + ldScripts : ""}\n  </head>`,
  );

  return html;
}

// ---------- data loaders ----------

// Resolve relative to this file so it works regardless of cwd
// (Vite runs from the artifact dir, but the seed lives at the monorepo root).
const __pluginDir = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_SEED_PATH = path.resolve(
  __pluginDir,
  "../../../lib/db/src/seed-data/services.json",
);

const dataCache = {
  services: null,
  servicesAt: 0,
  posts: null,
  postsAt: 0,
};
const TTL_MS = 30_000;

async function loadServices() {
  const now = Date.now();
  if (dataCache.services && now - dataCache.servicesAt < TTL_MS) {
    return dataCache.services;
  }
  try {
    const raw = await fs.readFile(SERVICES_SEED_PATH, "utf8");
    dataCache.services = JSON.parse(raw);
    dataCache.servicesAt = now;
    return dataCache.services;
  } catch (err) {
    console.error("[bot-og-plugin] failed to load services seed:", err);
    return [];
  }
}

async function loadPosts(apiBase) {
  const now = Date.now();
  if (dataCache.posts && now - dataCache.postsAt < TTL_MS) {
    return dataCache.posts;
  }
  try {
    const res = await fetch(`${apiBase}/api/blog/posts`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : json?.items ?? [];
    dataCache.posts = items;
    dataCache.postsAt = now;
    return items;
  } catch (err) {
    console.error("[bot-og-plugin] failed to load posts:", err);
    return [];
  }
}

// ---------- per-route renderers ----------

function ogImageForBlog(siteUrl, post) {
  const category = post.category ?? "Insights";
  return `${siteUrl}/api/og?title=${encodeURIComponent(
    post.title,
  )}&category=${encodeURIComponent(category)}`;
}

async function buildMeta(pathname, siteUrl, apiBase) {
  const url = (suffix = "") =>
    `${siteUrl}${suffix === "/" ? "" : suffix}`.replace(/\/+$/, "") || siteUrl;

  // Static pages (path → page-meta key)
  const staticByPath = Object.fromEntries(
    Object.entries(PAGE_META).map(([key, m]) => [m.path, key]),
  );

  if (pathname in staticByPath) {
    const key = staticByPath[pathname];
    const m = PAGE_META[key];
    const canonical = url(m.path);

    // FAQ-bearing pages
    let faqs = null;
    if (key === "home") faqs = HOME_FAQS;
    else if (key === "pricing") faqs = PRICING_FAQS;
    else if (key === "contact") faqs = CONTACT_FAQS;

    let extraSchema = null;
    if (key === "about") {
      extraSchema = aboutPageSchema({
        url: canonical,
        siteUrl,
        employees: AUTHORS,
      });
    } else if (key === "services") {
      const services = await loadServices();
      extraSchema = itemListSchema({
        name: "Fintech SEO & Content Marketing Services",
        items: services.map((s) => ({
          name: s.name,
          url: `${siteUrl}/services/${s.slug}`,
        })),
      });
    } else if (key === "authors") {
      extraSchema = itemListSchema({
        name: "FintechPressHub team",
        items: AUTHORS.map((a) => ({
          name: a.name,
          url: `${siteUrl}/authors/${a.slug}`,
        })),
      });
    } else if (key === "blog") {
      const posts = await loadPosts(apiBase);
      extraSchema = itemListSchema({
        name: "FintechPressHub Blog",
        items: posts.slice(0, 50).map((p) => ({
          name: p.title,
          url: `${siteUrl}/blog/${p.slug}`,
        })),
      });
    }

    return {
      title: m.title,
      description: m.description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/opengraph.jpg`,
      ogImageAlt: "FintechPressHub - Fintech SEO Agency",
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, m.title.split("|")[0].trim(), siteUrl),
        extraSchema,
        faqSchema(faqs),
      ],
    };
  }

  // /services/:slug
  const serviceMatch = /^\/services\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (serviceMatch) {
    const slug = serviceMatch[1];
    const services = await loadServices();
    const service = services.find((s) => s.slug === slug);
    if (!service) return null;
    const canonical = `${siteUrl}/services/${service.slug}`;
    const title = `${service.name} | FintechPressHub`;
    const description = service.tagline || service.description?.slice(0, 200);
    return {
      title,
      description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/opengraph.jpg`,
      ogImageAlt: service.name,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, service.name, siteUrl),
        serviceSchema({ service, url: canonical, siteUrl }),
        faqSchema(SERVICE_FAQS[slug]),
      ],
    };
  }

  // /authors/:slug
  const authorMatch = /^\/authors\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (authorMatch) {
    const slug = authorMatch[1];
    const author = AUTHORS.find((a) => a.slug === slug);
    if (!author) return null;
    const canonical = `${siteUrl}/authors/${author.slug}`;
    const title = `${author.name} — ${author.role} | FintechPressHub`;
    const description = author.shortBio;
    return {
      title,
      description,
      canonical,
      ogType: "profile",
      ogImage: `${siteUrl}${author.photo}`,
      ogImageAlt: `${author.name}, ${author.role}`,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, author.name, siteUrl),
        personSchema({ author, url: canonical, siteUrl }),
      ],
      extraMeta: [
        `<meta property="article:author" content="${escapeHtml(author.name)}" />`,
      ],
    };
  }

  // /blog/:slug
  const blogMatch = /^\/blog\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (blogMatch) {
    const slug = blogMatch[1];
    const posts = await loadPosts(apiBase);
    const post = posts.find((p) => p.slug === slug);
    if (!post) return null;
    const canonical = `${siteUrl}/blog/${post.slug}`;
    const title = `${post.title} | FintechPressHub`;
    const description = post.excerpt ?? "";
    const image = ogImageForBlog(siteUrl, post);
    return {
      title,
      description,
      canonical,
      ogType: "article",
      ogImage: image,
      ogImageAlt: post.title,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, post.title, siteUrl),
        articleSchema({ post, image, url: canonical, siteUrl }),
      ],
      extraMeta: [
        `<meta property="article:published_time" content="${escapeHtml(post.date ?? post.publishedAt ?? "")}" />`,
        `<meta property="article:section" content="${escapeHtml(post.category ?? "Insights")}" />`,
        `<meta property="article:author" content="${escapeHtml(post.author ?? "")}" />`,
      ],
    };
  }

  return null;
}

// ---------- middleware ----------

export default function botOgPlugin({ root, siteUrl }) {
  const apiBase = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080";

  function makeMiddleware(getIndexHtml) {
    return async (req, res, next) => {
      try {
        if (req.method && req.method !== "GET" && req.method !== "HEAD") {
          return next();
        }
        const ua = String(req.headers["user-agent"] || "");
        if (!BOT_REGEX.test(ua)) return next();

        const rawUrl = req.url || "/";
        const pathOnly = rawUrl.split("?")[0];

        // Skip non-HTML asset paths
        if (/\.[a-z0-9]+$/i.test(pathOnly)) return next();

        const meta = await buildMeta(pathOnly, siteUrl, apiBase);
        if (!meta) return next();

        const indexHtml = await getIndexHtml(req);
        const html = shellInject(indexHtml, meta);

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader(
          "Cache-Control",
          "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        );
        res.setHeader("X-Bot-OG", "hit");
        res.end(html);
      } catch (err) {
        console.error("[bot-og-plugin]", err);
        next();
      }
    };
  }

  return {
    name: "fintechpresshub:bot-og",

    configureServer(server) {
      server.middlewares.use(
        makeMiddleware(async (req) => {
          const indexPath = path.resolve(root, "index.html");
          const raw = await fs.readFile(indexPath, "utf-8");
          return server.transformIndexHtml(req.url ?? "/", raw, req.originalUrl);
        }),
      );
    },

    configurePreviewServer(server) {
      const builtIndex = path.resolve(root, "dist/public/index.html");
      server.middlewares.use(
        makeMiddleware(async () => {
          return await fs.readFile(builtIndex, "utf-8");
        }),
      );
    },
  };
}
