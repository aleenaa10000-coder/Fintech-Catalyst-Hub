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
  type: ContentType;
  cta: string;
};

const ANGLES = [
  "The ultimate guide to",
  "How to leverage",
  "Why {topic} matters for fintech in 2025",
  "{topic}: what founders need to know",
  "The state of",
  "5 ways {topic} is reshaping fintech",
  "What every fintech CMO should know about",
  "Breaking down the ROI of",
  "A practical framework for",
  "Case study: how top fintechs are winning with",
  "The biggest mistakes in",
  "Future of",
];

const CTAS = [
  "Link to your services page",
  "Invite readers to book a strategy call",
  "Promote your newsletter",
  "Link to a related blog post",
  "Invite guest post pitches",
  "Share your case study",
  "Offer a free audit",
  "Link to pricing page",
];

function buildCalendar(form: FormState): CalendarEntry[] {
  const days = parseInt(form.timeframe);
  const postsPerWeek = CADENCE_POSTS_PER_WEEK[form.cadence];
  const totalPosts = Math.round((days / 7) * postsPerWeek);

  const topics =
    form.topics.length > 0
      ? form.topics
      : ["Fintech SEO", "Content marketing", "Link building"];

  const entries: CalendarEntry[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  const dayOfWeek = startDate.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  startDate.setDate(startDate.getDate() + (dayOfWeek === 1 ? 0 : daysUntilMonday));

  const publishDays: Record<Cadence, number[]> = {
    weekly: [1],
    "2x-week": [1, 4],
    "3x-week": [1, 3, 5],
    daily: [1, 2, 3, 4, 5],
  };

  const selectedDays = publishDays[form.cadence];

  let postCount = 0;
  let weekOffset = 0;

  while (postCount < totalPosts) {
    for (const day of selectedDays) {
      if (postCount >= totalPosts) break;

      const d = new Date(startDate);
      d.setDate(d.getDate() + weekOffset * 7 + (day - 1));

      const topic = topics[postCount % topics.length];
      const angleTemplate = ANGLES[postCount % ANGLES.length];
      const angle = angleTemplate.includes("{topic}")
        ? angleTemplate.replace("{topic}", topic)
        : `${angleTemplate} ${topic}`;

      let type: ContentType;
      if (form.format === "blog") {
        type = postCount % 4 === 3 ? "guide" : postCount % 5 === 4 ? "roundup" : "blog";
      } else if (form.format === "linkedin") {
        type = "linkedin";
      } else {
        const cycle = postCount % 3;
        type = cycle === 0 ? "blog" : cycle === 1 ? "linkedin" : postCount % 6 === 5 ? "case-study" : "blog";
      }

      entries.push({
        week: Math.floor(postCount / postsPerWeek) + 1,
        date: d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        topic,
        angle,
        type,
        cta: CTAS[postCount % CTAS.length],
      });

      postCount++;
    }
    weekOffset++;
  }

  return entries;
}

function exportCSV(entries: CalendarEntry[], companyName: string) {
  const header = "Week,Date,Topic,Working Title,Content Type,CTA\n";
  const rows = entries
    .map(
      (e) =>
        `${e.week},"${e.date}","${e.topic}","${e.angle}","${FORMAT_LABEL[e.type]}","${e.cta}"`,
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

const TYPE_COLOR: Record<ContentType, string> = {
  blog: "bg-blue-50 text-blue-700 border-blue-200",
  linkedin: "bg-sky-50 text-sky-700 border-sky-200",
  roundup: "bg-purple-50 text-purple-700 border-purple-200",
  "case-study": "bg-amber-50 text-amber-700 border-amber-200",
  guide: "bg-green-50 text-green-700 border-green-200",
};

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
          `Week ${e.week} | ${e.date} | ${e.topic} | ${e.angle} | ${FORMAT_LABEL[e.type]}`,
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Your {form.timeframe}-Day Calendar — {calendar.length}{" "}
                    pieces of content
                  </h3>
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
                              <p className="text-xs text-muted-foreground">
                                Topic:{" "}
                                <span className="font-medium text-slate-600">
                                  {entry.topic}
                                </span>{" "}
                                · CTA: {entry.cta}
                              </p>
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
