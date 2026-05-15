import { PageMeta } from "@/components/PageMeta";
import { SITE_URL } from "@/lib/metaData";
import { useListPricingPlans, useListTestimonials } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "wouter";
import { PageHero } from "@/components/PageHero";

const faqs = [
  {
    q: "Do you require long-term contracts?",
    a: "We typically operate on 6-month minimum engagements because SEO is a long-term play. It takes time to audit, produce high-quality content, and build the authority needed to see significant ROI.",
  },
  {
    q: "Are the backlinks dofollow?",
    a: "Yes. We secure permanent, dofollow backlinks from high Domain Rating (DR 60+) sites relevant to the financial industry. No PBNs, no spam.",
  },
  {
    q: "Can we upgrade or downgrade our plan?",
    a: "Absolutely. You can adjust your retainer at the end of any billing cycle to match your current growth priorities and budget.",
  },
  {
    q: "How long until we see results from fintech SEO?",
    a: "Most clients see meaningful ranking improvements in 3-4 months and significant organic traffic growth by month 6. Fintech is a competitive, regulated vertical, so authority and topical depth take time to compound — but the traffic we build is durable.",
  },
  {
    q: "Do you only work with fintech companies?",
    a: "Yes. We work exclusively with fintech, payments, lending, wealth, and banking infrastructure companies. That focus is what lets our writers and link builders deliver work that meets compliance, accuracy, and E-E-A-T standards Google rewards in YMYL verticals.",
  },
  {
    q: "What is included in a content piece?",
    a: "Every article includes topic research, SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, internal linking, on-page optimization, and unlimited revisions before publish. We also handle CMS upload if requested.",
  },
  {
    q: "How much does fintech SEO cost per month?",
    a: "FintechPressHub retainers range from approximately $3,500 to $12,000+ per month depending on the volume of content, link-building activity, and technical SEO scope. Starter plans cover foundational SEO content; Growth and Authority plans add progressively more aggressive link acquisition. Most growth-stage fintechs start on the Growth plan for an optimum balance of content output and link velocity.",
  },
  {
    q: "What ROI should we expect from a fintech SEO retainer?",
    a: "Clients typically achieve a 3–5x return within 12 months, measured in incremental organic traffic value — i.e., what equivalent paid search traffic would cost. Because fintech CAC from organic search runs 60–80% lower than paid channels, the compounding value of an authority-driven content programme grows substantially into years two and three.",
  },
  {
    q: "Do you offer a free fintech SEO audit before we commit?",
    a: "Yes. We offer a complimentary 30-minute strategy call that includes a high-level review of your current organic footprint, top keyword opportunities, and a content gap analysis against your nearest competitors. There is no obligation to proceed. Book your free audit call via the contact page.",
  },
];

export default function Pricing() {
  const { data: plans, isLoading } = useListPricingPlans();
  const { data: testimonials } = useListTestimonials();

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="pricing"
        webPage={{ dateModified: __BUILD_TIME_ISO__ }}
        speakableSelectors={["h1", ".speakable-summary", "#pricing-bluf"]}
        faq={faqs.map((f) => ({ question: f.q, answer: f.a }))}
        pricingOffers={
          plans?.map((plan: NonNullable<typeof plans>[number]) => ({
            name: plan.name,
            description: plan.description,
            price: plan.priceMonthly,
            priceCurrency: "USD",
            url: `${SITE_URL}/pricing#${plan.name.toLowerCase().replace(/\s+/g, "-")}`,
          })) ?? undefined
        }
        aggregateRating={
          Array.isArray(testimonials) && testimonials.length > 0
            ? {
                ratingValue: parseFloat(
                  (testimonials.reduce((s, t) => s + (t.rating ?? 5), 0) / testimonials.length).toFixed(1)
                ),
                ratingCount: testimonials.length,
                reviewCount: testimonials.length,
              }
            : undefined
        }
      />
      <PageHero
        eyebrow="Pricing"
        title={<>Transparent Fintech SEO Pricing</>}
        description={
          <p className="speakable-summary">
            Transparent, retainer-based fintech SEO pricing — monthly plans for content marketing and link building with predictable costs and senior fintech operators on every account.
          </p>
        }
      />

      {/* GEO BLUF block — direct factual answer for AI overview engines and voice assistants */}
      <section
        id="pricing-bluf"
        aria-label="Pricing summary"
        className="py-5 bg-blue-50/70 border-y border-blue-100"
      >
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>Summary:</strong> FintechPressHub offers monthly fintech SEO retainers from <strong>$3,500/month</strong> covering content marketing, editorial link building, and technical SEO — all delivered by senior fintech operators with no generalist handoffs. Plans scale from foundational content to full-authority link acquisition.{" "}
            <Link href="/contact" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">
              Book a free strategy call
            </Link>{" "}
            or review the plans below. Learn more about our{" "}
            <Link href="/services" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">fintech SEO services</Link>
            {" "}or read the{" "}
            <Link href="/blog" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">fintech SEO blog</Link>.
          </p>
        </div>
      </section>

      {/* GEO stats — cited data points for AI citation engines and E-E-A-T */}
      <section aria-label="Organic SEO impact statistics" className="py-8 bg-white border-b border-slate-100" id="geo-stats">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-[#0052FF]">53%</p>
              <p className="text-sm text-slate-600 mt-1">of all website traffic originates from organic search</p>
              <cite className="text-xs text-muted-foreground not-italic mt-1 block">BrightEdge Research, 2024</cite>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#0052FF]">60–80%</p>
              <p className="text-sm text-slate-600 mt-1">lower customer acquisition cost vs paid channels for fintech brands</p>
              <cite className="text-xs text-muted-foreground not-italic mt-1 block">FintechPressHub client data, 2024–2025</cite>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#0052FF]">3–5×</p>
              <p className="text-sm text-slate-600 mt-1">median ROI from a 12-month fintech SEO retainer</p>
              <cite className="text-xs text-muted-foreground not-italic mt-1 block">FintechPressHub client cohort, 2025</cite>
            </div>
          </div>
        </div>
      </section>

      {/* GEO expert quote — named practitioner with credentials (+32% AI citation visibility) */}
      <section aria-label="Expert perspective on fintech SEO investment" className="py-10 bg-blue-50/40 border-b border-blue-100">
        <div className="container mx-auto px-4 max-w-3xl">
          <figure>
            <blockquote className="text-slate-800 text-base md:text-lg leading-relaxed italic border-l-4 border-[#0052FF] pl-5">
              "Fintech brands that invest in specialist SEO early — before scaling paid acquisition — consistently achieve lower blended CAC and higher LTV multiples. The compounding nature of topical authority means every article published today is an asset generating qualified pipeline two, three, and five years from now. Generalist agencies simply cannot replicate the domain credibility that Google's E-E-A-T framework rewards in YMYL financial content."
            </blockquote>
            <figcaption className="mt-3 pl-5 text-sm text-muted-foreground">
              <strong className="text-slate-900">Marcus Webb</strong>
              {" — "}Head of SEO Strategy, FintechPressHub
              <span className="block text-xs mt-0.5 text-slate-500">12 years in fintech content marketing · ex-payments infrastructure, open banking, and neobanking sectors</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="pt-12 pb-8">
        <div className="container mx-auto px-4">
          <h2 id="plans" className="text-2xl font-bold text-center mb-8 text-slate-900">
            Fintech SEO &amp; Content Marketing Retainer Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-[500px]">
                  <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full" /></CardHeader>
                  <CardContent><Skeleton className="h-16 w-1/3 mb-8" /><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
              ))
            ) : plans?.map((plan: NonNullable<typeof plans>[number], i: number) => (
              <motion.div
                key={plan.id}
                id={plan.name.toLowerCase().replace(/\s+/g, "-")}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="h-full flex"
              >
                <Card
                  className={`w-full flex flex-col relative transition-all duration-300 ease-out ${
                    plan.highlighted
                      ? 'border-2 border-[#0052FF] border-t-4 border-t-[#0052FF] shadow-[0_0_20px_rgba(0,82,255,0.15)] md:scale-105 z-10 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,82,255,0.35)]'
                      : 'border border-border hover:-translate-y-2 hover:shadow-xl hover:border-blue-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                      Recommended
                    </div>
                  )}
                  <CardHeader className="text-center pb-2 pt-8">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm h-10">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="text-center mb-8">
                      <span className="text-2xl font-semibold align-top text-muted-foreground mr-0.5">$</span>
                      <span className="text-5xl font-extrabold tracking-tight">{plan.priceMonthly.toLocaleString()}</span>
                      <span className="text-muted-foreground">/{plan.priceUnit}</span>
                    </div>
                    <p className="text-sm text-center text-muted-foreground mb-6">{plan.description}</p>
                    <div className="space-y-4 flex-1">
                      {plan.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-6 pb-8 px-6">
                    <Link href="/contact" className="w-full">
                      <Button
                        className={
                          plan.highlighted
                            ? "w-full btn-shine bg-[#0052FF] hover:bg-[#0040cc] text-white border-0 shadow-md"
                            : "w-full bg-transparent border-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
                        }
                        size="lg"
                      >
                        {plan.ctaLabel}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            All retainers invoiced monthly in USD. Equivalent invoicing in GBP, EUR, SGD, AUD, and CAD available on request.
          </p>
        </div>
      </section>

      {/* Trust signals — White Hat E-E-A-T indicators */}
      <section aria-label="Why FintechPressHub" className="py-10 border-y border-slate-100 bg-slate-50/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <dt className="text-2xl font-extrabold text-[#0052FF]">DR&nbsp;60+</dt>
              <dd className="text-sm text-muted-foreground mt-1">Editorial links only — no PBNs</dd>
            </div>
            <div>
              <dt className="text-2xl font-extrabold text-[#0052FF]">YMYL</dt>
              <dd className="text-sm text-muted-foreground mt-1">E-E-A-T compliant content</dd>
            </div>
            <div>
              <dt className="text-2xl font-extrabold text-[#0052FF]">Fintech&#8209;only</dt>
              <dd className="text-sm text-muted-foreground mt-1">Exclusive sector focus since 2021</dd>
            </div>
            <div>
              <dt className="text-2xl font-extrabold text-[#0052FF]">Senior&nbsp;ops</dt>
              <dd className="text-sm text-muted-foreground mt-1">No generalist handoffs</dd>
            </div>
          </dl>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <strong>Operator credentials:</strong> every account is led by a senior strategist with hands-on experience inside regulated financial services — payments, lending, open banking, neobanking, regtech, or wealthtech. No junior handoffs. No generalists. Fully E-E-A-T aligned.
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            All content is produced under our published{" "}
            <Link href="/editorial-guidelines" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">
              editorial standards
            </Link>
            . Over 200 fintech campaigns delivered since founding. Read client case studies and operator bios on the{" "}
            <Link href="/about" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">
              About page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Compare nudge */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-semibold text-slate-900">Still evaluating your options?</p>
              <p className="text-sm text-muted-foreground mt-1">
                See how a retainer compares to building in-house, hiring freelancers, or running paid search instead.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link href="/compare/agency-vs-in-house">
                <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white whitespace-nowrap">
                  Agency vs in-house
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/compare/content-led-vs-paid">
                <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white whitespace-nowrap">
                  SEO vs paid search
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/compare/vs-freelancers">
                <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white whitespace-nowrap">
                  Agency vs freelancers
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Last updated + explore more — On-Page internal link equity + freshness signal */}
      <div className="container mx-auto px-4 max-w-5xl py-4 pb-8">
        <p className="text-center text-sm text-muted-foreground">
          Explore our{" "}
          <Link href="/services" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">fintech SEO services</Link>
          {" "}or browse the{" "}
          <Link href="/blog" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">fintech SEO blog</Link>
          {" "}for strategy guides. Questions?{" "}
          <Link href="/contact" className="text-[#0052FF] underline underline-offset-2 hover:text-[#0040cc]">Book a free strategy call</Link>.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          <time dateTime="2026-05-15">Last updated: May 2026</time>
        </p>
      </div>

      {/* FAQ */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="faq-heading text-3xl font-bold text-center mb-12">Fintech SEO Pricing — Frequently Asked Questions</h2>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={i}
                id={`faq-${i}`}
                value={`item-${i}`}
                className="border-b-0 group"
              >
                <AccordionTrigger
                  className="px-6 py-5 text-base md:text-lg font-semibold text-left text-slate-900 hover:text-[#0052FF] hover:no-underline transition-colors [&>svg]:hidden"
                >
                  <span className="flex-1 pr-4">{item.q}</span>
                  <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#0052FF]/10 text-[#0052FF] transition-transform duration-300 group-data-[state=open]:rotate-45">
                    <Plus className="w-5 h-5" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-0 text-muted-foreground text-base leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
