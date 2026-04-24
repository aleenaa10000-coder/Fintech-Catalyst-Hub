import fs from "node:fs/promises";
import path from "node:path";

const BOT_REGEX =
  /(googlebot|bingbot|yandex|baiduspider|duckduckbot|twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|embedly|pinterest|redditbot|applebot|skypeuripreview|vkshare|tumblr|bitrix|xing-contenttabreceiver|google-inspectiontool|googleother|chatgpt|gptbot|perplexitybot|claudebot|amazonbot|mj12bot|ahrefsbot|semrushbot)/i;

const BLOG_SLUG_RE = /^\/blog\/([a-z0-9][a-z0-9-]*)\/?$/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildJsonLd(post, siteUrl, image, url) {
  const node = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? "",
    image: [image],
    datePublished: post.date ?? undefined,
    dateModified: post.dateModified ?? post.date ?? undefined,
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
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: post.category ?? undefined,
    keywords: Array.isArray(post.tags) && post.tags.length
      ? post.tags.join(", ")
      : undefined,
    url,
    inLanguage: "en",
  };

  return JSON.stringify(node, (_k, v) => (v === undefined ? undefined : v));
}

function injectMeta(html, post, siteUrl) {
  const url = `${siteUrl}/blog/${post.slug}`;
  const title = `${post.title} | FintechPressHub`;
  const description = post.excerpt ?? "";
  const category = post.category ?? "Insights";
  const image = `${siteUrl}/api/og?title=${encodeURIComponent(
    post.title,
  )}&category=${encodeURIComponent(category)}`;
  const datePublished = post.date ?? "";

  const setContent = (regex, value) => {
    html = html.replace(regex, (match) =>
      match.replace(/content="[^"]*"/, `content="${escapeHtml(value)}"`),
    );
  };

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );

  setContent(/<meta\s+name="description"[^>]*>/, description);

  setContent(/<meta\s+property="og:type"[^>]*>/, "article");
  setContent(/<meta\s+property="og:url"[^>]*>/, url);
  setContent(/<meta\s+property="og:title"[^>]*>/, title);
  setContent(/<meta\s+property="og:description"[^>]*>/, description);
  setContent(/<meta\s+property="og:image"(?!:)[^>]*>/, image);
  setContent(/<meta\s+property="og:image:secure_url"[^>]*>/, image);
  setContent(/<meta\s+property="og:image:alt"[^>]*>/, post.title);

  setContent(/<meta\s+name="twitter:url"[^>]*>/, url);
  setContent(/<meta\s+name="twitter:title"[^>]*>/, title);
  setContent(/<meta\s+name="twitter:description"[^>]*>/, description);
  setContent(/<meta\s+name="twitter:image"(?!:)[^>]*>/, image);
  setContent(/<meta\s+name="twitter:image:alt"[^>]*>/, post.title);

  const articleTags = `
    <meta property="article:published_time" content="${escapeHtml(datePublished)}" />
    <meta property="article:section" content="${escapeHtml(category)}" />
    <meta property="article:author" content="${escapeHtml(post.author ?? "")}" />`;
  html = html.replace(
    /<meta\s+name="twitter:image:alt"[^>]*>/,
    (m) => `${m}\n${articleTags}`,
  );

  const jsonLd = buildJsonLd(post, siteUrl, image, url)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const ldScript = `<script type="application/ld+json" data-bot-og="article">${jsonLd}</script>`;
  html = html.replace(/<\/head>/i, `    ${ldScript}\n  </head>`);

  return html;
}

export default function botOgPlugin({ root, siteUrl }) {
  const postsPath = path.resolve(root, "src/data/posts.js");
  let cachedPosts = null;
  let cachedAt = 0;
  const POSTS_TTL_MS = 30_000;

  async function loadPosts() {
    const now = Date.now();
    if (cachedPosts && now - cachedAt < POSTS_TTL_MS) return cachedPosts;
    const url = `file://${postsPath}?t=${now}`;
    const mod = await import(url);
    cachedPosts = mod.default ?? mod.posts ?? mod;
    cachedAt = now;
    return cachedPosts;
  }

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
        const match = BLOG_SLUG_RE.exec(pathOnly);
        if (!match) return next();

        const posts = await loadPosts();
        if (!Array.isArray(posts)) return next();
        const post = posts.find((p) => p && p.slug === match[1]);
        if (!post) return next();

        const indexHtml = await getIndexHtml(req);
        const html = injectMeta(indexHtml, post, siteUrl);

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
