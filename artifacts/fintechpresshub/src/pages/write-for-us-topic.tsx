import { useParams, Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import NotFound from "@/pages/not-found";
import { FaqSection } from "@/components/FaqSection";

type TopicPage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heroDescription: string;
  intro: string;
  whatWePublish: string[];
  guidelines: string[];
  faqItems: Array<{ question: string; answer: string }>;
  relatedTopics: string[];
};

const TOPICS: Record<string, TopicPage> = {
  "payments-infrastructure": {
    slug: "payments-infrastructure",
    title: "Write For Us: Payments Infrastructure",
    metaTitle: "Write For Us — Payments Infrastructure Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on payments infrastructure — card issuing, payment orchestration, cross-border rails, and acquiring. Editorial standards for fintech guest contributors.",
    eyebrow: "Guest Posts",
    heroDescription: "Contribute expert articles on card issuing, payment orchestration, cross-border payments, and acquiring for 50k+ fintech decision-makers.",
    intro: "FintechPressHub accepts expert guest contributions on all aspects of payments infrastructure — from card issuing and BIN sponsorship to payment orchestration, cross-border rail design, and acquiring. We publish for an audience of payments founders, CTOs, and growth leaders.",
    whatWePublish: [
      "Card issuing architecture, BIN sponsorship, and prepaid card programmes",
      "Payment orchestration: routing logic, fallback strategies, and multi-PSP setups",
      "Cross-border rails: SWIFT alternatives, local clearing, and FX execution",
      "Merchant acquiring: MDR, chargeback management, and scheme compliance",
      "Tokenisation, 3DS, and strong customer authentication (SCA) implementation",
      "ISO 20022 migration strategies and implications for payment systems",
    ],
    guidelines: [
      "Minimum 1,200 words with concrete technical or strategic depth",
      "Author must have demonstrable payments industry experience",
      "No promotional content — editorial perspectives only",
      "Cite sources for any statistics or regulatory claims",
      "Up to 2 dofollow backlinks to relevant, non-promotional content",
    ],
    faqItems: [
      {
        question: "What payments infrastructure topics does FintechPressHub accept?",
        answer: "We accept articles on card issuing, payment orchestration, cross-border rails, acquiring, ISO 20022, SCA, tokenisation, and merchant settlement. Articles must provide genuine technical or strategic insight — not product promotion.",
      },
      {
        question: "Do I need payments industry experience to pitch a guest post?",
        answer: "Yes. All payment infrastructure articles must be written by practitioners with verifiable experience in the payments space — whether that's working at a PSP, card network, issuer, or infrastructure vendor. We check LinkedIn and company credentials during review.",
      },
      {
        question: "Can I include a link to my company in a payments guest post?",
        answer: "You may include up to 2 dofollow links to non-promotional, editorially relevant pages. A company homepage link is permitted only if it adds genuine value for the reader. Product or pricing page links are not accepted.",
      },
    ],
    relatedTopics: ["embedded-finance", "open-banking", "regtech-compliance"],
  },
  "embedded-finance": {
    slug: "embedded-finance",
    title: "Write For Us: Embedded Finance",
    metaTitle: "Write For Us — Embedded Finance Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on embedded finance — BaaS, embedded lending, vertical SaaS payments. Expert contributor guidelines for fintech publications.",
    eyebrow: "Guest Posts",
    heroDescription: "Share your expertise on Banking-as-a-Service, embedded lending, and vertical SaaS payment integration with FintechPressHub's fintech audience.",
    intro: "FintechPressHub publishes in-depth guest articles on embedded finance, including BaaS architecture, embedded lending playbooks, and vertical SaaS payment integration. Our readers are product and growth leaders building or evaluating embedded financial services.",
    whatWePublish: [
      "BaaS architecture: ledger design, KYC orchestration, and sponsor bank relationships",
      "Embedded lending: underwriting integration, origination flows, and credit decisioning APIs",
      "Vertical SaaS payments: monetisation models, split payments, and marketplace payouts",
      "Embedded insurance: programme setup, claims flows, and regulatory structure",
      "Treasury and FX embedded within non-financial platforms",
      "Regulatory frameworks for embedded finance: EMI, BNPL, and lending licence requirements",
    ],
    guidelines: [
      "Minimum 1,200 words — we favour depth over breadth",
      "No product announcements or press release-style content",
      "Author must have practical BaaS, lending, or embedded finance experience",
      "All regulatory claims must be cited or attributed to a qualified source",
      "Up to 2 relevant dofollow backlinks accepted",
    ],
    faqItems: [
      {
        question: "What embedded finance topics does FintechPressHub publish?",
        answer: "We publish on BaaS, embedded lending, vertical SaaS payments, embedded insurance, embedded FX, and the regulatory frameworks that govern them. Articles should offer strategic or technical depth — not product marketing.",
      },
      {
        question: "How long should an embedded finance guest post be?",
        answer: "We expect a minimum of 1,200 words for all guest submissions. Most published pieces run 1,500–2,500 words with clear subheadings, practical examples, and cited sources where relevant.",
      },
    ],
    relatedTopics: ["payments-infrastructure", "open-banking", "fintech-seo-content"],
  },
  "open-banking": {
    slug: "open-banking",
    title: "Write For Us: Open Banking & PSD3",
    metaTitle: "Write For Us — Open Banking & PSD3 Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on open banking, PSD3, account-to-account payments, and data-sharing compliance for FintechPressHub's fintech audience.",
    eyebrow: "Guest Posts",
    heroDescription: "Contribute expert analysis on open banking, PSD3, account-to-account payments, and data-sharing regulation for fintech leaders.",
    intro: "FintechPressHub publishes expert guest articles on open banking and the PSD3/PSR regulatory transition — from A2A payment flows and VRP to data-sharing compliance and open finance. Our readers include product leaders, policy teams, and growth marketers at UK and EU fintech companies.",
    whatWePublish: [
      "Account-to-account (A2A) payment flows and merchant adoption strategies",
      "Variable recurring payments (VRPs) — implementation and business models",
      "PSD3 and PSR: what changes for TPPs, ASPSPs, and fintech platforms",
      "Open finance expansion: investment, insurance, and pension data portability",
      "Data-sharing frameworks: FAPI, eIDAS 2.0, and consent management",
      "Open banking business models: monetisation, aggregation, and embedded A2A",
    ],
    guidelines: [
      "Articles must be written by practitioners with open banking or regulatory experience",
      "Minimum 1,200 words with practical analysis, not just regulatory summary",
      "All regulatory references should be dated and cited",
      "No promotional content — product mentions should be incidental, not the focus",
      "Up to 2 relevant dofollow backlinks",
    ],
    faqItems: [
      {
        question: "Does FintechPressHub publish PSD3 and open banking opinion pieces?",
        answer: "Yes — we actively seek practitioner analysis of the PSD3/PSR transition, VRP adoption, and open finance expansion. Opinion pieces from TPPs, banks, and infrastructure providers are welcome if they are evidence-based and non-promotional.",
      },
    ],
    relatedTopics: ["payments-infrastructure", "embedded-finance", "regtech-compliance"],
  },
  "neobanking": {
    slug: "neobanking",
    title: "Write For Us: Neobanking & Digital Banks",
    metaTitle: "Write For Us — Neobanking Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on neobanking, challenger banks, digital bank economics, and regulatory sandboxing for FintechPressHub readers.",
    eyebrow: "Guest Posts",
    heroDescription: "Share your expertise on digital banking economics, neobank growth strategy, and challenger bank regulation with our fintech audience.",
    intro: "FintechPressHub accepts expert contributions on neobanking — covering activation and retention strategies, unit economics, regulatory sandboxing, and how challenger banks compete with incumbents. Ideal contributors are neobank operators, investors, or specialists with hands-on digital banking experience.",
    whatWePublish: [
      "Customer activation and retention: onboarding funnel optimisation and lifecycle marketing",
      "Fee economics: interchange-funded vs subscription neobank models",
      "Regulatory sandboxing and licensing: EMI vs bank charter paths",
      "Neobank B2B pivots: SME banking, business accounts, and treasury products",
      "International expansion strategy for digital banks",
      "AI in neobanking: fraud prevention, credit scoring, and personalisation",
    ],
    guidelines: [
      "Must include analysis beyond generic 'challenger bank' narratives",
      "Cite data where claims about market size or growth are made",
      "Minimum 1,200 words; case studies and worked examples are encouraged",
      "Author must have neobanking, challenger bank, or fintech investment experience",
    ],
    faqItems: [
      {
        question: "What neobanking topics are a good fit for FintechPressHub?",
        answer: "We look for practitioner perspectives on neobank growth mechanics, unit economics, regulatory paths (EMI vs bank licence), B2B pivots, and competitive strategy against incumbents. Generic overviews of 'what is a neobank?' are not a fit.",
      },
    ],
    relatedTopics: ["embedded-finance", "bnpl-consumer-lending", "regtech-compliance"],
  },
  "bnpl-consumer-lending": {
    slug: "bnpl-consumer-lending",
    title: "Write For Us: BNPL & Consumer Lending",
    metaTitle: "Write For Us — BNPL & Consumer Lending Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on BNPL, consumer credit, affordability checks, and lending regulation for FintechPressHub's fintech audience.",
    eyebrow: "Guest Posts",
    heroDescription: "Contribute expert analysis on buy-now-pay-later, consumer credit underwriting, and lending regulation for fintech decision-makers.",
    intro: "FintechPressHub publishes expert guest articles on BNPL, consumer lending, and the evolving regulatory landscape under Consumer Duty, the FCA BNPL consultation, and credit affordability reforms.",
    whatWePublish: [
      "BNPL underwriting models: risk scoring, soft credit checks, and merchant economics",
      "Consumer Duty compliance: fair value assessments and vulnerability frameworks",
      "Affordability check implementation and open banking credit assessments",
      "Merchant-side BNPL integration: conversion impact and fee structures",
      "BNPL regulation in the UK, EU, and US — comparison and implications",
      "Consumer lending technology: decisioning engines, origination APIs, and collections",
    ],
    guidelines: [
      "All regulatory claims must be cited to FCA, EBA, or CFPB publications",
      "No promotional content for specific BNPL or lending products",
      "Minimum 1,200 words; analysis of real-world data or case studies preferred",
      "Author must have lending, credit risk, or consumer finance regulatory experience",
    ],
    faqItems: [
      {
        question: "Does FintechPressHub accept BNPL regulation opinion pieces?",
        answer: "Yes — we welcome practitioner analysis of BNPL regulation developments, Consumer Duty implementation challenges, and affordability reform implications. Articles must be evidence-based and written by someone with credit or regulatory expertise.",
      },
    ],
    relatedTopics: ["neobanking", "regtech-compliance", "embedded-finance"],
  },
  "regtech-compliance": {
    slug: "regtech-compliance",
    title: "Write For Us: Regtech & Compliance",
    metaTitle: "Write For Us — Regtech & Compliance Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on regtech, AML compliance, KYC technology, sanctions screening, and regulatory reporting for FintechPressHub readers.",
    eyebrow: "Guest Posts",
    heroDescription: "Contribute expert articles on regulatory technology, AML, KYC, sanctions screening, and compliance automation for fintech leaders.",
    intro: "FintechPressHub publishes practitioner-written articles on regtech — transaction monitoring, KYC orchestration, sanctions screening, regulatory reporting automation, and the technology enabling compliance at scale.",
    whatWePublish: [
      "Transaction monitoring: alert tuning, typology coverage, and false positive reduction",
      "KYC orchestration: identity verification stacking, document checks, and ongoing monitoring",
      "Sanctions screening: list management, name-matching algorithms, and PEP checks",
      "Regulatory reporting: CCAR, MiFID II transaction reporting, and EMIR reconciliation",
      "Compliance automation: AI in AML, case management workflows, and audit trails",
      "Regtech vendor selection: RFP frameworks and evaluation criteria",
    ],
    guidelines: [
      "Author must have compliance, AML, or regtech industry experience",
      "Cite specific regulatory guidance (FCA, FinCEN, EBA) where relevant",
      "No vendor product comparisons without disclosure of conflicts of interest",
      "Minimum 1,200 words with practical insights beyond regulatory summaries",
    ],
    faqItems: [
      {
        question: "Can compliance officers contribute guest posts to FintechPressHub?",
        answer: "Yes — compliance practitioners, AML officers, and regtech consultants are among our most valued contributors. Articles drawing on real-world implementation experience are particularly welcome, provided they are anonymised where necessary.",
      },
    ],
    relatedTopics: ["payments-infrastructure", "neobanking", "open-banking"],
  },
  "fintech-seo-content": {
    slug: "fintech-seo-content",
    title: "Write For Us: Fintech SEO & Content Marketing",
    metaTitle: "Write For Us — Fintech SEO & Content Marketing Guest Posts | FintechPressHub",
    metaDescription: "Submit a guest post on fintech SEO, content marketing strategy, editorial workflows, and programmatic SEO for financial services brands.",
    eyebrow: "Guest Posts",
    heroDescription: "Share your expertise on fintech SEO, content strategy, E-E-A-T compliance, and editorial workflows for regulated financial brands.",
    intro: "FintechPressHub publishes expert guest articles on fintech SEO and content marketing — from topical authority strategy and E-E-A-T compliance to programmatic SEO, editorial workflow design, and link-building playbooks for YMYL financial services brands.",
    whatWePublish: [
      "Topical authority building for regulated financial services brands",
      "E-E-A-T optimisation for YMYL fintech content — authorship, citations, and trust signals",
      "Programmatic SEO for fintech: location pages, glossary expansion, and comparison content",
      "Editorial workflow design for compliance-sensitive fintech organisations",
      "Link-building playbooks for financial brands: outreach, digital PR, and authority acquisition",
      "AEO (Answer Engine Optimisation) for AI search in fintech",
    ],
    guidelines: [
      "Author must have demonstrable fintech SEO or content marketing experience",
      "Articles should include actionable tactics, not just strategy theory",
      "Cite data sources for any claims about search volumes, rankings, or traffic",
      "Minimum 1,500 words — our SEO audience expects depth",
      "No promotional content for specific SEO tools or agencies (other than FintechPressHub itself)",
    ],
    faqItems: [
      {
        question: "Can SEO agencies contribute guest posts to FintechPressHub?",
        answer: "Practitioners from SEO agencies with documented fintech client experience are welcome to pitch. However, articles must be educational and non-promotional — no case studies that primarily serve as thinly disguised advertisements for the contributing agency.",
      },
      {
        question: "What's the difference between a fintech SEO guest post and a sponsored post?",
        answer: "Guest posts are editorially reviewed, unpaid contributions where we accept up to 2 dofollow links. Sponsored posts are paid placements, clearly disclosed as sponsored, with different editorial standards. If you want to promote a specific product or service, the sponsored post route is more appropriate.",
      },
    ],
    relatedTopics: ["payments-infrastructure", "embedded-finance", "open-banking"],
  },
};

export default function WriteForUsTopic() {
  const params = useParams<{ topic: string }>();
  const topicSlug = params.topic ?? "";
  const data = TOPICS[topicSlug];

  if (!data) return <NotFound />;

  const canonical = `${SITE_URL}/write-for-us/${topicSlug}`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={data.metaTitle}
        description={data.metaDescription}
        canonical={canonical}
        hreflang={[
          { lang: "en", href: canonical },
          { lang: "en-US", href: canonical },
          { lang: "en-GB", href: canonical },
          { lang: "x-default", href: canonical },
        ]}
        webPage={{
          datePublished: "2025-01-01",
          dateModified: "2026-05-17",
          about: [data.title, "Fintech Guest Posts", "FintechPressHub"],
          isAccessibleForFree: true,
        }}
        faq={data.faqItems}
      />

      <nav className="container mx-auto px-4 py-3 max-w-4xl">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li>/</li>
          <li><Link href="/write-for-us" className="hover:text-foreground">Write For Us</Link></li>
          <li>/</li>
          <li className="text-foreground font-medium">{data.eyebrow}</li>
        </ol>
      </nav>

      <PageHero
        eyebrow={data.eyebrow}
        title={data.title}
        description={<p className="speakable-summary">{data.heroDescription}</p>}
      />

      <div className="container mx-auto px-4 max-w-3xl py-12 space-y-12">
        <section>
          <p className="text-slate-700 leading-relaxed">{data.intro}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0052FF]" />
            What We Publish
          </h2>
          <ul className="space-y-3">
            {data.whatWePublish.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0052FF] shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submission Guidelines</h2>
          <ul className="space-y-2">
            {data.guidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-[#0052FF] font-bold shrink-0">{i + 1}.</span>
                {g}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col sm:flex-row gap-4">
          <Link href="/write-for-us#pitch-form" className="flex-1">
            <Button className="w-full bg-[#0052FF] hover:bg-[#0040cc]">
              Submit Your Pitch
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/write-for-us" className="flex-1">
            <Button variant="outline" className="w-full">
              View All Topics
            </Button>
          </Link>
        </section>
      </div>

      {data.faqItems.length > 0 && (
        <FaqSection
          items={data.faqItems}
          heading={`${data.title} — Frequently Asked Questions`}
          valuePrefix={`wfu-topic-faq-${topicSlug}`}
          id={`wfu-topic-faq-${topicSlug}`}
        />
      )}

      {data.relatedTopics.length > 0 && (
        <section className="py-10 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Related Topic Areas</h2>
            <div className="flex flex-wrap gap-3">
              {data.relatedTopics.map((slug) => {
                const related = TOPICS[slug];
                if (!related) return null;
                return (
                  <Link key={slug} href={`/write-for-us/${slug}`}>
                    <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white">
                      {related.eyebrow}: {TOPICS[slug]?.title.replace("Write For Us: ", "")}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
