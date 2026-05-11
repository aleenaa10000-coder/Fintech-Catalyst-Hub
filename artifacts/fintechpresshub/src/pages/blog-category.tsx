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

const CATEGORY_META: Record<
  string,
  { title: string; description: string; about: string[] }
> = {
  payments: {
    title: "Payments",
    description:
      "Expert analysis and guides on payment infrastructure, card issuing, cross-border rails, and payment orchestration for fintech teams.",
    about: ["Payments Infrastructure", "Card Issuing", "Payment Orchestration"],
  },
  "embedded-finance": {
    title: "Embedded Finance",
    description:
      "Deep dives into BaaS architecture, embedded lending, and vertical SaaS payments powering the next wave of fintech products.",
    about: ["Embedded Finance", "BaaS Architecture", "Embedded Lending"],
  },
  "open-banking": {
    title: "Open Banking",
    description:
      "Coverage of PSD3, account-to-account payments, variable recurring payments, and open data compliance for regulated fintechs.",
    about: ["Open Banking", "PSD3", "Account-to-Account Payments"],
  },
  neobanking: {
    title: "Neobanking",
    description:
      "Strategies and analysis for digital banks on activation, retention, fee economics, and regulatory positioning.",
    about: ["Neobanking", "Digital Banks", "Challenger Banks"],
  },
  lending: {
    title: "Lending",
    description:
      "Insights on BNPL, SME lending, cash-flow underwriting, embedded credit, and consumer affordability for lending fintechs.",
    about: ["Fintech Lending", "BNPL", "SME Lending"],
  },
  regtech: {
    title: "Regtech & Compliance",
    description:
      "Expert guides on transaction monitoring, reg reporting, sanctions screening, and KYC/AML tooling.",
    about: ["Regtech", "Compliance", "KYC", "AML"],
  },
  wealthtech: {
    title: "Wealthtech",
    description:
      "Analysis of robo-advisors, portfolio construction, advisor SaaS marketing, and self-directed investing platforms.",
    about: ["Wealthtech", "Robo-advisors", "Wealth Management"],
  },
  "fintech-seo": {
    title: "Fintech SEO",
    description:
      "Actionable SEO guides, content strategy, and link-building playbooks specifically for fintech and financial services companies.",
    about: ["Fintech SEO", "Content Strategy", "Link Building"],
  },
};

const POSTS_PER_PAGE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogCategoryPage() {
  const params = useParams();
  const rawSlug = params.slug ?? "";
  const categorySlug = rawSlug.toLowerCase().replace(/\s+/g, "-");

  const { posts, isLoading } = usePublicPosts();
  const [page, setPage] = useState(1);

  const meta = CATEGORY_META[categorySlug];

  const categoryPosts = useMemo(() => {
    return posts.filter(
      (p) =>
        p.category?.toLowerCase().replace(/\s+/g, "-") === categorySlug ||
        p.category?.toLowerCase() === categorySlug,
    );
  }, [posts, categorySlug]);

  const pagePosts = useMemo(
    () => categoryPosts.slice(0, page * POSTS_PER_PAGE),
    [categoryPosts, page],
  );

  const displayTitle = meta?.title ?? rawSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const displayDescription =
    meta?.description ??
    `Browse all FintechPressHub articles on ${displayTitle}.`;

  if (!isLoading && categoryPosts.length === 0 && !meta) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${displayTitle} Articles | FintechPressHub`}
        description={displayDescription}
        rssFeeds={[
          {
            href: `${SITE_URL}/blog/category/${categorySlug}/rss.xml`,
            title: `${displayTitle} — FintechPressHub`,
          },
        ]}
        article={
          meta
            ? {
                title: `${displayTitle} Articles | FintechPressHub`,
                description: displayDescription,
                about: meta.about,
                section: displayTitle,
              }
            : undefined
        }
        itemList={
          categoryPosts.length > 0
            ? {
                name: `${displayTitle} Articles`,
                description: displayDescription,
                items: categoryPosts.slice(0, 20).map((p) => ({
                  name: p.title,
                  url: `${SITE_URL}/blog/${p.slug}`,
                  description: p.excerpt?.slice(0, 160),
                })),
              }
            : undefined
        }
        webPage={{
          datePublished: "2021-06-01",
          dateModified: new Date().toISOString().slice(0, 10),
        }}
      />
      <PageHero
        eyebrow="Category"
        title={<>{displayTitle}</>}
        description={displayDescription}
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
          ) : categoryPosts.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No articles yet</p>
              <p className="text-sm">
                We're working on content in this category. Check back soon.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-8">
                {categoryPosts.length} article
                {categoryPosts.length !== 1 ? "s" : ""}
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
                              className="flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded hover:bg-[#0052FF]/10 hover:text-[#0052FF] transition-colors"
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
              {pagePosts.length < categoryPosts.length && (
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
