import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
];

export default function Compare() {
  const canonical = `${SITE_URL}/compare`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech SEO Comparisons | FintechPressHub"
        description="Compare FintechPressHub with agencies, freelancers, SEO tools, PR firms, and paid search. Honest, criterion-by-criterion comparisons to help fintech buyers choose the right SEO approach."
        canonical={canonical}
        faq={faqItems}
        itemList={{
          name: "Fintech SEO Comparisons",
          description: "Honest, criterion-by-criterion comparisons to help fintech buyers choose the right growth channel.",
          items: COMPARISONS.map((c) => ({
            name: c.title.split("|")[0].trim(),
            url: `${SITE_URL}/compare/${c.slug}`,
            description: c.description,
          })),
        }}
      />

      <PageHero
        eyebrow="Honest comparisons"
        title={<>How does fintech SEO stack up?</>}
        description="We publish honest, criterion-by-criterion comparisons between FintechPressHub and the most common alternatives — so you can make an informed decision, not one based on marketing copy."
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMPARISONS.map((comparison) => (
              <Link key={comparison.slug} href={`/compare/${comparison.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-[#0052FF] hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col">
                  <Badge
                    variant="outline"
                    className="self-start mb-3 text-xs font-medium text-[#0052FF] border-[#0052FF]/30 bg-[#0052FF]/5"
                  >
                    {comparison.eyebrow}
                  </Badge>
                  <h2 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-[#0052FF] transition-colors leading-snug">
                    {comparison.heroTitle}
                  </h2>
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
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <div key={faq.question} className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
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
