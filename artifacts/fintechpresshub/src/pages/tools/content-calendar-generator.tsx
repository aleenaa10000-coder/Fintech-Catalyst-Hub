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
};

const SEARCH_VOLUME_TABLE: Record<string, VolumeEntry> = {
  "embedded finance":        { range: "5K–12K/mo",   tier: "medium" },
  "open banking":            { range: "18K–40K/mo",  tier: "high"   },
  "fintech regulation":      { range: "3K–8K/mo",    tier: "medium" },
  "crypto & web3":           { range: "50K–150K/mo", tier: "high"   },
  "crypto":                  { range: "200K+/mo",    tier: "high"   },
  "web3":                    { range: "40K–90K/mo",  tier: "high"   },
  "bnpl trends":             { range: "2K–6K/mo",    tier: "low"    },
  "bnpl":                    { range: "8K–20K/mo",   tier: "medium" },
  "buy now pay later":       { range: "10K–25K/mo",  tier: "high"   },
  "neobanks":                { range: "8K–20K/mo",   tier: "medium" },
  "neobank":                 { range: "10K–25K/mo",  tier: "high"   },
  "payments innovation":     { range: "1K–3K/mo",    tier: "low"    },
  "digital payments":        { range: "30K–70K/mo",  tier: "high"   },
  "ai in lending":           { range: "2K–5K/mo",    tier: "low"    },
  "ai in fintech":           { range: "8K–18K/mo",   tier: "medium" },
  "financial inclusion":     { range: "4K–10K/mo",   tier: "medium" },
  "insurtech":               { range: "6K–15K/mo",   tier: "medium" },
  "regtech":                 { range: "3K–7K/mo",    tier: "medium" },
  "defi":                    { range: "40K–100K/mo", tier: "high"   },
  "decentralized finance":   { range: "12K–30K/mo",  tier: "high"   },
  "fintech seo":             { range: "500–2K/mo",   tier: "low"    },
  "content marketing":       { range: "30K–80K/mo",  tier: "high"   },
  "link building":           { range: "20K–50K/mo",  tier: "high"   },
  "fintech marketing":       { range: "3K–8K/mo",    tier: "medium" },
  "challenger bank":         { range: "5K–12K/mo",   tier: "medium" },
  "payment gateway":         { range: "40K–90K/mo",  tier: "high"   },
  "blockchain":              { range: "100K+/mo",    tier: "high"   },
  "wealthtech":              { range: "2K–5K/mo",    tier: "low"    },
  "robo advisor":            { range: "12K–30K/mo",  tier: "high"   },
  "lendtech":                { range: "1K–3K/mo",    tier: "low"    },
  "paytech":                 { range: "1K–3K/mo",    tier: "low"    },
  "banking as a service":    { range: "6K–14K/mo",   tier: "medium" },
  "baas":                    { range: "4K–9K/mo",    tier: "medium" },
  "kyc compliance":          { range: "8K–18K/mo",   tier: "medium" },
  "aml compliance":          { range: "10K–22K/mo",  tier: "high"   },
  "fraud prevention":        { range: "15K–35K/mo",  tier: "high"   },
  "api banking":             { range: "3K–7K/mo",    tier: "medium" },
  "fintech startup":         { range: "8K–18K/mo",   tier: "medium" },
  "digital banking":         { range: "25K–60K/mo",  tier: "high"   },
  "cross-border payments":   { range: "5K–12K/mo",   tier: "medium" },
  "cbdc":                    { range: "10K–25K/mo",  tier: "high"   },
  "stablecoin":              { range: "20K–50K/mo",  tier: "high"   },
  "lending technology":      { range: "3K–7K/mo",    tier: "medium" },
  "alternative lending":     { range: "4K–9K/mo",    tier: "medium" },
  "financial technology":    { range: "20K–50K/mo",  tier: "high"   },
};

function getSearchVolume(topic: string): VolumeEntry {
  const key = topic.toLowerCase().trim();
  return SEARCH_VOLUME_TABLE[key] ?? { range: "< 500/mo", tier: "unknown" };
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
    seo: "A Practical Framework for {topic} That Actually Works",
    hook: "Most fintechs over-complicate {topic}. Here's the exact framework that works:",
  },
  {
    name: "The Comparison",
    seo: "{topic} vs. Traditional Alternatives: What Founders Need to Know in {year}",
    hook: "I compared {topic} against the old way of doing things. The results surprised me.",
  },
  {
    name: "The Trend Analysis",
    seo: "Why {topic} is the Key to Fintech Growth in {year}",
    hook: "Hot take: {topic} will be the #1 growth lever for fintech in {year}. Here's the data:",
  },
  {
    name: "The Data Dive",
    seo: "Breaking Down the ROI of {topic} for Fintech Brands",
    hook: "We analysed 50+ fintech brands using {topic}. The ROI numbers were staggering:",
  },
  {
    name: "The Contrarian",
    seo: "Why {topic} is Being Disrupted (And What to Do About It)",
    hook: "Unpopular opinion: the way most fintechs approach {topic} is fundamentally broken.",
  },
  {
    name: "The How-To",
    seo: "How to Leverage {topic} to Scale Your Fintech in {year}",
    hook: "The {topic} strategy that took us from zero to 10K organic visitors. Step by step:",
  },
  {
    name: "The Listicle",
    seo: "5 Ways {topic} is Reshaping Fintech — and What CMOs Must Do Now",
    hook: "5 things I wish I knew about {topic} before we started. Number 3 changes everything.",
  },
  {
    name: "The Deep Dive",
    seo: "The State of {topic} in {year}: What High-Authority Fintechs Already Know",
    hook: "I spent 3 months studying how elite fintechs use {topic}. Here's what I found:",
  },
  {
    name: "The Warning",
    seo: "The Biggest Mistakes Fintechs Make with {topic} (And How to Avoid Them)",
    hook: "Most fintechs get {topic} wrong. Are you one of them? A brutally honest breakdown:",
  },
  {
    name: "The Future",
    seo: "The Future of {topic} in Fintech: Predictions and Opportunities for {year}",
    hook: "{topic} is about to change. Here are the 3 things that will matter most in {year}:",
  },
  {
    name: "The Authority Guide",
    seo: "The Ultimate Guide to {topic} for Ambitious Fintech Brands",
    hook: "Everything I know about {topic}, distilled into one post. Save this for later:",
  },
  {
    name: "The Case Study",
    seo: "How Leading Fintechs Are Winning with {topic}: Real Examples and Takeaways",
    hook: "We helped a Series B fintech 3x their pipeline using {topic}. The exact playbook:",
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

  // Deduplication: track used titles globally and per-30-day window
  const usedTitlesGlobal = new Set<string>();
  // Track archetype index per 30-day window (cycle of 30 posts)
  // This guarantees rotation of ≥ 8 archetypes per cycle
  const CYCLE_SIZE = 30;

  let postCount = 0;
  let weekOffset = 0;

  while (postCount < totalPosts) {
    for (const day of selectedDays) {
      if (postCount >= totalPosts) break;

      const d = new Date(startDate);
      d.setDate(d.getDate() + weekOffset * 7 + (day - 1));

      const publishYear = d.getFullYear();
      const topic = topics[postCount % topics.length];

      // Archetype index rotates within each 30-post cycle
      const cyclePosition = postCount % CYCLE_SIZE;
      const archetypeIndex = cyclePosition % ARCHETYPES.length;
      const archetype = ARCHETYPES[archetypeIndex];

      // Determine content type
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

      const isLinkedIn = type === "linkedin";

      // Build title — try up to ARCHETYPES.length variations to avoid duplicates
      let title = "";
      let chosenArchetype = archetype;
      let attemptOffset = 0;

      while (attemptOffset < ARCHETYPES.length) {
        const candidate = buildTitle(
          ARCHETYPES[(archetypeIndex + attemptOffset) % ARCHETYPES.length],
          topic,
          publishYear,
          type,
          isLinkedIn,
        );
        if (!usedTitlesGlobal.has(candidate.toLowerCase())) {
          title = candidate;
          chosenArchetype = ARCHETYPES[(archetypeIndex + attemptOffset) % ARCHETYPES.length];
          break;
        }
        attemptOffset++;
      }

      // Final fallback: append post index to guarantee uniqueness
      if (!title) {
        title = buildTitle(archetype, topic, publishYear, type, isLinkedIn) +
          ` — Part ${Math.floor(postCount / ARCHETYPES.length) + 1}`;
      }

      usedTitlesGlobal.add(title.toLowerCase());

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
        searchVolume: getSearchVolume(topic).range,
      });

      postCount++;
    }
    weekOffset++;
  }

  return entries;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(entries: CalendarEntry[], companyName: string) {
  const header = "Week,Date,Topic,Est. Monthly Search Volume,Working Title,Archetype,Content Type,Search Intent,CTA\n";
  const rows = entries
    .map(
      (e) =>
        `${e.week},"${e.date}","${e.topic}","${e.searchVolume}","${e.angle}","${e.archetype}","${FORMAT_LABEL[e.type]}","${e.searchIntent}","${e.cta}"`,
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
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentCalendarGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

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
  };

  const generate = () => {
    const result = buildCalendar(form);
    setCalendar(result);
    setGenerated(true);
  };

  const copyAsText = () => {
    const text = calendar
      .map(
        (e) =>
          `Week ${e.week} | ${e.date} | ${e.topic} | ${e.angle} | ${FORMAT_LABEL[e.type]} | Intent: ${e.searchIntent} | CTA: ${e.cta}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedByWeek = calendar.reduce<Record<number, CalendarEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.week]) acc[entry.week] = [];
      acc[entry.week].push(entry);
      return acc;
    },
    {},
  );

  // Count unique archetypes used — shown as a quality signal
  const archetypesUsed = new Set(calendar.map((e) => e.archetype)).size;

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

              {/* ── Search Volume Estimator panel ─────────────────────── */}
              {form.topics.length > 0 && (
                <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-semibold text-indigo-900">
                      Search Volume Estimates
                    </span>
                    <span className="text-[11px] text-indigo-500 ml-1">
                      — monthly global, sourced from public SEO tools
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {form.topics.map((t) => {
                      const vol = getSearchVolume(t);
                      return (
                        <div
                          key={t}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white border border-indigo-100 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {t}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIER_STYLE[vol.tier]}`}
                            >
                              {vol.range}
                            </span>
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              {TIER_LABEL[vol.tier]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-indigo-400 mt-2.5 leading-relaxed">
                    Estimates are indicative ranges, not guaranteed figures. Actual
                    search volume varies by region, seasonality, and keyword match
                    type. Use as a directional signal when prioritising topics.
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
                      Your {form.timeframe}-Day Calendar — {calendar.length}{" "}
                      pieces of content
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
                      onClick={() => exportCSV(calendar, form.companyName)}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Calendar rows grouped by week */}
                {Object.entries(groupedByWeek).map(([week, entries]) => (
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
