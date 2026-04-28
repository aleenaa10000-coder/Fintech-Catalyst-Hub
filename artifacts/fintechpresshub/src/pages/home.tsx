import { useEffect, useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useGetTrustStats,
  useListTestimonials,
  useListFeaturedPosts,
  useListServices,
  useListBlogPosts,
  getListBlogPostsQueryKey,
} from "@workspace/api-client-react";
import heroBg from "@/assets/hero-bg.png";
import servicesGraph from "@/assets/services-graph.png";
import { ArrowRight, CheckCircle2, TrendingUp, ShieldCheck, Globe, FileText, Link2, Cog, HelpCircle, Plus, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CountUp } from "@/components/CountUp";
import { ParticleNetwork } from "@/components/ParticleNetwork";
import { TrustedBy } from "@/components/TrustedBy";
import { QuickPublishSheet } from "@/components/QuickPublishSheet";
import { useAuth } from "@workspace/replit-auth-web";

/** Tiny relative-time formatter used by the "Recently published"
 *  homepage widget. Falls back to an absolute date once a post is
 *  more than ~30 days old so a stale homepage doesn't claim something
 *  was published "27 days ago" in perpetuity. */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const mins = Math.floor(diffMs / minute);
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hrs = Math.floor(diffMs / hour);
    return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diffMs / day);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const homeFaqs = [
  {
    question: "What makes fintech SEO different from regular SEO?",
    answer:
      "Fintech sits inside Google's YMYL (Your Money or Your Life) category, which means Google holds it to a far higher E-E-A-T bar than most verticals. Generic SEO playbooks — thin content, low-authority guest posts, AI-spun copy — actively hurt fintech rankings. Winning here requires writers who understand payments, lending, banking, and regulation; placements on publications your buyers and Google both trust; and a topical architecture that signals true subject-matter depth.",
  },
  {
    question: "How is FintechPressHub different from a generalist SEO agency?",
    answer:
      "We work exclusively with fintech, payments, lending, wealth, banking infrastructure, and adjacent regulated-finance categories. Every writer, editor, and outreach lead has direct fintech experience — no generalists ramping up on your account. That focus is also why our publication relationships skew toward Finextra, The Fintech Times, Tearsheet, Finovate, and similar tier-1 trade press your buyers actually read.",
  },
  {
    question: "What kinds of fintech companies do you typically work with?",
    answer:
      "Series A through Series D fintechs, public fintechs, and infrastructure providers across payments, lending, embedded finance, neobanking, wealth tech, RegTech, and B2B SaaS for financial services. Most clients are post-product-market-fit teams investing in organic as a durable, compounding acquisition channel alongside paid.",
  },
  {
    question: "How long until we see real results?",
    answer:
      "Bottom-of-funnel and long-tail content typically lands in the top 20 within 30-60 days. Competitive head terms generally take 4-6 months of consistent publishing plus supporting links. Topical authority — the point where you start ranking for queries you didn't explicitly target — usually compounds around month 6-9 of a focused program.",
  },
  {
    question: "Do you offer one-time projects, or only ongoing retainers?",
    answer:
      "Both. The Fintech SEO Audit is a one-time, 30-day engagement with a prioritized 90-day roadmap your team can execute or hand back to us. Content writing, link building, guest posting, and topical authority programs run as ongoing retainers, typically on 6-month minimum engagements because authority compounds over time.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  const { data: stats } = useGetTrustStats();
  const { data: testimonials } = useListTestimonials();
  const { data: featuredPosts } = useListFeaturedPosts();
  const { data: services } = useListServices();
  // "Recently published" widget — pulls the 3 newest posts from the
  // live API on every mount (the list endpoint already orders by
  // `publishedAt desc`, so a `limit=3` is the whole story). Distinct
  // from the curated `featuredPosts` grid above: that's editorially
  // pinned, this is purely chronological so the homepage feels fresh
  // the moment a post goes live.
  //
  // Auto-refresh: this query overrides the global QueryClient defaults
  // (which switch focus-refetch *off*) so the homepage picks up newly
  // published posts without a hard reload. 60 s polling is cheap (the
  // payload is 3 rows + Express's 304 short-circuit kicks in when
  // nothing changed) and `refetchOnWindowFocus` covers the most common
  // case of a visitor flipping back to the tab after a while.
  const recentPostsQuery = useListBlogPosts(
    { limit: 3 },
    {
      query: {
        queryKey: getListBlogPostsQueryKey({ limit: 3 }),
        staleTime: 30_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  );
  const recentPosts = recentPostsQuery.data;
  const recentPostsUpdatedAt = recentPostsQuery.dataUpdatedAt;
  // Tick every 30 s so the "Updated N seconds ago" label stays
  // accurate without us coupling it to the React Query refetch
  // cadence — visitors leaving the homepage open won't see a frozen
  // "Updated 6 seconds ago" pill.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(handle);
  }, []);

  return (
    <div className="min-h-screen">
      <PageMeta page="home" faq={homeFaqs} />
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-br from-[#0b1e4d] via-[#102a6b] to-[#0a1633]">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125, 211, 252, 0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.55) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)",
            }}
          />
          <ParticleNetwork className="absolute inset-0 w-full h-full" />
          <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1633]/60" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1
                className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight"
                style={{ textShadow: "0 2px 24px rgba(8, 18, 51, 0.55), 0 1px 2px rgba(0,0,0,0.3)" }}
              >
                Optimized Fintech Content That <span className="text-cyan-200">Ranks & Converts</span>
              </h1>
              <p
                className="text-xl text-blue-100/95 mb-10 max-w-2xl mx-auto leading-relaxed"
                style={{ textShadow: "0 1px 12px rgba(8, 18, 51, 0.5)" }}
              >
                We blend deep financial expertise with high-authority link building and technical SEO to scale organic growth for ambitious fintech companies.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact">
                  <Button size="lg" className="h-12 px-8 text-base bg-white text-blue-700 hover:bg-blue-50">
                    Get a Free Audit
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                    View Our Services
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <TrustedBy />

      {/* Trust Stats */}
      <section className="py-12 bg-secondary/50 border-y">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats ? (
              <>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.clientsServed} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clients Served</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.articlesPublished} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Articles Published</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.backlinksAcquired} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Backlinks Built</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.averageDomainRating} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg. Partner DR</div>
                </div>
              </>
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Expertise meets execution.</h2>
            <p className="text-lg text-muted-foreground">
              Generic content agencies don't understand Open Banking, DeFi, or payment gateways. We pair industry experts with SEO specialists to drive qualified traffic that actually converts to pipeline.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                Icon: FileText,
                title: "Authority-Led Content",
                desc: "In-depth articles, ebooks, and thought leadership written by operators who have actually shipped fintech products. Every asset is engineered to rank, earn citations, and convert qualified buyers.",
              },
              {
                Icon: Link2,
                title: "High-Impact PR & Link Building",
                desc: "Earn coverage and backlinks from the publications your prospects already read — Bloomberg, TechCrunch, Finextra, The Block, and more. We focus on relevance and Domain Rating, never spammy networks.",
              },
              {
                Icon: Cog,
                title: "Technical SEO Architecture",
                desc: "From Core Web Vitals to schema, internal linking, and crawl efficiency, we engineer your site to compete in YMYL search. We fix the foundations so every new piece of content compounds in value.",
              },
            ].map(({ Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="h-full border bg-card transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/40">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/services">
              <Button size="lg">Explore Solutions <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Trusted by Fintech Leaders
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.isArray(testimonials) && testimonials.length > 0 ? (
              testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className="h-full bg-card">
                    <CardContent className="p-8 flex flex-col h-full">
                      <div className="flex gap-1 mb-6">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-muted'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-foreground text-lg mb-8 flex-1 italic">"{testimonial.quote}"</p>
                      <div>
                        <div className="font-bold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-full"><CardContent className="p-8"><Skeleton className="h-32 w-full mb-4" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <h2 className="text-3xl font-bold mb-4">Latest Insights</h2>
              <p className="text-muted-foreground text-lg">Actionable SEO and marketing strategies for fintech.</p>
            </div>
            <Link href="/blog" className="hidden md:flex">
              <Button variant="ghost">View All Posts <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.isArray(featuredPosts) && featuredPosts.length > 0 ? (
              featuredPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group cursor-pointer"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="overflow-hidden mb-6 aspect-video bg-slate-100" style={{ borderRadius: "12px" }}>
                      <img src={post.coverImage} alt={post.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <span className="inline-block text-xs font-medium uppercase tracking-wide mb-3 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
                      {post.category}
                    </span>
                    <h3 className="text-xl font-semibold mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
                    <div className="text-sm text-muted-foreground mb-4">{new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read</div>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Read More
                      <ArrowRight className="ml-1 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              ))
            ) : (
               Array.from({ length: 3 }).map((_, i) => (
                <div key={i}><Skeleton className="aspect-video w-full rounded-xl mb-4" /><Skeleton className="h-6 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recently published — live, chronological feed (3 newest posts
          straight from the API). Visually distinct from the curated
          "Latest Insights" grid above so the homepage shows both
          editorial picks AND a fresh "what just landed" signal. */}
      <section
        className="py-16 border-t bg-slate-50"
        data-testid="section-home-recently-published"
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex justify-between items-end mb-8"
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Recently published
              </h2>
              <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>The three newest posts on the blog.</span>
                {recentPostsUpdatedAt > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title={new Date(recentPostsUpdatedAt).toLocaleString()}
                    aria-live="polite"
                    data-testid="recently-published-updated-pill"
                  >
                    <span
                      className={
                        recentPostsQuery.isFetching
                          ? "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                          : "w-1.5 h-1.5 rounded-full bg-emerald-500"
                      }
                      aria-hidden="true"
                    />
                    {recentPostsQuery.isFetching
                      ? "Refreshing…"
                      : now - recentPostsUpdatedAt < 60_000
                        ? "Updated just now"
                        : `Updated ${formatRelativeTime(new Date(recentPostsUpdatedAt).toISOString())}`}
                  </span>
                )}
              </p>
            </div>
            <Link href="/blog" className="hidden md:flex">
              <Button variant="ghost" size="sm">
                Browse all posts
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.isArray(recentPosts) && recentPosts.length > 0
              ? recentPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all h-full"
                      data-testid={`recently-published-card-${i}`}
                    >
                      <div
                        className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100"
                        aria-hidden="true"
                      >
                        <img
                          src={post.coverImage}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700 mb-1">
                          {post.category}
                        </span>
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <div className="mt-auto pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <time dateTime={post.publishedAt}>
                            {formatRelativeTime(post.publishedAt)}
                          </time>
                          <span aria-hidden="true">·</span>
                          <span>{post.readingMinutes} min read</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200"
                  >
                    <Skeleton className="shrink-0 w-20 h-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </div>
                  </div>
                ))}
          </div>

          <div className="mt-6 md:hidden">
            <Link href="/blog">
              <Button variant="outline" className="w-full">
                Browse all posts
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t bg-muted/20" data-testid="section-home-faq">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Fintech SEO, answered
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The questions fintech founders, CMOs, and growth leads ask us
              before they pick up the phone.
            </p>
          </motion.div>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
          >
            {homeFaqs.map((faq, idx) => (
              <AccordionItem
                key={faq.question}
                value={`home-faq-${idx}`}
                data-testid={`accordion-home-faq-${idx}`}
                className="border-b-0 group"
              >
                <AccordionTrigger className="px-6 py-5 text-base md:text-lg font-semibold text-left text-slate-900 hover:text-[#0052FF] hover:no-underline transition-colors [&>svg]:hidden">
                  <span className="flex-1 pr-4">{faq.question}</span>
                  <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#0052FF]/10 text-[#0052FF] transition-transform duration-300 group-data-[state=open]:rotate-45">
                    <Plus className="w-5 h-5" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-0 text-muted-foreground text-base leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {isAdmin ? <QuickPublishSheet /> : null}

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4 max-w-3xl"
        >
          <h2 className="text-4xl font-bold mb-6">Ready to dominate search results?</h2>
          <p className="text-xl mb-10 opacity-90">Join top fintech companies scaling their organic revenue with our specialized SEO and content strategies.</p>
          <Link href="/contact">
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
            >
              Get Started Today
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
