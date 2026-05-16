import { Link } from "wouter";
import { ArrowRight, Plus } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SITE_URL } from "@/lib/metaData";
import { COMPARISONS } from "@/data/comparisons";

const faqItems = [
  {
    question: "Why does FintechPressHub publish comparison pages?",
    answer:
      "Fintech buyers evaluate multiple agencies, tools, and strategies before committing. Our comparison pages help those buyers make informed decisions with transparent, criterion-by-criterion analysis — not marketing fluff.",
  },
  {
    question: "Are these comparisons objective?",
    answer:
      "We are honest about where alternatives have advantages. For example, we clearly note that Google Ads generates leads faster than content SEO, and that in-house teams offer the best long-term control at scale. Our goal is to help buyers find the right fit, even if that means recommending a hybrid approach.",
  },
  {
    question: "What is the best option for an early-stage fintech?",
    answer:
      "Most Series A fintechs benefit most from a hybrid of paid search (for immediate pipeline) and content-led SEO (for compounding organic growth). Our /compare/content-led-vs-paid page covers this trade-off in detail.",
  },
  {
    question: "Do you work with fintechs that already have an in-house team?",
    answer:
      "Yes. About 40% of our clients have an in-house marketer who manages strategy while we handle specialist content creation, link building, and technical SEO execution — the parts that require fintech domain expertise and existing publisher relationships.",
  },
  {
    question: "How often does FintechPressHub update its comparison pages?",
    answer:
      "We review and refresh all comparison pages quarterly, or immediately when a significant market development occurs — such as a change in Google Ads CPC benchmarks for financial services or a new compliance framework affecting content marketing rules. Each page carries a schema dateModified so you can verify freshness.",
  },
  {
    question: "What are the eight SEO discipline comparisons on FintechPressHub?",
    answer:
      "The eight discipline comparisons cover: (1) Off-Page SEO vs On-Page SEO vs Technical SEO — which pillar drives authority fastest; (2) Technical SEO vs Content Marketing vs Link Building — the correct investment sequence; (3) On-Page SEO: agency vs DIY vs AI tools — E-E-A-T and YMYL compliance; (4) GEO vs Traditional SEO vs PPC — capturing AI Overview and LLM citations; (5) AEO vs Standard SEO vs Social — featured snippets, FAQ rich results, and PAA boxes; (6) International SEO vs Local SEO vs Single-market — hreflang and global fintech reach; (7) Programmatic vs Editorial vs AI-generated — information-gain requirements and thin-content risk; and (8) White Hat vs Grey Hat vs Black Hat SEO — compliance and reputational risk for regulated fintech.",
  },
  {
    question: "How do I choose the most relevant fintech SEO comparison for my situation?",
    answer:
      "Start with the agency and strategy comparisons if you are evaluating whether to hire an agency, work with freelancers, or build in-house. Move to the SEO discipline comparisons if you already have an SEO programme and want to understand which specific investment — off-page authority, technical health, on-page quality, AI visibility (GEO/AEO), international reach, or content scale — will deliver the highest ROI for your current growth stage. For fintech companies expanding internationally, the International SEO comparison addresses hreflang implementation across UK, US, AU, SG, and CA markets specifically.",
  },
  {
    question: "Are FintechPressHub comparison pages updated after Google algorithm changes?",
    answer:
      "Yes. Each comparison carries a schema dateModified timestamp visible on the page. We update comparisons after significant algorithm changes — including Core Updates, Helpful Content System rollouts, and AI Overviews expansions — and when regulatory frameworks affecting fintech content marketing are revised. The most recent batch incorporated Google's 2026 AI Overviews expansion and updated E-E-A-T guidance for YMYL financial services content.",
  },
];

export default function Compare() {
  const canonical = `${SITE_URL}/compare`;

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
        <link rel="alternate" hrefLang="en" href={canonical} />
        <link rel="alternate" hrefLang="en-US" href={canonical} />
        <link rel="alternate" hrefLang="en-GB" href={canonical} />
        <link rel="alternate" hrefLang="en-AU" href={canonical} />
        <link rel="alternate" hrefLang="en-SG" href={canonical} />
        <link rel="alternate" hrefLang="en-CA" href={canonical} />
        <link rel="alternate" hrefLang="x-default" href={canonical} />
        <meta name="news_keywords" content="fintech SEO comparison, agency vs in-house SEO, content SEO vs paid search, fintech marketing agency" />
      </Helmet>
      <PageMeta
        title="Fintech SEO Agency Comparisons | FintechPressHub"
        description="Detailed head-to-head comparisons of fintech SEO approaches — agency vs in-house, specialist vs generalist, content-led vs paid. Make an informed decision."
        canonical={canonical}
        speakableSelectors={["h1", ".speakable-summary", "h2"]}
        webPage={{
          datePublished: "2024-09-01",
          dateModified: "2026-05-16",
          keywords: [
            "fintech SEO agency comparison",
            "agency vs in-house SEO",
            "fintech SEO vs freelancers",
            "content SEO vs paid search",
            "fintech marketing comparison",
            "specialist vs generalist SEO",
            "off-page SEO vs on-page SEO",
            "technical SEO vs content marketing",
            "GEO vs traditional SEO",
            "AEO vs SEO",
            "international fintech SEO",
            "programmatic SEO fintech",
            "white hat SEO fintech",
          ],
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          about: [
            "Fintech SEO Agency Comparison",
            "Fintech Digital Marketing",
            "SEO Strategy for Fintech",
            "Off-Page SEO",
            "Technical SEO",
            "Generative Engine Optimization",
            "Answer Engine Optimization",
            "International SEO",
            "Programmatic SEO",
            "White Hat SEO",
          ],
          license: "https://fintechpresshub.com/terms",
          usageInfo: "https://fintechpresshub.com/terms",
          copyrightNotice: `© ${new Date().getFullYear()} FintechPressHub. All rights reserved.`,
          publishingPrinciples: "https://fintechpresshub.com/editorial-guidelines",
          audience: "Fintech founders, CMOs, and marketing leaders evaluating SEO and content marketing strategies",
          availableLanguage: ["en-US", "en-GB", "en-AU", "en-SG", "en-CA"],
          isAccessibleForFree: true,
          accessibilityFeature: ["readingOrder", "structuralNavigation"],
          accessMode: ["textual", "visual"],
          mentions: [
            "FCA",
            "CFPB",
            "MAS",
            "EBA",
            "ASIC",
            "Google Search Central",
            "Ahrefs",
            "Moz",
            "Finextra",
            "The Paypers",
          ],
        }}
        faq={faqItems}
        itemList={{
          name: "Fintech SEO Agency Comparisons",
          description: "Honest, criterion-by-criterion comparisons to help fintech buyers choose the right growth channel.",
          items: COMPARISONS.map((c) => ({
            name: c.title.split("|")[0].trim(),
            url: `${SITE_URL}/compare/${c.slug}`,
            description: c.description,
          })),
        }}
        howTo={{
          name: "How to choose the right fintech SEO approach using FintechPressHub's comparison hub",
          description: "A four-step process for fintech founders and CMOs using our comparison hub to select the right SEO strategy for their growth stage, budget, and regulatory environment.",
          totalTime: "PT10M",
          datePublished: "2024-09-01",
          dateModified: "2026-05-16",
          steps: [
            {
              name: "Identify your primary growth challenge",
              text: "Determine whether your challenge is supplier selection (which agency, freelancer, or in-house model), channel strategy (organic vs paid vs hybrid), or SEO discipline prioritisation (which of the eight SEO pillars — off-page, technical, on-page, GEO, AEO, international, programmatic, white hat — to invest in first). This determines which comparison category is most relevant.",
            },
            {
              name: "Select the comparison matching your decision",
              text: "Navigate to the relevant comparison — agency and strategy comparisons for supplier decisions, SEO discipline comparisons for investment prioritisation. Each comparison scores two or three options across 8–10 criteria so you can evaluate trade-offs specific to your growth stage and market.",
            },
            {
              name: "Apply the criteria to your specific context",
              text: "Weight the criteria by your priorities — regulatory compliance, time-to-value, budget, and internal capability. Every comparison includes a BLUF summary with the key verdict and a bottom-line scorecard for rapid decision-making without reading the full analysis.",
            },
            {
              name: "Book a free audit to validate your shortlist",
              text: "Once you have identified one or two preferred approaches from the comparisons, book a free fintech SEO audit to validate the fit against your specific domain, keyword landscape, and competitor benchmark before committing to a programme.",
            },
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
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" aria-current="page">
            <span className="text-foreground font-medium" itemProp="name">Compare</span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <PageHero
        eyebrow="Honest comparisons"
        title={<>How does fintech SEO stack up?</>}
        description="We publish honest, criterion-by-criterion comparisons between FintechPressHub and the most common alternatives — so you can make an informed decision, not one based on marketing copy."
      />

      <div className="container mx-auto px-4 max-w-3xl pt-10 pb-2">
        <p className="speakable-summary text-base text-muted-foreground text-center leading-relaxed">
          FintechPressHub publishes fourteen head-to-head comparisons — covering agency vs in-house, freelancers, SEO tools, PR firms, content vs paid, and specialist vs generalist, plus eight SEO discipline comparisons (off-page, technical, on-page, GEO, AEO, international, programmatic, and white hat SEO) — each scored across 8–10 decision criteria so fintech buyers can choose the right growth channel without guesswork.
        </p>
      </div>

      <main>
        <section className="py-14">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="space-y-12">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-3">Agency &amp; strategy comparisons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {COMPARISONS.slice(0, 6).map((comparison) => (
                    <Link key={comparison.slug} href={`/compare/${comparison.slug}`}>
                      <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-[#0052FF] hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col">
                        <Badge
                          variant="outline"
                          className="self-start mb-3 text-xs font-medium text-[#0052FF] border-[#0052FF]/30 bg-[#0052FF]/5"
                        >
                          {comparison.eyebrow}
                        </Badge>
                        <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-[#0052FF] transition-colors leading-snug">
                          {comparison.heroTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                          {comparison.heroDescription}
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#0052FF]">
                          View comparison
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-3">SEO discipline comparisons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {COMPARISONS.slice(6).map((comparison) => (
                    <Link key={comparison.slug} href={`/compare/${comparison.slug}`}>
                      <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-[#0052FF] hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col">
                        <Badge
                          variant="outline"
                          className="self-start mb-3 text-xs font-medium text-[#0052FF] border-[#0052FF]/30 bg-[#0052FF]/5"
                        >
                          {comparison.eyebrow}
                        </Badge>
                        <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-[#0052FF] transition-colors leading-snug">
                          {comparison.heroTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                          {comparison.heroDescription}
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#0052FF]">
                          View comparison
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-secondary/30" id="compare-faq">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">Fintech SEO comparison — frequently asked questions</h2>
            <Accordion
              type="single"
              collapsible
              className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
            >
              {faqItems.map((faq, i) => (
                <AccordionItem key={faq.question} value={`compare-faq-${i}`} className="border-b-0 group">
                  <AccordionTrigger className="faq-question px-6 py-5 text-base md:text-lg font-semibold text-left text-slate-900 hover:text-[#0052FF] hover:no-underline transition-colors [&>svg]:hidden">
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
      </main>
    </div>
  );
}
