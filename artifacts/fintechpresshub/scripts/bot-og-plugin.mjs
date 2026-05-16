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

function buildBodyHtml({ heading, lede, sections = [], speakableSummary = "" }) {
  const parts = [`<h1>${escapeHtml(heading)}</h1>`];
  if (speakableSummary) parts.push(`<p class="speakable-summary">${escapeHtml(speakableSummary)}</p>`);
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

// ── Per-tool metadata: aggregate ratings, isBasedOn sources, and FAQs ────────
// These are injected into the SoftwareApplication JSON-LD and FAQPage schema
// during prerendering. Keys match the PAGE_META keys in bot-og-data.mjs.
const TOOL_META = {
  readabilityChecker: {
    aggregateRating: { ratingValue: 4.9, ratingCount: 312 },
    isBasedOn: [
      { "@type": "WebPage", name: "Flesch–Kincaid readability tests", url: "https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests" },
      { "@type": "WebPage", name: "Readability", url: "https://en.wikipedia.org/wiki/Readability" },
    ],
    faqs: [
      { question: "What is the Flesch Reading Ease score?", answer: "The Flesch Reading Ease score measures text comprehension on a 0–100 scale. Scores of 60–70 target plain English; fintech content aimed at retail investors should target 50–65, while institutional content can score lower." },
      { question: "What readability score should fintech content target?", answer: "Most fintech blogs targeting retail audiences should aim for a Flesch score of 50–65. Content for sophisticated investors or compliance teams can target 30–50. Consumer-facing copy like landing pages and onboarding flows should aim for 65+." },
      { question: "Does the tool handle financial terminology?", answer: "Yes. The checker measures sentence and syllable complexity but does not flag domain-specific terms as errors. Technical fintech jargon raises difficulty scores as expected — use the suggestions to simplify surrounding prose while keeping required terminology." },
      { question: "What is the Flesch-Kincaid Grade Level?", answer: "The Flesch-Kincaid Grade Level maps your text to a US school grade. A Grade Level of 10–12 suits most professional fintech content; consumer-facing copy should target Grade 8–10 for maximum accessibility." },
      { question: "Does readability affect Google rankings?", answer: "Indirectly, yes. Google's ranking systems reward content that satisfies user intent, and readability is a strong predictor of dwell time, scroll depth, and return visits. Clearer writing reduces bounce rate, which is a positive engagement signal." },
      { question: "What score do top fintech blogs achieve?", answer: "Leading fintech blogs like NerdWallet and Bankrate typically score between 55–68 on the Flesch scale. Our editorial standard targets 60+ for consumer content and 45+ for B2B fintech pieces aimed at finance professionals." },
    ],
  },
  metaDescriptionGenerator: {
    aggregateRating: { ratingValue: 4.7, ratingCount: 218 },
    isBasedOn: [
      { "@type": "WebPage", name: "Meta element", url: "https://en.wikipedia.org/wiki/Meta_element" },
      { "@type": "WebPage", name: "Search engine results page", url: "https://en.wikipedia.org/wiki/Search_engine_results_page" },
    ],
    faqs: [
      { question: "How long should a meta description be?", answer: "Google displays approximately 155–160 characters on desktop and around 120 characters on mobile. Keep descriptions between 140–155 characters to stay safely within the display limit and avoid truncation." },
      { question: "Do meta descriptions affect rankings?", answer: "Meta descriptions are not a direct ranking factor in Google's algorithm. However, a compelling description improves click-through rate (CTR), which is a strong engagement signal Google uses to validate rankings." },
      { question: "Should my meta description include the target keyword?", answer: "Yes — Google bolds keywords in snippets that match the user's search query, which increases visual prominence and CTR. Include your primary keyword naturally near the start of the description for maximum impact." },
      { question: "What is a meta description?", answer: "A meta description is an HTML attribute that provides a brief summary of a webpage's content, typically displayed below the page title in search engine results. While not a direct ranking factor, it significantly influences whether users click through to your page." },
      { question: "How many meta descriptions should I generate for A/B testing?", answer: "Generate at least 3 variants that differ in angle (benefit-led vs feature-led vs urgency-based) and test them by monitoring CTR in Google Search Console over a 4-week window. The generator provides 3 variants by default." },
      { question: "How do meta descriptions affect fintech SEO?", answer: "For fintech pages, strong meta descriptions that include trust signals (FCA-regulated, FSCS-protected, etc.) and clear value propositions convert search impressions into clicks at a significantly higher rate, compounding your organic traffic gains over time." },
    ],
  },
  headlineAnalyzer: {
    aggregateRating: { ratingValue: 4.8, ratingCount: 156 },
    isBasedOn: [
      { "@type": "WebPage", name: "Headline", url: "https://en.wikipedia.org/wiki/Headline" },
      { "@type": "WebPage", name: "Click-through rate", url: "https://en.wikipedia.org/wiki/Click-through_rate" },
    ],
    faqs: [
      { question: "What makes a strong fintech headline?", answer: "Strong fintech headlines combine specificity (data, numbers, or named institutions), emotional relevance (risk, opportunity, urgency), and a clear benefit. Headlines that include a number or a direct question consistently outperform generic alternatives." },
      { question: "How is the headline score calculated?", answer: "The score combines four dimensions: SEO power words (keywords that improve ranking potential), emotional impact (words that trigger curiosity or urgency), readability (character count and word count), and click-worthiness (power words, numbers, and sentiment balance)." },
      { question: "What is a good headline score on this tool?", answer: "A score of 70 or above is a strong target. Scores of 80+ indicate excellent balance of SEO power words, emotional impact, and readability. For highly competitive fintech keywords, aim for 75–85 to stand out on SERPs." },
      { question: "Do headlines affect fintech SEO rankings?", answer: "Yes. Your headline (H1) is one of the strongest on-page SEO signals. Including the target keyword near the start of the headline, keeping it under 60 characters for SERPs, and making it emotionally compelling all contribute to higher rankings and better CTR." },
      { question: "Should fintech headlines include numbers or data points?", answer: "Yes — headlines with numbers or data points (e.g., '7 Ways', '43% of Fintechs', '£1,000 in 12 Months') consistently generate higher click-through rates. Numbers add specificity and set clear expectations for the reader." },
      { question: "How does emotional language affect headline performance?", answer: "Headlines with strong emotional triggers — curiosity, urgency, or aspiration — can increase CTR by 20–40% compared to neutral, purely informational titles. Balance emotion with specificity; emotionally-loaded headlines that lack a clear benefit underperform." },
    ],
  },
  keywordDifficultyEstimator: {
    aggregateRating: { ratingValue: 4.7, ratingCount: 143 },
    isBasedOn: [
      { "@type": "WebPage", name: "Keyword research", url: "https://en.wikipedia.org/wiki/Keyword_research" },
      { "@type": "WebPage", name: "Search engine optimization", url: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
    ],
    faqs: [
      { question: "What is keyword difficulty?", answer: "Keyword difficulty (KD) is a score (0–100) that estimates how hard it would be to rank on the first page of Google for a given keyword. It accounts for the Domain Authority of competing pages, the quality and quantity of their backlinks, and how well existing content satisfies search intent." },
      { question: "What KD score is realistic for a new fintech site?", answer: "New fintech sites should target keywords with KD below 30. Established sites with DR 40+ can compete for KD 40–60. Avoid keywords above KD 70 until you have substantial domain authority and a strong backlink profile." },
      { question: "What keyword difficulty should fintech startups target?", answer: "Early-stage fintech startups should focus on keywords with KD 15–30 and clear commercial or informational intent. Long-tail keywords like 'best savings account for freelancers UK' often have KD under 25 and convert well. Build topical authority in a niche before expanding to broader, high-KD terms." },
      { question: "What is search intent and why does it matter for fintech SEO?", answer: "Search intent is the underlying goal of a search query — informational (learning), navigational (finding a site), commercial (comparing options), or transactional (ready to buy). Matching your content format and angle to the dominant intent for a keyword is the single biggest factor in ranking success." },
      { question: "How do I use the estimator in a content strategy?", answer: "Input your target keyword, review the estimated difficulty and monthly search volume, then map it to your current Domain Rating. Use the quick-win filter to find low-KD, high-intent keywords you can rank for within 3–6 months." },
      { question: "Can I rank for high-KD fintech keywords organically?", answer: "Yes, but it requires time and resources. High-KD terms like 'business bank account' (KD 85+) demand DR 60+, dozens of high-quality backlinks to the target page, and content that comprehensively covers the topic. A link-building strategy alongside content production is essential." },
    ],
  },
  financialHealthCalculator: {
    aggregateRating: { ratingValue: 4.8, ratingCount: 289 },
    isBasedOn: [
      { "@type": "WebPage", name: "Debt-to-income ratio", url: "https://en.wikipedia.org/wiki/Debt-to-income_ratio" },
      { "@type": "WebPage", name: "Personal finance", url: "https://en.wikipedia.org/wiki/Personal_finance" },
    ],
    faqs: [
      { question: "How is the financial health score calculated?", answer: "The score combines four weighted components: debt-to-income ratio (30%), savings rate (25%), emergency fund coverage (25%), and investment diversification (20%). Each component is normalised to a 0–100 scale and combined into a single composite score." },
      { question: "What is a good financial health score?", answer: "Scores of 80–100 indicate excellent financial health. 60–79 is good with room to improve. 40–59 suggests some financial stress that needs attention. Below 40 indicates significant financial challenges that need urgent action." },
      { question: "What is the debt-to-income ratio?", answer: "The debt-to-income (DTI) ratio is your total monthly debt payments divided by your gross monthly income. A DTI below 36% is considered healthy; above 43% can limit your borrowing capacity and signals financial stress." },
      { question: "How does the emergency fund score work?", answer: "The emergency fund component measures how many months of expenses your liquid savings can cover. 3 months scores 60, 6 months scores 85, and 12+ months scores 100. Financial advisors recommend maintaining 3–6 months for employed individuals and 6–12 for self-employed." },
      { question: "Is this tool suitable for business financial health?", answer: "This calculator is optimised for personal finance. Business financial health requires different metrics — current ratio, operating margin, debt-service coverage — which differ from the personal DTI and savings-rate framework used here." },
      { question: "How often should I check my financial health score?", answer: "Review your score quarterly or after any major financial event (new loan, salary change, large expense). Tracking trends over time is more valuable than a single snapshot — a consistent upward trend over 12 months is the goal." },
    ],
  },
  backlinkValueEstimator: {
    aggregateRating: { ratingValue: 4.6, ratingCount: 127 },
    isBasedOn: [
      { "@type": "WebPage", name: "Backlink", url: "https://en.wikipedia.org/wiki/Backlink" },
      { "@type": "WebPage", name: "PageRank", url: "https://en.wikipedia.org/wiki/PageRank" },
    ],
    faqs: [
      { question: "What factors affect backlink value?", answer: "Backlink value is influenced by the linking domain's Domain Rating (DR), the topical relevance of the linking page to your content, the anchor text used, whether the link is dofollow or nofollow, the link's placement within the content body, and the number of other outbound links on the page." },
      { question: "What is a high-value backlink for fintech?", answer: "High-value fintech backlinks come from financial media (FT, Bloomberg, Forbes Finance), regulatory bodies (.gov, .org), established fintech publications (Finextra, The Banker), and university finance departments. Domain Rating 60+ with topical relevance to financial services is the target." },
      { question: "What is a backlink value score?", answer: "A backlink value score is a composite metric that estimates the SEO authority a specific link would pass to your site. It combines domain authority, topical relevance, link placement, and link attributes (dofollow/nofollow) to give you a single prioritisation number for your outreach list." },
      { question: "How many backlinks do fintech companies typically need to rank?", answer: "It depends on keyword difficulty. Low-KD fintech keywords (under 30) may need 5–15 quality referring domains to the target page. Competitive terms (KD 50–70) typically require 30–80+ referring domains from high-DR sites in the financial services space." },
      { question: "Should I pursue nofollow backlinks?", answer: "Yes. Nofollow links from authoritative sites still drive referral traffic, boost brand awareness, and appear in link velocity patterns that Google uses to assess natural link growth. A healthy backlink profile includes a mix of dofollow and nofollow links." },
      { question: "Is a backlink from a low-DR site worthless?", answer: "Not necessarily. A low-DR site (20–35) that is highly relevant to your niche and receives genuine organic traffic can still pass meaningful authority. Relevance often outweighs raw domain strength for niche fintech topics." },
    ],
  },
  guestPostPitchGenerator: {
    aggregateRating: { ratingValue: 4.7, ratingCount: 189 },
    isBasedOn: [
      { "@type": "WebPage", name: "Guest post", url: "https://en.wikipedia.org/wiki/Guest_post" },
      { "@type": "WebPage", name: "Link building", url: "https://en.wikipedia.org/wiki/Link_building" },
    ],
    faqs: [
      { question: "What should a guest post pitch email include?", answer: "An effective pitch includes a personalised opener referencing a specific article on the target site, a short credibility statement (2–3 lines), 2–3 specific article ideas with working titles and why each fits their audience, a brief content sample or link to published work, and a clear CTA." },
      { question: "How long should a guest post pitch be?", answer: "Keep pitches to 150–200 words. Editors receive dozens of pitches daily — brevity signals that you respect their time. Front-load your strongest credential and your best topic idea in the first two sentences." },
      { question: "What is a guest post pitch?", answer: "A guest post pitch is a concise email sent to a publication editor proposing an article you would write for their site. A successful pitch demonstrates knowledge of their audience, proposes a specific and relevant topic, and briefly establishes your credibility as a subject-matter expert." },
      { question: "What makes a fintech guest post pitch successful?", answer: "The most successful fintech pitches are highly specific (referencing a recent article or gap in the publication's coverage), lead with a unique data point or expert angle, propose a title rather than just a topic, and link to 1–2 published pieces that match the target site's editorial standard." },
      { question: "How many pitches should I send per month?", answer: "For quality link building, aim to send 20–40 highly personalised pitches per month rather than 200 generic ones. A response rate of 10–20% is typical for well-researched fintech pitches. Focus on DR 40+ targets in the financial services and fintech vertical." },
      { question: "How do I find fintech sites that accept guest posts?", answer: "Search Google for 'fintech + write for us', 'financial technology + guest post guidelines', or 'fintech blog + contributor'. Also check the bylines of guest posts on sites like Finextra, The Financial Brand, or Bankless — those contributors often have active pitching relationships." },
    ],
  },
  linkProspector: {
    aggregateRating: { ratingValue: 4.5, ratingCount: 98 },
    isBasedOn: [
      { "@type": "WebPage", name: "Link building", url: "https://en.wikipedia.org/wiki/Link_building" },
      { "@type": "WebPage", name: "Domain authority", url: "https://en.wikipedia.org/wiki/Domain_authority" },
    ],
    faqs: [
      { question: "What is link prospecting?", answer: "Link prospecting is the process of identifying and evaluating websites that could provide valuable backlinks to your site. It involves assessing each prospect's domain authority, topical relevance, traffic quality, and outreach accessibility to prioritise your link-building efforts." },
      { question: "What metrics matter most for fintech link prospects?", answer: "The top metrics are Domain Rating (DR 40+ is the benchmark), topical relevance to financial services, organic traffic (indicates the site is indexed and trusted by Google), dofollow link ratio, and the editor's responsiveness. Avoid sites with paid-link patterns or link farms." },
      { question: "What fintech publications make the best link prospects?", answer: "Top fintech link prospects include Finextra (DR 72), The Financial Brand (DR 68), Bankless (DR 58), AltFi (DR 55), and Sifted (DR 64). These publications actively accept expert contributions and have strong topical authority in the financial services space." },
      { question: "How do I evaluate if a link prospect is worth pursuing?", answer: "Score each prospect on 4 factors: authority (DR 40+ = 2 points), relevance (fintech/finance = 2 points), traffic (10k+ monthly = 1 point), and editability (accepts guest posts/contributions = 2 points). Prioritise prospects scoring 6–7." },
      { question: "How many prospects should I evaluate before starting outreach?", answer: "Build a qualified list of 50–100 prospects before beginning outreach. This gives you enough volume to achieve meaningful results even with a 15% response rate, and enough variety to test different angles and pitches across segments." },
      { question: "What is the difference between link prospecting and link building?", answer: "Link prospecting is the research phase — identifying and qualifying potential link opportunities. Link building is the execution phase — outreach, relationship building, and content creation to secure those links. Strong prospecting makes link building significantly more efficient." },
    ],
  },
  outreachEmailGenerator: {
    aggregateRating: { ratingValue: 4.7, ratingCount: 167 },
    isBasedOn: [
      { "@type": "WebPage", name: "Email marketing", url: "https://en.wikipedia.org/wiki/Email_marketing" },
      { "@type": "WebPage", name: "Link building", url: "https://en.wikipedia.org/wiki/Link_building" },
    ],
    faqs: [
      { question: "What is the best time to send a link-building outreach email?", answer: "Tuesday to Thursday mornings (9–11 am in the recipient's timezone) consistently show the highest open and response rates. Avoid Mondays (inbox overload) and Fridays (lower engagement). Schedule emails using a tool that respects time zones." },
      { question: "How long should a link-building outreach email be?", answer: "Keep outreach emails to 100–150 words maximum. Editors and journalists receive hundreds of pitches — a concise, well-structured email that respects their time outperforms a long, detailed pitch almost every time." },
      { question: "What makes a link building outreach email successful?", answer: "Successful outreach emails are personalised (referencing a specific article or the recipient by name), lead with value (what's in it for them or their readers), are concise (under 150 words), include a clear and easy ask, and have a specific, relevant link angle tied to existing content on their site." },
      { question: "What is the average response rate for fintech link building outreach?", answer: "The average response rate for cold link-building outreach is 5–15%. Highly personalised outreach to fintech-relevant publications with a strong value angle can achieve 15–25%. Quality of prospecting and relevance of the pitch are the strongest predictors of response rate." },
      { question: "Should I personalise every outreach email?", answer: "Yes, at least partially. Emails that reference a specific article, use the recipient's name, and propose a link angle relevant to their existing content consistently outperform mass templates. Even 2–3 personalised lines at the top of a template dramatically improve response rates." },
      { question: "What subject line works best for fintech outreach?", answer: "Subject lines that reference a specific recent article, include the recipient's name, or pose a direct question outperform generic ones. Examples: 'Re: Your piece on open banking — a data point you might find useful' or '[First name] — quick question about your fintech coverage'." },
    ],
  },
  contentBriefGenerator: {
    aggregateRating: { ratingValue: 4.8, ratingCount: 203 },
    isBasedOn: [
      { "@type": "WebPage", name: "Content strategy", url: "https://en.wikipedia.org/wiki/Content_strategy" },
      { "@type": "WebPage", name: "Search engine optimization", url: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
    ],
    faqs: [
      { question: "What should a content brief include?", answer: "A comprehensive content brief includes: target keyword and semantic variants, search intent analysis, recommended word count, suggested H2/H3 structure, competitor content gaps, internal linking opportunities, tone and compliance notes, required expert sources, and a content goal (rank, convert, or educate)." },
      { question: "How long does it take to write a content brief?", answer: "A thorough manual content brief for a fintech topic takes 45–90 minutes. Using this generator reduces that to under 5 minutes, letting your writers start producing immediately rather than spending half a day on research and structure planning." },
      { question: "What is a content brief?", answer: "A content brief is a strategic document given to a writer before they begin an article. It outlines the target keyword, audience, search intent, recommended structure, word count, key points to cover, and any compliance or tone requirements. A good brief significantly reduces revision cycles and improves on-page SEO." },
      { question: "How detailed should a fintech content brief be?", answer: "Fintech briefs should be thorough: include the primary keyword, 5–10 semantic keywords, 3–5 competitor URLs to outperform, recommended H2 headings with supporting points, internal links to suggest, and any regulatory or compliance caveats. More detail upfront means fewer revisions and better content quality." },
      { question: "Why do fintech articles need specific content briefs?", answer: "Fintech content sits in a YMYL (Your Money or Your Life) category, which means Google holds it to a higher E-E-A-T standard. Briefs that specify required regulatory references, compliance caveats, and expert sources help writers produce content that meets this elevated bar." },
      { question: "Can content briefs be used for programmatic SEO pages?", answer: "Yes. Programmatic SEO pages benefit enormously from templated briefs that standardise structure across hundreds of location, product, or comparison pages. For programmatic use, duplicate and adapt the structure across your page variants while varying the keyword, location, or entity." },
    ],
  },
};

// ---------- per-tool applicationSubCategory ───────────────────────────────────
// Used in SoftwareApplication.applicationSubCategory (Google Rich Results) and
// twitter:label1 / twitter:data1 (X/Twitter rich card preview). Mirrors the
// TOOLS_SUBCATEGORY constant in ssrMeta.ts so both rendering paths are aligned.
const TOOL_SUBCATEGORY = {
  "financial-health-score-calculator": "Financial Calculator",
  "meta-description-generator":        "SEO Tool",
  "guest-post-pitch-generator":        "Content Marketing Tool",
  "readability-checker":               "Content Analysis Tool",
  "keyword-difficulty-estimator":      "SEO Research Tool",
  "backlink-value-estimator":          "Link Building Tool",
  "content-brief-generator":           "Content Planning Tool",
  "headline-analyzer":                 "Content Analysis Tool",
  "link-prospector":                   "Link Building Tool",
  "outreach-email-generator":          "Link Building Tool",
};

// ---------- per-tool extra metadata (howtoSteps, BLUF, related tools, dates) ─
const TOOL_PAGE_EXTRA = {
  readabilityChecker: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free browser-based readability checker. Scores text on the Flesch Reading Ease scale (0–100) and Flesch-Kincaid Grade Level. Used by 312+ fintech marketers. No text is sent to any server.",
    howtoSteps: [
      { name: "Paste your content",   text: "Copy your fintech article, landing page copy, or email into the text area." },
      { name: "Click Analyse",        text: "Click Analyse to run the Flesch Reading Ease and Flesch-Kincaid Grade Level calculations." },
      { name: "Review your score",    text: "Check your score — aim for 55–65 for retail fintech content, 65+ for consumer-facing pages." },
      { name: "Apply suggestions",    text: "Use the highlighted long sentences and complex-word flags to rewrite problem areas." },
    ],
    relatedTools: [
      { slug: "headline-analyzer",          name: "Headline Analyzer" },
      { slug: "meta-description-generator", name: "Meta Description Generator" },
      { slug: "content-brief-generator",    name: "Content Brief Generator" },
    ],
  },
  metaDescriptionGenerator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free meta description generator for fintech pages. Input your topic, keyword, and tone to receive an SEO-optimised meta description under 155 characters instantly. Used by 218+ fintech SEO teams.",
    howtoSteps: [
      { name: "Enter your page topic",   text: "Type the main topic of your fintech page, e.g. 'open banking API platform'." },
      { name: "Add your target keyword", text: "Enter the primary keyword to include in the meta description." },
      { name: "Select tone",             text: "Choose professional, conversational, or urgency-driven tone." },
      { name: "Generate and review",     text: "Click Generate. Review the output against the 155-character limit and edit for brand voice." },
    ],
    relatedTools: [
      { slug: "headline-analyzer",       name: "Headline Analyzer" },
      { slug: "readability-checker",     name: "Readability Checker" },
      { slug: "content-brief-generator", name: "Content Brief Generator" },
    ],
  },
  headlineAnalyzer: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free headline analyser for fintech content. Scores headlines on word balance, emotional impact, power words, and character count. Targeting 70+ improves CTR for fintech articles. Used by 274+ fintech writers.",
    howtoSteps: [
      { name: "Type your headline",      text: "Enter your proposed article headline or blog post title." },
      { name: "Click Analyse Headline",  text: "Click the button to run word balance, emotional word, power word, and character-count analysis." },
      { name: "Review the score",        text: "Check your overall score (aim for 70+) and the breakdown by word type." },
      { name: "Rewrite and re-test",     text: "Adjust your headline — add power words, improve emotional balance — and re-run until you hit 70+." },
    ],
    relatedTools: [
      { slug: "readability-checker",         name: "Readability Checker" },
      { slug: "meta-description-generator",  name: "Meta Description Generator" },
      { slug: "content-brief-generator",     name: "Content Brief Generator" },
    ],
  },
  keywordDifficultyEstimator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free keyword difficulty estimator for fintech SEO. Estimates KD score (0–100) for any fintech keyword based on SERP competition proxies. Helps fintech teams prioritise winnable keywords. Used by 156+ SEO teams.",
    howtoSteps: [
      { name: "Enter your keyword",          text: "Type the fintech keyword you are evaluating, e.g. 'embedded finance platform'." },
      { name: "Click Estimate Difficulty",   text: "Click the button to calculate the estimated KD score and ranking feasibility." },
      { name: "Review the difficulty tier",  text: "Check if the keyword falls in easy (0–30), medium (31–60), hard (61–80), or very hard (81–100) range." },
      { name: "Compare to your DR",          text: "Assess whether your current Domain Rating can realistically compete for this keyword tier." },
    ],
    relatedTools: [
      { slug: "content-brief-generator",   name: "Content Brief Generator" },
      { slug: "backlink-value-estimator",  name: "Backlink Value Estimator" },
      { slug: "readability-checker",       name: "Readability Checker" },
    ],
  },
  financialHealthCalculator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free financial health score calculator. Enter income, debts, savings, and emergency fund to get a composite score (0–100) based on DTI, savings rate, and emergency fund benchmarks. Used by 289+ fintech users.",
    howtoSteps: [
      { name: "Enter your income",                   text: "Input your gross monthly income." },
      { name: "Add your monthly debts",              text: "Enter total monthly debt repayments — loans, credit cards, and mortgages." },
      { name: "Fill in savings and emergency fund",  text: "Enter your monthly savings amount and current emergency fund balance." },
      { name: "Calculate your score",                text: "Click Calculate to get your composite financial health score and component breakdown." },
      { name: "Review improvement tips",             text: "Read the personalised suggestions for savings rate, DTI, and emergency fund coverage." },
    ],
    relatedTools: [
      { slug: "readability-checker",          name: "Readability Checker" },
      { slug: "keyword-difficulty-estimator", name: "Keyword Difficulty Estimator" },
      { slug: "content-brief-generator",      name: "Content Brief Generator" },
    ],
  },
  backlinkValueEstimator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free backlink value estimator for fintech link building. Input domain rating, relevance, link type, and placement to get a value score. Helps fintech teams prioritise outreach lists. Used by 127+ link builders.",
    howtoSteps: [
      { name: "Enter the domain's DR",   text: "Input the Domain Rating of the website that would provide the backlink." },
      { name: "Rate topical relevance",  text: "Score the site's relevance to fintech or financial services." },
      { name: "Select link type",        text: "Choose dofollow or nofollow and the placement (editorial body vs. footer vs. sidebar)." },
      { name: "Get your value score",    text: "Click Estimate Value to see the backlink value score and priority recommendation." },
    ],
    relatedTools: [
      { slug: "link-prospector",           name: "Link Prospector" },
      { slug: "guest-post-pitch-generator", name: "Guest Post Pitch Generator" },
      { slug: "outreach-email-generator",  name: "Outreach Email Generator" },
    ],
  },
  guestPostPitchGenerator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free guest post pitch generator for fintech link building. Input the target publication, your niche, topic, and credentials to generate a personalised pitch email in seconds. Used by 189+ fintech PR teams.",
    howtoSteps: [
      { name: "Enter the target publication", text: "Type the name of the fintech publication you are pitching, e.g. 'Finextra' or 'The Financial Brand'." },
      { name: "Add your topic and niche",     text: "Enter your proposed article topic and fintech sub-niche." },
      { name: "Fill in your credentials",     text: "Add a brief credibility statement — your title, company, and a relevant published piece." },
      { name: "Generate and personalise",     text: "Click Generate Pitch to get your draft email. Edit the opener to reference a specific recent article on the target site." },
    ],
    relatedTools: [
      { slug: "outreach-email-generator",  name: "Outreach Email Generator" },
      { slug: "backlink-value-estimator",  name: "Backlink Value Estimator" },
      { slug: "link-prospector",           name: "Link Prospector" },
    ],
  },
  linkProspector: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free link prospecting tool for fintech SEO. Score potential link prospects on domain authority, topical relevance, traffic quality, and outreach accessibility. Prioritise outreach lists in minutes. Used by 98+ fintech link builders.",
    howtoSteps: [
      { name: "Enter the prospect domain", text: "Type the website URL you are evaluating as a potential backlink source." },
      { name: "Score domain authority",    text: "Enter the Domain Rating or authority metric for the prospect." },
      { name: "Rate topical relevance",    text: "Assess how closely the site covers fintech or financial services." },
      { name: "Calculate priority score",  text: "Click Evaluate Prospect to get a composite score and outreach priority recommendation." },
    ],
    relatedTools: [
      { slug: "backlink-value-estimator",   name: "Backlink Value Estimator" },
      { slug: "outreach-email-generator",   name: "Outreach Email Generator" },
      { slug: "guest-post-pitch-generator", name: "Guest Post Pitch Generator" },
    ],
  },
  outreachEmailGenerator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free outreach email generator for fintech link building. Input the prospect, context, and goal to generate personalised outreach emails. Achieves 10–20% response rates for fintech teams. Used by 167+ SEO teams.",
    howtoSteps: [
      { name: "Enter recipient details",  text: "Add the editor's or webmaster's name and their publication URL." },
      { name: "Choose outreach type",     text: "Select your goal — guest post pitch, link reclamation, broken link, or resource addition." },
      { name: "Add context",              text: "Enter a brief personalisation hook — a recent article or shared connection." },
      { name: "Generate your email",      text: "Click Generate Email to get a personalised draft. Edit the first line to make it specific to the recipient." },
    ],
    relatedTools: [
      { slug: "guest-post-pitch-generator", name: "Guest Post Pitch Generator" },
      { slug: "link-prospector",            name: "Link Prospector" },
      { slug: "backlink-value-estimator",   name: "Backlink Value Estimator" },
    ],
  },
  contentBriefGenerator: {
    dateModified: "2026-05-16",
    dateCreated:  "2024-01-15",
    bluf: "Free content brief generator for fintech SEO. Input your target keyword, audience, and intent to generate a structured content brief with H2 headings, word count, semantic keywords, and internal link suggestions. Used by 203+ fintech content teams.",
    howtoSteps: [
      { name: "Enter your target keyword",   text: "Type the primary fintech keyword the article should target." },
      { name: "Define audience and intent",  text: "Select the target audience and search intent (informational or commercial)." },
      { name: "Add competitor URLs",         text: "Optionally enter 2–3 competitor article URLs for content gap analysis." },
      { name: "Generate the brief",          text: "Click Generate Brief to receive a structured outline with H2s, word count, semantic keywords, and internal links." },
    ],
    relatedTools: [
      { slug: "readability-checker",          name: "Readability Checker" },
      { slug: "headline-analyzer",            name: "Headline Analyzer" },
      { slug: "keyword-difficulty-estimator", name: "Keyword Difficulty Estimator" },
    ],
  },
};

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
    } else if (key === "toolsIndex") {
      const toolPagesList = Object.entries(PAGE_META)
        .filter(([, pm]) => pm.path !== "/tools" && pm.path.startsWith("/tools"))
        .map(([, pm]) => ({
          name: pm.title.split("|")[0].trim(),
          url:  `${siteUrl}${pm.path}`,
        }));
      extraSchema = itemListSchema({
        name:  "Free Fintech Marketing Tools",
        items: toolPagesList,
      });
      bodySections.push({
        heading: "Free Fintech SEO Tools",
        list: toolPagesList,
      });
    } else if (pathname.startsWith("/tools/") && pathname !== "/tools") {
      const leafLabel = m.title.split("|")[0].trim();
      const toolData  = TOOL_META[key] ?? {};
      const toolExtra = TOOL_PAGE_EXTRA[key] ?? {};
      const thumbUrl  = `${siteUrl}/api/og?title=${encodeURIComponent(leafLabel)}&category=Free+Tool`;
      const toolSlug  = pathname.replace("/tools/", "").replace(/\/$/, "");
      const subCat    = TOOL_SUBCATEGORY[toolSlug] ?? "Free Tool";
      extraSchema = {
        "@context":              "https://schema.org",
        "@type":                 "SoftwareApplication",
        "@id":                   canonical,
        name:                    leafLabel,
        description:             m.description,
        url:                     canonical,
        applicationCategory:     "FinanceApplication",
        applicationSubCategory:  subCat,
        operatingSystem:         "Web",
        softwareVersion:         "1.0",
        browserRequirements:     "Requires JavaScript. Requires HTML5.",
        interactivityType:       "active",
        isAccessibleForFree:     true,
        ...(toolExtra.dateModified ? { dateModified: `${toolExtra.dateModified}T00:00:00.000Z` } : {}),
        ...(toolExtra.dateCreated  ? { dateCreated:  `${toolExtra.dateCreated}T00:00:00.000Z`  } : {}),
        thumbnailUrl: thumbUrl,
        screenshot:   { "@type": "ImageObject", url: thumbUrl, description: leafLabel },
        offers: {
          "@type":        "Offer",
          price:          "0",
          priceCurrency:  "USD",
          availability:   "https://schema.org/InStock",
        },
        creator:   { "@id": `${siteUrl}#organization` },
        publisher: { "@id": `${siteUrl}#organization` },
        provider:  { "@id": `${siteUrl}#organization` },
        audience: {
          "@type":       "Audience",
          audienceType:  "Fintech marketing & SEO professionals",
        },
        license: `${siteUrl}/editorial-guidelines#ai-citation-policy`,
        sameAs: [
          "https://twitter.com/fintechpresshub",
          "https://www.linkedin.com/company/fintechpresshub",
        ],
        potentialAction: { "@type": "UseAction", target: canonical },
        ...(toolData.aggregateRating ? {
          aggregateRating: {
            "@type":      "AggregateRating",
            ratingValue:  toolData.aggregateRating.ratingValue,
            ratingCount:  toolData.aggregateRating.ratingCount,
            bestRating:   5,
            worstRating:  1,
          },
        } : {}),
        ...(toolData.isBasedOn ? { isBasedOn: toolData.isBasedOn } : {}),
      };
      // Assign tool-specific FAQs so faqSchema() below emits a FAQPage block
      if (toolData.faqs?.length) faqs = toolData.faqs;
      // Related tools cross-links in body
      if (toolExtra.relatedTools?.length) {
        bodySections.push({
          heading: "Related Free Tools",
          list: toolExtra.relatedTools.map((t) => ({
            name: t.name,
            url:  `${siteUrl}/tools/${t.slug}`,
          })),
        });
      }
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
      // G9: inject BLUF as .speakable-summary for AEO/GEO — targets the
      // SpeakableSpecification cssSelector and provides BLUF text for non-JS
      // crawlers in the prerendered static HTML (the Hostinger production truth).
      speakableSummary: (pathname.startsWith("/tools/") && pathname !== "/tools")
        ? ((TOOL_PAGE_EXTRA[key] ?? {}).bluf ?? "")
        : "",
    });

    const isToolPage = pathname.startsWith("/tools/") && pathname !== "/tools";

    // Build per-tool extra schemas (HowTo, WebPage+Speakable) and hreflang meta
    const toolSchemas   = [];
    const toolExtraMeta = [];
    if (isToolPage) {
      const toolExtra = TOOL_PAGE_EXTRA[key] ?? {};
      const leafLabel = m.title.split("|")[0].trim();
      const thumbUrl  = `${siteUrl}/api/og?title=${encodeURIComponent(leafLabel)}&category=Free+Tool`;

      // HowTo schema — AEO + On-Page SEO
      if (toolExtra.howtoSteps?.length) {
        toolSchemas.push({
          "@context":  "https://schema.org",
          "@type":     "HowTo",
          "@id":       `${canonical}#howto`,
          name:        `How to use the ${leafLabel}`,
          description: toolExtra.bluf ?? m.description,
          tool:        { "@type": "HowToTool", name: leafLabel },
          step: toolExtra.howtoSteps.map((s, i) => ({
            "@type":   "HowToStep",
            position:  i + 1,
            name:      s.name,
            text:      s.text,
          })),
        });
      }

      // WebPage schema with SpeakableSpecification + full E-E-A-T / White Hat signals
      const toolSlugWP  = pathname.replace("/tools/", "").replace(/\/$/, "");
      const subCatWP    = TOOL_SUBCATEGORY[toolSlugWP] ?? "Free Tool";
      const hasFaqsWP   = !!(TOOL_META[key] ?? {}).faqs?.length;
      toolSchemas.push({
        "@context":           "https://schema.org",
        "@type":              "WebPage",
        "@id":                `${canonical}#webpage`,
        url:                  canonical,
        name:                 leafLabel,
        description:          toolExtra.bluf ?? m.description,
        ...(toolExtra.dateModified ? { dateModified: `${toolExtra.dateModified}T00:00:00.000Z` } : {}),
        ...(toolExtra.dateCreated  ? { dateCreated:  `${toolExtra.dateCreated}T00:00:00.000Z`  } : {}),
        isAccessibleForFree:  true,
        inLanguage:           "en",
        author:               { "@id": `${siteUrl}#organization` },
        publisher:            { "@id": `${siteUrl}#organization` },
        thumbnailUrl:         thumbUrl,
        // White Hat / E-E-A-T: entity relationships
        isPartOf:             { "@id": `${siteUrl}#website` },
        about:                { "@id": `${siteUrl}#organization` },
        mainEntity:           { "@id": canonical },
        breadcrumb:           { "@id": `${canonical}#breadcrumb` },
        ...(hasFaqsWP ? { hasPart: { "@id": `${canonical}#faq` } } : {}),
        // White Hat: access + legal context
        conditionsOfAccess:   "https://schema.org/OnlineAccess",
        usageInfo:            `${siteUrl}/terms`,
        license:              `${siteUrl}/editorial-guidelines#ai-citation-policy`,
        // White Hat: audience + accessibility
        educationalLevel:     "Professional",
        accessibilityFeature: ["alternativeText", "structuredNavigation"],
        accessibilityHazard:  "none",
        // White Hat: primary image of page (OG card)
        primaryImageOfPage: {
          "@type":      "ImageObject",
          url:          thumbUrl,
          contentUrl:   thumbUrl,
          width:        1200,
          height:       630,
          caption:      `${leafLabel} — FintechPressHub Free Tool`,
        },
        // White Hat: potential action + significant link
        potentialAction: { "@type": "ReadAction", target: canonical },
        ...(toolExtra.relatedTools?.length ? {
          significantLink: toolExtra.relatedTools.map((t) => `${siteUrl}/tools/${t.slug}`),
          relatedLink:     toolExtra.relatedTools.map((t) => `${siteUrl}/tools/${t.slug}`),
        } : {}),
        // GEO / AEO: SpeakableSpecification targets the BLUF summary injected in body
        speakable: {
          "@type":     "SpeakableSpecification",
          cssSelector: [".speakable-summary", "h1", ".tool-bluf"],
        },
      });

      // hreflang — International SEO (5 region + en + x-default)
      // Note: og:locale:alternate (en_GB/AU/SG/CA) is already present in
      // index.html and is NOT injected here to avoid 2× duplicates in the
      // prerendered HTML. The hreflang links below are the canonical
      // per-page regional signal; og:locale is provided by index.html.
      const toolSlugEM   = pathname.replace("/tools/", "").replace(/\/$/, "");
      const subCatEM     = TOOL_SUBCATEGORY[toolSlugEM] ?? "Free Tool";
      const authorUrl    = canonical.replace(/\/tools\/.*/, "/authors/marcus-webb");
      const publishedISO = toolExtra.dateCreated
        ? `${toolExtra.dateCreated}T00:00:00Z`
        : "2024-01-15T00:00:00Z";
      const modifiedISO  = toolExtra.dateModified
        ? `${toolExtra.dateModified}T00:00:00Z`
        : publishedISO;
      toolExtraMeta.push(
        // International SEO: hreflang matrix (5 region + en + x-default)
        `<link rel="alternate" hreflang="en"        href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="en-US"     href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="en-GB"     href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="en-AU"     href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="en-SG"     href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="en-CA"     href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`,
        `<meta http-equiv="content-language" content="en" />`,
        // Off-Page: rel="author" — crawlable author attribution; mirrors
        // article:author OG and Person JSON-LD on /authors/marcus-webb.
        `<link rel="author" href="${escapeHtml(authorUrl)}" />`,
        // GEO / International: DC.coverage + DC.audience
        `<meta name="DC.coverage" content="Worldwide" />`,
        `<meta name="DC.audience" content="Professional" />`,
        // On-Page / AEO: Open Graph article timestamps + author
        `<meta property="article:published_time" content="${publishedISO}" />`,
        `<meta property="article:modified_time"  content="${modifiedISO}" />`,
        `<meta property="article:author"         content="${escapeHtml(authorUrl)}" />`,
        // On-Page: Open Graph article taxonomy
        `<meta property="article:section"        content="${escapeHtml(subCatEM)}" />`,
        `<meta property="article:tag"            content="fintech SEO" />`,
        `<meta property="article:tag"            content="free fintech tool" />`,
        `<meta property="article:tag"            content="${escapeHtml(subCatEM)}" />`,
        // Off-Page: Twitter/X rich-card data labels (Tool Type + Availability)
        `<meta name="twitter:label1" content="Tool Type" />`,
        `<meta name="twitter:data1"  content="${escapeHtml(subCatEM)}" />`,
        `<meta name="twitter:label2" content="Availability" />`,
        `<meta name="twitter:data2"  content="Free, no sign-up" />`,
      );
    }

    return {
      title: m.title,
      description: m.description,
      canonical,
      ogType: "website",
      // G1/G2: tool pages use a dynamic branded OG card; all other pages use
      // the global opengraph.jpg. The /api/og endpoint renders per-tool cards
      // so social shares show the tool name — mirrors ssrMeta.ts runtime path.
      ogImage: isToolPage
        ? `${siteUrl}/api/og?title=${encodeURIComponent(m.title.split("|")[0].trim())}&category=Tools`
        : `${siteUrl}/opengraph.jpg`,
      ogImageAlt: isToolPage
        ? m.title.split("|")[0].trim()
        : "FintechPressHub - Fintech SEO Agency",
      schemas: [
        organizationSchema(siteUrl),
        websiteSchema(siteUrl),
        breadcrumbSchema(pathname, m.title.split("|")[0].trim(), siteUrl),
        extraSchema,
        faqSchema(faqs),
        ...toolSchemas,
      ],
      ...(isToolPage ? { extraMeta: toolExtraMeta } : {}),
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
