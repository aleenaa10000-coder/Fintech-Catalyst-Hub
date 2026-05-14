import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  /(googlebot|bingbot|yandex|baiduspider|duckduckbot|twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|embedly|pinterest|redditbot|applebot|applebot-extended|skypeuripreview|vkshare|tumblr|bitrix|xing-contenttabreceiver|google-inspectiontool|googleother|google-extended|chatgpt|gptbot|oai-searchbot|perplexitybot|claudebot|amazonbot|youbot|duckassistbot|meta-externalagent|mj12bot|ahrefsbot|semrushbot)/i;

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
  "community-guidelines": "Community Guidelines",
  tools: "Free Tools",
  glossary: "Glossary",
  compare: "Comparisons",
  locations: "Locations",
  resources: "Resources",
  press: "Press",
  "fintech-publications": "Fintech Publications",
  tag:                    "Tag",
  category:               "Category",
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
    "@type": "NewsMediaOrganization",
    "@id": `${siteUrl}#organization`,
    name: "FintechPressHub",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      "@id": `${siteUrl}#logo`,
      url: `${siteUrl}/icon-512.png`,
      contentUrl: `${siteUrl}/icon-512.png`,
      width: 512,
      height: 512,
      caption: "FintechPressHub",
    },
    description:
      "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
    foundingDate: "2021-01-01",
    areaServed: "Worldwide",
    currenciesAccepted: "USD, GBP, EUR, SGD, AUD, CAD",
    email: "hello@fintechpresshub.com",
    inLanguage: "en",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${siteUrl}/contact`,
      email: "hello@fintechpresshub.com",
      availableLanguage: {
        "@type": "Language",
        name: "English",
        alternateName: "en",
      },
    },
    sameAs: [
      "https://twitter.com/fintechpresshub",
      "https://www.linkedin.com/company/fintechpresshub",
      "https://www.crunchbase.com/organization/fintechpresshub",
      "https://www.wikidata.org/wiki/Q130531885",
    ],
    knowsAbout: [
      "Fintech SEO",
      "Content Marketing for Fintech",
      "Link Building for Financial Services",
      "Digital PR for Fintech",
      "Payments Infrastructure",
      "Embedded Finance",
      "Open Banking",
      "Banking-as-a-Service",
      "Neobanking",
      "Buy Now Pay Later",
      "Consumer Lending",
      "SME Lending",
      "Wealthtech",
      "Robo-advisors",
      "Regtech",
      "KYC and AML Compliance",
      "PSD2 and PSD3",
      "Topical Authority in Finance",
      "Answer Engine Optimization",
      "Financial Services Marketing",
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
  const aboutEntities   = Array.isArray(post.aboutEntities)   ? post.aboutEntities   : [];
  const mentionEntities = Array.isArray(post.mentionEntities) ? post.mentionEntities : [];
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
      "@id": `${siteUrl}#organization`,
      name: "FintechPressHub",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        "@id": `${siteUrl}#logo`,
        url: `${siteUrl}/icon-512.png`,
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
    ...(aboutEntities.length > 0
      ? { about: aboutEntities.map((e) => ({ "@type": "Thing", name: e })) }
      : {}),
    ...(mentionEntities.length > 0
      ? { mentions: mentionEntities.map((e) => ({ "@type": "Thing", name: e })) }
      : {}),
    potentialAction: { "@type": "ReadAction", target: url },
  };
}

function serviceSchema({ service, url, siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": ["FinancialService", "ProfessionalService"],
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
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

// ---------- HTML injection ----------

// Exported for the build-time prerender script (scripts/prerender.mjs) so it
// can reuse the exact same meta-injection logic the dev plugin uses.
export function shellInject(html, meta) {
  return _shellInject(html, meta);
}

function _shellInject(html, meta) {
  const {
    title,
    description,
    canonical,
    ogType,
    ogImage,
    ogImageAlt,
    schemas,
    extraMeta,
    bodyContent,
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

  // Inject a per-route H1 + intro inside <div id="root"> so non-JS crawlers
  // see the page's primary heading and lede. The app uses createRoot().render()
  // (not hydrateRoot), so React simply replaces this content for real users —
  // no hydration mismatch warnings.
  if (bodyContent) {
    html = html.replace(
      /<div\s+id="root"\s*>\s*<\/div>/i,
      `<div id="root"><div data-bot-og="body">${bodyContent}</div></div>`,
    );
  }

  return html;
}

// ---------- body builders (visible H1 + intro for non-JS crawlers) ----------

function buildBodyHtml({ heading, lede, sections = [] }) {
  const parts = [`<h1>${escapeHtml(heading)}</h1>`];
  if (lede) parts.push(`<p>${escapeHtml(lede)}</p>`);
  for (const section of sections) {
    if (!section) continue;
    if (section.heading) {
      parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    }
    if (section.paragraph) {
      parts.push(`<p>${escapeHtml(section.paragraph)}</p>`);
    }
    if (section.list && section.list.length) {
      parts.push("<ul>");
      for (const item of section.list) {
        const label = escapeHtml(item.name);
        const href = escapeHtml(item.url);
        const tail = item.note ? ` — ${escapeHtml(item.note)}` : "";
        parts.push(`<li><a href="${href}">${label}</a>${tail}</li>`);
      }
      parts.push("</ul>");
    }
  }
  return parts.join("\n      ");
}

function stripHtmlToText(html, maxChars = 600) {
  const text = String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + "…";
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
  glossaryTerms: null,
  glossaryTermsAt: 0,
  locations: null,
  locationsAt: 0,
  tags: null,
  tagsAt: 0,
};
const TTL_MS = 30_000;

const BLOG_CATEGORY_META = {
  payments: {
    title: "Payments Articles",
    description: "Expert analysis and guides on payment infrastructure, card issuing, cross-border rails, and payment orchestration for fintech teams.",
  },
  "embedded-finance": {
    title: "Embedded Finance Articles",
    description: "Deep dives into BaaS architecture, embedded lending, and vertical SaaS payments powering the next wave of fintech products.",
  },
  "open-banking": {
    title: "Open Banking Articles",
    description: "Coverage of PSD3, account-to-account payments, variable recurring payments, and open data compliance for regulated fintechs.",
  },
  neobanking: {
    title: "Neobanking Articles",
    description: "Strategies and analysis for digital banks on activation, retention, fee economics, and regulatory positioning.",
  },
  lending: {
    title: "Lending Articles",
    description: "Insights on BNPL, SME lending, cash-flow underwriting, embedded credit, and consumer affordability for lending fintechs.",
  },
  regtech: {
    title: "Regtech & Compliance Articles",
    description: "Expert guides on transaction monitoring, reg reporting, sanctions screening, and KYC/AML tooling.",
  },
  wealthtech: {
    title: "Wealthtech Articles",
    description: "Analysis of robo-advisors, portfolio construction, advisor SaaS marketing, and self-directed investing platforms.",
  },
  "fintech-seo": {
    title: "Fintech SEO Articles",
    description: "Actionable SEO guides, content strategy, and link-building playbooks specifically for fintech and financial services companies.",
  },
};

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

// Path to the bundled static seed posts. We use these as a fallback whenever
// the API is unreachable (e.g. during `vite build` in CI, where no API server
// is running). The static seed shape matches the API shape on every field
// `articleSchema` and `buildMeta` look at — slug, title, excerpt, category,
// date, author, authorRole, tags, content — so they're drop-in interchangeable.
const STATIC_POSTS_PATH = path.resolve(
  __pluginDir,
  "../src/data/posts.js",
);

async function loadStaticPosts() {
  try {
    const mod = await import(pathToFileURL(STATIC_POSTS_PATH).href);
    const items = mod.default ?? mod.posts ?? [];
    return Array.isArray(items) ? items : [];
  } catch (err) {
    // src/data/posts.js is an OPTIONAL static seed used as a build-time
    // fallback when the live API is unreachable. Its absence is the expected
    // production state (the API is the source of truth), so log this at debug
    // verbosity to avoid scaring deploys with a misleading error stack.
    const code = /** @type {{ code?: string }} */ (err)?.code;
    if (code === "ERR_MODULE_NOT_FOUND") {
      console.log("[bot-og-plugin] no static posts.js seed (expected when API serves posts).");
    } else {
      console.warn("[bot-og-plugin] static posts.js load failed:", err);
    }
    return [];
  }
}

async function loadPosts(apiBase) {
  const now = Date.now();
  if (dataCache.posts && now - dataCache.postsAt < TTL_MS) {
    return dataCache.posts;
  }
  let items = [];
  try {
    const res = await fetch(`${apiBase}/api/blog/posts`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    items = Array.isArray(json) ? json : json?.items ?? [];
  } catch (err) {
    // Soft-fail: this is expected at build time when the API isn't running.
    // We log at info level (not error) so build output stays clean.
    console.warn(
      `[bot-og-plugin] API posts unavailable (${err?.message ?? err}); falling back to static posts.js`,
    );
  }

  // Merge: API posts overlay static seed posts on slug collision (mirrors the
  // runtime behaviour of `usePublicPosts` so prerender output matches what
  // users would see in the SPA).
  const staticPosts = await loadStaticPosts();
  const apiSlugs = new Set(items.map((p) => p.slug).filter(Boolean));
  const merged = [
    ...items,
    ...staticPosts.filter((p) => !apiSlugs.has(p.slug)),
  ];

  dataCache.posts = merged;
  dataCache.postsAt = now;
  return merged;
}

// ---------- per-route renderers ----------

function ogImageForBlog(siteUrl, post) {
  if (post.seoOgImage && String(post.seoOgImage).trim()) {
    return String(post.seoOgImage).trim();
  }
  const category = post.category ?? "Insights";
  const params = [
    `title=${encodeURIComponent(post.title)}`,
    `category=${encodeURIComponent(category)}`,
  ];
  if (post.author) {
    params.push(`author=${encodeURIComponent(post.author)}`);
  }
  if (post.authorRole) {
    params.push(`authorRole=${encodeURIComponent(post.authorRole)}`);
  }
  return `${siteUrl}/api/og?${params.join("&")}`;
}

// Exported for the build-time prerender script. Returns the same meta
// payload the dev/preview crawler middleware uses.
export async function buildMeta(pathname, siteUrl, apiBase) {
  return _buildMeta(pathname, siteUrl, apiBase);
}

async function loadGlossaryTerms(apiBase) {
  const now = Date.now();
  if (dataCache.glossaryTerms && now - dataCache.glossaryTermsAt < TTL_MS) {
    return dataCache.glossaryTerms;
  }
  try {
    const res = await fetch(`${apiBase}/api/glossary`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : [];
    dataCache.glossaryTerms = items;
    dataCache.glossaryTermsAt = now;
    return items;
  } catch (err) {
    console.warn(`[bot-og-plugin] glossary unavailable (${err?.message ?? err}); returning []`);
    return [];
  }
}

async function loadLocations(apiBase) {
  const now = Date.now();
  if (dataCache.locations && now - dataCache.locationsAt < TTL_MS) {
    return dataCache.locations;
  }
  try {
    const res = await fetch(`${apiBase}/api/locations`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : [];
    dataCache.locations = items;
    dataCache.locationsAt = now;
    return items;
  } catch (err) {
    console.warn(`[bot-og-plugin] locations unavailable (${err?.message ?? err}); returning []`);
    return [];
  }
}

// Exported so prerender.mjs can enumerate every blog post slug at build time.
export async function getAllPosts(apiBase) {
  return loadPosts(apiBase);
}

// Exported so prerender.mjs can enumerate every service slug at build time.
export async function getAllServices() {
  return loadServices();
}

// Exported so prerender.mjs can enumerate every glossary term slug at build time.
export async function getAllGlossaryTerms(apiBase) {
  return loadGlossaryTerms(apiBase);
}

// Exported so prerender.mjs can enumerate every location slug at build time.
export async function getAllLocations(apiBase) {
  return loadLocations(apiBase);
}

async function loadTags(apiBase) {
  const now = Date.now();
  if (dataCache.tags && now - dataCache.tagsAt < TTL_MS) {
    return dataCache.tags;
  }
  try {
    const res = await fetch(`${apiBase}/api/blog/tags`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : [];
    const withSlug = items
      .map((t) => ({
        tag: t.tag,
        count: t.count,
        slug: String(t.tag)
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      }))
      .filter((t) => t.slug);
    dataCache.tags = withSlug;
    dataCache.tagsAt = now;
    return withSlug;
  } catch (err) {
    console.warn(`[bot-og-plugin] tags unavailable (${err?.message ?? err}); returning []`);
    return [];
  }
}

// Exported so prerender.mjs can enumerate every tag slug at build time.
export async function getAllTags(apiBase) {
  return loadTags(apiBase);
}

async function _buildMeta(pathname, siteUrl, apiBase) {
  // Always include the path. For the root ("/") we keep the trailing slash so
  // the canonical here matches what index.html and the sitemap emit.
  const url = (suffix = "") => {
    if (suffix === "" || suffix === "/") return `${siteUrl}/`;
    return `${siteUrl}${suffix.replace(/\/+$/, "")}`;
  };

  // Static pages (path → page-meta key)
  const staticByPath = Object.fromEntries(
    Object.entries(PAGE_META).map(([key, m]) => [m.path, key]),
  );

  if (pathname in staticByPath) {
    const key = staticByPath[pathname];
    const m = PAGE_META[key];
    const canonical = url(m.path);

    // Headings shown to non-JS crawlers. We intentionally use the page-level
    // hero copy (not the meta title) so the H1 reads naturally as a heading.
    const HEADINGS = {
      home: "Fintech SEO & Content Marketing That Compounds",
      about: "Bridging Fintech Expertise & Search Visibility",
      services: "Growth Engines for Fintech",
      pricing: "Invest in Sustainable Growth",
      blog: "Insights From the Front Lines of Fintech SEO",
      authors: "Meet the Team",
      writeForUs: "Write for FintechPressHub",
      contact: "Let's Scale Your Organic Growth",
      privacyPolicy: "Privacy Policy",
      refundPolicy: "Refund Policy",
      cookiePolicy: "Cookie Policy",
      terms: "Terms and Conditions",
      editorialGuidelines: "Editorial Guidelines",
    };
    const heading = HEADINGS[key] ?? m.title.split("|")[0].trim();

    // FAQ-bearing pages
    let faqs = null;
    if (key === "home") faqs = HOME_FAQS;
    else if (key === "pricing") faqs = PRICING_FAQS;
    else if (key === "contact") faqs = CONTACT_FAQS;

    let extraSchema = null;
    const bodySections = [];

    if (key === "about") {
      extraSchema = aboutPageSchema({
        url: canonical,
        siteUrl,
        employees: AUTHORS,
      });
      if (ABOUT_PAGE?.description) {
        bodySections.push({ paragraph: ABOUT_PAGE.description });
      }
    } else if (key === "services") {
      const services = await loadServices();
      extraSchema = itemListSchema({
        name: "Fintech SEO & Content Marketing Services",
        items: services.map((s) => ({
          name: s.name,
          url: `${siteUrl}/services/${s.slug}`,
        })),
      });
      bodySections.push({
        heading: "Services",
        list: services.map((s) => ({
          name: s.name,
          url: `${siteUrl}/services/${s.slug}`,
          note: s.tagline,
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
      bodySections.push({
        heading: "Team",
        list: AUTHORS.map((a) => ({
          name: a.name,
          url: `${siteUrl}/authors/${a.slug}`,
          note: a.role,
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
      bodySections.push({
        heading: "Latest Articles",
        list: posts.slice(0, 20).map((p) => ({
          name: p.title,
          url: `${siteUrl}/blog/${p.slug}`,
        })),
      });
    } else if (key === "pricing") {
      bodySections.push({
        heading: "Frequently Asked Questions",
        list: PRICING_FAQS.map((f) => ({
          name: f.question,
          url: `${canonical}#faq`,
        })),
      });
    } else if (key === "home") {
      bodySections.push({
        heading: "Frequently Asked Questions",
        list: HOME_FAQS.map((f) => ({
          name: f.question,
          url: `${canonical}#faq`,
        })),
      });
    } else if (pathname.startsWith("/tools/") && pathname !== "/tools") {
      const leafLabel = m.title.split("|")[0].trim();
      extraSchema = {
        "@context":           "https://schema.org",
        "@type":              "SoftwareApplication",
        "@id":                canonical,
        name:                 leafLabel,
        description:          m.description,
        url:                  canonical,
        applicationCategory:  "WebApplication",
        operatingSystem:      "Web",
        isAccessibleForFree:  true,
        offers: {
          "@type":       "Offer",
          price:         "0",
          priceCurrency: "USD",
        },
        provider: { "@id": `${siteUrl}#organization` },
      };
    } else if (pathname.startsWith("/compare/") && pathname !== "/compare") {
      const leafLabel = m.title.split("|")[0].trim();
      extraSchema = {
        "@context":  "https://schema.org",
        "@type":     "FAQPage",
        "@id":       canonical,
        name:        m.title,
        url:         canonical,
        publisher:   { "@id": `${siteUrl}#organization` },
        mainEntity: [
          {
            "@type": "Question",
            name:    leafLabel,
            acceptedAnswer: {
              "@type": "Answer",
              text:    m.description,
            },
          },
        ],
      };
    }

    const bodyContent = buildBodyHtml({
      heading,
      lede: m.description,
      sections: bodySections,
    });

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
      bodyContent,
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

    const sections = [];
    if (service.description && service.description !== description) {
      sections.push({ paragraph: stripHtmlToText(service.description, 600) });
    }
    if (Array.isArray(service.deliverables) && service.deliverables.length) {
      sections.push({
        heading: "What's included",
        list: service.deliverables.slice(0, 12).map((d) => ({
          name: typeof d === "string" ? d : d.name ?? String(d),
          url: canonical,
        })),
      });
    }
    const bodyContent = buildBodyHtml({
      heading: service.name,
      lede: service.tagline || description,
      sections,
    });

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
      bodyContent,
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

    const sections = [{ paragraph: author.role }];
    if (Array.isArray(author.expertise) && author.expertise.length) {
      sections.push({
        heading: "Areas of expertise",
        list: author.expertise.slice(0, 10).map((e) => ({
          name: e,
          url: canonical,
        })),
      });
    }
    const bodyContent = buildBodyHtml({
      heading: author.name,
      lede: author.shortBio,
      sections,
    });

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
        `<meta property="article:author" content="${escapeHtml(`${siteUrl}/authors/${author.slug}`)}" />`,
      ],
      bodyContent,
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

    const metaBits = [];
    const dateRaw = post.date ?? post.publishedAt;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) {
        metaBits.push(
          d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        );
      }
    }
    if (post.author) metaBits.push(`By ${post.author}`);
    if (post.category) metaBits.push(post.category);

    const sections = [];
    if (metaBits.length) sections.push({ paragraph: metaBits.join(" · ") });
    if (post.content) {
      sections.push({ paragraph: stripHtmlToText(post.content, 800) });
    }

    const bodyContent = buildBodyHtml({
      heading: post.title,
      lede: post.excerpt,
      sections,
    });

    const postFaqItems = Array.isArray(post.faqItems) ? post.faqItems : [];
    const schemas = [
      organizationSchema(siteUrl),
      websiteSchema(siteUrl),
      breadcrumbSchema(pathname, post.title, siteUrl),
      articleSchema({ post, image, url: canonical, siteUrl }),
    ];

    if (postFaqItems.length > 0) {
      schemas.push(faqSchema(postFaqItems));
    }

    if (post.blufSummary) {
      schemas.push({
        "@context":  "https://schema.org",
        "@type":     "SpeakableSpecification",
        "@id":       `${canonical}#speakable`,
        cssSelector: [".bluf-summary"],
        name:        String(post.blufSummary).slice(0, 200),
      });
    }

    const dateRawModified = post.dateModified ?? post.updatedAt ?? post.date ?? post.publishedAt;
    const modifiedIso = dateRawModified ? new Date(dateRawModified).toISOString() : "";

    return {
      title,
      description,
      canonical,
      ogType: "article",
      ogImage: image,
      ogImageAlt: post.title,
      schemas,
      extraMeta: [
        `<meta property="article:published_time" content="${escapeHtml(post.date ?? post.publishedAt ?? "")}" />`,
        ...(modifiedIso ? [`<meta property="article:modified_time" content="${escapeHtml(modifiedIso)}" />`] : []),
        `<meta property="article:section" content="${escapeHtml(post.category ?? "Insights")}" />`,
        `<meta property="article:author" content="${escapeHtml(post.author ? `${siteUrl}/authors/${post.author.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}` : "")}" />`,
        ...(post.authorTwitter ? [`<meta name="twitter:creator" content="${escapeHtml(post.authorTwitter)}" />`] : []),
      ],
      bodyContent,
    };
  }

  // /glossary/:slug
  const glossaryMatch = /^\/glossary\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (glossaryMatch) {
    const slug = glossaryMatch[1];
    const terms = await loadGlossaryTerms(apiBase);
    const term = terms.find((t) => t.slug === slug);
    if (!term) return null;
    const canonical = `${siteUrl}/glossary/${term.slug}`;
    const description = (term.shortDef ?? "").slice(0, 160);
    const bodyContent = buildBodyHtml({ heading: term.term, lede: description });
    return {
      title: `${term.term} — Fintech Glossary | FintechPressHub`,
      description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/api/og?title=${encodeURIComponent(term.term)}&category=Glossary`,
      ogImageAlt: `${term.term} definition — FintechPressHub Fintech Glossary`,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, term.term, siteUrl),
        {
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          "@id": canonical,
          name: term.term,
          description: term.shortDef,
          url: canonical,
          inLanguage: "en",
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Fintech Glossary",
            url: `${siteUrl}/glossary`,
          },
          ...(term.category ? { subjectOf: { "@type": "Thing", name: term.category } } : {}),
        },
      ],
      bodyContent,
    };
  }

  // /locations/:slug
  const locationMatch = /^\/locations\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (locationMatch) {
    const slug = locationMatch[1];
    const locations = await loadLocations(apiBase);
    const loc = locations.find((l) => l.slug === slug);
    if (!loc) return null;
    const canonical = `${siteUrl}/locations/${loc.slug}`;
    const locationLabel = loc.region
      ? `${loc.city}, ${loc.region}, ${loc.country}`
      : `${loc.city}, ${loc.country}`;
    const description = `FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`.slice(0, 160);
    const bodyContent = buildBodyHtml({ heading: loc.headline, lede: description });
    return {
      title: `${loc.headline} | FintechPressHub`,
      description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/api/og?title=${encodeURIComponent(loc.headline)}&category=Location`,
      ogImageAlt: `FintechPressHub — ${loc.city} Fintech SEO`,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, `${loc.city} Fintech SEO`, siteUrl),
        {
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "ProfessionalService"],
          "@id": canonical,
          name: `FintechPressHub — ${loc.city} Fintech SEO`,
          description: loc.headline,
          serviceType: "Fintech SEO & Content Marketing",
          url: canonical,
          address: {
            "@type": "PostalAddress",
            addressLocality: loc.city,
            ...(loc.region ? { addressRegion: loc.region } : {}),
            addressCountry: loc.countryCode,
          },
          areaServed: { "@type": "Place", name: loc.country },
          publisher: { "@id": `${siteUrl}#organization` },
        },
      ],
      bodyContent,
    };
  }

  // /blog/category/:slug
  const categoryMatch = /^\/blog\/category\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    const catMeta = BLOG_CATEGORY_META[slug];
    if (!catMeta) return null;
    const canonical = `${siteUrl}/blog/category/${slug}`;
    const posts = await loadPosts(apiBase);
    const catPosts = posts.filter((p) => {
      const cat = (p.category ?? "").toLowerCase().replace(/\s+/g, "-");
      return cat === slug;
    });
    const bodyContent = buildBodyHtml({
      heading: catMeta.title,
      lede: catMeta.description,
      sections: catPosts.length > 0
        ? [{ heading: "Latest Articles", list: catPosts.slice(0, 10).map((p) => ({ name: p.title, url: `${siteUrl}/blog/${p.slug}` })) }]
        : [],
    });
    return {
      title: `${catMeta.title} | FintechPressHub`,
      description: catMeta.description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/api/og?title=${encodeURIComponent(catMeta.title)}&category=Blog`,
      ogImageAlt: `${catMeta.title} — FintechPressHub`,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, catMeta.title, siteUrl),
        {
          "@context":  "https://schema.org",
          "@type":     "CollectionPage",
          "@id":       canonical,
          name:        catMeta.title,
          description: catMeta.description,
          url:         canonical,
          inLanguage:  "en",
          isPartOf:    { "@id": `${siteUrl}#website` },
          publisher:   { "@id": `${siteUrl}#organization` },
        },
        catPosts.length > 0
          ? itemListSchema({
              name: catMeta.title,
              items: catPosts.slice(0, 20).map((p) => ({ name: p.title, url: `${siteUrl}/blog/${p.slug}` })),
            })
          : null,
      ].filter(Boolean),
      bodyContent,
    };
  }

  // /blog/tag/:slug
  const tagMatch = /^\/blog\/tag\/([^/]+)\/?$/i.exec(pathname);
  if (tagMatch) {
    const rawTag = tagMatch[1];
    const tags = await loadTags(apiBase);
    const tagEntry = tags.find((t) => t.slug === rawTag);
    const tagLabel = tagEntry
      ? tagEntry.tag
      : rawTag
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
    const canonical = `${siteUrl}/blog/tag/${rawTag}`;
    const title = `${tagLabel} Articles | FintechPressHub Blog`;
    const description = `Browse all FintechPressHub articles tagged "${tagLabel}" — expert fintech SEO and content marketing insights.`;
    const posts = await loadPosts(apiBase);
    const tagPosts = posts.filter((p) =>
      Array.isArray(p.tags) && p.tags.some((t) => {
        const s = String(t).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        return s === rawTag;
      }),
    );
    const bodyContent = buildBodyHtml({
      heading: `${tagLabel} Articles`,
      lede: description,
      sections: tagPosts.length > 0
        ? [{ heading: "Latest Articles", list: tagPosts.slice(0, 10).map((p) => ({ name: p.title, url: `${siteUrl}/blog/${p.slug}` })) }]
        : [],
    });
    return {
      title,
      description,
      canonical,
      ogType: "website",
      ogImage: `${siteUrl}/api/og?title=${encodeURIComponent(tagLabel)}&category=Blog`,
      ogImageAlt: `${tagLabel} — FintechPressHub Blog`,
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, `${tagLabel} Articles`, siteUrl),
        {
          "@context":  "https://schema.org",
          "@type":     "CollectionPage",
          "@id":       canonical,
          name:        title,
          description,
          url:         canonical,
          inLanguage:  "en",
          isPartOf:    { "@id": `${siteUrl}#website` },
          publisher:   { "@id": `${siteUrl}#organization` },
        },
        tagPosts.length > 0
          ? itemListSchema({
              name: title,
              items: tagPosts.slice(0, 20).map((p) => ({ name: p.title, url: `${siteUrl}/blog/${p.slug}` })),
            })
          : null,
      ].filter(Boolean),
      bodyContent,
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
