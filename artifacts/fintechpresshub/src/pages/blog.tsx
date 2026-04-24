import { PageMeta } from "@/components/PageMeta";
import { useSubscribeToNewsletter } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";
import { Calendar, Clock, ArrowRight, Mail, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import posts from "@/data/posts.js";
import { authors } from "@/data/authors";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type Post = {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
};

export default function Blog() {
  const allPosts = posts as Post[];

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [allPosts]);

  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    undefined,
  );

  const visiblePosts = useMemo(
    () =>
      activeCategory
        ? allPosts.filter((p) => p.category === activeCategory)
        : allPosts,
    [allPosts, activeCategory],
  );

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

      {/* Category Chips */}
      <section className="py-10 border-b bg-background">
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
              <span
                className={`ml-2 text-xs ${activeCategory === undefined ? "text-white/80" : "text-[#0052FF]/60"}`}
              >
                {allPosts.length}
              </span>
            </button>
            {categories.map((cat) => {
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
            {visiblePosts.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No posts found for this category.
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
