import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, BookOpen } from "lucide-react";

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

function useGlossaryTerms() {
  return useQuery<GlossaryTerm[]>({
    queryKey: ["glossary"],
    queryFn: async () => {
      const res = await fetch("/api/glossary");
      if (!res.ok) throw new Error("Failed to load glossary");
      return res.json() as Promise<GlossaryTerm[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryPage() {
  const { data: terms = [], isLoading } = useGlossaryTerms();
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = terms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.shortDef.toLowerCase().includes(q),
      );
    }
    if (activeLetter) {
      list = list.filter((t) =>
        t.term.toUpperCase().startsWith(activeLetter),
      );
    }
    return list;
  }, [terms, search, activeLetter]);

  const lettersWithTerms = useMemo(
    () =>
      new Set(
        terms.map((t) => t.term.charAt(0).toUpperCase()).filter(Boolean),
      ),
    [terms],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const letter = t.term.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(terms.map((t) => t.category).filter(Boolean)),
      ).sort() as string[],
    [terms],
  );

  const faqItems = useMemo(
    () =>
      filtered.slice(0, 8).map((t) => ({
        question: `What is ${t.term}?`,
        answer: t.shortDef,
      })),
    [filtered],
  );

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech Glossary — Key Terms & Definitions | FintechPressHub"
        description="A definitive glossary of fintech, payments, and embedded-finance terms. Plain-English definitions for payments infrastructure, open banking, regtech, and more."
        faq={faqItems.length > 0 ? faqItems : undefined}
        webPage={{ dateModified: new Date().toISOString().slice(0, 10) }}
      />
      <PageHero
        eyebrow="Fintech Glossary"
        title={<>Key Terms &amp; Definitions</>}
        description="Plain-English definitions for payments, embedded finance, open banking, regtech, and every other corner of the fintech universe."
      />

      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search terms…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveLetter(null);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-1 mt-4">
            <button
              onClick={() => setActiveLetter(null)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                !activeLetter
                  ? "bg-[#0052FF] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {ALPHABET.map((letter) => {
              const has = lettersWithTerms.has(letter);
              return (
                <button
                  key={letter}
                  disabled={!has}
                  onClick={() =>
                    setActiveLetter(activeLetter === letter ? null : letter)
                  }
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    activeLetter === letter
                      ? "bg-[#0052FF] text-white"
                      : has
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearch(cat)}
                  className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 hover:border-[#0052FF] hover:text-[#0052FF] transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>No terms found for your search.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map(([letter, groupTerms]) => (
                <div key={letter} id={`letter-${letter}`}>
                  <h2 className="text-2xl font-bold text-[#0052FF] border-b border-slate-200 pb-2 mb-6">
                    {letter}
                  </h2>
                  <dl className="space-y-6">
                    {groupTerms.map((term) => (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="group scroll-mt-24"
                      >
                        <dt className="flex items-start gap-3">
                          <span className="text-lg font-semibold text-slate-900">
                            {term.term}
                          </span>
                          {term.category && (
                            <Badge
                              variant="secondary"
                              className="text-xs mt-0.5 shrink-0"
                            >
                              {term.category}
                            </Badge>
                          )}
                        </dt>
                        <dd className="mt-1 text-muted-foreground leading-relaxed">
                          {term.shortDef}
                        </dd>
                        {term.body && term.body !== term.shortDef && (
                          <dd className="mt-2 text-sm text-slate-600 leading-relaxed border-l-2 border-[#0052FF]/30 pl-4">
                            {term.body}
                          </dd>
                        )}
                        {term.relatedTerms && term.relatedTerms.length > 0 && (
                          <dd className="mt-2 text-xs text-slate-500">
                            Related:{" "}
                            {term.relatedTerms.map((rt, i) => (
                              <span key={rt}>
                                <Link
                                  href={`/glossary#${rt}`}
                                  className="text-[#0052FF] hover:underline"
                                >
                                  {rt}
                                </Link>
                                {i < term.relatedTerms.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}

          {terms.length === 0 && !isLoading && (
            <div className="text-center py-24 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Glossary coming soon</p>
              <p className="text-sm">
                We're building out our fintech terminology guide. Check back
                shortly.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-secondary/30 border-t">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Missing a term?</h2>
          <p className="text-muted-foreground mb-6">
            If you can't find the fintech term you're looking for, let us know
            and we'll add it.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0052FF] text-white rounded-lg font-medium hover:bg-[#0040cc] transition-colors"
          >
            Suggest a term
          </Link>
        </div>
      </section>
    </div>
  );
}
