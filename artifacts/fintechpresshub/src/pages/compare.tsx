import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Check, X, ArrowRight, Minus } from "lucide-react";
import { SITE_URL } from "@/lib/metaData";

type Verdict = "yes" | "no" | "partial";

type ComparisonRow = {
  criterion: string;
  description: string;
  fph: Verdict;
  genericAgency: Verdict;
  inHouse: Verdict;
};

const rows: ComparisonRow[] = [
  {
    criterion: "Fintech-only content writers",
    description: "Every writer has a background in payments, banking, or financial regulation.",
    fph: "yes",
    genericAgency: "no",
    inHouse: "partial",
  },
  {
    criterion: "Regulatory compliance knowledge",
    description: "Content is reviewed for accuracy against FCA, EBA, CFPB, MAS, and other frameworks.",
    fph: "yes",
    genericAgency: "no",
    inHouse: "partial",
  },
  {
    criterion: "Technical SEO included",
    description: "Schema markup, Core Web Vitals, crawlability, and IndexNow pings all included in scope.",
    fph: "yes",
    genericAgency: "partial",
    inHouse: "no",
  },
  {
    criterion: "Fintech-niche link building",
    description: "Outreach to Finextra, The Paypers, Fintech Futures, and other DR 50+ fintech publications.",
    fph: "yes",
    genericAgency: "no",
    inHouse: "no",
  },
  {
    criterion: "Author E-E-A-T profiles",
    description: "Named expert authors with Person schema, LinkedIn sameAs, and rel=author signals.",
    fph: "yes",
    genericAgency: "partial",
    inHouse: "partial",
  },
  {
    criterion: "AI Overview / AEO optimisation",
    description: "BLUF summaries, FAQ schema, QAPage, and SpeakableSpecification for AI-cited results.",
    fph: "yes",
    genericAgency: "no",
    inHouse: "no",
  },
  {
    criterion: "Dedicated account strategist",
    description: "A senior strategist owns your engagement — no junior handoffs after month one.",
    fph: "yes",
    genericAgency: "partial",
    inHouse: "yes",
  },
  {
    criterion: "Transparent monthly reporting",
    description: "GSC, GA4, and Ahrefs dashboards shared with keyword-level attribution.",
    fph: "yes",
    genericAgency: "partial",
    inHouse: "partial",
  },
  {
    criterion: "Starts under $10k/month",
    description: "Retainer-based pricing that scales with your growth stage.",
    fph: "yes",
    genericAgency: "no",
    inHouse: "partial",
  },
  {
    criterion: "Results within 90 days",
    description: "Keyword rank movement, organic sessions, and referring domain gains visible within one quarter.",
    fph: "yes",
    genericAgency: "partial",
    inHouse: "no",
  },
];

function VerdictIcon({ v }: { v: Verdict }) {
  if (v === "yes") return <Check className="w-5 h-5 text-emerald-600 mx-auto" aria-label="Yes" />;
  if (v === "no") return <X className="w-5 h-5 text-red-500 mx-auto" aria-label="No" />;
  return <Minus className="w-5 h-5 text-amber-500 mx-auto" aria-label="Partial" />;
}

const faqItems = [
  {
    question: "How does FintechPressHub differ from a general digital marketing agency?",
    answer:
      "We work exclusively with fintech companies. Our writers, link builders, and strategists all have fintech domain knowledge — meaning every piece of content is fact-checked against actual regulatory frameworks, not approximated from generic sources. General agencies can replicate our workflows but not our domain expertise.",
  },
  {
    question: "Why not build an in-house SEO team instead?",
    answer:
      "A competent in-house team covering content, technical SEO, and link building requires at least 3 FTEs and $300k+ in annual salary. Most growth-stage fintechs cannot justify that headcount before Series B. We provide the full capability at a fraction of that cost, and you retain the option to build in-house once the channel is proven.",
  },
  {
    question: "Can I use FintechPressHub alongside my existing agency?",
    answer:
      "Yes. About 40% of our clients bring us in as a specialist fintech layer alongside a broader performance marketing agency. We define clear swim-lanes upfront — typically organic content and link building — and share data through joint GSC and GA4 access.",
  },
  {
    question: "What is the minimum engagement?",
    answer:
      "Our minimum is the one-time SEO audit (30-day delivery). Ongoing retainers start at the equivalent of a mid-level content manager's salary and cover strategy, content, and link building in one package.",
  },
];

export default function Compare() {
  const canonical = `${SITE_URL}/compare`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="FintechPressHub vs Generic SEO Agency vs In-House | FintechPressHub"
        description="Compare FintechPressHub with a generic SEO agency and an in-house team across 10 criteria. See why fintech-specialist SEO consistently outperforms generalist alternatives."
        canonical={canonical}
        faq={faqItems}
      />

      <PageHero
        eyebrow="Side-by-side comparison"
        title={<>FintechPressHub vs the alternatives</>}
        description="See exactly how a fintech-specialist SEO agency stacks up against a generic agency and an in-house team across the criteria that matter most for regulated financial companies."
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
                    FintechPressHub
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                    Generic agency
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-600 w-[16.66%]">
                    In-house team
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.criterion} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{row.criterion}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <VerdictIcon v={row.fph} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <VerdictIcon v={row.genericAgency} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <VerdictIcon v={row.inHouse} />
                    </td>
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
            {[
              {
                label: "FintechPressHub",
                score: "10 / 10",
                color: "border-[#0052FF] bg-[#0052FF]/5",
                scoreColor: "text-[#0052FF]",
                summary:
                  "The only option that combines fintech domain expertise, full-service SEO execution, and transparent results from day one.",
                cta: true,
              },
              {
                label: "Generic SEO agency",
                score: "5 / 10",
                color: "border-slate-200",
                scoreColor: "text-slate-500",
                summary:
                  "Covers technical SEO and basic content but lacks fintech regulatory knowledge and the niche link-building relationships that move the needle.",
                cta: false,
              },
              {
                label: "In-house team",
                score: "6 / 10",
                color: "border-slate-200",
                scoreColor: "text-slate-500",
                summary:
                  "Best long-term option for scale, but expensive to build and slow to ramp. Lacks fintech-specific link-building and AEO expertise in early stages.",
                cta: false,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border-2 ${item.color} bg-white p-6 flex flex-col gap-3`}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <div className={`text-3xl font-bold mt-1 ${item.scoreColor}`}>
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

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <div key={faq.question} className="rounded-lg border p-5">
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
            Ready to switch?
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            Start with a free SEO audit
          </h2>
          <p className="text-muted-foreground mb-8">
            We'll review your current organic footprint, benchmark you against 3 competitors, and show you exactly what a fintech-specialist approach would change. No commitment required.
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
