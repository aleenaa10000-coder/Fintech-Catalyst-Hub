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
      const topic = topics[postCount % topics.length];

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

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(entries: CalendarEntry[], companyName: string) {
  const header = "Week,Date,Topic,Est. Monthly Search Volume,Topic Difficulty (KD),Priority Score,Working Title,Archetype,Content Type,Search Intent,CTA\n";
  const rows = entries
    .map(
      (e) =>
        `${e.week},"${e.date}","${e.topic}","${e.searchVolume}","${e.topicDifficulty} / 100 — ${kdLabel(e.topicDifficulty)}","${e.priorityScore} / 100 — ${priorityLabel(e.priorityScore)}","${e.angle}","${e.archetype}","${FORMAT_LABEL[e.type]}","${e.searchIntent}","${e.cta}"`,
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
    `| **CTA** | ${entry.cta} |`,
    ``,
    `---`,
    ``,
    `## 🎯 Archetype Rationale`,
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

  // Content type breakdown for the mix chart
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
                      title="Copy as a Markdown table — paste directly into any Notion page or database"
                    >
                      {copiedNotion ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Pasted!
                        </>
                      ) : (
                        <>
                          <Table2 className="w-4 h-4" />
                          Notion
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
                                <span className="text-xs text-muted-foreground">
                                  Topic:{" "}
                                  <span className="font-medium text-slate-600">
                                    {entry.topic}
                                  </span>
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
                                title="Open editorial brief"
                                className="text-slate-300 hover:text-indigo-500 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
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
                                    <span className="text-xs text-muted-foreground">
                                      Topic:{" "}
                                      <span className="font-medium text-slate-600">
                                        {entry.topic}
                                      </span>
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
                                    title="Open editorial brief"
                                    className="text-slate-300 hover:text-indigo-500 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </>
                )}

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

                <Card className="border border-indigo-100 bg-indigo-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Need a team to execute this calendar?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-indigo-900"
                      >
                        See our content services
                      </Link>{" "}
                      or{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-indigo-900"
                      >
                        get a free strategy call
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
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <pre className="text-[11.5px] leading-relaxed text-slate-700 font-mono whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-4">
                {generateBrief(briefEntry)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
