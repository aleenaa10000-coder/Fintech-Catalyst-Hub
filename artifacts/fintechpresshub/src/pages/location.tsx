import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Globe } from "lucide-react";
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
  body: string;
  publishedAt: string;
};

async function fetchLocation(slug: string): Promise<LocationPage> {
  const res = await fetch(`/api/locations/${slug}`);
  if (!res.ok) throw Object.assign(new Error("Not found"), { status: res.status });
  return res.json() as Promise<LocationPage>;
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

  if (isLoading) return <LocationSkeleton />;
  if ((error as Error & { status?: number })?.status === 404 || !location) return <NotFound />;

  const canonical = `${SITE_URL}/locations/${location.slug}`;
  const locationLabel = location.region
    ? `${location.city}, ${location.region}, ${location.country}`
    : `${location.city}, ${location.country}`;

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${canonical}#localbusiness`,
    name: `FintechPressHub — ${location.city} Fintech SEO`,
    description: location.headline,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      addressLocality: location.city,
      ...(location.region ? { addressRegion: location.region } : {}),
      addressCountry: location.countryCode,
    },
    sameAs: [
      "https://www.crunchbase.com/organization/fintechpresshub",
      "https://www.linkedin.com/company/fintechpresshub",
    ],
    areaServed: {
      "@type": "Place",
      name: location.country,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${location.headline} | FintechPressHub`}
        description={`FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`}
        canonical={canonical}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      <PageHero
        eyebrow={
          <span className="flex items-center justify-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {locationLabel}
          </span>
        }
        title={location.headline}
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
