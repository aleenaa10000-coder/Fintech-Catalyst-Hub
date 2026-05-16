import { useParams, Link } from "wouter";
import { Check, X, ArrowRight, Minus, Plus, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SITE_URL } from "@/lib/metaData";
import { getComparison, COMPARISONS, COMPARISON_SOURCES, type Verdict } from "@/data/comparisons";
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="FintechPressHub Editorial Team" />
        <link rel="author" href={`${SITE_URL}/about`} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="en_GB" />
        <meta property="og:locale:alternate" content="en_AU" />
        <meta property="og:locale:alternate" content="en_SG" />
        <meta property="og:locale:alternate" content="en_CA" />
        <meta name="news_keywords" content={`${comparison.colA}, ${comparison.colB}, ${comparison.colC}, fintech SEO comparison, fintech marketing`} />
        <link rel="alternate" hrefLang="en" href={canonical} />
        <link rel="alternate" hrefLang="en-US" href={canonical} />
        <link rel="alternate" hrefLang="en-GB" href={canonical} />
        <link rel="alternate" hrefLang="en-AU" href={canonical} />
        <link rel="alternate" hrefLang="en-SG" href={canonical} />
        <link rel="alternate" hrefLang="en-CA" href={canonical} />
        <link rel="alternate" hrefLang="x-default" href={canonical} />
        {/* AEO: DefinedTerm schema for each compared entity — enables "What is X?" rich
            results and gives voice assistants and AI rankers structured definitions for
            the three options being evaluated. Uses bottomLine summaries as definitions. */}
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "DefinedTerm",
              "@id": `${canonical}#term-a`,
              name: comparison.colA,
              description: comparison.bottomLine[0]?.summary ?? "",
              inDefinedTermSet: `${SITE_URL}/compare#glossary`,
              url: canonical,
            },
            {
              "@context": "https://schema.org",
              "@type": "DefinedTerm",
              "@id": `${canonical}#term-b`,
              name: comparison.colB,
              description: comparison.bottomLine[1]?.summary ?? "",
              inDefinedTermSet: `${SITE_URL}/compare#glossary`,
              url: canonical,
            },
            {
              "@context": "https://schema.org",
              "@type": "DefinedTerm",
              "@id": `${canonical}#term-c`,
              name: comparison.colC,
              description: comparison.bottomLine[2]?.summary ?? "",
              inDefinedTermSet: `${SITE_URL}/compare#glossary`,
              url: canonical,
            },
          ])}
        </script>
      </Helmet>
      <PageMeta
        title={comparison.title}
        description={comparison.description}
        canonical={canonical}
        speakableSelectors={["h1", ".speakable-summary", "h2"]}
        faq={comparison.faqItems}
        webPage={{
          datePublished: comparison.datePublished,
          dateModified: comparison.lastmod,
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          about: [
            "Fintech SEO Comparison",
            comparison.colA,
            comparison.colB,
            comparison.colC,
            "Fintech Digital Marketing",
          ],
          keywords: [
            comparison.colA,
            comparison.colB,
            comparison.colC,
            "fintech SEO comparison",
            "fintech marketing",
          ],
          license: "https://fintechpresshub.com/terms",
          usageInfo: "https://fintechpresshub.com/terms",
          copyrightNotice: `© ${new Date().getFullYear()} FintechPressHub. All rights reserved.`,
          publishingPrinciples: "https://fintechpresshub.com/editorial-guidelines",
        }}
      />

      <nav aria-label="Breadcrumb" className="container mx-auto px-4 max-w-5xl pt-4 pb-2">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" className="hover:text-foreground transition-colors" itemProp="item"><span itemProp="name">Home</span></Link>
            <meta itemProp="position" content="1" />
          </li>
          <li className="select-none" aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/compare" className="hover:text-foreground transition-colors" itemProp="item"><span itemProp="name">Compare</span></Link>
            <meta itemProp="position" content="2" />
          </li>
          <li className="select-none" aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" aria-current="page">
            <span className="text-foreground font-medium truncate" itemProp="name">{comparison.heroTitle}</span>
            <meta itemProp="position" content="3" />
          </li>
        </ol>
      </nav>

      <PageHero
        eyebrow={comparison.eyebrow}
        title={<>{comparison.heroTitle}</>}
        description={comparison.heroDescription}
      />

      <div className="container mx-auto px-4 max-w-3xl pt-6 pb-2">
        <p className="speakable-summary text-base text-muted-foreground text-center leading-relaxed">
          {comparison.bluf}
        </p>
      </div>

      <div className="container mx-auto px-4 max-w-3xl pt-1 pb-0 text-center">
        <p className="text-xs text-muted-foreground">
          By{" "}
          <a href="/about" className="underline hover:text-foreground font-medium" rel="author">FintechPressHub Editorial Team</a>
        </p>
      </div>

      <div className="container mx-auto px-4 max-w-3xl pt-2 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          Last reviewed:{" "}
          <time dateTime={comparison.lastmod}>
            {new Date(comparison.lastmod).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </time>
          {" · "}
          Published:{" "}
          <time dateTime={comparison.datePublished}>
            {new Date(comparison.datePublished).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </time>
          {" · "}
          Editorial standards: <a href="/editorial-guidelines" className="underline hover:text-foreground">FintechPressHub Editorial Policy</a>
        </p>
      </div>

      <main>
        <section className="py-14">
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
            <h2 className="text-2xl font-bold text-center mb-10">{comparison.colA} vs {comparison.colB} vs {comparison.colC} — which fits your fintech?</h2>
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
          <section className="py-16" id="slug-faq">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions about {comparison.colA} for fintech</h2>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
              >
                {comparison.faqItems.map((faq, i) => (
                  <AccordionItem key={faq.question} value={`slug-faq-${i}`} className="border-b-0 group">
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
        )}

        {(COMPARISON_SOURCES[comparison.slug] ?? []).length > 0 && (
          <section className="py-8 border-t bg-slate-50/50">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sources &amp; references</h2>
              <ul className="flex flex-wrap gap-x-8 gap-y-2">
                {(COMPARISON_SOURCES[comparison.slug] ?? []).map((src, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <cite className="not-italic">
                      <a href={src.url} rel="noopener noreferrer" target="_blank" className="underline hover:text-foreground inline-flex items-center gap-1">
                        {src.text}
                        <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
                      </a>
                    </cite>
                  </li>
                ))}
              </ul>
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-[#0052FF] hover:bg-[#0040cc] w-full sm:w-auto">
                  Book a free strategy call
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Explore our SEO services
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
