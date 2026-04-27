import { PageMeta } from "@/components/PageMeta";
import { useSubscribeToNewsletter } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";
import {
  Calendar,
  Clock,
  ArrowRight,
  Mail,
  CheckCircle2,
  Users,
  Search,
  X,
  Tag as TagIcon,
} from "lucide-react";
import { toast } from "sonner";
import { usePublicPosts, type PublicPost } from "@/data/usePublicPosts";
import { authors } from "@/data/authors";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type Post = PublicPost;

const TOPIC_CATEGORIES: string[] = [
  "Embedded Finance",
  "Open Banking",
  "Payments Infrastructure",
  "BNPL",
  "Neobanking",
  "Lending",
  "Wealthtech",
  "Regtech",
  "Compliance Marketing",
  "Crypto & Stablecoins",
  "Treasury & CFO",
  "Card Issuing",
  "Conversion Optimization",
];

export default function Blog() {
  // Merged feed: static seed posts + anything published through /admin/blog.
  // API posts overlay seed posts on slug collision, so re-publishing a seed
  // post in the dashboard cleanly "edits" it for public visitors.
  const { posts: allPosts } = usePublicPosts();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    for (const name of TOPIC_CATEGORIES) {
      if (!counts.has(name)) counts.set(name, 0);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if ((b.count > 0 ? 1 : 0) !== (a.count > 0 ? 1 : 0)) {
          return (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0);
        }
        if (a.count !== b.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [allPosts]);

  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    undefined,
  );
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);

  // Distinct tags across the merged feed, with usage counts. Sorted by count
  // desc then alphabetically so the most-used tags surface first.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      if (!p.tags) continue;
      for (const t of p.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) =>
        a.count !== b.count ? b.count - a.count : a.name.localeCompare(b.name),
      );
  }, [allPosts]);

  // Combined filter: category AND tag AND search (title + excerpt + tags),
  // case-insensitive. Search trims whitespace and ignores empty queries so
  // the input doesn't accidentally hide posts mid-typing.
  const visiblePosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPosts.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (activeTag && !(p.tags ?? []).includes(activeTag)) return false;
      if (q) {
        const haystack = [
          p.title,
          p.excerpt,
          p.category,
          ...(p.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allPosts, activeCategory, activeTag, searchQuery]);

  const filtersActive = Boolean(
    activeCategory || activeTag || searchQuery.trim(),
  );

  const clearFilters = () => {
    setActiveCategory(undefined);
    setActiveTag(undefined);
    setSearchQuery("");
  };

  const TAG_PREVIEW_COUNT = 12;
  const visibleTags = showAllTags ? tags : tags.slice(0, TAG_PREVIEW_COUNT);

  const NEWSLETTER_AFTER = 6;
  const firstBatch = visiblePosts.slice(0, NEWSLETTER_AFTER);
  const restBatch = visiblePosts.slice(NEWSLETTER_AFTER);
  const showNewsletter = visiblePosts.length >= 3;

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribeMutation = useSubscribeToNewsletter({
    mutation: {
      onSuccess: (data) => {
        setSubscribed(true);
        setEmail("");
        toast.success(
          data.alreadySubscribed
            ? "You're already on the list — thanks!"
            : "You're in. Watch your inbox for the next issue.",
        );
      },
      onError: () => {
        toast.error("Something went wrong. Please try again.");
      },
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    subscribeMutation.mutate({
      data: { email: trimmed, source: "blog" },
    });
  };

  const renderPostCard = (post: Post, i: number) => (
    <motion.div
      key={post.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.35, delay: i * 0.04 }}
    >
      <Link href={`/blog/${post.slug}`} data-testid={`link-post-${post.slug}`}>
        <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out group cursor-pointer bg-card">
          <div className="aspect-[16/9] overflow-hidden bg-slate-100">
            <img
              src={post.image}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <CardContent className="p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </span>
            </div>
            <h2 className="text-lg font-bold mb-3 text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2">
              {post.title}
            </h2>
            <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
              {post.excerpt}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-4 border-t border-slate-100">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.date)}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="blog" />
      <PageHero
        eyebrow="The Fintech Growth Hub"
        title={<>Insights From the Front Lines of Fintech SEO</>}
        description="Actionable strategy on SEO, off-page authority, digital PR, and content marketing — written by the operators running these programs for fintech brands every day."
      />

      {/* Meet the team strip */}
      <section className="py-6 border-b bg-slate-50/60">
        <div className="container mx-auto px-4">
          <Link href="/authors" data-testid="link-meet-the-team">
            <div className="flex items-center justify-between gap-4 flex-wrap group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {authors.slice(0, 4).map((a) => (
                    <div
                      key={a.slug}
                      className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-[#0052FF] text-white flex items-center justify-center text-[11px] font-bold shadow-sm"
                    >
                      {a.photo ? (
                        <img
                          src={a.photo}
                          alt={`${a.name} headshot`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        a.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-slate-900">
                    Written by {authors.length} senior fintech operators.
                  </span>{" "}
                  <span className="text-muted-foreground">
                    Meet the team behind every article.
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center text-sm font-semibold text-[#0052FF] group-hover:translate-x-1 transition-transform">
                <Users className="w-4 h-4 mr-1.5" />
                Meet the team
                <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Search + Category Chips + Tag Filter */}
      <section className="py-10 border-b bg-background">
        <div className="container mx-auto px-4 space-y-8">
          {/* Search input row */}
          <div className="max-w-2xl mx-auto">
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                aria-hidden="true"
              />
              <Input
                id="blog-search"
                type="search"
                inputMode="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by keyword, topic, or tag…"
                className="h-12 pl-11 pr-12 text-base bg-white border-slate-200 focus-visible:ring-[#0052FF] focus-visible:border-[#0052FF]"
                data-testid="input-blog-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-[#0052FF] hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {filtersActive && (
              <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-600">
                <span data-testid="text-results-count">
                  Showing <strong>{visiblePosts.length}</strong> of{" "}
                  {allPosts.length} articles
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[#0052FF] font-medium hover:underline"
                  data-testid="button-clear-filters"
                >
                  Clear filters
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => setActiveCategory(undefined)}
              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${
                activeCategory === undefined
                  ? "bg-[#0052FF] text-white border-[#0052FF] shadow-sm"
                  : "bg-transparent text-[#0052FF] border-[#0052FF] hover:bg-[#0052FF]/5"
              }`}
            >
              All
              <span
                className={`ml-2 text-xs ${activeCategory === undefined ? "text-white/80" : "text-[#0052FF]/60"}`}
              >
                {allPosts.length}
              </span>
            </button>
            {categories.map((cat) => {
              const active = activeCategory === cat.name;
              const empty = cat.count === 0;
              const baseStyle = active
                ? "bg-[#0052FF] text-white border-[#0052FF] shadow-sm"
                : empty
                ? "bg-transparent text-slate-500 border-slate-300 hover:bg-slate-50 hover:text-[#0052FF] hover:border-[#0052FF]/40"
                : "bg-transparent text-[#0052FF] border-[#0052FF] hover:bg-[#0052FF]/5";
              const countStyle = active
                ? "text-white/80"
                : empty
                ? "text-slate-400"
                : "text-[#0052FF]/60";
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  data-testid={`category-chip-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${baseStyle}`}
                >
                  {cat.name}
                  <span className={`ml-2 text-xs ${countStyle}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tag chips — derived from the merged feed. Combined with the
              category chip + search query as an AND filter. */}
          {tags.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <TagIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Filter by tag
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {visibleTags.map((t) => {
                  const active = activeTag === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() =>
                        setActiveTag(active ? undefined : t.name)
                      }
                      data-testid={`tag-chip-${t.name.toLowerCase().replace(/\s+/g, "-")}`}
                      aria-pressed={active}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200 ${
                        active
                          ? "bg-[#0052FF] text-white border-[#0052FF]"
                          : "bg-blue-50/60 text-[#0052FF] border-blue-100 hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF]"
                      }`}
                    >
                      #{t.name}
                      <span
                        className={`ml-1.5 text-[10px] ${
                          active ? "text-white/80" : "text-[#0052FF]/60"
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
                {tags.length > TAG_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags((v) => !v)}
                    data-testid="button-toggle-tags"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:text-[#0052FF] hover:border-[#0052FF] transition-colors"
                  >
                    {showAllTags
                      ? "Show fewer tags"
                      : `+${tags.length - TAG_PREVIEW_COUNT} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3-column responsive grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visiblePosts.length === 0 ? (
              <div className="col-span-full">
                {searchQuery.trim() || activeTag ? (
                  <div
                    className="mx-auto max-w-2xl text-center py-16 px-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60"
                    data-testid="empty-state-no-results"
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 text-[#0052FF] flex items-center justify-center mb-4">
                      <Search className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      No articles match your filters.
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Try a different keyword, remove a filter, or browse all
                      articles below.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button
                        onClick={clearFilters}
                        className="bg-[#0052FF] hover:bg-[#0046d6] text-white"
                        data-testid="button-reset-filters"
                      >
                        Reset filters
                      </Button>
                      <Link href="/write-for-us">
                        <Button variant="outline">
                          Pitch an article
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-2xl text-center py-16 px-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
                    <div className="text-sm font-semibold uppercase tracking-wider text-[#0052FF] mb-3">
                      {activeCategory}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      Coverage on {activeCategory} is in progress.
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      We're commissioning expert-led pieces on {activeCategory}{" "}
                      from operators in this space. If you've shipped real work
                      in this category, pitch us — accepted contributors get a
                      dofollow contextual backlink and an author bio link from
                      a topically relevant fintech domain.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Link
                        href="/write-for-us"
                        data-testid="link-pitch-empty-category"
                      >
                        <Button className="bg-[#0052FF] hover:bg-[#0046d6] text-white">
                          Pitch a {activeCategory} article
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => setActiveCategory(undefined)}
                        data-testid="button-show-all-posts"
                      >
                        Show all posts
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {firstBatch.map((post, i) => renderPostCard(post, i))}

                {showNewsletter && (
                  <motion.div
                    key="newsletter-row"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="col-span-full"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-[#0A1628] text-white shadow-xl">
                      <div
                        className="absolute inset-0 opacity-[0.07] pointer-events-none"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
                          backgroundSize: "24px 24px",
                        }}
                      />
                      <div
                        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(0,82,255,0.35) 0%, transparent 70%)",
                        }}
                      />
                      <div className="relative grid md:grid-cols-2 gap-10 items-center px-8 md:px-12 py-12 md:py-14">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-4">
                            <Mail className="w-3.5 h-3.5" />
                            Newsletter
                          </span>
                          <h3 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
                            Get Fintech SEO Secrets in Your Inbox
                          </h3>
                          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-md">
                            One short, actionable email each week on SEO, digital
                            PR, and content for fintech operators. No spam, unsubscribe anytime.
                          </p>
                        </div>
                        <div>
                          {subscribed ? (
                            <div className="flex items-start gap-3 p-5 rounded-xl bg-white/5 border border-white/10">
                              <CheckCircle2 className="w-6 h-6 text-[#3DE0A0] shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-base">
                                  You're subscribed.
                                </div>
                                <div className="text-sm text-white/60">
                                  We'll send the next issue straight to your inbox.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <form
                              onSubmit={handleSubscribe}
                              className="flex flex-col sm:flex-row gap-3"
                            >
                              <Input
                                type="email"
                                required
                                placeholder="you@yourcompany.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-[#0052FF] focus-visible:border-[#0052FF]"
                              />
                              <Button
                                type="submit"
                                disabled={subscribeMutation.isPending}
                                className="h-12 px-6 bg-[#0052FF] hover:bg-[#0046d6] text-white font-semibold shadow-lg shadow-[#0052FF]/30 disabled:opacity-70"
                              >
                                {subscribeMutation.isPending
                                  ? "Subscribing…"
                                  : "Subscribe"}
                                {!subscribeMutation.isPending && (
                                  <ArrowRight className="w-4 h-4 ml-1.5" />
                                )}
                              </Button>
                            </form>
                          )}
                          <p className="text-xs text-white/40 mt-3">
                            Trusted by fintech marketers at growth-stage and
                            public companies.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {restBatch.map((post, i) =>
                  renderPostCard(post, i + firstBatch.length),
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
