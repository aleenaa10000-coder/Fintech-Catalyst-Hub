import { PageMeta } from "@/components/PageMeta";
import { useParams, Link, Redirect } from "wouter";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  Clock,
  Linkedin,
  Mail,
  MapPin,
  Rss,
  Sparkles,
  Twitter,
} from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import { usePublicPosts } from "@/data/usePublicPosts";
import {
  authors,
  authorSlugFromName,
  getAuthorBySlug,
} from "@/data/authors";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function authorInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AuthorPage() {
  const params = useParams();
  const slug = params.slug || "";

  const author = useMemo(() => getAuthorBySlug(slug), [slug]);
  // Merged feed picks up newly published API posts so an author's profile
  // automatically reflects everything they've published — including posts
  // created in /admin/blog after the static seed file was generated.
  const { posts: allPosts } = usePublicPosts();

  const authorPosts = useMemo(() => {
    if (!author) return [];
    return allPosts
      .filter((p) => authorSlugFromName(p.author) === author.slug)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [author, allPosts]);

  if (!author) {
    return <Redirect to="/404" />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta
        title={`${author.name} — ${author.role} | FintechPressHub`}
        description={author.shortBio}
        rssFeeds={[
          {
            href: `${SITE_URL}/authors/${author.slug}/rss.xml`,
            title: `${author.name} on FintechPressHub`,
          },
        ]}
        person={{
          name: author.name,
          jobTitle: author.role,
          description:
            author.fullBio?.join(" ") ?? author.shortBio,
          image: author.photo
            ? `https://www.fintechpresshub.com${author.photo}`
            : undefined,
          email: author.social?.email,
          knowsAbout: author.expertise,
          award: author.credentials,
          addressLocality: author.location?.split(",")[0]?.trim() || undefined,
          addressCountry:
            author.location?.split(",").slice(1).join(",").trim() || undefined,
          sameAs: [
            author.social?.linkedin,
            author.social?.twitter,
            author.social?.website,
          ].filter((u): u is string => Boolean(u)),
        }}
      />

      {/* Header */}
      <header className="relative overflow-hidden border-b border-border/60 bg-[hsl(var(--primary))] text-primary-foreground">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(210_100%_70%)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[hsl(265_85%_60%)] opacity-20 blur-3xl"
        />

        <div className="relative container mx-auto px-4 max-w-5xl pt-16 pb-16">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Blog
          </Link>

          <div className="flex flex-col md:flex-row items-start gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 rounded-full overflow-hidden bg-white/15 border-2 border-white/30 backdrop-blur text-white flex items-center justify-center font-bold text-3xl md:text-4xl shadow-lg"
            >
              {author.photo ? (
                <img
                  src={author.photo}
                  alt={`${author.name} headshot`}
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                authorInitials(author.name)
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(190_95%_70%)]" />
                Author Profile
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">
                {author.name}
              </h1>
              <div className="text-lg md:text-xl text-white/90 font-semibold mb-4">
                {author.role}
              </div>
              <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-3xl">
                {author.shortBio}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-white/60" />
                  {author.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-white/60" />
                  {author.yearsExperience}+ years experience
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-white/60" />
                  {authorPosts.length}{" "}
                  {authorPosts.length === 1 ? "article" : "articles"} published
                </span>
              </div>

              {(author.social.linkedin ||
                author.social.twitter ||
                author.social.email) && (
                <div className="flex items-center gap-2 mt-6">
                  {author.social.linkedin && (
                    <a
                      href={author.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${author.name} on LinkedIn`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {author.social.twitter && (
                    <a
                      href={author.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${author.name} on X / Twitter`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {author.social.email && (
                    <a
                      href={`mailto:${author.social.email}`}
                      aria-label={`Email ${author.name}`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  <a
                    href={`/authors/${author.slug}/rss.xml`}
                    aria-label={`Subscribe to ${author.name}'s RSS feed`}
                    title={`Subscribe to ${author.name}'s RSS feed`}
                    data-testid={`link-author-rss-${author.slug}`}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                  >
                    <Rss className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto px-4 max-w-5xl pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Bio + expertise */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                About {author.name.split(" ")[0]}
              </h2>
              <div className="space-y-4 text-slate-700 leading-relaxed">
                {author.fullBio.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Areas of Expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {author.expertise.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-[#0052FF]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Credentials sidebar */}
          <aside className="lg:col-span-1">
            <Card className="border-slate-200 bg-gradient-to-br from-blue-50/40 to-white sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0052FF] mb-4">
                  <Award className="w-4 h-4" />
                  Credentials
                </div>
                <ul className="space-y-3">
                  {author.credentials.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0052FF] shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* Published articles */}
        <section className="mt-20">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
                Latest Work
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Articles by {author.name}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {authorPosts.length}{" "}
              {authorPosts.length === 1 ? "article" : "articles"}
            </span>
          </div>

          {authorPosts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-slate-200 rounded-2xl">
              No published articles yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {authorPosts.map((post: any, i: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card">
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                        <img
                          src={post.image}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-[10px] font-semibold uppercase tracking-wider">
                            {post.category}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                          </span>
                        </div>
                        <h3 className="text-base font-bold mb-2 text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-slate-100">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.date)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Other authors */}
        <section className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
            Meet the Team
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Other writers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {authors
              .filter((a) => a.slug !== author.slug)
              .map((a) => (
                <Link key={a.slug} href={`/authors/${a.slug}`}>
                  <Card className="border border-slate-100 hover:border-[#0052FF]/40 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden bg-[#0052FF] text-white flex items-center justify-center font-bold text-sm">
                        {a.photo ? (
                          <img
                            src={a.photo}
                            alt={`${a.name} headshot`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          authorInitials(a.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 group-hover:text-[#0052FF] transition-colors truncate">
                          {a.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.role}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0052FF] transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/contact">
              <Button size="lg" className="bg-[#0052FF] hover:bg-[#0040CC] text-white">
                Work with our team
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
