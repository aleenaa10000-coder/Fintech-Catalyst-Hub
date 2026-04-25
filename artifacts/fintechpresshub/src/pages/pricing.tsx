import { PageMeta } from "@/components/PageMeta";
import { useListPricingPlans } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus } from "lucide-react";
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
    a: "Yes. We work exclusively with fintech, payments, lending, wealth, banking infrastructure, and crypto-adjacent companies. That focus is what lets our writers and link builders deliver work that meets compliance, accuracy, and E-E-A-T standards Google rewards in YMYL verticals.",
  },
  {
    q: "What is included in a content piece?",
    a: "Every article includes topic research, SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, internal linking, on-page optimization, and unlimited revisions before publish. We also handle CMS upload if requested.",
  },
];

export default function Pricing() {
  const { data: plans, isLoading } = useListPricingPlans();

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="pricing"
        faq={faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />
      <PageHero
        eyebrow="Pricing"
        title={<>Invest in Sustainable Growth</>}
        description="Transparent, retainer-based pricing with clear deliverables. Scale your organic acquisition pipeline with predictable costs and senior fintech operators on every account."
      />

      <section className="pt-12 pb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-[500px]">
                  <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full" /></CardHeader>
                  <CardContent><Skeleton className="h-16 w-1/3 mb-8" /><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
              ))
            ) : plans?.map((plan, i) => (
              <motion.div
                key={plan.id}
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
                      {plan.features.map((feature, i) => (
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
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={i}
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
