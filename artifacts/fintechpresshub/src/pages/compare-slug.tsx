import { useParams, Link } from "wouter";
import { Check, X, ArrowRight, Minus } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/metaData";
import { getComparison, COMPARISONS, type Verdict } from "@/data/comparisons";
import NotFound from "@/pages/not-found";

function VerdictIcon({ v }: { v: Verdict }) {
  if (v === "yes") return <Check className="w-5 h-5 text-emerald-600 mx-auto" aria-label="Yes" />;
  if (v === "no") return <X className="w-5 h-5 text-red-500 mx-auto" aria-label="No" />;
  return <Minus className="w-5 h-5 text-amber-500 mx-auto" aria-label="Partial" />;
}

export default function CompareSlug() {
  const params = useParams<{ slug: string }>();
  const comparison = getComparison(params.slug ?? "");

  if (!comparison) return <NotFound />;

  const canonical = `${SITE_URL}/compare/${comparison.slug}`;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    name: comparison.title,
    description: comparison.description,
    url: canonical,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare` },
        { "@type": "ListItem", position: 3, name: comparison.colA, item: canonical },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={comparison.title}
        description={comparison.description}
        canonical={canonical}
        faq={comparison.faqItems}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>

      <PageHero
        eyebrow={comparison.eyebrow}
        title={<>{comparison.heroTitle}</>}
        description={comparison.heroDescription}
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-semibold text-slate-700 w-1/2">
                    Criterion
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-[#0052FF] w-[16.66%]">
                    {comparison.colA}
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                    {comparison.colB}
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                    {comparison.colC}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.rows.map((row) => (
                  <tr key={row.criterion} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{row.criterion}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                    </td>
                    <td className="px-4 py-4 text-center"><VerdictIcon v={row.a} /></td>
                    <td className="px-4 py-4 text-center"><VerdictIcon v={row.b} /></td>
                    <td className="px-4 py-4 text-center"><VerdictIcon v={row.c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Fully covered
            </span>
            <span className="flex items-center gap-1.5">
              <Minus className="w-4 h-4 text-amber-500" /> Partial / varies
            </span>
            <span className="flex items-center gap-1.5">
              <X className="w-4 h-4 text-red-500" /> Not covered
            </span>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-10">The bottom line</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparison.bottomLine.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border-2 ${item.colorBorder} bg-white p-6 flex flex-col gap-3`}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <div className={`text-3xl font-bold mt-1 ${item.colorScore}`}>
                    {item.score}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex-1">{item.summary}</p>
                {item.cta && (
                  <Link href="/contact">
                    <Button size="sm" className="bg-[#0052FF] hover:bg-[#0040cc] w-full mt-2">
                      Get a free audit
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {comparison.faqItems.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
            <div className="space-y-4">
              {comparison.faqItems.map((faq) => (
                <div key={faq.question} className="rounded-lg border p-5">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 border-t">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-lg font-semibold mb-5 text-center text-muted-foreground">
            More comparisons
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {COMPARISONS.filter((c) => c.slug !== comparison.slug).map((c) => (
              <Link key={c.slug} href={`/compare/${c.slug}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 hover:border-primary transition-colors px-4 py-2 text-sm"
                >
                  {c.heroTitle}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0052FF]/5">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Badge className="mb-4 bg-[#0052FF]/10 text-[#0052FF] hover:bg-[#0052FF]/10">
            Ready to start?
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Start with a free SEO audit</h2>
          <p className="text-muted-foreground mb-8">
            We'll review your current organic footprint, benchmark you against 3 competitors, and show
            you exactly what a fintech-specialist approach would change. No commitment required.
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
