import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  Linkedin,
  MapPin,
  Sparkles,
  Twitter,
} from "lucide-react";
import { usePublicPosts } from "@/data/usePublicPosts";
import { authorSlugFromName } from "@/data/authors";
import { SITE_URL } from "@/lib/metaData";
import { useAuthors } from "@/data/useAuthors";
import {
  resolveAuthorPhoto,
  useAuthorPhotoOverrides,
} from "@/data/useAuthorPhotos";
import { prefetchAuthor } from "@/lib/route-prefetch";
import { useEffect, useRef } from "react";
import { FaqSection } from "@/components/FaqSection";

// FAQs surface in voice-assistant results ("who writes for FintechPressHub?"),
// Google's People Also Ask, and AI-powered search summaries for team queries.
const teamFAQs = [
  {
    question: "Who writes for FintechPressHub?",
    answer:
      "FintechPressHub articles are written by a team of senior fintech operators — payments specialists, open banking analysts, regtech editors, and digital PR leads — all with hands-on industry experience inside regulated financial services.",
  },
  {
    question: "What fintech topics does the FintechPressHub team cover?",
    answer:
      "The team covers payments infrastructure, embedded finance, open banking, neobanking, B2B lending, regtech and compliance, wealthtech, robo-advisors, and fintech SEO strategy. Each author specialises in one or two sub-verticals rather than writing across all of fintech.",
  },
  {
    question: "Are FintechPressHub authors industry practitioners or journalists?",
    answer:
      "Every FintechPressHub author is a practitioner first: the team includes former payments product managers, compliance lawyers, banking infrastructure engineers, and fintech CFOs. Authors write from lived experience, not secondary research alone.",
  },
  {
    question: "How can I pitch a guest post to the FintechPressHub team?",
    answer:
      "Guest contributors can apply via the Write for Us page. FintechPressHub accepts expert-level submissions on payments, open banking, lending, and regtech from practitioners with verifiable industry backgrounds. All pitches are reviewed by the editorial team.",
  },
  {
    question: "Does FintechPressHub work with external fintech brands?",
    answer:
      "Yes. The same team that produces FintechPressHub's editorial content also delivers retained fintech SEO, content strategy, and digital PR programs for fintech and financial services brands. You can book a discovery call via the Contact page.",
  },
];

function authorInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AuthorsIndex() {
  const [, navigate] = useLocation();
  // Live author roster — falls back to static seed until the API responds.
  const authors = useAuthors();
  // Counts include API-published posts, so per-author article totals stay
  // accurate as new pieces ship through /admin/blog.
  const { posts: allPosts } = usePublicPosts();
  const overrides = useAuthorPhotoOverrides();
  const articleCounts = allPosts.reduce<Record<string, number>>((acc, p) => {
    const slug = authorSlugFromName(p.author);
    acc[slug] = (acc[slug] ?? 0) + 1;
    return acc;
  }, {});

  // FAQ accordion: first item open by default for AEO visibility.

  // Warm the author bio chunk once any team card scrolls into range.
  const authorGridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      prefetchAuthor();
      return;
    }
    const el = authorGridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            prefetchAuthor();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="FintechPressHub Authors — Senior Fintech SEO Specialists & Operators"
        description="Meet the senior fintech operators, analysts, and digital PR leads who produce FintechPressHub's content and link-building programs — all with hands-on experience inside regulated financial services, payments, and banking."
        itemList={{
          name: "FintechPressHub Editorial Team",
          items: authors.map((a) => ({
            name: a.name,
            url: `${SITE_URL}/authors/${a.slug}`,
          })),
        }}
        webPage={{
          datePublished: "2021-06-01",
          dateModified: "2026-05-15",
          keywords: [
            "fintech content writers",
            "fintech SEO specialists",
            "fintech editors",
            "payments content team",
            "open banking writers",
            "regtech content experts",
            "fintech digital PR",
            "fintech thought leadership",
            "FintechPressHub authors",
            "fintech editorial team",
          ],
          conditionsOfAccess: "Free",
          accessibilityHazard: "none",
        }}
        faq={teamFAQs}
        faqDatePublished="2021-06-01"
        faqDateModified="2026-05-15"
        speakableSelectors={["h1", ".speakable-summary", "h2"]}
      />

      {/* International + Technical + White Hat head elements.
          patchHtml already injects hreflang="en" + x-default server-side;
          these client-side tags keep the SPA shell consistent for crawlers
          that execute JavaScript and for <head> introspection tools. */}
      <Helmet>
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}/authors`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/authors`} />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        {/* meta author — credits FintechPressHub as the editorial publisher,
            mirrors the author entity in the CollectionPage JSON-LD. */}
        <meta name="author" content="FintechPressHub Editorial Team" />
        {/* rel="author" cross-links this page to the /about entity,
            reinforcing the Off-Page authorship graph for E-E-A-T. */}
        <link rel="author" href={`${SITE_URL}/about`} />
        {/* news_keywords — consumed by Google News and AI news crawlers
            to surface the team page for fintech-writer discovery queries. */}
        <meta
          name="news_keywords"
          content="fintech writers, fintech SEO specialists, payments content, open banking editors, regtech analysts"
        />
      </Helmet>

      <PageHero
        eyebrow="Meet the Team"
        title={
          <>
            The Operators Behind <span className="text-[hsl(190_95%_70%)]">Your Content</span>
          </>
        }
        description="Every article, audit, and outreach campaign at FintechPressHub is led by a senior operator with hands-on experience inside fintech, banking, and payments. Get to know the team."
      />

      {/* BLUF — bottom-line-up-front for GEO / AI-search extraction.
          .speakable-summary is targeted by SSR SpeakableSpecification so
          voice assistants and AI overviews can cite this paragraph directly
          for "who is the FintechPressHub team?" queries. */}
      <div className="bg-background border-b border-slate-100">
        <div className="container mx-auto px-4 max-w-4xl py-6">
          <p className="speakable-summary text-base text-slate-700 leading-relaxed">
            FintechPressHub is staffed by <strong>senior fintech practitioners</strong> across payments, open banking, embedded finance, regtech, wealthtech, and fintech SEO — combining decades of hands-on industry experience with editorial and search-optimisation expertise.
          </p>
        </div>
      </div>

      <main>
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div
              ref={authorGridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
            >
              {authors.map((author, i) => {
                const count = articleCounts[author.slug] ?? 0;
                return (
                  <motion.div
                    key={author.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    <div
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/authors/${author.slug}`)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && navigate(`/authors/${author.slug}`)
                      }
                      onMouseEnter={prefetchAuthor}
                      onFocus={prefetchAuthor}
                      onTouchStart={prefetchAuthor}
                      data-testid={`link-team-${author.slug}`}
                      className="h-full"
                    >
                      <Card className="h-full overflow-hidden border border-slate-200 hover:border-[#0052FF]/40 hover:shadow-xl transition-all duration-300 group cursor-pointer bg-card">
                        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
                          <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 mx-auto sm:mx-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0052FF] to-[#0040CC] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                            {(() => {
                              const photo = resolveAuthorPhoto(
                                author.slug,
                                author.photo,
                                overrides,
                              );
                              return photo ? (
                                <img
                                  src={photo}
                                  alt={`${author.name}, ${author.role} at FintechPressHub`}
                                  loading={i < 4 ? "eager" : "lazy"}
                                  fetchPriority={i < 2 ? "high" : "auto"}
                                  width={128}
                                  height={128}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                authorInitials(author.name)
                              );
                            })()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors">
                              {/* Crawlable <a> for Googlebot — tabIndex={-1} keeps keyboard
                                  focus on the outer role="link" div to avoid duplicate tab stops.
                                  stopPropagation prevents double-navigation on click. */}
                              <Link
                                href={`/authors/${author.slug}`}
                                tabIndex={-1}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${author.name} — ${author.role} at FintechPressHub`}
                              >
                                {author.name}
                              </Link>
                            </h3>
                            <div className="text-sm text-[#0052FF] font-semibold mb-3">
                              {author.role}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 mb-4">
                              {author.shortBio}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-4">
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {author.location}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                {author.yearsExperience}+ yrs
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                                {count} {count === 1 ? "article" : "articles"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                {author.social.linkedin && (
                                  <a
                                    href={author.social.linkedin}
                                    target="_blank"
                                    // rel="me" is the IndieWeb identity-verification signal
                                    // recognised by Google, Mastodon, and E-E-A-T scrapers
                                    // to confirm author identity across platforms.
                                    rel="me noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`${author.name} on LinkedIn`}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-[#0052FF] hover:text-white text-slate-500 transition-colors"
                                  >
                                    <Linkedin className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {author.social.twitter && (
                                  <a
                                    href={author.social.twitter}
                                    target="_blank"
                                    rel="me noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`${author.name} on X / Twitter`}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-[#0052FF] hover:text-white text-slate-500 transition-colors"
                                  >
                                    <Twitter className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <span className="inline-flex items-center text-sm font-medium text-[#0052FF] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">
                                View profile
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AEO FAQ accordion — answers team-discovery questions for voice
            assistants, Google PAA, and AI overview citation engines.
            Matches the FAQPage JSON-LD injected via PageMeta for schema parity. */}
        <FaqSection
          items={teamFAQs}
          heading="Questions About the FintechPressHub Team"
          id="team-faq"
          valuePrefix="team-faq"
        />

        {/* Hire CTA */}
        <section className="pb-20 pt-8">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl bg-[#0A1628] text-white shadow-xl">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div
                aria-hidden
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(0,82,255,0.35) 0%, transparent 70%)",
                }}
              />
              <div className="relative grid md:grid-cols-2 gap-8 items-center px-8 md:px-12 py-12">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3DE0A0] mb-3">
                    Work With Us
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold leading-tight mb-3">
                    Have this team work on your fintech brand
                  </h3>
                  <p className="text-white/70 text-base leading-relaxed max-w-md">
                    Tell us your category and growth goals — we'll come back with a
                    scoped content and SEO plan led by the operators above.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
                  <Link href="/contact">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-[#0052FF] hover:bg-[#0040CC] text-white shadow-lg shadow-[#0052FF]/30"
                    >
                      Get a Free Audit
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/services">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/25 text-white hover:bg-white/10 hover:text-white"
                    >
                      See Services
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
