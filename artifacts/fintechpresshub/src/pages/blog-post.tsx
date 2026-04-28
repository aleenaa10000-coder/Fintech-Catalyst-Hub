import { PageMeta } from "@/components/PageMeta";
import { SITE_URL } from "@/lib/metaData";
import { useParams, Link, Redirect } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Calendar,
  User,
  ListOrdered,
  Linkedin,
  Link2,
  ChevronRight,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePublicPosts, usePublicPostBySlug } from "@/data/usePublicPosts";
import { authorSlugFromName, getAuthorByName } from "@/data/authors";
import { useAuth } from "@workspace/replit-auth-web";
import { useIncrementBlogPostView } from "@workspace/api-client-react";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const shareBtnClass =
  "flex items-center justify-center w-10 h-10 rounded-full text-slate-500 bg-slate-100/70 hover:bg-[#0052FF] hover:text-white transition-colors";

type Heading = { id: string; text: string; level: number };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function processContent(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Set<string>();
  const processed = html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();
      let id = slugify(text);
      let n = 2;
      const base = id;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      headings.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    },
  );
  return { html: processed, headings };
}

function authorInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// "Materially newer" means edited at least one full day after publish. Any
// gap smaller than that is almost certainly the post being edited within its
// publish session (typo fix, image swap) — not worth surfacing to readers as
// a freshness signal and not worth busting social-card caches for.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isMeaningfullyUpdated(
  publishedAt: string | undefined,
  modifiedAt: string | undefined,
): boolean {
  if (!publishedAt || !modifiedAt) return false;
  const pub = new Date(publishedAt).getTime();
  const mod = new Date(modifiedAt).getTime();
  if (!Number.isFinite(pub) || !Number.isFinite(mod)) return false;
  return mod - pub >= ONE_DAY_MS;
}

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug || "";
  // Admin-only "Edit on /admin/blog" affordance. `user.isAdmin` is computed
  // server-side from the ADMIN_EMAILS allowlist on every /api/auth/user call,
  // so non-admins (and signed-out visitors) never see the button.
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  // Pulls from the merged feed (static seed posts + API-published posts).
  // Slug collisions resolve in favour of the API version, so an admin can
  // republish a seed post in the dashboard to "edit" it.
  const { post, isLoading: postsLoading } = usePublicPostBySlug(slug);
  const { posts: allPosts } = usePublicPosts();

  // Lifetime view tracking. We fire one increment per page load, only for
  // API-managed posts (static seed posts have no DB row to update). Errors
  // are swallowed — view counts are nice-to-have, not critical-path.
  const incrementView = useIncrementBlogPostView();
  const isApiPost = typeof post?.id === "string" && post.id.startsWith("api-");
  useEffect(() => {
    if (!slug || !isApiPost) return;
    incrementView.mutate({ slug });
    // We deliberately exclude `incrementView` from deps — the mutation hook
    // is stable and including it would re-fire on every render. Pinging
    // exactly once per slug change is the desired semantic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isApiPost]);

  const { contentHtml, headings } = useMemo(() => {
    if (!post?.content) return { contentHtml: "", headings: [] as Heading[] };
    const processed = processContent(post.content);
    return { contentHtml: processed.html, headings: processed.headings };
  }, [post?.content]);

  // Word count + ISO 8601 reading time. Both are emitted to BlogPosting JSON-LD
  // (`wordCount`, `timeRequired`) and the word count also appears in the hero
  // stat row as a quick credibility / depth signal for readers.
  const { wordCount, readingMinutes, timeRequiredIso } = useMemo(() => {
    if (!contentHtml) {
      return { wordCount: 0, readingMinutes: 0, timeRequiredIso: undefined };
    }
    const plain = contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(" ").length : 0;
    // 225 wpm is the conservative reading-speed midpoint used by Medium/Blinkist.
    const minutes = Math.max(1, Math.round(words / 225));
    return {
      wordCount: words,
      readingMinutes: minutes,
      timeRequiredIso: `PT${minutes}M`,
    };
  }, [contentHtml]);

  // Pull the first 3–5 H2 headings as a "Key Takeaways" / what's-in-this-guide
  // panel above the content. Skim-friendly for readers, BLUF-friendly for AI
  // Overviews and featured snippets, and aligns with the seo-auditor playbook.
  const keyTakeaways = useMemo(
    () => headings.filter((h) => h.level === 2).slice(0, 5),
    [headings],
  );

  // Fallback bullets derived from the post excerpt + tags, used when the
  // article body has no H2 headings. Guarantees every blog post renders the
  // same Key takeaways panel so presentation is consistent across the site.
  const fallbackTakeaways = useMemo(() => {
    if (!post) return [] as string[];
    const sentences = (post.excerpt || "")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12)
      .slice(0, 3);
    if (sentences.length >= 3) return sentences;
    const tagBullets = (post.tags || [])
      .slice(0, 3 - sentences.length)
      .map(
        (t: string) =>
          `What ${t.toLowerCase()} means for ${post.category.toLowerCase()} teams in 2026.`,
      );
    return [...sentences, ...tagBullets];
  }, [post]);

  // Fallback "On this page" anchors for posts with no H2 headings. These
  // map to wrapper IDs we render around the article body, author bio, and
  // related posts grid further down the page.
  const fallbackToc = useMemo(
    () => [
      { id: "post-article", text: "Read the article", level: 2 as const },
      { id: "post-author", text: "About the author", level: 2 as const },
      { id: "post-related", text: "Related articles", level: 2 as const },
    ],
    [],
  );

  const tocItems = headings.length > 0 ? headings : fallbackToc;

  // Split article content roughly in half (at the closest </p> after midpoint)
  // so we can insert an inline Lead Magnet CTA between the two halves.
  const { firstHalfHtml, secondHalfHtml } = useMemo(() => {
    if (!contentHtml) return { firstHalfHtml: "", secondHalfHtml: "" };
    const mid = Math.floor(contentHtml.length / 2);
    const splitAt = contentHtml.indexOf("</p>", mid);
    if (splitAt === -1)
      return { firstHalfHtml: contentHtml, secondHalfHtml: "" };
    const cut = splitAt + 4;
    return {
      firstHalfHtml: contentHtml.slice(0, cut),
      secondHalfHtml: contentHtml.slice(cut),
    };
  }, [contentHtml]);

  // Reading progress bar
  const [readProgress, setReadProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop;
      const max = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
      setReadProgress(max > 0 ? Math.min(100, (scrolled / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slug]);

  const relatedPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.category === post?.category && p.id !== post?.id)
        .slice(0, 3),
    [allPosts, post?.id, post?.category],
  );

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [slug]);

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl,
  )}`;
  const xShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    shareUrl,
  )}&text=${encodeURIComponent(post?.title || "")}`;

  const handleCopyLink = async () => {
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    if (!contentHtml || tocItems.length === 0) return;
    const elements = tocItems
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topId = tocItems.find((h) => visible.has(h.id))?.id;
          if (topId) setActiveHeadingId(topId);
        }
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: [0, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [contentHtml, tocItems]);

  // Don't redirect to /404 while the API list is still loading — otherwise
  // direct hits on a post that only exists in the database would briefly
  // 404 before the data resolves. Show a quiet placeholder instead.
  if (!post) {
    if (postsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      );
    }
    return <Redirect to="/404" />;
  }

  return (
    <article className="min-h-screen bg-background pb-24">
      {/* Fixed reading-progress bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-[60]"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[#0052FF] transition-[width] duration-100 ease-out"
          style={{ width: `${readProgress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(readProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        />
      </div>
      <PageMeta
        title={
          post.seoTitle?.trim()
            ? `${post.seoTitle.trim()} | FintechPressHub`
            : `${post.title} | FintechPressHub`
        }
        description={
          (post.seoDescription?.trim() || post.excerpt) ?? undefined
        }
        noindex={post.noIndex === true}
        article={{
          title: post.seoTitle?.trim() || post.title,
          description:
            (post.seoDescription?.trim() || post.excerpt) ?? undefined,
          image:
            post.seoOgImage?.trim() ||
            `${SITE_URL}/api/og?title=${encodeURIComponent(
              post.title,
            )}&category=${encodeURIComponent(post.category ?? "Insights")}`,
          datePublished: post.date,
          // Only emit `dateModified` when the post was actually edited after
          // publish. If we always emit it, Google's BlogPosting validator
          // happily accepts equal values, but social caches (LinkedIn,
          // Facebook) treat any change as a "fresh content" signal and may
          // re-fetch unnecessarily. Gate on the same one-day threshold the
          // visible "Updated" indicator uses to keep the two in sync.
          dateModified: isMeaningfullyUpdated(post.date, post.dateModified)
            ? post.dateModified
            : undefined,
          author: post.author,
          authorUrl: `${SITE_URL}/authors/${authorSlugFromName(post.author)}`,
          authorJobTitle: post.authorRole,
          section: post.category,
          tags: post.tags,
          wordCount: wordCount > 0 ? wordCount : undefined,
          timeRequired: timeRequiredIso,
          inLanguage: "en",
        }}
      />
      {/* Floating vertical share bar (xl+) */}
      <aside
        className="hidden xl:flex flex-col items-center gap-2 fixed left-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-2 py-3 shadow-sm"
        aria-label="Share this article"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pb-1">
          Share
        </span>
        <a
          href={linkedinShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtnClass}
          aria-label="Share on LinkedIn"
          data-testid="share-linkedin"
        >
          <Linkedin className="w-4 h-4" />
        </a>
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtnClass}
          aria-label="Share on X"
          data-testid="share-x"
        >
          <XIcon className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          className={shareBtnClass}
          aria-label="Copy link"
          data-testid="share-copy"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </aside>

      {/* Hero — Moov-style image-first layout.
          The large cover image is the hero. Title, excerpt, and a compact
          horizontal author/date/category/share row sit beneath it. On lg+
          the article body that follows uses a right-anchored sticky TOC. */}
      <header className="relative bg-white border-b border-slate-200">
        <div className="relative container mx-auto px-4 max-w-5xl pt-8 lg:pt-12 pb-10 lg:pb-14">
          {/* Top breadcrumb row */}
          <div className="flex items-center justify-between gap-4 mb-6 lg:mb-8">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0"
            >
              <Link
                href="/blog"
                className="inline-flex items-center font-medium text-slate-600 hover:text-[#0052FF] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Blog
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span
                className="text-slate-500 truncate max-w-[260px] sm:max-w-md"
                aria-current="page"
              >
                {post.title}
              </span>
            </nav>
            {isAdmin && (
              <Link
                href={`/admin/blog?slug=${encodeURIComponent(slug)}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#0052FF]/30 bg-[#0052FF]/5 px-3 py-1.5 text-xs font-semibold text-[#0052FF] hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF] transition-colors"
                aria-label={`Edit "${post.title}" in the admin dashboard`}
                data-testid="link-admin-edit-post"
                title="Edit on /admin/blog"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            )}
          </div>

          {/* Hero cover image — full-width within the article container,
              large (16:9 by default, capped at ~520px tall on wide screens).
              fetchPriority="high" + eager loading lock in LCP. The
              decorative background panel mirrors the screenshot mockups in
              the Moov reference layout. */}
          <figure
            className="relative w-full overflow-hidden rounded-2xl shadow-xl border border-slate-100 bg-gradient-to-br from-slate-50 via-blue-50/40 to-white"
            data-testid="blog-hero-image"
          >
            <div className="aspect-[16/9] sm:aspect-[16/8] w-full">
              <img
                src={post.image}
                alt={`${post.title} — ${post.category} guide cover image`}
                width={1600}
                height={800}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </figure>

          {/* Title block sits beneath the hero image, left-aligned. */}
          <div className="mt-10 lg:mt-12 max-w-4xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider mb-5">
              {post.category}
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 mb-5">
              {post.title}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          {/* Compact horizontal meta row — author chip on the left, date /
              read time / category in the middle, share icons on the right.
              Mirrors the Moov byline strip directly under the title. */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-4 justify-between">
            {/* LEFT: author chip + meta */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href={`/authors/${authorSlugFromName(post.author)}`}
                className="flex items-center gap-3 group"
                data-testid={`link-author-${authorSlugFromName(post.author)}`}
              >
                {(() => {
                  const ap = getAuthorByName(post.author);
                  return (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#0052FF] text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                      {ap?.photo ? (
                        <img
                          src={ap.photo}
                          alt={`${post.author} headshot`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        authorInitials(post.author)
                      )}
                    </div>
                  );
                })()}
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-[#0052FF] transition-colors truncate">
                    {post.author}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {post.authorRole}
                  </span>
                </div>
              </Link>

              <span
                aria-hidden="true"
                className="hidden sm:inline-block w-px h-8 bg-slate-200"
              />

              <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar
                    className="w-4 h-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                  <dt className="sr-only">Published</dt>
                  <dd>{formatDate(post.date)}</dd>
                </div>
                {isMeaningfullyUpdated(post.date, post.dateModified) ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Pencil
                      className="w-4 h-4 text-emerald-500 shrink-0"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">Last updated</dt>
                    <dd data-testid="blog-post-updated-at">
                      Updated{" "}
                      <time dateTime={post.dateModified}>
                        {formatDate(post.dateModified!)}
                      </time>
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock
                    className="w-4 h-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                  <dt className="sr-only">Reading time</dt>
                  <dd>
                    {readingMinutes > 0
                      ? `${readingMinutes} min read`
                      : post.readTime}
                  </dd>
                </div>
                {wordCount > 0 ? (
                  <div className="hidden md:flex items-center gap-1.5 text-slate-600">
                    <BookOpen
                      className="w-4 h-4 text-slate-400 shrink-0"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">Word count</dt>
                    <dd>{wordCount.toLocaleString()} words</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* RIGHT: inline share icons (replaces the old mobile-only bar
                — the floating xl+ vertical share rail is unchanged). */}
          <div
            className="flex items-center gap-2 xl:hidden"
            aria-label="Share this article"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
              Share
            </span>
            <a
              href={linkedinShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={shareBtnClass}
              aria-label="Share on LinkedIn"
              data-testid="share-linkedin-mobile"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={shareBtnClass}
              aria-label="Share on X"
              data-testid="share-x-mobile"
            >
              <XIcon className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className={shareBtnClass}
              aria-label="Copy link"
              data-testid="share-copy-mobile"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* Key Takeaways panel — always rendered for visual consistency
          across every blog post. When the article has H2 headings we use
          them as deep links; otherwise we fall back to bullets derived
          from the post excerpt + tags. */}
      <div className="container mx-auto px-4 max-w-4xl mb-12">
        <aside
          aria-labelledby="key-takeaways-heading"
          className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 sm:p-8 shadow-sm"
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#0052FF]/10 blur-2xl pointer-events-none"
          />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-[#0052FF] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0052FF] mb-1">
                In this guide
              </div>
              <h2
                id="key-takeaways-heading"
                className="text-lg sm:text-xl font-bold text-slate-900 mb-4"
              >
                Key takeaways
              </h2>
              <ol className="space-y-2.5">
                {keyTakeaways.length > 0
                  ? keyTakeaways.map((h, idx) => (
                      <li key={h.id} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-blue-200 text-[#0052FF] text-xs font-bold"
                        >
                          {idx + 1}
                        </span>
                        <a
                          href={`#${h.id}`}
                          className="text-sm sm:text-base text-slate-700 hover:text-[#0052FF] hover:underline underline-offset-4 decoration-2 transition-colors"
                          data-testid={`key-takeaway-${h.id}`}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))
                  : fallbackTakeaways.map((text, idx) => (
                      <li
                        key={`fallback-${idx}`}
                        className="flex items-start gap-3"
                      >
                        <span
                          aria-hidden="true"
                          className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-blue-200 text-[#0052FF] text-xs font-bold"
                        >
                          {idx + 1}
                        </span>
                        <span
                          className="text-sm sm:text-base text-slate-700"
                          data-testid={`key-takeaway-fallback-${idx}`}
                        >
                          {text}
                        </span>
                      </li>
                    ))}
              </ol>
            </div>
          </div>
        </aside>
      </div>

      {/* Content + sticky TOC grid */}
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Sticky TOC (desktop only) — 1/4 width. Always rendered so
              every blog post has the same on-page navigation; falls back to
              section anchors when the article has no H2 headings. */}
          <aside className="hidden lg:block lg:col-span-1">
            <nav className="sticky top-24" aria-label="On this page">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                <ListOrdered className="w-4 h-4" />
                On this page
              </div>
              <ul className="space-y-2 border-l border-slate-200">
                {tocItems.map((h) => {
                  const active = activeHeadingId === h.id;
                  return (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block text-sm border-l-2 -ml-px pl-4 py-1 transition-all ${
                          h.level === 3 ? "pl-7 text-[13px]" : "font-medium"
                        } ${
                          active
                            ? "text-[#0052FF] border-[#0052FF] font-semibold"
                            : "text-slate-600 border-transparent hover:text-[#0052FF] hover:border-[#0052FF]"
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main article column — 3/4 width */}
          <div className="lg:col-span-3 min-w-0">
            <div id="post-article" className="max-w-3xl mx-auto scroll-mt-24">
              {(() => {
                const proseClass =
                  "prose prose-lg dark:prose-invert max-w-none leading-relaxed " +
                  "prose-headings:font-bold prose-headings:tracking-tight " +
                  "prose-h2:text-[#0a2540] prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 " +
                  "prose-h3:text-[#0052FF] prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 " +
                  "prose-h2:scroll-mt-24 prose-h3:scroll-mt-24 " +
                  "prose-p:text-slate-700 prose-p:leading-[1.8] " +
                  "prose-a:text-[#0052FF] prose-a:no-underline hover:prose-a:underline " +
                  // Inline images: full-width within the content column,
                  // rounded-2xl corners, soft border + lifted shadow to
                  // match the Moov-style screenshot mockups in body copy.
                  "prose-img:w-full prose-img:rounded-2xl prose-img:shadow-lg prose-img:border prose-img:border-slate-100 prose-img:my-8 " +
                  "prose-figure:my-8 prose-figcaption:text-sm prose-figcaption:text-slate-500 prose-figcaption:text-center prose-figcaption:mt-3 " +
                  "prose-blockquote:border-l-4 prose-blockquote:border-[#0052FF] prose-blockquote:bg-blue-50/40 prose-blockquote:py-1 prose-blockquote:not-italic " +
                  "prose-code:before:content-none prose-code:after:content-none prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded";
                return (
                  <>
                    <div
                      className={proseClass}
                      dangerouslySetInnerHTML={{ __html: firstHalfHtml }}
                    />

                    {/* Inline Lead Magnet CTA */}
                    {secondHalfHtml ? (
                      <aside
                        className="my-12 rounded-2xl border border-blue-200 bg-blue-50/70 p-6 sm:p-8 shadow-sm"
                        aria-label="Lead magnet call to action"
                      >
                        <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center">
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#0052FF] text-white flex items-center justify-center shadow-md">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#0052FF] mb-1">
                              Free Strategy Session
                            </div>
                            <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                              Want a custom plan for your fintech brand?
                            </h4>
                            <p className="text-sm text-slate-600">
                              Get a complimentary audit of your current SEO,
                              content, and link profile from our team.
                            </p>
                          </div>
                          <Link href="/contact" className="w-full sm:w-auto">
                            <Button
                              size="lg"
                              className="w-full sm:w-auto bg-[#0052FF] hover:bg-[#0040CC] text-white"
                              data-testid="cta-lead-magnet"
                            >
                              Schedule Your SEO Audit
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </aside>
                    ) : null}

                    <div
                      className={proseClass}
                      dangerouslySetInnerHTML={{ __html: secondHalfHtml }}
                    />
                  </>
                );
              })()}

              {/* Tags — each chip deep-links into /blog?tag=<name> so the
                  reader can browse other articles sharing that tag. */}
              {post.tags && post.tags.length > 0 ? (
                <div className="mt-16 pt-8 border-t border-slate-200">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        aria-label={`Browse other articles tagged ${tag}`}
                        className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-[#0052FF] hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF] transition-colors duration-200 cursor-pointer"
                        data-testid={`tag-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

            {/* Author Bio */}
            {(() => {
              const authorProfile = getAuthorByName(post.author);
              const authorSlug = authorSlugFromName(post.author);
              const bioText = authorProfile
                ? authorProfile.shortBio
                : `${post.author} writes about ${post.category.toLowerCase()} for fintech operators at FintechPressHub, drawing on hands-on experience running SEO and content programs for venture-backed finance brands.`;
              return (
                <Card id="post-author" className="mt-12 border-slate-200 bg-gradient-to-br from-blue-50/40 to-white scroll-mt-24">
                  <CardContent className="p-8 flex flex-col sm:flex-row items-start gap-6">
                    <Link
                      href={`/authors/${authorSlug}`}
                      className="shrink-0"
                      aria-label={`View ${post.author}'s profile`}
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#0052FF] text-white flex items-center justify-center font-bold text-xl shadow-md hover:scale-105 transition-transform">
                        {authorProfile?.photo ? (
                          <img
                            src={authorProfile.photo}
                            alt={`${post.author} headshot`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          authorInitials(post.author)
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
                        Written by
                      </div>
                      <Link
                        href={`/authors/${authorSlug}`}
                        className="text-xl font-bold text-slate-900 hover:text-[#0052FF] transition-colors"
                      >
                        {post.author}
                      </Link>
                      <div className="text-sm text-muted-foreground mb-3">
                        {post.authorRole}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        {bioText}
                      </p>
                      <Link href={`/authors/${authorSlug}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#0052FF]/30 text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
                          data-testid={`button-view-author-${authorSlug}`}
                        >
                          View full profile
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section
            id="post-related"
            className="mt-24 pt-16 border-t border-slate-200 scroll-mt-24"
          >
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
                  Keep Reading
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  Related articles
                </h2>
              </div>
              <Link href="/blog">
                <Button variant="outline" size="sm">
                  All articles <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp: any) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`}>
                  <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card">
                    <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                      <img
                        src={rp.image}
                        alt={rp.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-[10px] font-semibold uppercase tracking-wider">
                          {rp.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {rp.readTime}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2 leading-snug">
                        {rp.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" />
                        {rp.author}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
