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
  Users,
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

// ── Audience Jargon Dictionaries ──────────────────────────────────────────
// Expert/CTO tier: deep technical, architecture, and protocol terminology.
// Each match adds 2 jargon points.
const EXPERT_JARGON_TERMS = [
  "api layer", "interoperable", "protocol", "microservice", "orchestration",
  "sdk", "webhook", "distributed ledger", "zero-knowledge", "cryptographic",
  "tokenization", "latency", "throughput", "middleware", "idempotent",
  "asynchronous", "event-driven", "consensus mechanism", "smart contract",
  "merkle", "sharding", "layer 2", "rollup", "iso 20022", "swift gpi",
  "rtgs", "oauth", "pki", "mutual tls", "graphql", "grpc", "kubernetes",
  "cicd", "message queue", "event sourcing", "cqrs", "rate limiting",
  "circuit breaker", "data pipeline", "reconciliation engine",
];
// Practitioner tier: industry-standard fintech acronyms and professional terms.
// Each match adds 1 jargon point.
const PRACTITIONER_JARGON_TERMS = [
  "api", "baas", "kyc", "aml", "psd2", "saas", "cbdc", "defi",
  "robo-advisor", "neobank", "regtech", "insuretech", "wealthtech",
  "b2b", "roi", "arr", "mrr", "cac", "ltv", "bnpl", "p2p",
  "embedded finance", "open banking", "blockchain", "crypto",
  "stablecoin", "ipo", "vc", "sme", "fintech", "regulation",
  "compliance", "underwriting", "securitisation", "liquidity",
  "yield", "collateral", "portfolio", "arbitrage", "chargeback",
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
  /** Character ruler data — only populated by the Character Count dimension */
  charMarkers?: {
    count: number;
    isSweetSpot: boolean;
    truncationWarning: boolean;
  };
  /** Audience calibration gauge — only populated by the Audience Match dimension */
  audienceMatch?: {
    tier: "General/Business" | "Practitioner" | "Expert/CTO";
    jargonScore: number;
    expertTerms: string[];
    practitionerTerms: string[];
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
  let isSweetSpot = false;
  let truncationWarning = false;

  if (n >= 50 && n <= 60) {
    score = 25;
    isSweetSpot = true;
    feedback = `${n} characters — sweet spot for SEO (50–60).`;
    tip = "Perfect length. Google displays this in full across all devices.";
  } else if (n > 60 && n <= 70) {
    score = 20;
    truncationWarning = true;
    feedback = `${n} characters — slightly over the 60-char SEO threshold.`;
    tip = "Trim 1–3 words to bring it under 60 characters and avoid Google truncation.";
  } else if (n > 70 && n <= 80) {
    score = 14;
    truncationWarning = true;
    feedback = `${n} characters — likely truncated in Google Search Results.`;
    tip = "Remove an adjective or qualifier. Aim for one strong idea per headline.";
  } else if (n > 80) {
    score = 8;
    truncationWarning = true;
    feedback = `${n} characters — too long. Will be cut off in SERPs and browser tabs.`;
    tip = "Cut any phrase that doesn't add meaning. Aim for under 60 characters.";
  } else if (n >= 40 && n < 50) {
    score = 18;
    feedback = `${n} characters — slightly short. Target 50–60 for the sweet spot.`;
    tip = "Add a specific detail (a number, a context qualifier, or a fintech keyword) to reach 50+ characters.";
  } else if (n > 0) {
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
    color: isSweetSpot ? "emerald" : score >= 17 ? "amber" : "red",
    feedback,
    tip,
    charMarkers: n > 0 ? { count: n, isSweetSpot, truncationWarning } : undefined,
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

// ── Audience Match ────────────────────────────────────────────────────────
// Scores jargon density to classify the headline's calibrated audience tier.
// Expert terms score 2 pts each; practitioner terms score 1 pt each.
// This dimension is informational only — score/max are 0 and excluded from
// the overall 100-pt total.
function scoreAudienceMatch(h: string): ScoreDimension {
  const lower = h.toLowerCase();

  const expertFound   = EXPERT_JARGON_TERMS.filter((t) => lower.includes(t));
  const practFound    = PRACTITIONER_JARGON_TERMS.filter((t) => lower.includes(t));
  const jargonScore   = expertFound.length * 2 + practFound.length;

  let tier: "General/Business" | "Practitioner" | "Expert/CTO";
  let color: string;
  let feedback: string;
  let tip: string;

  if (jargonScore >= 4 || expertFound.length >= 1) {
    tier     = "Expert/CTO";
    color    = "violet";
    feedback = expertFound.length > 0
      ? `Expert-level terms detected: "${expertFound.slice(0, 2).join('", "')}".`
      : `High jargon density (${jargonScore} pts) — signals deep technical fluency.`;
    tip = "This headline is perfectly calibrated for Expert/CTO readers. For a wider reach, consider a simpler companion headline for general audiences.";
  } else if (jargonScore >= 2) {
    tier     = "Practitioner";
    color    = "blue";
    feedback = `Industry-standard terms detected: "${practFound.slice(0, 2).join('", "')}".`;
    tip = "This headline is perfectly calibrated for Practitioner readers — finance professionals and product managers will find it immediately relevant.";
  } else {
    tier     = "General/Business";
    color    = "emerald";
    feedback = practFound.length > 0
      ? `Light jargon detected ("${practFound[0]}") — accessible to most business readers.`
      : "No dense jargon detected — clear and accessible to a broad business audience.";
    tip = "This headline is perfectly calibrated for General/Business readers. If targeting specialist decision-makers, consider adding one industry-specific term.";
  }

  return {
    label: "Audience Match",
    score: 0,
    max: 0,
    icon: Users,
    color,
    feedback,
    tip,
    audienceMatch: { tier, jargonScore, expertTerms: expertFound, practitionerTerms: practFound },
  };
}

function generateRewrites(h: string): { label: string; text: string }[] {
  const trimmed = h.trim();
  const lower = trimmed.toLowerCase();
  const hasNumber = /\d/.test(trimmed);

  // Primary keyword — prefer the longest match that has a topical cluster
  const matched = FINTECH_KEYWORDS.filter((kw) => lower.includes(kw));
  const primaryKw =
    [...matched].sort((a, b) => b.length - a.length).find((kw) => TOPICAL_CLUSTERS[kw]) ??
    matched[0] ??
    "fintech";
  const capKw = primaryKw.charAt(0).toUpperCase() + primaryKw.slice(1);

  // Deterministic variation seed so different headlines get different templates
  const seed = (trimmed.length + primaryKw.length) % 3;

  // ── The Authority Vibe ────────────────────────────────────────────────────
  // Uses words like "Verified", "Blueprint", "Framework" to signal credibility
  const authorityTemplates = [
    `The Verified ${capKw} Blueprint: A Compliance-First Framework for 2025`,
    `${capKw} Governance, Decoded: A Certified Framework for Growing Teams`,
    `Building a Trusted ${capKw} Stack: The Accredited Playbook for Scale`,
  ];

  // ── The Disruptor Vibe ────────────────────────────────────────────────────
  // Uses words like "Shift", "Uncovered", "Evolution" to create urgency
  const disruptorTemplates = [
    `The ${capKw} Shift Nobody Saw Coming — and What It Means for Your Strategy`,
    `${capKw} Uncovered: How the Industry's Evolution Is Reshaping the Rules`,
    `Inside the ${capKw} Reckoning: What the Next Wave of Disruption Looks Like`,
  ];

  // ── The Data Vibe ─────────────────────────────────────────────────────────
  // Uses specific numbers, percentages, or "Report" findings
  const dataStats = ["73%", "5 in 10", "$2.4B", "3 Critical"][
    (trimmed.length + primaryKw.length) % 4
  ];
  const dataTemplates = [
    `New Report: ${dataStats} of ${capKw} Teams Are Missing This Growth Metric`,
    `${capKw} by the Numbers: What 2025 Data Reveals About Scaling Strategy`,
    hasNumber
      ? `${trimmed.replace(/[?!.]$/, "")} — Full Data Breakdown`
      : `The ${capKw} Benchmark Report: Key Metrics Every Leader Must Track`,
  ];

  return [
    { label: "The Authority Vibe", text: authorityTemplates[seed] },
    { label: "The Disruptor Vibe", text: disruptorTemplates[seed] },
    { label: "The Data Vibe",      text: dataTemplates[seed] },
  ];
}

function analyzeHeadline(headline: string): Analysis {
  const scoringDims = [
    scoreCharCount(headline),
    scoreClarity(headline),
    scoreFintechKeyword(headline),
    scoreEmotionalPull(headline),
  ];
  const overall = scoringDims.reduce((s, d) => s + d.score, 0);
  const dims = [...scoringDims, scoreAudienceMatch(headline)];

  let verdict: string;
  let verdictColor: string;
  if (overall >= 85) { verdict = "Excellent — publish-ready headline."; verdictColor = "emerald"; }
  else if (overall >= 70) { verdict = "Good — minor tweaks will push it further."; verdictColor = "blue"; }
  else if (overall >= 50) { verdict = "Average — a few specific improvements needed."; verdictColor = "amber"; }
  else { verdict = "Needs work — consider one of the rewrites below."; verdictColor = "red"; }

  const flags: string[] = [];
  const lower = headline.toLowerCase();
  const words = headline.trim().split(/\s+/).filter(Boolean);

  // ── Structure & length ───────────────────────────────────────────────────
  if (headline.length > 60)
    flags.push(`${headline.length} characters — over the 60-char Google SERP limit. Risk of truncation in search results.`);

  if (words.length > 12)
    flags.push(`${words.length} words — headlines over 12 words lose scannability. Aim for 8–10 words.`);

  if (/^(the|a|an) /i.test(headline))
    flags.push("Starts with an article ('The', 'A') — front-load the primary keyword instead for stronger SEO signal.");

  // ── Duplicate & repetition ───────────────────────────────────────────────
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^a-z]/g, "");
    if (key.length > 3) wordFreq[key] = (wordFreq[key] ?? 0) + 1;
  }
  const repeatedWords = Object.entries(wordFreq).filter(([, n]) => n >= 3);
  if (repeatedWords.length > 0)
    flags.push(`"${repeatedWords[0][0]}" appears ${repeatedWords[0][1]} times — deduplicate for a tighter, more scannable headline.`);

  if (/\b(\w+)\b.*\b\1\b.*\b\1\b/i.test(headline) === false) {
    // no triple-repeat — skip (already handled above)
  }

  // ── Keyword hygiene ──────────────────────────────────────────────────────
  const detectedKws = FINTECH_KEYWORDS.filter((kw) => lower.includes(kw));
  if (detectedKws.length >= 3)
    flags.push(`${detectedKws.length} fintech keywords detected (${detectedKws.slice(0, 3).join(", ")}) — risk of keyword stuffing. Pick one primary focus.`);

  // ── Clickbait & trust signals ────────────────────────────────────────────
  const clickbaitMatch = lower.match(/you won't believe|shocking|mind.blowing|incredible|unbelievable|jaw.dropping/);
  if (clickbaitMatch)
    flags.push(`Clickbait language detected ("${clickbaitMatch[0]}") — erodes trust with B2B fintech decision-makers.`);

  if (/click here|read more|find out more/i.test(headline))
    flags.push("Weak CTA language ('click here', 'read more') — state the value directly instead.");

  // ── Capitalisation ───────────────────────────────────────────────────────
  if (headline.toUpperCase() === headline && headline.length > 5)
    flags.push("Headline is ALL CAPS — inconsistent casing can hurt professional credibility. Use title or sentence case.");

  if (headline.toLowerCase() === headline && headline.length > 5)
    flags.push("Headline is all lowercase — inconsistent casing can hurt professional credibility. Use title or sentence case.");

  // ── Double punctuation ───────────────────────────────────────────────────
  if ((headline.match(/\?/g) ?? []).length > 1)
    flags.push("Multiple question marks detected — use one '?' maximum. Extra marks reduce professional credibility.");

  if ((headline.match(/!/g) ?? []).length > 1)
    flags.push("Multiple exclamation marks read as spammy — one or none is the professional standard.");

  // ── Vague & overused phrasing ────────────────────────────────────────────
  const vagueMatch = lower.match(/\b(things|stuff|some tips|various ways|a few things)\b/);
  if (vagueMatch)
    flags.push(`Vague filler detected ("${vagueMatch[0]}") — replace with a specific benefit, metric, or outcome.`);

  const overusedMatch = lower.match(/\b(you need to know|everything you need|what you need to know)\b/);
  if (overusedMatch)
    flags.push(`"${overusedMatch[0]}" is overused in fintech content — swap for a specific claim or data point.`);

  // ── Superlatives without proof ───────────────────────────────────────────
  if (/\b(best|top|greatest|most powerful|most important)\b/i.test(headline) && !/\d/.test(headline))
    flags.push("Superlative used ('best', 'top') without a number or qualifier — add specifics to back the claim (e.g. '5 Best…').");

  // ── Temporal freshness ───────────────────────────────────────────────────
  const timelyMatch = lower.match(/\b(trends?|predictions?|outlook|forecast|future of|what's next)\b/);
  if (timelyMatch && !/20\d{2}/.test(headline))
    flags.push(`"${timelyMatch[0]}" signals timeliness but no year is present — add '2025' to signal freshness to both readers and Google.`);

  // ── Question structure ───────────────────────────────────────────────────
  if (headline.endsWith("?") && !headline.includes(":") && !headline.includes("("))
    flags.push("Ends in a question with no resolution cue (no colon or parenthetical) — readers may skip without a hint of the answer.");

  // ── Passive voice ────────────────────────────────────────────────────────
  // Specific "is being used/adopted/driven by" pattern — suggest active rewrite
  const passivByMatch = headline.match(/\bis being (used|adopted|driven|shaped|dominated|led|replaced|disrupted) by\b/i);
  if (passivByMatch)
    flags.push(`Passive construction detected ("${passivByMatch[0]}") — rewrite in active voice, e.g. swap "Why X is Being Used by Banks" → "Why Banks Are Using X".`);

  // Passive opener (sentence starts with auxiliary verb)
  if (/^(is |are |was |were |has been |have been |being )/i.test(headline))
    flags.push("Starts in passive voice — lead with an active verb or the primary keyword for stronger impact and better SEO signal.");

  // "Why [Topic] is being…" pattern mid-headline
  if (/^why\b.+\bis being\b/i.test(headline) && !passivByMatch)
    flags.push(`"Why [Topic] is being…" is a passive construction — try "Why [Audience] Is Using [Topic]" to make it active and more search-friendly.`);

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
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    bar: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700",
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

              {/* ── Live Search Preview ─────────────────────────────────────── */}
              {headline.length > 0 && (() => {
                const SERP_LIMIT = 60;
                const isTruncated = headline.length > SERP_LIMIT;
                const displayTitle = isTruncated
                  ? headline.slice(0, SERP_LIMIT).trimEnd() + "..."
                  : headline;
                const slug = headline
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")
                  .slice(0, 48);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-1"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                      Google Search Preview
                    </p>
                    {/* Favicon + breadcrumb */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-200 bg-white text-[8px] font-bold shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </span>
                      <span className="text-[12px] text-slate-800 font-medium">fintechpresshub.com</span>
                      <span className="text-[12px] text-slate-400">›</span>
                      <span className="text-[12px] text-slate-800">blog</span>
                      <span className="text-[12px] text-slate-400">›</span>
                      <span className="text-[12px] text-slate-500 truncate max-w-[160px]">{slug || "article"}</span>
                    </div>
                    {/* Blue title */}
                    <p className="text-[18px] leading-snug font-normal text-[#1a0dab] hover:underline cursor-default break-words">
                      {displayTitle}
                    </p>
                    {/* Truncation callout */}
                    {isTruncated && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        Truncated at {SERP_LIMIT} chars — {headline.length - SERP_LIMIT} character{headline.length - SERP_LIMIT !== 1 ? "s" : ""} hidden from Google Search results.
                      </p>
                    )}
                    {/* Meta description */}
                    <p className="mt-1.5 text-[13px] text-slate-600 leading-snug line-clamp-2">
                      Explore expert fintech insights and analysis — published by FintechPressHub, your trusted source for fintech SEO and content marketing strategy.
                    </p>
                  </motion.div>
                );
              })()}

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
                              {dim.audienceMatch ? dim.audienceMatch.tier : `${dim.score} / ${dim.max}`}
                            </span>
                          </div>
                          {dim.audienceMatch ? (
                            /* ── Audience Match: three-segment calibration gauge ── */
                            <div className="space-y-1.5 mt-1">
                              {/* Segment track */}
                              <div className="flex gap-1 h-2">
                                {(["General/Business", "Practitioner", "Expert/CTO"] as const).map((tier) => {
                                  const active = dim.audienceMatch!.tier === tier;
                                  const segColor = tier === "Expert/CTO"
                                    ? active ? "bg-violet-500" : "bg-slate-100"
                                    : tier === "Practitioner"
                                    ? active ? "bg-blue-500" : "bg-slate-100"
                                    : active ? "bg-emerald-500" : "bg-slate-100";
                                  return (
                                    <motion.div
                                      key={tier}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: i * 0.07 + 0.2 }}
                                      className={`flex-1 rounded-full ${segColor} transition-colors`}
                                    />
                                  );
                                })}
                              </div>
                              {/* Tier labels */}
                              <div className="flex justify-between">
                                {(["General/Business", "Practitioner", "Expert/CTO"] as const).map((tier) => {
                                  const active = dim.audienceMatch!.tier === tier;
                                  return (
                                    <span
                                      key={tier}
                                      className={`text-[9px] font-semibold leading-tight ${
                                        active ? c.text : "text-slate-300"
                                      }`}
                                    >
                                      {tier}
                                    </span>
                                  );
                                })}
                              </div>
                              {/* Detected terms chips */}
                              {(dim.audienceMatch.expertTerms.length > 0 || dim.audienceMatch.practitionerTerms.length > 0) && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {dim.audienceMatch.expertTerms.slice(0, 3).map((t) => (
                                    <span key={t} className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                                      {t}
                                    </span>
                                  ))}
                                  {dim.audienceMatch.practitionerTerms.slice(0, 3).map((t) => (
                                    <span key={t} className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : dim.charMarkers ? (
                            /* ── Character Count: ruler bar with threshold markers ── */
                            <div className="space-y-0.5">
                              <div className="relative">
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(dim.charMarkers.count, 100)}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className={`relative h-full rounded-full overflow-hidden ${c.bar}`}
                                  >
                                    <div
                                      key={result.headline}
                                      className="absolute inset-0 animate-shimmer-bar bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                    />
                                  </motion.div>
                                </div>
                                {/* Tick lines sit on top of the track, outside overflow-hidden */}
                                {[30, 60, 90].map((mark) => (
                                  <div
                                    key={mark}
                                    className="absolute top-0 h-full w-px bg-slate-400/50"
                                    style={{ left: `${mark}%` }}
                                  />
                                ))}
                              </div>
                              {/* Marker labels */}
                              <div className="relative" style={{ height: "2.25rem" }}>
                                {[
                                  { pos: 30, chars: 30, label: "Browser Tab" },
                                  { pos: 60, chars: 60, label: "SEO" },
                                  { pos: 90, chars: 90, label: "Social" },
                                ].map(({ pos, chars, label }) => (
                                  <div
                                    key={label}
                                    className="absolute flex flex-col items-center"
                                    style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                                  >
                                    <span className="text-[9px] font-bold text-slate-500 leading-tight">{chars}</span>
                                    <span className="text-[8px] text-slate-400 leading-tight whitespace-nowrap">{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* ── Standard bar for all other dimensions ── */
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className={`relative h-full rounded-full overflow-hidden ${c.bar}`}
                              >
                                <div
                                  key={result.headline}
                                  className="absolute inset-0 animate-shimmer-bar bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                />
                              </motion.div>
                            </div>
                          )}
                          {/* Sweet Spot badge */}
                          {dim.charMarkers?.isSweetSpot && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <Check className="w-3 h-3" /> Sweet Spot
                            </span>
                          )}
                          {/* Truncation warning */}
                          {dim.charMarkers?.truncationWarning && (
                            <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" /> Risk of truncation in Google Search Results.
                            </p>
                          )}
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
                          <p className={`text-[10px] font-semibold uppercase tracking-widest leading-none ${
                            r.label === "The Authority Vibe" ? "text-blue-600"
                            : r.label === "The Disruptor Vibe" ? "text-orange-500"
                            : r.label === "The Data Vibe" ? "text-emerald-600"
                            : "text-indigo-500"
                          }`}>{r.label}</p>
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
