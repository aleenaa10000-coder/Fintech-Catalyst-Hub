import { useMemo } from "react";
import { Link } from "wouter";
import { Flame, Eye, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchBlogPost } from "@/lib/route-prefetch";
import type { PublicPost } from "@/data/usePublicPosts";

const DAY_MS = 24 * 60 * 60 * 1000;
const TRENDING_WINDOW_DAYS = 14;
const MAX_ITEMS = 5;

/**
 * "Trending now" score = views / age-in-days (clamped to 1 day to avoid
 * dividing by zero on brand-new posts). This is a recency-weighted
 * popularity heuristic — a 7-day-old post with 700 views ranks above a
 * 90-day-old post with 1,500 views — without requiring a separate
 * per-window analytics pipeline.
 *
 * Posts older than TRENDING_WINDOW_DAYS or with no view data are excluded
 * so the widget stays focused on what's actually heating up right now.
 */
function scorePost(post: PublicPost, now: number): number | null {
  const views = post.viewCount ?? 0;
  if (views <= 0) return null;
  const publishedAt = new Date(post.date).getTime();
  if (Number.isNaN(publishedAt)) return null;
  const ageDays = Math.max((now - publishedAt) / DAY_MS, 0);
  if (ageDays > TRENDING_WINDOW_DAYS) return null;
  return views / Math.max(ageDays, 1);
}

interface Props {
  posts: PublicPost[];
  className?: string;
}

export function TrendingPosts({ posts, className }: Props) {
  const trending = useMemo(() => {
    const now = Date.now();
    return posts
      .map((p) => ({ post: p, score: scorePost(p, now) }))
      .filter((x): x is { post: PublicPost; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ITEMS)
      .map((x) => x.post);
  }, [posts]);

  if (trending.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm",
        className,
      )}
      aria-labelledby="trending-posts-heading"
      data-testid="trending-posts"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 text-orange-600">
            <Flame className="w-4 h-4" aria-hidden />
          </span>
          <div>
            <h2
              id="trending-posts-heading"
              className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900"
            >
              Trending now
            </h2>
            <p className="text-xs text-muted-foreground">
              Most-read fintech posts in the last {TRENDING_WINDOW_DAYS} days
            </p>
          </div>
        </div>
      </div>

      <ol className="space-y-3" data-testid="trending-posts-list">
        {trending.map((post, i) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              onMouseEnter={prefetchBlogPost}
              onFocus={prefetchBlogPost}
              onTouchStart={prefetchBlogPost}
              className="group flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-slate-50 transition-colors"
              data-testid={`trending-post-${i + 1}`}
            >
              <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-bold tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" aria-hidden />
                    {(post.viewCount ?? 0).toLocaleString()} views
                  </span>
                  <span aria-hidden>·</span>
                  <span className="truncate">{post.category}</span>
                </div>
              </div>
              <ArrowRight
                className="shrink-0 w-4 h-4 text-slate-400 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
