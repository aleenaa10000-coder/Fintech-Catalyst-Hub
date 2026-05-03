import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Download,
  Tag,
  X,
  TrendingUp,
  ArrowDownUp,
  CalendarClock,
  ScanSearch,
  Table2,
  FileText,
  LayoutGrid,
  Bookmark,
} from "lucide-react";

type Cadence = "weekly" | "2x-week" | "3x-week" | "daily";
type Timeframe = "30" | "60" | "90";
type Format = "blog" | "linkedin" | "mixed";

type FormState = {
  companyName: string;
  cadence: Cadence;
  timeframe: Timeframe;
  format: Format;
  topics: string[];
  topicInput: string;
};

const DEFAULTS: FormState = {
  companyName: "",
  cadence: "weekly",
  timeframe: "30",
  format: "blog",
  topics: [],
  topicInput: "",
};

// ─── Saved Templates (localStorage) ──────────────────────────────────────────

const PRESET_KEY = "fph_calendar_presets";
const MAX_PRESETS = 10;

type Preset = {
  id: string;
  name: string;
  savedAt: string;
  form: FormState;
};

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: Preset[]): void {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

const SUGGESTED_TOPICS = [
  "Embedded finance",
  "Open banking",
  "Fintech regulation",
  "Crypto & Web3",
  "BNPL trends",
  "Neobanks",
  "Payments innovation",
  "AI in lending",
  "Financial inclusion",
  "Insurtech",
  "RegTech",
  "DeFi",
];

// ─── Search-volume lookup table ───────────────────────────────────────────────
// Monthly global search volume estimates from public SEO data (Google Keyword
// Planner / Ahrefs / Semrush ranges, rounded to nearest band). Lookup is
// case-insensitive and falls back to a "Not enough data" placeholder for
// custom topics that aren't in the table.

type VolumeTier = "high" | "medium" | "low" | "unknown";

type VolumeEntry = {
  range: string;
  tier: VolumeTier;
  difficulty: number; // KD score 0–100
};

const SEARCH_VOLUME_TABLE: Record<string, VolumeEntry> = {
  "embedded finance":        { range: "5K–12K/mo",   tier: "medium", difficulty: 45 },
  "open banking":            { range: "18K–40K/mo",  tier: "high",   difficulty: 68 },
  "fintech regulation":      { range: "3K–8K/mo",    tier: "medium", difficulty: 42 },
  "crypto & web3":           { range: "50K–150K/mo", tier: "high",   difficulty: 82 },
  "crypto":                  { range: "200K+/mo",    tier: "high",   difficulty: 95 },
  "web3":                    { range: "40K–90K/mo",  tier: "high",   difficulty: 80 },
  "bnpl trends":             { range: "2K–6K/mo",    tier: "low",    difficulty: 28 },
  "bnpl":                    { range: "8K–20K/mo",   tier: "medium", difficulty: 55 },
  "buy now pay later":       { range: "10K–25K/mo",  tier: "high",   difficulty: 62 },
  "neobanks":                { range: "8K–20K/mo",   tier: "medium", difficulty: 52 },
  "neobank":                 { range: "10K–25K/mo",  tier: "high",   difficulty: 58 },
  "payments innovation":     { range: "1K–3K/mo",    tier: "low",    difficulty: 35 },
  "digital payments":        { range: "30K–70K/mo",  tier: "high",   difficulty: 72 },
  "ai in lending":           { range: "2K–5K/mo",    tier: "low",    difficulty: 32 },
  "ai in fintech":           { range: "8K–18K/mo",   tier: "medium", difficulty: 55 },
  "financial inclusion":     { range: "4K–10K/mo",   tier: "medium", difficulty: 48 },
  "insurtech":               { range: "6K–15K/mo",   tier: "medium", difficulty: 50 },
  "regtech":                 { range: "3K–7K/mo",    tier: "medium", difficulty: 44 },
  "defi":                    { range: "40K–100K/mo", tier: "high",   difficulty: 78 },
  "decentralized finance":   { range: "12K–30K/mo",  tier: "high",   difficulty: 65 },
  "fintech seo":             { range: "500–2K/mo",   tier: "low",    difficulty: 38 },
  "content marketing":       { range: "30K–80K/mo",  tier: "high",   difficulty: 85 },
  "link building":           { range: "20K–50K/mo",  tier: "high",   difficulty: 80 },
  "fintech marketing":       { range: "3K–8K/mo",    tier: "medium", difficulty: 45 },
  "challenger bank":         { range: "5K–12K/mo",   tier: "medium", difficulty: 48 },
  "payment gateway":         { range: "40K–90K/mo",  tier: "high",   difficulty: 78 },
  "blockchain":              { range: "100K+/mo",    tier: "high",   difficulty: 92 },
  "wealthtech":              { range: "2K–5K/mo",    tier: "low",    difficulty: 30 },
  "robo advisor":            { range: "12K–30K/mo",  tier: "high",   difficulty: 60 },
  "lendtech":                { range: "1K–3K/mo",    tier: "low",    difficulty: 22 },
  "paytech":                 { range: "1K–3K/mo",    tier: "low",    difficulty: 25 },
  "banking as a service":    { range: "6K–14K/mo",   tier: "medium", difficulty: 52 },
  "baas":                    { range: "4K–9K/mo",    tier: "medium", difficulty: 40 },
  "kyc compliance":          { range: "8K–18K/mo",   tier: "medium", difficulty: 55 },
  "aml compliance":          { range: "10K–22K/mo",  tier: "high",   difficulty: 60 },
  "fraud prevention":        { range: "15K–35K/mo",  tier: "high",   difficulty: 72 },
  "api banking":             { range: "3K–7K/mo",    tier: "medium", difficulty: 42 },
  "fintech startup":         { range: "8K–18K/mo",   tier: "medium", difficulty: 58 },
  "digital banking":         { range: "25K–60K/mo",  tier: "high",   difficulty: 75 },
  "cross-border payments":   { range: "5K–12K/mo",   tier: "medium", difficulty: 50 },
  "cbdc":                    { range: "10K–25K/mo",  tier: "high",   difficulty: 62 },
  "stablecoin":              { range: "20K–50K/mo",  tier: "high",   difficulty: 70 },
  "lending technology":      { range: "3K–7K/mo",    tier: "medium", difficulty: 35 },
  "alternative lending":     { range: "4K–9K/mo",    tier: "medium", difficulty: 40 },
  "financial technology":    { range: "20K–50K/mo",  tier: "high",   difficulty: 80 },
};

function estimateTopicDifficulty(topic: string): number {
  const words = topic.toLowerCase().trim().split(/\s+/);
  let score = 50;
  if (words.length === 1) score += 30;
  else if (words.length === 2) score += 15;
  else if (words.length === 3) score += 5;
  else score -= 10;
  return Math.max(5, Math.min(95, score));
}

function getSearchVolume(topic: string): VolumeEntry {
  const key = topic.toLowerCase().trim();
  return (
    SEARCH_VOLUME_TABLE[key] ?? {
      range: "< 500/mo",
      tier: "unknown",
      difficulty: estimateTopicDifficulty(topic),
    }
  );
}

const TIER_STYLE: Record<VolumeTier, string> = {
  high:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:  "bg-amber-50 text-amber-700 border-amber-200",
  low:     "bg-slate-50 text-slate-600 border-slate-200",
  unknown: "bg-slate-50 text-slate-400 border-slate-200",
};

const TIER_LABEL: Record<VolumeTier, string> = {
  high:    "High volume",
  medium:  "Medium volume",
  low:     "Low volume",
  unknown: "Custom topic",
};

function kdStyle(kd: number): string {
  if (kd >= 75) return "bg-red-50 text-red-700 border-red-200";
  if (kd >= 55) return "bg-orange-50 text-orange-700 border-orange-200";
  if (kd >= 35) return "bg-amber-50 text-amber-700 border-amber-200";
  if (kd >= 20) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-green-50 text-green-700 border-green-200";
}

function kdLabel(kd: number): string {
  if (kd >= 75) return "Very Hard";
  if (kd >= 55) return "Hard";
  if (kd >= 35) return "Medium";
  if (kd >= 20) return "Easy";
  return "Very Easy";
}

// ─── Priority Score ───────────────────────────────────────────────────────────
// Composite SEO opportunity score (0–100) that weights search volume (65%) and
// ranking ease (35%). High volume + low KD = top priority; low volume + high
// KD = avoid until you've built authority.

const VOLUME_POINTS: Record<VolumeTier, number> = {
  high:    100,
  medium:  55,
  low:     25,
  unknown: 10,
};

function computePriorityScore(tier: VolumeTier, kd: number): number {
  const ease = (100 - kd) / 100;
  return Math.round(VOLUME_POINTS[tier] * 0.65 + ease * 35);
}

function priorityStyle(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function priorityLabel(score: number): string {
  if (score >= 80) return "Hot Pick";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Moderate";
  return "Low";
}

function priorityEmoji(score: number): string {
  if (score >= 80) return "🔥";
  if (score >= 60) return "✅";
  if (score >= 40) return "⚡";
  return "🧊";
}

// ─── Content Velocity Tracker ─────────────────────────────────────────────────
type ContentStatus = "not-started" | "writing" | "review" | "published";
const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; icon: string; bg: string; text: string; border: string; ring: string; next: ContentStatus }
> = {
  "not-started": { label: "Not Started", icon: "○", bg: "bg-slate-50",   text: "text-slate-400",   border: "border-slate-200",  ring: "bg-slate-300",   next: "writing"      },
  writing:       { label: "Writing",     icon: "✎", bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",   ring: "bg-blue-400",    next: "review"       },
  review:        { label: "In Review",   icon: "◎", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  ring: "bg-amber-400",   next: "published"    },
  published:     { label: "Published",   icon: "✓", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "bg-emerald-500", next: "not-started"  },
};

const CADENCE_POSTS_PER_WEEK: Record<Cadence, number> = {
  weekly: 1,
  "2x-week": 2,
  "3x-week": 3,
  daily: 5,
};

const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Once a week",
  "2x-week": "Twice a week",
  "3x-week": "3× a week",
  daily: "Daily (weekdays)",
};

const FORMAT_LABELS: Record<Format, string> = {
  blog: "Blog posts",
  linkedin: "LinkedIn posts",
  mixed: "Blog + LinkedIn mix",
};

type ContentType = "blog" | "linkedin" | "roundup" | "case-study" | "guide";

const FORMAT_LABEL: Record<ContentType, string> = {
  blog: "Blog Post",
  linkedin: "LinkedIn Post",
  roundup: "Weekly Roundup",
  "case-study": "Case Study",
  guide: "In-Depth Guide",
};

type SearchIntent = "SEO Intent" | "Engagement Intent";

type CalendarEntry = {
  week: number;
  date: string;
  topic: string;
  angle: string;
  archetype: string;
  type: ContentType;
  cta: string;
  searchIntent: SearchIntent;
  searchVolume: string;
  topicDifficulty: number;
  priorityScore: number;
};

// ─── Topics flagged as high search-intent (SEO-driven titles preferred) ──────
const HIGH_SEARCH_INTENT_TOPICS = new Set([
  "embedded finance",
  "open banking",
  "fintech regulation",
  "payments innovation",
  "ai in lending",
  "financial inclusion",
  "insurtech",
  "regtech",
  "fintech seo",
  "content marketing",
  "link building",
]);

function isHighSearchIntent(topic: string): boolean {
  return HIGH_SEARCH_INTENT_TOPICS.has(topic.toLowerCase());
}

// ─── Archetype definitions ────────────────────────────────────────────────────
// Each archetype has a name, a template for blog/guide (SEO), and a hook-first
// variant for LinkedIn. {topic} and {year} are replaced at generation time.
// Archetypes rotate every 30-post cycle, guaranteeing ≥ 8 distinct structures.

type Archetype = {
  name: string;
  seo: string;       // used for blog / roundup / case-study
  hook: string;      // used for linkedin
  guide?: string;    // used for in-depth guides — authoritative, comprehensive language
};

const ARCHETYPES: Archetype[] = [
  {
    name: "The Blueprint",
    seo: "A Practical Framework for {topic}: The Step-by-Step Playbook Fintech Teams Use in {year}",
    hook: "Most fintechs over-complicate {topic}. Here's the exact framework:",
    guide: "The Definitive {topic} Playbook: A Practical, Step-by-Step Framework for Fintech Leaders in {year}",
  },
  {
    name: "The Comparison",
    seo: "{topic} vs. the Alternatives: Which Wins for Fintech Brands in {year}?",
    hook: "I compared {topic} to the old playbook. The gap surprised me:",
    guide: "The Comprehensive {year} Comparison Guide: {topic} vs. the Alternatives — A Framework for Fintech Decision-Makers",
  },
  {
    name: "The Trendsetter",
    seo: "The Future of {topic} in Fintech: What to Expect by Q4 {year}",
    hook: "{topic} is evolving fast. Here's what's coming by Q4 {year}:",
    guide: "The Complete {year} {topic} Trends Report: A Comprehensive Look at What's Shaping Fintech Next",
  },
  {
    name: "The Data Dive",
    seo: "Breaking Down the ROI of {topic} for Fintech SMEs in {year}",
    hook: "We analysed 50+ fintech brands on {topic}. The ROI numbers:",
    guide: "The {year} {topic} ROI Intelligence Report: A Comprehensive, Data-Driven Analysis for Fintech SMEs",
  },
  {
    name: "The Contrarian",
    seo: "Why {topic} Is Failing Fintech Founders — And What the Smart Ones Do Instead in {year}",
    hook: "Unpopular opinion: most fintechs get {topic} completely wrong.",
    guide: "The Contrarian's Complete Guide to {topic} in {year}: A Comprehensive Breakdown of What Actually Works",
  },
  {
    name: "The How-To",
    seo: "How to Leverage {topic} to Scale Your Fintech in {year}",
    hook: "{topic} drove 10K+ organic visits. Here are the exact steps:",
    guide: "The Complete How-To Guide for {topic}: A Step-by-Step Blueprint for Fintech Growth in {year}",
  },
  {
    name: "The Listicle",
    seo: "7 Ways {topic} Is Reshaping Fintech in {year} — and What CMOs Must Do Now",
    hook: "7 things I wish I knew about {topic} before we started.",
    guide: "The Authoritative {year} List: 12 Ways {topic} Is Reshaping High-Growth Fintech Brands",
  },
  {
    name: "The Deep Dive",
    seo: "The State of {topic} in {year}: What High-Authority Fintechs Already Know",
    hook: "I spent 3 months studying how elite fintechs use {topic}. Here's what I found:",
    guide: "The Authoritative {year} Deep Dive into {topic}: Everything High-Growth Fintech Brands Need to Know",
  },
  {
    name: "The Warning",
    seo: "The Biggest {topic} Mistakes Fintechs Make in {year} — and How to Avoid Them",
    hook: "Most fintechs make this {topic} mistake. Are you?",
    guide: "The Comprehensive {topic} Risk Report {year}: Critical Mistakes Fintech Brands Must Avoid",
  },
  {
    name: "The Future",
    seo: "The Future of {topic} in Fintech: Predictions and Opportunities for {year}",
    hook: "{topic} is changing fast. 3 things that will matter most in {year}:",
    guide: "The Definitive {year} {topic} Outlook: A Comprehensive Analysis of Predictions and Opportunities for Fintech",
  },
  {
    name: "The Authority Guide",
    seo: "The Complete {year} Guide to {topic} for Ambitious Fintech Brands",
    hook: "Everything you need to know about {topic}, in one post. Save this:",
    guide: "The Complete {year} {topic} Reference Guide: The Authoritative Resource for Ambitious Fintech Brands",
  },
  {
    name: "The Case Study",
    seo: "Case Study: How a Series B Fintech 3× Their Pipeline Using {topic} in {year}",
    hook: "We helped a fintech 3× their pipeline with {topic}. The exact playbook:",
    guide: "In-Depth Case Study Analysis: How High-Growth Fintechs Are Scaling {topic} in {year}",
  },
  {
    name: "The Why Now",
    seo: "Why {topic} Matters More Than Ever for Fintech Brands in {year}",
    hook: "Why {topic} matters right now — and what most brands are missing:",
    guide: "The Comprehensive {year} {topic} Urgency Report: Why Now Is the Decisive Moment for Fintech Brands",
  },
  {
    name: "The Insider",
    seo: "What Elite Fintech Brands Know About {topic} That Others Don't ({year})",
    hook: "The {topic} insight top fintech teams don't talk about publicly:",
    guide: "The Insider's Complete {year} Guide to {topic}: Authoritative Strategies Only Elite Fintechs Use",
  },
  {
    name: "The Opportunity",
    seo: "The Hidden {topic} Opportunity Every Fintech Brand Should Target in {year}",
    hook: "There's a {topic} opportunity most fintechs are completely ignoring:",
    guide: "The Definitive {year} {topic} Opportunity Report: A Comprehensive Blueprint for Fintech Growth",
  },
  {
    name: "The Benchmark",
    seo: "{topic} Benchmarks for Fintech in {year}: Where Does Your Brand Stand?",
    hook: "{topic} benchmarks for fintech are out. Here's how to read them:",
    guide: "The Complete {year} {topic} Benchmark Report: A Comprehensive Analysis of Where Fintech Brands Stand",
  },
];

// ─── Format-specific archetype pools ─────────────────────────────────────────
// Each content type has a preferred archetype set matching its editorial goal.
// The engine tries candidates from this pool first within each priority group,
// then falls back to the full set — the mandatory-mix guarantee is preserved.

const TYPE_ARCHETYPES: Record<ContentType, string[]> = {
  blog: [
    "The Blueprint",
    "The Contrarian",
    "The Future",
    "The Data Dive",
    "The How-To",
    "The Warning",
    "The Why Now",
    "The Deep Dive",
    "The Trendsetter",
    "The Opportunity",
    "The Comparison",
    "The Benchmark",
  ],
  guide: [
    "The Authority Guide",
    "The Blueprint",
    "The Case Study",
    "The Deep Dive",
    "The Data Dive",
    "The How-To",
    "The Listicle",
    "The Insider",
  ],
  linkedin: [
    "The Insider",
    "The Why Now",
    "The Contrarian",
    "The Opportunity",
    "The Trendsetter",
    "The Warning",
    "The Future",
    "The Data Dive",
  ],
  roundup: [
    "The Listicle",
    "The Benchmark",
    "The Trendsetter",
    "The Comparison",
    "The Opportunity",
  ],
  "case-study": [
    "The Case Study",
    "The Data Dive",
    "The Benchmark",
    "The Blueprint",
    "The Insider",
  ],
};

// ─── Context-aware CTAs ───────────────────────────────────────────────────────
// When a topic contains a recognised fintech keyword the engine returns a CTA
// tailored to that niche. Generic pools below act as the catch-all fallback.

type TopicCtaEntry = { keywords: string[]; ctas: Record<ContentType, string> };

const TOPIC_CTA_OVERRIDES: TopicCtaEntry[] = [
  {
    keywords: ["regtech", "regulation", "compliance", "kyc", "aml"],
    ctas: {
      blog:         "Request a compliance-focused content audit.",
      guide:        "Download the RegTech compliance content playbook.",
      "case-study": "See how we help RegTech brands build regulatory authority.",
      roundup:      "Subscribe for weekly RegTech intelligence.",
      linkedin:     "DM us to audit your compliance content strategy.",
    },
  },
  {
    keywords: ["embedded finance", "embedded"],
    ctas: {
      blog:         "Explore our embedded finance content strategy services.",
      guide:        "Download the embedded finance content blueprint.",
      "case-study": "See how embedded finance brands build authority with content.",
      roundup:      "Subscribe for embedded finance insights every week.",
      linkedin:     "DM us to see the full ROI data breakdown.",
    },
  },
  {
    keywords: ["open banking", "open finance"],
    ctas: {
      blog:         "Request an open banking content strategy session.",
      guide:        "Download the open banking authority content guide.",
      "case-study": "See how open banking brands win with thought leadership.",
      roundup:      "Subscribe for open banking updates from FintechPressHub.",
      linkedin:     "DM us to discuss your open banking content pipeline.",
    },
  },
  {
    keywords: ["crypto", "web3", "defi", "blockchain"],
    ctas: {
      blog:         "Explore our Web3 and crypto content strategy services.",
      guide:        "Download the crypto content authority guide.",
      "case-study": "See how crypto-native brands build trust with content.",
      roundup:      "Subscribe for weekly Web3 content intelligence.",
      linkedin:     "DM us for the full crypto content performance data.",
    },
  },
  {
    keywords: ["payment", "payments"],
    ctas: {
      blog:         "Book a payments content strategy consultation.",
      guide:        "Download the definitive payments content playbook.",
      "case-study": "See how payments brands scale pipeline with content.",
      roundup:      "Subscribe for payments industry intelligence.",
      linkedin:     "DM us to benchmark your payments content against the market.",
    },
  },
  {
    keywords: ["insurtech", "insurance"],
    ctas: {
      blog:         "Request an insurtech content strategy review.",
      guide:        "Download the insurtech authority content guide.",
      "case-study": "See how insurtech brands build authority with thought leadership.",
      roundup:      "Subscribe for weekly insurtech intelligence.",
      linkedin:     "DM us to see our insurtech content performance data.",
    },
  },
  {
    keywords: ["lending", "credit", "loan"],
    ctas: {
      blog:         "Book a fintech lending content strategy consultation.",
      guide:        "Download the fintech lending content playbook.",
      "case-study": "See how lending brands convert with strategic content.",
      roundup:      "Subscribe for fintech lending market insights.",
      linkedin:     "DM us to see the AI-in-lending ROI breakdown.",
    },
  },
  {
    keywords: ["wealth", "wealthtech", "investment"],
    ctas: {
      blog:         "Request a wealthtech content strategy audit.",
      guide:        "Download the wealthtech content authority guide.",
      "case-study": "See how wealthtech brands build trust with content.",
      roundup:      "Subscribe for wealthtech content insights.",
      linkedin:     "DM us to see how top wealthtech brands use content to convert.",
    },
  },
];

const CTAS_BY_TYPE: Record<ContentType, string[]> = {
  blog: [
    "Request your free fintech content audit.",
    "Subscribe to the FintechPressHub weekly digest.",
    "Book a free 30-minute strategy call.",
    "Explore our fintech content services.",
    "View content retainer pricing.",
    "Download the companion strategy guide.",
  ],
  guide: [
    "Download the full whitepaper.",
    "Request a free editorial strategy audit.",
    "Request a personalised content brief.",
    "Book a strategy workshop.",
    "Download our free content brief templates.",
    "Download the companion content toolkit.",
  ],
  roundup: [
    "Subscribe to the weekly editorial digest.",
    "Join 2,000+ fintech marketers — subscribe free.",
    "Explore our content marketing services.",
    "Submit a guest post pitch.",
  ],
  "case-study": [
    "Book a free strategy call.",
    "See how we build content strategies that convert.",
    "Request your free content growth audit.",
    "See similar client results.",
  ],
  linkedin: [
    "DM us to access the full data breakdown.",
    "Follow for weekly fintech growth insights.",
    "Tag a founder who needs to see this.",
    "Share your experience in the comments.",
    "Run a LinkedIn poll on this topic.",
    "Invite readers to share their take in the comments.",
  ],
};

function resolveCta(type: ContentType, topic: string, index: number): string {
  const topicLower = topic.toLowerCase();
  for (const entry of TOPIC_CTA_OVERRIDES) {
    if (entry.keywords.some((kw) => topicLower.includes(kw))) {
      return entry.ctas[type];
    }
  }
  const pool = CTAS_BY_TYPE[type];
  return pool[index % pool.length];
}

// ─── Title builder ────────────────────────────────────────────────────────────

function resolveSearchIntent(
  topic: string,
  type: ContentType,
  forceHook: boolean,
): SearchIntent {
  const useHook =
    forceHook || type === "linkedin" || (!isHighSearchIntent(topic) && type === "blog");
  return useHook ? "Engagement Intent" : "SEO Intent";
}

function buildTitle(
  archetype: Archetype,
  topic: string,
  year: number,
  type: ContentType,
  forceHook: boolean,
): string {
  const useHook =
    forceHook || type === "linkedin" || (!isHighSearchIntent(topic) && type === "blog");
  // In-Depth Guides get their own authoritative template when one exists.
  // This guarantees "comprehensive / definitive / complete" language on every
  // guide headline without forcing awkward prefixes onto blog or LinkedIn copy.
  let template: string;
  if (type === "guide" && archetype.guide) {
    template = archetype.guide;
  } else if (useHook) {
    template = archetype.hook;
  } else {
    template = archetype.seo;
  }
  return template
    .replace(/\{topic\}/gi, topic)
    .replace(/\{year\}/gi, String(year));
}

// ─── Prefix key extraction ────────────────────────────────────────────────────
// Returns the first 4 significant words of a title, lowercased and stripped of
// punctuation — used by the prefix-diversity guard to prevent repetitive openers.

function extractPrefix(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 4)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// ─── Main calendar builder ────────────────────────────────────────────────────

function buildCalendar(form: FormState): CalendarEntry[] {
  const days = parseInt(form.timeframe);
  const postsPerWeek = CADENCE_POSTS_PER_WEEK[form.cadence];
  const totalPosts = Math.round((days / 7) * postsPerWeek);

  const topics =
    form.topics.length > 0
      ? form.topics
      : ["Fintech SEO", "Content marketing", "Link building"];

  const entries: CalendarEntry[] = [];

  // Align start to the next Monday
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const dayOfWeek = startDate.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  startDate.setDate(startDate.getDate() + daysUntilMonday);

  const publishDays: Record<Cadence, number[]> = {
    weekly: [1],
    "2x-week": [1, 4],
    "3x-week": [1, 3, 5],
    daily: [1, 2, 3, 4, 5],
  };
  const selectedDays = publishDays[form.cadence];

  // ── Deduplication ──────────────────────────────────────────────────────────
  const usedTitlesGlobal = new Set<string>();

  // ── Prefix diversity guard — per 30-post cycle ────────────────────────────
  // Within each 30-post cycle a headline opening phrase (first 4 words) may
  // not repeat more than MAX_PREFIX_REPEATS times. The map resets at every
  // cycle boundary so a 60- or 90-day calendar is not penalised for variety
  // choices made in earlier months.
  let prefixCount = new Map<string, number>();
  const MAX_PREFIX_REPEATS = 3;

  // ── Mandatory archetype mix — per 30-post cycle ───────────────────────────
  // Every 30-post cycle must contain at least one piece framed through each
  // of these four cornerstone archetypes. Together they guarantee the
  // editorial breadth a senior content strategist expects: proof via case
  // study, intellectual challenge via contrarian angle, credibility via data,
  // and actionability via step-by-step blueprint.
  const MANDATORY_ARCHETYPES = [
    "The Case Study",   // social proof / bottom-of-funnel
    "The Contrarian",   // opinion / thought leadership
    "The Data Dive",    // data-led / authoritative
    "The Blueprint",    // actionable / step-by-step
  ];
  let mandatoryUsedThisCycle = new Set<string>();

  // ── Strategic guide spacing ────────────────────────────────────────────────
  // In-Depth Guides must be spaced ≥ 3 calendar days apart to reflect a
  // realistic high-authority editorial workflow.
  let lastGuideDate: Date | null = null;
  const MIN_GUIDE_GAP_DAYS = 3;

  const CYCLE_SIZE = 30;

  let postCount = 0;
  let weekOffset = 0;

  while (postCount < totalPosts) {
    for (const day of selectedDays) {
      if (postCount >= totalPosts) break;

      const d = new Date(startDate);
      d.setDate(d.getDate() + weekOffset * 7 + (day - 1));

      // Year is always derived from the actual publish date — locks {year}
      // placeholders to the calendar's real timeframe (e.g. 2026 or 2027).
      const publishYear = d.getFullYear();

      // ── Interleaved topic assignment ──────────────────────────────────────
      // With multiple topics we rotate round-robin but ensure no two
      // consecutive slots share the same topic (swap forward if needed).
      let topicIndex = postCount % topics.length;
      if (topics.length > 1 && postCount > 0) {
        const prevTopic = entries[entries.length - 1]?.topic;
        if (topics[topicIndex] === prevTopic) {
          topicIndex = (topicIndex + 1) % topics.length;
        }
      }
      const topic = topics[topicIndex];

      // Archetype rotates through the full set across a 30-post cycle
      const cyclePosition = postCount % CYCLE_SIZE;
      const archetypeIndex = cyclePosition % ARCHETYPES.length;

      // ── Reset per-cycle trackers at every cycle boundary ─────────────────
      // This scopes both the prefix-diversity rule and mandatory-mix rule to
      // individual 30-day windows rather than the entire calendar span.
      if (cyclePosition === 0 && postCount > 0) {
        prefixCount = new Map<string, number>();
        mandatoryUsedThisCycle = new Set<string>();
      }

      // ── Determine content type ────────────────────────────────────────────
      let type: ContentType;
      if (form.format === "blog") {
        if (postCount % 12 === 11) type = "guide";
        else if (postCount % 8 === 7) type = "roundup";
        else if (postCount % 10 === 9) type = "case-study";
        else type = "blog";
      } else if (form.format === "linkedin") {
        type = "linkedin";
      } else {
        const cycle = postCount % 4;
        if (cycle === 0) type = "blog";
        else if (cycle === 1) type = "linkedin";
        else if (cycle === 2) type = "blog";
        else type = postCount % 8 === 7 ? "case-study" : "guide";
      }

      // ── Strategic guide spacing enforcement ───────────────────────────────
      // Downgrade a guide to a regular blog post if the last published guide
      // was fewer than MIN_GUIDE_GAP_DAYS ago — mirrors a real editorial queue
      // where back-to-back long-form pieces exhaust the production capacity.
      if (type === "guide" && lastGuideDate !== null) {
        const daysSinceLast = Math.round(
          (d.getTime() - lastGuideDate.getTime()) / 86_400_000,
        );
        if (daysSinceLast < MIN_GUIDE_GAP_DAYS) {
          type = "blog";
        }
      }

      const isLinkedIn = type === "linkedin";

      // ── Title selection: mandatory-mix + prefix-diversity + dedup ────────
      // Candidate archetypes are ranked so that:
      //   1. Mandatory archetypes not yet used this cycle appear first.
      //   2. If the number of remaining slots in the cycle equals the number
      //      of still-missing mandatory archetypes (hard-reserve trigger), the
      //      engine ONLY considers mandatory candidates for this slot — this
      //      guarantees full coverage even in dense calendars.
      //   3. Within each group the normal cycle-position rotation applies.
      //   4. Prefix diversity (≤ MAX_PREFIX_REPEATS per 30-post window) and
      //      global deduplication are still enforced as gates.
      const mandatoryMissing = MANDATORY_ARCHETYPES.filter(
        (n) => !mandatoryUsedThisCycle.has(n),
      );
      const remainingInCycle = CYCLE_SIZE - cyclePosition;
      const mustUseMandatory = mandatoryMissing.length > 0 &&
        remainingInCycle <= mandatoryMissing.length;

      // Build a search order: mandatory-missing archetypes first (preserving
      // their internal order), then all others starting from archetypeIndex.
      const mandatoryArchetypes = ARCHETYPES.filter((a) =>
        mandatoryMissing.includes(a.name),
      );
      const otherArchetypes = ARCHETYPES.filter(
        (a) => !mandatoryMissing.includes(a.name),
      );
      // Rotate others so the scheduled archetype index leads.
      const rotatedOthers = [
        ...otherArchetypes.slice(archetypeIndex % otherArchetypes.length),
        ...otherArchetypes.slice(0, archetypeIndex % otherArchetypes.length),
      ];
      // Within each priority group prefer archetypes suited to the current
      // content type. Applied as a stable sort so mandatory-mix is preserved:
      // if a mandatory archetype is type-appropriate it stays at front; if not,
      // it falls behind type-matched candidates but is still tried before any
      // type-unmatched non-mandatory candidates.
      const typePool = TYPE_ARCHETYPES[type];
      const reorderByType = (arr: Archetype[]) => [
        ...arr.filter((a) => typePool.includes(a.name)),
        ...arr.filter((a) => !typePool.includes(a.name)),
      ];
      const searchOrder = mustUseMandatory
        ? reorderByType(mandatoryArchetypes)
        : [...reorderByType(mandatoryArchetypes), ...reorderByType(rotatedOthers)];

      let title = "";
      let chosenArchetype = ARCHETYPES[archetypeIndex];

      for (const arch of searchOrder) {
        const candidate = buildTitle(arch, topic, publishYear, type, isLinkedIn);

        if (usedTitlesGlobal.has(candidate.toLowerCase())) continue;

        const prefix = extractPrefix(candidate);
        if ((prefixCount.get(prefix) ?? 0) >= MAX_PREFIX_REPEATS) continue;

        title = candidate;
        chosenArchetype = arch;
        prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
        if (MANDATORY_ARCHETYPES.includes(arch.name)) {
          mandatoryUsedThisCycle.add(arch.name);
        }
        break;
      }

      // Final fallback: prefer a missing mandatory archetype if possible so
      // the coverage guarantee degrades gracefully rather than silently fails.
      if (!title) {
        const fallbackArch =
          mandatoryMissing.length > 0
            ? (ARCHETYPES.find((a) => a.name === mandatoryMissing[0]) ??
              ARCHETYPES[archetypeIndex])
            : ARCHETYPES[archetypeIndex];
        const base = buildTitle(fallbackArch, topic, publishYear, type, isLinkedIn);
        title = `${base} — Vol. ${Math.floor(postCount / ARCHETYPES.length) + 2}`;
        chosenArchetype = fallbackArch;
        const prefix = extractPrefix(title);
        prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
        if (MANDATORY_ARCHETYPES.includes(fallbackArch.name)) {
          mandatoryUsedThisCycle.add(fallbackArch.name);
        }
      }

      usedTitlesGlobal.add(title.toLowerCase());

      // Record guide publish date for spacing enforcement on the next guide
      if (type === "guide") lastGuideDate = new Date(d);

      const vol = getSearchVolume(topic);
      entries.push({
        week: Math.floor(postCount / postsPerWeek) + 1,
        date: d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        topic,
        angle: title,
        archetype: chosenArchetype.name,
        type,
        cta: resolveCta(type, topic, postCount),
        searchIntent: resolveSearchIntent(topic, type, isLinkedIn),
        searchVolume: vol.range,
        topicDifficulty: vol.difficulty,
        priorityScore: computePriorityScore(vol.tier, vol.difficulty),
      });

      postCount++;
    }
    weekOffset++;
  }

  return entries;
}

// ─── Single-entry builder (used by gap-fill action) ──────────────────────────

const GAP_PREFERRED_ARCHETYPE: Partial<Record<ContentType, string>> = {
  guide:          "The Authority Guide",
  "case-study":   "The Case Study",
  roundup:        "The Listicle",
  linkedin:       "The Insider",
  blog:           "The Blueprint",
};

function buildSingleEntry(
  topic: string,
  type: ContentType,
  existingCount: number,
): CalendarEntry {
  const preferred = GAP_PREFERRED_ARCHETYPE[type];
  const arch =
    (preferred ? ARCHETYPES.find((a) => a.name === preferred) : null) ??
    ARCHETYPES[existingCount % ARCHETYPES.length];

  const isLinkedIn = type === "linkedin";
  const publishYear = new Date().getFullYear();
  const angle = buildTitle(arch, topic, publishYear, type, isLinkedIn);

  // Schedule ~2 weeks from now, always on a Monday
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  d.setDate(d.getDate() + daysUntilMonday + 7);

  const vol = getSearchVolume(topic);
  return {
    week: Math.floor(existingCount / 4) + 1,
    date: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    topic,
    angle,
    archetype: arch.name,
    type,
    cta: resolveCta(type, topic, existingCount),
    searchIntent: resolveSearchIntent(topic, type, isLinkedIn),
    searchVolume: vol.range,
    topicDifficulty: vol.difficulty,
    priorityScore: computePriorityScore(vol.tier, vol.difficulty),
  };
}

// ─── Topic color palette (consistent hex per topic, cycling across 10 slots) ──

const TOPIC_HEX_PALETTE = [
  { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46" }, // emerald
  { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" }, // sapphire/blue
  { bg: "#fdf4ff", border: "#e879f9", text: "#86198f" }, // fuchsia
  { bg: "#fff7ed", border: "#fb923c", text: "#9a3412" }, // orange
  { bg: "#f0fdf4", border: "#86efac", text: "#166534" }, // green
  { bg: "#fefce8", border: "#fde047", text: "#854d0e" }, // yellow
  { bg: "#f0f9ff", border: "#7dd3fc", text: "#075985" }, // sky
  { bg: "#faf5ff", border: "#c084fc", text: "#6b21a8" }, // purple
  { bg: "#fff1f2", border: "#fda4af", text: "#9f1239" }, // rose
  { bg: "#f8fafc", border: "#94a3b8", text: "#334155" }, // slate
];

function topicColorStyle(
  topic: string,
  topicList: string[],
): { backgroundColor: string; borderColor: string; color: string } {
  const idx = topicList.indexOf(topic);
  const slot = (idx < 0 ? 0 : idx) % TOPIC_HEX_PALETTE.length;
  const { bg, border, text } = TOPIC_HEX_PALETTE[slot];
  return { backgroundColor: bg, borderColor: border, color: text };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(entries: CalendarEntry[], companyName: string) {
  const header = "Week,Date,Topic,Est. Monthly Search Volume,KD (numeric),Topic Difficulty Label,Priority Score (numeric),Priority Label,Working Title,Archetype,Content Type,Search Intent,CTA\n";
  const rows = entries
    .map(
      (e) =>
        `${e.week},"${e.date}","${e.topic}","${e.searchVolume}",${e.topicDifficulty},"${kdLabel(e.topicDifficulty)}",${e.priorityScore},"${priorityLabel(e.priorityScore)}","${e.angle}","${e.archetype}","${FORMAT_LABEL[e.type]}","${e.searchIntent}","${e.cta}"`,
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(companyName || "fintech").replace(/\s+/g, "-").toLowerCase()}-content-calendar.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Styling ──────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<ContentType, string> = {
  blog: "bg-blue-50 text-blue-700 border-blue-200",
  linkedin: "bg-sky-50 text-sky-700 border-sky-200",
  roundup: "bg-purple-50 text-purple-700 border-purple-200",
  "case-study": "bg-amber-50 text-amber-700 border-amber-200",
  guide: "bg-green-50 text-green-700 border-green-200",
};

const TYPE_BAR_COLOR: Record<ContentType, string> = {
  blog: "bg-blue-500",
  linkedin: "bg-sky-400",
  roundup: "bg-purple-400",
  "case-study": "bg-amber-400",
  guide: "bg-green-500",
};

// ─── Competitor Gap Analysis ──────────────────────────────────────────────────
// Maps fintech niche keywords → content formats competitors most commonly
// publish. Any format absent from the user's calendar is flagged as a gap.

type CompetitorThreat = "High" | "Medium" | "Low";

const COMPETITOR_FORMAT_PRIORITY: {
  keywords: string[];
  priority: Partial<Record<ContentType, CompetitorThreat>>;
  insight: string;
}[] = [
  {
    keywords: ["regtech", "compliance", "regulation", "kyc", "aml", "gdpr"],
    priority: { guide: "High", "case-study": "High", blog: "Medium", roundup: "Low" },
    insight: "RegTech audiences trust long-form compliance guides and vendor case studies above all else.",
  },
  {
    keywords: ["open banking", "psd2", "api banking", "open finance"],
    priority: { guide: "High", blog: "High", "case-study": "Medium", roundup: "Medium" },
    insight: "Open Banking wins with technical guides and developer-focused blog posts.",
  },
  {
    keywords: ["defi", "decentralized finance", "crypto", "web3", "blockchain"],
    priority: { blog: "High", roundup: "High", guide: "Medium", linkedin: "Medium" },
    insight: "DeFi audiences consume fast-moving roundups and explainer blogs — velocity matters.",
  },
  {
    keywords: ["payment", "embedded finance", "payment gateway", "acquiring"],
    priority: { guide: "High", blog: "High", "case-study": "High", roundup: "Medium" },
    insight: "Payments is crowded — case studies and in-depth guides cut through commodity content.",
  },
  {
    keywords: ["insurtech", "insurance"],
    priority: { guide: "High", "case-study": "High", blog: "Medium" },
    insight: "Insurtech buyers research heavily — case studies and implementation guides drive conversions.",
  },
  {
    keywords: ["lending", "credit", "loan", "bnpl", "buy now pay later"],
    priority: { blog: "High", guide: "High", "case-study": "Medium", linkedin: "Medium" },
    insight: "Lending content wins with risk and ROI data — guides and blog posts dominate SERPs.",
  },
  {
    keywords: ["wealthtech", "wealth management", "robo-advisor", "investment"],
    priority: { guide: "High", blog: "High", linkedin: "High", "case-study": "Medium" },
    insight: "WealthTech relies on thought leadership — LinkedIn and long-form guides build advisor trust.",
  },
  {
    keywords: ["neobank", "challenger bank", "digital bank", "banking"],
    priority: { blog: "High", "case-study": "High", guide: "Medium", roundup: "Medium" },
    insight: "Neobanking audiences compare options — roundups and case studies perform well.",
  },
  {
    keywords: ["ai", "artificial intelligence", "machine learning", "llm"],
    priority: { blog: "High", guide: "High", roundup: "High", linkedin: "Medium" },
    insight: "AI in fintech moves fast — timely blog posts and roundups capture emerging search demand.",
  },
  {
    keywords: ["fintech", "financial technology", "financial services", ""],
    priority: { guide: "High", blog: "High", "case-study": "Medium", roundup: "Medium", linkedin: "Medium" },
    insight: "Evergreen fintech content benefits from a balanced mix of guides, blogs, and case studies.",
  },
];

function getCompetitorPriority(
  topic: string,
): (typeof COMPETITOR_FORMAT_PRIORITY)[0] {
  const lower = topic.toLowerCase();
  return (
    COMPETITOR_FORMAT_PRIORITY.find((entry) =>
      entry.keywords.some((kw) => kw && lower.includes(kw)),
    ) ?? COMPETITOR_FORMAT_PRIORITY[COMPETITOR_FORMAT_PRIORITY.length - 1]
  );
}

const COMPETITOR_ANGLE_BY_TYPE: Record<ContentType, string> = {
  guide:        "The Definitive [Topic] Guide for 2026: Strategy, Tools & ROI",
  blog:         "How [Topic] Is Reshaping Enterprise Finance in 2026",
  "case-study": "[Client] Cut Costs 40% with [Topic]: A Full Case Study",
  roundup:      "12 Best [Topic] Solutions Compared: 2026 Buyer's Guide",
  linkedin:     "5 [Topic] predictions every CFO needs to see before Q3 2026",
};

const DEPTH_BY_TYPE_LABEL: Record<ContentType, string> = {
  guide:        "4,000–8,000 words · schema markup",
  blog:         "1,500–2,500 words · internal links",
  "case-study": "1,200–2,000 words · metrics + quotes",
  roundup:      "2,000–4,000 words · comparison tables",
  linkedin:     "Short-form · 3–5 key points",
};

// ─── Content Gap Finder ───────────────────────────────────────────────────────

type ContentGap = {
  topic: string;
  missingType: ContentType;
  vol: VolumeEntry;
  opportunityScore: number;
};

const GAP_REASON: Record<ContentType, string> = {
  blog:          "Best format for capturing organic search traffic",
  guide:         "Pillar content that ranks for entire keyword clusters",
  "case-study":  "High-converting proof for bottom-of-funnel queries",
  roundup:       "Earns backlinks and builds industry authority",
  linkedin:      "Extends reach to decision-makers and practitioners",
};

const GAP_TYPE_WEIGHT: Record<ContentType, number> = {
  blog:         1.00,
  guide:        0.95,
  "case-study": 0.85,
  roundup:      0.70,
  linkedin:     0.60,
};

// ─── Industry average priority benchmarks ─────────────────────────────────────
// Calibrated estimates of typical competitor SEO priority scores per niche.
// Higher avg = more competitive niche; lower avg = easier to outrank incumbents.

const INDUSTRY_BENCHMARK_OVERRIDES: Array<{
  keywords: string[];
  avg: number;
  label: string;
}> = [
  { keywords: ["payment", "payments"],                              avg: 62, label: "Payments" },
  { keywords: ["crypto", "web3", "defi", "blockchain"],            avg: 60, label: "Crypto & Web3" },
  { keywords: ["lending", "credit", "loan"],                       avg: 58, label: "Lending & Credit" },
  { keywords: ["ai in lending", "ai in finance"],                  avg: 57, label: "AI in Finance" },
  { keywords: ["open banking", "open finance"],                    avg: 55, label: "Open Banking" },
  { keywords: ["regtech", "regulation", "compliance", "kyc", "aml"], avg: 52, label: "RegTech" },
  { keywords: ["wealthtech", "wealth", "investment"],              avg: 50, label: "WealthTech" },
  { keywords: ["embedded finance", "embedded"],                    avg: 48, label: "Embedded Finance" },
  { keywords: ["fintech seo", "seo"],                              avg: 45, label: "Fintech SEO" },
  { keywords: ["content marketing"],                               avg: 44, label: "Content Marketing" },
  { keywords: ["insurtech", "insurance"],                          avg: 42, label: "InsurTech" },
  { keywords: ["financial inclusion"],                             avg: 40, label: "Financial Inclusion" },
];

const INDUSTRY_BENCHMARK_DEFAULT_AVG = 47;

function getIndustryBenchmark(topic: string): { avg: number; label: string } {
  const lower = topic.toLowerCase();
  for (const { keywords, avg, label } of INDUSTRY_BENCHMARK_OVERRIDES) {
    if (keywords.some((kw) => lower.includes(kw))) return { avg, label };
  }
  return { avg: INDUSTRY_BENCHMARK_DEFAULT_AVG, label: "Fintech (General)" };
}

// ─── Authority target by niche competitiveness ────────────────────────────────
// Estimated total quality content pieces needed to reach first-page authority,
// calibrated by competitor benchmark avg. Higher competition = more pieces.

function getAuthorityTarget(industryAvg: number): number {
  if (industryAvg >= 60) return 36;
  if (industryAvg >= 55) return 28;
  if (industryAvg >= 50) return 22;
  if (industryAvg >= 45) return 16;
  if (industryAvg >= 40) return 12;
  return 10;
}

// ─── Cluster sufficiency thresholds ───────────────────────────────────────────

const CLUSTER_SUFFICIENCY_MIN = 3;
const CLUSTER_SUFFICIENCY_GOOD = 6;

function clusterStatus(count: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (count >= CLUSTER_SUFFICIENCY_GOOD)
    return {
      label: "Anchor pillar",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: "🏛️",
    };
  if (count >= CLUSTER_SUFFICIENCY_MIN)
    return {
      label: "Well-supported",
      color: "text-blue-700 bg-blue-50 border-blue-200",
      icon: "✅",
    };
  return {
    label: "Needs more content",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: "⚠️",
  };
}

// ─── Distribution channel definitions ─────────────────────────────────────────
// Each channel specifies which content types and archetypes map to it, an
// optional minimum priority score gate, and a one-line distribution tip.

const DISTRIBUTION_CHANNELS: Array<{
  id: string;
  label: string;
  icon: string;
  colorClasses: string;
  barColor: string;
  matchTypes: ContentType[];
  matchArchetypes: string[];
  minPriorityScore: number;
  tip: string;
}> = [
  {
    id: "email",
    label: "Email Newsletter",
    icon: "📧",
    colorClasses: "text-purple-700 bg-purple-50 border-purple-200",
    barColor: "bg-purple-400",
    matchTypes: ["blog", "guide", "case-study", "roundup"],
    matchArchetypes: ["The Data Dive", "The Blueprint", "The Case Study"],
    minPriorityScore: 0,
    tip: "Lead with a strong hook line and a single CTA link to the full piece.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    colorClasses: "text-blue-700 bg-blue-50 border-blue-200",
    barColor: "bg-blue-400",
    matchTypes: ["linkedin", "case-study"],
    matchArchetypes: ["The Contrarian", "The Trendsetter", "The Case Study"],
    minPriorityScore: 0,
    tip: "Open with a one-line provocation; end with a question to drive comments.",
  },
  {
    id: "seo",
    label: "Organic Search",
    icon: "🔍",
    colorClasses: "text-emerald-700 bg-emerald-50 border-emerald-200",
    barColor: "bg-emerald-400",
    matchTypes: ["blog", "guide"],
    matchArchetypes: ["The Data Dive", "The Blueprint"],
    minPriorityScore: 0,
    tip: "Publish, request indexing, then add 2–3 internal links from existing pages.",
  },
  {
    id: "paid",
    label: "Paid Amplification",
    icon: "📣",
    colorClasses: "text-orange-700 bg-orange-50 border-orange-200",
    barColor: "bg-orange-400",
    matchTypes: ["case-study", "guide"],
    matchArchetypes: ["The Data Dive", "The Blueprint"],
    minPriorityScore: 65,
    tip: "Reserve budget for priority score 65+; retarget engaged readers with a follow-up offer.",
  },
  {
    id: "community",
    label: "Community & Forums",
    icon: "🗣️",
    colorClasses: "text-rose-700 bg-rose-50 border-rose-200",
    barColor: "bg-rose-400",
    matchTypes: ["blog", "roundup"],
    matchArchetypes: ["The Contrarian", "The Data Dive", "The Blueprint"],
    minPriorityScore: 0,
    tip: "Post a summary thread on relevant Slack groups or subreddits; link to the full piece.",
  },
];

// ─── Reach estimates by search volume tier ────────────────────────────────────
// Organic readers/mo per piece assumes ~5% average CTR from search ranking.
// LinkedIn impressions use a 3,500/post baseline for a mid-size B2B account.
// Email opens assume a 21% open rate on a per-send basis.

const ORGANIC_REACH_BY_TIER: Record<string, number> = {
  "50K–200K+": 7500,
  "10K–50K":   2200,
  "1K–10K":    450,
  "100–1K":    85,
  "<100":      15,
};
const LINKEDIN_IMPRESSIONS_PER_POST = 3500;
const EMAIL_OPENS_PER_PIECE_PER_1K_SUBS = 210;

// ─── Content ROI Estimator — B2B conversion assumptions ───────────────────────
// Industry-standard SaaS / fintech B2B content funnel benchmarks.
// All rates are conservative mid-market estimates — easily editable per client.

const ROI_CONTENT_TO_LEAD_RATE  = 0.02;   // 2%   organic reader  → lead
const ROI_LINKEDIN_TO_LEAD_RATE = 0.005;  // 0.5% impression      → lead
const ROI_EMAIL_TO_LEAD_RATE    = 0.03;   // 3%   email open       → lead
const ROI_MQL_TO_OPP_RATE       = 0.25;   // 25%  lead             → opportunity
const ROI_CLOSE_RATE            = 0.20;   // 20%  opportunity      → closed-won
const ROI_AVG_DEAL_VALUE        = 15000;  // $15 K average ARR per deal

// ─── Publish-Ready Score ──────────────────────────────────────────────────────
// Five criteria, each 0–20 pts, summing to a 0–100 readiness score per entry.

const VOLUME_SEO_POINTS: Record<string, number> = {
  "50K–200K+": 8,
  "10K–50K":   6,
  "1K–10K":    4,
  "100–1K":    2,
  "<100":      0,
};

function scoreSeoReadiness(e: CalendarEntry): number {
  const vol  = VOLUME_SEO_POINTS[e.searchVolume] ?? 2;
  const diff =
    e.topicDifficulty < 30 ? 12 :
    e.topicDifficulty < 50 ? 8  :
    e.topicDifficulty < 70 ? 4  : 0;
  return Math.min(20, vol + diff);
}

function scoreAudienceFit(e: CalendarEntry): number {
  if (e.searchIntent === "SEO Intent") {
    if (e.type === "blog" || e.type === "guide") return 20;
    if (e.type === "case-study" || e.type === "roundup") return 14;
    return 6;
  }
  // Engagement Intent
  if (e.type === "linkedin")    return 20;
  if (e.type === "case-study")  return 16;
  return 10;
}

function scoreDistributionCoverage(e: CalendarEntry): number {
  const matched = DISTRIBUTION_CHANNELS.filter(
    (ch) =>
      (ch.matchTypes.includes(e.type) ||
        ch.matchArchetypes.includes(e.archetype)) &&
      e.priorityScore >= ch.minPriorityScore,
  ).length;
  return Math.min(20, matched * 4);
}

function scoreArchetypeStrength(e: CalendarEntry): number {
  const MANDATORY = [
    "The Case Study",
    "The Contrarian",
    "The Data Dive",
    "The Blueprint",
  ];
  return MANDATORY.includes(e.archetype) ? 20 : 10;
}

function computePublishReadyScore(e: CalendarEntry): {
  total: number;
  seo: number;
  audience: number;
  distribution: number;
  archetype: number;
  priority: number;
} {
  const seo          = scoreSeoReadiness(e);
  const audience     = scoreAudienceFit(e);
  const distribution = scoreDistributionCoverage(e);
  const archetype    = scoreArchetypeStrength(e);
  const priority     = Math.round(e.priorityScore / 5);
  return { total: seo + audience + distribution + archetype + priority, seo, audience, distribution, archetype, priority };
}

function publishReadyLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Production ready", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 60) return { label: "Strong",           color: "text-blue-700 bg-blue-50 border-blue-200" };
  if (score >= 40) return { label: "Average",          color: "text-amber-700 bg-amber-50 border-amber-200" };
  return                  { label: "Needs work",       color: "text-rose-700 bg-rose-50 border-rose-200" };
}

// ─── Per-format publish-ready checklist items ─────────────────────────────────
// Each content type has its own 6-7 step production checklist. Items are
// intentionally short so they fit on a single line in the collapsed badge.

const CHECKLIST_ITEMS: Record<ContentType, string[]> = {
  blog: [
    "Target keyword confirmed",
    "Title tag & meta description drafted",
    "Internal links mapped (≥ 2)",
    "Featured image briefed",
    "CTA link verified",
    "Editor review completed",
  ],
  guide: [
    "Outline approved by editor",
    "Target keyword confirmed",
    "SME source or data study secured",
    "Internal links mapped (≥ 3)",
    "Downloadable asset ready (if gated)",
    "Meta description drafted",
    "Editor & legal review completed",
  ],
  "case-study": [
    "Client approval obtained",
    "Key metrics confirmed & verified",
    "Pull quote selected",
    "Internal link to services page added",
    "CTA link verified",
    "Editor review completed",
  ],
  roundup: [
    "Sources curated & links verified",
    "All outbound links open in new tab",
    "Subscribe CTA added",
    "Roundup image designed",
    "Internal link to hub page added",
    "Editor review completed",
  ],
  linkedin: [
    "Opening hook ≤ 2 lines confirmed",
    "Poll or CTA question drafted",
    "3–5 hashtags selected",
    "Optimal post time confirmed",
    "Native image or carousel prepared",
    "Reply strategy planned",
  ],
};

const ARCHETYPE_COLOR: Record<string, string> = {
  "The Blueprint": "text-indigo-500",
  "The Comparison": "text-violet-500",
  "The Trendsetter": "text-cyan-600",
  "The Data Dive": "text-emerald-600",
  "The Contrarian": "text-rose-500",
  "The How-To": "text-orange-500",
  "The Listicle": "text-blue-500",
  "The Deep Dive": "text-slate-500",
  "The Warning": "text-amber-600",
  "The Future": "text-teal-600",
  "The Authority Guide": "text-purple-600",
  "The Case Study": "text-green-600",
  "The Why Now": "text-pink-600",
  "The Insider": "text-fuchsia-600",
  "The Opportunity": "text-lime-600",
  "The Benchmark": "text-sky-600",
};

// ─── Archetype rationales ─────────────────────────────────────────────────────
// One-sentence editorial rationale per archetype — surfaced in the brief modal
// so writers understand the strategic intent behind each headline structure.

const ARCHETYPE_RATIONALE: Record<string, string> = {
  "The Blueprint":      "Establish authority with actionable frameworks — converts readers into leads who trust your process",
  "The Comparison":     "Capture high-intent 'vs' and 'alternative' searches — ideal for decision-stage buyers",
  "The Trendsetter":    "Rank for forward-looking queries and position the brand as ahead of the curve",
  "The Data Dive":      "Build credibility with proprietary data — earns backlinks and drives SME decision-maker traffic",
  "The Contrarian":     "Generate shares by challenging conventional wisdom — strong for brand differentiation",
  "The How-To":         "Capture 'how to' search volume — high conversion rate for bottom-of-funnel readers",
  "The Listicle":       "Earn featured snippets and social shares — skimmable format drives high dwell time",
  "The Deep Dive":      "Own long-tail authority queries — signals expertise to Google and readers alike",
  "The Warning":        "Capture risk-aware searchers — strong for top-of-funnel brand awareness",
  "The Future":         "Rank for prediction and outlook queries — positions the brand as an industry oracle",
  "The Authority Guide":"Build topical authority and internal link equity — cornerstone content for the pillar strategy",
  "The Case Study":     "Convert bottom-of-funnel traffic with proof — highest-converting format for services businesses",
  "The Why Now":        "Capture urgency-driven searches — strong for seasonal or trend-driven topics",
  "The Insider":        "Differentiate with proprietary knowledge — builds loyal readership and email sign-ups",
  "The Opportunity":    "Surface untapped angles for strategic readers — strong for newsletter and lead growth",
  "The Benchmark":      "Own benchmark and comparison queries — earns citations from industry publications",
};

// ─── Word-count targets by content type ───────────────────────────────────────

const WORD_COUNT_BY_TYPE: Record<ContentType, string> = {
  blog:          "1,200–1,800 words",
  guide:         "3,500–5,000 words",
  roundup:       "1,500–2,500 words",
  "case-study":  "1,200–2,000 words",
  linkedin:      "150–300 words",
};

// ─── Content Repurposing Map ───────────────────────────────────────────────────
const REPURPOSE_DERIVATIVES: Record<
  ContentType,
  { format: string; angleSuffix: string; channel: string; icon: string }[]
> = {
  blog: [
    { format: "LinkedIn Carousel", angleSuffix: "Key takeaways visualised in 8 slides — works as a standalone post",   channel: "LinkedIn",            icon: "🎠" },
    { format: "Email Drip (3-part)", angleSuffix: "Core argument reframed as a nurture sequence with one action per email", channel: "Email",            icon: "✉️" },
    { format: "Twitter Thread",    angleSuffix: "10-tweet breakdown ending with a link to the full piece",              channel: "Twitter / X",         icon: "🧵" },
  ],
  linkedin: [
    { format: "Long-form Blog",    angleSuffix: "Expand with supporting data, case studies and a target keyword",       channel: "Organic Search",      icon: "✍️" },
    { format: "Email Newsletter",  angleSuffix: "Personalised version segmented by subscriber role or industry",        channel: "Email",               icon: "✉️" },
    { format: "Short-Form Video",  angleSuffix: "60-second talking-head summary optimised for Reels / YouTube Shorts",  channel: "Instagram · YouTube", icon: "🎬" },
  ],
  roundup: [
    { format: "SlideShare Deck",   angleSuffix: "One slide per resource with its headline stat and a source link",     channel: "SlideShare · LinkedIn", icon: "📊" },
    { format: "Newsletter Digest", angleSuffix: "'Top picks this fortnight' section with a 2-sentence editorial note", channel: "Email Newsletter",    icon: "📰" },
    { format: "Twitter Thread",    angleSuffix: "Curated list thread with a short insight comment on each link",       channel: "Twitter / X",         icon: "🧵" },
  ],
  "case-study": [
    { format: "LinkedIn Carousel", angleSuffix: "Before / After results story across 6 slides — stat-led cover",       channel: "LinkedIn",            icon: "🎠" },
    { format: "Podcast Outline",   angleSuffix: "Interview-style script tracing the problem → solution → outcome arc", channel: "Podcast",             icon: "🎙️" },
    { format: "Infographic",       angleSuffix: "Key metrics and decision timeline in a single shareable visual",      channel: "Pinterest · Blog",    icon: "📈" },
  ],
  guide: [
    { format: "YouTube Script",    angleSuffix: "Step-by-step walkthrough with chapter markers every 3–4 minutes",    channel: "YouTube",             icon: "🎥" },
    { format: "SlideShare Deck",   angleSuffix: "Chapter-by-chapter visual quick-reference for scan readers",         channel: "SlideShare",          icon: "📊" },
    { format: "Email Course",      angleSuffix: "5-part lesson sequence — one guide chapter delivered per email",     channel: "Email",               icon: "✉️" },
  ],
};

// ─── Trending Topics Radar ─────────────────────────────────────────────────────
const FINTECH_TREND_SIGNALS: {
  keywords:  string[];
  momentum:  number;
  direction: "surging" | "rising" | "steady" | "cooling";
  velocity:  string;
  trigger:   string;
}[] = [
  {
    keywords:  ["ai", "artificial intelligence", "llm", "generative", "automation", "machine learning", "agentic"],
    momentum:  96, direction: "surging", velocity: "+42% MoM",
    trigger:   "LLM adoption accelerating across all financial services verticals",
  },
  {
    keywords:  ["embedded finance", "embedded banking", "embedded payments", "embedded lending"],
    momentum:  88, direction: "rising",  velocity: "+28% MoM",
    trigger:   "Platform economy expansion driving non-financial brands into FS",
  },
  {
    keywords:  ["stablecoin", "cbdc", "central bank digital", "tokenisation", "tokenization", "rwa", "real world asset"],
    momentum:  85, direction: "rising",  velocity: "+31% MoM",
    trigger:   "Regulatory frameworks crystallising; institutional adoption accelerating",
  },
  {
    keywords:  ["open banking", "open finance", "psd2", "fdata", "api banking", "open data"],
    momentum:  79, direction: "rising",  velocity: "+18% MoM",
    trigger:   "FCA Variable Recurring Payments & EU FIDA deadlines approaching",
  },
  {
    keywords:  ["crypto", "bitcoin", "defi", "blockchain", "web3"],
    momentum:  76, direction: "rising",  velocity: "+19% MoM",
    trigger:   "ETF approvals and institutional custody driving renewed search demand",
  },
  {
    keywords:  ["payments", "cross-border", "remittance", "swift", "iso 20022", "faster payments", "real-time payments", "rtp"],
    momentum:  74, direction: "steady",  velocity: "+11% MoM",
    trigger:   "Real-time rails expanding globally; ISO 20022 migration in progress",
  },
  {
    keywords:  ["regtech", "compliance", "regulation", "kyc", "aml", "gdpr", "regulatory"],
    momentum:  73, direction: "steady",  velocity: "+8% MoM",
    trigger:   "Perpetual burden — Basel IV, DORA, and AML reform driving B2B demand",
  },
  {
    keywords:  ["wealthtech", "wealth management", "robo", "invest", "portfolio", "asset management"],
    momentum:  70, direction: "rising",  velocity: "+14% MoM",
    trigger:   "Retail democratisation + intergenerational wealth transfer narrative",
  },
  {
    keywords:  ["neobank", "challenger bank", "digital bank", "fintech bank"],
    momentum:  65, direction: "steady",  velocity: "+5% MoM",
    trigger:   "Maturing market — profitability narrative replacing growth story",
  },
  {
    keywords:  ["insurtech", "insurance", "parametric", "underwriting"],
    momentum:  64, direction: "steady",  velocity: "+6% MoM",
    trigger:   "Climate risk and AI underwriting innovation driving B2B interest",
  },
  {
    keywords:  ["lending", "credit", "loan", "mortgage", "fintech lending", "buy now pay later", "bnpl"],
    momentum:  60, direction: "cooling", velocity: "−5% MoM",
    trigger:   "High-rate environment dampening origination; BNPL regulatory headwinds",
  },
];

function getTopicTrend(topic: string): {
  momentum:  number;
  direction: "surging" | "rising" | "steady" | "cooling";
  velocity:  string;
  trigger:   string;
} {
  const t = topic.toLowerCase();
  for (const sig of FINTECH_TREND_SIGNALS) {
    if (sig.keywords.some((kw) => t.includes(kw))) {
      return { momentum: sig.momentum, direction: sig.direction, velocity: sig.velocity, trigger: sig.trigger };
    }
  }
  return { momentum: 62, direction: "steady", velocity: "+5% MoM", trigger: "Stable fintech audience interest — niche but engaged readership" };
}

// ─── Readability & Format Fit Score ──────────────────────────────────────────
interface HeadlineScore {
  specificity:      number; // 0–25
  powerWords:       number; // 0–25
  keywordPlacement: number; // 0–25
  formatFit:        number; // 0–25
  total:            number; // 0–100
  rewrite:          string;
}

const HEADLINE_POWER_WORDS = [
  "ultimate","complete","definitive","essential","proven","expert","insider","secret",
  "hidden","overlooked","surprising","critical","key","top","best","biggest","fastest",
  "easiest","simple","quick","new","exclusive","revealed","warning","mistake","wrong",
  "truth","myth","reality","boost","grow","increase","reduce","cut","save","future",
  "trend","rise","fall","shift","transform","everything","never","always",
];

const HEADLINE_FORMAT_PATTERNS: Partial<Record<ContentType, RegExp[]>> = {
  guide:          [/^how to/i, /\bguide\b/i, /step[- ]by[- ]step/i, /\b\d+\s+ways?\b/i, /\b\d+\s+steps?\b/i],
  "case-study":   [/how .+ (achieved|grew|scaled|reduced|increased|saved)/i, /lessons? from/i, /inside .+:/i, /what .* learned/i],
  "blog-post":    [/^why /i, /^what /i, /^how /i, /\d+\s+(reasons?|ways?|tips?|things?|mistakes?)/i],
  linkedin:       [/\d+\s+(lessons?|insights?|things?|tips?|mistakes?)/i, /thread/i, /unpopular opinion/i, /nobody .*(talks|knows)/i],
  newsletter:     [/this week/i, /what .* means for/i, /the .* you need/i, /\bbreaking\b/i],
  webinar:        [/live:/i, /how to .+ in \d+/i, /masterclass/i, /workshop/i, /join us/i],
  infographic:    [/\d+\s+.*(stats?|facts?|figures?|numbers?|data)/i, /visual guide/i, /by the numbers/i, /at a glance/i],
  checklist:      [/\d+[- ]point/i, /complete checklist/i, /before you/i, /checklist:/i],
  podcast:        [/episode:/i, /ep\.?\s*\d+/i, /interview/i, /with [A-Z]/],
  "video-script": [/explained/i, /breakdown/i, /deep.?dive/i, /in \d+ minutes?/i, /\bwatch\b/i],
};

function scoreHeadline(angle: string, type: ContentType, topic: string): HeadlineScore {
  const a = angle.toLowerCase();

  // Specificity: numbers, %, year, ideal word length
  const hasNumber  = /\d/.test(angle);
  const hasPct     = /%/.test(angle) || /percent/i.test(angle);
  const hasYear    = /20\d{2}/.test(angle);
  const wc         = angle.trim().split(/\s+/).length;
  const goodLength = wc >= 5 && wc <= 15;
  const specificity = Math.min(25, (hasNumber ? 12 : 0) + (hasPct ? 5 : 0) + (hasYear ? 3 : 0) + (goodLength ? 5 : 0));

  // Power words
  const pw = HEADLINE_POWER_WORDS.filter((w) => a.includes(w)).length;
  const powerWords = pw >= 3 ? 25 : pw === 2 ? 20 : pw === 1 ? 14 : 5;

  // Keyword placement — topic words in first 60 chars
  const topicWords  = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const first60     = a.slice(0, 60);
  const kwFront     = topicWords.some((w) => first60.includes(w));
  const kwAnywhere  = topicWords.some((w) => a.includes(w));
  const keywordPlacement = kwFront ? 25 : kwAnywhere ? 15 : 5;

  // Format fit — pattern match + structural signals
  const patterns  = HEADLINE_FORMAT_PATTERNS[type] ?? [];
  const matched   = patterns.some((p) => p.test(angle));
  const hasBrack  = /\[|\(/.test(angle);
  const hasColon  = /:/.test(angle);
  const formatFit = matched ? 23 : (hasBrack || hasColon) ? 17 : 10;

  const total = specificity + powerWords + keywordPlacement + formatFit;

  const slug = topic.split(" ").slice(0, 4).join(" ");
  const yr   = new Date().getFullYear();
  const REWRITES: Partial<Record<ContentType, string>> = {
    guide:          `The Complete ${slug} Guide: ${yr} Edition [+ Free Checklist]`,
    "case-study":   `How [Client] Achieved [Result] with ${slug} — 7 Key Lessons`,
    "blog-post":    `7 Proven ${slug} Strategies Every Fintech Leader Needs in ${yr}`,
    linkedin:       `5 ${slug} insights nobody is talking about (thread 🧵)`,
    newsletter:     `${slug}: What This Week's News Means for Your Business`,
    webinar:        `Live Masterclass: How to Win with ${slug} in 60 Minutes`,
    infographic:    `${slug} by the Numbers: 12 Stats That Will Change How You Think`,
    checklist:      `The 10-Point ${slug} Checklist: Don't Launch Without It`,
    podcast:        `Ep. XX: The Insider's Guide to ${slug} with [Expert Name]`,
    "video-script": `${slug} Explained in 5 Minutes (${yr} Deep Dive)`,
  };
  const rewrite = REWRITES[type] ?? `The Complete ${slug} Breakdown: Everything You Need to Know in ${yr}`;

  return { specificity, powerWords, keywordPlacement, formatFit, total, rewrite };
}

// ─── Editorial Complexity & Resource Estimate ────────────────────────────────
interface ComplexityProfile {
  hours:     number;   // estimated production hours
  words:     number;   // expected word count
  assets:    number;   // design/media assets needed
  approvals: number;   // sign-off rounds
  roles:     string[]; // team roles typically involved
  tip:       string;   // efficiency tip to reduce production time
}
const COMPLEXITY_BY_TYPE: Record<ContentType, ComplexityProfile> = {
  guide:          { hours: 16, words: 3000, assets: 5,  approvals: 2, roles: ["Writer","Designer","SME Reviewer","Editor"],                      tip: "Repurpose existing blog posts as section drafts — cuts research time by ~40%" },
  "case-study":   { hours: 12, words: 1500, assets: 3,  approvals: 3, roles: ["Writer","Client Contact","Designer","Compliance"],                 tip: "Run a 30-min structured client interview and transcribe — saves 4h of back-and-forth" },
  "blog-post":    { hours: 6,  words: 1200, assets: 2,  approvals: 1, roles: ["Writer","Editor"],                                                 tip: "Use a standard brief template — brief should take 20 min max to complete" },
  linkedin:       { hours: 1,  words: 250,  assets: 1,  approvals: 1, roles: ["Copywriter","Brand Reviewer"],                                     tip: "Batch-write 4–5 posts in a single session to maintain tone consistency" },
  newsletter:     { hours: 4,  words: 800,  assets: 2,  approvals: 1, roles: ["Writer","Editor"],                                                 tip: "Curate 3 external links per issue to reduce original writing load" },
  webinar:        { hours: 20, words: 4000, assets: 20, approvals: 2, roles: ["Speaker","Designer","Ops/Tech","Moderator","Promoter"],             tip: "Reuse slide structure from previous webinars — only update data and case examples" },
  infographic:    { hours: 8,  words: 300,  assets: 8,  approvals: 2, roles: ["Researcher","Designer","Brand Reviewer"],                          tip: "Brief the designer with a wireframe sketch — eliminates the first revision round" },
  checklist:      { hours: 3,  words: 600,  assets: 1,  approvals: 1, roles: ["Writer","SME Reviewer"],                                           tip: "Source items from existing guides — drops production to ~90 min" },
  "video-script": { hours: 14, words: 2000, assets: 10, approvals: 2, roles: ["Scriptwriter","Videographer","Video Editor","Thumbnail Designer"],  tip: "Script in bullet points first, then expand — faster than writing prose from scratch" },
  podcast:        { hours: 6,  words: 500,  assets: 2,  approvals: 1, roles: ["Host","Guest Coordinator","Audio Editor"],                         tip: "Prepare 10 structured questions instead of a full script — sounds natural, cuts prep time" },
};
const COMPLEXITY_TIER = (h: number) =>
  h > 16 ? { label: "Heavy",    bg: "bg-rose-100",    text: "text-rose-700",    bar: "bg-rose-400"    }
  : h > 8  ? { label: "Complex",  bg: "bg-amber-100",   text: "text-amber-700",   bar: "bg-amber-400"   }
  : h > 4  ? { label: "Standard", bg: "bg-blue-100",    text: "text-blue-700",    bar: "bg-blue-400"    }
  :          { label: "Quick",    bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-400" };

// ─── Lead Generation Potential Score ─────────────────────────────────────────
const LEAD_GATE: Record<ContentType, number> = {
  guide: 24, "case-study": 20, "blog-post": 8, linkedin: 0,
  newsletter: 18, webinar: 25, infographic: 10, checklist: 22,
  "video-script": 8, podcast: 5,
};
const LEAD_CTA: Record<ContentType, number> = {
  guide: 20, "case-study": 22, "blog-post": 10, linkedin: 8,
  newsletter: 15, webinar: 25, infographic: 8, checklist: 22,
  "video-script": 10, podcast: 8,
};
const LEAD_FUNNEL: Record<ContentType, number> = {
  guide: 20, "case-study": 23, "blog-post": 12, linkedin: 10,
  newsletter: 15, webinar: 24, infographic: 8, checklist: 21,
  "video-script": 12, podcast: 10,
};
const LEAD_COMMERCIAL_SIGNALS = [
  "roi","revenue","cost","pricing","price","budget","reduce","increase","save","profit",
  "loss","risk","fraud","compliance","regulation","penalty","audit","integration","api",
  "platform","solution","vendor","benchmark","comparison","alternative","implement",
  "deploy","scale","growth","conversion","acquire","retain","churn","automation",
];
const LEAD_PROMO_TIP: Record<ContentType, string> = {
  guide:          "Gate with a form → promote via LinkedIn Docs + retarget visitors with LinkedIn Ads",
  "case-study":   "Add to sales email sequences + feature in bottom-funnel LinkedIn Ads by job title",
  "blog-post":    "Add a content upgrade offer within the post to capture emails at point of consumption",
  linkedin:       "Boost as LinkedIn Sponsored Content to a lookalike audience of your ICP",
  newsletter:     "LinkedIn teaser post + paid Subscribe CTA ad targeting decision-makers",
  webinar:        "LinkedIn Event Ads targeting VP/Director/C-suite 2–3 weeks before registration close",
  infographic:    "LinkedIn Document post (native PDF) + paid boost to target persona audience",
  checklist:      "LinkedIn Lead Gen Form campaign — checklists convert at 3× the rate of blog posts",
  "video-script": "Retarget video viewers (50%+ watch time) with a follow-up case study or webinar ad",
  podcast:        "Clip the strongest 60-second insight → run as a LinkedIn video awareness ad",
};

function scoreLeadGen(type: ContentType, topic: string, angle: string): {
  gate: number; cta: number; funnel: number; commercial: number; total: number;
} {
  const combined = `${topic} ${angle}`.toLowerCase();
  const hits     = LEAD_COMMERCIAL_SIGNALS.filter((s) => combined.includes(s)).length;
  const commercial = Math.min(25, hits >= 4 ? 25 : hits === 3 ? 21 : hits === 2 ? 16 : hits === 1 ? 10 : 4);
  const gate   = LEAD_GATE[type];
  const cta    = LEAD_CTA[type];
  const funnel = LEAD_FUNNEL[type];
  return { gate, cta, funnel, commercial, total: gate + cta + funnel + commercial };
}

// ─── Content Velocity Tracker ────────────────────────────────────────────────
const CADENCE_BY_TYPE: Record<ContentType, { min: number; ideal: number; unit: string; rationale: string }> = {
  guide:          { min: 1,  ideal: 2,  unit: "1–2/mo",   rationale: "1–2 comprehensive guides/month builds topical authority without diluting depth" },
  "case-study":   { min: 1,  ideal: 1,  unit: "1/mo",     rationale: "Monthly case studies maintain social proof pipeline and sales enablement library" },
  "blog-post":    { min: 4,  ideal: 6,  unit: "4–6/mo",   rationale: "Google rewards consistent publishing — below 4/month loses algorithmic ranking momentum" },
  linkedin:       { min: 12, ideal: 16, unit: "12–16/mo",  rationale: "LinkedIn algorithm favours accounts posting 3–4× per week without gaps" },
  newsletter:     { min: 4,  ideal: 4,  unit: "4/mo",     rationale: "Weekly cadence is the minimum subscribers expect — anything less raises unsubscribes" },
  webinar:        { min: 1,  ideal: 2,  unit: "1–2/mo",   rationale: "Monthly webinars sustain pipeline engagement without fatiguing the audience" },
  infographic:    { min: 2,  ideal: 4,  unit: "2–4/mo",   rationale: "Visual content amplifies other posts — 2+ per month ensures consistent social coverage" },
  checklist:      { min: 1,  ideal: 2,  unit: "1–2/mo",   rationale: "Practical tools convert at 3× the rate of blog posts — at least 1 per month recommended" },
  "video-script": { min: 2,  ideal: 4,  unit: "2–4/mo",   rationale: "YouTube rewards channels publishing weekly; below 2/month signals inactivity to the algorithm" },
  podcast:        { min: 4,  ideal: 4,  unit: "4/mo",     rationale: "Weekly episodes are the industry standard — dropping below loses listener retention fast" },
};

// ─── Distribution Channel Fit Analyser ───────────────────────────────────────
const CHANNEL_FIT_BY_TYPE: Record<ContentType, { channel: string; fit: number; tip: string }[]> = {
  guide: [
    { channel: "Organic Search (SEO)", fit: 95, tip: "Gate with a content upgrade to capture leads at peak intent" },
    { channel: "Email Newsletter",     fit: 82, tip: "Send as a 'resource drop' — subscribers expect value, not sales" },
    { channel: "LinkedIn Docs",        fit: 74, tip: "Share as a PDF carousel teaser; put the download link in first comment" },
  ],
  "case-study": [
    { channel: "LinkedIn",             fit: 92, tip: "Lead with the result metric in line 1 to stop the scroll" },
    { channel: "Email Newsletter",     fit: 85, tip: "Feature in a 'client spotlight' section to build social proof" },
    { channel: "Industry Press / PR",  fit: 76, tip: "Pitch the headline stat to fintech trade publications as a data story" },
  ],
  "blog-post": [
    { channel: "Organic Search (SEO)", fit: 90, tip: "Build internal links from pillar guides to boost crawl priority" },
    { channel: "LinkedIn",             fit: 78, tip: "Repurpose the key insight as a native 5-slide carousel" },
    { channel: "Email Newsletter",     fit: 65, tip: "Include as the 'long read' section of your weekly digest" },
  ],
  linkedin: [
    { channel: "LinkedIn (Organic)",   fit: 98, tip: "Post Tue–Thu 8–10 AM; engage with every comment in the first 60 min" },
    { channel: "Twitter/X",            fit: 72, tip: "Cross-post an adapted version to reach a broader fintech audience" },
    { channel: "LinkedIn Newsletter",  fit: 65, tip: "Expand into a LinkedIn article for evergreen discoverability" },
  ],
  newsletter: [
    { channel: "Email Newsletter",     fit: 98, tip: "A/B test subject lines — curiosity gaps outperform plain summaries" },
    { channel: "LinkedIn",             fit: 70, tip: "Post a teaser excerpt to drive newsletter subscriptions" },
    { channel: "Referral / Forward",   fit: 55, tip: "Add a 'forward to a colleague' CTA to each issue for organic growth" },
  ],
  webinar: [
    { channel: "LinkedIn",             fit: 90, tip: "Create an Event post 2 weeks out and invite connections directly" },
    { channel: "Email Newsletter",     fit: 88, tip: "3-email sequence: announce → 24h reminder → on-demand replay link" },
    { channel: "LinkedIn Ads",         fit: 80, tip: "Run Event Ads targeting decision-makers by job title and seniority" },
  ],
  infographic: [
    { channel: "LinkedIn",             fit: 92, tip: "Upload natively — image posts outperform link posts 4:1" },
    { channel: "Twitter/X",            fit: 85, tip: "Tweet with a data insight hook in the caption, not just the image" },
    { channel: "Email Newsletter",     fit: 75, tip: "Embed inline — infographics lift email click-through rates by 42%" },
  ],
  checklist: [
    { channel: "LinkedIn Docs",        fit: 88, tip: "Native PDF document posts get 3× organic reach on LinkedIn" },
    { channel: "Organic Search (SEO)", fit: 82, tip: "Target 'fintech [topic] checklist' intent queries directly" },
    { channel: "LinkedIn Ads",         fit: 68, tip: "Use as a lead magnet in a Lead Gen Form campaign" },
  ],
  "video-script": [
    { channel: "YouTube",                 fit: 95, tip: "Optimise title, description, and thumbnail before publishing" },
    { channel: "LinkedIn (Native Video)", fit: 82, tip: "Upload natively — not a YouTube link — for 5× organic reach" },
    { channel: "Twitter/X",              fit: 70, tip: "Clip the strongest 30-second segment for Reels / X video" },
  ],
  podcast: [
    { channel: "Podcast Platforms",   fit: 98, tip: "Submit to Apple, Spotify, Google Podcasts, and Pocket Casts simultaneously" },
    { channel: "LinkedIn",             fit: 80, tip: "Post an audiogram (animated waveform clip) as a native LinkedIn video" },
    { channel: "Email Newsletter",     fit: 68, tip: "Feature with a 3-sentence episode summary and a direct listen link" },
  ],
};

// ─── Content Cluster Strength Meter ──────────────────────────────────────────
const PILLAR_TYPES = new Set<ContentType>(["guide", "case-study"]);

function scoreCluster(pillarCount: number, supportingCount: number): number {
  if (pillarCount >= 1 && supportingCount >= 4) return Math.min(100, 90 + (supportingCount - 4) * 2);
  if (pillarCount >= 1 && supportingCount === 3) return 88;
  if (pillarCount >= 1 && supportingCount === 2) return 76;
  if (pillarCount >= 1 && supportingCount === 1) return 62;
  if (pillarCount >= 1 && supportingCount === 0) return 42;
  if (pillarCount === 0 && supportingCount >= 4) return 56;
  if (pillarCount === 0 && supportingCount === 3) return 50;
  if (pillarCount === 0 && supportingCount === 2) return 38;
  return 24;
}

// ─── Seasonal Publishing Pulse ───────────────────────────────────────────────
const FINTECH_MONTHLY_DEMAND: Record<number, { demand: number; peaks: string[]; suggest: string }> = {
  1:  { demand: 75, peaks: ["RegTech & Compliance",    "Year-End Reporting"],          suggest: "AML/KYC compliance checklist or regulatory reporting guide"                          },
  2:  { demand: 65, peaks: ["Digital Transformation",  "AI in Finance"],               suggest: "thought-leadership piece on AI adoption or digital banking trends"                   },
  3:  { demand: 72, peaks: ["Q1 Regulatory Deadlines", "Open Banking Updates"],        suggest: "Open Banking or DORA deadline explainer and action checklist"                        },
  4:  { demand: 68, peaks: ["Embedded Finance",        "Payments Innovation"],         suggest: "embedded finance case study or payments innovation infographic"                      },
  5:  { demand: 70, peaks: ["AI/LLM in FS",            "WealthTech"],                  suggest: "AI in financial services deep-dive or WealthTech feature comparison"                 },
  6:  { demand: 80, peaks: ["Conference Season",       "H1 Close", "FinTech Funding"], suggest: "industry event round-up, H1 trend report, or funding landscape guide"               },
  7:  { demand: 60, peaks: ["Crypto & DeFi",           "Summer WealthTech"],           suggest: "crypto regulatory update or retail investing guide for summer audiences"             },
  8:  { demand: 58, peaks: ["Research Reports",        "Thought Leadership"],          suggest: "original research report or authoritative thought-leadership piece"                  },
  9:  { demand: 74, peaks: ["Back-to-Business",        "Q3 Payments Surge"],           suggest: "payments roadmap or cross-border expansion guide ahead of Q4 budgeting"             },
  10: { demand: 82, peaks: ["Budget Season",           "Compliance Planning"],         suggest: "FinTech budget planning guide or compliance audit checklist for Q1"                  },
  11: { demand: 88, peaks: ["B2B Peak Season",         "Open Banking Deadlines"],      suggest: "lead-gen webinar, comparison guide, or 'State of FinTech' annual report"            },
  12: { demand: 65, peaks: ["Year-End Planning",       "Predictions Content"],         suggest: "year-in-review round-up or fintech predictions post for the coming year"            },
};
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Audience Intent Heatmap ─────────────────────────────────────────────────
const INTENT_TYPE_BASE: Record<ContentType, number> = {
  "blog-post": 20, guide: 25, infographic: 15, linkedin: 30, newsletter: 25,
  "case-study": 60, webinar: 65, checklist: 55, "video-script": 40, podcast: 35,
};
const FUNNEL_TYPE_BASE: Record<ContentType, number> = {
  "blog-post": 30, guide: 45, infographic: 25, linkedin: 35, newsletter: 40,
  "case-study": 75, webinar: 80, checklist: 70, "video-script": 50, podcast: 45,
};

function getHeatmapCoords(entry: CalendarEntry): { ix: number; fy: number } {
  let ix = INTENT_TYPE_BASE[entry.type] ?? 35;
  let fy = FUNNEL_TYPE_BASE[entry.type] ?? 40;
  const si = (entry.searchIntent ?? "").toLowerCase();
  if      (si.includes("transactional")) ix += 28;
  else if (si.includes("commercial"))    ix += 18;
  else if (si.includes("informational")) ix -= 10;
  fy += Math.round((entry.priorityScore - 50) * 0.18);
  return {
    ix: Math.max(5, Math.min(93, ix)),
    fy: Math.max(5, Math.min(93, fy)),
  };
}

// ─── CTA Effectiveness Scorer ─────────────────────────────────────────────────
interface CtaScore {
  urgency:       number; // 0–25
  specificity:   number; // 0–25
  audienceFit:   number; // 0–25
  actionClarity: number; // 0–25
  total:         number; // 0–100
  rewrite:       string;
}

const CTA_URGENCY_WORDS  = ["now", "today", "this week", "limited", "don't miss", "deadline", "before", "last chance", "hurry", "expires", "ending soon", "act now"];
const CTA_GENERIC_TERMS  = ["learn more", "click here", "read more", "find out more", "see more", "discover more", "check it out", "get started"];
const CTA_SPECIFIC_VERBS = ["download", "get", "book", "schedule", "request", "register", "join", "access", "subscribe", "watch", "listen", "compare", "calculate", "benchmark", "claim", "unlock", "grab"];
const CTA_CLARITY_VERBS  = ["download", "book", "schedule", "get", "read", "watch", "listen", "register", "subscribe", "join", "access", "view", "learn", "discover", "build", "start", "try", "claim", "unlock", "grab"];
const CTA_TYPE_IDEAL: Partial<Record<ContentType, string[]>> = {
  guide:          ["download", "get the guide", "access", "get your", "grab the"],
  "case-study":   ["see how", "read how", "view the case study", "learn how", "discover how"],
  linkedin:       ["share", "comment", "follow", "connect", "let me know", "drop your"],
  newsletter:     ["subscribe", "sign up", "join", "get weekly", "get the weekly"],
  webinar:        ["register", "join", "save your seat", "attend", "reserve"],
  podcast:        ["listen", "subscribe", "tune in", "follow the"],
  infographic:    ["download", "share", "view", "grab the"],
  checklist:      ["download", "get your", "grab the", "claim your"],
  "video-script": ["watch", "subscribe", "follow"],
  "blog-post":    ["read", "explore", "discover", "learn", "see the full"],
};

function scoreCta(cta: string, type: ContentType, topic: string): CtaScore {
  const c = cta.toLowerCase();

  const urgency = CTA_URGENCY_WORDS.some((w) => c.includes(w)) ? 25
    : c.includes("next") || c.includes("upcoming") || c.includes("launch") ? 15 : 8;

  const hasGeneric  = CTA_GENERIC_TERMS.some((t) => c.includes(t));
  const hasSpecific = CTA_SPECIFIC_VERBS.some((v) => c.includes(v));
  const specificity = hasGeneric ? 5 : hasSpecific ? 22 : 12;

  const idealActions = CTA_TYPE_IDEAL[type] ?? [];
  const audienceFit  = idealActions.some((a) => c.includes(a)) ? 25 : hasSpecific ? 15 : 8;

  const hasVerb       = CTA_CLARITY_VERBS.some((v) => c.includes(v));
  const wordCount     = cta.trim().split(/\s+/).length;
  const actionClarity = hasVerb && wordCount >= 3 && wordCount <= 12 ? 23
    : hasVerb ? 16 : wordCount < 3 ? 8 : 12;

  const total = urgency + specificity + audienceFit + actionClarity;

  const slug = topic.split(" ").slice(0, 4).join(" ").toLowerCase();
  const yr   = new Date().getFullYear();
  const REWRITES: Partial<Record<ContentType, string>> = {
    guide:          `Download the free ${slug} guide — updated for ${yr}`,
    "case-study":   `See exactly how leading firms achieved results with ${slug}`,
    linkedin:       `What's your take on ${slug}? Drop your experience in the comments ↓`,
    newsletter:     `Subscribe now — weekly ${slug} insights for fintech leaders`,
    webinar:        `Register now · limited seats — ${slug} live session`,
    podcast:        `Listen now and subscribe for weekly ${slug} breakdowns`,
    infographic:    `Download the ${slug} infographic — share with your team`,
    checklist:      `Get your free ${slug} checklist — print-ready PDF`,
    "video-script": `Watch now · subscribe for weekly ${slug} deep-dives`,
    "blog-post":    `Read the full breakdown → everything you need to know about ${slug}`,
  };
  const rewrite = REWRITES[type] ?? `Get the complete ${slug} resource — free download`;

  return { urgency, specificity, audienceFit, actionClarity, total, rewrite };
}

// ─── Brief Template Generator — personas, objectives, outlines, distribution ──

const PERSONA_BY_NICHE: {
  keywords: string[];
  title: string;
  role: string;
  painPoints: string[];
}[] = [
  {
    keywords: ["regtech", "compliance", "regulation", "kyc", "aml", "gdpr"],
    title: "Chief Compliance Officer",
    role: "Responsible for regulatory adherence, audit readiness, and risk mitigation across jurisdictions",
    painPoints: ["Keeping pace with evolving regulations", "Manual audit workflows", "Multi-jurisdiction complexity"],
  },
  {
    keywords: ["open banking", "psd2", "api banking", "open finance"],
    title: "Head of Digital Banking / CTO",
    role: "Drives API strategy, platform partnerships, and developer ecosystem growth",
    painPoints: ["API reliability at scale", "Third-party risk management", "Customer consent UX"],
  },
  {
    keywords: ["defi", "decentralized finance", "crypto", "web3", "blockchain"],
    title: "DeFi Protocol Lead / Crypto Fund Manager",
    role: "Manages on-chain operations, tokenomics, and institutional DeFi strategy",
    painPoints: ["Smart contract risk", "Regulatory uncertainty", "Liquidity management"],
  },
  {
    keywords: ["payment", "embedded finance", "payment gateway", "acquiring"],
    title: "VP of Payments / CFO",
    role: "Owns payment strategy, cost optimisation, and checkout conversion",
    painPoints: ["Cross-border payment friction", "Transaction fee compression", "Fraud and chargeback rates"],
  },
  {
    keywords: ["insurtech", "insurance"],
    title: "Head of Digital Insurance / Chief Actuary",
    role: "Drives product modernisation, claims automation, and distribution strategy",
    painPoints: ["Legacy system migration", "Claims fraud detection", "Customer acquisition cost"],
  },
  {
    keywords: ["lending", "credit", "loan", "bnpl", "buy now pay later"],
    title: "Chief Risk Officer / Head of Credit",
    role: "Owns underwriting models, credit policy, and portfolio risk",
    painPoints: ["Default rate management", "Alternative data integration", "Regulatory capital requirements"],
  },
  {
    keywords: ["wealthtech", "wealth management", "robo-advisor", "investment"],
    title: "Head of Wealth Management / Portfolio Manager",
    role: "Manages client portfolios, digital advice delivery, and AUM growth",
    painPoints: ["Client retention at scale", "Fee compression", "Regulatory compliance (MiFID II / RDR)"],
  },
  {
    keywords: ["neobank", "challenger bank", "digital bank", "banking"],
    title: "Chief Product Officer / Head of Retail Banking",
    role: "Drives product roadmap, customer activation, and revenue diversification",
    painPoints: ["Unit economics at scale", "Customer lifetime value", "Licence and regulatory overhead"],
  },
  {
    keywords: ["ai", "artificial intelligence", "machine learning", "llm"],
    title: "Chief Data Officer / Head of AI",
    role: "Leads AI strategy, model governance, and data platform development",
    painPoints: ["Model explainability for regulators", "Data quality and lineage", "AI talent acquisition"],
  },
  {
    keywords: ["fintech", "financial technology", "financial services", ""],
    title: "C-Suite Fintech Executive (CEO / CFO / CTO)",
    role: "Strategic leader driving growth, efficiency, and digital transformation",
    painPoints: ["Scaling operations profitably", "Regulatory complexity", "Competitive differentiation"],
  },
];

function getPersona(
  topic: string,
): (typeof PERSONA_BY_NICHE)[0] {
  const lower = topic.toLowerCase();
  return (
    PERSONA_BY_NICHE.find((p) =>
      p.keywords.some((kw) => kw && lower.includes(kw)),
    ) ?? PERSONA_BY_NICHE[PERSONA_BY_NICHE.length - 1]
  );
}

const OBJECTIVE_BY_ARCHETYPE: Record<string, string> = {
  "The Blueprint":       "Establish authority with actionable frameworks — converts readers into leads who trust your process.",
  "The Comparison":      "Capture high-intent 'vs' and 'alternative' searches — ideal for decision-stage buyers evaluating solutions.",
  "The Trendsetter":     "Rank for forward-looking queries and position the brand ahead of the curve before competitors.",
  "The Data Dive":       "Build credibility with proprietary data — earns backlinks and drives SME decision-maker traffic.",
  "The Contrarian":      "Generate shares by challenging conventional wisdom — strong for brand differentiation and PR pick-up.",
  "The How-To":          "Capture 'how to' search volume — high conversion rate for readers with a specific implementation problem.",
  "The Listicle":        "Earn featured snippets and social shares — skimmable format drives high dwell time and return visits.",
  "The Deep Dive":       "Own long-tail authority queries — signals expertise to Google and builds thought-leader credibility.",
  "The Warning":         "Capture risk-aware searchers — strong for top-of-funnel brand awareness and newsletter sign-ups.",
  "The Future":          "Rank for prediction and outlook queries — positions the brand as the category oracle.",
  "The Authority Guide": "Build topical authority and internal link equity — cornerstone content for the pillar strategy.",
  "The Case Study":      "Convert bottom-of-funnel traffic with proof — highest-converting format for services businesses.",
  "The Why Now":         "Capture urgency-driven searches — strong for seasonal or trend-driven topics with a narrow window.",
  "The Insider":         "Differentiate with proprietary knowledge — builds loyal readership and email subscribers.",
  "The Opportunity":     "Surface untapped angles for strategic readers — strong for newsletter growth and lead generation.",
  "The Benchmark":       "Own benchmark and comparison queries — earns citations from industry publications.",
};

const SECONDARY_KW_SUFFIX_BY_TYPE: Record<ContentType, string[]> = {
  guide:        ["best practices 2026", "implementation guide", "how it works", "ROI and benefits"],
  blog:         ["trends 2026", "strategy guide", "explained for CFOs", "what you need to know"],
  "case-study": ["success story", "ROI analysis", "real-world results", "before and after"],
  roundup:      ["tools comparison", "top vendors 2026", "buyer's guide", "best alternatives"],
  linkedin:     ["insights", "predictions 2026", "lessons learned", "what nobody tells you"],
};

const OUTLINE_TEMPLATE_BY_TYPE: Record<
  ContentType,
  (topic: string) => string[]
> = {
  guide: (t) => [
    `## Introduction: Why ${t} Matters Right Now`,
    `## What Is ${t}? (Definition & Scope)`,
    `## The Business Case: ROI and Risk of Inaction`,
    `## Key Components of a ${t} Strategy`,
    `## Step-by-Step Implementation Roadmap`,
    `## Common Pitfalls and How to Avoid Them`,
    `## ${t} Tools & Vendors: What to Evaluate`,
    `## Real-World Results: Metrics and Benchmarks`,
    `## Conclusion + Next Steps`,
  ],
  blog: (t) => [
    `## Why ${t} Is at an Inflection Point`,
    `## The Core Challenge Driving Change`,
    `## Three Shifts Reshaping the Landscape`,
    `## What Leading Firms Are Doing Differently`,
    `## What This Means for Your Strategy`,
    `## Key Takeaways`,
  ],
  "case-study": (t) => [
    `## The Challenge: What Was Broken`,
    `## Why ${t} Was the Right Solution`,
    `## The Approach: Implementation in Four Phases`,
    `## Results: The Numbers That Changed Everything`,
    `## Lessons Learned & What We'd Do Differently`,
    `## Is ${t} Right for Your Organisation?`,
  ],
  roundup: (t) => [
    `## How We Evaluated the Best ${t} Solutions`,
    `## #1 — [Vendor]: Best for Enterprise Scale`,
    `## #2 — [Vendor]: Best for Mid-Market`,
    `## #3 — [Vendor]: Best for Cost-Efficiency`,
    `## #4 — [Vendor]: Best for Compliance-Heavy Sectors`,
    `## Comparison Table`,
    `## How to Choose the Right ${t} Solution`,
    `## Verdict`,
  ],
  linkedin: (t) => [
    `[Hook: Bold claim or counterintuitive statement about ${t}]`,
    `[Context: 1–2 sentences why this matters now]`,
    `[3–5 bullet insights or predictions — short, punchy]`,
    `[Bridge: What the smartest companies are doing differently]`,
    `[CTA: Invite a reaction, ask a question, or request a DM]`,
  ],
};

const DISTRIBUTION_PLAN_BY_TYPE: Record<
  ContentType,
  { channel: string; action: string }[]
> = {
  guide: [
    { channel: "Organic Search",     action: "Primary driver — optimise title tag, meta description, and H1 for target keyword" },
    { channel: "LinkedIn",           action: "Share a 5-insight extract with a link; tag relevant thought leaders" },
    { channel: "Email Newsletter",   action: "Feature as the lead story in the next send with a 2-line summary and CTA button" },
    { channel: "Sales Enablement",   action: "Add to sales playbook as a bottom-of-funnel asset for prospects in evaluation" },
    { channel: "Partner Outreach",   action: "Co-promote with any vendors or partners mentioned in the guide" },
  ],
  blog: [
    { channel: "Organic Search",     action: "Optimise for informational intent; add to internal linking from the pillar page" },
    { channel: "LinkedIn",           action: "Repurpose one key stat or insight as a native post; link to the full article" },
    { channel: "Email Newsletter",   action: "Include as a secondary story or 'From the blog' section" },
    { channel: "Social Snippet",     action: "Extract one pull quote for Twitter/X distribution" },
  ],
  "case-study": [
    { channel: "Sales Enablement",   action: "Primary use — send proactively to prospects in the same industry vertical" },
    { channel: "Organic Search",     action: "Optimise for '[client type] + [outcome] + [topic]' keyword pattern" },
    { channel: "LinkedIn",           action: "Share headline result as a native post with 'Read the full story' link" },
    { channel: "Email Newsletter",   action: "Feature prominently — case studies consistently drive highest newsletter CTR" },
    { channel: "PR Outreach",        action: "Pitch the headline metric to fintech trade press as a data story" },
  ],
  roundup: [
    { channel: "Organic Search",     action: "Target 'best [topic] tools/vendors' cluster — high commercial intent" },
    { channel: "Vendor Outreach",    action: "Notify featured vendors — many will share and link back organically" },
    { channel: "LinkedIn",           action: "Post the comparison table as a native document carousel" },
    { channel: "Email Newsletter",   action: "Feature as a resource for subscribers currently evaluating solutions" },
  ],
  linkedin: [
    { channel: "LinkedIn Native",    action: "Post directly — do not link externally; let the algorithm run for 24h" },
    { channel: "Employee Amplify",   action: "Ask 3–5 team members to like and comment within the first hour" },
    { channel: "Newsletter Cross-post", action: "Adapt as a short intro + link to the LinkedIn post in your next email send" },
    { channel: "Repurpose",          action: "Expand the top-performing insight into a full blog post within 2 weeks" },
  ],
};

// ─── Brief AI Scoring ─────────────────────────────────────────────────────────
interface BriefScores {
  seo:             number;
  audience:        number;
  differentiation: number;
  distribution:    number;
  conversion:      number;
}

const SCORE_DIMENSION_META: {
  key:      keyof BriefScores;
  label:    string;
  icon:     string;
  color:    string;
  feedback: (s: number) => string;
}[] = [
  {
    key:   "seo",
    label: "SEO Alignment",
    icon:  "🔍",
    color: "bg-blue-500",
    feedback: (s) =>
      s >= 80 ? "Strong search demand with manageable competition" :
      s >= 55 ? "Solid opportunity — consider tightening the target keyword" :
                "Low volume or high KD — consider a narrower long-tail angle",
  },
  {
    key:   "audience",
    label: "Audience Specificity",
    icon:  "🎯",
    color: "bg-violet-500",
    feedback: (s) =>
      s >= 80 ? "Archetype is sharply defined — reader knows this is for them" :
      s >= 60 ? "Good focus — add a persona-specific hook in the intro" :
                "Sharpen the archetype to better target a specific reader type",
  },
  {
    key:   "differentiation",
    label: "Competitive Diff.",
    icon:  "⚡",
    color: "bg-amber-500",
    feedback: (s) =>
      s >= 80 ? "Under-served angle in your calendar — strong gap-fill opportunity" :
      s >= 60 ? "Moderate differentiation — lean into a proprietary data point" :
                "Multiple similar pieces planned — sharpen the unique angle",
  },
  {
    key:   "distribution",
    label: "Distribution Readiness",
    icon:  "📡",
    color: "bg-emerald-500",
    feedback: (s) =>
      s >= 80 ? "Multi-channel plan covers primary and secondary touchpoints" :
      s >= 60 ? "Good coverage — consider adding a sales enablement touchpoint" :
                "Expand distribution — repurpose for at least one more channel",
  },
  {
    key:   "conversion",
    label: "Conversion Potential",
    icon:  "💰",
    color: "bg-rose-500",
    feedback: (s) =>
      s >= 80 ? "High priority score + strong intent signal = conversion-ready" :
      s >= 60 ? "Solid potential — ensure the CTA is specific and time-bound" :
                "Lower intent match — add a gated asset or stronger CTA",
  },
];

function computeBriefScores(
  entry:      CalendarEntry,
  allEntries: CalendarEntry[],
): BriefScores {
  // 1 — SEO Alignment: search volume + KD bonus
  const volPts  = VOLUME_SEO_POINTS[entry.searchVolume] ?? 2;  // 0–8
  const kdBonus =
    entry.topicDifficulty < 30 ? 20 :
    entry.topicDifficulty < 50 ? 13 :
    entry.topicDifficulty < 70 ?  6 : 0;
  const seo = Math.min(100, Math.round((volPts / 8) * 80 + kdBonus));

  // 2 — Audience Specificity: archetype sharpness
  const archetypeSharpness: Record<string, number> = {
    "The Challenger": 92, "The Expert": 87, "The Insider":  90,
    "The Guide":      78, "The Contrarian": 84, "The Analyst": 82,
    "The Benchmark":  79, "The Why Now":    74, "The Opportunity": 72,
  };
  const audience = archetypeSharpness[entry.archetype] ?? 70;

  // 3 — Competitive Differentiation: unique type×topic combos score higher
  const sameTypeTopic = allEntries.filter(
    (e) => e.topic === entry.topic && e.type === entry.type,
  ).length;
  const diffBase      = sameTypeTopic === 1 ? 90 : sameTypeTopic === 2 ? 74 : 58;
  const differentiation = Math.min(100, diffBase + (entry.priorityScore > 70 ? 8 : 0));

  // 4 — Distribution Readiness: channels in the type's plan
  const channelCount  = DISTRIBUTION_PLAN_BY_TYPE[entry.type].length;
  const distribution  = Math.min(100, 40 + channelCount * 13);

  // 5 — Conversion Potential: priorityScore + search intent
  const intentBonus: Record<string, number> = {
    Transactional: 22, Commercial: 16, Informational: 6, Navigational: 0,
  };
  const conversion = Math.min(
    100,
    Math.round(entry.priorityScore * 0.65) +
      (intentBonus[entry.searchIntent] ?? 6) + 8,
  );

  return { seo, audience, differentiation, distribution, conversion };
}

// ─── Editorial brief generator ────────────────────────────────────────────────
// Produces a Notion-ready markdown string for a single calendar entry.
// Paste directly into a new Notion page — all formatting renders correctly.

function generateBrief(entry: CalendarEntry): string {
  const rationale =
    ARCHETYPE_RATIONALE[entry.archetype] ??
    "Build authority and drive organic traffic";
  const wordCount = WORD_COUNT_BY_TYPE[entry.type];
  const formatLabel = FORMAT_LABEL[entry.type];
  const isLinkedIn = entry.type === "linkedin";

  const internalLinks = isLinkedIn
    ? [
        `Tag or mention a relevant thought leader in ${entry.topic}`,
        `Reference a recent FintechPressHub article on ${entry.topic}`,
        `Link to the most recent guide or whitepaper on ${entry.topic}`,
      ]
    : [
        `Link to the most recent ${entry.topic} case study on the site`,
        `Link to the services page most closely covering ${entry.topic}`,
        `Link to the topic hub or pillar page for ${entry.topic}`,
        `Link to a related roundup or data post on ${entry.topic}`,
      ];

  const writerNotes =
    isLinkedIn
      ? [
          "Keep the opening hook to 1–2 lines before the 'see more' break",
          "Use short paragraphs — 1–2 sentences max for mobile readability",
          "Include a direct question or prompt to drive comment engagement",
          `Execute CTA: *${entry.cta}*`,
        ]
      : entry.type === "guide"
      ? [
          "Open with a clear statement of who the guide is for and what problem it solves",
          "Structure with H2 sections and H3 sub-sections for scannability",
          "Include at least 3 original data points, charts, or proprietary insights",
          "Add a downloadable asset or gated resource to support the CTA",
          "Include a pull quote formatted for LinkedIn repurposing",
          "Minimum internal links: 3 — see targets below",
          `Close with CTA: *${entry.cta}*`,
        ]
      : entry.type === "case-study"
      ? [
          "Lead with the headline result (the key metric) in the opening paragraph",
          "Structure: Challenge → Approach → Results → Takeaways",
          "Include at least 2 specific, verifiable metrics with source attribution",
          "Add a client pull quote if available",
          `Close with CTA: *${entry.cta}*`,
        ]
      : entry.type === "roundup"
      ? [
          "Curate 8–12 high-quality sources with brief editorial commentary on each",
          "Open with a strong editorial take — not a generic list introduction",
          "Verify all outbound links open and are not behind paywalls",
          "Add at least one proprietary insight or original data point to differentiate",
          `Close with CTA: *${entry.cta}*`,
        ]
      : [
          "Open with a strong hook that states the reader's specific problem",
          "Use H2 subheadings — aim for 4–6 sections minimum",
          "Include at least 1 original data point, stat, or proprietary insight",
          "Add a pull quote formatted for LinkedIn repurposing",
          `Close with CTA: *${entry.cta}*`,
        ];

  const persona    = getPersona(entry.topic);
  const objective  =
    OBJECTIVE_BY_ARCHETYPE[entry.archetype] ??
    `Build authority and drive organic traffic in the ${entry.topic} space.`;
  const topicLabel = entry.topic.split(" ").slice(0, 2).join(" ");
  const secondaryKws = SECONDARY_KW_SUFFIX_BY_TYPE[entry.type].map(
    (suffix) => `${topicLabel} ${suffix}`,
  );
  const outline      = OUTLINE_TEMPLATE_BY_TYPE[entry.type](topicLabel);
  const distribution = DISTRIBUTION_PLAN_BY_TYPE[entry.type];

  return [
    `# ${entry.angle}`,
    ``,
    `## 📋 Editorial Brief`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| **Content Type** | ${formatLabel} |`,
    `| **Archetype** | ${entry.archetype} |`,
    `| **Publish Date** | ${entry.date} — Week ${entry.week} |`,
    `| **Topic / Target Keyword** | ${entry.topic} |`,
    `| **Search Intent** | ${entry.searchIntent} |`,
    `| **Priority Score** | ${entry.priorityScore} / 100 |`,
    `| **Est. Monthly Search Volume** | ${entry.searchVolume} |`,
    `| **Topic Difficulty (KD)** | ${entry.topicDifficulty} / 100 |`,
    `| **Suggested Word Count** | ${wordCount} |`,
    `| **Target Persona** | ${persona.title} |`,
    `| **CTA** | ${entry.cta} |`,
    ``,
    `---`,
    ``,
    `## 👤 Target Persona`,
    ``,
    `**${persona.title}** — ${persona.role}`,
    ``,
    `**Key pain points:** ${persona.painPoints.join(" · ")}`,
    ``,
    `---`,
    ``,
    `## 🎯 Content Objective`,
    ``,
    objective,
    ``,
    `---`,
    ``,
    `## 🔍 SEO Keywords`,
    ``,
    `- **Primary:** ${entry.topic}`,
    ...secondaryKws.map((kw) => `- **Secondary:** ${kw}`),
    `- **Search Intent:** ${entry.searchIntent}`,
    ``,
    `---`,
    ``,
    `## 📐 Suggested Outline`,
    ``,
    ...outline,
    ``,
    `---`,
    ``,
    `## 📣 Distribution Plan`,
    ``,
    ...distribution.map((d) => `- **${d.channel}:** ${d.action}`),
    ``,
    `---`,
    ``,
    `## 🧠 Archetype Rationale`,
    ``,
    `**${entry.archetype}** — ${rationale}`,
    ``,
    `---`,
    ``,
    `## 🔗 Internal Link Targets`,
    ``,
    ...internalLinks.map((link) => `- [ ] ${link}`),
    ``,
    `---`,
    ``,
    `## 📝 Writer Notes`,
    ``,
    ...writerNotes.map((note) => `- ${note}`),
    ``,
    `---`,
    ``,
    `*Generated by FintechPressHub Content Calendar Generator*`,
  ].join("\n");
}

// ─── Publish-Ready Checklist sub-component ────────────────────────────────────

function PublishChecklist({
  entryKey,
  type,
  checked,
  isExpanded,
  onToggleItem,
  onToggleExpand,
}: {
  entryKey: string;
  type: ContentType;
  checked: string[];
  isExpanded: boolean;
  onToggleItem: (key: string, item: string) => void;
  onToggleExpand: (key: string) => void;
}) {
  const items = CHECKLIST_ITEMS[type];
  const doneCount = checked.length;
  const totalCount = items.length;
  const allDone = doneCount === totalCount;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        onClick={() => onToggleExpand(entryKey)}
        className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <span
          className={`inline-flex items-center justify-center min-w-[2.5rem] text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
            allDone
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {allDone ? "✓ done" : `${doneCount}/${totalCount}`}
        </span>
        <span>Publish Checklist</span>
        <span className="text-slate-300">{isExpanded ? "▲" : "▼"}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {items.map((item) => {
            const isChecked = checked.includes(item);
            return (
              <label key={item} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleItem(entryKey, item)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0"
                />
                <span
                  className={`text-[11px] leading-tight transition-colors ${
                    isChecked
                      ? "line-through text-slate-400"
                      : "text-slate-600 group-hover:text-indigo-600"
                  }`}
                >
                  {item}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentCalendarGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNotion, setCopiedNotion] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [checkedItems, setCheckedItems] = useState<Record<string, string[]>>({});
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [briefEntry, setBriefEntry] = useState<CalendarEntry | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [showPresets, setShowPresets] = useState(() => loadPresets().length > 0);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [filledGaps, setFilledGaps] = useState<Set<string>>(new Set());
  const [entryStatuses, setEntryStatuses] = useState<Record<string, ContentStatus>>({});

  const cycleStatus = (key: string) =>
    setEntryStatuses((prev) => {
      const cur: ContentStatus = prev[key] ?? "not-started";
      return { ...prev, [key]: STATUS_CONFIG[cur].next };
    });

  const resetStatuses = () => setEntryStatuses({});

  // ── Sprint Planner state ───────────────────────────────────────────────────
  const [sprintMode,         setSprintMode]         = useState(false);
  const [sprintWeek,         setSprintWeek]         = useState<number | null>(null);
  const [sprintAssignments,  setSprintAssignments]  = useState<Record<string, number>>({});
  const [sprintCapacityWarn, setSprintCapacityWarn] = useState<number | null>(null);

  const sprintWeekCount = (wk: number) =>
    calendar.filter((e) => (sprintAssignments[entryKey(e)] ?? e.week) === wk).length;

  const assignToSprint = (key: string) => {
    if (sprintWeek === null) return;
    if (sprintAssignments[key] === sprintWeek) {
      setSprintAssignments((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    const target       = CADENCE_POSTS_PER_WEEK[form.cadence];
    const currentCount = sprintWeekCount(sprintWeek);
    if (currentCount >= target) {
      setSprintCapacityWarn(sprintWeek);
      setTimeout(() => setSprintCapacityWarn(null), 2800);
      return;
    }
    setSprintAssignments((prev) => ({ ...prev, [key]: sprintWeek }));
  };

  const entryKey = (e: { date: string; type: string; topic: string }) =>
    `${e.date}|${e.type}|${e.topic}`;

  const toggleChecklistItem = (key: string, item: string) =>
    setCheckedItems((prev) => {
      const current = prev[key] ?? [];
      const already = current.includes(item);
      return { ...prev, [key]: already ? current.filter((i) => i !== item) : [...current, item] };
    });

  const toggleChecklistExpanded = (key: string) =>
    setExpandedChecklists((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addTopic = () => {
    const t = form.topicInput.trim();
    if (!t || form.topics.includes(t) || form.topics.length >= 12) return;
    setForm((prev) => ({
      ...prev,
      topics: [...prev.topics, t],
      topicInput: "",
    }));
  };

  const addSuggested = (topic: string) => {
    if (form.topics.includes(topic) || form.topics.length >= 12) return;
    setField("topics", [...form.topics, topic]);
  };

  const removeTopic = (topic: string) =>
    setField(
      "topics",
      form.topics.filter((t) => t !== topic),
    );

  const reset = () => {
    setForm(DEFAULTS);
    setCalendar([]);
    setGenerated(false);
    setSortByPriority(false);
    setFilterTopic("all");
    setCopiedNotion(false);
    setCheckedItems({});
    setExpandedChecklists(new Set());
    setBriefEntry(null);
    setShowHeatmap(false);
  };

  const saveAsTemplate = () => {
    const name =
      presetName.trim() ||
      `${form.companyName || "Calendar"} — ${form.timeframe}d ${form.cadence}`;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString().split("T")[0],
      form: { ...form },
    };
    const updated = [newPreset, ...presets].slice(0, MAX_PRESETS);
    setPresets(updated);
    savePresetsToStorage(updated);
    setSavingPreset(false);
    setPresetName("");
    setShowPresets(true);
  };

  const loadPreset = (preset: Preset) => {
    setForm(preset.form);
    setCalendar([]);
    setGenerated(false);
    setFilterTopic("all");
    setSortByPriority(false);
    setShowHeatmap(false);
    setCheckedItems({});
    setExpandedChecklists(new Set());
    setBriefEntry(null);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresetsToStorage(updated);
  };

  const fillGap = (gap: ContentGap) => {
    const key = `${gap.topic}|${gap.missingType}`;
    if (filledGaps.has(key)) return;
    const entry = buildSingleEntry(gap.topic, gap.missingType, calendar.length);
    setCalendar((prev) => [...prev, entry]);
    setFilledGaps((prev) => new Set([...prev, key]));
  };

  const generate = () => {
    const result = buildCalendar(form);
    setCalendar(result);
    setGenerated(true);
  };

  const rebalance = (newFormat: Format) => {
    const updated = { ...form, format: newFormat };
    setForm(updated);
    const result = buildCalendar(updated);
    setCalendar(result);
    setFilterTopic("all");
    setSortByPriority(false);
  };

  const copyAsText = () => {
    const text = calendar
      .map(
        (e) =>
          `Week ${e.week} | ${e.date} | ${e.topic} | Vol: ${e.searchVolume} | KD: ${e.topicDifficulty}/100 (${kdLabel(e.topicDifficulty)}) | Priority: ${e.priorityScore}/100 (${priorityLabel(e.priorityScore)}) | ${e.angle} | ${FORMAT_LABEL[e.type]} | Intent: ${e.searchIntent} | CTA: ${e.cta}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAsNotion = () => {
    const toRow = (cols: string[]) => `| ${cols.join(" | ")} |`;
    const headers = [
      "#", "Week", "Date", "Topic", "Working Title",
      "Format", "Search Intent", "Volume", "KD Score", "Priority", "CTA",
    ];
    const sep = headers.map(() => "---");
    const rows = calendar.map((e, i) => [
      String(i + 1),
      `Week ${e.week}`,
      e.date,
      e.topic,
      e.angle,
      FORMAT_LABEL[e.type],
      e.searchIntent,
      e.searchVolume,
      `${e.topicDifficulty}/100 · ${kdLabel(e.topicDifficulty)}`,
      `${e.priorityScore}/100 · ${priorityLabel(e.priorityScore)}`,
      e.cta,
    ]);
    const table = [toRow(headers), toRow(sep), ...rows.map(toRow)].join("\n");
    navigator.clipboard.writeText(table);
    setCopiedNotion(true);
    setTimeout(() => setCopiedNotion(false), 2500);
  };

  const exportAllBriefs = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const companySlug = (form.companyName || "calendar")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const docHeader = [
      `# ${form.companyName || "Content Calendar"} — Full Editorial Brief Pack`,
      ``,
      `**Generated:** ${dateStr}`,
      `**Total entries:** ${calendar.length}`,
      `**Timeframe:** ${form.timeframe} days | **Cadence:** ${form.cadence}`,
      `**Topics:** ${form.topics.join(", ")}`,
      ``,
      `---`,
      ``,
    ].join("\n");

    const allBriefs = calendar
      .map(
        (e, i) =>
          `## Entry ${i + 1} of ${calendar.length}\n\n${generateBrief(e)}`,
      )
      .join("\n\n---\n\n");

    const blob = new Blob([docHeader + allBriefs], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `editorial-briefs-${companySlug}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Publish Queue export ──────────────────────────────────────────────────
  const exportPublishQueue = () => {
    const dateStr    = new Date().toISOString().split("T")[0];
    const companySlug = (form.companyName || "calendar")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const queueEntries = calendar
      .filter((e) => {
        const s = entryStatuses[entryKey(e)] ?? "not-started";
        return s === "published" || s === "review";
      })
      .sort((a, b) => {
        const aS = entryStatuses[entryKey(a)] ?? "not-started";
        const bS = entryStatuses[entryKey(b)] ?? "not-started";
        // Published first, then In Review; within each group sort by week/date
        if (aS !== bS) return aS === "published" ? -1 : 1;
        return a.week !== b.week ? a.week - b.week : a.date.localeCompare(b.date);
      });

    if (queueEntries.length === 0) return;

    const publishedCount = queueEntries.filter(
      (e) => (entryStatuses[entryKey(e)] ?? "not-started") === "published",
    ).length;
    const reviewCount    = queueEntries.length - publishedCount;
    const topicsCovered  = [...new Set(queueEntries.map((e) => e.topic))].join(", ");
    const weeksCovered   = [...new Set(queueEntries.map((e) => e.week))]
      .sort((a, b) => a - b)
      .map((w) => `Wk ${w}`)
      .join(", ");

    // Summary block — prefixed with # so most CSV apps treat it as a comment
    const summary = [
      `# PUBLISH QUEUE — ${(form.companyName || "Content Calendar").toUpperCase()}`,
      `# Generated: ${dateStr}  |  Cadence: ${form.cadence}  |  Timeframe: ${form.timeframe} days`,
      `# In queue: ${queueEntries.length} entries  (${publishedCount} Published · ${reviewCount} In Review)`,
      `# Topics: ${topicsCovered}`,
      `# Weeks: ${weeksCovered}`,
      `# ——————————————————————————————————————————————`,
      `#`,
    ].join("\n");

    const header =
      "Status,Week,Date,Topic,Content Type,Archetype,Working Title," +
      "Search Intent,Priority Score,Est. Search Volume,KD,CTA\n";

    const rows = queueEntries
      .map((e) => {
        const statusLabel = STATUS_CONFIG[entryStatuses[entryKey(e)] as ContentStatus].label;
        return (
          `"${statusLabel}",` +
          `${e.week},` +
          `"${e.date}",` +
          `"${e.topic}",` +
          `"${FORMAT_LABEL[e.type]}",` +
          `"${e.archetype}",` +
          `"${e.angle}",` +
          `"${e.searchIntent}",` +
          `${e.priorityScore},` +
          `"${e.searchVolume}",` +
          `${e.topicDifficulty},` +
          `"${e.cta}"`
        );
      })
      .join("\n");

    const blob = new Blob([summary + "\n" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `publish-queue-${companySlug}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedByWeek = calendar.reduce<Record<number, CalendarEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.week]) acc[entry.week] = [];
      acc[entry.week].push(entry);
      return acc;
    },
    {},
  );

  // Sorted flat list for priority view
  const prioritySortedCalendar = [...calendar].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );

  // Topic filter — "all" means no filter
  const calendarTopics = [...new Set(calendar.map((e) => e.topic))].sort();
  const filteredCalendar =
    filterTopic === "all" ? calendar : calendar.filter((e) => e.topic === filterTopic);

  const filteredGroupedByWeek = filteredCalendar.reduce<Record<number, CalendarEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.week]) acc[entry.week] = [];
      acc[entry.week].push(entry);
      return acc;
    },
    {},
  );

  const filteredPrioritySorted = [...filteredCalendar].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );

  // Count unique archetypes used — shown as a quality signal
  const archetypesUsed = new Set(calendar.map((e) => e.archetype)).size;

  // ── Topic Colour Legend — per-topic aggregate stats ──────────────────────
  const topicLegend = form.topics.map((topic) => {
    const topicEntries = calendar.filter((e) => e.topic === topic);
    const pieces = topicEntries.length;
    const avgPriority =
      pieces > 0
        ? Math.round(topicEntries.reduce((s, e) => s + e.priorityScore, 0) / pieces)
        : 0;
    const typeBucket: Partial<Record<ContentType, number>> = {};
    for (const e of topicEntries) typeBucket[e.type] = (typeBucket[e.type] ?? 0) + 1;
    const topType = (
      Object.entries(typeBucket).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? "blog"
    ) as ContentType;
    return {
      topic,
      pieces,
      avgPriority,
      topType,
      colorStyle: topicColorStyle(topic, form.topics),
    };
  });

  // ── Content gap finder ──────────────────────────────────────────────────────
  const coveredByTopic = new Map<string, Set<ContentType>>();
  for (const entry of calendar) {
    if (!coveredByTopic.has(entry.topic)) coveredByTopic.set(entry.topic, new Set());
    coveredByTopic.get(entry.topic)!.add(entry.type);
  }
  const allContentGaps: ContentGap[] = [];
  for (const topic of form.topics) {
    const covered = coveredByTopic.get(topic) ?? new Set<ContentType>();
    const vol = getSearchVolume(topic);
    const base = computePriorityScore(vol.tier, vol.difficulty);
    for (const type of Object.keys(FORMAT_LABEL) as ContentType[]) {
      if (!covered.has(type)) {
        const score = Math.round(base * GAP_TYPE_WEIGHT[type]);
        if (score >= 25)
          allContentGaps.push({ topic, missingType: type, vol, opportunityScore: score });
      }
    }
  }
  allContentGaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
  const topGaps = allContentGaps.slice(0, 10);

  // ── Competitor Gap Analysis ───────────────────────────────────────────────
  type CompetitorGapEntry = {
    topic: string;
    type: ContentType;
    threat: CompetitorThreat;
    exampleAngle: string;
    depth: string;
    insight: string;
  };
  const THREAT_ORDER: CompetitorThreat[] = ["High", "Medium", "Low"];
  const allCompetitorGaps: CompetitorGapEntry[] = [];
  for (const topic of form.topics) {
    const covered = new Set(
      calendar.filter((e) => e.topic === topic).map((e) => e.type),
    );
    const niche = getCompetitorPriority(topic);
    const topicWord = topic.split(" ")[0];
    for (const threat of THREAT_ORDER) {
      for (const [rawType, t] of Object.entries(niche.priority)) {
        const type = rawType as ContentType;
        if (t === threat && !covered.has(type)) {
          allCompetitorGaps.push({
            topic,
            type,
            threat,
            exampleAngle: COMPETITOR_ANGLE_BY_TYPE[type].replace(
              /\[Topic\]|\[Client\]/g,
              topicWord,
            ),
            depth: DEPTH_BY_TYPE_LABEL[type],
            insight: niche.insight,
          });
        }
      }
    }
  }
  const competitorGapsByTopic = form.topics
    .map((topic) => ({
      topic,
      gaps: allCompetitorGaps.filter((g) => g.topic === topic).slice(0, 3),
    }))
    .filter((t) => t.gaps.length > 0);
  const highThreatGapCount = allCompetitorGaps.filter(
    (g) => g.threat === "High",
  ).length;

  // ── Competitive Benchmark ──────────────────────────────────────────────────
  const benchmarkData = form.topics
    .map((topic) => {
      const entries = calendar.filter((e) => e.topic === topic);
      if (entries.length === 0) return null;
      const avgScore = Math.round(
        entries.reduce((sum, e) => sum + e.priorityScore, 0) / entries.length,
      );
      const { avg: industryAvg, label: nicheLabel } = getIndustryBenchmark(topic);
      const upside = avgScore - industryAvg;
      return { topic, avgScore, industryAvg, nicheLabel, upside };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.upside - a.upside)
    .slice(0, 3);

  // ── Content Velocity Planner ──────────────────────────────────────────────
  const timeframeWeeks = Math.max(1, parseInt(form.timeframe) / 7);
  const velocityData = form.topics.map((topic) => {
    const plannedCount = calendar.filter((e) => e.topic === topic).length;
    const { avg: industryAvg, label: nicheLabel } = getIndustryBenchmark(topic);
    const authorityTarget = getAuthorityTarget(industryAvg);
    const remaining = Math.max(0, authorityTarget - plannedCount);
    const progressPct = Math.min(100, Math.round((plannedCount / authorityTarget) * 100));
    const totalNeededRate =
      Math.round((authorityTarget / timeframeWeeks) * 10) / 10;
    const plannedRate = Math.round((plannedCount / timeframeWeeks) * 10) / 10;
    return {
      topic,
      nicheLabel,
      authorityTarget,
      plannedCount,
      remaining,
      progressPct,
      totalNeededRate,
      plannedRate,
    };
  });
  const totalCurrentRate =
    Math.round((calendar.length / timeframeWeeks) * 10) / 10;
  const totalTargetRate =
    Math.round(
      (velocityData.reduce((s, v) => s + v.authorityTarget, 0) / timeframeWeeks) * 10,
    ) / 10;
  const velocityGap =
    Math.round((totalTargetRate - totalCurrentRate) * 10) / 10;

  // ── Pillar & Cluster Map ───────────────────────────────────────────────────
  const MAX_PILLARS = Math.min(3, form.topics.length);
  const topicStats = form.topics.map((topic) => {
    const entries = calendar.filter((e) => e.topic === topic);
    const avg =
      entries.length > 0
        ? Math.round(
            entries.reduce((s, e) => s + e.priorityScore, 0) / entries.length,
          )
        : 0;
    return { topic, avg, entries };
  });
  topicStats.sort((a, b) => b.avg - a.avg);
  const pillarTopics = topicStats.slice(0, MAX_PILLARS);
  const extraTopics = topicStats.slice(MAX_PILLARS);
  const pillarMap = pillarTopics.map((p, i) => {
    const attachedTopics = extraTopics.filter((_, j) => j % MAX_PILLARS === i);
    const clusterEntries = [
      ...p.entries,
      ...attachedTopics.flatMap((t) => t.entries),
    ];
    return {
      topic: p.topic,
      avgScore: p.avg,
      clusterEntries,
      attachedTopics: attachedTopics.map((t) => t.topic),
      status: clusterStatus(clusterEntries.length),
    };
  });

  // ── Distribution Channels Planner ─────────────────────────────────────────
  const channelBreakdown = DISTRIBUTION_CHANNELS.map((ch) => {
    const matches = calendar.filter(
      (e) =>
        (ch.matchTypes.includes(e.type) ||
          ch.matchArchetypes.includes(e.archetype)) &&
        e.priorityScore >= ch.minPriorityScore,
    );
    const preview = matches.slice(0, 3);
    const overflow = matches.length - preview.length;
    const pct =
      calendar.length > 0
        ? Math.round((matches.length / calendar.length) * 100)
        : 0;
    return { ...ch, matches, preview, overflow, pct };
  }).filter((ch) => ch.matches.length > 0);

  // ── Estimated Reach Calculator ────────────────────────────────────────────
  const reachData = form.topics.map((topic) => {
    const entries = calendar.filter((e) => e.topic === topic);
    const organicEntries = entries.filter((e) => e.type !== "linkedin");
    const linkedInEntries = entries.filter((e) => e.type === "linkedin");
    const emailEntries = entries.filter((e) =>
      (["blog", "guide", "case-study", "roundup"] as ContentType[]).includes(
        e.type,
      ),
    );
    const organicReach = organicEntries.reduce(
      (sum, e) => sum + (ORGANIC_REACH_BY_TIER[e.searchVolume] ?? 85),
      0,
    );
    const linkedInImpressions =
      linkedInEntries.length * LINKEDIN_IMPRESSIONS_PER_POST;
    const emailOpens = emailEntries.length * EMAIL_OPENS_PER_PIECE_PER_1K_SUBS;
    return {
      topic,
      entryCount: entries.length,
      organicReach,
      linkedInImpressions,
      emailOpens,
    };
  });
  const totalOrganicReach = reachData.reduce(
    (s, r) => s + r.organicReach,
    0,
  );
  const totalLinkedInImpressions = reachData.reduce(
    (s, r) => s + r.linkedInImpressions,
    0,
  );
  const totalEmailOpens = reachData.reduce((s, r) => s + r.emailOpens, 0);

  // ── Content ROI Estimator ─────────────────────────────────────────────────
  const roiData = reachData.map(
    ({ topic, organicReach, linkedInImpressions, emailOpens, entryCount }) => {
      const organicLeads  = Math.round(organicReach       * ROI_CONTENT_TO_LEAD_RATE);
      const linkedInLeads = Math.round(linkedInImpressions * ROI_LINKEDIN_TO_LEAD_RATE);
      const emailLeads    = Math.round(emailOpens          * ROI_EMAIL_TO_LEAD_RATE);
      const totalLeads    = organicLeads + linkedInLeads + emailLeads;
      const pipeline      = Math.round(
        totalLeads * ROI_MQL_TO_OPP_RATE * ROI_CLOSE_RATE * ROI_AVG_DEAL_VALUE,
      );
      return {
        topic,
        entryCount,
        organicLeads,
        linkedInLeads,
        emailLeads,
        totalLeads,
        pipeline,
      };
    },
  );
  const totalRoiLeads    = roiData.reduce((s, r) => s + r.totalLeads, 0);
  const totalRoiPipeline = roiData.reduce((s, r) => s + r.pipeline, 0);
  const maxTopicPipeline = Math.max(1, ...roiData.map((r) => r.pipeline));

  // Content type breakdown for the mix chart
  // ── Publish-Ready Score ──────────────────────────────────────────────────
  const publishReadyEntries = calendar
    .map((e) => ({ entry: e, scores: computePublishReadyScore(e) }))
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, 5);

  const typeCounts = (Object.keys(FORMAT_LABEL) as ContentType[])
    .map((type) => ({
      type,
      count: calendar.filter((e) => e.type === type).length,
      pct:
        calendar.length > 0
          ? Math.round(
              (calendar.filter((e) => e.type === type).length / calendar.length) * 100,
            )
          : 0,
    }))
    .filter((t) => t.count > 0);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="contentCalendarGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Content Calendar Generator"
        description="Build a ready-to-use fintech content calendar in seconds. Pick your topics, cadence, and timeframe — then export to CSV or copy straight into Notion."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
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
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Calendar Settings
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Add at least one topic to personalise your calendar.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="grid sm:grid-cols-3 gap-5 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Company / Brand Name
                  </Label>
                  <Input
                    placeholder="PayFlow Inc."
                    value={form.companyName}
                    onChange={(e) => setField("companyName", e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Publishing Cadence
                  </Label>
                  <Select
                    value={form.cadence}
                    onValueChange={(v) => setField("cadence", v as Cadence)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CADENCE_LABELS) as Cadence[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {CADENCE_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Timeframe
                  </Label>
                  <Select
                    value={form.timeframe}
                    onValueChange={(v) => setField("timeframe", v as Timeframe)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-sm font-semibold text-slate-700">
                    Content Format
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setField("format", f)}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          form.format === f
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-muted-foreground border-border hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        {FORMAT_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topic input */}
              <div className="space-y-3 mb-6">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Your Fintech Topics{" "}
                  <span className="font-normal text-muted-foreground">
                    (up to 12)
                  </span>
                </Label>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a topic, e.g. Open banking"
                    value={form.topicInput}
                    onChange={(e) => setField("topicInput", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopic();
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      const parts = text
                        .split(/[\n,]+/)
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0 && s.length <= 80);
                      if (parts.length > 1) {
                        e.preventDefault();
                        setForm((prev) => {
                          const existing = new Set(
                            prev.topics.map((t) => t.toLowerCase()),
                          );
                          const toAdd = parts
                            .filter((p) => !existing.has(p.toLowerCase()))
                            .slice(0, 12 - prev.topics.length);
                          return {
                            ...prev,
                            topics: [...prev.topics, ...toAdd],
                            topicInput: "",
                          };
                        });
                      }
                    }}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTopic}
                    disabled={
                      !form.topicInput.trim() || form.topics.length >= 12
                    }
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>

                {/* Suggested topics */}
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Quick-add popular fintech topics:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addSuggested(t)}
                        disabled={
                          form.topics.includes(t) || form.topics.length >= 12
                        }
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          form.topics.includes(t)
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200 cursor-default"
                            : "bg-white text-muted-foreground border-border hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected topics + inline volume chips */}
                {form.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.topics.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTopic(t)}
                          className="ml-0.5 hover:opacity-70 transition-opacity"
                          aria-label={`Remove ${t}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Search Volume & Difficulty Estimator panel ────────── */}
              {form.topics.length > 0 && (
                <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-semibold text-indigo-900">
                      Search Volume, Difficulty &amp; Priority
                    </span>
                    <span className="text-[11px] text-indigo-500 ml-1">
                      — monthly global, sourced from public SEO tools
                    </span>
                  </div>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 mb-1.5">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Topic</span>
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide text-right">Monthly Vol.</span>
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide text-right">KD Score</span>
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide text-right">Priority</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {form.topics.map((t) => {
                      const vol = getSearchVolume(t);
                      const priority = computePriorityScore(vol.tier, vol.difficulty);
                      return (
                        <div
                          key={t}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center rounded-lg bg-white border border-indigo-100 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {t}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${TIER_STYLE[vol.tier]}`}
                          >
                            {vol.range}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${kdStyle(vol.difficulty)}`}
                            title={`Keyword difficulty: ${kdLabel(vol.difficulty)}`}
                          >
                            {vol.difficulty}
                            <span className="font-normal opacity-70">/ 100</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${priorityStyle(priority)}`}
                            title={`SEO priority score: ${priority}/100 — ${priorityLabel(priority)}`}
                          >
                            {priorityEmoji(priority)}
                            <span>{priority}</span>
                            <span className="hidden sm:inline font-normal">· {priorityLabel(priority)}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-indigo-400 mt-2.5 leading-relaxed">
                    Volume estimates are indicative ranges. KD (0–100) reflects estimated ranking competition. Priority combines volume + ease of ranking into a single SEO opportunity score — higher is better.
                  </p>
                </div>
              )}

              {/* ── Saved Templates ──────────────────────────────────── */}
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPresets((p) => !p)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved Templates
                    {presets.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {presets.length}
                      </span>
                    )}
                    <span className="text-slate-300 text-[10px] ml-0.5">
                      {showPresets ? "▲" : "▼"}
                    </span>
                  </button>
                  {!savingPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        setSavingPreset(true);
                        setPresetName(
                          form.companyName
                            ? `${form.companyName} — ${form.timeframe}d ${form.cadence}`
                            : `Calendar — ${form.timeframe}d ${form.cadence}`,
                        );
                        setShowPresets(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <span className="text-sm leading-none font-bold">+</span>{" "}
                      Save as Template
                    </button>
                  )}
                </div>

                {/* Inline save input */}
                {savingPreset && (
                  <div className="flex items-center gap-2 mt-2.5 p-2.5 bg-white rounded-lg border border-indigo-100 shadow-sm">
                    <input
                      autoFocus
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveAsTemplate();
                        if (e.key === "Escape") setSavingPreset(false);
                      }}
                      placeholder="Template name…"
                      className="flex-1 text-[12px] bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-300 text-slate-700 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={saveAsTemplate}
                      className="text-[11px] font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shrink-0"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingPreset(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Preset list */}
                {showPresets && (
                  <div className="mt-2.5 space-y-1.5">
                    {presets.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground py-1 px-0.5 leading-relaxed">
                        No templates yet. Configure the form above and click{" "}
                        <span className="font-semibold text-indigo-600">
                          Save as Template
                        </span>{" "}
                        to save your first one.
                      </p>
                    ) : (
                      presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-slate-700 truncate">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {preset.form.topics.length} topic
                              {preset.form.topics.length !== 1 ? "s" : ""} ·{" "}
                              {preset.form.timeframe}d · {preset.form.cadence}{" "}
                              · {preset.form.format} · saved {preset.savedAt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => loadPreset(preset)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePreset(preset.id)}
                              title="Delete template"
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={generate}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content Calendar
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {generated && calendar.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                      Your {form.timeframe}-Day Calendar —{" "}
                      {filterTopic === "all" ? (
                        <>{calendar.length} pieces of content</>
                      ) : (
                        <>{filteredCalendar.length} of {calendar.length} pieces · <span className="text-indigo-500">{filterTopic}</span></>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {archetypesUsed} distinct headline archetypes ·{" "}
                      {new Set(calendar.map((e) => e.topic)).size} topics ·{" "}
                      zero duplicate titles
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={sortByPriority ? "default" : "outline"}
                      onClick={() => setSortByPriority((p) => !p)}
                      className={`gap-1.5 ${sortByPriority ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white" : ""}`}
                      title={sortByPriority ? "Switch to date order" : "Sort by SEO priority score"}
                    >
                      {sortByPriority ? (
                        <>
                          <ArrowDownUp className="w-4 h-4" />
                          By Priority
                        </>
                      ) : (
                        <>
                          <CalendarClock className="w-4 h-4" />
                          By Date
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={showHeatmap ? "default" : "outline"}
                      onClick={() => setShowHeatmap((h) => !h)}
                      className={`gap-1.5 ${showHeatmap ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white" : ""}`}
                      title="Toggle priority heatmap — see gaps and high-value slots at a glance"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Heatmap
                    </Button>
                    <Button
                      size="sm"
                      variant={sprintMode ? "default" : "outline"}
                      onClick={() => {
                        setSprintMode((m) => !m);
                        setSprintWeek(null);
                      }}
                      className={`gap-1.5 ${sprintMode ? "bg-orange-500 hover:bg-orange-600 border-orange-500 text-white" : "border-orange-200 text-orange-600 hover:bg-orange-50"}`}
                      title="Sprint Planner — reassign entries to weeks and track capacity"
                    >
                      📋 Sprint
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyAsText}
                      className="gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyAsNotion}
                      className="gap-1.5"
                      title="Copies a markdown table to your clipboard — open Notion, create a new page, then press Ctrl+V (or Cmd+V) to paste"
                    >
                      {copiedNotion ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied! Now paste in Notion
                        </>
                      ) : (
                        <>
                          <Table2 className="w-4 h-4" />
                          Copy for Notion
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportCSV(calendar, form.companyName)}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportAllBriefs}
                      className="gap-1.5"
                      title="Download all editorial briefs as a single Notion-ready markdown file"
                    >
                      <FileText className="w-4 h-4" />
                      Export Briefs
                    </Button>
                    {(() => {
                      const qCount = calendar.filter((e) => {
                        const s = entryStatuses[entryKey(e)] ?? "not-started";
                        return s === "published" || s === "review";
                      }).length;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={exportPublishQueue}
                          disabled={qCount === 0}
                          title={
                            qCount === 0
                              ? "Mark entries as 'In Review' or 'Published' in the tracker to build the queue"
                              : `Export ${qCount} queued ${qCount === 1 ? "entry" : "entries"} to CSV`
                          }
                          className={`gap-1.5 ${qCount > 0 ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}`}
                        >
                          <Download className="w-4 h-4" />
                          Publish Queue
                          {qCount > 0 && (
                            <span className="ml-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {qCount}
                            </span>
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>

                {/* Topic filter bar — only shown when the calendar covers multiple topics */}
                {calendarTopics.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 mr-0.5">
                      Topic:
                    </span>
                    <button
                      onClick={() => setFilterTopic("all")}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                        filterTopic === "all"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      All
                    </button>
                    {calendarTopics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterTopic(filterTopic === t ? "all" : t)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                          filterTopic === t
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Sprint Planner Board ────────────────────────────────── */}
                {sprintMode && (() => {
                  const target = CADENCE_POSTS_PER_WEEK[form.cadence];
                  const weeks  = [...new Set(calendar.map((e) => e.week))].sort((a, b) => a - b);
                  return (
                    <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50/80 border-b border-orange-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm leading-none">📋</span>
                          <span className="text-[11px] font-bold text-slate-700">Sprint Planner</span>
                          <span className="text-[9.5px] text-slate-400">
                            — select a week, then click entries below to assign them
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {Object.keys(sprintAssignments).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSprintAssignments({})}
                              className="text-[9px] text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              ↺ reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setSprintMode(false); setSprintWeek(null); }}
                            className="text-[9px] font-semibold text-orange-600 hover:text-orange-800 transition-colors"
                          >
                            Exit ✕
                          </button>
                        </div>
                      </div>

                      {/* Week columns */}
                      <div className="overflow-x-auto px-4 pt-3 pb-1">
                        <div className="flex gap-2.5 min-w-max">
                          {weeks.map((wk) => {
                            const assigned = calendar.filter(
                              (e) => (sprintAssignments[entryKey(e)] ?? e.week) === wk,
                            );
                            const count     = assigned.length;
                            const isOver    = count > target;
                            const isFull    = count === target;
                            const isSelected   = sprintWeek === wk;
                            const isCapWarn    = sprintCapacityWarn === wk;
                            const barColor     = isOver || isCapWarn ? "bg-rose-500" : isFull ? "bg-amber-400" : "bg-orange-400";
                            const countBadge   = isOver || isCapWarn
                              ? "bg-rose-100 text-rose-700"
                              : isFull ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
                            return (
                              <button
                                key={wk}
                                type="button"
                                onClick={() => setSprintWeek(isSelected ? null : wk)}
                                className={`flex flex-col items-start w-40 shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all ${
                                  isSelected
                                    ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300 shadow-sm"
                                    : isCapWarn
                                      ? "border-rose-300 bg-rose-50"
                                      : "border-slate-100 bg-slate-50/60 hover:border-orange-200 hover:bg-orange-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1.5">
                                  <span className={`text-[10px] font-bold ${isSelected ? "text-orange-700" : "text-slate-600"}`}>
                                    {isSelected && "▶ "}Wk {wk}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${countBadge}`}>
                                    {count}/{target}
                                  </span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden mb-2">
                                  <div
                                    className={`h-full rounded-full transition-all ${barColor}`}
                                    style={{ width: `${Math.min(100, (count / target) * 100)}%` }}
                                  />
                                </div>
                                {isCapWarn && (
                                  <p className="text-[8.5px] font-semibold text-rose-600 mb-1">
                                    ⚠ Week at capacity
                                  </p>
                                )}
                                <div className="space-y-1 w-full">
                                  {assigned.slice(0, 5).map((e) => (
                                    <div
                                      key={entryKey(e)}
                                      className={`text-[8.5px] leading-snug text-slate-600 pl-1.5 border-l-2 ${sprintAssignments[entryKey(e)] !== undefined ? "border-orange-400 font-semibold text-orange-700" : "border-slate-200"}`}
                                    >
                                      {e.angle.length > 36 ? e.angle.substring(0, 36) + "…" : e.angle}
                                    </div>
                                  ))}
                                  {assigned.length > 5 && (
                                    <p className="text-[8px] text-slate-400">
                                      +{assigned.length - 5} more
                                    </p>
                                  )}
                                  {assigned.length === 0 && (
                                    <p className="text-[8.5px] text-slate-400 italic">
                                      Empty — assign entries here
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active week hint */}
                      <div className="px-4 py-2.5">
                        {sprintWeek !== null ? (
                          <p className="text-[9.5px] font-semibold text-orange-700">
                            ▶ Week {sprintWeek} selected — click any entry's "➜ Wk {sprintWeek}" button to assign it. Click again to remove.
                          </p>
                        ) : (
                          <p className="text-[9.5px] text-slate-400">
                            Click a week column to select it as your sprint target, then assign entries from the calendar below.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Content Velocity Tracker ────────────────────────────── */}
                {(() => {
                  const statusOrder: ContentStatus[] = [
                    "not-started", "writing", "review", "published",
                  ];
                  const statusCounts: Record<ContentStatus, number> = {
                    "not-started": 0, writing: 0, review: 0, published: 0,
                  };
                  for (const e of calendar) {
                    const s: ContentStatus =
                      entryStatuses[entryKey(e)] ?? "not-started";
                    statusCounts[s]++;
                  }
                  const total = calendar.length;
                  const publishedPct =
                    total > 0
                      ? Math.round((statusCounts.published / total) * 100)
                      : 0;
                  const inProgressCount =
                    statusCounts.writing + statusCounts.review;
                  const hasAnyStatus =
                    Object.keys(entryStatuses).length > 0;
                  const weeks = [
                    ...new Set(calendar.map((e) => e.week)),
                  ].sort((a, b) => a - b);
                  return (
                    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700">
                            Production Tracker
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            — click a status on any entry to advance it
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {publishedPct > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {publishedPct}% published
                            </span>
                          )}
                          {inProgressCount > 0 && (
                            <span className="text-[10px] font-semibold text-amber-600">
                              {inProgressCount} in progress
                            </span>
                          )}
                          {hasAnyStatus && (
                            <button
                              type="button"
                              onClick={resetStatuses}
                              className="text-[9px] text-slate-400 hover:text-rose-500 transition-colors ml-1"
                              title="Reset all statuses"
                            >
                              ↺ reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status pills + bar */}
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                        {statusOrder.map((s) => {
                          const cfg = STATUS_CONFIG[s];
                          return (
                            <div
                              key={s}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border}`}
                            >
                              <span className={`text-[11px] ${cfg.text}`}>
                                {cfg.icon}
                              </span>
                              <span
                                className={`text-[10px] font-semibold ${cfg.text}`}
                              >
                                {cfg.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold tabular-nums ${cfg.text} ml-0.5`}
                              >
                                {statusCounts[s]}
                              </span>
                            </div>
                          );
                        })}
                        {/* Segmented progress bar */}
                        <div className="flex-1 min-w-[100px] h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                          {(
                            [
                              { s: "writing"  as ContentStatus, c: "bg-blue-400"    },
                              { s: "review"   as ContentStatus, c: "bg-amber-400"   },
                              { s: "published"as ContentStatus, c: "bg-emerald-500" },
                            ] as { s: ContentStatus; c: string }[]
                          ).map(({ s, c }) => (
                            <div
                              key={s}
                              className={`h-full ${c} transition-all duration-500`}
                              style={{
                                width: `${total > 0 ? (statusCounts[s] / total) * 100 : 0}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Per-week mini pipeline — only once statuses are set */}
                      {hasAnyStatus && (
                        <div className="px-4 pb-3 pt-0">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Week pipeline
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {weeks.map((wk) => {
                              const we = calendar.filter(
                                (e) => e.week === wk,
                              );
                              const wc: Record<ContentStatus, number> = {
                                "not-started": 0, writing: 0, review: 0, published: 0,
                              };
                              for (const e of we) {
                                wc[entryStatuses[entryKey(e)] ?? "not-started"]++;
                              }
                              const wTotal = we.length;
                              const wDone  = wc.published;
                              const allPub = wDone === wTotal;
                              return (
                                <div
                                  key={wk}
                                  className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border min-w-[52px] ${allPub ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"}`}
                                >
                                  <span className={`text-[9px] font-bold mb-1 ${allPub ? "text-emerald-700" : "text-slate-500"}`}>
                                    Wk {wk}
                                  </span>
                                  <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden flex mb-1">
                                    <div
                                      className="h-full bg-blue-400"
                                      style={{ width: `${wTotal > 0 ? (wc.writing / wTotal) * 100 : 0}%` }}
                                    />
                                    <div
                                      className="h-full bg-amber-400"
                                      style={{ width: `${wTotal > 0 ? (wc.review / wTotal) * 100 : 0}%` }}
                                    />
                                    <div
                                      className="h-full bg-emerald-500"
                                      style={{ width: `${wTotal > 0 ? (wDone / wTotal) * 100 : 0}%` }}
                                    />
                                  </div>
                                  <span className={`text-[9px] ${allPub ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                                    {wDone}/{wTotal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Topic Colour Legend ─────────────────────────────────── */}
                {topicLegend.length > 0 && (
                  <div
                    className={`grid gap-2 ${
                      topicLegend.length === 1
                        ? "grid-cols-1"
                        : topicLegend.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-2 sm:grid-cols-3"
                    }`}
                  >
                    {topicLegend.map(
                      ({ topic, pieces, avgPriority, topType, colorStyle }) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() =>
                            setFilterTopic(filterTopic === topic ? "all" : topic)
                          }
                          title={`Click to filter by ${topic}`}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all hover:shadow-sm"
                          style={{
                            backgroundColor: colorStyle.backgroundColor,
                            borderColor:
                              filterTopic === topic
                                ? colorStyle.color
                                : colorStyle.borderColor,
                            boxShadow:
                              filterTopic === topic
                                ? `0 0 0 2px ${colorStyle.borderColor}`
                                : undefined,
                          }}
                        >
                          {/* Color dot */}
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colorStyle.borderColor }}
                          />

                          {/* Topic name + top format */}
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[11px] font-bold leading-none truncate mb-0.5"
                              style={{ color: colorStyle.color }}
                            >
                              {topic}
                            </p>
                            <p
                              className="text-[9px] leading-none"
                              style={{ color: colorStyle.color, opacity: 0.65 }}
                            >
                              Top: {FORMAT_LABEL[topType]}
                            </p>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-center">
                              <p
                                className="text-[15px] font-bold leading-none"
                                style={{ color: colorStyle.color }}
                              >
                                {pieces}
                              </p>
                              <p
                                className="text-[8px] leading-none mt-0.5"
                                style={{ color: colorStyle.color, opacity: 0.55 }}
                              >
                                pieces
                              </p>
                            </div>
                            <div
                              className="w-px h-5 rounded-full opacity-20"
                              style={{ backgroundColor: colorStyle.color }}
                            />
                            <div className="text-center">
                              <p
                                className="text-[15px] font-bold leading-none"
                                style={{ color: colorStyle.color }}
                              >
                                {avgPriority}
                              </p>
                              <p
                                className="text-[8px] leading-none mt-0.5"
                                style={{ color: colorStyle.color, opacity: 0.55 }}
                              >
                                avg pri.
                              </p>
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}

                {/* Calendar rows — date order, priority order, or heatmap */}
                {showHeatmap ? (
                  /* ── Priority Heatmap ─────────────────────────────────── */
                  <div className="space-y-3">
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                        Priority Score
                      </span>
                      {[
                        { bg: "bg-slate-50 border-dashed border-slate-200", label: "Gap" },
                        { bg: "bg-slate-100 border-slate-200",              label: "0–39" },
                        { bg: "bg-amber-100 border-amber-200",              label: "40–54" },
                        { bg: "bg-amber-300 border-amber-300",              label: "55–69" },
                        { bg: "bg-emerald-200 border-emerald-300",          label: "70–84" },
                        { bg: "bg-emerald-500 border-emerald-400",          label: "85–100" },
                      ].map(({ bg, label }) => (
                        <span key={label} className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded border inline-block ${bg}`} />
                          <span className="text-[10px] text-slate-500">{label}</span>
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-400">
                        · Click any cell to open the editorial brief
                      </span>
                    </div>

                    {/* ── Cadence velocity legend ───────────────────────── */}
                    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3">
                      {/* Key */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
                          Weekly Cadence Load
                        </span>
                        {(
                          [
                            { dot: "bg-emerald-500", label: "Optimal" },
                            { dot: "bg-amber-400",   label: "Underloaded" },
                            { dot: "bg-rose-500",    label: "Overloaded" },
                            { dot: "bg-slate-300",   label: "Empty" },
                          ] as const
                        ).map(({ dot, label }) => (
                          <span key={label} className="flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full inline-block ${dot}`}
                            />
                            <span className="text-[10px] text-slate-500">
                              {label}
                            </span>
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          Target:{" "}
                          <span className="font-semibold text-slate-600">
                            {CADENCE_POSTS_PER_WEEK[form.cadence]}
                          </span>{" "}
                          piece
                          {CADENCE_POSTS_PER_WEEK[form.cadence] !== 1
                            ? "s"
                            : ""}
                          /week
                        </span>
                      </div>

                      {/* Per-week dots */}
                      {(() => {
                        const target = CADENCE_POSTS_PER_WEEK[form.cadence];
                        const weeks = [
                          ...new Set(filteredCalendar.map((e) => e.week)),
                        ].sort((a, b) => a - b);
                        type LoadStatus = "optimal" | "over" | "under" | "empty";
                        const weekLoads = weeks.map((week) => {
                          const count = filteredCalendar.filter(
                            (e) => e.week === week,
                          ).length;
                          const status: LoadStatus =
                            count === 0
                              ? "empty"
                              : count < target
                                ? "under"
                                : count > target
                                  ? "over"
                                  : "optimal";
                          return { week, count, status };
                        });
                        const statusStyles: Record<
                          LoadStatus,
                          { dot: string; text: string; bg: string }
                        > = {
                          optimal: {
                            dot: "bg-emerald-500",
                            text: "text-emerald-700",
                            bg: "bg-emerald-50 border-emerald-200",
                          },
                          over: {
                            dot: "bg-rose-500",
                            text: "text-rose-700",
                            bg: "bg-rose-50 border-rose-200",
                          },
                          under: {
                            dot: "bg-amber-400",
                            text: "text-amber-700",
                            bg: "bg-amber-50 border-amber-200",
                          },
                          empty: {
                            dot: "bg-slate-300",
                            text: "text-slate-400",
                            bg: "bg-slate-50 border-slate-200",
                          },
                        };
                        const optCount = weekLoads.filter(
                          (w) => w.status === "optimal",
                        ).length;
                        const overCount = weekLoads.filter(
                          (w) => w.status === "over",
                        ).length;
                        const underCount = weekLoads.filter(
                          (w) => w.status === "under",
                        ).length;
                        return (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {weekLoads.map(({ week, count, status }) => {
                                const s = statusStyles[status];
                                return (
                                  <div
                                    key={week}
                                    className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${s.bg}`}
                                    title={`Week ${week}: ${count} piece${count !== 1 ? "s" : ""} scheduled (target ${target})`}
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full mb-0.5 ${s.dot}`}
                                    />
                                    <span
                                      className={`text-[9px] font-bold leading-none ${s.text}`}
                                    >
                                      W{week}
                                    </span>
                                    <span
                                      className={`text-[9px] leading-none mt-0.5 ${s.text} opacity-75`}
                                    >
                                      {count}/{target}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              {optCount > 0 && (
                                <span className="text-emerald-600 font-semibold">
                                  {optCount} week
                                  {optCount !== 1 ? "s" : ""} at target
                                </span>
                              )}
                              {optCount > 0 && overCount + underCount > 0
                                ? " · "
                                : ""}
                              {overCount > 0 && (
                                <span className="text-rose-600 font-semibold">
                                  {overCount} overloaded
                                </span>
                              )}
                              {overCount > 0 && underCount > 0 ? " · " : ""}
                              {underCount > 0 && (
                                <span className="text-amber-600 font-semibold">
                                  {underCount} underloaded
                                </span>
                              )}
                              {overCount + underCount > 0
                                ? " — adjust cadence or add topics to rebalance production load."
                                : optCount > 0
                                  ? " — production load is perfectly balanced."
                                  : ""}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Grid */}
                    <div className="overflow-x-auto rounded-lg border border-slate-100 shadow-sm">
                      {(() => {
                        const heatTypes: ContentType[] = [
                          "blog", "guide", "roundup", "case-study", "linkedin",
                        ];
                        const weeks = [
                          ...new Set(filteredCalendar.map((e) => e.week)),
                        ].sort((a, b) => a - b);
                        const cellEntries = (type: ContentType, week: number) =>
                          filteredCalendar.filter(
                            (e) => e.type === type && e.week === week,
                          );
                        const cellStyle = (entries: CalendarEntry[]) => {
                          if (!entries.length)
                            return {
                              bg: "bg-slate-50",
                              border: "border-dashed border-slate-200",
                              text: "text-slate-300",
                            };
                          const s = Math.max(
                            ...entries.map((e) => e.priorityScore),
                          );
                          if (s >= 85)
                            return { bg: "bg-emerald-500", border: "border-transparent", text: "text-white" };
                          if (s >= 70)
                            return { bg: "bg-emerald-200", border: "border-transparent", text: "text-emerald-900" };
                          if (s >= 55)
                            return { bg: "bg-amber-300",   border: "border-transparent", text: "text-amber-900" };
                          if (s >= 40)
                            return { bg: "bg-amber-100",   border: "border-transparent", text: "text-amber-800" };
                          return { bg: "bg-slate-100", border: "border-transparent", text: "text-slate-600" };
                        };
                        return (
                          <table className="w-full border-collapse bg-white">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="text-[10px] font-semibold text-slate-400 text-left px-4 py-3 w-28 whitespace-nowrap">
                                  Format
                                </th>
                                {weeks.map((w) => (
                                  <th
                                    key={w}
                                    className="text-[10px] font-semibold text-slate-400 text-center px-2 py-3 whitespace-nowrap"
                                  >
                                    Week {w}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {heatTypes.map((type, ri) => (
                                <tr
                                  key={type}
                                  className={
                                    ri < heatTypes.length - 1
                                      ? "border-b border-slate-100"
                                      : ""
                                  }
                                >
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${TYPE_COLOR[type]}`}
                                    >
                                      {FORMAT_LABEL[type]}
                                    </span>
                                  </td>
                                  {weeks.map((week) => {
                                    const entries = cellEntries(type, week);
                                    const { bg, border, text } = cellStyle(entries);
                                    const top = [...entries].sort(
                                      (a, b) => b.priorityScore - a.priorityScore,
                                    )[0];
                                    return (
                                      <td key={week} className="px-1.5 py-2">
                                        <div
                                          className={`rounded-lg border ${border} ${bg} h-14 flex flex-col items-center justify-center transition-opacity ${entries.length ? "cursor-pointer hover:opacity-75" : ""}`}
                                          style={{ minWidth: "58px" }}
                                          onClick={() =>
                                            top && setBriefEntry(top)
                                          }
                                          title={
                                            top
                                              ? `${top.angle} — Priority ${top.priorityScore}/100. Click to open brief.`
                                              : "No content scheduled this week"
                                          }
                                        >
                                          {entries.length === 0 ? (
                                            <span
                                              className={`text-xl font-light ${text}`}
                                            >
                                              —
                                            </span>
                                          ) : (
                                            <>
                                              <span
                                                className={`text-base font-bold leading-none ${text}`}
                                              >
                                                {Math.max(
                                                  ...entries.map(
                                                    (e) => e.priorityScore,
                                                  ),
                                                )}
                                              </span>
                                              <span
                                                className={`text-[9px] mt-0.5 leading-tight text-center px-1 ${text} opacity-80`}
                                              >
                                                {entries.length > 1
                                                  ? `${entries.length} posts`
                                                  : entries[0].topic
                                                      .split(" ")
                                                      .slice(0, 2)
                                                      .join(" ")}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                ) : sortByPriority ? (
                  /* ── Priority-sorted flat list ─────────────────────────── */
                  <div>
                    <p className="text-[10px] text-muted-foreground px-1 mb-2">
                      {filterTopic === "all"
                        ? `Showing all ${filteredCalendar.length} pieces ranked highest → lowest SEO opportunity.`
                        : `Showing ${filteredCalendar.length} pieces for "${filterTopic}", ranked highest → lowest.`}{" "}
                      Toggle back to restore date order.
                    </p>
                    <Card className="border border-emerald-100 shadow-sm overflow-hidden">
                      <div className="divide-y divide-slate-50">
                        {filteredPrioritySorted.map((entry, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.025 }}
                            className="grid grid-cols-[auto_auto_1fr_auto] gap-4 items-start px-5 py-4 hover:bg-slate-50/60 transition-colors"
                          >
                            {/* Rank */}
                            <div className="pt-0.5 min-w-[28px] text-right">
                              <span className="text-[11px] font-bold text-slate-400">
                                #{i + 1}
                              </span>
                            </div>
                            {/* Priority score badge — prominent in this view */}
                            <div className="pt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${priorityStyle(entry.priorityScore)}`}
                                title={`Priority score: ${entry.priorityScore}/100 — ${priorityLabel(entry.priorityScore)}`}
                              >
                                {priorityEmoji(entry.priorityScore)}
                                <span>{entry.priorityScore}</span>
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900 leading-snug">
                                {entry.angle}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-[10px] text-slate-400">
                                  Wk {entry.week} · {entry.date}
                                </span>
                                <span className="text-muted-foreground text-[10px]">·</span>
                                <span
                                  className={`text-[10px] font-semibold ${ARCHETYPE_COLOR[entry.archetype] ?? "text-slate-400"}`}
                                >
                                  {entry.archetype}
                                </span>
                                <span className="text-muted-foreground text-[10px]">·</span>
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                                  style={topicColorStyle(entry.topic, form.topics)}
                                >
                                  {entry.topic}
                                </span>
                                <span className="text-muted-foreground text-[10px]">·</span>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_STYLE[getSearchVolume(entry.topic).tier]}`}
                                  title="Estimated monthly search volume"
                                >
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  {entry.searchVolume}
                                </span>
                                <span className="text-muted-foreground text-[10px]">·</span>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${kdStyle(entry.topicDifficulty)}`}
                                  title={`Topic difficulty: ${kdLabel(entry.topicDifficulty)}`}
                                >
                                  KD {entry.topicDifficulty}
                                </span>
                                <span className="text-muted-foreground text-[10px]">·</span>
                                <span className="text-xs text-muted-foreground">
                                  CTA:{" "}
                                  <span className="font-medium text-slate-600">
                                    {entry.cta}
                                  </span>
                                </span>
                              </div>
                              <PublishChecklist
                                entryKey={entryKey(entry)}
                                type={entry.type}
                                checked={checkedItems[entryKey(entry)] ?? []}
                                isExpanded={expandedChecklists.has(entryKey(entry))}
                                onToggleItem={toggleChecklistItem}
                                onToggleExpand={toggleChecklistExpanded}
                              />
                            </div>
                            <div className="pt-0.5 flex flex-col items-end gap-1.5">
                              <span
                                className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}
                              >
                                {FORMAT_LABEL[entry.type]}
                              </span>
                              <button
                                onClick={() => setBriefEntry(entry)}
                                title="Generate Content Brief"
                                className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                              >
                                <FileText className="w-3 h-3" />
                                Brief
                              </button>
                              {(() => {
                                const k   = entryKey(entry);
                                const s   = entryStatuses[k] ?? "not-started";
                                const cfg = STATUS_CONFIG[s];
                                return (
                                  <button
                                    type="button"
                                    onClick={() => cycleStatus(k)}
                                    title="Click to advance production status"
                                    className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`}
                                  >
                                    {cfg.icon} {cfg.label}
                                  </button>
                                );
                              })()}
                              {sprintMode && sprintWeek !== null && (() => {
                                const k          = entryKey(entry);
                                const isAssigned = sprintAssignments[k] === sprintWeek;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => assignToSprint(k)}
                                    title={isAssigned ? `Remove from Wk ${sprintWeek}` : `Assign to Wk ${sprintWeek}`}
                                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                                      isAssigned
                                        ? "bg-orange-100 text-orange-700 border-orange-300 hover:opacity-80"
                                        : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                    }`}
                                  >
                                    {isAssigned ? `✓ Wk ${sprintWeek}` : `➜ Wk ${sprintWeek}`}
                                  </button>
                                );
                              })()}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : (
                  /* ── Date-ordered week groups (default) ───────────────── */
                  <>
                    {Object.entries(filteredGroupedByWeek).map(([week, entries]) => (
                      <div key={week}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                          Week {week}
                        </p>
                        <Card className="border border-slate-100 shadow-sm overflow-hidden">
                          <div className="divide-y divide-slate-50">
                            {entries.map((entry, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.04 }}
                                className="grid grid-cols-[auto_1fr_auto] gap-4 items-start px-5 py-4 hover:bg-slate-50/60 transition-colors"
                              >
                                <div className="min-w-[80px] pt-0.5">
                                  <span className="text-xs font-semibold text-slate-500">
                                    {entry.date}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                                    {entry.angle}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span
                                      className={`text-[10px] font-semibold ${ARCHETYPE_COLOR[entry.archetype] ?? "text-slate-400"}`}
                                    >
                                      {entry.archetype}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span
                                      className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                        entry.searchIntent === "SEO Intent"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-orange-50 text-orange-600 border-orange-200"
                                      }`}
                                    >
                                      {entry.searchIntent === "SEO Intent" ? "📈 SEO Intent" : "💬 Engagement Intent"}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                                      style={topicColorStyle(entry.topic, form.topics)}
                                    >
                                      {entry.topic}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_STYLE[getSearchVolume(entry.topic).tier]}`}
                                      title="Estimated monthly search volume"
                                    >
                                      <TrendingUp className="w-2.5 h-2.5" />
                                      {entry.searchVolume}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${kdStyle(entry.topicDifficulty)}`}
                                      title={`Topic difficulty: ${kdLabel(entry.topicDifficulty)}`}
                                    >
                                      KD {entry.topicDifficulty}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${priorityStyle(entry.priorityScore)}`}
                                      title={`Priority score: ${entry.priorityScore}/100 — ${priorityLabel(entry.priorityScore)}`}
                                    >
                                      {priorityEmoji(entry.priorityScore)} {entry.priorityScore}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span className="text-xs text-muted-foreground">
                                      CTA:{" "}
                                      <span className="font-medium text-slate-600">
                                        {entry.cta}
                                      </span>
                                    </span>
                                  </div>
                                  <PublishChecklist
                                    entryKey={entryKey(entry)}
                                    type={entry.type}
                                    checked={checkedItems[entryKey(entry)] ?? []}
                                    isExpanded={expandedChecklists.has(entryKey(entry))}
                                    onToggleItem={toggleChecklistItem}
                                    onToggleExpand={toggleChecklistExpanded}
                                  />
                                </div>
                                <div className="pt-0.5 flex flex-col items-end gap-1.5">
                                  <span
                                    className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}
                                  >
                                    {FORMAT_LABEL[entry.type]}
                                  </span>
                                  <button
                                    onClick={() => setBriefEntry(entry)}
                                    title="Generate Content Brief"
                                    className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Brief
                                  </button>
                                  {(() => {
                                    const k   = entryKey(entry);
                                    const s   = entryStatuses[k] ?? "not-started";
                                    const cfg = STATUS_CONFIG[s];
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => cycleStatus(k)}
                                        title="Click to advance production status"
                                        className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`}
                                      >
                                        {cfg.icon} {cfg.label}
                                      </button>
                                    );
                                  })()}
                                  {sprintMode && sprintWeek !== null && (() => {
                                    const k          = entryKey(entry);
                                    const isAssigned = sprintAssignments[k] === sprintWeek;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => assignToSprint(k)}
                                        title={isAssigned ? `Remove from Wk ${sprintWeek}` : `Assign to Wk ${sprintWeek}`}
                                        className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                                          isAssigned
                                            ? "bg-orange-100 text-orange-700 border-orange-300 hover:opacity-80"
                                            : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                        }`}
                                      >
                                        {isAssigned ? `✓ Wk ${sprintWeek}` : `➜ Wk ${sprintWeek}`}
                                      </button>
                                    );
                                  })()}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </>
                )}

                {/* ── Strategy Summary ────────────────────────────────────── */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Strategy Summary
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* ── Content Type Breakdown ──────────────────────────────── */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Content Type Breakdown
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {calendar.length} pieces across {typeCounts.length} format
                          {typeCounts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* Rebalance quick-actions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                          Rebalance:
                        </span>
                        <button
                          onClick={() => rebalance("blog")}
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                            form.format === "blog"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          }`}
                          title="Regenerate as blog-only"
                        >
                          Blog-Heavy
                        </button>
                        <button
                          onClick={() => rebalance("mixed")}
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                            form.format === "mixed"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                          title="Regenerate as balanced blog + LinkedIn mix"
                        >
                          Balanced
                        </button>
                        <button
                          onClick={() => rebalance("linkedin")}
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                            form.format === "linkedin"
                              ? "bg-sky-500 text-white border-sky-500"
                              : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600"
                          }`}
                          title="Regenerate as LinkedIn-only"
                        >
                          LinkedIn-Heavy
                        </button>
                      </div>
                    </div>

                    {/* Stacked proportion bar */}
                    <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-px">
                      {typeCounts.map(({ type, pct }) => (
                        <div
                          key={type}
                          className={`${TYPE_BAR_COLOR[type]} transition-all first:rounded-l-full last:rounded-r-full`}
                          style={{ width: `${pct}%` }}
                          title={`${FORMAT_LABEL[type]}: ${pct}%`}
                        />
                      ))}
                    </div>

                    {/* Per-type detail rows */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                      {typeCounts.map(({ type, count, pct }) => (
                        <div key={type} className="flex items-center gap-2.5">
                          <div
                            className={`w-2 h-2 rounded-full ${TYPE_BAR_COLOR[type]} shrink-0`}
                          />
                          <span className="text-xs text-slate-600 flex-1 truncate">
                            {FORMAT_LABEL[type]}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                            {count}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${TYPE_BAR_COLOR[type]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                            {pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* ── Competitive Benchmark ───────────────────────────────── */}
                {benchmarkData.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                            Competitive Benchmark
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Your average SEO priority score vs. estimated niche
                            competitor average — top 3 highest-upside topics.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          Your Score vs. Market
                        </span>
                      </div>

                      <div className="flex flex-col gap-5">
                        {benchmarkData.map(
                          (
                            { topic, avgScore, industryAvg, nicheLabel, upside },
                            i,
                          ) => {
                            const upsideLabel =
                              upside >= 10
                                ? "🚀 Strong advantage"
                                : upside >= 1
                                  ? "📈 Above market"
                                  : upside >= -9
                                    ? "⚖️ On par"
                                    : "⚡ Competitive pressure";
                            const upsideColor =
                              upside >= 10
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : upside >= 1
                                  ? "text-blue-700 bg-blue-50 border-blue-200"
                                  : upside >= -9
                                    ? "text-amber-700 bg-amber-50 border-amber-200"
                                    : "text-rose-700 bg-rose-50 border-rose-200";
                            const barColor =
                              upside >= 0 ? "bg-indigo-500" : "bg-slate-400";

                            return (
                              <div key={i} className="space-y-2">
                                {/* Topic + badge */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-slate-800 truncate">
                                      {topic}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {nicheLabel} niche
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${upsideColor}`}
                                  >
                                    {upsideLabel}
                                  </span>
                                </div>

                                {/* Dual comparison bars */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 w-[4.5rem] shrink-0">
                                      Your avg
                                    </span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${barColor} transition-all`}
                                        style={{ width: `${avgScore}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 tabular-nums w-6 text-right">
                                      {avgScore}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 w-[4.5rem] shrink-0">
                                      Niche avg
                                    </span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-slate-300"
                                        style={{ width: `${industryAvg}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums w-6 text-right">
                                      {industryAvg}
                                    </span>
                                  </div>
                                </div>

                                {/* Interpretation line */}
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {upside >= 0
                                    ? `+${upside} pts above the ${nicheLabel} average — strong position to build authority and outrank competitors on this topic.`
                                    : `${upside} pts below the ${nicheLabel} average — prioritise differentiated, high-quality content to close the gap.`}
                                </p>

                                {i < benchmarkData.length - 1 && (
                                  <div className="border-b border-slate-100 pt-1" />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Content Velocity Planner ────────────────────────────── */}
                {velocityData.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
                            Content Velocity Planner
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Pieces per week needed to reach first-page authority
                            in each niche within your {form.timeframe}-day plan.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                            Target weekly output
                          </p>
                          <p className="text-xl font-bold text-indigo-600 leading-none">
                            {totalTargetRate}
                            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                              /wk
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Summary strip */}
                      <div className="grid grid-cols-3 gap-px mb-5 rounded-lg overflow-hidden border border-slate-100">
                        <div className="bg-slate-50 px-3 py-2.5 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                            Planned
                          </p>
                          <p className="text-[15px] font-bold text-slate-700 leading-none">
                            {totalCurrentRate}
                            <span className="text-[10px] font-normal ml-0.5">
                              /wk
                            </span>
                          </p>
                        </div>
                        <div className="bg-slate-50 px-3 py-2.5 text-center border-x border-slate-100">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                            Target
                          </p>
                          <p className="text-[15px] font-bold text-indigo-600 leading-none">
                            {totalTargetRate}
                            <span className="text-[10px] font-normal ml-0.5">
                              /wk
                            </span>
                          </p>
                        </div>
                        <div className="bg-slate-50 px-3 py-2.5 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                            Gap
                          </p>
                          <p
                            className={`text-[15px] font-bold leading-none ${
                              velocityGap > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {velocityGap > 0 ? `+${velocityGap}` : "✓"}
                            <span className="text-[10px] font-normal ml-0.5">
                              {velocityGap > 0 ? "/wk" : " on track"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Per-topic rows */}
                      <div className="flex flex-col gap-4">
                        {velocityData.map(
                          (
                            {
                              topic,
                              nicheLabel,
                              plannedCount,
                              authorityTarget,
                              remaining,
                              totalNeededRate,
                              progressPct,
                            },
                            i,
                          ) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold text-slate-800 truncate">
                                    {topic}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {nicheLabel} · {plannedCount} planned /{" "}
                                    {authorityTarget} needed for authority
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[11px] font-bold text-indigo-600 leading-none">
                                    {totalNeededRate}/wk
                                  </p>
                                  <p
                                    className={`text-[10px] mt-0.5 font-medium ${remaining === 0 ? "text-emerald-600" : "text-amber-600"}`}
                                  >
                                    {remaining === 0
                                      ? "✓ Covered"
                                      : `${remaining} more needed`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progressPct >= 100
                                        ? "bg-emerald-500"
                                        : "bg-indigo-400"
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 tabular-nums w-8 text-right">
                                  {progressPct}%
                                </span>
                              </div>
                              {i < velocityData.length - 1 && (
                                <div className="border-b border-slate-100 pt-1" />
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed border-t border-slate-100 pt-3">
                        Authority targets are calibrated by niche
                        competitiveness. To close a gap, increase your cadence
                        in the form above or extend your timeframe to 60 or 90
                        days.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* ── Pillar & Cluster Map ────────────────────────────────── */}
                {pillarMap.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                            Pillar & Cluster Map
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Your top {MAX_PILLARS} topic
                            {MAX_PILLARS !== 1 ? "s" : ""} act as content
                            pillars. Each cluster lists the supporting articles
                            planned beneath it.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          {MAX_PILLARS} pillar{MAX_PILLARS !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-col gap-6">
                        {pillarMap.map(
                          (
                            {
                              topic,
                              clusterEntries,
                              attachedTopics,
                              status,
                            },
                            i,
                          ) => {
                            const preview = clusterEntries.slice(0, 5);
                            const overflow =
                              clusterEntries.length - preview.length;
                            const typeBreakdown = (
                              Object.keys(FORMAT_LABEL) as ContentType[]
                            )
                              .map((t) => ({
                                t,
                                count: clusterEntries.filter(
                                  (e) => e.type === t,
                                ).length,
                              }))
                              .filter((x) => x.count > 0)
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 3);

                            return (
                              <div key={i} className="space-y-2.5">
                                {/* Pillar header row */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[12px] font-bold text-slate-800">
                                        {topic}
                                      </span>
                                      <span
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${status.color}`}
                                      >
                                        {status.icon} {status.label}
                                      </span>
                                    </div>
                                    {attachedTopics.length > 0 && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        + cluster:{" "}
                                        {attachedTopics.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[15px] font-bold text-slate-700 leading-none">
                                      {clusterEntries.length}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                      articles
                                    </p>
                                  </div>
                                </div>

                                {/* Type mini-breakdown pills */}
                                {typeBreakdown.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {typeBreakdown.map(({ t, count }) => (
                                      <span
                                        key={t}
                                        className="text-[9px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full"
                                      >
                                        {FORMAT_LABEL[t]} ×{count}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Cluster article list */}
                                {preview.length > 0 && (
                                  <div className="rounded-md border border-slate-100 overflow-hidden">
                                    {preview.map((e, j) => (
                                      <div
                                        key={j}
                                        className="flex items-start gap-2 px-3 py-2 border-b border-slate-50 last:border-0 bg-white hover:bg-slate-50 transition-colors"
                                      >
                                        <span className="shrink-0 mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 whitespace-nowrap">
                                          {FORMAT_LABEL[e.type]}
                                        </span>
                                        <p className="text-[11px] text-slate-700 leading-snug line-clamp-1">
                                          {e.angle}
                                        </p>
                                      </div>
                                    ))}
                                    {overflow > 0 && (
                                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                                        <p className="text-[10px] text-muted-foreground">
                                          + {overflow} more article
                                          {overflow !== 1 ? "s" : ""} in this
                                          cluster
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Warning if under-supported */}
                                {clusterEntries.length <
                                  CLUSTER_SUFFICIENCY_MIN && (
                                  <div className="flex items-start gap-1.5 p-2.5 rounded-md bg-amber-50 border border-amber-100">
                                    <span className="text-[12px] shrink-0 mt-0.5">
                                      ⚠️
                                    </span>
                                    <p className="text-[10px] text-amber-700 leading-relaxed">
                                      This pillar only has{" "}
                                      {clusterEntries.length} supporting
                                      article
                                      {clusterEntries.length !== 1 ? "s" : ""}.
                                      Aim for at least {CLUSTER_SUFFICIENCY_MIN}{" "}
                                      to build topical authority — use the
                                      Content Gap Finder below to identify what
                                      to add.
                                    </p>
                                  </div>
                                )}

                                {i < pillarMap.length - 1 && (
                                  <div className="border-b border-slate-100 pt-1" />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Distribution Channels Planner ───────────────────────── */}
                {channelBreakdown.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <ArrowDownUp className="w-3.5 h-3.5 text-indigo-500" />
                            Distribution Channels Planner
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Recommended promotion channels matched to your
                            content by type and archetype, with distribution
                            briefs.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          {channelBreakdown.length} channel
                          {channelBreakdown.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-col gap-5">
                        {channelBreakdown.map(
                          (
                            {
                              id,
                              label,
                              icon,
                              colorClasses,
                              barColor,
                              preview,
                              overflow,
                              pct,
                              tip,
                              matches,
                            },
                            i,
                          ) => (
                            <div key={id} className="space-y-2">
                              {/* Channel header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] leading-none">
                                    {icon}
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClasses}`}
                                  >
                                    {label}
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 tabular-nums shrink-0">
                                  {matches.length} piece
                                  {matches.length !== 1 ? "s" : ""}
                                </span>
                              </div>

                              {/* Coverage bar */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${barColor} transition-all`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                                  {pct}%
                                </span>
                              </div>

                              {/* Example entries */}
                              <div className="space-y-1">
                                {preview.map((e, j) => (
                                  <div
                                    key={j}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="shrink-0 mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 whitespace-nowrap">
                                      {FORMAT_LABEL[e.type]}
                                    </span>
                                    <p className="text-[11px] text-slate-700 leading-snug line-clamp-1">
                                      {e.angle}
                                    </p>
                                  </div>
                                ))}
                                {overflow > 0 && (
                                  <p className="text-[10px] text-muted-foreground pl-0.5">
                                    + {overflow} more piece
                                    {overflow !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>

                              {/* Distribution tip */}
                              <div className="flex items-start gap-1.5 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                                <span className="text-[11px] shrink-0 mt-0.5">
                                  💡
                                </span>
                                <p className="text-[10px] text-slate-600 leading-relaxed">
                                  {tip}
                                </p>
                              </div>

                              {i < channelBreakdown.length - 1 && (
                                <div className="border-b border-slate-100 pt-1" />
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Estimated Reach Calculator ──────────────────────────── */}
                {reachData.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            Estimated Reach Calculator
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Projected monthly audience potential by channel,
                            based on search volume tier and content mix.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          {form.timeframe}-day plan
                        </span>
                      </div>

                      {/* Aggregate 3-column metrics */}
                      <div className="grid grid-cols-3 gap-px mb-5 rounded-lg overflow-hidden border border-slate-100">
                        <div className="bg-slate-50 px-3 py-3 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Organic Readers
                          </p>
                          <p className="text-[17px] font-bold text-indigo-600 leading-none">
                            {totalOrganicReach.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            per month
                          </p>
                        </div>
                        <div className="bg-slate-50 px-3 py-3 text-center border-x border-slate-100">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            LinkedIn Impressions
                          </p>
                          <p className="text-[17px] font-bold text-blue-600 leading-none">
                            {totalLinkedInImpressions > 0
                              ? totalLinkedInImpressions.toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            per month
                          </p>
                        </div>
                        <div className="bg-slate-50 px-3 py-3 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Email Opens
                          </p>
                          <p className="text-[17px] font-bold text-purple-600 leading-none">
                            {totalEmailOpens.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            per 1K subscribers
                          </p>
                        </div>
                      </div>

                      {/* Per-topic breakdown */}
                      <div className="flex flex-col gap-3.5">
                        {reachData.map(
                          (
                            {
                              topic,
                              entryCount,
                              organicReach,
                              linkedInImpressions,
                              emailOpens,
                            },
                            i,
                          ) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-semibold text-slate-800 truncate min-w-0">
                                  {topic}
                                </p>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {entryCount} piece
                                  {entryCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center py-1.5 px-1 rounded-md bg-indigo-50">
                                  <p className="text-[11px] font-bold text-indigo-700 leading-none">
                                    {organicReach.toLocaleString()}
                                  </p>
                                  <p className="text-[9px] text-indigo-400 mt-0.5">
                                    organic/mo
                                  </p>
                                </div>
                                <div className="text-center py-1.5 px-1 rounded-md bg-blue-50">
                                  <p className="text-[11px] font-bold text-blue-700 leading-none">
                                    {linkedInImpressions > 0
                                      ? linkedInImpressions.toLocaleString()
                                      : "—"}
                                  </p>
                                  <p className="text-[9px] text-blue-400 mt-0.5">
                                    impressions
                                  </p>
                                </div>
                                <div className="text-center py-1.5 px-1 rounded-md bg-purple-50">
                                  <p className="text-[11px] font-bold text-purple-700 leading-none">
                                    {emailOpens.toLocaleString()}
                                  </p>
                                  <p className="text-[9px] text-purple-400 mt-0.5">
                                    opens/1K
                                  </p>
                                </div>
                              </div>
                              {i < reachData.length - 1 && (
                                <div className="border-b border-slate-100 pt-1" />
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed border-t border-slate-100 pt-3">
                        Organic estimates assume ~5% CTR from search ranking.
                        LinkedIn uses a 3,500 impressions/post baseline. Email
                        opens use a 21% open rate per send.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* ── Content ROI Estimator ───────────────────────────────── */}
                {roiData.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                            Content ROI Estimator
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Projected leads and pipeline value from your content
                            plan using industry-standard B2B funnel rates.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          {form.timeframe}-day plan
                        </span>
                      </div>

                      {/* Aggregate headline metrics */}
                      <div className="grid grid-cols-2 gap-px mb-5 rounded-lg overflow-hidden border border-slate-100">
                        <div className="bg-slate-50 px-4 py-3 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Total Leads Generated
                          </p>
                          <p className="text-[22px] font-bold text-indigo-600 leading-none">
                            {totalRoiLeads.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            across all channels
                          </p>
                        </div>
                        <div className="bg-emerald-50 px-4 py-3 text-center border-l border-slate-100">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Pipeline Value
                          </p>
                          <p className="text-[22px] font-bold text-emerald-600 leading-none">
                            ${totalRoiPipeline.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            estimated ARR potential
                          </p>
                        </div>
                      </div>

                      {/* Per-topic rows */}
                      <div className="flex flex-col gap-4">
                        {roiData.map(
                          (
                            {
                              topic,
                              entryCount,
                              organicLeads,
                              linkedInLeads,
                              emailLeads,
                              totalLeads,
                              pipeline,
                            },
                            i,
                          ) => {
                            const barPct = Math.round(
                              (pipeline / maxTopicPipeline) * 100,
                            );
                            return (
                              <div key={i} className="space-y-2">
                                {/* Topic + pipeline value */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-slate-800 truncate">
                                      {topic}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {entryCount} piece
                                      {entryCount !== 1 ? "s" : ""} ·{" "}
                                      {totalLeads} lead
                                      {totalLeads !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[13px] font-bold text-emerald-600 leading-none">
                                      ${pipeline.toLocaleString()}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                      pipeline
                                    </p>
                                  </div>
                                </div>

                                {/* Pipeline bar */}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-400 transition-all"
                                      style={{ width: `${barPct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                                    {barPct}%
                                  </span>
                                </div>

                                {/* Lead source breakdown */}
                                <div className="flex flex-wrap gap-1.5">
                                  {organicLeads > 0 && (
                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                      🔍 {organicLeads} organic
                                    </span>
                                  )}
                                  {linkedInLeads > 0 && (
                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                      💼 {linkedInLeads} LinkedIn
                                    </span>
                                  )}
                                  {emailLeads > 0 && (
                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                                      📧 {emailLeads} email
                                    </span>
                                  )}
                                </div>

                                {i < roiData.length - 1 && (
                                  <div className="border-b border-slate-100 pt-1" />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      {/* Assumptions footnote */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-500">
                          Conversion assumptions
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Organic 2% → lead · LinkedIn 0.5% · Email 3% · 25%
                          lead→opp · 20% close · $15K avg deal. Conservative
                          mid-market B2B SaaS benchmarks.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Publish-Ready Score ─────────────────────────────────── */}
                {publishReadyEntries.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-indigo-500" />
                            Publish-Ready Score
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Top 5 entries ranked by production readiness across
                            SEO, audience fit, distribution, archetype, and
                            priority.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          Top 5 of {calendar.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-5">
                        {publishReadyEntries.map(
                          ({ entry: e, scores }, i) => {
                            const { label, color } = publishReadyLabel(
                              scores.total,
                            );
                            const criteria = [
                              { key: "SEO",    val: scores.seo,          max: 20 },
                              { key: "Fit",    val: scores.audience,     max: 20 },
                              { key: "Reach",  val: scores.distribution, max: 20 },
                              { key: "Arc.",   val: scores.archetype,    max: 20 },
                              { key: "Pri.",   val: scores.priority,     max: 20 },
                            ];
                            return (
                              <div key={i} className="space-y-2">
                                {/* Entry header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">
                                      {e.angle}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                        {FORMAT_LABEL[e.type]}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground">
                                        Wk {e.week} · {e.topic}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    <p className="text-[20px] font-bold text-slate-800 leading-none">
                                      {scores.total}
                                    </p>
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${color}`}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                </div>

                                {/* 5 criteria mini-bars */}
                                <div className="grid grid-cols-5 gap-1.5">
                                  {criteria.map(({ key, val, max }) => (
                                    <div key={key} className="space-y-0.5">
                                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-indigo-400 transition-all"
                                          style={{
                                            width: `${(val / max) * 100}%`,
                                          }}
                                        />
                                      </div>
                                      <p className="text-[8px] text-center text-muted-foreground leading-none">
                                        {key}
                                      </p>
                                      <p className="text-[9px] text-center font-semibold text-slate-600 leading-none">
                                        {val}/{max}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                {i < publishReadyEntries.length - 1 && (
                                  <div className="border-b border-slate-100 pt-1" />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed border-t border-slate-100 pt-3">
                        Score = SEO readiness + audience fit + distribution
                        reach + archetype strength + priority. Max 100 — start
                        production with the highest scorers first.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* ── Editorial Complexity & Resource Estimate ─────────────── */}
                {calendar.length > 0 && (() => {
                  // Attach complexity + week number to each entry
                  const withCx = calendar.map((e) => ({
                    e,
                    cx: COMPLEXITY_BY_TYPE[e.type],
                  }));

                  // Week → total hours map
                  const weekHours: Record<number, number> = {};
                  for (const { e, cx } of withCx) {
                    weekHours[e.week] = (weekHours[e.week] ?? 0) + cx.hours;
                  }
                  const weeks       = Object.keys(weekHours).map(Number).sort((a, b) => a - b);
                  const totalHours  = Object.values(weekHours).reduce((s, h) => s + h, 0);
                  const avgPerWeek  = Math.round((totalHours / (weeks.length || 1)) * 10) / 10;
                  const maxWkHours  = Math.max(...Object.values(weekHours), 1);
                  const busiestWk   = weeks.reduce((a, b) => (weekHours[b] > weekHours[a] ? b : a), weeks[0]);
                  const overloaded  = weeks.filter((w) => weekHours[w] > 24);

                  // Top 5 heaviest entries
                  const heaviest = [...withCx].sort((a, b) => b.cx.hours - a.cx.hours).slice(0, 5);

                  const wkBar = (h: number) =>
                    h > 32 ? "bg-rose-400" : h > 20 ? "bg-amber-400" : h > 12 ? "bg-blue-400" : "bg-emerald-400";
                  const wkText = (h: number) =>
                    h > 32 ? "text-rose-700" : h > 20 ? "text-amber-700" : h > 12 ? "text-blue-600" : "text-emerald-700";

                  return (
                    <Card className="border border-orange-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">🏗️</span>
                            <p className="text-xs font-semibold text-slate-700">Editorial Complexity & Resource Estimate</p>
                          </div>
                          {overloaded.length > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              {overloaded.length} week{overloaded.length !== 1 ? "s" : ""} overloaded
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Workload balanced
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Estimated production hours per entry and week — flags weeks where the team will be overloaded before you lock the schedule.
                        </p>

                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[{ label: "Total hours",    val: `${totalHours}h` },
                            { label: "Avg / week",     val: `${avgPerWeek}h` },
                            { label: "Busiest week",   val: busiestWk != null ? `Wk ${busiestWk} · ${weekHours[busiestWk]}h` : "—" }]
                            .map(({ label, val }) => (
                              <div key={label} className="rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-2 text-center">
                                <p className="text-[8.5px] text-slate-400 mb-0.5">{label}</p>
                                <p className="text-[11px] font-black text-orange-700 leading-none">{val}</p>
                              </div>
                            ))}
                        </div>

                        {/* Week workload bars */}
                        <p className="text-[9.5px] font-semibold text-slate-600 mb-2">Weekly production load:</p>
                        <div className="flex items-end gap-1.5 mb-1">
                          {weeks.map((wk) => {
                            const h   = weekHours[wk];
                            const pct = Math.max(8, Math.round((h / Math.max(maxWkHours, 1)) * 100));
                            return (
                              <div key={wk} className="flex-1 flex flex-col items-center gap-0.5">
                                <span className={`text-[7.5px] font-bold tabular-nums ${wkText(h)}`}>{h}h</span>
                                <div className="w-full h-10 flex items-end bg-slate-100 rounded-sm overflow-hidden">
                                  <div className={`w-full rounded-sm ${wkBar(h)}`} style={{ height: `${pct}%` }} />
                                </div>
                                <span className="text-[7.5px] text-slate-400">Wk {wk}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-3 mb-4 mt-1">
                          {[{ label: "Manageable  ≤12h",  bg: "bg-emerald-400" },
                            { label: "Busy  13–20h",       bg: "bg-blue-400"    },
                            { label: "Heavy  21–32h",      bg: "bg-amber-400"   },
                            { label: "Overloaded  >32h",   bg: "bg-rose-400"    }]
                            .map((t) => (
                              <span key={t.label} className="text-[8px] text-slate-400 flex items-center gap-1">
                                <span className={`inline-block w-2 h-2 rounded-full ${t.bg}`} />
                                {t.label}
                              </span>
                            ))}
                        </div>

                        {/* Top 5 heaviest entries */}
                        <p className="text-[9.5px] font-semibold text-slate-600 mb-2">Highest-effort pieces:</p>
                        <div className="space-y-2.5">
                          {heaviest.map(({ e, cx }) => {
                            const tc = COMPLEXITY_TIER(cx.hours);
                            return (
                              <div key={entryKey(e)} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Entry header */}
                                <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2 bg-white border-b border-slate-100">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_COLOR[e.type]}`}>
                                        {FORMAT_LABEL[e.type]}
                                      </span>
                                      <span className="text-[8px] text-slate-400">Wk {e.week}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-snug">{e.angle}</p>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tc.bg} ${tc.text}`}>
                                    {cx.hours}h · {tc.label}
                                  </span>
                                </div>

                                {/* Stats row */}
                                <div className="px-3.5 py-2 flex flex-wrap gap-x-4 gap-y-1">
                                  {[{ icon: "📝", label: `~${cx.words.toLocaleString()} words` },
                                    { icon: "🎨", label: `${cx.assets} asset${cx.assets !== 1 ? "s" : ""}` },
                                    { icon: "✅", label: `${cx.approvals} approval round${cx.approvals !== 1 ? "s" : ""}` }]
                                    .map(({ icon, label }) => (
                                      <span key={label} className="text-[8.5px] text-slate-500">{icon} {label}</span>
                                    ))}
                                </div>

                                {/* Roles */}
                                <div className="px-3.5 pb-2 flex flex-wrap gap-1">
                                  {cx.roles.map((r) => (
                                    <span key={r} className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                                      {r}
                                    </span>
                                  ))}
                                </div>

                                {/* Efficiency tip */}
                                <div className="mx-3.5 mb-2.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100">
                                  <p className="text-[8.5px] text-orange-800 font-semibold mb-0.5">⚡ Efficiency tip</p>
                                  <p className="text-[9px] text-orange-900 leading-snug">{cx.tip}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Overloaded week callout */}
                        {overloaded.length > 0 && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100 mt-3">
                            <span className="text-sm shrink-0 leading-none mt-0.5">🚨</span>
                            <div>
                              <p className="text-[9px] font-bold text-rose-800">
                                {overloaded.length === 1 ? `Week ${overloaded[0]} is` : `Weeks ${overloaded.join(", ")} are`} overloaded
                              </p>
                              <p className="text-[8.5px] text-rose-700 mt-0.5">
                                These weeks exceed 32 production hours — redistribute heavy pieces to lighter weeks or increase team capacity before locking the schedule.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Lead Generation Potential Score ──────────────────────── */}
                {calendar.length > 0 && (() => {
                  const DIM_LG: { key: keyof ReturnType<typeof scoreLeadGen>; label: string; icon: string }[] = [
                    { key: "gate",       label: "Gate-ability",    icon: "🔒" },
                    { key: "cta",        label: "CTA Strength",    icon: "📣" },
                    { key: "funnel",     label: "Funnel Stage",    icon: "🎯" },
                    { key: "commercial", label: "Buyer Intent",    icon: "💰" },
                  ];

                  const scored = calendar.map((e) => ({ e, lg: scoreLeadGen(e.type, e.topic, e.angle) }));
                  scored.sort((a, b) => b.lg.total - a.lg.total);

                  const elite  = scored.filter((s) => s.lg.total >= 85);
                  const high   = scored.filter((s) => s.lg.total >= 70 && s.lg.total < 85);
                  const medium = scored.filter((s) => s.lg.total >= 50 && s.lg.total < 70);
                  const low    = scored.filter((s) => s.lg.total < 50);
                  const avgLG  = Math.round(scored.reduce((s, e) => s + e.lg.total, 0) / (scored.length || 1));
                  const top6   = scored.slice(0, 6);

                  const tierCfg = (v: number) =>
                    v >= 85 ? { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-400", label: "Elite"   }
                    : v >= 70 ? { bg: "bg-blue-100",   text: "text-blue-700",   bar: "bg-blue-400",   label: "High"    }
                    : v >= 50 ? { bg: "bg-amber-100",  text: "text-amber-700",  bar: "bg-amber-400",  label: "Medium"  }
                    :           { bg: "bg-rose-100",   text: "text-rose-700",   bar: "bg-rose-300",   label: "Low"     };
                  const dimBar = (v: number) =>
                    v >= 20 ? "bg-emerald-400" : v >= 12 ? "bg-blue-400" : v >= 7 ? "bg-amber-400" : "bg-rose-300";
                  const avgCfg = tierCfg(avgLG);

                  return (
                    <Card className="border border-emerald-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">💎</span>
                            <p className="text-xs font-semibold text-slate-700">Lead Generation Potential Score</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {elite.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                {elite.length} elite
                              </span>
                            )}
                            {low.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                {low.length} low potential
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Each entry rated on Gate-ability, CTA Strength, Funnel Stage & Buyer Intent (max 100) — top pieces to prioritise for promotion budget shown first.
                        </p>

                        {/* Average score */}
                        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border mb-4 ${avgCfg.bg}`}>
                          <div>
                            <p className="text-[9px] text-slate-500 mb-0.5">Portfolio Lead-Gen Score</p>
                            <p className={`text-lg font-black tabular-nums leading-none ${avgCfg.text}`}>
                              {avgLG}<span className="text-xs font-semibold opacity-60">/100</span>
                            </p>
                          </div>
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${avgCfg.bg} ${avgCfg.text}`}>
                            {avgCfg.label} potential
                          </span>
                        </div>

                        {/* Distribution bar */}
                        <div className="mb-4">
                          <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {low.length    > 0 && <div className="bg-rose-300"    style={{ width: `${(low.length    / scored.length) * 100}%` }} />}
                            {medium.length > 0 && <div className="bg-amber-400"   style={{ width: `${(medium.length / scored.length) * 100}%` }} />}
                            {high.length   > 0 && <div className="bg-blue-400"    style={{ width: `${(high.length   / scored.length) * 100}%` }} />}
                            {elite.length  > 0 && <div className="bg-emerald-400" style={{ width: `${(elite.length  / scored.length) * 100}%` }} />}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {[{ label: "Low",    bg: "bg-rose-300",    count: low.length    },
                              { label: "Medium", bg: "bg-amber-400",   count: medium.length },
                              { label: "High",   bg: "bg-blue-400",    count: high.length   },
                              { label: "Elite",  bg: "bg-emerald-400", count: elite.length  }]
                              .filter((t) => t.count > 0)
                              .map((t) => (
                                <span key={t.label} className="text-[8.5px] text-slate-400 flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${t.bg}`} />
                                  {t.label} ({t.count})
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Top 6 entries */}
                        <p className="text-[9.5px] font-semibold text-slate-600 mb-2">Top pieces to promote:</p>
                        <div className="space-y-3">
                          {top6.map(({ e, lg }, idx) => {
                            const tc = tierCfg(lg.total);
                            return (
                              <div key={entryKey(e)} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Entry header */}
                                <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2 bg-white border-b border-slate-100">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[8px] font-black text-slate-300">#{idx + 1}</span>
                                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_COLOR[e.type]}`}>
                                        {FORMAT_LABEL[e.type]}
                                      </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-snug">{e.angle}</p>
                                    <p className="text-[8.5px] text-slate-400 mt-0.5">{e.topic} · Wk {e.week}</p>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tc.bg} ${tc.text}`}>
                                    {lg.total} · {tc.label}
                                  </span>
                                </div>

                                {/* Dimension bars */}
                                <div className="px-3.5 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                  {DIM_LG.filter((d) => d.key !== "total").map(({ key, label, icon }) => (
                                    <div key={key}>
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[8.5px] text-slate-500">{icon} {label}</span>
                                        <span className="text-[8.5px] font-bold text-slate-600">{lg[key]}/25</span>
                                      </div>
                                      <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                                        <div className={`h-full rounded-full ${dimBar(lg[key])}`} style={{ width: `${(lg[key] / 25) * 100}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Promotion tip */}
                                <div className="mx-3.5 mb-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                  <p className="text-[8.5px] text-emerald-700 font-semibold mb-0.5">📣 Promotion strategy</p>
                                  <p className="text-[9px] text-emerald-900 leading-snug">{LEAD_PROMO_TIP[e.type]}</p>
                                </div>
                              </div>
                            );
                          })}
                          {scored.length > 6 && (
                            <p className="text-[9px] text-slate-400 text-center">
                              +{scored.length - 6} more entries · score them all by generating the calendar
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Content Velocity Tracker ─────────────────────────────── */}
                {calendar.length > 0 && (() => {
                  const getMonthKey = (date: string) => {
                    const d = new Date(date);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  };
                  const MO_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  const fmtMo = (key: string) => {
                    const [yr, mo] = key.split("-");
                    return `${MO_SHORT[parseInt(mo) - 1]} '${yr.slice(2)}`;
                  };

                  // Build type → month → count map
                  const typeMonthMap: Partial<Record<ContentType, Record<string, number>>> = {};
                  const monthSet = new Set<string>();
                  for (const e of calendar) {
                    const mk = getMonthKey(e.date);
                    monthSet.add(mk);
                    if (!typeMonthMap[e.type]) typeMonthMap[e.type] = {};
                    typeMonthMap[e.type]![mk] = (typeMonthMap[e.type]![mk] ?? 0) + 1;
                  }
                  const months       = [...monthSet].sort();
                  const typesPresent = [...new Set(calendar.map((e) => e.type))].sort();

                  // Velocity health score — % of (type × month) cells meeting min cadence
                  let cellsMet = 0, cellsTotal = 0;
                  for (const t of typesPresent) {
                    for (const mo of months) {
                      cellsTotal++;
                      if ((typeMonthMap[t]?.[mo] ?? 0) >= CADENCE_BY_TYPE[t].min) cellsMet++;
                    }
                  }
                  const velocityScore = Math.round((cellsMet / (cellsTotal || 1)) * 100);

                  // Slowest month — lowest total entries across all types
                  const monthTotals = months.map((mo) => ({
                    mo,
                    cnt: typesPresent.reduce((s, t) => s + (typeMonthMap[t]?.[mo] ?? 0), 0),
                  }));
                  const slowest = months.length > 1
                    ? monthTotals.reduce((a, b) => (b.cnt < a.cnt ? b : a))
                    : null;

                  const scoreCfg = (v: number) =>
                    v >= 80 ? { bg: "bg-emerald-50",  text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Strong" }
                    : v >= 60 ? { bg: "bg-blue-50",    text: "text-blue-700",    badge: "bg-blue-100 text-blue-700 border-blue-200",       label: "Healthy" }
                    : v >= 40 ? { bg: "bg-amber-50",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700 border-amber-200",    label: "Inconsistent" }
                    :           { bg: "bg-rose-50",    text: "text-rose-700",    badge: "bg-rose-100 text-rose-700 border-rose-200",       label: "Low" };
                  const sc = scoreCfg(velocityScore);

                  const velSt = (count: number, type: ContentType) => {
                    const { min, ideal } = CADENCE_BY_TYPE[type];
                    if (count === 0)        return { bar: "bg-rose-300",    text: "text-rose-500",    label: "None"     };
                    if (count >= ideal)     return { bar: "bg-emerald-400", text: "text-emerald-700", label: "On Track" };
                    if (count >= min)       return { bar: "bg-blue-400",    text: "text-blue-600",    label: "Healthy"  };
                    return                         { bar: "bg-amber-400",   text: "text-amber-600",   label: "Low"      };
                  };

                  return (
                    <Card className="border border-violet-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">⚡</span>
                            <p className="text-xs font-semibold text-slate-700">Content Velocity Tracker</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                            {cellsMet}/{cellsTotal} cadence targets met
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Monthly output per content type vs. recommended publishing cadence — bars turn amber when below the minimum needed to build algorithmic momentum.
                        </p>

                        {/* Velocity health score */}
                        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border mb-4 ${sc.bg}`}>
                          <div>
                            <p className="text-[9px] text-slate-500 mb-0.5">Velocity Health Score</p>
                            <p className={`text-lg font-black tabular-nums leading-none ${sc.text}`}>
                              {velocityScore}<span className="text-xs font-semibold opacity-60">%</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${sc.badge}`}>{sc.label}</span>
                            <p className="text-[8px] text-slate-400">of type×month cells</p>
                          </div>
                        </div>

                        {/* Per-type velocity rows */}
                        <div className="space-y-3 mb-4">
                          {typesPresent.map((type) => {
                            const { min, ideal, unit, rationale } = CADENCE_BY_TYPE[type];
                            const monthData   = months.map((mo) => ({ mo, count: typeMonthMap[type]?.[mo] ?? 0 }));
                            const totalCount  = monthData.reduce((s, m) => s + m.count, 0);
                            const avgPerMonth = months.length ? Math.round((totalCount / months.length) * 10) / 10 : 0;
                            const avgSt       = velSt(avgPerMonth, type);
                            const maxBarVal   = Math.max(ideal * 1.5, ...monthData.map((m) => m.count), 1);

                            return (
                              <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Row header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-white border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[type]}`}>
                                      {FORMAT_LABEL[type]}
                                    </span>
                                    <span className="text-[8.5px] text-slate-400">Target: {unit}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8.5px] text-slate-500">Avg {avgPerMonth}/mo</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${avgSt.bar === "bg-emerald-400" ? "bg-emerald-100 text-emerald-700" : avgSt.bar === "bg-blue-400" ? "bg-blue-100 text-blue-600" : avgSt.bar === "bg-amber-400" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-500"}`}>
                                      {avgSt.label}
                                    </span>
                                  </div>
                                </div>

                                {/* Monthly bar chart */}
                                <div className="px-3.5 pt-2.5 pb-2">
                                  <div className="flex items-end gap-1.5">
                                    {monthData.map(({ mo, count }) => {
                                      const st  = velSt(count, type);
                                      const pct = Math.max(6, Math.round((count / maxBarVal) * 100));
                                      return (
                                        <div key={mo} className="flex-1 flex flex-col items-center gap-0.5">
                                          <span className={`text-[8px] font-bold tabular-nums ${st.text}`}>{count}</span>
                                          <div className="w-full h-10 flex items-end bg-slate-100 rounded-sm overflow-hidden">
                                            <div className={`w-full rounded-sm transition-all ${st.bar}`} style={{ height: `${pct}%` }} />
                                          </div>
                                          <span className="text-[7.5px] text-slate-400 whitespace-nowrap">{fmtMo(mo)}</span>
                                        </div>
                                      );
                                    })}
                                    {/* Min reference */}
                                    <div className="flex flex-col items-center gap-0.5 shrink-0 w-6">
                                      <span className="text-[7px] font-bold text-violet-500">min</span>
                                      <div className="w-full h-10 flex flex-col justify-end">
                                        <div className="w-full border-t border-dashed border-violet-300" style={{ marginBottom: `${Math.max(0, Math.round((min / maxBarVal) * 100) - 4)}%` }} />
                                      </div>
                                      <span className="text-[7.5px] text-violet-400 font-semibold">{min}</span>
                                    </div>
                                  </div>
                                  <p className="text-[7.5px] text-slate-400 mt-1.5 italic leading-snug">{rationale}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Slowest month callout */}
                        {slowest && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-100">
                            <span className="text-sm shrink-0 leading-none mt-0.5">🐌</span>
                            <div>
                              <p className="text-[9px] font-bold text-violet-800">Slowest month: {fmtMo(slowest.mo)}</p>
                              <p className="text-[8.5px] text-violet-700 mt-0.5">
                                Only {slowest.cnt} {slowest.cnt === 1 ? "piece" : "pieces"} scheduled — consider redistributing content from busier months to maintain consistent publishing momentum and protect algorithmic ranking signals.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Distribution Channel Fit Analyser ───────────────────── */}
                {calendar.length > 0 && (() => {
                  // Count entries per content type
                  const typeCounts = calendar.reduce<Partial<Record<ContentType, number>>>(
                    (acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }),
                    {},
                  );
                  const typesPresent = (Object.entries(typeCounts) as [ContentType, number][])
                    .sort((a, b) => b[1] - a[1]);

                  const fitBar = (v: number) =>
                    v >= 85 ? "bg-emerald-400" : v >= 70 ? "bg-blue-400" : v >= 55 ? "bg-amber-400" : "bg-slate-300";
                  const fitText = (v: number) =>
                    v >= 85 ? "text-emerald-700" : v >= 70 ? "text-blue-600" : v >= 55 ? "text-amber-700" : "text-slate-500";

                  // Gap analysis: flag missing high-reach channel families
                  const presentTypeSet = new Set(typesPresent.map(([t]) => t));
                  const gaps: { channel: string; fix: string }[] = [];
                  if (!presentTypeSet.has("guide") && !presentTypeSet.has("blog-post"))
                    gaps.push({ channel: "Organic Search / SEO", fix: "Add a guide or blog post to capture high-intent search traffic" });
                  if (!presentTypeSet.has("newsletter"))
                    gaps.push({ channel: "Email Newsletter", fix: "Add a newsletter entry to nurture your existing subscriber base" });
                  if (!presentTypeSet.has("linkedin"))
                    gaps.push({ channel: "LinkedIn Organic", fix: "Add a native LinkedIn post for direct B2B decision-maker reach" });
                  if (!presentTypeSet.has("video-script") && !presentTypeSet.has("podcast"))
                    gaps.push({ channel: "Video / Audio", fix: "Add a video script or podcast episode to reach audiences who prefer audio-visual content" });

                  return (
                    <Card className="border border-teal-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">📡</span>
                            <p className="text-xs font-semibold text-slate-700">Distribution Channel Fit Analyser</p>
                          </div>
                          {gaps.length > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              {gaps.length} channel gap{gaps.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Full channel coverage
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Best-fit distribution channels for each content type in your calendar — with amplification tips and a channel coverage gap check.
                        </p>

                        {/* Per-type channel cards */}
                        <div className="space-y-3 mb-4">
                          {typesPresent.map(([type, count]) => {
                            const channels = CHANNEL_FIT_BY_TYPE[type] ?? [];
                            return (
                              <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Type header */}
                                <div className="flex items-center justify-between px-3.5 py-2 bg-white border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[type]}`}>
                                      {FORMAT_LABEL[type]}
                                    </span>
                                    <span className="text-[8.5px] text-slate-400">{count} {count === 1 ? "entry" : "entries"}</span>
                                  </div>
                                  <span className="text-[8.5px] font-semibold text-teal-600">Top {channels.length} channels</span>
                                </div>

                                {/* Channel rows */}
                                <div className="px-3.5 py-2 space-y-2">
                                  {channels.map(({ channel, fit, tip }, ci) => (
                                    <div key={channel}>
                                      <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[8px] font-bold text-slate-400">#{ci + 1}</span>
                                          <span className="text-[9px] font-semibold text-slate-700">{channel}</span>
                                        </div>
                                        <span className={`text-[8.5px] font-bold tabular-nums ${fitText(fit)}`}>{fit}%</span>
                                      </div>
                                      <div className="h-1 rounded-full bg-slate-200 overflow-hidden mb-0.5">
                                        <div className={`h-full rounded-full ${fitBar(fit)}`} style={{ width: `${fit}%` }} />
                                      </div>
                                      <p className="text-[8px] text-slate-400 leading-snug italic">→ {tip}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Channel gap alerts */}
                        {gaps.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9.5px] font-semibold text-slate-600">Channel coverage gaps:</p>
                            {gaps.map(({ channel, fix }) => (
                              <div key={channel} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                <span className="text-sm shrink-0 mt-0.5 leading-none">⚡</span>
                                <div>
                                  <p className="text-[9px] font-bold text-amber-800">{channel} not represented</p>
                                  <p className="text-[8.5px] text-amber-700 mt-0.5">{fix}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Content Cluster Strength Meter ──────────────────────── */}
                {calendar.length > 0 && (() => {
                  type ClusterStatus = "strong" | "needs-depth" | "needs-pillar" | "thin";

                  const STATUS_CFG: Record<ClusterStatus, { label: string; icon: string; bg: string; border: string; text: string; tip: string }> = {
                    "strong":       { label: "Strong",       icon: "💪", bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", tip: "Healthy pillar-to-cluster ratio — focus on interlinks between pieces"         },
                    "needs-depth":  { label: "Needs Depth",  icon: "📝", bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   tip: "Add 2–3 supporting blog posts, LinkedIn posts, or infographics to build cluster depth"  },
                    "needs-pillar": { label: "Needs Pillar", icon: "🏛️", bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  tip: "Anchor this cluster with a comprehensive guide or case study as the pillar piece"       },
                    "thin":         { label: "Thin",         icon: "⚠️", bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    tip: "Start with a pillar guide, then add 2–3 supporting posts to establish topical authority" },
                  };

                  const clusterOf = (topic: string): { pillar: number; supporting: number } => {
                    const entries = calendar.filter((e) => e.topic === topic);
                    return {
                      pillar:     entries.filter((e) => PILLAR_TYPES.has(e.type)).length,
                      supporting: entries.filter((e) => !PILLAR_TYPES.has(e.type)).length,
                    };
                  };

                  const clusterData = calendarTopics.map((topic) => {
                    const { pillar, supporting } = clusterOf(topic);
                    const score  = scoreCluster(pillar, supporting);
                    const status: ClusterStatus =
                      pillar > 0 && score >= 80 ? "strong"
                      : pillar > 0              ? "needs-depth"
                      : supporting >= 2         ? "needs-pillar"
                      :                           "thin";
                    return { topic, pillar, supporting, score, status };
                  }).sort((a, b) => a.score - b.score);

                  const avgScore    = Math.round(clusterData.reduce((s, c) => s + c.score, 0) / (clusterData.length || 1));
                  const strongCount = clusterData.filter((c) => c.status === "strong").length;
                  const weakCount   = clusterData.filter((c) => c.status === "thin" || c.status === "needs-pillar").length;

                  const scoreBar = (s: number) =>
                    s >= 80 ? "bg-emerald-400" : s >= 60 ? "bg-blue-400" : s >= 40 ? "bg-amber-400" : "bg-rose-400";
                  const authorityLabel = (s: number) =>
                    s >= 80 ? { label: "High Authority",   text: "text-emerald-700", bg: "bg-emerald-100" }
                    : s >= 60 ? { label: "Building",        text: "text-blue-600",    bg: "bg-blue-100"    }
                    : s >= 40 ? { label: "Early Stage",     text: "text-amber-700",   bg: "bg-amber-100"   }
                    :           { label: "Thin Coverage",   text: "text-rose-700",    bg: "bg-rose-100"    };
                  const auth = authorityLabel(avgScore);

                  return (
                    <Card className="border border-orange-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">🏗️</span>
                            <p className="text-xs font-semibold text-slate-700">Content Cluster Strength Meter</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {strongCount > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                {strongCount} strong
                              </span>
                            )}
                            {weakCount > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                {weakCount} weak
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Pillar (guide/case study) to supporting content ratio per topic — a healthy cluster needs 1 pillar + 3 or more supporting pieces to build topical authority.
                        </p>

                        {/* Topical authority score */}
                        <div className={`flex items-center justify-between px-3.5 py-3 rounded-xl border mb-4 ${auth.bg} border-opacity-60`}>
                          <div>
                            <p className="text-[9px] text-slate-500 mb-0.5">Overall Topical Authority Score</p>
                            <p className={`text-lg font-black tabular-nums leading-none ${auth.text}`}>{avgScore}<span className="text-xs font-semibold opacity-60">/100</span></p>
                          </div>
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${auth.bg} ${auth.text} border border-current border-opacity-30`}>
                            {auth.label}
                          </span>
                        </div>

                        {/* Cluster rows */}
                        <div className="space-y-3">
                          {clusterData.map(({ topic, pillar, supporting, score, status }) => {
                            const cfg = STATUS_CFG[status];
                            return (
                              <div key={topic} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
                                {/* Row header */}
                                <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 ${cfg.bg}`}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-[10px] font-bold text-slate-700 truncate">{topic}</span>
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${cfg.border} ${cfg.text} bg-white/60`}>
                                      {cfg.icon} {cfg.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5 shrink-0 text-[8.5px] text-slate-500">
                                    <span>🏛️ {pillar} pillar{pillar !== 1 ? "s" : ""}</span>
                                    <span>📄 {supporting} supporting</span>
                                    <span className={`font-bold tabular-nums ${cfg.text}`}>{score}/100</span>
                                  </div>
                                </div>
                                {/* Strength bar */}
                                <div className="h-1.5 bg-slate-100">
                                  <div className={`h-full ${scoreBar(score)} transition-all`} style={{ width: `${score}%` }} />
                                </div>
                                {/* Tip */}
                                {status !== "strong" && (
                                  <div className="px-3.5 py-1.5">
                                    <p className="text-[8.5px] text-slate-500 leading-snug">→ {cfg.tip}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Ideal ratio note */}
                        <p className="text-[8.5px] text-slate-400 mt-3 text-center italic">
                          Ideal ratio: 1 pillar (guide/case study) + 3–5 supporting pieces per topic cluster
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Seasonal Publishing Pulse ───────────────────────────── */}
                {calendar.length > 0 && (() => {
                  // Group calendar entries by month number (1-12)
                  const coverageByMonth: Record<number, number> = {};
                  calendar.forEach((e) => {
                    const m = new Date(e.date).getMonth() + 1;
                    if (!isNaN(m)) coverageByMonth[m] = (coverageByMonth[m] ?? 0) + 1;
                  });

                  // Determine which months to show: covered months ± 1, capped to 1-12
                  const coveredMonths = Object.keys(coverageByMonth).map(Number);
                  const minM = Math.max(1, Math.min(...coveredMonths) - 1);
                  const maxM = Math.min(12, Math.max(...coveredMonths) + 1);
                  const months = Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);

                  // Average entries per covered month (for gap threshold)
                  const avgCoverage = coveredMonths.length > 0
                    ? coveredMonths.reduce((s, m) => s + coverageByMonth[m], 0) / coveredMonths.length
                    : 1;

                  const demandColor = (d: number) =>
                    d >= 80 ? "bg-rose-400" : d >= 70 ? "bg-amber-400" : d >= 60 ? "bg-blue-400" : "bg-slate-300";
                  const demandLabel = (d: number) =>
                    d >= 80 ? "text-rose-600" : d >= 70 ? "text-amber-600" : d >= 60 ? "text-blue-500" : "text-slate-400";

                  // Gap months: demand ≥ 68 but coverage below half average
                  const gaps = months.filter((m) => {
                    const d = FINTECH_MONTHLY_DEMAND[m]?.demand ?? 60;
                    const c = coverageByMonth[m] ?? 0;
                    return d >= 68 && c < avgCoverage * 0.6;
                  });

                  // Peak month overall (highest demand in view)
                  const peakMonth = months.reduce((best, m) =>
                    (FINTECH_MONTHLY_DEMAND[m]?.demand ?? 0) > (FINTECH_MONTHLY_DEMAND[best]?.demand ?? 0) ? m : best,
                    months[0],
                  );

                  return (
                    <Card className="border border-fuchsia-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">📅</span>
                            <p className="text-xs font-semibold text-slate-700">Seasonal Publishing Pulse</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {gaps.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                {gaps.length} demand gap{gaps.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              Peak: {MONTH_LABELS[peakMonth - 1]}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-5">
                          Fintech industry search demand by month overlaid with your publish schedule — amber and rose bars are high-demand windows worth filling.
                        </p>

                        {/* Bar chart */}
                        <div className="flex items-end gap-1.5 mb-2" style={{ height: 72 }}>
                          {months.map((m) => {
                            const { demand } = FINTECH_MONTHLY_DEMAND[m] ?? { demand: 60 };
                            const coverage  = coverageByMonth[m] ?? 0;
                            const barH      = Math.round(demand * 0.68);
                            const isGap     = gaps.includes(m);
                            return (
                              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                                {/* Coverage badge */}
                                <div className={`text-[8px] font-bold px-1 py-0.5 rounded min-w-[18px] text-center leading-none ${
                                  coverage === 0 && isGap
                                    ? "bg-rose-100 text-rose-600"
                                    : coverage === 0
                                    ? "bg-slate-100 text-slate-400"
                                    : coverage === 1
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {coverage === 0 ? "–" : coverage}
                                </div>
                                {/* Demand bar */}
                                <div
                                  className={`w-full rounded-t ${demandColor(demand)} ${isGap ? "ring-1 ring-amber-400 ring-offset-0" : ""}`}
                                  style={{ height: barH }}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Month labels */}
                        <div className="flex gap-1.5 mb-1">
                          {months.map((m) => (
                            <div key={m} className={`flex-1 text-center text-[7.5px] font-semibold ${demandLabel(FINTECH_MONTHLY_DEMAND[m]?.demand ?? 60)}`}>
                              {MONTH_LABELS[m - 1]}
                            </div>
                          ))}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
                          <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400" /> Peak demand ≥80</span>
                          <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" /> Elevated ≥70</span>
                          <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" /> Moderate ≥60</span>
                          <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400 rounded-sm" /> badge = entries scheduled</span>
                        </div>

                        {/* Gap callouts */}
                        {gaps.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[9.5px] font-semibold text-slate-600">High-demand months with thin coverage:</p>
                            {gaps.map((m) => {
                              const data = FINTECH_MONTHLY_DEMAND[m];
                              return (
                                <div key={m} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                  <span className="text-sm shrink-0 mt-0.5 leading-none">⚡</span>
                                  <div>
                                    <p className="text-[9.5px] font-bold text-amber-800">
                                      {MONTH_LABELS[m - 1]} — demand {data.demand}/100 · {coverageByMonth[m] ?? 0} {coverageByMonth[m] === 1 ? "entry" : "entries"} scheduled
                                    </p>
                                    <p className="text-[8.5px] text-amber-700 mt-0.5">
                                      Peak topics: {data.peaks.join(" · ")}
                                    </p>
                                    <p className="text-[8.5px] text-amber-600 mt-0.5 italic">
                                      Add: {data.suggest}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                            <span className="text-sm">✅</span>
                            <p className="text-[10px] font-semibold text-emerald-700">
                              Good seasonal coverage — your calendar aligns well with fintech demand peaks.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Audience Intent Heatmap ─────────────────────────────── */}
                {calendar.length > 0 && (() => {
                  const DOT_COLOR_MAP: Record<ContentType, string> = {
                    "blog-post": "bg-blue-500", guide: "bg-indigo-500", infographic: "bg-cyan-500",
                    linkedin: "bg-sky-500", newsletter: "bg-teal-500", "case-study": "bg-violet-600",
                    webinar: "bg-purple-500", checklist: "bg-green-500", "video-script": "bg-orange-500",
                    podcast: "bg-rose-500",
                  };

                  const plotData = calendar.map((entry) => {
                    const { ix, fy } = getHeatmapCoords(entry);
                    return { entry, ix, fy, dot: DOT_COLOR_MAP[entry.type] };
                  });

                  type QKey = "educate" | "inspire" | "nurture" | "convert";
                  const qOf = (ix: number, fy: number): QKey =>
                    ix < 50 && fy < 50 ? "educate"
                    : ix >= 50 && fy < 50 ? "inspire"
                    : ix < 50 ? "nurture" : "convert";

                  const qCounts: Record<QKey, number> = { educate: 0, inspire: 0, nurture: 0, convert: 0 };
                  plotData.forEach(({ ix, fy }) => { qCounts[qOf(ix, fy)]++; });

                  const GAP_META: Record<QKey, { label: string; icon: string; suggestion: string; bg: string; border: string; lc: string }> = {
                    educate: { label: "Educate",  icon: "📚", bg: "bg-blue-50",    border: "border-blue-200",    lc: "text-blue-600",    suggestion: "informational blog posts or infographics to build top-of-funnel awareness"                   },
                    inspire: { label: "Inspire",  icon: "✨", bg: "bg-violet-50",  border: "border-violet-200",  lc: "text-violet-600",  suggestion: "thought-leadership or case studies that attract commercially-minded readers early"              },
                    nurture: { label: "Nurture",  icon: "🌱", bg: "bg-emerald-50", border: "border-emerald-200", lc: "text-emerald-700", suggestion: "how-to guides or checklists helping research-stage readers evaluate their options"              },
                    convert: { label: "Convert",  icon: "🎯", bg: "bg-amber-50",   border: "border-amber-200",   lc: "text-amber-700",   suggestion: "webinars, comparison guides, or demos that move high-intent prospects to act"                  },
                  };

                  const gapKey = (Object.entries(qCounts) as [QKey, number][])
                    .sort((a, b) => a[1] - b[1])[0][0];
                  const gapMeta = GAP_META[gapKey];

                  return (
                    <Card className="border border-indigo-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base leading-none">🗺️</span>
                          <p className="text-xs font-semibold text-slate-700">Audience Intent Heatmap</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Each entry plotted by search intent (informational → commercial) and funnel stage (awareness → decision) — spot gaps and imbalances at a glance.
                        </p>

                        {/* Quadrant count pills */}
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                          {(["educate", "inspire", "nurture", "convert"] as QKey[]).map((k) => {
                            const m = GAP_META[k];
                            return (
                              <div key={k} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${m.bg} ${m.border}`}>
                                <span className={`text-[9px] font-bold ${m.lc}`}>{m.icon} {m.label}</span>
                                <span className={`text-[9px] font-bold tabular-nums ${m.lc}`}>{qCounts[k]}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Scatter plot */}
                        <div className="flex gap-3">
                          {/* Y-axis label */}
                          <div className="flex flex-col justify-between shrink-0 text-right" style={{ width: 52 }}>
                            <span className="text-[7.5px] text-slate-400 font-semibold leading-tight">Awareness ↑</span>
                            <span className="text-[7.5px] text-slate-400 font-semibold leading-tight">↓ Decision</span>
                          </div>
                          {/* Plot area */}
                          <div className="flex-1 min-w-0">
                            <div className="relative rounded-lg overflow-hidden border border-slate-200" style={{ height: 220 }}>
                              {/* Quadrant backgrounds */}
                              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                                <div className="bg-blue-50/70" />
                                <div className="bg-violet-50/70" />
                                <div className="bg-emerald-50/70" />
                                <div className="bg-amber-50/70" />
                              </div>
                              {/* Dividers */}
                              <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-slate-300/70 pointer-events-none" />
                              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-300/70 pointer-events-none" />
                              {/* Quadrant corner labels */}
                              <p className="absolute top-1.5 left-2 text-[8px] font-bold text-blue-500 leading-none pointer-events-none">📚 Educate</p>
                              <p className="absolute top-1.5 right-2 text-[8px] font-bold text-violet-600 leading-none text-right pointer-events-none">✨ Inspire</p>
                              <p className="absolute bottom-1.5 left-2 text-[8px] font-bold text-emerald-700 leading-none pointer-events-none">🌱 Nurture</p>
                              <p className="absolute bottom-1.5 right-2 text-[8px] font-bold text-amber-700 leading-none text-right pointer-events-none">🎯 Convert</p>
                              {/* Entry dots */}
                              {plotData.map(({ entry, ix, fy, dot }) => (
                                <div
                                  key={entryKey(entry)}
                                  title={`${entry.angle}\n${FORMAT_LABEL[entry.type]} · Wk ${entry.week}`}
                                  className={`absolute w-2.5 h-2.5 rounded-full border border-white shadow-sm opacity-75 cursor-default ${dot}`}
                                  style={{ left: `${ix}%`, top: `${fy}%`, transform: "translate(-50%, -50%)" }}
                                />
                              ))}
                            </div>
                            {/* X-axis label */}
                            <div className="flex justify-between mt-1.5">
                              <span className="text-[7.5px] text-slate-400 font-semibold">← Informational</span>
                              <span className="text-[7.5px] text-slate-400">Search Intent</span>
                              <span className="text-[7.5px] text-slate-400 font-semibold">Commercial →</span>
                            </div>
                          </div>
                        </div>

                        {/* Gap callout */}
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border mt-4 ${gapMeta.bg} ${gapMeta.border}`}>
                          <span className="text-sm shrink-0 mt-0.5 leading-none">{gapMeta.icon}</span>
                          <p className="text-[9.5px] text-slate-700 leading-snug">
                            <span className={`font-bold ${gapMeta.lc}`}>{gapMeta.label}</span> is your lightest quadrant ({qCounts[gapKey]} {qCounts[gapKey] === 1 ? "entry" : "entries"}) — consider adding {gapMeta.suggestion}.
                          </p>
                        </div>

                        {/* Legend */}
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                          {(Object.entries(DOT_COLOR_MAP) as [ContentType, string][]).map(([type, bg]) => (
                            <div key={type} className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full shrink-0 opacity-80 ${bg}`} />
                              <span className="text-[7.5px] text-slate-400">{FORMAT_LABEL[type]}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── CTA Effectiveness Scorer ────────────────────────────── */}
                {calendar.length > 0 && (() => {
                  const DIM_META: { key: keyof Omit<CtaScore, "total" | "rewrite">; label: string; icon: string }[] = [
                    { key: "urgency",       label: "Urgency",        icon: "⚡" },
                    { key: "specificity",   label: "Specificity",    icon: "🎯" },
                    { key: "audienceFit",   label: "Audience Fit",   icon: "👤" },
                    { key: "actionClarity", label: "Action Clarity", icon: "✅" },
                  ];

                  const scored = calendar.map((entry) => ({
                    entry,
                    score: scoreCta(entry.cta, entry.type, entry.topic),
                  }));

                  const needsWork = scored.filter((s) => s.score.total < 70);
                  const good      = scored.filter((s) => s.score.total >= 70 && s.score.total < 85);
                  const excellent = scored.filter((s) => s.score.total >= 85);
                  const shown     = [...needsWork].sort((a, b) => a.score.total - b.score.total).slice(0, 6);

                  const totalScore = (v: number): { bg: string; text: string; label: string } =>
                    v >= 85 ? { bg: "bg-cyan-100",    text: "text-cyan-700",    label: "Excellent" }
                    : v >= 70 ? { bg: "bg-emerald-100", text: "text-emerald-700", label: "Good"      }
                    : v >= 50 ? { bg: "bg-amber-100",   text: "text-amber-700",   label: "Fair"      }
                    :           { bg: "bg-rose-100",    text: "text-rose-700",    label: "Poor"      };

                  const dimBar = (v: number) =>
                    v >= 20 ? "bg-emerald-400" : v >= 12 ? "bg-amber-400" : "bg-rose-400";

                  return (
                    <Card className="border border-violet-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">📣</span>
                            <p className="text-xs font-semibold text-slate-700">
                              CTA Effectiveness Scorer
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {needsWork.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                {needsWork.length} need{needsWork.length === 1 ? "s" : ""} attention
                              </span>
                            )}
                            {excellent.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                                {excellent.length} excellent
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Each CTA scored on Urgency, Specificity, Audience Fit & Action Clarity (max 100) — lowest scorers shown first with a rewrite suggestion.
                        </p>

                        {/* Distribution bar */}
                        <div className="mb-4">
                          <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {needsWork.length > 0 && (
                              <div className="bg-rose-400 rounded-l-full" style={{ width: `${(needsWork.length / scored.length) * 100}%` }} />
                            )}
                            {good.length > 0 && (
                              <div className="bg-emerald-400" style={{ width: `${(good.length / scored.length) * 100}%` }} />
                            )}
                            {excellent.length > 0 && (
                              <div className="bg-cyan-400 rounded-r-full" style={{ width: `${(excellent.length / scored.length) * 100}%` }} />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[8.5px] text-slate-400"><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />Poor/Fair</span>
                            <span className="text-[8.5px] text-slate-400"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />Good</span>
                            <span className="text-[8.5px] text-slate-400"><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1" />Excellent</span>
                          </div>
                        </div>

                        {needsWork.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <span className="text-sm">✅</span>
                            <p className="text-[10px] font-semibold text-emerald-700">
                              All CTAs score 70 or above — your calls-to-action are well-structured and audience-aligned.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {shown.map(({ entry, score }) => {
                              const tc = totalScore(score.total);
                              return (
                                <div key={entryKey(entry)} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                  {/* Entry header */}
                                  <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2 border-b border-slate-100 bg-white">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold text-slate-700 line-clamp-1 leading-snug">
                                        {entry.angle}
                                      </p>
                                      <p className="text-[9px] text-violet-600 italic mt-0.5 line-clamp-1">
                                        "{entry.cta}"
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOR[entry.type]}`}>
                                        {FORMAT_LABEL[entry.type]}
                                      </span>
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                                        {score.total} · {tc.label}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Dimension bars */}
                                  <div className="px-3.5 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {DIM_META.map(({ key, label, icon }) => (
                                      <div key={key}>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[8.5px] text-slate-500">{icon} {label}</span>
                                          <span className="text-[8.5px] font-bold text-slate-600">{score[key]}/25</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${dimBar(score[key])}`}
                                            style={{ width: `${(score[key] / 25) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Rewrite suggestion */}
                                  <div className="mx-3.5 mb-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                    <p className="text-[8.5px] text-amber-700 font-semibold mb-0.5">✏️ Suggested rewrite</p>
                                    <p className="text-[9px] text-amber-900 italic leading-snug">
                                      "{score.rewrite}"
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {needsWork.length > 6 && (
                              <p className="text-[9px] text-slate-400 text-center">
                                +{needsWork.length - 6} more entries need CTA attention
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Readability & Format Fit Score ──────────────────────── */}
                {calendar.length > 0 && (() => {
                  const DIM_META: { key: keyof Omit<HeadlineScore, "total" | "rewrite">; label: string; icon: string }[] = [
                    { key: "specificity",      label: "Specificity",       icon: "🔢" },
                    { key: "powerWords",       label: "Power Words",       icon: "⚡" },
                    { key: "keywordPlacement", label: "Keyword Placement", icon: "🎯" },
                    { key: "formatFit",        label: "Format Fit",        icon: "📐" },
                  ];

                  const scored = calendar.map((entry) => ({
                    entry,
                    score: scoreHeadline(entry.angle, entry.type, entry.topic),
                  }));

                  const poor      = scored.filter((s) => s.score.total < 50);
                  const fair      = scored.filter((s) => s.score.total >= 50 && s.score.total < 70);
                  const good      = scored.filter((s) => s.score.total >= 70 && s.score.total < 85);
                  const excellent = scored.filter((s) => s.score.total >= 85);
                  const needsWork = scored.filter((s) => s.score.total < 70);
                  const shown     = [...needsWork].sort((a, b) => a.score.total - b.score.total).slice(0, 6);
                  const avgScore  = Math.round(scored.reduce((s, e) => s + e.score.total, 0) / (scored.length || 1));

                  const tierCfg = (v: number) =>
                    v >= 85 ? { bg: "bg-cyan-100",    text: "text-cyan-700",    label: "Excellent" }
                    : v >= 70 ? { bg: "bg-emerald-100", text: "text-emerald-700", label: "Good"      }
                    : v >= 50 ? { bg: "bg-amber-100",   text: "text-amber-700",   label: "Fair"      }
                    :           { bg: "bg-rose-100",    text: "text-rose-700",    label: "Poor"      };
                  const dimBar = (v: number) =>
                    v >= 20 ? "bg-emerald-400" : v >= 12 ? "bg-amber-400" : "bg-rose-400";
                  const avgCfg = tierCfg(avgScore);

                  return (
                    <Card className="border border-sky-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">✍️</span>
                            <p className="text-xs font-semibold text-slate-700">Readability & Format Fit Score</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {needsWork.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                {needsWork.length} title{needsWork.length !== 1 ? "s" : ""} need work
                              </span>
                            )}
                            {excellent.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                                {excellent.length} excellent
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Each working title scored on Specificity, Power Words, Keyword Placement & Format Fit (max 100) — weakest titles shown first with a headline rewrite.
                        </p>

                        {/* Overall score */}
                        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border mb-4 ${avgCfg.bg}`}>
                          <div>
                            <p className="text-[9px] text-slate-500 mb-0.5">Average Headline Quality Score</p>
                            <p className={`text-lg font-black tabular-nums leading-none ${avgCfg.text}`}>
                              {avgScore}<span className="text-xs font-semibold opacity-60">/100</span>
                            </p>
                          </div>
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${avgCfg.bg} ${avgCfg.text}`}>
                            {avgCfg.label}
                          </span>
                        </div>

                        {/* Distribution bar */}
                        <div className="mb-4">
                          <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {poor.length      > 0 && <div className="bg-rose-400"    style={{ width: `${(poor.length      / scored.length) * 100}%` }} />}
                            {fair.length      > 0 && <div className="bg-amber-400"   style={{ width: `${(fair.length      / scored.length) * 100}%` }} />}
                            {good.length      > 0 && <div className="bg-emerald-400" style={{ width: `${(good.length      / scored.length) * 100}%` }} />}
                            {excellent.length > 0 && <div className="bg-cyan-400"    style={{ width: `${(excellent.length / scored.length) * 100}%` }} />}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {[{ label: "Poor",      bg: "bg-rose-400",    count: poor.length      },
                              { label: "Fair",      bg: "bg-amber-400",   count: fair.length      },
                              { label: "Good",      bg: "bg-emerald-400", count: good.length      },
                              { label: "Excellent", bg: "bg-cyan-400",    count: excellent.length }]
                              .filter((t) => t.count > 0)
                              .map((t) => (
                                <span key={t.label} className="text-[8.5px] text-slate-400 flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${t.bg}`} />
                                  {t.label} ({t.count})
                                </span>
                              ))}
                          </div>
                        </div>

                        {needsWork.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <span className="text-sm">✅</span>
                            <p className="text-[10px] font-semibold text-emerald-700">
                              All headlines score 70 or above — your working titles are specific, powerful, and format-aligned.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {shown.map(({ entry, score }) => {
                              const tc = tierCfg(score.total);
                              return (
                                <div key={entryKey(entry)} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                  {/* Header */}
                                  <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2 border-b border-slate-100 bg-white">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-snug">
                                        {entry.angle}
                                      </p>
                                      <p className="text-[8.5px] text-slate-400 mt-0.5">
                                        {entry.topic} · {FORMAT_LABEL[entry.type]} · Wk {entry.week}
                                      </p>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tc.bg} ${tc.text}`}>
                                      {score.total} · {tc.label}
                                    </span>
                                  </div>

                                  {/* Dimension bars */}
                                  <div className="px-3.5 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {DIM_META.map(({ key, label, icon }) => (
                                      <div key={key}>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[8.5px] text-slate-500">{icon} {label}</span>
                                          <span className="text-[8.5px] font-bold text-slate-600">{score[key]}/25</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                                          <div className={`h-full rounded-full ${dimBar(score[key])}`} style={{ width: `${(score[key] / 25) * 100}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Rewrite */}
                                  <div className="mx-3.5 mb-2.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-100">
                                    <p className="text-[8.5px] text-sky-700 font-semibold mb-0.5">✏️ Suggested headline</p>
                                    <p className="text-[9px] text-sky-900 italic leading-snug">"{score.rewrite}"</p>
                                  </div>
                                </div>
                              );
                            })}
                            {needsWork.length > 6 && (
                              <p className="text-[9px] text-slate-400 text-center">
                                +{needsWork.length - 6} more titles need improvement
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Trending Topics Radar ───────────────────────────────── */}
                {calendarTopics.length > 0 && (() => {
                  const DIRECTION_CONFIG = {
                    surging: { label: "Surging", icon: "🔥", badge: "bg-rose-100 text-rose-700 border-rose-200",       bar: "bg-rose-500"    },
                    rising:  { label: "Rising",  icon: "↑",  badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
                    steady:  { label: "Steady",  icon: "→",  badge: "bg-slate-100 text-slate-600 border-slate-200",     bar: "bg-slate-400"   },
                    cooling: { label: "Cooling", icon: "↓",  badge: "bg-blue-50 text-blue-500 border-blue-200",         bar: "bg-blue-400"    },
                  } as const;

                  const trendData = calendarTopics
                    .map((topic) => ({ topic, ...getTopicTrend(topic) }))
                    .sort((a, b) => b.momentum - a.momentum);

                  const topTopic   = trendData[0];
                  const nudgeIt    = topTopic &&
                    (topTopic.direction === "surging" || topTopic.direction === "rising");

                  return (
                    <Card className="border border-cyan-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">📡</span>
                            <p className="text-xs font-semibold text-slate-700">
                              Trending Topics Radar
                            </p>
                          </div>
                          <span className="text-[9px] text-slate-400 italic">
                            Based on fintech industry trend patterns · cross-reference with Google Trends for live data
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Momentum scores for each topic in your calendar — prioritise high-velocity pieces in your next sprint.
                        </p>

                        {/* Sprint nudge for top topic */}
                        {nudgeIt && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 mb-4">
                            <span className="text-sm shrink-0 mt-0.5 leading-none">
                              {topTopic.direction === "surging" ? "🔥" : "↑"}
                            </span>
                            <p className="text-[9.5px] text-emerald-800 leading-snug">
                              <span className="font-bold">{topTopic.topic}</span> is your highest-momentum topic ({topTopic.velocity}) — consider moving its earliest entry into your current sprint week.
                            </p>
                          </div>
                        )}

                        {/* Topic rows */}
                        <div className="space-y-3.5">
                          {trendData.map(({ topic, momentum, direction, velocity, trigger }) => {
                            const cfg = DIRECTION_CONFIG[direction];
                            return (
                              <div key={topic}>
                                <div className="flex items-center justify-between mb-1 gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-[10px] font-bold text-slate-700 truncate">
                                      {topic}
                                    </span>
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${cfg.badge}`}>
                                      {cfg.icon} {cfg.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9px] font-semibold text-cyan-600 tabular-nums whitespace-nowrap">
                                      {velocity}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-500 tabular-nums w-6 text-right">
                                      {momentum}
                                    </span>
                                  </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1">
                                  <div
                                    className={`h-full rounded-full ${cfg.bar} transition-all`}
                                    style={{ width: `${momentum}%` }}
                                  />
                                </div>
                                <p className="text-[8.5px] text-slate-400 leading-snug">
                                  {trigger}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Content Aging Alerts ────────────────────────────────── */}
                {(() => {
                  const now      = Date.now();
                  const MS_DAY   = 1000 * 60 * 60 * 24;
                  const STALE_DAYS = 21;

                  type AlertKind = "both" | "cooling" | "stale";

                  const RECS: Record<AlertKind, string[]> = {
                    both: [
                      "Priority action: pull into your next sprint week AND refresh the angle immediately",
                      "Reframe around a Rising topic for a contrast or comparison piece to rescue reach",
                      "Set a brief review checkpoint before the scheduled publish date",
                    ],
                    cooling: [
                      "Reframe the angle to highlight contrast with rising alternatives — e.g. 'Why X is losing to Y'",
                      "Update the CTA to acknowledge market sentiment shift and address reader hesitation",
                      "Consider pairing with a surging topic to anchor the cooling piece in a hot narrative",
                    ],
                    stale: [
                      "Re-slot earlier using Sprint Planner — content planned >3 weeks out loses relevance fast",
                      "Update the working title to reference a recent development or regulatory update",
                      "Review the CTA — time-sensitive offers or events may have passed by publish date",
                    ],
                  };

                  type AlertItem = {
                    entry:   CalendarEntry;
                    kind:    AlertKind;
                    daysOut: number;
                    trend:   ReturnType<typeof getTopicTrend>;
                  };

                  const alerts: AlertItem[] = [];

                  for (const entry of calendar) {
                    const status   = entryStatuses[entryKey(entry)] ?? "not-started";
                    if (status === "published") continue;

                    const trend    = getTopicTrend(entry.topic);
                    const ms       = new Date(entry.date).getTime() - now;
                    const daysOut  = Math.floor(ms / MS_DAY);
                    const isCool   = trend.direction === "cooling";
                    const isStale  = daysOut > STALE_DAYS;

                    if (!isCool && !isStale) continue;

                    const kind: AlertKind = isCool && isStale ? "both" : isCool ? "cooling" : "stale";
                    alerts.push({ entry, kind, daysOut, trend });
                  }

                  // Sort: both > cooling > stale; within each group, nearest date first
                  const order: Record<AlertKind, number> = { both: 0, cooling: 1, stale: 2 };
                  alerts.sort((a, b) =>
                    order[a.kind] !== order[b.kind]
                      ? order[a.kind] - order[b.kind]
                      : a.daysOut - b.daysOut,
                  );
                  const shown = alerts.slice(0, 6);

                  const KIND_CFG: Record<AlertKind, { label: string; icon: string; bg: string; border: string; badge: string; text: string }> = {
                    both:    { label: "Cooling + Stale",  icon: "🚨", bg: "bg-rose-50",   border: "border-rose-200",   badge: "bg-rose-100 text-rose-700 border-rose-300",     text: "text-rose-700"  },
                    cooling: { label: "Cooling Topic",    icon: "🥶", bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700 border-blue-300",     text: "text-blue-700"  },
                    stale:   { label: "Scheduled Late",   icon: "⏳", bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700 border-amber-300",  text: "text-amber-700" },
                  };

                  return (
                    <Card className="border border-amber-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">⚠️</span>
                            <p className="text-xs font-semibold text-slate-700">
                              Content Aging Alerts
                            </p>
                          </div>
                          {shown.length > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}{alerts.length > 6 ? ` · showing 6` : ""}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ All clear
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          Entries with a cooling momentum signal or a publish date more than 3 weeks out — with specific actions to keep them relevant.
                        </p>

                        {shown.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <span className="text-sm">✅</span>
                            <p className="text-[10px] font-semibold text-emerald-700">
                              No aging alerts — your calendar topics are trending well and all pieces are scheduled within 3 weeks.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {shown.map(({ entry, kind, daysOut, trend }) => {
                              const cfg  = KIND_CFG[kind];
                              const recs = RECS[kind];
                              return (
                                <div
                                  key={entryKey(entry)}
                                  className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}
                                >
                                  {/* Entry header */}
                                  <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5 border-b border-inherit">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold text-slate-700 leading-snug line-clamp-1">
                                        {entry.angle}
                                      </p>
                                      <p className="text-[9px] text-slate-400 mt-0.5">
                                        {entry.topic} · Wk {entry.week} · {entry.date}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      <span className={`text-[9px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}>
                                        {FORMAT_LABEL[entry.type]}
                                      </span>
                                      <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${cfg.badge}`}>
                                        {cfg.icon} {cfg.label}
                                      </span>
                                      {kind !== "cooling" && (
                                        <span className="text-[9px] font-semibold text-amber-700 whitespace-nowrap">
                                          {daysOut}d out
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Recommendations */}
                                  <div className="px-3.5 py-2.5 space-y-1">
                                    {kind === "cooling" && (
                                      <p className="text-[8.5px] text-slate-500 mb-1">
                                        Topic trend: <span className="font-semibold text-blue-600">{trend.velocity}</span> — {trend.trigger}
                                      </p>
                                    )}
                                    {recs.map((rec, i) => (
                                      <div key={i} className="flex items-start gap-1.5">
                                        <span className={`text-[9px] font-bold mt-0.5 shrink-0 ${cfg.text}`}>
                                          {i === 0 ? "①" : i === 1 ? "②" : "③"}
                                        </span>
                                        <p className="text-[9px] text-slate-600 leading-snug">
                                          {rec}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Competitor Gap Analysis ─────────────────────────────── */}
                {competitorGapsByTopic.length > 0 && (
                  <Card className="border border-rose-100 shadow-sm">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <ScanSearch className="w-3.5 h-3.5 text-rose-500" />
                            Competitor Gap Analysis
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Content formats competitors are likely publishing in
                            your niches — and you're not yet.
                          </p>
                        </div>
                        {highThreatGapCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 whitespace-nowrap">
                            ⚠ {highThreatGapCount} high-threat gap
                            {highThreatGapCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Per-topic sections */}
                      <div className="space-y-5">
                        {competitorGapsByTopic.map(({ topic, gaps }, ti) => (
                          <div key={ti}>
                            {/* Topic badge + niche insight */}
                            <div className="flex items-start gap-2 mb-2.5 flex-wrap">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                                style={topicColorStyle(topic, form.topics)}
                              >
                                {topic}
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-snug">
                                {getCompetitorPriority(topic).insight}
                              </p>
                            </div>

                            {/* Gap rows */}
                            <div className="space-y-2">
                              {gaps.map((gap, gi) => {
                                const threatStyle =
                                  gap.threat === "High"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : gap.threat === "Medium"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200";
                                const threatIcon =
                                  gap.threat === "High"
                                    ? "⚠"
                                    : gap.threat === "Medium"
                                      ? "●"
                                      : "○";
                                const gapVol = getSearchVolume(gap.topic);
                                return (
                                  <div
                                    key={gi}
                                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                                  >
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      {/* Badges row */}
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${threatStyle}`}
                                        >
                                          {threatIcon}{" "}
                                          {gap.threat === "High"
                                            ? "High threat"
                                            : gap.threat}
                                        </span>
                                        <span
                                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${TYPE_COLOR[gap.type]}`}
                                        >
                                          {FORMAT_LABEL[gap.type]}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">
                                          {gap.depth}
                                        </span>
                                      </div>

                                      {/* Example angle */}
                                      <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                                        "{gap.exampleAngle}"
                                      </p>
                                    </div>

                                    {/* Add-to-plan button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        fillGap({
                                          topic: gap.topic,
                                          missingType: gap.type,
                                          vol: gapVol,
                                          opportunityScore:
                                            computePriorityScore(
                                              gapVol.tier,
                                              gapVol.difficulty,
                                            ),
                                        })
                                      }
                                      className="shrink-0 text-[9px] font-semibold px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors whitespace-nowrap mt-0.5"
                                    >
                                      + Add to plan
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {ti < competitorGapsByTopic.length - 1 && (
                              <div className="border-b border-slate-100 mt-4" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer note */}
                      <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-slate-100 leading-relaxed">
                        Format priorities sourced from fintech niche SERP
                        analysis. High-threat gaps are formats that consistently
                        rank on page 1 in your category and are absent from your
                        current plan.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* ── Content Repurposing Map ─────────────────────────────── */}
                {(() => {
                  const publishedEntries = calendar.filter(
                    (e) => (entryStatuses[entryKey(e)] ?? "not-started") === "published",
                  );
                  const reviewEntries = calendar.filter(
                    (e) => (entryStatuses[entryKey(e)] ?? "not-started") === "review",
                  );
                  const isTracked =
                    publishedEntries.length > 0 || reviewEntries.length > 0;
                  const sourcePool = isTracked
                    ? [...publishedEntries, ...reviewEntries]
                    : calendar;

                  // De-duplicate by topic+type, cap at 6 cards
                  const seen = new Set<string>();
                  const sourceEntries: CalendarEntry[] = [];
                  for (const e of sourcePool) {
                    const k = `${e.topic}|${e.type}`;
                    if (!seen.has(k) && sourceEntries.length < 6) {
                      seen.add(k);
                      sourceEntries.push(e);
                    }
                  }

                  return (
                    <Card className="border border-violet-100 shadow-sm">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">♻️</span>
                            <p className="text-xs font-semibold text-slate-700">
                              Content Repurposing Map
                            </p>
                          </div>
                          {isTracked ? (
                            <span className="text-[9.5px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                              {publishedEntries.length + reviewEntries.length} queued piece{publishedEntries.length + reviewEntries.length !== 1 ? "s" : ""} · {sourceEntries.length} shown
                            </span>
                          ) : (
                            <span className="text-[9.5px] text-slate-400 italic">
                              Mark entries Published or In Review to filter to your live content
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-4">
                          For each piece in your production queue, three ready-to-execute derivative formats — with the exact angle adaptation and best distribution channel for each.
                        </p>

                        {/* Cards grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {sourceEntries.map((entry) => {
                            const derivatives = REPURPOSE_DERIVATIVES[entry.type];
                            const entryStatus: ContentStatus =
                              entryStatuses[entryKey(entry)] ?? "not-started";
                            const statusCfg = STATUS_CONFIG[entryStatus];
                            return (
                              <div
                                key={entryKey(entry)}
                                className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm"
                              >
                                {/* Source piece header */}
                                <div className="flex items-start justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-700 leading-snug line-clamp-2">
                                      {entry.angle}
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                      {entry.topic} · Wk {entry.week}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span
                                      className={`text-[9px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}
                                    >
                                      {FORMAT_LABEL[entry.type]}
                                    </span>
                                    {isTracked && (
                                      <span
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                                      >
                                        {statusCfg.icon} {statusCfg.label}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Three derivative rows */}
                                <div className="divide-y divide-slate-50">
                                  {derivatives.map((d, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2.5 px-3.5 py-2.5"
                                    >
                                      <span className="text-sm mt-0.5 shrink-0 leading-none">
                                        {d.icon}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-700">
                                          {d.format}
                                        </p>
                                        <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5">
                                          {d.angleSuffix}
                                        </p>
                                      </div>
                                      <span className="text-[8.5px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 mt-0.5 leading-tight">
                                        {d.channel}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* ── Content Gap Finder ──────────────────────────────────── */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <ScanSearch className="w-4 h-4 text-indigo-500 shrink-0" />
                      <p className="text-xs font-semibold text-slate-700">
                        Content Gap Finder
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-4">
                      Topic × format combinations missing from this calendar, ranked by SEO opportunity. Add them to a future sprint to plug the gaps.
                    </p>

                    {topGaps.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
                        <span className="text-base">✅</span>
                        <p className="text-xs text-emerald-700 font-medium">
                          Great coverage — no high-opportunity gaps found across your selected topics and formats.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {topGaps.map((gap, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[auto_auto_1fr_auto] gap-3 items-start rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-white transition-colors"
                          >
                            {/* Opportunity score */}
                            <div className="pt-0.5">
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${priorityStyle(gap.opportunityScore)}`}
                                title={`Gap opportunity score: ${gap.opportunityScore}/100`}
                              >
                                {priorityEmoji(gap.opportunityScore)} {gap.opportunityScore}
                              </span>
                            </div>
                            {/* Missing format badge */}
                            <div className="pt-0.5">
                              <span
                                className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${TYPE_COLOR[gap.missingType]}`}
                              >
                                {FORMAT_LABEL[gap.missingType]}
                              </span>
                            </div>
                            {/* Topic + reason */}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {gap.topic}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                {GAP_REASON[gap.missingType]}
                              </p>
                            </div>
                            {/* Vol + KD chips + Fill button */}
                            <div className="flex flex-col gap-1 items-end shrink-0 pt-0.5">
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${TIER_STYLE[gap.vol.tier]}`}
                              >
                                <TrendingUp className="w-2.5 h-2.5" />
                                {gap.vol.range}
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${kdStyle(gap.vol.difficulty)}`}
                              >
                                KD {gap.vol.difficulty}
                              </span>
                              {filledGaps.has(
                                `${gap.topic}|${gap.missingType}`,
                              ) ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 mt-0.5">
                                  <Check className="w-3 h-3" /> Added
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => fillGap(gap)}
                                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors mt-0.5 whitespace-nowrap"
                                >
                                  + Fill this gap
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {allContentGaps.length > 10 && (
                          <p className="text-[10px] text-muted-foreground text-center pt-1">
                            +{allContentGaps.length - 10} more gaps not shown — add more topics or expand your timeframe to cover them.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">
                      Ready to execute?
                    </p>
                    <p className="text-base font-bold text-indigo-900 leading-snug mb-2">
                      {form.topics.length > 0
                        ? `Want to dominate the ${form.topics[0]} niche? Let's talk strategy.`
                        : "Want to dominate your fintech niche? Let's talk strategy."}
                    </p>
                    <p className="text-[11px] text-indigo-700 leading-relaxed mb-3">
                      This calendar is your blueprint — FintechPressHub turns it
                      into published, ranked, lead-generating content. No guesswork,
                      no wasted budget.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        Book a free strategy call →
                      </Link>
                      <Link
                        href="/services"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        See content services
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Editorial Brief Modal ──────────────────────────────────────────── */}
      {briefEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBriefEntry(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 shrink-0">
                  Editorial Brief
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ml-1 shrink-0 ${TYPE_COLOR[briefEntry.type]}`}
                >
                  {FORMAT_LABEL[briefEntry.type]}
                </span>
                <span className="text-[11px] text-slate-400 truncate ml-1">
                  — {briefEntry.archetype}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateBrief(briefEntry));
                    setCopiedBrief(true);
                    setTimeout(() => setCopiedBrief(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  {copiedBrief ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedBrief ? "Copied!" : "Copy to Notion"}
                </button>
                <button
                  onClick={() => setBriefEntry(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subheader hint */}
            <div className="px-6 pt-3 pb-0">
              <p className="text-[10.5px] text-slate-400 font-medium tracking-wide">
                Paste directly into a new Notion page — all markdown renders natively
              </p>
            </div>

            {/* Scrollable brief body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {(() => {
                const bp = briefEntry;
                const bRationale =
                  ARCHETYPE_RATIONALE[bp.archetype] ??
                  "Build authority and drive organic traffic";
                const bWordCount  = WORD_COUNT_BY_TYPE[bp.type];
                const bIsLinkedIn = bp.type === "linkedin";
                const bPersona    = getPersona(bp.topic);
                const bObjective  =
                  OBJECTIVE_BY_ARCHETYPE[bp.archetype] ??
                  `Build authority and drive organic traffic in the ${bp.topic} space.`;
                const bTopicLabel = bp.topic.split(" ").slice(0, 2).join(" ");
                const bSecondaryKws = SECONDARY_KW_SUFFIX_BY_TYPE[bp.type].map(
                  (s) => `${bTopicLabel} ${s}`,
                );
                const bOutline      = OUTLINE_TEMPLATE_BY_TYPE[bp.type](bTopicLabel);
                const bDistribution = DISTRIBUTION_PLAN_BY_TYPE[bp.type];
                const bInternalLinks = bIsLinkedIn
                  ? [
                      `Tag or mention a relevant thought leader in ${bp.topic}`,
                      `Reference a recent FintechPressHub article on ${bp.topic}`,
                      `Link to the most recent guide or whitepaper on ${bp.topic}`,
                    ]
                  : [
                      `Link to the most recent ${bp.topic} case study on the site`,
                      `Link to the services page most closely covering ${bp.topic}`,
                      `Link to the topic hub or pillar page for ${bp.topic}`,
                      `Link to a related roundup or data post on ${bp.topic}`,
                    ];
                const bWriterNotes =
                  bIsLinkedIn
                    ? [
                        "Keep the opening hook to 1–2 lines before the 'see more' break",
                        "Use short paragraphs — 1–2 sentences max for mobile readability",
                        "Include a direct question or prompt to drive comment engagement",
                        `Execute CTA: ${bp.cta}`,
                      ]
                    : bp.type === "guide"
                      ? [
                          "Open with a clear statement of who the guide is for and what problem it solves",
                          "Structure with H2 sections and H3 sub-sections for scannability",
                          "Include at least 3 original data points, charts, or proprietary insights",
                          "Add a downloadable asset or gated resource to support the CTA",
                          "Include a pull quote formatted for LinkedIn repurposing",
                          "Minimum internal links: 3 — see targets below",
                          `Close with CTA: ${bp.cta}`,
                        ]
                      : bp.type === "case-study"
                        ? [
                            "Lead with the headline result (the key metric) in the opening paragraph",
                            "Structure: Challenge → Approach → Results → Takeaways",
                            "Include at least 2 specific, verifiable metrics with source attribution",
                            "Add a client pull quote if available",
                            `Close with CTA: ${bp.cta}`,
                          ]
                        : bp.type === "roundup"
                          ? [
                              "Curate 8–12 high-quality sources with brief editorial commentary on each",
                              "Open with a strong editorial take — not a generic list introduction",
                              "Verify all outbound links open and are not behind paywalls",
                              "Add at least one proprietary insight or original data point to differentiate",
                              `Close with CTA: ${bp.cta}`,
                            ]
                          : [
                              "Open with a strong hook that states the reader's specific problem",
                              "Use H2 subheadings — aim for 4–6 sections minimum",
                              "Include at least 1 original data point, stat, or proprietary insight",
                              "Add a pull quote formatted for LinkedIn repurposing",
                              `Close with CTA: ${bp.cta}`,
                            ];

                const Section = ({
                  icon,
                  title,
                  children,
                  accent = "slate",
                }: {
                  icon: string;
                  title: string;
                  children: React.ReactNode;
                  accent?: string;
                }) => (
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <div className={`flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100`}>
                      <span className="text-sm">{icon}</span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        {title}
                      </span>
                    </div>
                    <div className="px-3 py-3 bg-white">{children}</div>
                  </div>
                );

                return (
                  <>
                    {/* ── Brief AI Score ── */}
                    {(() => {
                      const scores = computeBriefScores(bp, calendar);
                      const dimKeys: (keyof BriefScores)[] = [
                        "seo", "audience", "differentiation", "distribution", "conversion",
                      ];
                      const N   = 5;
                      const cx  = 100, cy = 100, R = 68;
                      const angles = Array.from(
                        { length: N },
                        (_, i) => -Math.PI / 2 + i * (2 * Math.PI / N),
                      );
                      const outerPts = angles.map(
                        (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number],
                      );
                      const scorePts = angles.map(
                        (a, i) => [
                          cx + (scores[dimKeys[i]] / 100) * R * Math.cos(a),
                          cy + (scores[dimKeys[i]] / 100) * R * Math.sin(a),
                        ] as [number, number],
                      );
                      const toPoints = (pts: [number, number][]) =>
                        pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
                      const gridPts  = (pct: number) =>
                        angles.map(
                          (a) => [cx + pct * R * Math.cos(a), cy + pct * R * Math.sin(a)] as [number, number],
                        );
                      const overallScore = Math.round(
                        dimKeys.reduce((sum, k) => sum + scores[k], 0) / N,
                      );
                      const scoreLabel =
                        overallScore >= 80 ? "Publish-Ready" :
                        overallScore >= 65 ? "Needs Review"  : "Needs Work";
                      const scoreLabelCls =
                        overallScore >= 80 ? "bg-emerald-100 text-emerald-700" :
                        overallScore >= 65 ? "bg-amber-100 text-amber-700"     : "bg-rose-100 text-rose-600";
                      const scoreNumCls  =
                        overallScore >= 80 ? "text-emerald-600" :
                        overallScore >= 65 ? "text-amber-600"   : "text-rose-600";

                      return (
                        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 overflow-hidden">
                          {/* Score header */}
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100 bg-white/80">
                            <div className="flex items-center gap-2">
                              <span className="text-sm leading-none">📊</span>
                              <span className="text-[11px] font-bold text-slate-700">
                                Brief Score
                              </span>
                              <span className="text-[9px] text-slate-400">
                                — editorial readiness across 5 dimensions
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[12px] font-bold tabular-nums ${scoreNumCls}`}>
                                {overallScore}/100
                              </span>
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${scoreLabelCls}`}>
                                {scoreLabel}
                              </span>
                            </div>
                          </div>

                          {/* Radar + bars */}
                          <div className="flex gap-4 p-4 items-center">
                            {/* SVG radar */}
                            <svg
                              viewBox="0 0 200 200"
                              className="w-32 h-32 shrink-0"
                              aria-hidden="true"
                            >
                              {/* Reference grid */}
                              {([0.33, 0.66, 1] as number[]).map((pct, gi) => (
                                <polygon
                                  key={gi}
                                  points={toPoints(gridPts(pct))}
                                  fill="none"
                                  stroke={pct === 1 ? "#c7d2fe" : "#e0e7ff"}
                                  strokeWidth={pct === 1 ? "1" : "0.7"}
                                />
                              ))}
                              {/* Axis lines */}
                              {outerPts.map(([x, y], i) => (
                                <line
                                  key={i}
                                  x1={cx}
                                  y1={cy}
                                  x2={x.toFixed(1)}
                                  y2={y.toFixed(1)}
                                  stroke="#e0e7ff"
                                  strokeWidth="0.7"
                                />
                              ))}
                              {/* Score polygon */}
                              <polygon
                                points={toPoints(scorePts)}
                                fill="rgba(99,102,241,0.18)"
                                stroke="rgb(99,102,241)"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                              {/* Score dots */}
                              {scorePts.map(([x, y], i) => (
                                <circle
                                  key={i}
                                  cx={x.toFixed(1)}
                                  cy={y.toFixed(1)}
                                  r="3"
                                  fill="rgb(99,102,241)"
                                />
                              ))}
                              {/* Icon labels on axes */}
                              {outerPts.map(([x, y], i) => {
                                const offset = 13;
                                const lx = cx + (R + offset) * Math.cos(angles[i]);
                                const ly = cy + (R + offset) * Math.sin(angles[i]);
                                return (
                                  <text
                                    key={i}
                                    x={lx.toFixed(1)}
                                    y={ly.toFixed(1)}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="11"
                                  >
                                    {SCORE_DIMENSION_META[i].icon}
                                  </text>
                                );
                              })}
                            </svg>

                            {/* Dimension rows */}
                            <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                              {SCORE_DIMENSION_META.map((dim) => {
                                const s = scores[dim.key];
                                const barCls =
                                  s >= 80 ? "text-emerald-600" :
                                  s >= 60 ? "text-amber-600"   : "text-rose-500";
                                return (
                                  <div key={dim.key}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[9.5px] font-bold text-slate-600">
                                        {dim.label}
                                      </span>
                                      <span className={`text-[9px] font-bold tabular-nums ${barCls}`}>
                                        {s}
                                      </span>
                                    </div>
                                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${dim.color} transition-all`}
                                        style={{ width: `${s}%` }}
                                      />
                                    </div>
                                    <p className="text-[8.5px] text-slate-400 mt-0.5 leading-snug">
                                      {dim.feedback(s)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Working title */}
                    <div className="px-1">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        Working Title
                      </p>
                      <p className="text-[13px] font-bold text-slate-800 leading-snug">
                        {bp.angle}
                      </p>
                    </div>

                    {/* Meta strip */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Publish Date",   value: `${bp.date} · Wk ${bp.week}` },
                        { label: "Word Count",      value: bWordCount },
                        { label: "Priority Score",  value: `${bp.priorityScore} / 100` },
                        { label: "Search Volume",   value: bp.searchVolume },
                        { label: "Keyword Diff.",   value: `${bp.topicDifficulty} / 100` },
                        { label: "Search Intent",   value: bp.searchIntent },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2"
                        >
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">
                            {label}
                          </p>
                          <p className="text-[10.5px] font-semibold text-slate-700 mt-0.5 leading-snug">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Persona */}
                    <Section icon="👤" title="Target Persona">
                      <p className="text-[11px] font-bold text-slate-800">
                        {bPersona.title}
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                        {bPersona.role}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {bPersona.painPoints.map((pt) => (
                          <span
                            key={pt}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
                          >
                            {pt}
                          </span>
                        ))}
                      </div>
                    </Section>

                    {/* Objective */}
                    <Section icon="🎯" title="Content Objective">
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {bObjective}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-50">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Archetype
                        </p>
                        <p className="text-[10.5px] text-slate-600 leading-snug">
                          <span className="font-bold">{bp.archetype}</span> —{" "}
                          {bRationale}
                        </p>
                      </div>
                    </Section>

                    {/* SEO Keywords */}
                    <Section icon="🔍" title="SEO Keywords">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 shrink-0 mt-0.5">
                            Primary
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800">
                            {bp.topic}
                          </span>
                        </div>
                        {bSecondaryKws.map((kw) => (
                          <div key={kw} className="flex items-start gap-2">
                            <span className="text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 shrink-0 mt-0.5">
                              Secondary
                            </span>
                            <span className="text-[10.5px] text-slate-600">
                              {kw}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Suggested Outline */}
                    <Section icon="📐" title="Suggested Outline">
                      <ol className="space-y-1">
                        {bOutline.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[9px] font-bold text-slate-300 w-4 shrink-0 mt-0.5">
                              {i + 1}.
                            </span>
                            <span className="text-[10.5px] text-slate-700 leading-snug">
                              {h.replace(/^#+\s*/, "")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </Section>

                    {/* Distribution Plan */}
                    <Section icon="📣" title="Distribution Plan">
                      <div className="space-y-2">
                        {bDistribution.map(({ channel, action }) => (
                          <div key={channel} className="flex items-start gap-2">
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap mt-0.5">
                              {channel}
                            </span>
                            <span className="text-[10.5px] text-slate-600 leading-snug">
                              {action}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Internal Links */}
                    <Section icon="🔗" title="Internal Link Targets">
                      <ul className="space-y-1.5">
                        {bInternalLinks.map((link, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-slate-300 mt-0.5 shrink-0">☐</span>
                            <span className="text-[10.5px] text-slate-600 leading-snug">
                              {link}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>

                    {/* Writer Notes */}
                    <Section icon="📝" title="Writer Notes">
                      <ul className="space-y-1.5">
                        {bWriterNotes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-300 mt-0.5 shrink-0">→</span>
                            <span className="text-[10.5px] text-slate-700 leading-snug">
                              {note}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>

                    {/* CTA */}
                    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                      <span className="text-sm shrink-0">📢</span>
                      <div>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">
                          Call to Action
                        </p>
                        <p className="text-[11px] font-semibold text-indigo-800 mt-0.5">
                          {bp.cta}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <p className="text-[9px] text-slate-300 text-center pb-1">
                      Generated by FintechPressHub Content Calendar Generator
                      — use "Copy to Notion" to export as markdown
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
