import { useEffect, useState, type ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  number: number;
  title: string;
  summary: string;
};

type LegalPageLayoutProps = {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
  children: ReactNode;
  testIdPrefix: string;
};

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${id}`);
  }
}

export function LegalPageLayout({
  eyebrow = "Legal",
  title,
  description,
  lastUpdated,
  sections,
  children,
  testIdPrefix,
}: LegalPageLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
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
  }, [sections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash && sections.some((s) => s.id === hash)) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "auto", block: "start" });
        setActiveId(hash);
      });
    }
  }, [sections]);

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <PageHero eyebrow={eyebrow} title={title} description={description} />

      <div className="container mx-auto px-6 sm:px-8 max-w-6xl py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <aside className="lg:col-span-3">
            <nav
              aria-label={`Plain-English summary for ${testIdPrefix}`}
              className="lg:sticky lg:top-24"
              data-testid={`${testIdPrefix}-quick-summary`}
            >
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wider font-semibold text-primary mb-1">
                  Quick Summary
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Plain-English explanations. The legal text on the right is what actually applies.
                </p>
                <ol className="space-y-4 list-none p-0 m-0">
                  {sections.map((section) => {
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
            <div className="prose prose-lg dark:prose-invert mx-auto max-w-prose scroll-mt-24 prose-headings:scroll-mt-24">
              <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>
              {children}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
