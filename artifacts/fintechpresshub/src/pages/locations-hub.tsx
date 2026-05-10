import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech SEO by Location | FintechPressHub"
        description="Specialist fintech SEO, content marketing, and link-building services tailored to your city. Browse all locations we serve globally."
        canonical={canonical}
        webPage={{ dateModified: "2026-05-10" }}
      />

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
    </div>
  );
}
