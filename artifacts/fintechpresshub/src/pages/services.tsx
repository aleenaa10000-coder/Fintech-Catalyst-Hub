import { PageMeta } from "@/components/PageMeta";
import { useListServices } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Link2, PenTool, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PageHero } from "@/components/PageHero";
import {
  getServiceIcon,
  serviceShortLabelBySlug as shortLabelBySlug,
} from "@/lib/serviceIcons";
import { prefetchServiceDetail } from "@/lib/route-prefetch";
import { SITE_URL } from "@/lib/metaData";
import { useEffect, useRef } from "react";
import { servicesIndexFaqs } from "@/lib/serviceFaqs";
import { FaqSection } from "@/components/FaqSection";

const TRUST_STATS = [
  { icon: Link2,   value: "2,400+",  label: "Editorial backlinks placed" },
  { icon: BarChart3, value: "DR 55–75", label: "Average publisher rating" },
  { icon: PenTool, value: "500+",    label: "Long-form articles delivered" },
  { icon: Star,    value: "4.9 / 5", label: "Average client satisfaction" },
];

export default function Services() {
  const { data: services, isLoading } = useListServices();

  // Warm the service-detail chunk as soon as the service blocks scroll
  // within ~200px of the viewport. Same one-shot pattern as the blog
  // index — `prefetchServiceDetail` dedupes via a module-level flag.
  const serviceListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      prefetchServiceDetail();
      return;
    }
    const el = serviceListRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            prefetchServiceDetail();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="services"
        webPage={{ datePublished: "2021-01-01", dateModified: __BUILD_TIME_ISO__ }}
        speakableSelectors={["h1", ".speakable-summary", ".speakable-faq"]}
        faq={servicesIndexFaqs}
        faqDatePublished="2021-01-01"
        faqDateModified="2026-05-15"
        aggregateRating={{
          ratingValue: 4.9,
          ratingCount: 47,
          reviewCount: 47,
          bestRating: "5",
          worstRating: "1",
        }}
        itemList={
          services && services.length > 0
            ? {
                name: "Fintech SEO & Content Marketing Services",
                description:
                  "Specialist fintech SEO, link building, and content marketing services built to compound organic growth for payments, lending, and banking brands.",
                items: services.map(
                  (s: { name: string; slug: string; description: string }) => ({
                    name: s.name,
                    url: `${SITE_URL}/services/${s.slug}`,
                    description: s.description,
                  }),
                ),
              }
            : undefined
        }
      />
      <PageHero
        eyebrow="Services"
        title={<>Fintech SEO &amp; Marketing Services</>}
        description={
          <>
            <p className="speakable-summary">
              FintechPressHub offers specialist fintech SEO, editorial link building, guest posting, topical authority programs, and SEO audits — expert services designed to compound organic growth for payments, embedded finance, open banking, neobanking, lending, and wealthtech brands.
            </p>
          </>
        }
      />

      {/* Trust stats bar — GEO/E-E-A-T signal: concrete metrics AI engines can cite */}
      <section aria-label="Service performance metrics" className="border-y bg-muted/30 py-6">
        <div className="container mx-auto px-4">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {TRUST_STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1">
                <Icon className="h-5 w-5 text-primary mb-1" aria-hidden="true" />
                <dt className="text-2xl font-bold text-foreground">{value}</dt>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="pt-12 pb-24">
        <div className="container mx-auto px-4">
          {!isLoading && services && services.length > 0 && (
            <nav
              aria-label="Jump to service"
              className="mx-auto mb-12 w-fit max-w-full overflow-x-auto rounded-full border border-border/60 bg-background/80 shadow-sm"
            >
              <div className="flex items-center gap-1 p-1.5">
                {services.map((service: { id: number; name: string; slug: string; tagline: string; description: string; deliverables: string[] }) => {
                  const Icon = getServiceIcon(service.slug);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`service-${service.slug}`);
                        if (!el) return;
                        const top = el.getBoundingClientRect().top + window.scrollY - 96;
                        window.scrollTo({ top, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {shortLabelBySlug[service.slug] ?? service.name}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          <div ref={serviceListRef} className="flex flex-col gap-16">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-8 border rounded-2xl p-8 shadow-sm">
                  <div className="flex-1"><Skeleton className="h-8 w-2/3 mb-4" /><Skeleton className="h-20 w-full mb-6" /></div>
                  <div className="flex-1"><Skeleton className="h-48 w-full" /></div>
                </div>
              ))
            ) : services?.map((service: { id: number; name: string; slug: string; tagline: string; description: string; deliverables: string[] }, index: number) => {
              const DeliverableIcon = getServiceIcon(service.slug);
              return (
              <motion.div
                key={service.id}
                id={`service-${service.slug}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row gap-8 lg:gap-16 items-center p-8 rounded-3xl bg-card border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`flex-1 ${index % 2 !== 0 ? 'md:order-2' : ''}`}>
                  <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                    {service.tagline}
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{service.name}</h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/services/${service.slug}`}
                      onMouseEnter={prefetchServiceDetail}
                      onFocus={prefetchServiceDetail}
                      onTouchStart={prefetchServiceDetail}
                    >
                      <Button size="lg" data-testid={`button-learn-more-${service.slug}`}>
                        Learn more about {service.name}
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="outline" size="lg">Discuss Your Project</Button>
                    </Link>
                  </div>
                </div>
                <div className={`flex-1 w-full flex justify-center ${index % 2 !== 0 ? 'md:order-1' : ''}`}>
                  <div className="w-full max-w-md md:max-w-none bg-white dark:bg-card rounded-xl p-8 border border-slate-100 dark:border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <DeliverableIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-foreground">
                        {shortLabelBySlug[service.slug] ?? service.name} Deliverables
                      </h3>
                    </div>
                    <ul className="space-y-4">
                      {service.deliverables.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <DeliverableIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="text-slate-700 dark:text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>

          <div className="mt-20 rounded-2xl border border-slate-200 bg-[#0052FF]/5 px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0052FF]/10 text-[#0052FF]">
                <BarChart3 className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Wondering how we compare?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  See honest, criterion-by-criterion comparisons between FintechPressHub and generalist agencies, freelancers, DIY tools, and more.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link href="/compare/agency-vs-in-house">
                <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white">
                  Agency vs in-house
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/compare/specialist-vs-generalist">
                <Button variant="outline" size="sm" className="border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white">
                  Specialist vs generalist
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/compare">
                <Button size="sm" className="bg-[#0052FF] hover:bg-[#0040cc]">
                  All comparisons
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          {/* AEO/GEO: Services hub FAQ section — earns FAQPage rich result and AI citation eligibility */}
          <FaqSection
            items={servicesIndexFaqs}
            heading="Frequently asked questions about our fintech SEO services"
            subtitle="Everything fintech founders, CMOs, and marketing leads ask us before starting an engagement."
            className="py-20 border-t bg-muted/20 speakable-faq"
            valuePrefix="services-faq"
          />
        </div>
      </section>
    </div>
  );
}
