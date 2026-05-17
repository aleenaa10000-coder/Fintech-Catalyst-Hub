import { useParams, Link } from "wouter";
import { Check, X, ArrowRight, Minus, ExternalLink } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <meta name="news_keywords" content={`${comparison.colA}, ${comparison.colB}, ${comparison.colC}, fintech SEO comparison, fintech marketing`} />
      </Helmet>
      <PageMeta
        title={comparison.title}
        description={comparison.description}
        canonical={canonical}
        hreflang={[
          { lang: "en",        href: canonical },
          { lang: "en-US",     href: canonical },
          { lang: "en-GB",     href: canonical },
          { lang: "en-AU",     href: canonical },
          { lang: "en-SG",     href: canonical },
          { lang: "en-CA",     href: canonical },
          { lang: "x-default", href: canonical },
        ]}
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
          audience: "Fintech founders, CMOs, and marketing leaders evaluating fintech SEO and content strategies",
          availableLanguage: ["en-US", "en-GB", "en-AU", "en-SG", "en-CA"],
          isAccessibleForFree: true,
          accessibilityFeature: ["readingOrder", "structuralNavigation"],
          accessMode: ["textual", "visual"],
          mentions: ["FCA", "CFPB", "MAS", "EBA", "ASIC", "Google Search Central", "Ahrefs", "Moz"],
        }}
        howTo={{
          name: `How to choose between ${comparison.colA}, ${comparison.colB}, and ${comparison.colC} for fintech`,
          description: "A structured five-step framework for evaluating fintech SEO approaches and selecting the right strategy for your growth stage, regulatory environment, and budget.",
          totalTime: "PT15M",
          datePublished: comparison.datePublished,
          dateModified: comparison.lastmod,
          steps: [
            {
              name: "Audit your current organic footprint",
              text: "Use Google Search Console and Ahrefs to benchmark your current keyword rankings, organic traffic, and domain rating. Identify gaps between your current position and your 12-month growth target before evaluating any new approach.",
            },
            {
              name: "Define your growth stage and budget constraints",
              text: "Determine whether you are pre-Series A, Series A, or Series B+. Budget constraints and time-to-value requirements differ significantly at each stage and should determine your channel prioritisation and agency vs in-house decision.",
            },
            {
              name: "Evaluate each option against your compliance requirements",
              text: "For regulated fintech companies, ensure your chosen SEO approach meets FCA financial promotion rules, CFPB disclosure requirements, MAS advertising guidelines, or EBA standards applicable to your markets. Non-compliant content creates regulatory risk independent of SEO performance.",
            },
            {
              name: "Score each option across the criteria in this comparison",
              text: "Use the comparison table above to score each option against your specific requirements. Weight the criteria that directly affect your primary KPIs — typically organic sessions, keyword rankings in target markets, and referring domain growth from relevant publishers.",
            },
            {
              name: "Select an approach and define success metrics before launch",
              text: "Commit to a 90-day trial period with clearly defined success metrics: keyword rank movement (target terms entering the top 10), referring domain growth (DR 40+ domains per month), and organic session growth (week-over-week trend). Review at day 90 before committing to a 12-month programme.",
            },
          ],
        }}
        article={{
          title: comparison.heroTitle,
          description: comparison.heroDescription,
          abstract: comparison.bluf,
          alternativeHeadline: comparison.heroDescription.slice(0, 110),
          section: "Fintech SEO",
          tags: [comparison.colA, comparison.colB, comparison.colC, "fintech SEO comparison", "fintech marketing"],
          inLanguage: "en",
          countryOfOrigin: "United Kingdom",
          authorJobTitle: "Senior Fintech SEO Editor",
          timeRequired: "PT5M",
          wordCount: comparison.rows.length * 35 + comparison.faqItems.length * 85 + 350,
          hasPart: [
            `Comparison: ${comparison.colA} vs ${comparison.colB} vs ${comparison.colC}`,
            "Bottom Line Verdict",
            "Frequently Asked Questions",
            "Sources & References",
          ],
          speakableSelectors: ["h1", ".speakable-summary", "h2"],
          usageInfo: `${SITE_URL}/terms`,
          datePublished: comparison.datePublished,
          dateModified: comparison.lastmod,
          author: "FintechPressHub Editorial Team",
          authorUrl: `${SITE_URL}/about`,
          image: `${SITE_URL}/api/og?title=${encodeURIComponent(comparison.heroTitle)}&category=Compare`,
          citation: (COMPARISON_SOURCES[comparison.slug] ?? []).map((src) => src.text),
          isBasedOn: (COMPARISON_SOURCES[comparison.slug] ?? []).map((src) => src.url),
          copyrightNotice: `© ${new Date().getFullYear()} FintechPressHub. All rights reserved.`,
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          about: ["Fintech SEO Comparison", comparison.colA, comparison.colB, comparison.colC],
          mentions: [
            comparison.colA, comparison.colB, comparison.colC,
            "Financial Conduct Authority",
            "Consumer Financial Protection Bureau",
            "Monetary Authority of Singapore",
            "Australian Securities and Investments Commission",
          ],
          isPartOf: {
            id:   `${SITE_URL}/compare#collection`,
            name: "FintechPressHub Comparisons",
            url:  `${SITE_URL}/compare`,
          },
        }}
        definedTermSet={{
          name: `${comparison.colA} vs ${comparison.colB} vs ${comparison.colC} — Glossary`,
          terms: [
            { name: comparison.colA, description: comparison.bottomLine[0]?.summary ?? "", url: `${canonical}#term-a` },
            { name: comparison.colB, description: comparison.bottomLine[1]?.summary ?? "", url: `${canonical}#term-b` },
            { name: comparison.colC, description: comparison.bottomLine[2]?.summary ?? "", url: `${canonical}#term-c` },
          ],
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
        <section id="comparison-table" className="py-14">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table
                className="w-full text-sm"
                aria-label={`${comparison.colA} vs ${comparison.colB} vs ${comparison.colC} — criterion-by-criterion comparison`}
              >
                <caption className="sr-only">
                  {comparison.heroTitle} — scored across {comparison.rows.length} criteria
                </caption>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-6 py-4 font-semibold text-slate-700 w-1/2">
                      Criterion
                    </th>
                    <th scope="col" className="text-center px-4 py-4 font-semibold text-[#0052FF] w-[16.66%]">
                      {comparison.colA}
                    </th>
                    <th scope="col" className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                      {comparison.colB}
                    </th>
                    <th scope="col" className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                      {comparison.colC}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.rows.map((row) => (
                    <tr key={row.criterion} className="hover:bg-slate-50 transition-colors">
                      <th scope="row" className="px-6 py-4 font-normal text-left">
                        <div className="font-medium text-slate-900">{row.criterion}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                      </th>
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
          <FaqSection
            items={comparison.faqItems}
            heading={`Frequently asked questions about ${comparison.colA}, ${comparison.colB} and ${comparison.colC}`}
            valuePrefix="slug-faq"
            id="slug-faq"
          />
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

        <section className="py-10 bg-slate-50/60 border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5 text-center">
              Related Reading
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <Link href="/pricing" className="text-sm text-slate-700 font-medium hover:text-[#0052FF] hover:underline">
                Pricing Plans
              </Link>
              <Link href="/services" className="text-sm text-slate-700 font-medium hover:text-[#0052FF] hover:underline">
                SEO Services
              </Link>
              <Link href="/blog/category/seo-strategy" className="text-sm text-slate-700 font-medium hover:text-[#0052FF] hover:underline">
                SEO Strategy Blog
              </Link>
              <Link href="/tools/keyword-difficulty-estimator" className="text-sm text-slate-700 font-medium hover:text-[#0052FF] hover:underline">
                Keyword Difficulty Tool
              </Link>
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
