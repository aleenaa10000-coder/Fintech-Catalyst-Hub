import { PageMeta } from "@/components/PageMeta";
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
  { id: "topical-scope", label: "Topical Scope" },
  { id: "accuracy", label: "Accuracy" },
  { id: "ai-policy", label: "AI Policy" },
  { id: "voice-tone", label: "Voice/Tone" },
  { id: "article-length", label: "Article Length" },
  { id: "originality", label: "Originality" },
  { id: "outbound-linking", label: "Outbound Linking" },
  { id: "contributor-links", label: "Contributor Link Policy" },
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
      <PageMeta page="editorialGuidelines" />
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

              <h2 id="topical-scope">1. Topical Scope</h2>
              <p>
                Every piece we publish has to serve a working fintech operator — a founder, growth
                lead, product manager, compliance officer, or CFO. Our editorial calendar is built
                around the verticals and disciplines below. Pitches that fall outside this scope are
                returned regardless of writing quality.
              </p>
              <ul>
                <li>
                  <strong>Fintech marketing &amp; growth:</strong> B2B and B2C fintech demand
                  generation, lifecycle, conversion-rate optimization for financial products,
                  paid acquisition, and brand positioning.
                </li>
                <li>
                  <strong>SEO &amp; content for financial services:</strong> SaaS fintech SEO,
                  programmatic SEO, topical authority, technical SEO audits, link building, and
                  YMYL content strategy.
                </li>
                <li>
                  <strong>Payments &amp; banking infrastructure:</strong> Payments rails, payment
                  orchestration, card issuing, acquiring, treasury and CFO tooling, banking-as-a-service,
                  and embedded finance.
                </li>
                <li>
                  <strong>Open Banking &amp; data:</strong> Open Banking, PSD2 / PSD3, account
                  aggregation, data-sharing standards, and consent UX.
                </li>
                <li>
                  <strong>Lending, BNPL &amp; credit:</strong> Underwriting models, alternative
                  data, BNPL economics, SMB lending, and consumer credit.
                </li>
                <li>
                  <strong>Wealthtech &amp; crypto:</strong> Robo-advisors, brokerage UX, stablecoin
                  payments, on-ramps/off-ramps, and tokenized assets.
                </li>
                <li>
                  <strong>Regtech &amp; compliance marketing:</strong> KYC/AML, sanctions screening,
                  fraud, and how compliant fintechs position regulated products without overclaiming.
                </li>
                <li>
                  <strong>Neobanking &amp; digital banking:</strong> Challenger bank growth,
                  deposit acquisition, primary-account strategy, and unit economics.
                </li>
              </ul>

              <h2 id="accuracy">2. Accuracy &amp; Fact-Checking</h2>
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

              <h2 id="ai-policy">3. AI Policy</h2>
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

              <h2 id="voice-tone">4. Voice and Tone</h2>
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

              <h2 id="article-length">5. Article Length</h2>
              <p>
                Every article should land between <strong>800 and 1,500 words</strong>. This range
                is long enough to cover a fintech topic with genuine depth — including data,
                examples, and a clear point of view — without padding the piece for word count.
              </p>
              <ul>
                <li>
                  <strong>Minimum 800 words:</strong> Pieces shorter than this rarely demonstrate
                  the expertise required to rank for competitive fintech queries.
                </li>
                <li>
                  <strong>Maximum 1,500 words:</strong> Submissions over the limit will be sent
                  back for tightening. Cut filler, merge overlapping sections, and prioritize
                  insight over volume.
                </li>
                <li>
                  <strong>Quality over quantity:</strong> A focused 900-word piece backed by primary
                  sources beats a 2,500-word piece padded with generic background.
                </li>
              </ul>

              <h2 id="originality">6. Originality</h2>
              <p>
                All content must be 100% original. We run all submissions through plagiarism
                checkers. We do not accept syndicated content or articles that have been published
                elsewhere.
              </p>

              <h2 id="outbound-linking">7. Outbound Linking</h2>
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

              <h2 id="contributor-links">8. Contributor Link Policy</h2>
              <p>
                Guest contributors and sponsored partners receive a fixed, transparent backlink
                allowance from FintechPressHub. Because we publish on a topically-focused fintech
                domain, every approved link passes contextual link equity from a niche-relevant
                page — exactly what fintech SEO teams are after.
              </p>
              <ul>
                <li>
                  <strong>One (1) dofollow contextual backlink:</strong> placed in-body, surrounded
                  by relevant copy, and pointing to a real fintech product page, study, data set,
                  blog post, or tool — never a thin landing page or affiliate redirect.
                </li>
                <li>
                  <strong>One (1) dofollow author-bio link:</strong> to your company homepage,
                  personal site, or LinkedIn. Author bios are reused across all your articles, so
                  this link compounds with each new contribution.
                </li>
                <li>
                  <strong>Natural anchor text only:</strong> branded, partial-match, or descriptive
                  phrases. Exact-match commercial anchors (e.g., “best fintech SEO agency”) are
                  rewritten by editors to protect both sites from over-optimization penalties.
                </li>
                <li>
                  <strong>Niche-aligned destinations only:</strong> your link target must serve the
                  same fintech reader the article is written for. We strip links to gambling,
                  adult, payday, CBD, and other off-niche or YMYL-risky categories during edit.
                </li>
                <li>
                  <strong>Editor-granted citations:</strong> additional dofollow references may be
                  added when they cite primary data, regulator filings, original research, or
                  first-party customer stories that materially strengthen the article.
                </li>
                <li>
                  <strong>Permanence:</strong> approved links remain live and dofollow for the
                  lifetime of the article. We do not run silent link audits that quietly remove
                  contributor backlinks after publication.
                </li>
                <li>
                  <strong>What voids the allowance:</strong> undisclosed paid placements inserted
                  after publication, link swaps with low-quality networks, and any attempt to
                  redirect the agreed URL to a different destination — all result in immediate
                  link removal and a permanent contributor ban.
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
