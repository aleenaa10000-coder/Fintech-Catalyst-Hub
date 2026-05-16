import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/metaData";

type LocationSummary = {
  id: number;
  slug: string;
  city: string;
  region: string | null;
  country: string;
  countryCode: string;
  headline: string;
};

async function fetchLocations(): Promise<LocationSummary[]> {
  const res = await fetch("/api/locations");
  if (!res.ok) throw new Error("Failed to fetch locations");
  return res.json() as Promise<LocationSummary[]>;
}

function LocationsHubSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-4">
          <Skeleton className="mx-auto h-5 w-24" />
          <Skeleton className="mx-auto h-12 w-2/3" />
          <Skeleton className="mx-auto h-5 w-1/2" />
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}

const HUB_FAQ = [
  {
    question: "Which countries does FintechPressHub serve?",
    answer: "FintechPressHub serves fintech companies across 17+ countries including the United Kingdom, United States, Singapore, Australia, Canada, Germany, France, UAE, India, Hong Kong, Switzerland, Netherlands, Sweden, Norway, Kenya, Israel, and Brazil. Each market has a dedicated location page with geo-targeted keyword strategies and regulatory-compliant content tailored to that region.",
  },
  {
    question: "Can FintechPressHub run SEO campaigns in multiple countries at once?",
    answer: "Yes. Many FintechPressHub clients operate in multiple markets simultaneously — for example, a UK-headquartered neobank expanding into the EU and Singapore. We design a unified international SEO strategy with market-specific keyword targeting, hreflang implementation, and in-market editorial placements so that each regional domain or subdirectory builds authority independently while supporting the global brand.",
  },
  {
    question: "How does local regulatory knowledge improve fintech SEO?",
    answer: "Financial services content is subject to 'Your Money or Your Life' (YMYL) quality guidelines from Google, which places extra weight on Expertise, Experience, Authoritativeness, and Trustworthiness (E-E-A-T). Writers who understand local regulations — FCA in the UK, MAS in Singapore, ASIC in Australia — produce content that passes both regulatory compliance review and Google's quality raters, resulting in significantly higher rankings for competitive financial keywords.",
  },
  {
    question: "What is the typical campaign timeline for a new market?",
    answer: "For a new market entry, FintechPressHub typically delivers an initial keyword strategy and content plan within two weeks of onboarding. The first content assets and link-building outreach launch in weeks three to four. Most clients see measurable ranking movement in their new target market within 60 to 90 days, with sustainable traffic compounding by month four or five depending on domain authority and keyword competitiveness.",
  },
  {
    question: "How do I know if FintechPressHub covers my city?",
    answer: "Browse the locations listed on this page to find your city. If your city is not yet listed, contact FintechPressHub directly — we regularly add new markets for clients with expansion goals. Every new market begins with a geo-specific keyword audit and competitive landscape review before any content is produced.",
  },
];

export default function LocationsHub() {
  const canonical = `${SITE_URL}/locations`;

  const { data: locations, isLoading } = useQuery<LocationSummary[]>({
    queryKey: ["locations-hub"],
    queryFn: fetchLocations,
  });

  if (isLoading) return <LocationsHubSkeleton />;

  const grouped = (locations ?? []).reduce<Record<string, LocationSummary[]>>(
    (acc, loc) => {
      const key = loc.country;
      acc[key] = acc[key] ?? [];
      acc[key]!.push(loc);
      return acc;
    },
    {},
  );
  const countries = Object.keys(grouped).sort();

  const itemList = (locations ?? []).map((loc) => ({
    name: loc.region ? `${loc.city}, ${loc.region}, ${loc.country}` : `${loc.city}, ${loc.country}`,
    url: `${SITE_URL}/locations/${loc.slug}`,
    description: loc.headline,
  }));

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech SEO by Location | FintechPressHub"
        description="Specialist fintech SEO, content marketing, and link-building services tailored to your city. Browse all locations we serve globally."
        canonical={canonical}
        hreflang={[
          { lang: "en", href: canonical },
          { lang: "en-US", href: canonical },
          { lang: "en-GB", href: canonical },
          { lang: "en-SG", href: canonical },
          { lang: "en-AU", href: canonical },
          { lang: "en-CA", href: canonical },
          { lang: "x-default", href: canonical },
        ]}
        webPage={{
          datePublished: "2025-01-01",
          dateModified: "2026-05-10",
          keywords: [
            "fintech SEO by location", "fintech SEO London", "fintech SEO New York",
            "fintech SEO Singapore", "fintech SEO Sydney", "fintech SEO Toronto",
            "fintech marketing agency by city", "international fintech SEO",
          ],
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          isAccessibleForFree: true,
          accessibilityHazard: "none",
          accessibilityFeature: ["readingOrder", "structuralNavigation", "alternativeText"],
          accessMode: ["textual", "visual"],
          license: `${SITE_URL}/terms`,
          usageInfo: `${SITE_URL}/terms`,
          copyrightNotice: "© 2021 FintechPressHub. All rights reserved.",
          publishingPrinciples: `${SITE_URL}/about#editorial-standards`,
          about: ["Fintech SEO", "International Fintech Marketing", "Local SEO for Financial Services"],
          audience: "Fintech companies, payments startups, neobanks, lenders, and digital finance brands seeking local SEO",
        }}
        faq={HUB_FAQ.map((f) => ({ question: f.question, answer: f.answer }))}
        itemList={itemList.length > 0 ? { name: "Fintech SEO Locations", items: itemList } : undefined}
      />

      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="container mx-auto px-4 max-w-5xl pt-4 pb-0">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li><ChevronRight className="w-3 h-3" /></li>
          <li aria-current="page" className="text-foreground font-medium">Locations</li>
        </ol>
      </nav>

      <PageHero
        eyebrow="Global Coverage"
        title="Fintech SEO by Location"
        description="Specialist fintech SEO and content marketing tailored to your local market — regulatory expertise, geo-targeted keywords, and in-market link building."
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {countries.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              Location pages coming soon.
            </p>
          ) : (
            countries.map((country) => (
              <div key={country} className="mb-12">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {country}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(grouped[country] ?? []).map((loc) => (
                    <Link key={loc.slug} href={`/locations/${loc.slug}`}>
                      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="pt-5 pb-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">
                                {loc.region
                                  ? `${loc.city}, ${loc.region}`
                                  : loc.city}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {loc.headline}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FAQ section — AEO: visible HTML + JSON-LD schema for AI extraction */}
      <section className="py-16 bg-secondary/20" aria-labelledby="hub-faq-heading">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 id="hub-faq-heading" className="text-2xl font-bold mb-8">
            Frequently asked questions — global fintech SEO coverage
          </h2>
          <div className="space-y-4">
            {HUB_FAQ.map((item) => (
              <details key={item.question} className="group border border-border rounded-lg">
                <summary className="faq-question flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 font-semibold text-sm hover:bg-secondary/40 rounded-lg transition-colors">
                  {item.question}
                  <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
