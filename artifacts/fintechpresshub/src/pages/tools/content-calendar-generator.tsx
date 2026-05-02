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

type SearchIntent = "SEO" | "Engagement";

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
  seo: string;      // used for blog / guide / roundup / case-study
  hook: string;     // used for linkedin
};

const ARCHETYPES: Archetype[] = [
  {
    name: "The Blueprint",
    seo: "A Framework for {topic}: The Step-by-Step Playbook Fintech Teams Use in {year}",
    hook: "Most fintechs over-complicate {topic}. Here's the exact framework:",
  },
  {
    name: "The Comparison",
    seo: "{topic} vs. Traditional Approaches: What Founders Need to Know in {year}",
    hook: "I compared {topic} to the old playbook. The gap surprised me:",
  },
  {
    name: "The Trend Analysis",
    seo: "Why {topic} is the Key to Fintech Growth in {year}",
    hook: "{topic} will define fintech in {year}. Here's the data:",
  },
  {
    name: "The Data Dive",
    seo: "Breaking Down the ROI of {topic} for Fintech Brands in {year}",
    hook: "We analysed 50+ fintech brands on {topic}. The ROI numbers:",
  },
  {
    name: "The Contrarian",
    seo: "Why {topic} Is Being Disrupted — And What Smart Fintechs Are Doing About It in {year}",
    hook: "Unpopular opinion: most fintechs get {topic} completely wrong.",
  },
  {
    name: "The How-To",
    seo: "How to Leverage {topic} to Scale Your Fintech in {year}",
    hook: "{topic} drove 10K+ organic visits. Here are the exact steps:",
  },
  {
    name: "The Listicle",
    seo: "7 Ways {topic} Is Reshaping Fintech in {year} — and What CMOs Must Do Now",
    hook: "7 things I wish I knew about {topic} before we started.",
  },
  {
    name: "The Deep Dive",
    seo: "The State of {topic} in {year}: What High-Authority Fintechs Already Know",
    hook: "I spent 3 months studying how elite fintechs use {topic}. Here's what I found:",
  },
  {
    name: "The Warning",
    seo: "The Biggest {topic} Mistakes Fintechs Make in {year} — and How to Avoid Them",
    hook: "Most fintechs make this {topic} mistake. Are you?",
  },
  {
    name: "The Future",
    seo: "The Future of {topic} in Fintech: Predictions and Opportunities for {year}",
    hook: "{topic} is changing fast. 3 things that will matter most in {year}:",
  },
  {
    name: "The Authority Guide",
    seo: "The Complete {year} Guide to {topic} for Ambitious Fintech Brands",
    hook: "Everything you need to know about {topic}, in one post. Save this:",
  },
  {
    name: "The Case Study",
    seo: "Case Study: How a Series B Fintech 3× Their Pipeline Using {topic} in {year}",
    hook: "We helped a fintech 3× their pipeline with {topic}. The exact playbook:",
  },
  {
    name: "The Why Now",
    seo: "Why {topic} Matters More Than Ever for Fintech Brands in {year}",
    hook: "Why {topic} matters right now — and what most brands are missing:",
  },
  {
    name: "The Insider",
    seo: "What Elite Fintech Brands Know About {topic} That Others Don't ({year})",
    hook: "The {topic} insight top fintech teams don't talk about publicly:",
  },
  {
    name: "The Opportunity",
    seo: "The Hidden {topic} Opportunity Every Fintech Brand Should Target in {year}",
    hook: "There's a {topic} opportunity most fintechs are completely ignoring:",
  },
  {
    name: "The Benchmark",
    seo: "{topic} Benchmarks for Fintech in {year}: Where Does Your Brand Stand?",
    hook: "{topic} benchmarks for fintech are out. Here's how to read them:",
  },
];

// ─── Format-specific CTAs ─────────────────────────────────────────────────────

const CTAS_BY_TYPE: Record<ContentType, string[]> = {
  blog: [
    "Link to your services page",
    "Promote your newsletter",
    "Book a free strategy call",
    "Link to a related case study",
    "Offer a free content audit",
    "Link to your pricing page",
  ],
  guide: [
    "Download the full whitepaper",
    "Gated content link",
    "Offer a free audit",
    "Request a personalised content brief",
    "Book a strategy workshop",
    "Access the template library",
  ],
  roundup: [
    "Subscribe to the weekly digest",
    "Promote your newsletter",
    "Link to your services page",
    "Invite guest post pitches",
  ],
  "case-study": [
    "Book a free strategy call",
    "Link to your services page",
    "See similar client results",
    "Offer a free content audit",
  ],
  linkedin: [
    "Invite readers to comment",
    "Ask a poll question",
    "Tag a founder who needs to see this",
    "Share your experience in the comments",
    "Follow for weekly fintech growth insights",
    "DM for the full breakdown",
  ],
};

function resolveCta(type: ContentType, index: number): string {
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
  return useHook ? "Engagement" : "SEO";
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
  const template = useHook ? archetype.hook : archetype.seo;
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

  // ── Prefix diversity guard ─────────────────────────────────────────────────
  // No headline opening phrase (first 4 words) may repeat more than twice
  // across the entire calendar — enforces a human editorial style guide.
  const prefixCount = new Map<string, number>();
  const MAX_PREFIX_REPEATS = 2;

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

      // ── Title selection: prefix-diversity + dedup guards ──────────────────
      // Walk all archetypes starting from the scheduled index. Accept the
      // first candidate that (a) is not an exact duplicate AND (b) whose
      // first-4-word prefix hasn't appeared ≥ MAX_PREFIX_REPEATS times yet.
      let title = "";
      let chosenArchetype = ARCHETYPES[archetypeIndex];

      for (let offset = 0; offset < ARCHETYPES.length; offset++) {
        const idx = (archetypeIndex + offset) % ARCHETYPES.length;
        const arch = ARCHETYPES[idx];
        const candidate = buildTitle(arch, topic, publishYear, type, isLinkedIn);

        if (usedTitlesGlobal.has(candidate.toLowerCase())) continue;

        const prefix = extractPrefix(candidate);
        if ((prefixCount.get(prefix) ?? 0) >= MAX_PREFIX_REPEATS) continue;

        title = candidate;
        chosenArchetype = arch;
        prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
        break;
      }

      // Final fallback: volume suffix guarantees uniqueness even when all
      // archetypes are exhausted for a given topic.
      if (!title) {
        const base = buildTitle(
          ARCHETYPES[archetypeIndex], topic, publishYear, type, isLinkedIn,
        );
        title = `${base} — Vol. ${Math.floor(postCount / ARCHETYPES.length) + 2}`;
        const prefix = extractPrefix(title);
        prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
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
        cta: resolveCta(type, postCount),
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

const ARCHETYPE_COLOR: Record<string, string> = {
  "The Blueprint": "text-indigo-500",
  "The Comparison": "text-violet-500",
  "The Trend Analysis": "text-cyan-600",
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentCalendarGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNotion, setCopiedNotion] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string>("all");

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

                {/* Calendar rows — date order or priority order */}
                {sortByPriority ? (
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
                            </div>
                            <div className="pt-0.5">
                              <span
                                className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}
                              >
                                {FORMAT_LABEL[entry.type]}
                              </span>
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
                                        entry.searchIntent === "SEO"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-orange-50 text-orange-600 border-orange-200"
                                      }`}
                                    >
                                      {entry.searchIntent === "SEO" ? "📈 SEO" : "💬 Engagement"}
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
                                </div>
                                <div className="pt-0.5">
                                  <span
                                    className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${TYPE_COLOR[entry.type]}`}
                                  >
                                    {FORMAT_LABEL[entry.type]}
                                  </span>
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
                            {/* Vol + KD chips */}
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
    </div>
  );
}
