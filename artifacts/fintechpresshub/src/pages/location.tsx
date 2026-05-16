import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Globe, ChevronRight } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { Link } from "wouter";
import { SITE_URL } from "@/lib/metaData";
import NotFound from "@/pages/not-found";

type LocationPage = {
  id: number;
  slug: string;
  city: string;
  region: string | null;
  country: string;
  countryCode: string;
  headline: string;
  seoTitle: string | null;
  body: string;
  lat: number | null;
  lng: number | null;
  publishedAt: string;
  updatedAt: string;
};

const LOCATION_HREFLANG: Record<string, string> = {
  AE: "en-AE", AU: "en-AU", BR: "en-BR", CA: "en-CA", CH: "en-CH",
  DE: "en-DE", FR: "en-FR", GB: "en-GB", HK: "en-HK", IL: "en-IL",
  IN: "en-IN", KE: "en-KE", NL: "en-NL", NO: "en-NO", SE: "en-SE",
  SG: "en-SG", US: "en-US",
};

async function fetchLocation(slug: string): Promise<LocationPage> {
  const res = await fetch(`/api/locations/${slug}`);
  if (!res.ok) throw Object.assign(new Error("Not found"), { status: res.status });
  return res.json() as Promise<LocationPage>;
}

async function fetchAllLocations(): Promise<Array<{ slug: string; city: string; region: string | null; country: string }>> {
  const res = await fetch("/api/locations");
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ slug: string; city: string; region: string | null; country: string }>>;
}

function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-4">
          <Skeleton className="mx-auto h-6 w-28" />
          <Skeleton className="mx-auto h-10 w-2/3" />
          <Skeleton className="mx-auto h-5 w-1/2" />
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </section>
    </div>
  );
}

export default function LocationPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: location, isLoading, error } = useQuery<LocationPage>({
    queryKey: ["location", slug],
    queryFn: () => fetchLocation(slug ?? ""),
    enabled: !!slug,
    retry: false,
  });

  const { data: allLocations } = useQuery<Array<{ slug: string; city: string; region: string | null; country: string }>>({
    queryKey: ["locations-hub"],
    queryFn: fetchAllLocations,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <LocationSkeleton />;
  if ((error as Error & { status?: number })?.status === 404 || !location) return <NotFound />;

  const canonical = `${SITE_URL}/locations/${location.slug}`;
  const locationLabel = location.region
    ? `${location.city}, ${location.region}, ${location.country}`
    : `${location.city}, ${location.country}`;

  const pageTitle = `${location.seoTitle ?? location.headline} | FintechPressHub`;
  const pageDescription = `FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`;
  const marketHreflang = LOCATION_HREFLANG[location.countryCode];
  const pageKeywords = [
    `fintech SEO ${location.city}`,
    `fintech content marketing ${location.city}`,
    `fintech link building ${location.country}`,
    `fintech SEO agency ${location.city}`,
    `${location.city} fintech marketing`,
    `fintech SEO ${location.country}`,
  ];

  const otherLocations = (allLocations ?? [])
    .filter((l) => l.slug !== location.slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  const faqItems = [
    {
      question: `Does FintechPressHub offer fintech SEO services in ${location.city}?`,
      answer: `Yes. FintechPressHub provides specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Our team combines local regulatory awareness with deep fintech expertise to build sustained search visibility in your market. We have worked with fintech brands at every stage — from pre-seed startups to Series C companies — across the ${location.country} market.`,
    },
    {
      question: `What fintech SEO services are available in ${location.country}?`,
      answer: `In ${location.country} we offer geo-targeted keyword research, regulatory-compliant content writing, high-authority link placements in ${location.country}-relevant fintech publications, and a full-funnel content strategy designed for the local fintech buyer journey. We also deliver technical SEO audits aligned with Core Web Vitals standards and structured data implementation — every deliverable tailored to the search behaviour of ${location.country}-based financial services buyers.`,
    },
    {
      question: `How do I get started with fintech SEO in ${location.city}?`,
      answer: `Book a free 30-minute strategy call via the FintechPressHub contact page. We will audit your current search footprint in ${location.city}, benchmark you against your top competitors in ${location.country}, and identify your fastest path to organic growth. Most clients see measurable keyword movement within 60 days and compounding traffic growth by month four.`,
    },
    {
      question: `How does FintechPressHub handle regulatory compliance for ${location.country} fintech content?`,
      answer: `All content produced for ${location.country} fintech companies goes through an editorial review aligned with the applicable regulatory framework — including financial promotion rules, data privacy requirements, and any sector-specific guidance relevant to your product. Our editors have specialist knowledge of the ${location.country} regulatory environment and write content that satisfies both search intent and compliance requirements.`,
    },
    {
      question: `How long does it take to see results from fintech SEO in ${location.city}?`,
      answer: `Most FintechPressHub clients in ${location.city} see their first measurable ranking improvements within 60 to 90 days of campaign launch. Organic traffic typically begins compounding by month four, and significant revenue-attributable traffic is usually visible by month six. The timeline depends on the competitiveness of your target keywords, the current authority of your domain, and the volume of content we produce — all scoped during the initial strategy call.`,
    },
    {
      question: `What link-building publications does FintechPressHub use in ${location.country}?`,
      answer: `Our link-building programme for ${location.country} targets editorial placements in the leading fintech and financial services publications relevant to your market, as well as global tier-1 publications including Finextra, The Paypers, AltFi, and FinanceFeeds. We focus exclusively on earned editorial coverage — never paid-link schemes — ensuring every backlink delivers genuine domain authority uplift with zero penalty risk.`,
    },
    {
      question: `Does FintechPressHub work with both B2B and B2C fintech companies in ${location.city}?`,
      answer: `Yes. FintechPressHub works with both B2B fintech companies (payments infrastructure, embedded finance, RegTech, lending APIs, open banking platforms) and B2C fintech brands (neobanks, digital wallets, retail investing, BNPL, insurance tech) operating in ${location.city} and ${location.country}. The keyword strategy, content format, and link targets differ significantly between B2B and B2C — our team builds a bespoke approach for each client's buyer journey.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        canonical={canonical}
        hreflang={[
          { lang: "en", href: canonical },
          ...(marketHreflang ? [{ lang: marketHreflang, href: canonical }] : []),
          { lang: "x-default", href: canonical },
        ]}
        webPage={{
          datePublished: location.publishedAt.slice(0, 10),
          dateModified: location.updatedAt.slice(0, 10),
          keywords: pageKeywords,
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          isAccessibleForFree: true,
          accessibilityHazard: "none",
          accessibilityFeature: ["readingOrder", "structuralNavigation", "alternativeText"],
          accessMode: ["textual", "visual"],
          license: `${SITE_URL}/terms`,
          usageInfo: `${SITE_URL}/terms`,
          copyrightNotice: "© 2021 FintechPressHub. All rights reserved.",
          publishingPrinciples: `${SITE_URL}/about#editorial-standards`,
          about: ["Fintech SEO", `Fintech Marketing ${location.city}`, location.country],
          audience: "Fintech companies, payments startups, neobanks, lenders, and digital finance brands",
        }}
        localBusiness={{
          name: `FintechPressHub — ${location.city} Fintech SEO`,
          description: location.headline,
          addressLocality: location.city,
          addressRegion: location.region ?? undefined,
          addressCountry: location.countryCode,
          areaServedName: location.country,
          priceRange: "$$$$",
          ...(location.lat != null && location.lng != null
            ? { geo: { latitude: location.lat, longitude: location.lng } }
            : {}),
          sameAs: [
            "https://www.crunchbase.com/organization/fintechpresshub",
            "https://www.linkedin.com/company/fintechpresshub",
            "https://twitter.com/fintechpresshub",
            "https://clutch.co/profile/fintechpresshub",
            "https://www.g2.com/sellers/fintechpresshub",
          ],
        }}
        faq={faqItems.map((f) => ({ question: f.question, answer: f.answer }))}
      />

      {/* Breadcrumb navigation — rendered in HTML for crawlers and users */}
      <nav aria-label="Breadcrumb" className="container mx-auto px-4 max-w-4xl pt-4 pb-0">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3 h-3" /></li>
          <li><Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link></li>
          <li><ChevronRight className="w-3 h-3" /></li>
          <li aria-current="page" className="text-foreground font-medium">{location.city}</li>
        </ol>
      </nav>

      {/* Answer-first speakable-summary paragraph — SR-only for visual hygiene;
          targeted by SpeakableSpecification and AI citation engine extractors */}
      <p className="speakable-summary sr-only">
        FintechPressHub is a specialist fintech SEO agency serving companies in {locationLabel}.
        We provide regulatory-aware content marketing, geo-targeted keyword research,
        high-authority link building, and technical SEO — helping fintech brands in{" "}
        {location.country} build compounding organic search traffic and reduce their cost-per-acquisition over time.
      </p>

      <PageHero
        eyebrow={locationLabel}
        title={location.seoTitle ?? location.headline}
        description={`Specialist fintech SEO and content marketing tailored for companies operating in ${location.city}.`}
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: location.body }}
          />
        </div>
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Why FintechPressHub for {location.city}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Globe className="w-6 h-6 text-primary" />,
                title: "Local regulatory expertise",
                body: `We understand the compliance landscape specific to ${location.country} and write content that resonates with regulators and decision-makers in ${location.city}.`,
              },
              {
                icon: <MapPin className="w-6 h-6 text-primary" />,
                title: "Geo-targeted keyword strategy",
                body: `Our keyword research targets the exact queries that ${location.city}-based fintech buyers use when evaluating vendors and services.`,
              },
              {
                icon: <ArrowRight className="w-6 h-6 text-primary" />,
                title: "Local PR and link building",
                body: `We have relationships with fintech media in ${location.country} and can earn editorial coverage that lifts your domain authority in this market.`,
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6">
                  <div className="mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Visible FAQ section — AEO: rendered in HTML for AI extraction AND in JSON-LD */}
      <FaqSection
        items={faqItems}
        heading={`Frequently asked questions — fintech SEO in ${location.city}`}
        valuePrefix="location-faq"
      />

      {otherLocations.length > 0 && (
        <section className="py-12 bg-secondary/20" aria-labelledby="other-markets-heading">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 id="other-markets-heading" className="text-xl font-bold mb-6">
              Other markets we serve
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {otherLocations.map((loc) => (
                <Link key={loc.slug} href={`/locations/${loc.slug}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="pt-4 pb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {loc.region ? `${loc.city}, ${loc.region}` : loc.city}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <Link href="/locations" className="text-primary hover:underline">
                View all locations →
              </Link>
            </p>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to dominate search in {location.city}?
          </h2>
          <p className="text-muted-foreground mb-8">
            Book a free 30-minute strategy call. We'll audit your current search footprint in{" "}
            {locationLabel} and identify your fastest path to organic growth.
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
