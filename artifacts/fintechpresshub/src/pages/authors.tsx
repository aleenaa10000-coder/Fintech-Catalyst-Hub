import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Link } from "wouter";
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
import { authors, authorSlugFromName } from "@/data/authors";

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
  // Counts include API-published posts, so per-author article totals stay
  // accurate as new pieces ship through /admin/blog.
  const { posts: allPosts } = usePublicPosts();
  const articleCounts = allPosts.reduce<Record<string, number>>((acc, p) => {
    const slug = authorSlugFromName(p.author);
    acc[slug] = (acc[slug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Meet the Team | FintechPressHub"
        description="The fintech operators, analysts and digital PR leads behind FintechPressHub's content and link-building programs."
      />

      <PageHero
        eyebrow="Meet the Team"
        title={
          <>
            The Operators Behind <span className="text-[hsl(190_95%_70%)]">Your Content</span>
          </>
        }
        description="Every article, audit, and outreach campaign at FintechPressHub is led by a senior operator with hands-on experience inside fintech, banking, and payments. Get to know the team."
      />

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {authors.map((author, i) => {
              const count = articleCounts[author.slug] ?? 0;
              return (
                <motion.div
                  key={author.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Link
                    href={`/authors/${author.slug}`}
                    data-testid={`link-team-${author.slug}`}
                  >
                    <Card className="h-full overflow-hidden border border-slate-200 hover:border-[#0052FF]/40 hover:shadow-xl transition-all duration-300 group cursor-pointer bg-card">
                      <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 mx-auto sm:mx-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0052FF] to-[#0040CC] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                          {author.photo ? (
                            <img
                              src={author.photo}
                              alt={`${author.name} headshot`}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            authorInitials(author.name)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors">
                            {author.name}
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
                                  rel="noopener noreferrer"
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
                                  rel="noopener noreferrer"
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
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hire CTA */}
      <section className="pb-20">
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
    </div>
  );
}
