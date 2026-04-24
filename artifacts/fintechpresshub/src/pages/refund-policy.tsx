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
    id: "general-policy",
    number: 1,
    title: "General Policy",
    summary: "Work that's already done — research, audits, outreach, writing — is non-refundable.",
  },
  {
    id: "monthly-retainers",
    number: 2,
    title: "Monthly Retainers",
    summary: "Cancel with the notice in your MSA (usually 30 days). Once the month starts, that month's fee stays.",
  },
  {
    id: "content-revisions",
    number: 3,
    title: "Content Revisions",
    summary: "Not refunds — revisions. We re-edit up to twice per piece if it misses the brief.",
  },
  {
    id: "link-building-placements",
    number: 4,
    title: "Link Building Placements",
    summary: "If a link drops within 180 days through no fault of yours, we replace it on a same-or-better DR site for free.",
  },
  {
    id: "exceptions",
    number: 5,
    title: "Exceptions",
    summary: "Real refunds only for duplicate billing or if we never started the work — email billing@fintechpresshub.com.",
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

export default function RefundPolicy() {
  useDocumentTitle("Refund Policy | FintechPressHub");
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
        title={<>Refund Policy</>}
        description="Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees."
      />

      <div className="container mx-auto px-4 max-w-6xl py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <aside className="lg:col-span-3">
            <nav
              aria-label="Plain-English summary of the refund policy"
              className="lg:sticky lg:top-24"
              data-testid="refund-quick-summary"
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

          <article className="lg:col-span-9 min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none scroll-mt-24 prose-headings:scroll-mt-24">
              <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>

              <h2 id="general-policy">1. General Policy</h2>
              <p>
                At FintechPressHub, we pride ourselves on delivering high-quality SEO and content
                services. Due to the nature of digital marketing and the upfront labor required
                (research, auditing, outreach, and writing), our standard policy is that we do not
                offer refunds for work that has already been completed or hours that have been
                logged.
              </p>

              <h2 id="monthly-retainers">2. Monthly Retainers</h2>
              <p>
                For clients on monthly retainers, you may cancel your services according to the
                notice period specified in your Master Services Agreement (typically 30 days). Once
                a billing cycle has started and work has commenced for that month, the retainer fee
                for that month is non-refundable.
              </p>

              <h2 id="content-revisions">3. Content Revisions</h2>
              <p>
                Instead of refunds on content, we operate on a revision model. If a piece of content
                does not meet the guidelines established in the initial brief, we provide up to two
                (2) rounds of revisions to ensure it meets your standards, provided the feedback is
                within the scope of the original brief.
              </p>

              <h2 id="link-building-placements">4. Link Building Placements</h2>
              <p>
                If a secured link is removed within 180 days of placement through no fault of the
                client (e.g., the publisher deletes the post), FintechPressHub will secure a
                replacement link of equal or greater Domain Rating at no additional cost. We do not
                offer cash refunds for removed links.
              </p>

              <h2 id="exceptions">5. Exceptions</h2>
              <p>
                Refunds may be considered on a case-by-case basis under the following extreme
                circumstances:
              </p>
              <ul>
                <li>Duplicate billing errors on our end.</li>
                <li>
                  Failure to commence any work within 14 days of an upfront payment without
                  communication or agreement from the client.
                </li>
              </ul>

              <p>
                To discuss billing or request an exception, please contact
                billing@fintechpresshub.com.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
