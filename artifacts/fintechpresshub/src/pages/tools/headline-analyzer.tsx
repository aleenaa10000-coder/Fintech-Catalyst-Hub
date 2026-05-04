import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Newspaper,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  Target,
  Zap,
  Ruler,
  RefreshCw,
  BarChart2,
} from "lucide-react";

const FINTECH_KEYWORDS = [
  "fintech", "banking", "payments", "lending", "credit", "loan", "mortgage",
  "insurance", "insuretech", "regtech", "wealthtech", "neobank", "digital bank",
  "open banking", "embedded finance", "crypto", "blockchain", "defi", "nft",
  "stablecoin", "cbdc", "kyc", "aml", "compliance", "regulation", "api",
  "b2b", "b2c", "saas", "sme", "revenue", "roi", "cac", "ltv", "arr", "mrr",
  "ipo", "vc", "startup", "scale", "growth", "funding", "investor",
  "transaction", "fraud", "security", "authentication", "identity",
  "wallet", "transfer", "remittance", "fx", "currency", "exchange",
  "account", "savings", "investment", "portfolio", "asset", "wealth",
  "data", "ai", "machine learning", "automation", "platform",
];

// ── Fintech Power Word Dictionary ─────────────────────────────────────────
// Words are grouped by signal type. Fintech-specific words score higher
// than generic structural words because they resonate directly with
// financial decision-makers evaluating authority, ROI, and risk.

const FINTECH_AUTHORITY_WORDS = [
  "regulated", "compliant", "compliance", "secure", "security", "blueprint",
  "verified", "certified", "licensed", "audited", "trusted", "institutional",
  "fiduciary", "sovereign", "accredited", "endorsed", "standards",
  "framework", "governance", "transparent",
];

const FINTECH_GROWTH_WORDS = [
  "scalable", "roi", "liquidity", "expansion", "untapped", "yield",
  "compounding", "revenue", "portfolio", "alpha", "outperform", "capitalize",
  "accelerate", "profitable", "high-growth", "upside", "valuation",
  "arbitrage", "diversify", "compound",
];

const FINTECH_URGENCY_WORDS = [
  "critical", "warning", "shift", "deadline", "fraud", "breach", "risk",
  "volatile", "disruption", "imminent", "exploit", "vulnerability",
  "exposure", "crackdown", "collapse", "penalty", "sanction", "overhaul",
];

// Generic structural power words (lower weight than fintech-specific)
const GENERIC_POWER_WORDS = [
  "essential", "proven", "ultimate", "top", "best",
  "secret", "surprising", "powerful", "effective", "hidden", "revealed",
  "new", "now", "today", "fast", "quick", "simple",
  "complete", "definitive", "guide", "checklist", "playbook",
  "strategy", "tactics", "insight", "research", "study", "data",
  "report", "analysis", "trend", "future", "predict", "transform",
];

const ALL_FINTECH_POWER_WORDS = [
  ...FINTECH_AUTHORITY_WORDS,
  ...FINTECH_GROWTH_WORDS,
  ...FINTECH_URGENCY_WORDS,
];

// ── Topical Cluster Map ────────────────────────────────────────────────────
// When a primary fintech keyword is detected, suggest 2-3 semantically
// related terms the writer should consider including for topical authority.
// Keys must be lowercase and match entries in FINTECH_KEYWORDS above.
const TOPICAL_CLUSTERS: Record<string, string[]> = {
  "payments":          ["cross-border", "settlement", "acquiring"],
  "sme":               ["lending", "working capital", "invoice financing"],
  "open banking":      ["PSD2", "account aggregation", "API connectivity"],
  "crypto":            ["DeFi", "custody", "blockchain"],
  "blockchain":        ["smart contracts", "tokenization", "DLT"],
  "defi":              ["liquidity pools", "yield farming", "protocol"],
  "lending":           ["underwriting", "credit risk", "origination"],
  "kyc":               ["AML", "onboarding", "identity verification"],
  "aml":               ["KYC", "transaction monitoring", "sanctions screening"],
  "neobank":           ["embedded finance", "BaaS", "digital-first"],
  "digital bank":      ["BaaS", "core banking", "API-first"],
  "insurance":         ["underwriting", "claims automation", "parametric"],
  "insuretech":        ["parametric", "claims automation", "embedded insurance"],
  "regtech":           ["compliance automation", "reporting", "KYC"],
  "fraud":             ["authentication", "identity proofing", "chargeback"],
  "wealth":            ["portfolio management", "robo-advisor", "asset allocation"],
  "wealthtech":        ["robo-advisor", "portfolio rebalancing", "alternative assets"],
  "remittance":        ["FX", "cross-border", "correspondent banking"],
  "embedded finance":  ["BaaS", "non-bank", "API-led"],
  "cbdc":              ["digital currency", "monetary policy", "programmable money"],
  "stablecoin":        ["peg mechanism", "collateral", "CBDC"],
  "fintech":           ["embedded finance", "open banking", "regulatory compliance"],
  "banking":           ["core banking", "digital transformation", "BaaS"],
  "compliance":        ["RegTech", "audit trail", "sanctions screening"],
  "regulation":        ["compliance framework", "licensing", "regulatory capital"],
  "funding":           ["venture debt", "growth equity", "runway"],
  "startup":           ["seed round", "product-market fit", "burn rate"],
  "ai":                ["machine learning", "predictive analytics", "model governance"],
  "automation":        ["straight-through processing", "workflow orchestration", "RPA"],
  "identity":          ["biometrics", "liveness detection", "KYC"],
  "wallet":            ["digital wallet", "stored value", "tokenized payments"],
  "investment":        ["asset allocation", "portfolio construction", "ESG"],
  "credit":            ["credit scoring", "underwriting", "bureau data"],
  "mortgage":          ["LTV ratio", "underwriting", "affordability assessment"],
  "fx":                ["hedging", "cross-border", "treasury management"],
};

const VAGUE_WORDS = [
  "things", "stuff", "ways", "some", "certain", "various", "several",
  "many", "lots", "really", "very", "quite", "rather", "somewhat",
  "interesting", "important", "good", "great", "better", "best practice",
];

type ScoreDimension = {
  label: string;
  score: number;
  max: number;
  icon: React.ElementType;
  color: string;
  feedback: string;
  tip: string;
  /** Topical authority hint — only populated by the Keyword Presence dimension */
  topicalHint?: {
    detectedKeyword: string;
    suggestions: string[];
  };
};

type Analysis = {
  headline: string;
  charCount: number;
  wordCount: number;
  overallScore: number;
  verdict: string;
  verdictColor: string;
  dimensions: ScoreDimension[];
  rewrites: { label: string; text: string }[];
  flags: string[];
};

function scoreCharCount(h: string): ScoreDimension {
  const n = h.length;
  let score: number;
  let feedback: string;
  let tip: string;
  if (n >= 50 && n <= 70) {
    score = 25;
    feedback = `${n} characters — ideal range for SEO (50–70).`;
    tip = "Character count is already in the sweet spot. Keep it.";
  } else if (n >= 40 && n < 50) {
    score = 18;
    feedback = `${n} characters — slightly short. Target 50–70.`;
    tip = "Add a specific detail (a number, a context qualifier, or a fintech keyword) to reach 50+ characters.";
  } else if (n > 70 && n <= 80) {
    score = 18;
    feedback = `${n} characters — slightly long. Search engines may truncate above 70.`;
    tip = "Remove an adjective or qualifier to tighten it. Every word must earn its place.";
  } else if (n > 80 && n <= 100) {
    score = 10;
    feedback = `${n} characters — too long. Likely truncated in SERPs.`;
    tip = "Cut any phrase that doesn't add meaning. Aim for one strong idea, not two.";
  } else if (n < 40 && n > 0) {
    score = 10;
    feedback = `${n} characters — too short. Headlines under 40 chars tend to lack context.`;
    tip = "Expand with your target audience, a benefit, or a specific timeframe (e.g. 'in 2025').";
  } else {
    score = 0;
    feedback = "No headline entered.";
    tip = "Enter a headline above.";
  }
  return {
    label: "Character Count",
    score,
    max: 25,
    icon: Ruler,
    color: score >= 22 ? "emerald" : score >= 14 ? "amber" : "red",
    feedback,
    tip,
  };
}

function scoreClarity(h: string): ScoreDimension {
  const lower = h.toLowerCase();
  const words = lower.split(/\s+/);
  const vagueCount = VAGUE_WORDS.filter((w) => lower.includes(w)).length;
  const longWordCount = words.filter((w) => w.length > 14).length;
  const isPassive =
    /\b(is|are|was|were|be|been|being)\b.{0,20}\b(ed|en)\b/.test(lower);

  let score = 25;
  const issues: string[] = [];

  if (vagueCount >= 2) { score -= 10; issues.push(`vague word(s) detected`); }
  else if (vagueCount === 1) { score -= 5; issues.push(`one vague word detected`); }
  if (longWordCount >= 2) { score -= 7; issues.push(`${longWordCount} complex words (>14 chars)`); }
  else if (longWordCount === 1) { score -= 3; issues.push("one complex word"); }
  if (isPassive) { score -= 5; issues.push("passive voice detected"); }
  score = Math.max(score, 0);

  const feedback =
    issues.length > 0
      ? `Issues: ${issues.join(", ")}.`
      : "Headline reads clearly — active voice, no vague filler.";
  const tip =
    vagueCount > 0
      ? "Replace vague words with specific outcomes or figures."
      : isPassive
      ? "Rewrite in active voice: subject → verb → object."
      : longWordCount > 0
      ? "Replace complex words with simpler synonyms where possible."
      : "Clarity is strong. No changes needed.";

  return {
    label: "Clarity",
    score,
    max: 25,
    icon: Target,
    color: score >= 22 ? "emerald" : score >= 14 ? "amber" : "red",
    feedback,
    tip,
  };
}

function scoreFintechKeyword(h: string): ScoreDimension {
  const lower = h.toLowerCase();
  const matched = FINTECH_KEYWORDS.filter((kw) => lower.includes(kw));
  let score: number;
  let feedback: string;
  let tip: string;
  let topicalHint: ScoreDimension["topicalHint"];

  // Find the most specific matched keyword that has a topical cluster
  // (longer keyword = more specific, so sort by length descending)
  const primaryKeyword =
    [...matched].sort((a, b) => b.length - a.length).find((kw) => TOPICAL_CLUSTERS[kw]) ??
    matched[0] ??
    null;

  if (matched.length >= 2) {
    score = 25;
    feedback = `Strong fintech signal — "${matched.slice(0, 2).join('", "')}" detected.`;
    tip = "Good. Ensure the primary keyword appears within the first 3 words if possible.";
  } else if (matched.length === 1) {
    score = 18;
    feedback = `One fintech keyword detected: "${matched[0]}".`;
    tip = "Add a second relevant term to strengthen topical signal (e.g. a sector, a role, or a technology).";
  } else {
    score = 5;
    feedback = "No recognisable fintech keywords found.";
    tip = "Add your primary keyword explicitly — search engines and readers use it to judge relevance instantly.";
  }

  // Build topical authority hint for the detected primary keyword
  if (primaryKeyword && TOPICAL_CLUSTERS[primaryKeyword]) {
    const clusterTerms = TOPICAL_CLUSTERS[primaryKeyword]!;
    // Only suggest terms not already present in the headline
    const missing = clusterTerms.filter((t) => !lower.includes(t.toLowerCase()));
    if (missing.length > 0) {
      topicalHint = {
        detectedKeyword: primaryKeyword,
        suggestions: missing.slice(0, 3),
      };
    }
  }

  return {
    label: "Keyword Presence",
    score,
    max: 25,
    icon: TrendingUp,
    color: score >= 22 ? "emerald" : score >= 14 ? "amber" : "red",
    feedback,
    tip,
    topicalHint,
  };
}

function scoreEmotionalPull(h: string): ScoreDimension {
  const lower = h.toLowerCase();
  const hasNumber = /\d/.test(h);
  const hasQuestion = h.includes("?");
  const hasBracket = /[\[\(]/.test(h);
  const hasColon = h.includes(":");

  // Count fintech-specific power words (higher value signal)
  const authorityHits = FINTECH_AUTHORITY_WORDS.filter((w) => lower.includes(w));
  const growthHits    = FINTECH_GROWTH_WORDS.filter((w) => lower.includes(w));
  const urgencyHits   = FINTECH_URGENCY_WORDS.filter((w) => lower.includes(w));
  const fintechCount  = authorityHits.length + growthHits.length + urgencyHits.length;

  // Count generic power words (lower value)
  const genericCount = GENERIC_POWER_WORDS.filter((w) => lower.includes(w)).length;

  let score = 0;
  const signals: string[] = [];

  // Structural engagement signals
  if (hasNumber)   { score += 8; signals.push("number"); }
  if (hasQuestion) { score += 6; signals.push("question"); }
  if (hasBracket)  { score += 4; signals.push("bracket/parenthetical"); }
  if (hasColon)    { score += 4; signals.push("colon structure"); }

  // Fintech power words: 5 pts each, +3 bonus for 2+ (decision-maker resonance)
  if (fintechCount >= 2) {
    score += fintechCount * 5 + 3;
    const categories: string[] = [];
    if (authorityHits.length) categories.push(`authority (${authorityHits.join(", ")})`);
    if (growthHits.length)    categories.push(`growth (${growthHits.join(", ")})`);
    if (urgencyHits.length)   categories.push(`urgency (${urgencyHits.join(", ")})`);
    signals.push(`fintech power words — ${categories.join("; ")}`);
  } else if (fintechCount === 1) {
    score += 5;
    const hit = [...authorityHits, ...growthHits, ...urgencyHits][0]!;
    signals.push(`fintech power word (${hit})`);
  } else if (genericCount >= 2) {
    score += 7; signals.push(`${genericCount} power words`);
  } else if (genericCount === 1) {
    score += 3; signals.push("1 power word");
  }

  score = Math.min(score, 25);

  const feedback =
    signals.length > 0
      ? `Engagement signals: ${signals.join(", ")}.`
      : "No strong engagement signals found.";

  const tip =
    !hasNumber
      ? "Add a specific number — e.g. '5 Ways', '3 Mistakes', '$2.4B Market'. Numbers boost click-through rates."
      : fintechCount === 0
      ? "Use power words that signal authority or growth to resonate with financial decision-makers — e.g. 'Regulated', 'Scalable', 'ROI', 'Compliant', 'Fraud'."
      : !hasColon && !hasBracket
      ? "Consider a colon or bracket structure: 'Topic: What You Need to Know' or 'Headline [2025 Edition]'."
      : "Emotional pull is strong. No changes needed.";

  return {
    label: "Emotional Pull",
    score,
    max: 25,
    icon: Zap,
    color: score >= 22 ? "emerald" : score >= 14 ? "amber" : "red",
    feedback,
    tip,
  };
}

function generateRewrites(h: string): { label: string; text: string }[] {
  const trimmed = h.trim();
  const hasNumber = /\d/.test(trimmed);
  const hasQuestion = trimmed.includes("?");
  const lower = trimmed.toLowerCase();
  const matchedKw = FINTECH_KEYWORDS.find((kw) => lower.includes(kw)) ?? "fintech";
  const capKw = matchedKw.charAt(0).toUpperCase() + matchedKw.slice(1);

  const stripped = trimmed.replace(/^(how to|why|what is|the|a |an )/i, "").replace(/[?!.]$/, "").trim();
  const strippedCap = stripped.charAt(0).toUpperCase() + stripped.slice(1);

  return [
    {
      label: "Data-forward",
      text: hasNumber
        ? `${trimmed.replace(/\?$/, "")} — Here's What the Data Shows`
        : `The ${capKw} Numbers Every Fintech Team Should Know: ${strippedCap}`,
    },
    {
      label: "Question / curiosity",
      text: hasQuestion
        ? `${trimmed} (And What Smart ${capKw} Teams Do About It)`
        : `Is Your ${capKw} Strategy Ready for 2025? ${strippedCap} Explained`,
    },
    {
      label: "Benefit-forward",
      text: `How to ${strippedCap}: A Practical Guide for ${capKw} Teams`,
    },
  ];
}

function analyzeHeadline(headline: string): Analysis {
  const dims = [
    scoreCharCount(headline),
    scoreClarity(headline),
    scoreFintechKeyword(headline),
    scoreEmotionalPull(headline),
  ];
  const overall = dims.reduce((s, d) => s + d.score, 0);

  let verdict: string;
  let verdictColor: string;
  if (overall >= 85) { verdict = "Excellent — publish-ready headline."; verdictColor = "emerald"; }
  else if (overall >= 70) { verdict = "Good — minor tweaks will push it further."; verdictColor = "blue"; }
  else if (overall >= 50) { verdict = "Average — a few specific improvements needed."; verdictColor = "amber"; }
  else { verdict = "Needs work — consider one of the rewrites below."; verdictColor = "red"; }

  const flags: string[] = [];
  if (headline.length > 80) flags.push("Likely truncated in Google search results");
  if (/click here|read more|find out/i.test(headline)) flags.push("Contains weak CTA language ('click here', 'read more')");
  if (/^(the|a|an) /i.test(headline)) flags.push("Starts with an article ('The', 'A') — consider front-loading the keyword");
  if (/!!/.test(headline)) flags.push("Multiple exclamation marks look spammy");
  if (headline.toUpperCase() === headline && headline.length > 5) flags.push("ALL CAPS reduces credibility and trust");

  return {
    headline,
    charCount: headline.length,
    wordCount: headline.trim().split(/\s+/).filter(Boolean).length,
    overallScore: overall,
    verdict,
    verdictColor,
    dimensions: dims,
    rewrites: generateRewrites(headline),
    flags,
  };
}

const COLOR_MAP: Record<string, { bg: string; text: string; bar: string; badge: string }> = {
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    bar: "bg-red-400",
    badge: "bg-red-100 text-red-700",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
  },
};

export default function HeadlineAnalyzer() {
  const [headline, setHeadline] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const scoreBreakdownRef = useRef<HTMLDivElement>(null);

  const analyze = () => {
    if (headline.trim().length < 5) return;
    setResult(analyzeHeadline(headline.trim()));
  };

  const reset = () => {
    setHeadline("");
    setResult(null);
  };

  const copyRewrite = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const checkRewriteScore = (text: string) => {
    setHeadline(text);
    setResult(analyzeHeadline(text));
    setTimeout(() => {
      scoreBreakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const canAnalyze = headline.trim().length >= 5;

  const verdictColors = result ? COLOR_MAP[result.verdictColor] : null;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="headlineAnalyzer" />

      <PageHero
        eyebrow="Free Tool"
        title="Headline Analyzer"
        description="Paste any fintech article headline to get a score across clarity, keyword presence, emotional pull, and character count — with rewrite suggestions tailored to fintech audiences."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Headline Analyzer</h2>
                    <p className="text-xs text-muted-foreground">Scored out of 100 across 4 dimensions.</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="space-y-3 mb-5">
                <Label className="text-sm font-semibold text-slate-700">Your Headline</Label>
                <textarea
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && canAnalyze) {
                      e.preventDefault();
                      analyze();
                    }
                  }}
                  placeholder="e.g. How Open Banking Is Changing the Payments Landscape in 2025"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-slate-800 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {headline.length} characters · {headline.trim().split(/\s+/).filter(Boolean).length} words
                    {headline.length > 0 && headline.length < 50 && (
                      <span className="ml-2 text-amber-600">· {50 - headline.length} chars to ideal minimum</span>
                    )}
                    {headline.length > 70 && (
                      <span className="ml-2 text-red-500">· {headline.length - 70} chars over ideal maximum</span>
                    )}
                  </p>
                </div>
              </div>

              <Button
                onClick={analyze}
                disabled={!canAnalyze}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Headline
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {result && verdictColors && (
              <motion.div
                key={result.headline}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                {/* Score */}
                <Card className={`border shadow-sm border-slate-100`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="relative w-24 h-24 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9"
                            fill="none"
                            stroke={
                              result.verdictColor === "emerald"
                                ? "#10b981"
                                : result.verdictColor === "blue"
                                ? "#3b82f6"
                                : result.verdictColor === "amber"
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                            strokeWidth="3"
                            strokeDasharray={`${result.overallScore} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold text-slate-900 leading-none">{result.overallScore}</span>
                          <span className="text-[10px] text-muted-foreground">/ 100</span>
                        </div>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${verdictColors.text} mb-1`}>{result.verdict}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Analysed: <span className="italic text-slate-600">"{result.headline}"</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.charCount} characters · {result.wordCount} words
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimension breakdown */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h4 ref={scoreBreakdownRef} className="text-sm font-semibold text-slate-900">Score Breakdown</h4>
                    {result.dimensions.map((dim, i) => {
                      const c = COLOR_MAP[dim.color];
                      const pct = Math.round((dim.score / dim.max) * 100);
                      return (
                        <motion.div
                          key={dim.label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <dim.icon className={`w-3.5 h-3.5 ${c.text}`} />
                              <span className="text-xs font-semibold text-slate-700">{dim.label}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                              {dim.score} / {dim.max}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.07 }}
                              className={`h-full rounded-full ${c.bar}`}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{dim.feedback}</p>
                          <p className={`text-[11px] font-medium ${c.text} leading-snug`}>
                            Tip: {dim.tip}
                          </p>
                          {dim.topicalHint && (
                            <div className="mt-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
                                Topical Authority
                              </p>
                              <p className="text-[11px] text-blue-800 leading-snug">
                                To deepen topical coverage around <strong>"{dim.topicalHint.detectedKeyword}"</strong>, consider including:{" "}
                                {dim.topicalHint.suggestions.map((s, i) => (
                                  <span key={s}>
                                    <span className="font-medium">{s}</span>
                                    {i < dim.topicalHint!.suggestions.length - 1 ? ", " : "."}
                                  </span>
                                ))}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Flags */}
                {result.flags.length > 0 && (
                  <Card className="border border-amber-100 bg-amber-50 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Watch Out For
                      </h4>
                      {result.flags.map((f, i) => (
                        <p key={i} className="text-xs text-amber-700 flex gap-2 items-start">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          {f}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Rewrites */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-600" /> Rewrite Suggestions
                    </h4>
                    {result.rewrites.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start justify-between gap-3 px-3 py-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">{r.label}</p>
                          <p className="text-sm text-slate-800 leading-snug">{r.text}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            onClick={() => checkRewriteScore(r.text)}
                            className="text-muted-foreground hover:text-indigo-600 transition-colors"
                            title="Check score"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => copyRewrite(r.text, i)}
                            className="text-muted-foreground hover:text-indigo-600 transition-colors"
                            title="Copy"
                          >
                            {copied === i ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Want a professional writer to craft and test headlines for your fintech content?{" "}
                      <Link href="/services" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        See our content services
                      </Link>{" "}
                      or{" "}
                      <Link href="/contact" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        get in touch
                      </Link>
                      .
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
