import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useListServices } from "@workspace/api-client-react";

import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import {
  getServiceIcon,
  serviceShortLabelBySlug,
} from "@/lib/serviceIcons";

export default function ServiceDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: services, isLoading } = useListServices();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-20">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Skeleton className="mx-auto mb-4 h-6 w-32" />
            <Skeleton className="mx-auto mb-6 h-10 w-2/3" />
            <Skeleton className="mx-auto h-16 w-full" />
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </section>
      </div>
    );
  }

  const service = services?.find((s) => s.slug === slug);
  if (!service) return <NotFound />;

  const Icon = getServiceIcon(service.slug);
  const shortLabel = serviceShortLabelBySlug[service.slug] ?? service.name;
  const otherServices = (services ?? []).filter((s) => s.slug !== service.slug);

  const seoTitle = `${service.name} | FintechPressHub`;
  const seoDescription = service.tagline;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title={seoTitle} description={seoDescription} />

      <PageHero
        eyebrow="Services"
        title={<>{service.name}</>}
        description={service.tagline}
      />

      <section className="pt-10 pb-6">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-back-to-services"
          >
            <ArrowLeft className="h-4 w-4" />
            All services
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid gap-10 md:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="md:col-span-3"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 uppercase tracking-wide">
                <Icon className="h-3.5 w-3.5" />
                {shortLabel}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                What this engagement looks like
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                {service.description}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/contact">
                  <Button size="lg" data-testid="button-talk-to-team">
                    Talk to our team
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" data-testid="button-view-pricing">
                    View pricing
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="md:col-span-2"
            >
              <div className="rounded-2xl border bg-card shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-lg">What's included</h3>
                </div>
                <ul className="space-y-3">
                  {service.deliverables.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90 leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {otherServices.length > 0 && (
        <section className="py-16 border-t bg-muted/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Other services
                </h2>
                <p className="text-muted-foreground mt-1">
                  Pair with these to compound results faster.
                </p>
              </div>
              <Link href="/services">
                <Button variant="outline" data-testid="button-see-all-services">
                  See all services
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherServices.map((other) => {
                const OtherIcon = getServiceIcon(other.slug);
                return (
                  <Link
                    key={other.id}
                    href={`/services/${other.slug}`}
                    className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                    data-testid={`link-other-service-${other.slug}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <OtherIcon className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                        {other.name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {other.tagline}
                    </p>
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to scale {shortLabel.toLowerCase()}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Book a 30-minute strategy call. We'll review your funnel, surface
            quick wins, and outline what a 90-day engagement would deliver.
          </p>
          <Link href="/contact">
            <Button size="lg" data-testid="button-cta-contact">
              Get a free audit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
