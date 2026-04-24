import { useDocumentTitle } from "@/hooks/use-document-title";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, Home, ArrowRight, Clock, Calendar } from "lucide-react";
import posts from "@/data/posts.js";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function NotFound() {
  useDocumentTitle("Page Not Found | FintechPressHub");

  const popular = [...posts]
    .sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="min-h-[80vh] w-full bg-background py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* 404 message */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex justify-center mb-6 text-[#0052FF]">
            <BarChart2 className="w-16 h-16" />
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-4">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            The article or page you are looking for does not exist or has been
            moved. While you are here, take a look at some of our most popular
            reads on fintech SEO and digital PR.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button size="lg" className="gap-2" data-testid="button-home">
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            <Link href="/blog">
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                data-testid="button-all-articles"
              >
                Browse all articles
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular articles */}
        <section className="pt-12 border-t border-slate-200">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0052FF] mb-2">
              Suggested Reading
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Popular articles
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popular.map((p: any) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                data-testid={`popular-${p.slug}`}
              >
                <Card className="overflow-hidden h-full border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-[10px] font-semibold uppercase tracking-wider">
                        {p.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {p.readTime}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors line-clamp-2 leading-snug mb-3">
                      {p.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-3 border-t border-slate-100">
                      <Calendar className="w-3 h-3" />
                      {formatDate(p.date)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
