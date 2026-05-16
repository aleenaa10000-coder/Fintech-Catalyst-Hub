import { useMemo } from "react";
import {
  useListBlogPosts,
  type BlogPost as ApiBlogPost,
} from "@workspace/api-client-react";

/**
 * Unified shape used by the public-facing blog pages (`/blog` and
 * `/blog/<slug>`). All posts come from the API (DB) and are served
 * via the admin publish flow.
 */
export type PublicPost = {
  id: number | string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  /**
   * ISO timestamp of the most recent edit. For API posts this maps from the DB
   * `updated_at` column (auto-bumped via Drizzle's `$onUpdate`). The UI shows
   * a "Last updated" indicator only when this is materially newer than `date`.
   */
  dateModified?: string;
  readTime: string;
  author: string;
  authorRole: string;
  content: string;
  tags?: string[];
  featured?: boolean;
  /**
   * Lifetime view count, only present for API-managed posts.
   */
  viewCount?: number;
  /**
   * Optional per-post SEO overrides set in the admin dashboard. When
   * present these take precedence over the auto-derived defaults
   * (title, excerpt, cover image) inside `<PageMeta>`.
   */
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoOgImage?: string | null;
  /**
   * When true, the post detail page emits
   * `<meta name="robots" content="noindex,nofollow">` so search engines
   * skip it. Toggled per-post in the admin dashboard.
   */
  noIndex?: boolean;
  /** Structured FAQ items for FAQPage JSON-LD. */
  faqItems?: Array<{ question: string; answer: string }> | null;
  /** Bottom-Line-Up-Front summary. Shown above the fold as a callout. */
  blufSummary?: string | null;
  /**
   * Timestamp of the last material content update. When set, overrides
   * `dateModified` in BlogPosting JSON-LD for more accurate freshness signals.
   */
  lastMaterialUpdateAt?: string | null;
  /** Primary topics this article is about — populates BlogPosting `about`. */
  aboutEntities?: string[] | null;
  /** Entities mentioned in the article — populates BlogPosting `mentions`. */
  mentionEntities?: string[] | null;
  /** Optional inline body image shown after the first content section. */
  inlineImage1?: string | null;
  /** Optional inline body image shown in the second half of the article. */
  inlineImage2?: string | null;
};

/**
 * Convert an API-managed `BlogPost` (DB row) into the unified `PublicPost`
 * shape used by the public blog. Field renames:
 *   coverImage     -> image
 *   publishedAt    -> date
 *   readingMinutes -> readTime ("X min read")
 */
function fromApi(post: ApiBlogPost): PublicPost {
  return {
    id: `api-${post.id}`,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    image: post.coverImage,
    date: post.publishedAt,
    dateModified: post.updatedAt,
    readTime: `${Math.max(1, post.readingMinutes)} min read`,
    author: post.author,
    authorRole: post.authorRole,
    content: post.content,
    tags: post.tags,
    featured: post.featured,
    viewCount: post.viewCount,
    seoTitle: post.seoTitle ?? null,
    seoDescription: post.seoDescription ?? null,
    seoOgImage: post.seoOgImage ?? null,
    noIndex: post.noIndex,
    faqItems: post.faqItems ?? null,
    blufSummary: post.blufSummary ?? null,
    lastMaterialUpdateAt: post.lastMaterialUpdateAt ?? null,
    aboutEntities: post.aboutEntities ?? null,
    mentionEntities: post.mentionEntities ?? null,
    inlineImage1: post.inlineImage1 ?? null,
    inlineImage2: post.inlineImage2 ?? null,
  };
}

/**
 * Returns all published blog posts from the API, sorted newest-first.
 */
export function usePublicPosts(): {
  posts: PublicPost[];
  isLoading: boolean;
} {
  const { data: apiPosts, isLoading } = useListBlogPosts();

  const posts = useMemo(() => {
    if (!apiPosts) return [];
    return apiPosts.map(fromApi).sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
  }, [apiPosts]);

  return { posts, isLoading };
}

/**
 * Convenience lookup for a single post by slug. Returns `undefined` when no
 * post matches (the consumer is responsible for redirecting / 404ing).
 */
export function usePublicPostBySlug(slug: string): {
  post: PublicPost | undefined;
  isLoading: boolean;
} {
  const { posts, isLoading } = usePublicPosts();
  const post = useMemo(
    () => posts.find((p) => p.slug === slug),
    [posts, slug],
  );
  return { post, isLoading };
}
