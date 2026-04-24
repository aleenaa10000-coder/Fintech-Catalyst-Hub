import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHero } from "@/components/PageHero";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  number: number;
  title: string;
  summary: string;
};

const SECTIONS: Section[] = [
  {
    id: "agreement-to-terms",
    number: 1,
    title: "Agreement to Terms",
    summary: "Use the site or our services and you agree to these rules. Don't agree? Don't use them.",
  },
  {
    id: "services-provided",
    number: 2,
    title: "Services Provided",
    summary: "We do SEO, content, and PR for fintech. The exact scope and price live in your signed SOW or MSA.",
  },
  {
    id: "client-responsibilities",
    number: 3,
    title: "Client Responsibilities",
    summary: "Give us access, a point of contact, and accurate info — otherwise we can't deliver results.",
  },
  {
    id: "intellectual-property",
    number: 4,
    title: "Intellectual Property",
    summary: "Once you pay in full, the content is yours. We can mention non-confidential results in case studies unless an NDA says otherwise.",
  },
  {
    id: "limitation-of-liability",
    number: 5,
    title: "Limitation of Liability",
    summary: "We follow best practices but can't promise specific Google rankings, and we're not liable when third-party platforms change the rules.",
  },
  {
    id: "governing-law",
    number: 6,
    title: "Governing Law",
    summary: "Any disputes are handled under New York State law in New York courts.",
  },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${id}`);
  }
}

export default function Terms() {
  useDocumentTitle("Terms of Service | FintechPressHub");
  const [activeId, setActiveId] = useState<string>(SECTIONS[0]!.id);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash && SECTIONS.some((s) => s.id === hash)) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "auto", block: "start" });
        setActiveId(hash);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <PageHero
        eyebrow="Legal"
        title={<>Terms of Service</>}
        description="The agreement that governs your use of FintechPressHub's website, services, and engagements."
      />

      <div className="container mx-auto px-4 max-w-6xl py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Sticky Quick Summary Sidebar (25%) */}
          <aside className="lg:col-span-3">
            <nav
              aria-label="Plain-English summary of the terms"
              className="lg:sticky lg:top-24"
              data-testid="terms-quick-summary"
            >
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wider font-semibold text-primary mb-1">
                  Quick Summary
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Plain-English explanations. The legal text on the right is what actually applies.
                </p>
                <ol className="space-y-4 list-none p-0 m-0">
                  {SECTIONS.map((section) => {
                    const isActive = activeId === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToSection(section.id);
                          }}
                          data-testid={`summary-link-${section.id}`}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "block rounded-lg p-3 -mx-1 border-l-2 transition-colors duration-200 hover:bg-muted/60",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-transparent",
                          )}
                        >
                          <div className="flex items-baseline gap-2 mb-1">
                            <span
                              className={cn(
                                "inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded text-[10px] font-bold",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {section.number}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isActive ? "text-primary" : "text-foreground",
                              )}
                            >
                              {section.title}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                            {section.summary}
                          </p>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </nav>
          </aside>

          {/* Main Legal Text */}
          <article className="lg:col-span-9 min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none scroll-mt-24 prose-headings:scroll-mt-24">
              <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>

              <h2 id="agreement-to-terms">1. Agreement to Terms</h2>
              <p>
                By accessing or using FintechPressHub's website and services, you agree to be bound
                by these Terms of Service. If you disagree with any part of the terms, then you may
                not access the service.
              </p>

              <h2 id="services-provided">2. Services Provided</h2>
              <p>
                FintechPressHub provides digital marketing, search engine optimization (SEO),
                content creation, and digital PR services specifically tailored for the financial
                technology industry. The specific deliverables, timelines, and costs will be
                outlined in a separate Statement of Work (SOW) or Master Services Agreement (MSA)
                for clients.
              </p>

              <h2 id="client-responsibilities">3. Client Responsibilities</h2>
              <p>To ensure successful delivery of services, clients agree to:</p>
              <ul>
                <li>
                  Provide timely access to necessary platforms (CMS, Google Analytics, Search
                  Console, etc.).
                </li>
                <li>Designate a primary point of contact for approvals and feedback.</li>
                <li>
                  Provide accurate information regarding products, compliance requirements, and
                  brand guidelines.
                </li>
              </ul>

              <h2 id="intellectual-property">4. Intellectual Property</h2>
              <p>
                Upon full payment of applicable fees, FintechPressHub grants the client full rights
                to all content created specifically for them. FintechPressHub retains the right to
                use non-confidential campaign results as case studies unless a strict NDA is in
                place.
              </p>

              <h2 id="limitation-of-liability">5. Limitation of Liability</h2>
              <p>
                FintechPressHub employs industry-standard best practices for SEO. However, due to
                the unpredictable nature of search engine algorithms, we do not guarantee specific
                rankings or traffic volumes. We are not liable for algorithm updates or actions
                taken by third-party platforms that negatively impact your website.
              </p>

              <h2 id="governing-law">6. Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the
                laws of the State of New York, and you irrevocably submit to the exclusive
                jurisdiction of the courts in that State or location.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
