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

type CalendarEntry = {
  week: number;
  date: string;
  topic: string;
  angle: string;
  archetype: string;
  type: ContentType;
  cta: string;
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
      });

      postCount++;
    }
    weekOffset++;
  }

  return entries;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(entries: CalendarEntry[], companyName: string) {
  const header = "Week,Date,Topic,Working Title,Archetype,Content Type,CTA\n";
  const rows = entries
    .map(
      (e) =>
        `${e.week},"${e.date}","${e.topic}","${e.angle}","${e.archetype}","${FORMAT_LABEL[e.type]}","${e.cta}"`,
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
          `Week ${e.week} | ${e.date} | ${e.topic} | ${e.angle} | ${FORMAT_LABEL[e.type]} | CTA: ${e.cta}`,
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

                {/* Selected topics */}
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
                                <span className="text-xs text-muted-foreground">
                                  Topic:{" "}
                                  <span className="font-medium text-slate-600">
                                    {entry.topic}
                                  </span>
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
