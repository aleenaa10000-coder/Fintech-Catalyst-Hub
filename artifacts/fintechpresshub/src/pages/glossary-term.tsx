import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import NotFound from "@/pages/not-found";

type GlossaryTerm = {
  id: number;
  slug: string;
  term: string;
  shortDef: string;
  body: string;
  category: string | null;
  relatedTerms: string[];
  publishedAt: string;
  updatedAt: string;
};

async function fetchTerm(slug: string): Promise<GlossaryTerm> {
  const res = await fetch(`/api/glossary/${slug}`);
  if (!res.ok) throw Object.assign(new Error("Not found"), { status: res.status });
  return res.json() as Promise<GlossaryTerm>;
}

function TermSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          <Skeleton className="mx-auto h-5 w-24" />
          <Skeleton className="mx-auto h-10 w-2/3" />
          <Skeleton className="mx-auto h-5 w-1/2" />
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </section>
    </div>
  );
}

export default function GlossaryTermPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: term, isLoading, error } = useQuery<GlossaryTerm>({
    queryKey: ["glossary-term", slug],
    queryFn: () => fetchTerm(slug ?? ""),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <TermSkeleton />;
  if ((error as Error & { status?: number })?.status === 404 || !term) return <NotFound />;

  const canonical = `${SITE_URL}/glossary/${term.slug}`;
  const pageTitle = `${term.term} — Fintech Glossary | FintechPressHub`;
  const description = term.shortDef.slice(0, 160);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={pageTitle}
        description={description}
        canonical={canonical}
        webPage={{
          dateModified: term.updatedAt.slice(0, 10),
        }}
        definedTermSet={{
          name: "Fintech Glossary",
          description: "Definitions of key fintech, payments, lending, and banking terms.",
          terms: [{ name: term.term, description: term.shortDef, url: canonical }],
        }}
      />

      <PageHero
        eyebrow={term.category ?? "Fintech Glossary"}
        title={term.term}
        description={term.shortDef}
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/glossary"
              className="flex items-center gap-1 hover:text-[#0052FF] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Glossary
            </Link>
            {term.category && (
              <>
                <span>/</span>
                <Badge variant="secondary" className="text-xs">
                  {term.category}
                </Badge>
              </>
            )}
          </nav>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary">
            {term.body && term.body !== term.shortDef ? (
              <div dangerouslySetInnerHTML={{ __html: term.body }} />
            ) : (
              <p>{term.shortDef}</p>
            )}
          </div>

          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0052FF]" />
                Related terms
              </h2>
              <div className="flex flex-wrap gap-2">
                {term.relatedTerms.map((rt) => (
                  <Link
                    key={rt}
                    href={`/glossary/${rt}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border border-slate-200 text-slate-700 hover:border-[#0052FF] hover:text-[#0052FF] transition-colors"
                  >
                    {rt
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
            <Link
              href="/glossary"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#0052FF] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              View all terms
            </Link>
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(term.updatedAt).toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            Need fintech SEO that matches your expertise?
          </h2>
          <p className="text-muted-foreground mb-8">
            Our specialists write content that ranks for terms like <strong>{term.term}</strong> — combining
            technical accuracy with high-authority link building for ambitious fintech brands.
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-[#0052FF] hover:bg-[#0040cc]">
              Book a free strategy call
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
