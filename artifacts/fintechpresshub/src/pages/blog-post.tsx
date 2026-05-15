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
  Linkedin,
  Link2,
  Check,
  Mail,
  ChevronRight,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  usePublicPosts,
  usePublicPostBySlug,
  type PublicPost,
} from "@/data/usePublicPosts";
import { prefetchBlogPost } from "@/lib/route-prefetch";
import { authorSlugFromName, getAuthorByName } from "@/data/authors";
import {
  resolveAuthorPhoto,
  useAuthorPhotoOverrides,
} from "@/data/useAuthorPhotos";
import { useAuth } from "@workspace/replit-auth-web";
import { useIncrementBlogPostView } from "@workspace/api-client-react";
import { BlogPostToc } from "@/components/BlogPostToc";
import { BlogPostNewsletterCta } from "@/components/BlogPostNewsletterCta";
import { optimizeImageUrl, buildSrcSet } from "@/lib/imageUtils";
import { COMPARISONS } from "@/data/comparisons";

function getRelatedComparisons(category: string, tags: string[] = []) {
  const text = [category, ...tags].join(" ").toLowerCase();
  let slugs: string[];
  if (/paid|ppc|google ads|adwords/.test(text))
    slugs = ["content-led-vs-paid", "agency-vs-in-house", "vs-seo-tools"];
  else if (/pr|press|media|publication/.test(text))
    slugs = ["vs-pr-agencies", "specialist-vs-generalist", "agency-vs-in-house"];
  else if (/freelan|writer|content marketing/.test(text))
    slugs = ["vs-freelancers", "agency-vs-in-house", "specialist-vs-generalist"];
  else if (/tool|software|platform|saas|ahrefs|semrush/.test(text))
    slugs = ["vs-seo-tools", "content-led-vs-paid", "agency-vs-in-house"];
  else if (/in.house|hire|team|recruit/.test(text))
    slugs = ["agency-vs-in-house", "vs-freelancers", "specialist-vs-generalist"];
  else
    slugs = ["agency-vs-in-house", "content-led-vs-paid", "specialist-vs-generalist"];
  return COMPARISONS.filter((c) => slugs.includes(c.slug)).slice(0, 3);
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
  // 1. Inject anchor IDs on h2/h3 headings for the sticky TOC.
  let processed = html.replace(
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
  // 2. Add rel attributes to outbound <a href="http…"> links.
  //   - rel="noopener noreferrer" — security hygiene (always).
  //   - rel="sponsored"           — when the URL carries an affiliate /
  //                                 referral / partner tracking parameter
  //                                 (heuristic match below). White Hat
  //                                 requirement per Google's Link Spam Policy
  //                                 (https://developers.google.com/search/docs/
  //                                 essentials/spam-policies#link-spam):
  //                                 paid / incentivised links MUST be marked
  //                                 sponsored or nofollow. Catching these
  //                                 automatically defends against accidental
  //                                 link-scheme exposure when a contributor
  //                                 pastes an affiliate URL.
  //   - rel="ugc"                 — when the link sits inside an element with
  //                                 class containing "ugc" (e.g. an editor
  //                                 wrapping a quoted reader comment in
  //                                 <blockquote class="ugc">). Google's UGC
  //                                 attribute (introduced 2019) is the
  //                                 White Hat way to declare user-contributed
  //                                 outbound links without a blanket nofollow.
  // Affiliate / referral query-param patterns recognised by major networks:
  //   ?ref= ?aff= ?affiliate= ?fpr= ?referral= ?partner= ?pid= &tag= (Amazon)
  //   ?utm_medium=affiliate  &utm_source=affiliate
  // Affiliate / referral / partner query-param keys recognised by major
  // networks (Amazon Associates, Impact, ShareASale, CJ, Awin, Rakuten,
  // PartnerStack, Refersion, etc.).
  const AFFILIATE_PARAM_KEYS = new Set([
    "ref", "aff", "affiliate", "fpr", "referral", "partner", "pid", "tag",
  ]);
  const mergeRel = (existing: string, additions: string[]): string => {
    const parts = new Set(existing.split(/\s+/).filter(Boolean));
    for (const a of additions) parts.add(a);
    return Array.from(parts).join(" ");
  };
  // hrefs in HTML body content frequently arrive entity-encoded
  // (`&amp;tag=...` instead of `&tag=...`). Decode the common entities
  // before parsing so an affiliate parameter in any non-first query
  // position is still detected. We don't need a full HTML-entity decoder
  // here — only the four entities that legally appear inside an href value.
  const decodeHrefEntities = (s: string): string =>
    s.replace(/&amp;/g, "&").replace(/&#38;/g, "&").replace(/&#x26;/gi, "&");
  const isAffiliateHref = (rawHref: string): boolean => {
    const href = decodeHrefEntities(rawHref);
    try {
      const u = new URL(href);
      for (const key of u.searchParams.keys()) {
        if (AFFILIATE_PARAM_KEYS.has(key.toLowerCase())) return true;
      }
      const med = (u.searchParams.get("utm_medium") || "").toLowerCase();
      const src = (u.searchParams.get("utm_source") || "").toLowerCase();
      if (med === "affiliate" || src === "affiliate") return true;
    } catch {
      // Malformed URL — fall back to a permissive pattern so we still
      // catch obvious affiliate shapes rather than silently letting them
      // through unmarked.
      if (/[?&](ref|aff|affiliate|fpr|referral|partner|pid|tag)=/i.test(href)) return true;
      if (/utm_(medium|source)=affiliate/i.test(href)) return true;
    }
    return false;
  };

  // UGC marker: walk the DOM rather than regex-match same-tag nesting,
  // because nested <blockquote>...<blockquote>...</blockquote>...</blockquote>
  // breaks any non-greedy regex (it closes at the first inner </blockquote>).
  // DOMParser is available in both real browsers and jsdom (used by our
  // prerender pipeline at scripts/prerender.mjs), so this works in every
  // render path. We mark <a> descendants of any element whose `class`
  // attribute contains the token "ugc" with `data-ugc="1"`, then the
  // regex-based rel rewriter below picks them up — same contract as before
  // but now correct for arbitrarily nested wrappers.
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(
        `<!doctype html><body>${processed}</body>`,
        "text/html",
      );
      doc.querySelectorAll<HTMLElement>('[class~="ugc"]').forEach((wrapper) => {
        wrapper.querySelectorAll("a").forEach((a) => a.setAttribute("data-ugc", "1"));
      });
      processed = doc.body.innerHTML;
    } catch {
      // If DOMParser is unavailable (e.g. SSR without jsdom shim), skip the
      // ugc tagging — links will still get noopener/noreferrer/sponsored.
    }
  }

  processed = processed.replace(
    /<a\s([^>]*href=["'](https?:\/\/)[^"'>][^"'>]*["'][^>]*)>/gi,
    (_match, attrs: string) => {
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
      const href = hrefMatch ? hrefMatch[1] : "";
      const additions = ["noopener", "noreferrer"];
      if (isAffiliateHref(href)) additions.push("sponsored");
      if (/\bdata-ugc=["']1["']/.test(attrs)) additions.push("ugc");
      if (/rel=["'][^"']*["']/.test(attrs)) {
        return `<a ${attrs.replace(
          /rel=["']([^"']*)["']/,
          (_r, existing: string) => `rel="${mergeRel(existing, additions)}"`,
        )}>`;
      }
      return `<a ${attrs} rel="${additions.join(" ")}">`;
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
  new Intl.DateTimeFormat(
    typeof navigator !== "undefined" ? navigator.language : "en-GB",
    { month: "long", day: "numeric", year: "numeric" },
  ).format(new Date(iso));

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
  const photoOverrides = useAuthorPhotoOverrides();

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

  // AEO-2 fix: article section names from H2 headings emitted as hasPart
  // WebPageElement entities on BlogPosting JSON-LD. Enables Google Knowledge
  // Graph and Perplexity to cite individual sections directly and improves
  // long-tail ranking for queries matching section topics rather than the
  // full article title. Derived from the already-parsed headings array so
  // there is zero extra parsing cost on the client.
  const articleSections = useMemo(
    () => headings.filter((h) => h.level === 2).map((h) => h.text),
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
  const citations = useMemo(() => {
    if (!contentHtml) return undefined;
    const matches = Array.from(
      contentHtml.matchAll(/href="(https?:\/\/(?!(?:www\.)?fintechpresshub\.com)[^"#?]+)"/g),
      (m) => m[1] as string,
    ).filter((u, i, a) => a.indexOf(u) === i).slice(0, 10);
    return matches.length > 0 ? matches : undefined;
  }, [contentHtml]);

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

  /**
   * Related-posts recommendation engine.
   *
   * Scoring model (per candidate post):
   *   +5  same category as the current post
   *   +2  per shared tag
   * Ties are broken by recency (newer first) so when scores are flat the
   * reader still gets the freshest take. Posts with score 0 are kept as a
   * pure-recency fallback pool so the row is *always* fully populated even
   * for an article in a niche category with no overlap — better to show
   * three good-but-unrelated articles than one orphaned card.
   *
   * Capped at 3 to match the 3-column grid below.
   */
  const RELATED_LIMIT = 3;
  const relatedPosts = useMemo(() => {
    if (!post) return [] as PublicPost[];
    const currentTags = new Set(post.tags ?? []);
    const currentTime = new Date(post.date).getTime();

    type Scored = { post: PublicPost; score: number; time: number };
    const scored: Scored[] = [];
    for (const p of allPosts) {
      if (p.id === post.id) continue;
      let score = 0;
      if (p.category === post.category) score += 5;
      if (currentTags.size > 0 && p.tags) {
        for (const t of p.tags) {
          if (currentTags.has(t)) score += 2;
        }
      }
      scored.push({ post: p, score, time: new Date(p.date).getTime() });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.time - a.time;
    });

    // Prefer posts with non-zero score first; fall back to the recency
    // pool only if we'd otherwise come up short.
    const withScore = scored.filter((s) => s.score > 0);
    const filler = scored.filter((s) => s.score === 0);
    const fillerSorted = filler.sort((a, b) => {
      const tieByDistance =
        Math.abs(currentTime - a.time) - Math.abs(currentTime - b.time);
      return tieByDistance;
    });

    return [...withScore, ...fillerSorted]
      .slice(0, RELATED_LIMIT)
      .map((s) => s.post);
  }, [allPosts, post]);

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  /* ── Reading progress bar ── */
  const articleRef = useRef<HTMLElement>(null);
  const [readProgress, setReadProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // Start counting once the top of the article enters the viewport;
      // finish when its bottom reaches the bottom of the viewport.
      const scrolled = Math.max(0, -top);
      const total = Math.max(1, height - viewH);
      setReadProgress(Math.min(100, (scrolled / total) * 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [slug]);

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const xShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post?.title || "")}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${post?.title || ""} ${shareUrl}`)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(post?.title || "")}&body=${encodeURIComponent(`I thought you might find this article useful:\n\n${shareUrl}`)}`;

  const handleCopyLink = async () => {
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <article ref={articleRef} className="min-h-screen bg-background pb-24">
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
            )}&category=${encodeURIComponent(post.category ?? "Insights")}${
              post.author
                ? `&author=${encodeURIComponent(post.author)}`
                : ""
            }${
              post.authorRole
                ? `&authorRole=${encodeURIComponent(post.authorRole)}`
                : ""
            }`,
          datePublished: post.date,
          // Only emit `dateModified` when the post was actually edited after
          // publish. If we always emit it, Google's BlogPosting validator
          // happily accepts equal values, but social caches (LinkedIn,
          // Facebook) treat any change as a "fresh content" signal and may
          // re-fetch unnecessarily. Gate on the same one-day threshold the
          // visible "Updated" indicator uses to keep the two in sync.
          dateModified: (() => {
            // W6: prefer lastMaterialUpdateAt when set — it's the admin's
            // explicit "this revision was material" signal and produces more
            // accurate freshness signals in BlogPosting JSON-LD than
            // auto-bumped updatedAt.
            if (post.lastMaterialUpdateAt) return post.lastMaterialUpdateAt;
            return isMeaningfullyUpdated(post.date, post.dateModified)
              ? post.dateModified
              : undefined;
          })(),
          abstract: post.excerpt?.trim() || undefined,
          author: post.author,
          authorUrl: `${SITE_URL}/authors/${authorSlugFromName(post.author)}`,
          authorJobTitle: post.authorRole,
          section: post.category,
          tags: post.tags,
          wordCount: wordCount > 0 ? wordCount : undefined,
          timeRequired: timeRequiredIso,
          inLanguage: "en",
          // G5: aboutEntities/mentionEntities → BlogPosting about/mentions
          about:
            post.aboutEntities && post.aboutEntities.length > 0
              ? post.aboutEntities
              : undefined,
          mentions:
            post.mentionEntities && post.mentionEntities.length > 0
              ? post.mentionEntities
              : undefined,
          twitterCreator: (() => {
            const authorRecord = getAuthorByName(post.author ?? "");
            const handle = authorRecord?.social?.twitter;
            if (!handle) return undefined;
            const at = handle.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "@");
            return at.startsWith("@") ? at : `@${at}`;
          })(),
          alternativeHeadline: post.excerpt?.trim().slice(0, 110) || undefined,
          citation: citations,
          // OP-1 / WH-1 fix: machine-readable rights statement for AI citation engines.
          copyrightNotice: `© ${new Date(post.date).getFullYear()} FintechPressHub. All rights reserved.`,
          // GEO-1 fix: declare editorial production jurisdiction. All FintechPressHub
          // content is produced by a UK-based editorial team — distinct from
          // contentLocation (what the article is *about*).
          countryOfOrigin: "United Kingdom",
          // AEO-2 fix: H2 section names as hasPart WebPageElement entities, enabling
          // Google and Perplexity to cite individual sections directly.
          hasPart: articleSections.length > 0 ? articleSections : undefined,
          // GEO/AEO fix: speakable selectors on the BlogPosting entity itself.
          // Google News Audio Overviews require this on the article entity, not
          // just the WebPage companion schema. Mirrors ssrMeta.ts SSR output.
          speakableSelectors: post.blufSummary
            ? ["h1", ".speakable-summary", "h2"]
            : ["h1", "h2"],
          // WH/AEO fix: machine-readable access model — confirms free access
          // for AI citation engines ranking candidates for voice/overview answers.
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          // WH fix: links to licensing page so AI engines can verify quotation
          // and syndication permissions without guessing. Mirrors ssrMeta.ts.
          usageInfo: `${SITE_URL}/terms`,
          // WH fix: explicit "none" hazard declaration for WCAG-aligned E-E-A-T.
          // Required for YMYL fintech content — mirrors ssrMeta.ts SSR output.
          accessibilityHazard: "none",
        }}
        faq={
          post.faqItems && post.faqItems.length > 0
            ? post.faqItems
            : undefined
        }
        speakableSelectors={
          post.blufSummary
            ? ["h1", ".speakable-summary", "h2"]
            : ["h1", "h2"]
        }
        rssFeeds={
          post.author
            ? [
                {
                  href: `/authors/${authorSlugFromName(post.author)}/rss.xml`,
                  title: `${post.author} on FintechPressHub`,
                },
              ]
            : undefined
        }
      />
      {/* Floating vertical share bar (xl+) — rendered in a portal so it is a
          direct child of <body> and is never affected by parent transforms,
          filters, or stacking contexts that would break fixed positioning. */}
      {createPortal(
      <aside
        className="hidden xl:flex flex-col items-center gap-2 fixed left-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl px-2 py-3 shadow-sm"
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
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtnClass}
          aria-label="Share on WhatsApp"
          data-testid="share-whatsapp"
        >
          <WhatsAppIcon className="w-4 h-4" />
        </a>
        <a
          href={facebookShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtnClass}
          aria-label="Share on Facebook"
          data-testid="share-facebook"
        >
          <FacebookIcon className="w-4 h-4" />
        </a>
        <a
          href={emailShareUrl}
          className={shareBtnClass}
          aria-label="Share via Email"
          data-testid="share-email"
        >
          <Mail className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          className={shareBtnClass}
          aria-label={copied ? "Link copied!" : "Copy link"}
          data-testid="share-copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
        </button>
      </aside>,
      document.body
      )}

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
              className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 flex-wrap"
            >
              <Link
                href="/"
                className="font-medium text-slate-600 hover:text-[#0052FF] transition-colors shrink-0"
              >
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <Link
                href="/blog"
                className="font-medium text-slate-600 hover:text-[#0052FF] transition-colors shrink-0"
              >
                Blog
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
              <Link
                href={`/blog/category/${post.category.toLowerCase().replace(/\s+/g, "-")}`}
                className="font-medium text-slate-600 hover:text-[#0052FF] transition-colors truncate max-w-[100px] hidden sm:inline"
              >
                {post.category
                  .split("-")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span
                className="text-slate-500 truncate max-w-[160px] sm:max-w-xs"
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
                src={optimizeImageUrl(post.image, 1200)}
                srcSet={buildSrcSet(post.image, [800, 1200, 1600])}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
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
                  const apPhoto = resolveAuthorPhoto(
                    ap?.slug ?? null,
                    ap?.photo,
                    photoOverrides,
                  );
                  return (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#0052FF] text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                      {apPhoto ? (
                        <img
                          src={apPhoto}
                          alt={`${post.author} headshot`}
                          width={40}
                          height={40}
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
                  <dd>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </dd>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
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
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={shareBtnClass}
              aria-label="Share on WhatsApp"
              data-testid="share-whatsapp-mobile"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={shareBtnClass}
              aria-label="Share on Facebook"
              data-testid="share-facebook-mobile"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>
            <a
              href={emailShareUrl}
              className={shareBtnClass}
              aria-label="Share via Email"
              data-testid="share-email-mobile"
            >
              <Mail className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className={shareBtnClass}
              aria-label={copied ? "Link copied!" : "Copy link"}
              data-testid="share-copy-mobile"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* BLUF (Bottom Line Up Front) panel — G3/speakable summary.
          Rendered only when the post has a blufSummary field set.
          The .speakable-summary class is picked up by SpeakableSpecification. */}
      {post.blufSummary ? (
        <div className="container mx-auto px-4 max-w-4xl mt-8 mb-0">
          <aside
            aria-label="Key insight"
            className="speakable-summary relative overflow-hidden rounded-xl border-l-4 border-[#0052FF] bg-blue-50/60 px-6 py-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0052FF] mb-1.5">
              Bottom line
            </p>
            <p className="text-base text-slate-800 leading-relaxed font-medium">
              {post.blufSummary}
            </p>
          </aside>
        </div>
      ) : null}

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
          {/* Sticky TOC sidebar (desktop) + floating mobile sheet.
              Always rendered so every blog post has the same on-page
              navigation; falls back to section anchors when the article
              has no H2 headings. The component handles smooth-scroll
              jumps and the animated active-heading indicator. */}
          <BlogPostToc items={tocItems} activeId={activeHeadingId} />

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
                        href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, "-")}`}
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
                        {(() => {
                          const profilePhoto = resolveAuthorPhoto(
                            authorProfile?.slug ?? null,
                            authorProfile?.photo,
                            photoOverrides,
                          );
                          return profilePhoto ? (
                            <img
                              src={profilePhoto}
                              alt={`${post.author} headshot`}
                              width={64}
                              height={64}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            authorInitials(post.author)
                          );
                        })()}
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

        {/* Share this article — bottom CTA */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-4">
            Found this useful? Share it with your network:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={linkedinShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-colors"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Share on X"
            >
              <XIcon className="w-4 h-4" />
              X
            </a>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-colors"
              aria-label="Share on WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
              aria-label="Share on Facebook"
            >
              <FacebookIcon className="w-4 h-4" />
              Facebook
            </a>
            <a
              href={emailShareUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white transition-colors"
              aria-label="Share via Email"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#0052FF]/10 text-[#0052FF] hover:bg-[#0052FF] hover:text-white transition-colors"
              aria-label={copied ? "Link copied!" : "Copy link"}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* End-of-article newsletter CTA */}
        <BlogPostNewsletterCta postSlug={post.slug} />

        {/* Related comparisons */}
        {(() => {
          const relatedComparisons = getRelatedComparisons(post.category, post.tags ?? []);
          if (relatedComparisons.length === 0) return null;
          return (
            <section className="mt-16 pt-12 border-t border-slate-200">
              <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
                    Evaluating your options?
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                    Related comparisons
                  </h2>
                </div>
                <Link href="/compare">
                  <Button variant="outline" size="sm">
                    All comparisons <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedComparisons.map((c) => (
                  <Link key={c.slug} href={`/compare/${c.slug}`}>
                    <div className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-[#0052FF] hover:shadow-sm transition-all duration-200 h-full flex flex-col gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0052FF]">
                        {c.eyebrow}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0052FF] transition-colors leading-snug flex-1">
                        {c.heroTitle}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0052FF] mt-1">
                        View comparison <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

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
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  onMouseEnter={prefetchBlogPost}
                  onFocus={prefetchBlogPost}
                  onTouchStart={prefetchBlogPost}
                >
                  <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card">
                    <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                      <img
                        src={rp.image}
                        alt={rp.title}
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={360}
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
