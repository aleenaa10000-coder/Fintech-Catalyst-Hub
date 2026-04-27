import { useMemo } from "react";
import {
  useListBlogPosts,
  type BlogPost as ApiBlogPost,
} from "@workspace/api-client-react";
import staticPosts from "@/data/posts.js";

/**
 * Unified shape used by the public-facing blog pages (`/blog` and
 * `/blog/<slug>`). It mirrors the legacy static-post shape that lives in
 * `posts.js` so the existing components don't need to be rewritten.
 *
 * `featured` and `tags` are optional because the legacy seed posts in
 * `posts.js` don't always carry them.
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
   * ISO timestamp of the most recent edit. Optional because static seed posts
   * in `posts.js` don't track edits. For API posts this maps from the DB
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
   * Lifetime view count, only present for API-managed posts (static seed
   * posts have no view tracking and fall back to 0 in the "Most read" sort).
   */
  viewCount?: number;
};

type StaticPost = PublicPost;

/**
 * Convert an API-managed `BlogPost` (DB row) into the unified `PublicPost`
 * shape used by the public blog. Field renames:
 *   coverImage     -> image
 *   publishedAt    -> date
 *   readingMinutes -> readTime ("X min read")
 *
 * The API id is namespaced with an `api-` prefix so it can never collide
 * with a static seed post id (those are plain numbers).
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
  };
}

/**
 * Returns the merged public-post list. Static seed posts render immediately
 * (no network wait); API-published posts are folded in once the request
 * resolves. When a slug exists in both sources, the API version wins —
 * republishing a seed post through `/admin/blog` is the documented way to
 * "edit" it.
 *
 * The result is sorted newest-first by `date` so the homepage and blog index
 * surface fresh content automatically.
 */
export function usePublicPosts(): {
  posts: PublicPost[];
  isLoading: boolean;
} {
  const { data: apiPosts, isLoading } = useListBlogPosts();

  const posts = useMemo(() => {
    const merged = new Map<string, PublicPost>();

    // Seed with static posts first so they're the fallback.
    for (const p of staticPosts as StaticPost[]) {
      merged.set(p.slug, p);
    }

    // Overlay API posts (latest source of truth).
    if (apiPosts) {
      for (const p of apiPosts) {
        merged.set(p.slug, fromApi(p));
      }
    }

    return Array.from(merged.values()).sort((a, b) => {
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
