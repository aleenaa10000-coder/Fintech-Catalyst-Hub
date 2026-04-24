import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  useGetBlogPost,
  useListBlogPosts,
  getGetBlogPostQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  User,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

type Heading = { id: string; text: string; level: number };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function processContent(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Set<string>();
  const processed = html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();
      let id = slugify(text);
      let n = 2;
      const base = id;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      headings.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    },
  );
  return { html: processed, headings };
}

function authorInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug || "";

  const {
    data: post,
    isLoading,
    error,
  } = useGetBlogPost(slug, {
    query: { enabled: !!slug, queryKey: getGetBlogPostQueryKey(slug) },
  });

  useDocumentTitle(
    post ? `${post.title} | FintechPressHub` : "Blog | FintechPressHub",
  );

  const { data: relatedRaw } = useListBlogPosts(
    post ? { category: post.category } : undefined,
    { query: { enabled: !!post } },
  );

  const { contentHtml, headings } = useMemo(() => {
    if (!post?.content) return { contentHtml: "", headings: [] as Heading[] };
    const processed = processContent(post.content);
    return { contentHtml: processed.html, headings: processed.headings };
  }, [post?.content]);

  const relatedPosts = useMemo(
    () =>
      (relatedRaw ?? []).filter((p) => p.id !== post?.id).slice(0, 3),
    [relatedRaw, post?.id],
  );

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!contentHtml || headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topId = headings.find((h) => visible.has(h.id))?.id;
          if (topId) setActiveHeadingId(topId);
        }
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: [0, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [contentHtml, headings]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <Skeleton className="h-8 w-24 mb-6" />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-6 w-1/2 mb-12" />
        <Skeleton className="aspect-video w-full mb-12 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The article you are looking for does not exist or has been removed.
        </p>
        <Link href="/blog">
          <Button>Back to Blog</Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-b border-slate-200">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0052FF 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative container mx-auto px-4 max-w-4xl pt-20 pb-16">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[#0052FF] mb-10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>

          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider mb-6">
            {post.category}
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-slate-900">
            {post.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-10 leading-relaxed">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {authorInitials(post.author)}
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-slate-900">
                  {post.author}
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.authorRole}
                </div>
              </div>
            </div>
            <span className="hidden sm:block w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {post.readingMinutes} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Cover image overflowing into content */}
      <div className="container mx-auto px-4 max-w-4xl -mt-8 md:-mt-12 mb-16 relative z-10">
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full aspect-[2/1] object-cover rounded-2xl shadow-xl border border-slate-100"
        />
      </div>

      {/* Content + sticky TOC grid */}
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Sticky TOC (desktop only) — 1/4 width */}
          <aside className="hidden lg:block lg:col-span-1">
            {headings.length > 0 ? (
              <nav className="sticky top-24">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  <ListOrdered className="w-4 h-4" />
                  On this page
                </div>
                <ul className="space-y-2 border-l border-slate-200">
                  {headings.map((h) => {
                    const active = activeHeadingId === h.id;
                    return (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className={`block text-sm border-l-2 -ml-px pl-4 py-1 transition-all ${
                            h.level === 3 ? "pl-7 text-[13px]" : "font-medium"
                          } ${
                            active
                              ? "text-[#0052FF] border-[#0052FF] font-semibold"
                              : "text-slate-600 border-transparent hover:text-[#0052FF] hover:border-[#0052FF]"
                          }`}
                        >
                          {h.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}
          </aside>

          {/* Main article column — 3/4 width */}
          <div className="lg:col-span-3 min-w-0">
            <div
              className="prose prose-lg dark:prose-invert max-w-none
                         prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                         prose-h2:scroll-mt-24 prose-h3:scroll-mt-24
                         prose-a:text-[#0052FF] prose-a:no-underline hover:prose-a:underline
                         prose-img:rounded-xl prose-img:shadow-sm
                         prose-blockquote:border-l-4 prose-blockquote:border-[#0052FF] prose-blockquote:bg-blue-50/40 prose-blockquote:py-1 prose-blockquote:not-italic
                         prose-code:before:content-none prose-code:after:content-none prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Tags */}
            <div className="mt-16 pt-8 border-t border-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="font-normal text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Author Bio */}
            <Card className="mt-12 border-slate-200 bg-gradient-to-br from-blue-50/40 to-white">
              <CardContent className="p-8 flex flex-col sm:flex-row items-start gap-6">
                <div className="w-16 h-16 shrink-0 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {authorInitials(post.author)}
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
                    Written by
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {post.author}
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {post.authorRole}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {post.author} writes about {post.category.toLowerCase()} for
                    fintech operators at FintechPressHub, drawing on hands-on
                    experience running SEO and content programs for venture-backed
                    finance brands.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-slate-200">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
                  Keep Reading
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  Related articles
                </h2>
              </div>
              <Link href="/blog">
                <Button variant="outline" size="sm">
                  All articles <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`}>
                  <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card">
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={rp.coverImage}
                        alt={rp.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-[10px] font-semibold uppercase tracking-wider">
                          {rp.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {rp.readingMinutes} min
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2 leading-snug">
                        {rp.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" />
                        {rp.author}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
