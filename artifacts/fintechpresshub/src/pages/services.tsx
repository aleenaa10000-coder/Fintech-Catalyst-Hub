import { useDocumentTitle } from "@/hooks/use-document-title";
import { useListServices } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PenTool, Link2, Newspaper, Network, Sparkles, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PageHero } from "@/components/PageHero";

const deliverableIconBySlug: Record<string, LucideIcon> = {
  "fintech-content-writing": PenTool,
  "off-page-seo": Link2,
  "guest-posting": Newspaper,
  "topical-authority": Network,
};

export default function Services() {
  useDocumentTitle("Services | FintechPressHub", "Comprehensive fintech SEO, link building, and content marketing services.");
  const { data: services, isLoading } = useListServices();

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="Services"
        title={<>Growth Engines for Fintech</>}
        description="Specialized digital marketing services designed to acquire high-value customers, earn high-authority backlinks, and build topical authority inside your sub-vertical."
        showScrollIndicator
      />

      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-16">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-8 border rounded-2xl p-8 shadow-sm">
                  <div className="flex-1"><Skeleton className="h-8 w-2/3 mb-4" /><Skeleton className="h-20 w-full mb-6" /></div>
                  <div className="flex-1"><Skeleton className="h-48 w-full" /></div>
                </div>
              ))
            ) : services?.map((service, index) => {
              const DeliverableIcon = deliverableIconBySlug[service.slug] ?? Sparkles;
              return (
              <motion.div
                key={service.id}
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
                  <Link href="/contact">
                    <Button variant="outline" size="lg">Discuss Your Project</Button>
                  </Link>
                </div>
                <div className={`flex-1 w-full flex justify-center ${index % 2 !== 0 ? 'md:order-1' : ''}`}>
                  <div className="w-full max-w-md md:max-w-none bg-white dark:bg-card rounded-xl p-8 border border-slate-100 dark:border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <DeliverableIcon className="w-5 h-5" />
                      </span>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-foreground">Key Deliverables:</h3>
                    </div>
                    <ul className="space-y-4">
                      {service.deliverables.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <DeliverableIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
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
        </div>
      </section>
    </div>
  );
}
