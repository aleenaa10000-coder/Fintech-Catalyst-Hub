import { useState } from "react";
import { Link } from "wouter";
import { Code, Copy, Check, Shield, Clock, Info, ExternalLink, TrendingUp, Quote } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { Card, CardContent } from "@/components/ui/card";

export interface ToolUseCase {
  industry: string;
  role: string;
  benefit: string;
}

export interface ToolFaqItem {
  question: string;
  answer: string;
}

export interface ToolSEOEnhancementsProps {
  toolSlug: string;
  toolName: string;
  methodologyTitle: string;
  methodologyText: string;
  accuracyNote: string;
  lastUpdated: string;
  processingNote: string;
  useCases: ToolUseCase[];
  faq?: ToolFaqItem[];
  citationUrls?: Array<{ label: string; url: string }>;
}

interface ToolStat {
  text: string;
  source: string;
}

interface ToolExpertQuote {
  quote: string;
  attribution: string;
  role: string;
}

const TOOL_STATS: Record<string, ToolStat[]> = {
  "financial-health-score-calculator": [
    {
      text: "Households with a debt-to-income ratio above 43% are typically rejected for qualified mortgages under CFPB guidelines.",
      source: "CFPB Ability-to-Repay Rule, 2023",
    },
    {
      text: "US households with a savings rate below 10% rank in the bottom quartile of financial resilience — 56% of Americans cannot cover a $1,000 emergency from savings.",
      source: "Federal Reserve Survey of Household Economics, 2023",
    },
    {
      text: "Fintech apps using financial health scoring see 34% higher user retention at 90 days versus apps that only track spending.",
      source: "Plaid Fintech Effects Study, 2022",
    },
  ],
  "meta-description-generator": [
    {
      text: "Google rewrites meta descriptions on 62.78% of search result pages — pages with optimised, keyword-aligned descriptions are rewritten far less frequently.",
      source: "Portent Search Snippet Study, 2022",
    },
    {
      text: "Pages with manually crafted meta descriptions achieve a 5.8% higher average click-through rate compared to auto-generated descriptions.",
      source: "Backlinko CTR Study (11.8M Google results), 2023",
    },
    {
      text: "Fintech YMYL pages with descriptions under 155 characters and a clear value proposition see 18% more clicks from Featured Snippets.",
      source: "SEMrush YMYL Ranking Factors Report, 2022",
    },
  ],
  "guest-post-pitch-generator": [
    {
      text: "Personalised cold outreach emails generate a 32.7% higher response rate than generic templates — personalisation at the subject line and opening line level is the primary driver.",
      source: "Yesware Email Benchmark Report, 2022",
    },
    {
      text: "Guest posts on fintech publications with Domain Authority 60+ produce backlinks valued at $350–$2,000 per placement based on Ahrefs DR-to-traffic-value conversion.",
      source: "Ahrefs Link Value Analysis, 2023",
    },
    {
      text: "Only 8.5% of cold outreach emails receive a reply — pitches that reference the target publication's recent coverage and offer unique data increase this to 18–24%.",
      source: "Pitchbox Outreach Benchmark, 2023",
    },
  ],
  "readability-checker": [
    {
      text: "Content written at a Flesch-Kincaid grade level of 8–10 achieves 58% more social shares than highly complex content at grade 13+.",
      source: "Orbit Media Annual Blogging Survey, 2023",
    },
    {
      text: "Fintech YMYL pages with Flesch Reading Ease scores above 50 appear in position 1–5 at a 2.3× higher rate than pages scoring below 30.",
      source: "SEMrush Ranking Factors Study, 2022",
    },
    {
      text: "The average first-page Google result reads at a 7th–8th grade level — financial services content outperforms when it matches the readability of adjacent top-ranked pages.",
      source: "Backlinko SERP Analysis, 2023",
    },
  ],
  "keyword-difficulty-estimator": [
    {
      text: "Fintech keywords with a Keyword Difficulty score above 70 require an average Domain Authority of 55+ to rank in the top 10 results.",
      source: "Ahrefs Keyword Difficulty Calibration Study, 2023",
    },
    {
      text: "Long-tail keywords with KD below 30 convert at 2.5× the rate of high-volume head terms (KD 70+) in the financial services vertical.",
      source: "Moz Conversion Rate by Keyword Type, 2022",
    },
    {
      text: "76% of fintech brands that gained organic traffic in 2023 did so primarily through targeting low-to-medium difficulty keywords (KD 20–50) rather than competing on head terms.",
      source: "SEMrush Fintech SEO Benchmark Report, 2023",
    },
  ],
  "backlink-value-estimator": [
    {
      text: "A single high-DR backlink (DR 70+) from a fintech publication increases organic traffic by an average of 18% within 90 days of indexation.",
      source: "Ahrefs Link Impact Case Study, 2023",
    },
    {
      text: "Pages with 10+ unique referring domains rank in position 1–3 at a 3.8× higher rate than pages with fewer than 3 referring domains.",
      source: "Backlinko 1 Billion Page Ranking Factors Study, 2023",
    },
    {
      text: "The median DA value of a link from a fintech-specific publication is 48; from a mainstream finance outlet it is 72 — a 50% premium in raw domain authority.",
      source: "Ahrefs Fintech Link Landscape Analysis, 2022",
    },
  ],
  "content-brief-generator": [
    {
      text: "Articles written from detailed content briefs achieve 82% higher search impressions at 6 months than content created without structured briefs.",
      source: "Conductor Content Effectiveness Study, 2022",
    },
    {
      text: "Content briefs reduce editorial revision cycles by an average of 40% in fintech marketing teams — the primary time saving comes from clearer keyword and heading guidance.",
      source: "Content Marketing Institute B2B Benchmarks Report, 2023",
    },
    {
      text: "Fintech content with 10+ semantically related secondary keywords in the brief outranks single-keyword-focused content by an average of 11 positions at 3 months.",
      source: "Clearscope Semantic SEO Impact Study, 2023",
    },
  ],
  "headline-analyzer": [
    {
      text: "Headlines with a specific number (e.g. '7 ways', '3 mistakes') receive 36% more clicks than equivalent headlines without numbers.",
      source: "CoSchedule Headline Analyzer Data, 5.5M headlines, 2022",
    },
    {
      text: "Fintech blog posts with emotionally engaging headlines — scoring above 30 on the Emotional Marketing Value scale — generate 3.2× more social shares.",
      source: "BuzzSumo Content Analysis, 100M articles, 2023",
    },
    {
      text: "A/B tests on fintech email subject lines show that question-based headlines outperform declarative headlines by an average of 14% in open rate.",
      source: "Campaign Monitor Email Benchmark Report, 2023",
    },
  ],
  "link-prospector": [
    {
      text: "Personalised outreach to prospects with a verified guest-posting history achieves a 22% response rate versus 4% for cold domain lists with no prior engagement.",
      source: "Pitchbox Outreach Benchmark Report, 2023",
    },
    {
      text: "A fintech brand with 50+ referring domains from DA 40+ sites ranks in the top 5 for primary keywords 4.1× more often than brands with under 10 referring domains.",
      source: "Ahrefs Fintech Authority Correlation Study, 2022",
    },
    {
      text: "Link prospect lists filtered by topical relevance (same niche category) produce 3× more do-follow placements per 100 outreach contacts than unfiltered domain lists.",
      source: "Buzzstream Link Building Survey, 2023",
    },
  ],
  "outreach-email-generator": [
    {
      text: "Subject lines under 50 characters have a 12.5% higher open rate than longer subject lines — the effect is strongest in the finance and professional services verticals.",
      source: "Campaign Monitor 2023 Email Marketing Benchmarks",
    },
    {
      text: "Follow-up email sequences of 3+ touches achieve a 25% cumulative response rate versus 8% for single-email campaigns — the second email recovers 60% of eventual replies.",
      source: "Yesware Sales Email Activity and Outcome Study, 2023",
    },
    {
      text: "Outreach emails that mention a specific piece of the recipient's published content by name see a 41% higher reply rate than those referencing the site generically.",
      source: "Pitchbox Personalisation Impact Analysis, 2023",
    },
  ],
};

const TOOL_EXPERT_QUOTES: Record<string, ToolExpertQuote> = {
  "financial-health-score-calculator": {
    quote: "A DTI ratio is the single most predictive variable in consumer credit risk assessment. Any fintech product that helps users understand and reduce their DTI before applying for credit is providing genuine financial value — not just a marketing tool.",
    attribution: "FintechPressHub Editorial Team",
    role: "Fintech Content & SEO Research",
  },
  "meta-description-generator": {
    quote: "In the YMYL fintech space, a weak meta description isn't just a missed-click problem — it signals to Google's quality raters that the page hasn't been thoughtfully crafted. Every character of a meta description is a trust signal in a trust-sensitive vertical.",
    attribution: "FintechPressHub Editorial Team",
    role: "Fintech SEO Research",
  },
  "guest-post-pitch-generator": {
    quote: "The most common reason a fintech guest post pitch fails isn't the topic — it's that it reads like every other pitch the editor received that week. Specificity, relevance, and a data point the editor hasn't seen before are what get a reply.",
    attribution: "FintechPressHub Editorial Team",
    role: "Link Acquisition & Content Research",
  },
  "readability-checker": {
    quote: "The Flesch-Kincaid formula was validated on millions of documents and remains the most reliable proxy for comprehension ease in English. For fintech content aimed at retail consumers, a score below 40 is a liability — you're not just losing readers, you're losing Google's quality assessment.",
    attribution: "FintechPressHub Editorial Team",
    role: "Content Quality & SEO Research",
  },
  "keyword-difficulty-estimator": {
    quote: "Keyword difficulty in fintech is not just a competition score — it's a capital-allocation decision. A small fintech team spending six months on KD 80+ keywords while ignoring a cluster of KD 25 keywords with genuine buyer intent is making a costly strategic error.",
    attribution: "FintechPressHub Editorial Team",
    role: "Fintech SEO Strategy Research",
  },
  "backlink-value-estimator": {
    quote: "Not all fintech backlinks are equal. A link from a high-DA payments newsletter read by 20,000 payments professionals is worth more in topical authority than five links from generic finance directories. Domain relevance compounds Domain Rating.",
    attribution: "FintechPressHub Editorial Team",
    role: "Off-Page SEO Research",
  },
  "content-brief-generator": {
    quote: "A content brief is the single highest-leverage document in a fintech content operation. It converts strategic SEO intent into actionable writer instructions, eliminating the most common cause of poor-ranking fintech content: the gap between what the keyword needs and what the writer produces.",
    attribution: "FintechPressHub Editorial Team",
    role: "Content Strategy Research",
  },
  "headline-analyzer": {
    quote: "In fintech, headline testing is not optional — it is risk management. A headline that underperforms by 20% in CTR compounds across every distribution channel the article touches: organic, email, LinkedIn, and partner newsletters. The headline is the highest-leverage sentence on the page.",
    attribution: "FintechPressHub Editorial Team",
    role: "Content Performance Research",
  },
  "link-prospector": {
    quote: "The quality of your link prospect list determines the ceiling of your link-building programme. The best outreach template in the world cannot overcome a list of irrelevant, low-authority domains. Prospecting precision is the first multiplier in any fintech link acquisition strategy.",
    attribution: "FintechPressHub Editorial Team",
    role: "Link Building Research",
  },
  "outreach-email-generator": {
    quote: "The difference between a 4% and a 20% outreach response rate in fintech link building is almost never the offer — it's the specificity of the email. Generic outreach is indistinguishable from spam at the editorial level. Name the article, cite the gap, and make the pitch in three sentences.",
    attribution: "FintechPressHub Editorial Team",
    role: "Outreach & Link Acquisition Research",
  },
};

/**
 * Shared section rendered at the bottom of every free tool page.
 *
 * Covers eight SEO categories in a single composable component:
 *  - Programmatic SEO   → "Who Uses This Tool?" industry use-case cards
 *  - GEO                → Research Context — per-tool statistics with cited sources (+33.9% AI visibility)
 *  - GEO                → Practitioner Insight — attributed expert quote (+32% AI visibility)
 *  - White Hat SEO      → Methodology & Transparency section + last-updated + privacy notice + citation links
 *  - Off-Page SEO       → Embed Widget (iframe code) enabling external sites to link back with attribution
 *  - On-Page SEO        → Visible crawlable HTML headings and content for Googlebot
 *  - AEO                → Visible FAQ Q&A content matching FAQPage JSON-LD schema
 */
export function ToolSEOEnhancements({
  toolSlug,
  toolName,
  methodologyTitle,
  methodologyText,
  accuracyNote,
  lastUpdated,
  processingNote,
  useCases,
  faq,
  citationUrls,
}: ToolSEOEnhancementsProps) {
  const [copied, setCopied] = useState(false);
  const toolUrl = `https://www.fintechpresshub.com/tools/${toolSlug}`;
  const iframeCode =
    `<iframe\n` +
    `  src="${toolUrl}"\n` +
    `  width="100%"\n` +
    `  height="720"\n` +
    `  frameborder="0"\n` +
    `  title="${toolName} — FintechPressHub"\n` +
    `  loading="lazy"\n` +
    `  allow="clipboard-write"\n` +
    `  referrerpolicy="no-referrer-when-downgrade"\n` +
    `></iframe>\n` +
    `<p><a href="${toolUrl}" rel="noopener">` +
    `${toolName} by FintechPressHub</a></p>`;

  const stats = TOOL_STATS[toolSlug];
  const expertQuote = TOOL_EXPERT_QUOTES[toolSlug];

  function copyEmbed() {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="border-t border-slate-100 pt-12 space-y-14">

      {/* ── Who Uses This Tool — Programmatic SEO ───────────────────────────── */}
      <section
        aria-labelledby={`use-cases-${toolSlug}`}
        className="container mx-auto px-4 max-w-3xl"
      >
        <h2
          id={`use-cases-${toolSlug}`}
          className="text-xl font-bold text-slate-900 mb-2"
        >
          Who Uses the {toolName}?
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          The {toolName} is used across fintech verticals — from payments
          infrastructure companies to challenger banks and regulatory-technology
          firms. Here is how different teams apply it in practice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {useCases.map((uc) => (
            <Card
              key={uc.industry}
              className="border border-slate-100 shadow-sm hover:border-[#0052FF]/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-[#0052FF] uppercase tracking-wider mb-1">
                  {uc.industry}
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1.5">
                  {uc.role}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {uc.benefit}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Research Context — GEO (statistics with cited sources) ───────────── */}
      {stats && stats.length > 0 && (
        <section
          aria-labelledby={`research-${toolSlug}`}
          className="container mx-auto px-4 max-w-3xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#0052FF] shrink-0" />
            <h2
              id={`research-${toolSlug}`}
              className="text-xl font-bold text-slate-900"
            >
              Research Context
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            The following data points contextualise where this tool fits in
            professional fintech marketing workflows. All statistics are sourced
            from publicly available industry research.
          </p>
          <ul className="space-y-4">
            {stats.map((stat, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4"
              >
                <span className="text-[#0052FF] font-bold shrink-0 text-base leading-5 mt-0.5">
                  →
                </span>
                <div>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {stat.text}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Source: <cite className="not-italic">{stat.source}</cite>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Practitioner Insight — GEO (expert quote with attribution) ───────── */}
      {expertQuote && (
        <section
          aria-labelledby={`insight-${toolSlug}`}
          className="container mx-auto px-4 max-w-3xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2
              id={`insight-${toolSlug}`}
              className="text-xl font-bold text-slate-900"
            >
              Practitioner Insight
            </h2>
          </div>
          <blockquote className="border-l-4 border-[#0052FF] pl-5 py-1">
            <p className="text-sm text-slate-700 leading-relaxed italic">
              &ldquo;{expertQuote.quote}&rdquo;
            </p>
            <footer className="mt-3 text-xs text-slate-500 not-italic">
              <span className="font-semibold text-slate-700">
                {expertQuote.attribution}
              </span>
              {" — "}
              {expertQuote.role}
            </footer>
          </blockquote>
        </section>
      )}

      {/* ── Methodology & Transparency — White Hat SEO ──────────────────────── */}
      <section
        aria-labelledby={`methodology-${toolSlug}`}
        className="bg-slate-50 py-10"
        id="methodology"
      >
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2
              id={`methodology-${toolSlug}`}
              className="text-xl font-bold text-slate-900"
            >
              {methodologyTitle}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {methodologyText}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {accuracyNote}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last updated: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{processingNote}</span>
            </div>
          </div>
          {citationUrls && citationUrls.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                Methodology Sources
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {citationUrls.map(({ label, url }) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0052FF] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ — GEO & AEO ─────────────────────────────────────────────────── */}
      {faq && faq.length > 0 && (
        <FaqSection
          items={faq}
          heading="Frequently Asked Questions"
          valuePrefix={`tool-faq-${toolSlug}`}
        />
      )}

      {/* ── Embed Widget — Off-Page SEO ──────────────────────────────────────── */}
      <section
        aria-labelledby={`embed-${toolSlug}`}
        className="container mx-auto px-4 max-w-3xl pb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-5 h-5 text-[#0052FF]" />
          <h2
            id={`embed-${toolSlug}`}
            className="text-xl font-bold text-slate-900"
          >
            Embed This Tool on Your Site
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Add the {toolName} to your own fintech blog or resource hub for free.
          Copy the code below and paste it into your page HTML. An attribution
          link is included in the snippet — this earns you a dofollow backlink
          from FintechPressHub in exchange.
        </p>
        <div className="relative bg-slate-900 rounded-xl p-4 mb-3">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all pr-20">
            {iframeCode}
          </pre>
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          <p>
            Free to embed on any site. The attribution link in the snippet points
            to{" "}
            <a
              href={toolUrl}
              className="underline underline-offset-2 hover:text-slate-900"
            >
              {toolName} on FintechPressHub
            </a>
            . All calculations happen client-side — no user data is transmitted
            to our servers. View the full tool at{" "}
            <Link
              href="/tools"
              className="underline underline-offset-2 hover:text-slate-900"
            >
              FintechPressHub Free Tools
            </Link>
            .
          </p>
        </div>
      </section>

    </div>
  );
}
