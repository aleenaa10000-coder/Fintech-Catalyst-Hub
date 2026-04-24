import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHero } from "@/components/PageHero";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Section = { id: string; label: string };

const SECTIONS: Section[] = [
  { id: "accuracy", label: "Accuracy" },
  { id: "ai-policy", label: "AI Policy" },
  { id: "voice-tone", label: "Voice/Tone" },
  { id: "originality", label: "Originality" },
  { id: "outbound-linking", label: "Outbound Linking" },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${id}`);
  }
}

export default function EditorialGuidelines() {
  useDocumentTitle("Editorial Guidelines | FintechPressHub");
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
        eyebrow="Editorial"
        title={<>Editorial Guidelines</>}
        description="The standards we hold our internal writers, guest contributors, and client deliverables to — covering accuracy, sourcing, AI usage, tone, and compliance."
      />

      <div className="container mx-auto px-4 max-w-6xl py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Sticky Navigation Sidebar */}
          <aside className="lg:col-span-3">
            <nav
              aria-label="Editorial guidelines navigation"
              className="lg:sticky lg:top-24"
              data-testid="guidelines-sidebar-nav"
            >
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                Navigation
              </div>
              <ul className="space-y-1 border-l border-border">
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
                        data-testid={`sidebar-link-${section.id}`}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "block -ml-px pl-4 pr-2 py-2 text-sm border-l-2 transition-colors duration-200 hover:text-foreground",
                          isActive
                            ? "border-primary text-primary font-semibold"
                            : "border-transparent text-muted-foreground",
                        )}
                      >
                        {section.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <article className="lg:col-span-9 min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none scroll-mt-24 prose-headings:scroll-mt-24">
              <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>

              <p>
                FintechPressHub is committed to publishing accurate, authoritative, and actionable
                content for the financial technology industry. Whether you are an internal writer,
                a guest contributor, or a client reviewing our work, these guidelines dictate our
                standards.
              </p>

              <h2 id="accuracy">1. Accuracy &amp; Fact-Checking</h2>
              <p>
                The financial industry is highly regulated. All content must prioritize accuracy
                above all else.
              </p>
              <ul>
                <li>
                  All statistics, claims, and data points must be linked to a credible, primary
                  source (e.g., McKinsey, Plaid, SEC filings, recognized industry reports).
                </li>
                <li>Do not cite competitors as primary sources unless necessary for context.</li>
                <li>
                  Ensure that descriptions of financial products (e.g., credit cards, loans, crypto
                  assets) comply with standard marketing regulations (e.g., avoiding absolute
                  guarantees of returns).
                </li>
              </ul>

              <h2 id="ai-policy">2. AI Policy</h2>
              <p>
                We do not publish unedited AI-generated content. While AI tools may be used for
                outlining, research assistance, or ideation, the final prose, analysis, and unique
                insights must be generated by a human subject matter expert. Content found to be
                heavily AI-generated will be rejected.
              </p>

              <h2 id="voice-tone">3. Voice and Tone</h2>
              <p>
                Our brand voice is <strong>Expert, Confident, and Precise</strong>.
              </p>
              <ul>
                <li>
                  <strong>Be direct:</strong> Avoid fluff, passive voice, and unnecessary jargon.
                </li>
                <li>
                  <strong>Be professional, not academic:</strong> Write for an educated B2B audience
                  (Founders, CMOs, Product Managers), but keep it readable and engaging.
                </li>
                <li>
                  <strong>Show, don't tell:</strong> Use real-world examples and case studies rather
                  than theoretical concepts.
                </li>
              </ul>

              <h2 id="originality">4. Originality</h2>
              <p>
                All content must be 100% original. We run all submissions through plagiarism
                checkers. We do not accept syndicated content or articles that have been published
                elsewhere.
              </p>

              <h2 id="outbound-linking">5. Outbound Linking</h2>
              <p>We encourage linking to high-quality external resources to provide context.</p>
              <ul>
                <li>Links must naturally fit the context of the sentence.</li>
                <li>
                  We do not accept links to low-quality sites, essay writing services, gambling,
                  adult content, or predatory lending sites.
                </li>
                <li>
                  Any undisclosed sponsored links will result in the immediate removal of the
                  article and a ban on the contributor.
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
