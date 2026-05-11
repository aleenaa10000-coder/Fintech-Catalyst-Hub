import { PageMeta } from "@/components/PageMeta";
import { useParams, Link } from "wouter";
import { SITE_URL } from "@/lib/metaData";
import { usePublicPosts } from "@/data/usePublicPosts";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import NotFound from "@/pages/not-found";

const POSTS_PER_PAGE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogTagPage() {
  const params = useParams();
  const rawSlug = params.slug ?? "";

  const { posts, isLoading } = usePublicPosts();
  const [page, setPage] = useState(1);

  const displayTitle = rawSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const tagPosts = useMemo(() => {
    return posts.filter(
      (p) =>
        Array.isArray(p.tags) &&
        p.tags.some(
          (t) => t.toLowerCase().replace(/\s+/g, "-") === rawSlug,
        ),
    );
  }, [posts, rawSlug]);

  const pagePosts = useMemo(
    () => tagPosts.slice(0, page * POSTS_PER_PAGE),
    [tagPosts, page],
  );

  const description = `Browse all FintechPressHub articles tagged with "${displayTitle}" — expert fintech SEO, content marketing, and industry analysis.`;

  if (!isLoading && tagPosts.length === 0) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${displayTitle} Articles | FintechPressHub`}
        description={description}
        itemList={
          tagPosts.length > 0
            ? {
                name: `${displayTitle} Articles`,
                description,
                items: tagPosts.slice(0, 20).map((p) => ({
                  name: p.title,
                  url: `${SITE_URL}/blog/${p.slug}`,
                  description: p.excerpt?.slice(0, 160),
                })),
              }
            : undefined
        }
      />
      <PageHero
        eyebrow="Tag"
        title={<>{displayTitle}</>}
        description={description}
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : tagPosts.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No articles found</p>
              <p className="text-sm">
                No articles are tagged with "{displayTitle}" yet.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-8">
                {tagPosts.length} article
                {tagPosts.length !== 1 ? "s" : ""} tagged with{" "}
                <span className="font-medium text-foreground">
                  {displayTitle}
                </span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagePosts.map((post) => (
                  <Card
                    key={post.slug}
                    className="group hover:shadow-md transition-shadow overflow-hidden border border-slate-200"
                  >
                    {post.image && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                      </div>
                      <h2 className="font-semibold text-slate-900 leading-snug mb-2 group-hover:text-[#0052FF] transition-colors line-clamp-2">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(post.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </span>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Link
                              key={tag}
                              href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, "-")}`}
                              className="flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-[#0052FF] font-medium mt-4 hover:gap-2 transition-all"
                      >
                        Read article <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pagePosts.length < tagPosts.length && (
                <div className="text-center mt-12">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:border-[#0052FF] hover:text-[#0052FF] transition-colors"
                  >
                    Load more articles
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Related Tags widget — shows sibling tags that co-occur with the
          current tag so readers can explore adjacent topic hubs without
          returning to the blog index. Computed entirely from local post data,
          so no extra fetch is needed. */}
      {(() => {
        if (tagPosts.length === 0) return null;
        const tagFreq = new Map<string, number>();
        for (const p of tagPosts) {
          if (!Array.isArray(p.tags)) continue;
          for (const t of p.tags as string[]) {
            const slug = t.toLowerCase().replace(/\s+/g, "-");
            if (slug === rawSlug) continue;
            tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
          }
        }
        const related = Array.from(tagFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
        if (related.length === 0) return null;
        return (
          <section className="py-12 border-t bg-white">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="flex items-center gap-2 mb-6">
                <Tag className="w-4 h-4 text-[#0052FF]" />
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-700">
                  Related Tag Hubs
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {related.map(([tag, count]) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, "-")}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-[#0052FF] hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF] transition-colors duration-200"
                  >
                    #{tag}
                    <span className="text-[10px] opacity-70 font-normal">
                      {count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      <section className="py-12 bg-secondary/30 border-t">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-muted-foreground mb-4">
            Want to write for FintechPressHub?
          </p>
          <Link
            href="/write-for-us"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0052FF] text-white rounded-lg font-medium hover:bg-[#0040cc] transition-colors"
          >
            See contributor guidelines <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
