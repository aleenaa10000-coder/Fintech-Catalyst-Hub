import { useState, useRef, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  ArrowUpRight,
  Lightbulb,
  Wand2,
  Share2,
  Link2,
  Loader2,
  FileDown,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
  Minus,
  GitCompare,
  X,
  Mail,
  Building2,
  FileText,
  Send,
  Clock,
  ExternalLink,
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

// ── Topic Cluster Detection ────────────────────────────────────────────────
// Maps fintech category keywords → a human-readable cluster label + pill style.
// Entries are checked in order; first match wins (put more-specific first).
const TOPIC_CLUSTER_LABELS: Array<{
  keywords: string[];
  label: string;
  badgeClass: string;
  dotClass: string;
  formats: [string, string, string];
}> = [
  { keywords: ["embedded finance", "baas", "open banking"],         label: "Embedded Finance & APIs",   badgeClass: "bg-sky-100 text-sky-700 ring-sky-200",            dotClass: "bg-sky-400",     formats: ["Deep-Dive Explainers", "API Integration Guides", "Partnership Announcements"] },
  { keywords: ["defi", "stablecoin", "cbdc", "nft", "web3"],        label: "Digital Assets & Web3",     badgeClass: "bg-violet-100 text-violet-700 ring-violet-200",   dotClass: "bg-violet-400",  formats: ["Market Analysis Reports", "Regulatory Watch Pieces", "Protocol Deep Dives"] },
  { keywords: ["crypto", "blockchain"],                              label: "Blockchain & Crypto",       badgeClass: "bg-purple-100 text-purple-700 ring-purple-200",   dotClass: "bg-purple-400",  formats: ["How-To Guides", "Market Outlooks", "Technology Primers"] },
  { keywords: ["kyc", "aml", "regtech", "compliance", "regulation"],label: "RegTech & Compliance",      badgeClass: "bg-red-100 text-red-700 ring-red-200",            dotClass: "bg-red-400",     formats: ["Regulatory Roundups", "Compliance Checklists", "Case Studies"] },
  { keywords: ["insuretech", "insurance"],                           label: "InsurTech",                 badgeClass: "bg-teal-100 text-teal-700 ring-teal-200",         dotClass: "bg-teal-400",    formats: ["Product Launch Analyses", "Data-Driven Reports", "Use Case Stories"] },
  { keywords: ["wealthtech", "wealth", "investment", "portfolio", "asset"], label: "WealthTech & Investing", badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200", dotClass: "bg-emerald-400", formats: ["Trend Reports", "How-To Guides", "Investor Roundtables"] },
  { keywords: ["fraud", "security", "identity", "authentication"],  label: "Security & Identity",       badgeClass: "bg-orange-100 text-orange-700 ring-orange-200",   dotClass: "bg-orange-400",  formats: ["Threat Intelligence Reports", "Best Practice Guides", "Incident Case Studies"] },
  { keywords: ["payments", "payment", "remittance", "transfer", "wallet"], label: "Merchant Services", badgeClass: "bg-indigo-100 text-indigo-700 ring-indigo-200",   dotClass: "bg-indigo-400",  formats: ["How-To Guides", "Case Studies", "Regulatory Roundups"] },
  { keywords: ["lending", "credit", "mortgage", "loan", "bnpl"],   label: "Credit & Lending",          badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",      dotClass: "bg-amber-400",   formats: ["Market Data Reports", "Underwriting Deep Dives", "Borrower Case Studies"] },
  { keywords: ["neobank", "digital bank"],                          label: "Neobanking",                badgeClass: "bg-blue-100 text-blue-700 ring-blue-200",         dotClass: "bg-blue-400",    formats: ["Product Comparison Guides", "User Adoption Stories", "Founder Interviews"] },
  { keywords: ["banking"],                                           label: "Banking & Infrastructure",  badgeClass: "bg-blue-100 text-blue-700 ring-blue-200",         dotClass: "bg-blue-400",    formats: ["Technology Migration Case Studies", "Vendor Comparisons", "CTO Interviews"] },
  { keywords: ["ai", "machine learning", "automation"],             label: "AI & Automation",           badgeClass: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",dotClass: "bg-fuchsia-400", formats: ["Implementation Guides", "ROI Case Studies", "Technology Primers"] },
  { keywords: ["startup", "funding", "vc", "ipo"],                  label: "Startup & VC",              badgeClass: "bg-rose-100 text-rose-700 ring-rose-200",         dotClass: "bg-rose-400",    formats: ["Funding Roundup Reports", "Founder Spotlights", "Market Opportunity Analyses"] },
  { keywords: ["fintech"],                                           label: "Fintech",                   badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",      dotClass: "bg-slate-400",   formats: ["Trend Reports", "Expert Roundups", "Regulatory Analyses"] },
];

// ── Format → headline template map ────────────────────────────────────────
// [Topic] is replaced at click-time with the detected cluster label.
const FORMAT_TEMPLATES: Record<string, string> = {
  "How-To Guides":                      "How to [Topic] in 2026: A Practical Guide for Fintech Teams",
  "Case Studies":                        "How [Company] Used [Topic] to Drive Results: A 2026 Case Study",
  "Regulatory Roundups":                 "The 2026 [Topic] Regulatory Roundup: What Leaders Need to Know Now",
  "Deep-Dive Explainers":               "How [Topic] Actually Works in 2026: A Complete Explainer",
  "API Integration Guides":             "How to Integrate [Topic] APIs in 2026: A Step-by-Step Developer Guide",
  "Partnership Announcements":          "Why This [Topic] Partnership Could Reshape the Market in 2026",
  "Market Analysis Reports":            "[Topic] in 2026: Market Size, Growth Drivers and Key Trends",
  "Regulatory Watch Pieces":            "Regulatory Watch: What New [Topic] Rules Mean for Your Business in 2026",
  "Protocol Deep Dives":                "Inside [Topic]: How It Works and Why It Matters for Fintech in 2026",
  "Market Outlooks":                    "[Topic] Market Outlook 2026: Trends, Forecasts and Opportunities",
  "Technology Primers":                 "What Is [Topic]? A Plain-English Primer for Fintech Professionals",
  "Compliance Checklists":              "The Ultimate [Topic] Compliance Checklist for 2026",
  "Product Launch Analyses":            "Breaking Down the Latest [Topic] Launch and What It Means for the Market",
  "Data-Driven Reports":                "[Topic] by the Numbers: Key Stats and Trends Shaping 2026",
  "Use Case Stories":                   "5 Real-World [Topic] Use Cases Redefining Fintech in 2026",
  "Trend Reports":                      "The Top [Topic] Trends Every Fintech Leader Must Watch in 2026",
  "Investor Roundtables":               "What [Topic] Investors Are Watching Most Closely in 2026",
  "Threat Intelligence Reports":        "2026 [Topic] Threat Report: Emerging Risks and How to Stay Ahead",
  "Best Practice Guides":               "Best Practices for [Topic] in 2026: What Top Fintech Teams Are Doing",
  "Incident Case Studies":              "Lessons From a Major [Topic] Failure and What Every Fintech Must Know",
  "Market Data Reports":                "[Topic] Market Data 2026: Key Benchmarks and What They Signal",
  "Underwriting Deep Dives":            "Inside Next-Gen [Topic] Underwriting: How AI Is Changing the Rules",
  "Borrower Case Studies":              "How One Fintech Cut [Topic] Defaults Using Alternative Data in 2026",
  "Product Comparison Guides":          "[Topic] Head-to-Head: Comparing the Top Providers in 2026",
  "User Adoption Stories":              "How [Company] Scaled [Topic] Adoption Without Sacrificing Compliance",
  "Founder Interviews":                 "Building a [Topic] Business in 2026: Lessons From Founders Who Did It",
  "Technology Migration Case Studies":  "How [Company] Modernised Its [Topic] Stack Without Downtime",
  "Vendor Comparisons":                 "The Best [Topic] Vendors in 2026: An Independent Comparison",
  "CTO Interviews":                     "Inside the [Topic] Stack: A CTO's Playbook for 2026",
  "Implementation Guides":              "How to Implement [Topic] in Your Fintech Stack: A 2026 Playbook",
  "ROI Case Studies":                   "The ROI of [Topic]: How Leading Fintechs Are Measuring Returns in 2026",
  "Funding Roundup Reports":            "[Topic] Funding Roundup: The Biggest Deals and Trends of 2026",
  "Founder Spotlights":                 "Meet the Founders Reinventing [Topic] in 2026",
  "Market Opportunity Analyses":        "The [Topic] Opportunity in 2026: Market Size, Gaps and Who Will Win",
  "Expert Roundups":                    "12 Experts Predict the Biggest [Topic] Shifts of 2026",
  "Regulatory Analyses":                "How New [Topic] Rules Will Reshape the Fintech Industry in 2026",
};

function detectTopicCluster(headline: string): typeof TOPIC_CLUSTER_LABELS[number] | null {
  const lower = headline.toLowerCase();
  for (const cluster of TOPIC_CLUSTER_LABELS) {
    if (cluster.keywords.some((kw) => lower.includes(kw))) return cluster;
  }
  return null;
}

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

// ── SEO Opportunity Map ───────────────────────────────────────────────────
// Maps a broad/generic fintech keyword (lowercase) to high-intent long-tail
// phrase alternatives. Detected by scanning analyzed headline words.
const SEO_OPPORTUNITY_MAP: Record<string, { label: string; phrases: string[] }> = {
  banking:    { label: "Banking",    phrases: ["Digital Banking Infrastructure", "Cross-border Settlements", "Neobank UX", "Open Banking APIs"] },
  payments:   { label: "Payments",   phrases: ["Real-time Payment Rails", "Cross-border Payment Flows", "Embedded Checkout Experience", "Instant Settlement Networks"] },
  crypto:     { label: "Crypto",     phrases: ["On-chain Asset Management", "DeFi Protocol Security", "Stablecoin Settlement Rails", "Layer-2 Scaling Solutions"] },
  blockchain: { label: "Blockchain", phrases: ["Distributed Ledger Technology", "Smart Contract Automation", "On-chain Settlement Infrastructure", "Zero-knowledge Proof Systems"] },
  fintech:    { label: "Fintech",    phrases: ["Embedded Finance Platforms", "API-first Banking Stack", "RegTech Compliance Automation", "Financial Infrastructure Layer"] },
  lending:    { label: "Lending",    phrases: ["AI-driven Credit Underwriting", "Alternative Lending Models", "Embedded Credit Infrastructure", "BNPL Risk Frameworks"] },
  investment: { label: "Investment", phrases: ["Algorithmic Portfolio Management", "Robo-advisory Platforms", "Alternative Asset Allocation", "Systematic Wealth Strategies"] },
  insurance:  { label: "Insurance",  phrases: ["Parametric Insurance Models", "Embedded InsurTech APIs", "AI-underwritten Risk Assessment", "Usage-based Insurance Products"] },
  compliance: { label: "Compliance", phrases: ["AML Transaction Monitoring", "RegTech Automation Workflows", "KYC Identity Verification", "Real-time Regulatory Reporting"] },
  security:   { label: "Security",   phrases: ["Zero-trust Security Architecture", "Fraud Detection ML Models", "Biometric Authentication Systems", "End-to-end Encryption Protocols"] },
  data:       { label: "Data",       phrases: ["Alternative Data Intelligence", "Real-time Transaction Analytics", "Behavioral Data Modeling", "Open Data Ecosystems"] },
  ai:         { label: "AI",         phrases: ["Generative AI Underwriting", "Predictive Credit Scoring", "AI-powered Risk Intelligence", "LLM-driven Financial Planning"] },
  fraud:      { label: "Fraud",      phrases: ["Real-time Fraud Detection ML", "Behavioral Biometrics for AML", "Synthetic Identity Prevention", "Transaction Anomaly Scoring"] },
  digital:    { label: "Digital",    phrases: ["Digital-first Banking Stack", "Cloud-native Financial Infrastructure", "API-driven Digital Transformation", "Digital Asset Settlement"] },
  risk:       { label: "Risk",       phrases: ["Model Risk Governance Frameworks", "Real-time Credit Risk Scoring", "Systemic Risk Quantification", "AI-augmented Risk Management"] },
  regulation: { label: "Regulation", phrases: ["PSD2 Compliance Architecture", "MiCA Token Regulation", "Basel IV Capital Frameworks", "DORA Operational Resilience"] },
  wallet:     { label: "Wallet",     phrases: ["Non-custodial Wallet Infrastructure", "Embedded Digital Wallet APIs", "Multi-chain Wallet Abstraction", "White-label Wallet-as-a-Service"] },
  trading:    { label: "Trading",    phrases: ["Algorithmic Trading Infrastructure", "High-frequency Execution Platforms", "DeFi Automated Market Making", "Latency-optimised Trade Routing"] },
  credit:     { label: "Credit",     phrases: ["Alternative Credit Scoring Models", "Embedded Credit Decisioning APIs", "Thin-file Borrower Assessment", "Real-time Credit Bureau Integrations"] },
  defi:       { label: "DeFi",       phrases: ["Decentralised Liquidity Protocols", "Yield Optimisation Strategies", "On-chain Governance Frameworks", "Cross-chain Bridge Security"] },
};

// ── SeoOpportunityCard ────────────────────────────────────────────────────
// Scans the analyzed headline for broad keywords that have long-tail
// alternatives in SEO_OPPORTUNITY_MAP, then renders Quick Swap buttons.
function SeoOpportunityCard({
  headline,
  onSwap,
}: {
  headline: string;
  onSwap: (label: string, phrase: string) => void;
}) {
  const normalised = headline.toLowerCase().replace(/[^a-z\s]/g, "");
  const words = normalised.split(/\s+/);
  const matches = Object.entries(SEO_OPPORTUNITY_MAP).filter(([key]) =>
    words.includes(key)
  );
  if (matches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
          <h4 className="text-sm font-semibold text-amber-900">SEO Opportunity</h4>
          <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
            {matches.length} broad {matches.length === 1 ? "keyword" : "keywords"} detected
          </span>
        </div>
        <CardContent className="p-5 space-y-4 bg-gradient-to-br from-amber-50/40 to-orange-50/30">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Your headline uses broad terms. Swapping to a high-intent phrase signals topic depth to search engines — and click intent to readers.
          </p>
          {matches.map(([key, { label, phrases }]) => (
            <div key={key} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                Replace &ldquo;{label}&rdquo; with:
              </p>
              <div className="space-y-1.5">
                {phrases.map((phrase) => (
                  <div
                    key={phrase}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 hover:border-amber-300 transition-colors"
                  >
                    <span className="text-xs text-slate-700 font-medium leading-snug">{phrase}</span>
                    <button
                      onClick={() => onSwap(label, phrase)}
                      className="shrink-0 flex items-center gap-1.5 rounded-md bg-amber-100 hover:bg-amber-200 active:scale-95 px-2.5 py-1 text-[10px] font-semibold text-amber-800 transition-all"
                    >
                      <Wand2 className="w-3 h-3" />
                      Quick Swap
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Word Heatmap Dictionaries ─────────────────────────────────────────────
// Filler words: articles, weak conjunctions, and empty intensifiers that
// add length without meaning — candidates for removal.
const FILLER_WORDS = new Set([
  "the", "a", "an",
  "and", "but", "or", "nor",
  "in", "of", "to", "for", "at", "by", "on",
  "is", "are", "was", "were", "be",
  "very", "really", "quite", "rather", "somewhat", "just", "also", "too",
  "its", "their", "this", "that",
]);

// Power words: union of all three fintech power-word categories + generic
// structural impact words. Stored as a Set for O(1) per-word lookup.
const POWER_WORDS_SET = new Set([
  ...FINTECH_AUTHORITY_WORDS,
  ...FINTECH_GROWTH_WORDS,
  ...FINTECH_URGENCY_WORDS,
  ...GENERIC_POWER_WORDS,
].map((w) => w.toLowerCase()));

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
  verdictColor: "emerald" | "blue" | "amber" | "red";
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

// ── WordHeatmap ───────────────────────────────────────────────────────────
// Splits the headline into tokens, classifies each word as "power", "filler",
// or "neutral", and renders with matching highlight styles. Whitespace tokens
// are passed through unchanged so spacing is preserved exactly.
function WordHeatmap({ headline }: { headline: string }) {
  const tokens = headline.split(/(\s+)/);

  const classify = (token: string): "power" | "filler" | "neutral" => {
    const clean = token.toLowerCase().replace(/[^a-z]/g, "");
    if (!clean) return "neutral";
    if (FILLER_WORDS.has(clean)) return "filler";
    if (POWER_WORDS_SET.has(clean)) return "power";
    return "neutral";
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800 break-words">
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        const cat = classify(token);
        if (cat === "power")
          return (
            <span
              key={i}
              className="rounded-sm bg-emerald-100 px-0.5 font-semibold text-emerald-800 shadow-[0_0_6px_0_rgba(16,185,129,0.25)]"
            >
              {token}
            </span>
          );
        if (cat === "filler")
          return (
            <span
              key={i}
              className="text-red-400 underline decoration-dotted decoration-red-400 underline-offset-2"
            >
              {token}
            </span>
          );
        return <span key={i}>{token}</span>;
      })}
    </div>
  );
}

// ── TypewriterText ────────────────────────────────────────────────────────
// Renders `text` one character at a time after an optional `delay` (ms).
// Shows a blinking cursor while typing; cursor disappears when done.
function TypewriterText({
  text,
  delay = 0,
  speed = 18,
}: {
  text: string;
  delay?: number;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          if (intervalId) clearInterval(intervalId);
          setDone(true);
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, delay, speed]);

  return (
    <>
      {displayed || "\u00a0"}
      {!done && (
        <span className="inline-block w-px h-[1em] bg-slate-500 align-middle ml-0.5 animate-pulse" />
      )}
    </>
  );
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

function buildTextReport(r: Analysis): string {
  const date = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const origin = typeof window !== "undefined" ? window.location.origin : "https://fintechpresshub.com";
  const divider = "═".repeat(46);

  const dimensionLines = r.dimensions
    .map((d) =>
      [
        `${d.label.padEnd(24)} ${String(d.score).padStart(2)} / ${d.max}`,
        `  ${d.feedback}`,
        `  Tip: ${d.tip}`,
      ].join("\n")
    )
    .join("\n\n");

  const flagLines = r.flags.length > 0
    ? r.flags.map((f) => `  • ${f}`).join("\n")
    : "  None detected.";

  const rewriteLines = r.rewrites
    .map((rw) => `${rw.label}\n  "${rw.text}"`)
    .join("\n\n");

  return [
    "HEADLINE ANALYSIS REPORT",
    "FintechPressHub · Headline Analyzer",
    `Generated: ${date}`,
    "",
    divider,
    "",
    "HEADLINE ANALYZED",
    `"${r.headline}"`,
    "",
    `OVERALL SCORE: ${r.overallScore} / 100  —  ${r.verdict}`,
    `Characters: ${r.charCount}  ·  Words: ${r.wordCount}`,
    "",
    divider,
    "",
    "SCORE BREAKDOWN",
    "",
    dimensionLines,
    "",
    divider,
    "",
    "FLAGS & ISSUES",
    "",
    flagLines,
    "",
    divider,
    "",
    "REWRITE SUGGESTIONS",
    "",
    rewriteLines,
    "",
    divider,
    "",
    "Analyze your own headlines free at:",
    `${origin}/tools/headline-analyzer`,
    "",
    `© ${new Date().getFullYear()} FintechPressHub`,
  ].join("\n");
}

type HistoryEntry = {
  id: string;
  headline: string;
  score: number;
  verdict: string;
  verdictColor: "emerald" | "blue" | "amber" | "red";
  analyzedAt: number;
};

const HISTORY_KEY = "fph-headline-analyzer.history.v1";

function loadHistory(): HistoryEntry[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(HISTORY_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function pushToHistory(entry: HistoryEntry, prev: HistoryEntry[]): HistoryEntry[] {
  const filtered = prev.filter((e) => e.headline !== entry.headline);
  return [entry, ...filtered].slice(0, 10);
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function HeadlineAnalyzer() {
  const [headline, setHeadline] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [sentToComparison, setSentToComparison] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [pinnedResult, setPinnedResult] = useState<Analysis | null>(null);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [briefEmail, setBriefEmail] = useState("");
  const [briefName, setBriefName] = useState("");
  const [briefSubmitting, setBriefSubmitting] = useState(false);
  const [briefSubmitted, setBriefSubmitted] = useState(false);

  const submitBrief = async () => {
    if (!briefEmail.trim() || briefSubmitting) return;
    setBriefSubmitting(true);
    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: briefEmail.trim().toLowerCase(),
          source: `content-brief-request|${briefName.trim()}`,
        }),
      });
      setBriefSubmitted(true);
      trackEvent("content_brief_requested", {
        score: result?.overallScore ?? 0,
        verdict: result?.verdict ?? "",
        headline: result?.headline ?? "",
      });
    } catch {
      setBriefSubmitting(false);
    }
  };

  const closeBriefModal = () => {
    setBriefModalOpen(false);
    setTimeout(() => {
      setBriefSubmitted(false);
      setBriefSubmitting(false);
      setBriefEmail("");
      setBriefName("");
    }, 300);
  };

  const pinForComparison = () => {
    if (!result) return;
    setPinnedResult(result);
    setResult(null);
    setHeadline("");
    setSelectedVibe(null);
  };

  const clearPin = () => {
    setPinnedResult(null);
  };

  const PROCESSING_STEPS = [
    "Scanning SERPs...",
    "Analyzing Sentiment...",
    "Calculating Vibe Match...",
  ];

  const scoreBreakdownRef = useRef<HTMLDivElement>(null);

  // Replaces the first case-insensitive occurrence of `label` in the headline
  // input with the chosen long-tail `phrase`, then clears the result so the
  // user can re-analyze the improved headline.
  const handleSeoSwap = (label: string, phrase: string) => {
    setHeadline((prev) => prev.replace(new RegExp(label, "i"), phrase));
    setResult(null);
    setSelectedVibe(null);
  };

  const runAnalysis = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) return;
    setResult(null);
    setSelectedVibe(null);
    setIsProcessing(true);
    setProcessingStep(0);

    const interval = setInterval(() => {
      setProcessingStep((s) => (s + 1) % PROCESSING_STEPS.length);
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setIsProcessing(false);
      const analysisResult = analyzeHeadline(trimmed);
      setResult(analysisResult);
      setHistory((prev) => {
        const entry: HistoryEntry = {
          id: String(Date.now()),
          headline: analysisResult.headline,
          score: analysisResult.overallScore,
          verdict: analysisResult.verdict,
          verdictColor: analysisResult.verdictColor,
          analyzedAt: Date.now(),
        };
        const updated = pushToHistory(entry, prev);
        try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      if (analysisResult.overallScore >= 60) {
        trackEvent("headline_threshold_reached", {
          score: analysisResult.overallScore,
          verdict: analysisResult.verdict,
          wordCount: analysisResult.wordCount,
          charCount: analysisResult.charCount,
        });
      }
    }, 1500);
  };

  const analyze = () => runAnalysis(headline);

  const sendToComparison = (rewriteText: string, idx: number) => {
    if (!result) return;
    setPinnedResult(result);
    setHeadline(rewriteText);
    setSentToComparison(idx);
    setTimeout(() => setSentToComparison(null), 2200);
    runAnalysis(rewriteText);
    setTimeout(() => {
      scoreBreakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const reset = () => {
    setHeadline("");
    setResult(null);
    setSelectedVibe(null);
    setUrlMode(false);
    setCompetitorUrl("");
    setFetchError(null);
    setPinnedResult(null);
  };

  const recallHistory = (entry: HistoryEntry) => {
    const recalled = analyzeHeadline(entry.headline);
    setHeadline(entry.headline);
    setResult(recalled);
    setSelectedVibe(null);
    setUrlMode(false);
    setTimeout(() => {
      scoreBreakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const clearHistory = () => {
    setHistory([]);
    try { window.localStorage.removeItem(HISTORY_KEY); } catch {}
  };

  const downloadReport = () => {
    if (!result) return;
    const text = buildTextReport(result);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `headline-score-${result.overallScore}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("report_downloaded", { score: result.overallScore, verdict: result.verdict });
  };

  const fetchAndAnalyze = async () => {
    if (!competitorUrl.trim() || isFetching) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tools/fetch-title?url=${encodeURIComponent(competitorUrl.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setFetchError(data.error ?? "Couldn't fetch that page. Try a different URL.");
        setIsFetching(false);
        return;
      }
      const fetched = data.title as string;
      setHeadline(fetched);
      setUrlMode(false);
      setIsFetching(false);
      setResult(null);
      setIsProcessing(true);
      setProcessingStep(0);
      const interval = setInterval(() => setProcessingStep((s) => (s + 1) % PROCESSING_STEPS.length), 500);
      setTimeout(() => {
        clearInterval(interval);
        setIsProcessing(false);
        const analysisResult = analyzeHeadline(fetched);
        setResult(analysisResult);
        setHistory((prev) => {
          const entry: HistoryEntry = {
            id: String(Date.now()),
            headline: analysisResult.headline,
            score: analysisResult.overallScore,
            verdict: analysisResult.verdict,
            verdictColor: analysisResult.verdictColor,
            analyzedAt: Date.now(),
          };
          const updated = pushToHistory(entry, prev);
          try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
        if (analysisResult.overallScore >= 60) {
          trackEvent("headline_threshold_reached", {
            score: analysisResult.overallScore,
            verdict: analysisResult.verdict,
            wordCount: analysisResult.wordCount,
            charCount: analysisResult.charCount,
            source: "competitor_url",
          });
        }
        trackEvent("competitor_url_analyzed", {
          score: analysisResult.overallScore,
          verdict: analysisResult.verdict,
          domain: (() => { try { return new URL(competitorUrl.trim()).hostname; } catch { return "unknown"; } })(),
        });
      }, 1500);
    } catch {
      setFetchError("Network error. Check the URL and try again.");
      setIsFetching(false);
    }
  };

  const copyRewrite = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const checkRewriteScore = (text: string) => {
    setHeadline(text);
    const rewriteResult = analyzeHeadline(text);
    setResult(rewriteResult);
    if (rewriteResult.overallScore >= 60) {
      trackEvent("headline_threshold_reached", {
        score: rewriteResult.overallScore,
        verdict: rewriteResult.verdict,
        wordCount: rewriteResult.wordCount,
        charCount: rewriteResult.charCount,
        source: "rewrite_check",
      });
    }
    setTimeout(() => {
      scoreBreakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const canAnalyze = headline.trim().length >= 5 && !isProcessing;

  const verdictColors = result ? COLOR_MAP[result.verdictColor] : null;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="headlineAnalyzer" />

      <PageHero
        eyebrow="Free Tool"
        title="Headline Analyzer"
        description="Paste any fintech article headline to get a score across clarity, keyword presence, emotional pull, and character count — with rewrite suggestions tailored to fintech audiences."
      />

      <section className="py-12 md:py-16 bg-gradient-to-b from-white via-blue-50/50 to-indigo-50/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <Card className="bg-white/70 backdrop-blur-[10px] border border-white/80 shadow-xl">
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

              {/* ── Comparison Mode Banner ── */}
              {pinnedResult && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"
                >
                  <GitCompare className="w-4 h-4 text-violet-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500 mb-0.5">Comparison Mode</p>
                    <p className="text-xs text-violet-800 truncate">
                      <span className="font-semibold">A:</span> "{pinnedResult.headline}"
                      <span className="ml-2 font-bold text-violet-600">({pinnedResult.overallScore}/100)</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPin}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    <PinOff className="w-3 h-3" />
                    Clear
                  </button>
                </motion.div>
              )}

              {/* ── History drawer trigger ── */}
              {history.length > 0 && (
                <div className="mb-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Recent analyses
                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                      {history.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="space-y-3 mb-5">
                {/* Mode tabs */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">
                    {urlMode ? "Competitor URL" : "Your Headline"}
                  </Label>
                  <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => { setUrlMode(false); setFetchError(null); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        !urlMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Wand2 className="w-3 h-3" />
                      Type headline
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUrlMode(true); setFetchError(null); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        urlMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      Paste a URL
                    </button>
                  </div>
                </div>

                {urlMode ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={competitorUrl}
                      onChange={(e) => { setCompetitorUrl(e.target.value); setFetchError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && competitorUrl.trim() && !isFetching) {
                          e.preventDefault();
                          fetchAndAnalyze();
                        }
                      }}
                      placeholder="https://techcrunch.com/2025/01/fintech-article"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-slate-800 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {fetchError && (
                      <p className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {fetchError}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      We'll fetch the page title server-side and score it — nothing is stored.
                    </p>
                  </div>
                ) : (
                  <>
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
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground">
                        {headline.length} characters · {headline.trim().split(/\s+/).filter(Boolean).length} words
                        {headline.length > 0 && headline.length < 50 && (
                          <span className="ml-2 text-amber-600">· {50 - headline.length} chars to sweet spot</span>
                        )}
                        {headline.length > 70 && (
                          <span className="ml-2 text-red-500">· {headline.length - 70} chars over ideal max</span>
                        )}
                      </p>
                      {headline.length > 0 && (() => {
                        const len = headline.length;
                        const SWEET_MIN = 50, SWEET_MAX = 65;
                        const isSweet   = len >= SWEET_MIN && len <= SWEET_MAX;
                        const isOver    = len > 70;
                        const isClose   = len >= 30 && len < SWEET_MIN;
                        const trackR    = 8;
                        const circ      = 2 * Math.PI * trackR;
                        const fillPct   = Math.min(len / 100, 1);
                        const dash      = fillPct * circ;
                        const strokeCol = isSweet ? "#10b981" : isOver ? "#ef4444" : isClose ? "#f59e0b" : "#cbd5e1";
                        const label     = isSweet ? "Sweet spot!" : isOver ? "Too long" : isClose ? `${SWEET_MIN - len} to go` : `${len}/100`;
                        return (
                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            title={`SEO sweet spot: 50–65 chars`}
                          >
                            <svg
                              width="22" height="22" viewBox="0 0 22 22"
                              className={isSweet ? "drop-shadow-[0_0_4px_#10b981]" : ""}
                            >
                              <circle cx="11" cy="11" r={trackR} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                              <circle
                                cx="11" cy="11" r={trackR}
                                fill="none"
                                stroke={strokeCol}
                                strokeWidth="3"
                                strokeDasharray={`${dash} ${circ}`}
                                strokeLinecap="round"
                                transform="rotate(-90 11 11)"
                                style={{ transition: "stroke-dasharray 0.3s ease, stroke 0.3s ease" }}
                              />
                            </svg>
                            <span
                              className="text-[10px] font-semibold tabular-nums"
                              style={{ color: strokeCol, transition: "color 0.3s ease" }}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
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

              {urlMode ? (
                /* ── URL fetch button ── */
                <button
                  onClick={fetchAndAnalyze}
                  disabled={!competitorUrl.trim() || isFetching}
                  className={`relative w-full h-11 rounded-md font-semibold text-sm text-white overflow-hidden transition-all bg-gradient-to-r from-indigo-600 to-violet-600
                    ${isFetching || !competitorUrl.trim() ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isFetching
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Link2 className="w-4 h-4" />}
                    {isFetching ? "Fetching title…" : "Fetch & Analyze"}
                  </span>
                </button>
              ) : (
                /* ── Type-headline analyze button ── */
                <button
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className={`relative w-full h-11 rounded-md font-semibold text-sm text-white overflow-hidden transition-all
                    ${isProcessing
                      ? "cursor-not-allowed"
                      : canAnalyze
                      ? "hover:opacity-90 active:scale-[0.99]"
                      : "opacity-50 cursor-not-allowed"
                    }`}
                >
                  {/* Background — pulses during processing */}
                  <span
                    className={`absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_100%] transition-all
                      ${isProcessing ? "animate-[shimmer-bg_1.2s_linear_infinite]" : ""}`}
                    style={isProcessing ? {} : { backgroundSize: "100% 100%" }}
                  />

                  {/* Idle state */}
                  {!isProcessing && (
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Analyze Headline
                    </span>
                  )}

                  {/* Processing state */}
                  {isProcessing && (
                    <span className="relative z-10 flex items-center justify-center gap-2.5">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={processingStep}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="text-sm font-semibold tracking-wide"
                        >
                          {PROCESSING_STEPS[processingStep]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  )}
                </button>
              )}

              {/* Progress bar — fills linearly over the 1.5s processing window */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="mt-3 rounded-full bg-slate-100 h-1.5 overflow-hidden"
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "linear" }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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
                <Card className="bg-white/40 backdrop-blur-[10px] border border-white/60 shadow-lg">
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
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${verdictColors.text} mb-1`}>{result.verdict}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Analysed: <span className="italic text-slate-600">"{result.headline}"</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.charCount} characters · {result.wordCount} words
                        </p>
                        {!pinnedResult && (
                          <button
                            type="button"
                            onClick={pinForComparison}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 active:scale-95 transition-all"
                          >
                            <Pin className="w-3 h-3" />
                            Pin as A — Compare with another headline
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Competitive Edge ── */}
                {(() => {
                  const TOP10_AVG = 68;
                  const userScore = result.overallScore;
                  const isWin = userScore > 70;
                  const engagementDelta =
                    userScore > TOP10_AVG
                      ? Math.round(((userScore - TOP10_AVG) / TOP10_AVG) * 100)
                      : null;
                  const userPct  = Math.min(userScore, 100);
                  const top10Pct = TOP10_AVG;

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
                    >
                      <Card className="bg-white/40 backdrop-blur-[10px] border border-white/60 shadow-lg overflow-hidden">
                        {/* Header row */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-0">
                          <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            <h4 className="text-sm font-bold text-slate-900">Competitive Edge</h4>
                          </div>
                          {isWin && (
                            <motion.span
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.25 }}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 tracking-wide"
                            >
                              <Zap className="w-3 h-3" />
                              WIN
                            </motion.span>
                          )}
                        </div>

                        <CardContent className="px-5 pt-4 pb-5 space-y-4">
                          {/* Bar 1 — User score */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">Your Headline Score</span>
                              <span className={`text-xs font-bold ${
                                userScore >= 80 ? "text-emerald-600" :
                                userScore >= 60 ? "text-blue-600" :
                                userScore >= 40 ? "text-amber-600" : "text-red-500"
                              }`}>{userScore} / 100</span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${userPct}%` }}
                                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
                                className={`relative h-full rounded-full overflow-hidden ${
                                  userScore >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                                  userScore >= 60 ? "bg-gradient-to-r from-blue-400 to-indigo-500" :
                                  userScore >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                                  "bg-gradient-to-r from-red-400 to-red-500"
                                }`}
                              >
                                <div className="absolute inset-0 animate-shimmer-bar bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Bar 2 — Top 10 avg */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500">Top 10 Ranking Avg</span>
                              <span className="text-xs font-bold text-slate-400">{TOP10_AVG} / 100</span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${top10Pct}%` }}
                                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                                className="relative h-full rounded-full overflow-hidden bg-gradient-to-r from-slate-300 to-slate-400"
                              >
                                <div className="absolute inset-0 animate-shimmer-bar bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Insight line */}
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.45 }}
                            className={`text-xs leading-relaxed font-medium rounded-lg px-3.5 py-2.5 ${
                              engagementDelta !== null
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : "bg-amber-50 text-amber-800 border border-amber-100"
                            }`}
                          >
                            {engagementDelta !== null ? (
                              <>
                                Your headline is{" "}
                                <span className="font-bold">{engagementDelta}% more engaging</span>{" "}
                                than the current search competition for these keywords.
                              </>
                            ) : (
                              <>
                                Your headline is{" "}
                                <span className="font-bold">
                                  {Math.round(((TOP10_AVG - userScore) / TOP10_AVG) * 100)}% below
                                </span>{" "}
                                the top 10 average — use the rewrite suggestions below to close the gap.
                              </>
                            )}
                          </motion.p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}

                {/* ── A/B Comparison Diff View ── */}
                {pinnedResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <Card className="bg-white/40 backdrop-blur-[10px] border border-violet-200/70 shadow-lg overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 flex items-center gap-2">
                        <GitCompare className="w-4 h-4 text-white shrink-0" />
                        <h4 className="text-sm font-bold text-white">A/B Headline Comparison</h4>
                        <span className="ml-auto text-[10px] font-semibold bg-white/20 text-white rounded-full px-2.5 py-0.5">
                          Diff View
                        </span>
                      </div>

                      <CardContent className="p-5 space-y-5">
                        {/* Headline labels */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                              <Pin className="w-3 h-3" /> A — Pinned
                            </p>
                            <p className="text-xs text-slate-700 leading-snug font-medium line-clamp-3">"{pinnedResult.headline}"</p>
                          </div>
                          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> B — New
                            </p>
                            <p className="text-xs text-violet-900 leading-snug font-medium line-clamp-3">"{result.headline}"</p>
                          </div>
                        </div>

                        {/* Overall score delta */}
                        {(() => {
                          const delta = result.overallScore - pinnedResult.overallScore;
                          const aColors = COLOR_MAP[pinnedResult.verdictColor];
                          const bColors = COLOR_MAP[result.verdictColor];
                          return (
                            <div className="rounded-xl border border-slate-100 bg-white p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Overall Score</p>
                              <div className="flex items-center gap-3">
                                {/* A score */}
                                <div className="flex-1 flex flex-col items-center gap-1">
                                  <div className="relative w-16 h-16">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                                      <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={pinnedResult.verdictColor === "emerald" ? "#10b981" : pinnedResult.verdictColor === "blue" ? "#3b82f6" : pinnedResult.verdictColor === "amber" ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="3.5" strokeDasharray={`${pinnedResult.overallScore} 100`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-lg font-extrabold text-slate-900 leading-none">{pinnedResult.overallScore}</span>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${aColors.badge}`}>{pinnedResult.verdict}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Headline A</span>
                                </div>

                                {/* Delta arrow */}
                                <div className="flex flex-col items-center gap-0.5">
                                  {delta > 0 ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <ArrowUp className="w-5 h-5 text-emerald-500" />
                                      <span className="text-sm font-extrabold text-emerald-600">+{delta}</span>
                                    </div>
                                  ) : delta < 0 ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <ArrowDown className="w-5 h-5 text-red-400" />
                                      <span className="text-sm font-extrabold text-red-500">{delta}</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <Minus className="w-5 h-5 text-slate-400" />
                                      <span className="text-sm font-extrabold text-slate-400">0</span>
                                    </div>
                                  )}
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">pts</span>
                                </div>

                                {/* B score */}
                                <div className="flex-1 flex flex-col items-center gap-1">
                                  <div className="relative w-16 h-16">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                                      <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={result.verdictColor === "emerald" ? "#10b981" : result.verdictColor === "blue" ? "#3b82f6" : result.verdictColor === "amber" ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="3.5" strokeDasharray={`${result.overallScore} 100`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-lg font-extrabold text-slate-900 leading-none">{result.overallScore}</span>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bColors.badge}`}>{result.verdict}</span>
                                  <span className="text-[9px] text-violet-500 font-semibold uppercase tracking-wider">Headline B</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Dimension-by-dimension diff table */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Dimension Breakdown</p>
                          {result.dimensions.map((bDim, i) => {
                            const aDim = pinnedResult.dimensions[i];
                            if (!aDim) return null;
                            const delta = bDim.audienceMatch ? null : bDim.score - aDim.score;
                            const aColor = COLOR_MAP[aDim.color];
                            const bColor = COLOR_MAP[bDim.color];
                            return (
                              <div key={bDim.label} className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <bDim.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-700">{bDim.label}</span>
                                  {delta !== null && (
                                    <span className={`ml-auto inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      delta > 0 ? "bg-emerald-100 text-emerald-700" :
                                      delta < 0 ? "bg-red-100 text-red-600" :
                                      "bg-slate-100 text-slate-500"
                                    }`}>
                                      {delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : delta < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                                      {delta > 0 ? `+${delta}` : delta === 0 ? "No change" : delta}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {/* A bar */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">A</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${aColor.badge}`}>
                                        {aDim.audienceMatch ? aDim.audienceMatch.tier : `${aDim.score}/${aDim.max}`}
                                      </span>
                                    </div>
                                    {!aDim.audienceMatch && (
                                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${aColor.bar}`} style={{ width: `${Math.round((aDim.score / aDim.max) * 100)}%` }} />
                                      </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{aDim.feedback}</p>
                                  </div>
                                  {/* B bar */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-wider">B</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${bColor.badge}`}>
                                        {bDim.audienceMatch ? bDim.audienceMatch.tier : `${bDim.score}/${bDim.max}`}
                                      </span>
                                    </div>
                                    {!bDim.audienceMatch && (
                                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${bColor.bar}`} style={{ width: `${Math.round((bDim.score / bDim.max) * 100)}%` }} />
                                      </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{bDim.feedback}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Winner callout */}
                        {(() => {
                          const delta = result.overallScore - pinnedResult.overallScore;
                          if (delta === 0) return (
                            <p className="text-center text-xs text-slate-500 font-medium py-1">Both headlines scored equally — it's a tie.</p>
                          );
                          const winner = delta > 0 ? "B" : "A";
                          const winnerScore = delta > 0 ? result.overallScore : pinnedResult.overallScore;
                          const winnerVerdict = delta > 0 ? result.verdict : pinnedResult.verdict;
                          return (
                            <div className={`rounded-xl p-4 text-center ${delta > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
                              <p className={`text-xs font-bold mb-0.5 ${delta > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                                Headline {winner} wins by {Math.abs(delta)} points
                              </p>
                              <p className={`text-[11px] ${delta > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                Score {winnerScore}/100 · {winnerVerdict}
                              </p>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Sub-60 unlock nudge */}
                {result.overallScore < 60 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3"
                  >
                    <span className="mt-0.5 text-base shrink-0">🎯</span>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      <span className="font-semibold">Score 60 or above</span> to unlock a personalized content strategy quote — use the rewrite suggestions below to get there.
                    </p>
                  </motion.div>
                )}

                {/* Dimension breakdown */}
                <Card className="bg-white/40 backdrop-blur-[10px] border border-white/60 shadow-lg">
                  <CardContent className="p-5 space-y-4">
                    <h4 ref={scoreBreakdownRef} className="text-sm font-semibold text-slate-900">Score Breakdown</h4>

                    {/* ── Word Heatmap ── */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Word Heatmap
                      </p>
                      <WordHeatmap headline={result.headline} />
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-500">🔥 Power Word</span>
                        <span className="text-[10px] text-slate-500">☁️ Filler Word</span>
                      </div>
                    </div>

                    {result.dimensions.map((dim, i) => {
                      const c = COLOR_MAP[dim.color];
                      const pct = Math.round((dim.score / dim.max) * 100);
                      const topicCluster = detectTopicCluster(result.headline);
                      return (
                        <motion.div
                          key={dim.label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <dim.icon className={`w-3.5 h-3.5 ${c.text}`} />
                              <span className="text-xs font-semibold text-slate-700">{dim.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {dim.audienceMatch && topicCluster && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.07 + 0.18, duration: 0.22 }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${topicCluster.badgeClass}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${topicCluster.dotClass}`} />
                                  {topicCluster.label}
                                </motion.span>
                              )}
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${c.badge}`}>
                                {dim.audienceMatch ? dim.audienceMatch.tier : `${dim.score} / ${dim.max}`}
                              </span>
                            </div>
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
                          {dim.label === "Keyword Presence" && topicCluster && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.07 + 0.3 }}
                              className={`mt-1.5 rounded-md px-2.5 py-2.5 ring-1 space-y-2 ${topicCluster.badgeClass}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${topicCluster.dotClass}`} />
                                <p className="text-[11px] leading-snug">
                                  This headline successfully targets the{" "}
                                  <strong>{topicCluster.label}</strong> cluster, which is currently seeing high search demand in 2026.
                                </p>
                              </div>
                              <div className="pl-3.5 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                                  Top performing formats in 2026
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {topicCluster.formats.map((fmt, fi) => (
                                    <motion.button
                                      key={fmt}
                                      type="button"
                                      initial={{ opacity: 0, scale: 0.88 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: i * 0.07 + 0.38 + fi * 0.07 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const template = FORMAT_TEMPLATES[fmt] ?? fmt;
                                        const filled = template.replace(/\[Topic\]/g, topicCluster.label);
                                        setHeadline(filled);
                                        setResult(null);
                                        setSelectedVibe(null);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-current/20 cursor-pointer hover:bg-white/90 hover:scale-105 transition-all"
                                      title={`Use this as a headline template`}
                                    >
                                      <span className="opacity-50">{fi + 1}.</span> {fmt}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* SEO Opportunity */}
                <SeoOpportunityCard
                  headline={result.headline}
                  onSwap={handleSeoSwap}
                />

                {/* Flags */}
                {result.flags.length > 0 && (
                  <Card className="bg-amber-50/60 backdrop-blur-[10px] border border-amber-200/60 shadow-lg">
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
                <Card className="bg-white/40 backdrop-blur-[10px] border border-white/60 shadow-lg">
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
                        onClick={() => setSelectedVibe(r.label)}
                        className={`flex items-start justify-between gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
                          selectedVibe === r.label
                            ? r.label === "The Authority Vibe"
                              ? "bg-blue-50 border border-blue-300 ring-1 ring-blue-100"
                              : r.label === "The Disruptor Vibe"
                              ? "bg-orange-50 border border-orange-300 ring-1 ring-orange-100"
                              : "bg-emerald-50 border border-emerald-300 ring-1 ring-emerald-100"
                            : "bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className={`text-[10px] font-semibold uppercase tracking-widest leading-none ${
                            r.label === "The Authority Vibe" ? "text-blue-600"
                            : r.label === "The Disruptor Vibe" ? "text-orange-500"
                            : r.label === "The Data Vibe" ? "text-emerald-600"
                            : "text-indigo-500"
                          }`}>{r.label}</p>
                          <p className="text-sm text-slate-800 leading-snug">
                            <TypewriterText
                              text={r.text}
                              delay={(i * 0.08 + 0.2) * 1000}
                              speed={18}
                            />
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); sendToComparison(r.text, i); }}
                            className={`transition-colors ${sentToComparison === i ? "text-violet-500" : "text-muted-foreground hover:text-violet-600"}`}
                            title="Pin original as A, analyse this as B"
                          >
                            {sentToComparison === i ? (
                              <Check className="w-4 h-4 text-violet-500" />
                            ) : (
                              <GitCompare className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); checkRewriteScore(r.text); }}
                            className="text-muted-foreground hover:text-indigo-600 transition-colors"
                            title="Check score"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyRewrite(r.text, i); }}
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

                {/* Content Strategy Bridge */}
                <AnimatePresence mode="wait">
                  {selectedVibe && (() => {
                    const BRIDGE_MAP: Record<string, {
                      accentBg: string; accentBorder: string; accentText: string;
                      labelColor: string; cta: string; linkText: string;
                    }> = {
                      "The Authority Vibe": {
                        accentBg:     "bg-gradient-to-br from-blue-50 to-white",
                        accentBorder: "border-blue-200",
                        accentText:   "text-blue-500",
                        labelColor:   "text-blue-700",
                        cta:      "Want to back this up with an expert whitepaper?",
                        linkText: "Explore our content services",
                      },
                      "The Data Vibe": {
                        accentBg:     "bg-gradient-to-br from-emerald-50 to-white",
                        accentBorder: "border-emerald-200",
                        accentText:   "text-emerald-500",
                        labelColor:   "text-emerald-700",
                        cta:      "Need a custom industry report to support these numbers?",
                        linkText: "See our research & data services",
                      },
                      "The Disruptor Vibe": {
                        accentBg:     "bg-gradient-to-br from-orange-50 to-white",
                        accentBorder: "border-orange-200",
                        accentText:   "text-orange-500",
                        labelColor:   "text-orange-700",
                        cta:      "Ready to lead the conversation with a PR blitz?",
                        linkText: "Talk to our strategy team",
                      },
                    };
                    const bridge = BRIDGE_MAP[selectedVibe];
                    if (!bridge) return null;
                    return (
                      <motion.div
                        key={selectedVibe}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.22 }}
                      >
                        <Card className={`backdrop-blur-[10px] border shadow-lg bg-white/50 ${bridge.accentBorder}`}>
                          <CardContent className="p-5">
                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${bridge.accentText}`}>
                              Content Strategy Bridge
                            </p>
                            <p className={`text-sm font-bold mb-3 ${bridge.labelColor}`}>
                              {bridge.cta}
                            </p>
                            <Link
                              href="/services"
                              className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80 ${bridge.labelColor}`}
                            >
                              {bridge.linkText}
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                            </Link>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {result.overallScore >= 60 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <Card className="border-0 shadow-xl overflow-hidden backdrop-blur-[10px]">
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 py-6">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200 mb-2">
                        Next Steps
                      </p>
                      <h3 className="text-lg font-bold text-white leading-snug mb-3">
                        Ready to turn this headline into a ranking article?
                      </h3>
                      <p className="text-sm text-indigo-100 leading-relaxed mb-5">
                        Our specialized fintech writers can turn your optimized headline into a 1,500-word authority piece that drives leads.
                      </p>
                      <Button
                        onClick={() => {
                          setBriefModalOpen(true);
                          trackEvent("content_brief_modal_opened", {
                            score: result.overallScore,
                            verdict: result.verdict,
                            source: "headline_analyzer",
                          });
                        }}
                        className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-semibold h-11 shadow-sm transition-colors"
                      >
                        <FileText className="w-4 h-4 mr-2 shrink-0" />
                        Generate Free Content Brief for this Headline
                      </Button>
                    </div>
                  </Card>
                </motion.div>
                )}

                {/* Share results */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                >
                  <Card className="bg-white/40 backdrop-blur-[10px] border border-white/60 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Share2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Share your score</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3.5 py-3 mb-3">
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-mono select-all">
                          {`I just scored my fintech headline ${result.overallScore}/100 on FintechPressHub's free Headline Analyzer.\n\nVerdict: ${result.verdict}\n"${result.headline}"\n\nTest your own → ${typeof window !== "undefined" ? window.location.origin : ""}/tools/headline-analyzer`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs font-medium"
                          onClick={() => {
                            const text = `I just scored my fintech headline ${result.overallScore}/100 on FintechPressHub's free Headline Analyzer.\n\nVerdict: ${result.verdict}\n"${result.headline}"\n\nTest your own → ${typeof window !== "undefined" ? window.location.origin : ""}/tools/headline-analyzer`;
                            navigator.clipboard.writeText(text);
                            setShareCopied(true);
                            setTimeout(() => setShareCopied(false), 2000);
                            trackEvent("results_shared", { method: "copy", score: result.overallScore });
                          }}
                        >
                          {shareCopied
                            ? <Check className="w-3 h-3 mr-1.5 text-emerald-500" />
                            : <Copy className="w-3 h-3 mr-1.5" />}
                          {shareCopied ? "Copied!" : "Copy snippet"}
                        </Button>
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent((typeof window !== "undefined" ? window.location.origin : "") + "/tools/headline-analyzer")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                          onClick={() => trackEvent("results_shared", { method: "linkedin", score: result.overallScore })}
                        >
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs font-medium text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/5">
                            <Share2 className="w-3 h-3 mr-1.5" />
                            Share on LinkedIn
                          </Button>
                        </a>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs font-medium mt-2 text-slate-600"
                        onClick={downloadReport}
                      >
                        <FileDown className="w-3 h-3 mr-1.5" />
                        Download .txt report
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Content Brief Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {briefModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="brief-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={closeBriefModal}
            />

            {/* Modal panel */}
            <motion.div
              key="brief-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="relative w-full max-w-md pointer-events-auto">
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
                  {/* Modal header */}
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 pt-6 pb-5 relative">
                    <button
                      onClick={closeBriefModal}
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">Free SEO Asset</p>
                        <h3 className="text-base font-bold text-white leading-snug">Content Brief Generator</h3>
                      </div>
                    </div>
                    {result && (
                      <div className="rounded-lg bg-white/10 border border-white/20 px-3 py-2">
                        <p className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider mb-0.5">Headline scored {result.overallScore}/100</p>
                        <p className="text-xs text-white/90 leading-snug italic line-clamp-2">"{result.headline}"</p>
                      </div>
                    )}
                  </div>

                  {/* Modal body */}
                  <div className="px-6 py-5">
                    <AnimatePresence mode="wait">
                      {!briefSubmitted ? (
                        <motion.div
                          key="brief-form"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <p className="text-sm text-slate-600 leading-relaxed">
                            We will send you a full SEO brief with recommended LSI keywords, subheadings, and target audience data for this specific headline.
                          </p>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                Business name
                              </Label>
                              <Input
                                type="text"
                                value={briefName}
                                onChange={(e) => setBriefName(e.target.value)}
                                placeholder="e.g. Acme Fintech Ltd"
                                className="h-10 text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                Work email <span className="text-red-400">*</span>
                              </Label>
                              <Input
                                type="email"
                                value={briefEmail}
                                onChange={(e) => setBriefEmail(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && briefEmail.trim()) submitBrief();
                                }}
                                placeholder="you@company.com"
                                className="h-10 text-sm"
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 flex gap-2.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-indigo-800 leading-relaxed">
                              Your brief will include <strong>LSI keywords</strong>, recommended <strong>subheadings</strong>, <strong>target audience insights</strong>, and a suggested content structure — all tailored to your headline.
                            </p>
                          </div>

                          <Button
                            onClick={submitBrief}
                            disabled={!briefEmail.trim() || briefSubmitting}
                            className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-semibold text-sm transition-all disabled:opacity-50"
                          >
                            {briefSubmitting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending request…
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Send Me the Free Brief
                              </span>
                            )}
                          </Button>

                          <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                            No spam, ever. We'll only send your content brief. Unsubscribe any time.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="brief-success"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="py-4 text-center space-y-3"
                        >
                          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <Check className="w-7 h-7 text-emerald-600" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-slate-900">Brief request received!</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              We'll send your personalised SEO content brief to <span className="font-semibold text-slate-700">{briefEmail}</span> within 24 hours.
                            </p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-left space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Your brief will include</p>
                            {["Recommended LSI keywords", "Suggested H2/H3 subheadings", "Target audience profile", "Content structure & word count guide"].map((item) => (
                              <div key={item} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="text-xs text-emerald-800">{item}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            onClick={closeBriefModal}
                            variant="outline"
                            className="w-full h-10 text-sm font-semibold"
                          >
                            Close
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Headline History Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop */}
            <motion.div
              key="history-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            />
            {/* Panel */}
            <motion.div
              key="history-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col bg-white shadow-2xl border-l border-slate-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-800">Headline History</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {history.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { clearHistory(); setShowHistory(false); }}
                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Entry list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {history.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400">
                    No analyses yet — run your first headline above.
                  </div>
                ) : (
                  history.map((entry, i) => {
                    const badgeBg =
                      entry.verdictColor === "emerald" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
                      entry.verdictColor === "blue"    ? "bg-blue-100 text-blue-700 ring-blue-200" :
                      entry.verdictColor === "amber"   ? "bg-amber-100 text-amber-700 ring-amber-200" :
                                                         "bg-red-100 text-red-700 ring-red-200";
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors group"
                      >
                        {/* Score + headline */}
                        <div className="flex items-start gap-2.5 mb-2">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-1 shrink-0 ${badgeBg}`}>
                            {entry.score}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                              {entry.headline}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {entry.verdict} · {timeAgo(entry.analyzedAt)}
                            </p>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              recallHistory(entry);
                              setShowHistory(false);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-[11px] font-semibold text-slate-600 py-1.5 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" /> Load
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!result) {
                                recallHistory(entry);
                                setShowHistory(false);
                              } else {
                                sendToComparison(entry.headline, -1);
                                setShowHistory(false);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 hover:bg-violet-100 text-[11px] font-semibold text-violet-700 py-1.5 transition-all"
                          >
                            <GitCompare className="w-3 h-3" /> A/B Compare
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-slate-100 text-[10px] text-slate-400 shrink-0">
                Last {history.length} of 10 analyses saved in your browser.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
