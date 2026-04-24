import { useDocumentTitle } from "@/hooks/use-document-title";
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
];

export default function Pricing() {
  useDocumentTitle("Pricing | FintechPressHub", "Transparent pricing for fintech SEO and content marketing.");
  const { data: plans, isLoading } = useListPricingPlans();

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="Pricing"
        title={<>Invest in Sustainable Growth</>}
        description="Transparent, retainer-based pricing with clear deliverables. Scale your organic acquisition pipeline with predictable costs and senior fintech operators on every account."
        showScrollIndicator
      />

      <section className="py-24">
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
                  className={`w-full flex flex-col relative border-t-4 border-t-blue-600 ${
                    plan.highlighted
                      ? 'border-primary shadow-[0_0_20px_rgba(0,82,255,0.1)] scale-105 z-10'
                      : 'border-border'
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
