import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHero } from "@/components/PageHero";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type ComparisonItem = { label: string; detail?: string };

function ComparisonGrid({
  standard,
  forbidden,
  testIdPrefix,
}: {
  standard: ComparisonItem[];
  forbidden: ComparisonItem[];
  testIdPrefix: string;
}) {
  return (
    <div
      className="not-prose my-8 grid grid-cols-1 md:grid-cols-2 gap-6"
      data-testid={`${testIdPrefix}-comparison`}
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200 m-0">
            Standard
          </h3>
        </div>
        <ul className="space-y-3 list-none p-0 m-0">
          {standard.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3"
              data-testid={`${testIdPrefix}-standard-${i}`}
            >
              <Check
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <div className="text-sm leading-relaxed text-foreground">
                <span className="font-semibold">{item.label}</span>
                {item.detail ? (
                  <span className="text-muted-foreground"> — {item.detail}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white">
            <X className="h-4 w-4" strokeWidth={3} />
          </span>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 m-0">
            Forbidden
          </h3>
        </div>
        <ul className="space-y-3 list-none p-0 m-0">
          {forbidden.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3"
              data-testid={`${testIdPrefix}-forbidden-${i}`}
            >
              <X
                className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <div className="text-sm leading-relaxed text-foreground">
                <span className="font-semibold">{item.label}</span>
                {item.detail ? (
                  <span className="text-muted-foreground"> — {item.detail}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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

      <div className="container mx-auto px-6 sm:px-8 max-w-6xl py-16 sm:py-20">
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
            <div className="prose prose-lg dark:prose-invert mx-auto max-w-prose scroll-mt-24 prose-headings:scroll-mt-24">
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
                above all else. Use the comparison below to vet every statistic, claim, and citation
                before submission.
              </p>
              <ComparisonGrid
                testIdPrefix="accuracy"
                standard={[
                  {
                    label: "SEC, FINRA & central bank filings",
                    detail: "10-K/10-Q, EDGAR data, FOMC minutes, official rulings",
                  },
                  {
                    label: "Primary research & first-party data",
                    detail: "Original surveys, internal product data, named SME interviews",
                  },
                  {
                    label: "Tier-1 industry reports",
                    detail: "McKinsey, BCG, Plaid, Stripe, CB Insights, Statista",
                  },
                  {
                    label: "Peer-reviewed academic sources",
                    detail: "Journals, NBER working papers, university research centers",
                  },
                  {
                    label: "Compliant product claims",
                    detail: "Hedged language, disclosures, no guaranteed returns",
                  },
                ]}
                forbidden={[
                  {
                    label: "Unverified blogs & content farms",
                    detail: "Anonymous Medium posts, AI content mills, unsourced listicles",
                  },
                  {
                    label: "Competitor marketing pages as primary source",
                    detail: "Vendor landing pages cited as neutral evidence",
                  },
                  {
                    label: "Stat-laundering through secondary sources",
                    detail: "Citing a blog that cited the original — always link the source",
                  },
                  {
                    label: "Absolute financial guarantees",
                    detail: "“Guaranteed 12% APY”, “risk-free”, “certain returns”",
                  },
                  {
                    label: "Outdated data without context",
                    detail: "Pre-2020 stats presented as current market conditions",
                  },
                ]}
              />

              <h2 id="ai-policy">2. AI Policy</h2>
              <p>
                AI tools can accelerate research and ideation, but the final voice, analysis, and
                expertise on the page must come from a human operator. Use the comparison below to
                understand exactly where AI fits — and where it doesn't.
              </p>
              <ComparisonGrid
                testIdPrefix="ai-policy"
                standard={[
                  {
                    label: "Outlining & structure brainstorming",
                    detail: "Drafting H2/H3 skeletons, alternative angles, intro hooks",
                  },
                  {
                    label: "Research assistance & summarization",
                    detail: "Summarizing whitepapers, surfacing stats to verify against sources",
                  },
                  {
                    label: "Editing, grammar & readability passes",
                    detail: "Tightening sentences, flagging passive voice, headline variants",
                  },
                  {
                    label: "Disclosed data analysis",
                    detail: "Code interpreters for chart prep when methodology is documented",
                  },
                  {
                    label: "Translation drafts reviewed by humans",
                    detail: "Initial localization edited by a native fintech writer",
                  },
                ]}
                forbidden={[
                  {
                    label: "Unedited AI-generated prose",
                    detail: "Copy-pasting ChatGPT/Claude output as the final article body",
                  },
                  {
                    label: "Fabricated stats, quotes, or sources",
                    detail: "Any AI-hallucinated number, citation, or expert attribution",
                  },
                  {
                    label: "AI-written analysis or opinions",
                    detail: "Strategic takes, predictions, and POV must come from a human SME",
                  },
                  {
                    label: "Synthetic case studies or interviews",
                    detail: "Made-up customers, fake quotes, or fictional product results",
                  },
                  {
                    label: "Bypassing AI-content detection thresholds",
                    detail: "Submissions flagged >40% AI by our detectors are auto-rejected",
                  },
                ]}
              />

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
              <p>
                We encourage linking to high-quality external resources to provide context, evidence,
                and further reading. Every outbound link must clear the bar below — no exceptions.
              </p>
              <ComparisonGrid
                testIdPrefix="outbound-linking"
                standard={[
                  {
                    label: "SEC filings & regulator publications",
                    detail: "EDGAR, FCA, ESMA, MAS, OCC handbooks and rulings",
                  },
                  {
                    label: "Primary data & original research",
                    detail: "Federal Reserve datasets, World Bank, BIS, OECD statistics",
                  },
                  {
                    label: "Tier-1 financial press",
                    detail: "Bloomberg, Reuters, FT, WSJ, The Economist, Finextra",
                  },
                  {
                    label: "Authoritative product & API docs",
                    detail: "Stripe, Plaid, Visa Direct, Mastercard, official SDK references",
                  },
                  {
                    label: "Contextually-relevant placements",
                    detail: "Anchor text matches the destination; link earns the click",
                  },
                ]}
                forbidden={[
                  {
                    label: "Unverified blogs & content farms",
                    detail: "Anonymous authorship, no citations, AI-generated thin content",
                  },
                  {
                    label: "Gambling, adult & predatory lending sites",
                    detail: "Casinos, sportsbooks, payday lenders, adult content of any kind",
                  },
                  {
                    label: "Essay mills & link-selling networks",
                    detail: "Academic cheating services, PBNs, paid link marketplaces",
                  },
                  {
                    label: "Undisclosed sponsored or affiliate links",
                    detail:
                      "Results in immediate article removal and a permanent contributor ban",
                  },
                  {
                    label: "Low-DR or de-indexed domains",
                    detail: "Sites under DR 30, expired domains, or pages dropped from Google",
                  },
                ]}
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
