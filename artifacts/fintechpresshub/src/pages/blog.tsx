import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  useListBlogPosts,
  useListBlogCategories,
  useListFeaturedPosts,
} from "@workspace/api-client-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero } from "@/components/PageHero";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function Blog() {
  useDocumentTitle(
    "Blog | FintechPressHub",
    "Insights, strategies, and guides on fintech marketing and SEO.",
  );
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    undefined,
  );

  const { data: categories } = useListBlogCategories();
  const { data: featuredPosts } = useListFeaturedPosts();
  const featured = featuredPosts?.[0];

  const { data: posts, isLoading } = useListBlogPosts(
    activeCategory ? { category: activeCategory } : undefined,
  );

  const gridPosts = posts?.filter((p) => p.id !== featured?.id) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="The Fintech Growth Hub"
        title={<>Insights From the Front Lines of Fintech SEO</>}
        description="Actionable strategy on SEO, off-page authority, digital PR, and content marketing — written by the operators running these programs for fintech brands every day."
      />

      {/* Featured Post — 60/40 split */}
      {featured && (
        <section className="py-16 bg-card border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF]">
                Featured
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <Link href={`/blog/${featured.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-5 gap-8 group cursor-pointer items-center"
              >
                <div className="md:col-span-3 aspect-[16/10] overflow-hidden rounded-2xl shadow-md">
                  <img
                    src={featured.coverImage}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col">
                  <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider mb-4">
                    {featured.category}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 text-slate-900 group-hover:text-[#0052FF] transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-muted-foreground text-base md:text-lg mb-6 line-clamp-4">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-5 text-sm text-muted-foreground mb-6">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(featured.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {featured.readingMinutes} min read
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-2 font-semibold text-[#0052FF] group-hover:gap-3 transition-all">
                    Read article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            </Link>
          </div>
        </section>
      )}

      {/* Category Chips */}
      <section className="py-10 border-b bg-background sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4">
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
            </button>
            {categories?.map((cat) => {
              const active = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${
                    active
                      ? "bg-[#0052FF] text-white border-[#0052FF] shadow-sm"
                      : "bg-transparent text-[#0052FF] border-[#0052FF] hover:bg-[#0052FF]/5"
                  }`}
                >
                  {cat.name}
                  <span
                    className={`ml-2 text-xs ${active ? "text-white/80" : "text-[#0052FF]/60"}`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3-column responsive grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-border h-full">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : gridPosts.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No posts found for this category.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
              {gridPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out group cursor-pointer bg-card">
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.coverImage}
                          alt={post.title}
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
                            {post.readingMinutes} min
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
                          {formatDate(post.publishedAt)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
