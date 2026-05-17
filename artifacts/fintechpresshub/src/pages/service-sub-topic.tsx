import { useParams, Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import NotFound from "@/pages/not-found";

type SubTopic = {
  slug: string;
  title: string;
  description: string;
  metaDescription: string;
  qualifier: string;
  points: string[];
  relatedSlugs: string[];
};

const SUB_TOPICS: Record<string, Record<string, SubTopic>> = {
  "off-page-seo": {
    "for-payments-fintechs": {
      slug: "for-payments-fintechs",
      title: "Off-Page SEO for Payments Fintechs",
      qualifier: "Payments Fintechs",
      description: "Specialist off-page SEO and editorial link building for payment orchestrators, card issuers, and cross-border rail operators.",
      metaDescription: "Off-page SEO services for payments fintechs — DR 60+ editorial backlinks, E-E-A-T authority building, and YMYL-compliant link acquisition for payment companies.",
      points: [
        "DR 60+ editorial placements in payments and financial media",
        "Compliance-reviewed anchor text strategy for regulated entities",
        "Coverage in Finextra, Payments Journal, and banking technology press",
        "Cross-border payment keyword authority clusters",
        "Dofollow links — no PBNs, no sponsored post farms",
      ],
      relatedSlugs: ["for-embedded-finance", "for-neobanks"],
    },
    "for-embedded-finance": {
      slug: "for-embedded-finance",
      title: "Off-Page SEO for Embedded Finance Companies",
      qualifier: "Embedded Finance",
      description: "Editorial link building and authority signals for BaaS providers, embedded lending platforms, and vertical SaaS payment companies.",
      metaDescription: "Off-page SEO for embedded finance — build topical authority with editorial backlinks from fintech publications covering BaaS, embedded lending, and vertical SaaS.",
      points: [
        "Authority links from BaaS and fintech infrastructure media",
        "Brand mentions from open banking and embedded finance analysts",
        "E-E-A-T aligned content for YMYL embedded-finance topics",
        "Anchor strategy covering 'embedded finance', 'BaaS', and 'lending-as-a-service'",
        "Link velocity aligned with compliance and legal review cycles",
      ],
      relatedSlugs: ["for-payments-fintechs", "for-neobanks"],
    },
    "for-neobanks": {
      slug: "for-neobanks",
      title: "Off-Page SEO for Neobanks & Digital Banks",
      qualifier: "Neobanks",
      description: "High-authority backlink acquisition for neobanks and digital banking brands competing against incumbent banks in organic search.",
      metaDescription: "Off-page SEO for neobanks — editorial backlinks, E-E-A-T signals, and authority building for digital banking brands targeting retail and SME banking queries.",
      points: [
        "Media coverage in banking technology and consumer finance press",
        "Competitor backlink gap analysis against incumbent banks",
        "FCA and PRA-compliant messaging in all link placements",
        "Brand authority signals for neobanking and challenger bank terms",
        "Long-term evergreen placements — permanent dofollow links only",
      ],
      relatedSlugs: ["for-payments-fintechs", "for-embedded-finance"],
    },
    "for-regtech": {
      slug: "for-regtech",
      title: "Off-Page SEO for Regtech Companies",
      qualifier: "Regtech",
      description: "Link building and authority signals for regulatory technology providers covering AML, KYC, sanctions screening, and compliance reporting.",
      metaDescription: "Off-page SEO for regtech — editorial links from compliance, legal, and financial services publications for AML, KYC, and regulatory technology brands.",
      points: [
        "Placements in compliance, legal, and risk management media",
        "Authority anchors for AML, KYC, sanctions, and regtech terms",
        "FCA, EBA, and FinCEN-aware content for YMYL compliance pages",
        "Links from industry associations and regulatory commentary sites",
        "Brand signals for transaction monitoring and fraud detection verticals",
      ],
      relatedSlugs: ["for-payments-fintechs", "for-neobanks"],
    },
  },
  "content-marketing": {
    "for-wealthtech": {
      slug: "for-wealthtech",
      title: "Content Marketing for Wealthtech & Robo-Advisors",
      qualifier: "Wealthtech",
      description: "Topical authority content for wealthtech platforms, robo-advisors, and advisor SaaS companies competing in personal finance search.",
      metaDescription: "Content marketing for wealthtech — long-form SEO articles, portfolio content clusters, and E-E-A-T compliant writing for wealth management technology brands.",
      points: [
        "Long-form guides on portfolio construction, ISA investing, and SIPPs",
        "Regulatory-reviewed content aligned with FCA financial promotion rules",
        "Topical clusters covering robo-advisory, wealth platforms, and advisor tools",
        "YMYL-compliant writing by experienced fintech editors",
        "Internal linking strategy to compound topical authority over time",
      ],
      relatedSlugs: ["for-consumer-lending", "for-insurtech"],
    },
    "for-consumer-lending": {
      slug: "for-consumer-lending",
      title: "Content Marketing for Consumer Lending & BNPL",
      qualifier: "Consumer Lending",
      description: "High-authority blog content and topical clusters for BNPL platforms, consumer lenders, and credit providers targeting regulated finance queries.",
      metaDescription: "Content marketing for consumer lending — E-E-A-T blog content, BNPL guides, and affordability-check articles for regulated consumer credit brands.",
      points: [
        "BNPL explainers and comparison guides for B2C and B2B audiences",
        "Affordability, Consumer Duty, and credit-scoring content clusters",
        "FCA-compliant copy reviewed before every publish",
        "Long-tail keyword strategy around personal loan and BNPL terms",
        "Author bios with verified financial experience for E-E-A-T compliance",
      ],
      relatedSlugs: ["for-wealthtech", "for-insurtech"],
    },
    "for-insurtech": {
      slug: "for-insurtech",
      title: "Content Marketing for Insurtech Companies",
      qualifier: "Insurtech",
      description: "Expert-led SEO content for insurtech platforms covering embedded insurance, underwriting AI, and claims automation.",
      metaDescription: "Content marketing for insurtech — SEO articles, embedded insurance guides, and E-E-A-T content for insurance technology brands.",
      points: [
        "Long-form guides on embedded insurance, parametric products, and UBI",
        "FCA-compliant and PRA-aware content for regulated insurance topics",
        "Comparison and explainer content targeting insurance technology queries",
        "Topical clusters covering underwriting AI, claims automation, and IoT",
        "YMYL-compliant editorial process with compliance review gates",
      ],
      relatedSlugs: ["for-wealthtech", "for-consumer-lending"],
    },
  },
  "technical-seo": {
    "for-fintech-saas": {
      slug: "for-fintech-saas",
      title: "Technical SEO for Fintech SaaS Platforms",
      qualifier: "Fintech SaaS",
      description: "Technical SEO audits, Core Web Vitals remediation, and structured data implementation for fintech SaaS platforms and API-first products.",
      metaDescription: "Technical SEO for fintech SaaS — Core Web Vitals, structured data, crawl budget, and on-page optimisation for B2B fintech software products.",
      points: [
        "Core Web Vitals audit and LCP/CLS remediation",
        "Structured data: SoftwareApplication, FAQPage, HowTo schema",
        "Crawl budget analysis for large fintech SaaS platforms",
        "JavaScript rendering audit for React and Next.js fintech apps",
        "HTTPS, HSTS, and security header configuration for YMYL trust signals",
      ],
      relatedSlugs: ["for-b2b-payments", "for-open-banking"],
    },
    "for-b2b-payments": {
      slug: "for-b2b-payments",
      title: "Technical SEO for B2B Payment Platforms",
      qualifier: "B2B Payments",
      description: "Technical SEO for B2B payment orchestration, AP/AR platforms, and cross-border payment infrastructure products.",
      metaDescription: "Technical SEO for B2B payment platforms — crawl optimisation, schema markup, and Core Web Vitals for payment orchestrators and treasury tools.",
      points: [
        "Payment schema markup: PaymentCard, FinancialProduct, Organization",
        "Multilingual hreflang strategy for cross-border payment brands",
        "Core Web Vitals for payment checkout and dashboard pages",
        "Faceted navigation SEO for large payment product catalogues",
        "Redirect and canonical management across payment gateway domains",
      ],
      relatedSlugs: ["for-fintech-saas", "for-open-banking"],
    },
    "for-open-banking": {
      slug: "for-open-banking",
      title: "Technical SEO for Open Banking Providers",
      qualifier: "Open Banking",
      description: "Technical SEO for PSD2/PSD3 API providers, account aggregators, and open finance platforms targeting regulated financial data queries.",
      metaDescription: "Technical SEO for open banking — schema markup, structured data, and on-page optimisation for PSD2 API providers and account aggregation platforms.",
      points: [
        "FinancialProduct and FinancialService schema for open banking APIs",
        "AIS and PIS journey page optimisation for Google E-E-A-T signals",
        "Hreflang strategy across EU/UK/APAC open banking regulatory environments",
        "Security header and HSTS configuration for regulated data platforms",
        "International SEO for global open finance and account aggregation brands",
      ],
      relatedSlugs: ["for-fintech-saas", "for-b2b-payments"],
    },
  },
};

function getSubTopicData(serviceSlug: string, subTopicSlug: string): SubTopic | null {
  return SUB_TOPICS[serviceSlug]?.[subTopicSlug] ?? null;
}

function getServiceLabel(slug: string): string {
  const labels: Record<string, string> = {
    "off-page-seo": "Off-Page SEO",
    "content-marketing": "Content Marketing",
    "technical-seo": "Technical SEO",
  };
  return labels[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ServiceSubTopic() {
  const params = useParams<{ slug: string; subTopic: string }>();
  const serviceSlug = params.slug ?? "";
  const subTopicSlug = params.subTopic ?? "";
  const data = getSubTopicData(serviceSlug, subTopicSlug);

  if (!data) return <NotFound />;

  const serviceLabel = getServiceLabel(serviceSlug);
  const canonical = `${SITE_URL}/services/${serviceSlug}/${subTopicSlug}`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${data.title} | FintechPressHub`}
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
          about: [data.title, serviceLabel, "Fintech SEO", "FintechPressHub"],
          keywords: [data.title, serviceLabel, `${data.qualifier} SEO`, "fintech digital marketing"],
          audience: `Fintech ${data.qualifier} marketing and growth teams`,
          isAccessibleForFree: true,
        }}
      />

      <nav className="container mx-auto px-4 py-3 max-w-5xl">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li>/</li>
          <li><Link href="/services" className="hover:text-foreground">Services</Link></li>
          <li>/</li>
          <li><Link href={`/services/${serviceSlug}`} className="hover:text-foreground">{serviceLabel}</Link></li>
          <li>/</li>
          <li className="text-foreground font-medium">{data.qualifier}</li>
        </ol>
      </nav>

      <PageHero
        eyebrow={serviceLabel}
        title={data.title}
        description={<p className="speakable-summary">{data.description}</p>}
      />

      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            What's Included for {data.qualifier}
          </h2>
          <ul className="space-y-4">
            {data.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0052FF] shrink-0 mt-0.5" />
                <span className="text-slate-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            Ready to grow organic traffic for your {data.qualifier} brand?
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Get a complimentary SEO audit and content gap analysis — no commitment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button className="bg-[#0052FF] hover:bg-[#0040cc] w-full sm:w-auto">
                Book a free strategy call
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href={`/services/${serviceSlug}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                Back to {serviceLabel}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {data.relatedSlugs.length > 0 && (
        <section className="py-10 bg-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Related {serviceLabel} Specialisms</h2>
            <div className="flex flex-wrap gap-3">
              {data.relatedSlugs.map((related) => {
                const relatedData = getSubTopicData(serviceSlug, related);
                if (!relatedData) return null;
                return (
                  <Link key={related} href={`/services/${serviceSlug}/${related}`}>
                    <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white">
                      {relatedData.qualifier}
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
