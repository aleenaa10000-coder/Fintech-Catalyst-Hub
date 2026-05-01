import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart2,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";

type Intent = "Informational" | "Commercial" | "Transactional" | "Navigational";

type Result = {
  keyword: string;
  score: number;
  label: string;
  intent: Intent;
  intentReason: string;
  volumeRange: string;
  longTails: string[];
  tips: string[];
};

const HIGH_COMPETITION_SIGNALS = [
  "best", "top", "review", "vs", "compare", "alternative", "price", "cost",
  "buy", "cheap", "free", "tool", "software", "platform", "service", "agency",
  "company", "provider", "solution",
];

const INFORMATIONAL_SIGNALS = [
  "what", "how", "why", "when", "who", "guide", "tutorial", "learn",
  "explained", "definition", "meaning", "difference", "examples", "tips",
  "strategies", "benefits", "pros", "cons",
];

const TRANSACTIONAL_SIGNALS = [
  "buy", "price", "pricing", "cost", "hire", "get", "sign up", "subscribe",
  "download", "free trial", "demo", "quote", "discount", "deal",
];

const COMMERCIAL_SIGNALS = [
  "best", "top", "review", "reviews", "vs", "compare", "comparison",
  "alternative", "alternatives", "recommendation", "rated",
];

const NAVIGATIONAL_SIGNALS = [
  "login", "log in", "sign in", "dashboard", "account", "portal", "app",
  "website", "official",
];

const FINTECH_LONG_TAIL_TEMPLATES = [
  "{kw} for startups",
  "{kw} in 2025",
  "best {kw} for fintech",
  "how to use {kw}",
  "{kw} explained for beginners",
  "{kw} vs {kw} alternatives",
  "{kw} benefits and drawbacks",
  "{kw} case study",
  "{kw} for small businesses",
  "{kw} tools and platforms",
  "what is {kw}",
  "{kw} strategy guide",
];

function detectIntent(words: string[]): { intent: Intent; reason: string } {
  const joined = words.join(" ");

  for (const s of NAVIGATIONAL_SIGNALS) {
    if (joined.includes(s))
      return {
        intent: "Navigational",
        reason: `Contains "${s}" — user likely looking for a specific brand or page.`,
      };
  }
  for (const s of TRANSACTIONAL_SIGNALS) {
    if (joined.includes(s))
      return {
        intent: "Transactional",
        reason: `Contains "${s}" — user is ready to take action or make a purchase.`,
      };
  }
  for (const s of COMMERCIAL_SIGNALS) {
    if (joined.includes(s))
      return {
        intent: "Commercial",
        reason: `Contains "${s}" — user is comparing options before deciding.`,
      };
  }
  for (const s of INFORMATIONAL_SIGNALS) {
    if (words.includes(s))
      return {
        intent: "Informational",
        reason: `Contains "${s}" — user is researching or learning about the topic.`,
      };
  }

  if (words.length <= 2)
    return {
      intent: "Informational",
      reason: "Short head term — typically broad informational intent.",
    };

  return {
    intent: "Informational",
    reason: "No strong intent signals found — assumed informational.",
  };
}

function estimateDifficulty(keyword: string): Result {
  const kw = keyword.trim().toLowerCase();
  const words = kw.split(/\s+/);
  const wordCount = words.length;

  let score = 50;

  // Shorter keywords → harder
  if (wordCount === 1) score += 30;
  else if (wordCount === 2) score += 15;
  else if (wordCount === 3) score += 5;
  else if (wordCount >= 4) score -= 10;
  else if (wordCount >= 6) score -= 20;

  // High-competition words boost difficulty
  const highCompHits = words.filter((w) =>
    HIGH_COMPETITION_SIGNALS.includes(w),
  ).length;
  score += highCompHits * 8;

  // Long-tail question words → easier
  const infoHits = words.filter((w) => INFORMATIONAL_SIGNALS.includes(w)).length;
  score -= infoHits * 6;

  // "Fintech" specificity gives slight boost (niche but competitive)
  if (kw.includes("fintech")) score += 5;

  // Clamp
  score = Math.max(5, Math.min(97, Math.round(score)));

  const label =
    score >= 75
      ? "Very Hard"
      : score >= 55
        ? "Hard"
        : score >= 35
          ? "Medium"
          : score >= 20
            ? "Easy"
            : "Very Easy";

  const volumeRange =
    wordCount === 1
      ? "10K–100K/mo"
      : wordCount === 2
        ? "1K–10K/mo"
        : wordCount === 3
          ? "100–1K/mo"
          : wordCount >= 4
            ? "10–500/mo"
            : "< 100/mo";

  const { intent, reason: intentReason } = detectIntent(words);

  // Generate long-tail suggestions
  const baseKw = words
    .filter((w) => !INFORMATIONAL_SIGNALS.includes(w))
    .join(" ")
    .trim() || kw;

  const longTails = FINTECH_LONG_TAIL_TEMPLATES.slice(0, 6).map((t) =>
    t.replace(/\{kw\}/g, baseKw),
  );

  const tips: string[] = [];
  if (score >= 70) {
    tips.push(
      "This is a highly competitive keyword. Build topical authority with a cluster of supporting articles first.",
    );
    tips.push(
      "Target long-tail variations (see suggestions below) while you work toward ranking for this head term.",
    );
    tips.push(
      "Invest in high-authority link building — you'll need strong backlink equity to compete.",
    );
  } else if (score >= 45) {
    tips.push(
      "Moderate competition — a well-structured, in-depth article has a good chance of ranking.",
    );
    tips.push(
      "Include data, original examples, and expert quotes to differentiate from existing results.",
    );
    tips.push(
      "Internal linking from related posts will accelerate your ranking for this term.",
    );
  } else {
    tips.push(
      "Low competition — a single well-optimised article could rank within weeks.",
    );
    tips.push(
      "Focus on comprehensive coverage: answer every related question in one piece.",
    );
    tips.push(
      "Add this to your content calendar now — low-hanging fruit doesn't stay that way.",
    );
  }

  return {
    keyword: keyword.trim(),
    score,
    label,
    intent,
    intentReason,
    volumeRange,
    longTails,
    tips,
  };
}

const SCORE_COLOR = (score: number) =>
  score >= 75
    ? "text-red-600"
    : score >= 55
      ? "text-orange-500"
      : score >= 35
        ? "text-amber-500"
        : "text-green-600";

const SCORE_BG = (score: number) =>
  score >= 75
    ? "bg-red-50 border-red-200"
    : score >= 55
      ? "bg-orange-50 border-orange-200"
      : score >= 35
        ? "bg-amber-50 border-amber-200"
        : "bg-green-50 border-green-200";

const INTENT_COLOR: Record<Intent, string> = {
  Informational: "bg-blue-50 text-blue-700 border-blue-200",
  Commercial: "bg-purple-50 text-purple-700 border-purple-200",
  Transactional: "bg-green-50 text-green-700 border-green-200",
  Navigational: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function KeywordDifficultyEstimator() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const reset = () => {
    setKeyword("");
    setResult(null);
  };

  const analyse = () => {
    if (!keyword.trim()) return;
    setResult(estimateDifficulty(keyword));
  };

  const copyLongTail = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const canAnalyse = keyword.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="keywordDifficultyEstimator" />

      <PageHero
        eyebrow="Free Tool"
        title="Keyword Difficulty Estimator"
        description="Enter any fintech keyword to get an estimated difficulty score, search intent classification, projected volume range, and 6 ready-to-use long-tail variations."
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

          {/* Input card */}
          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Keyword Analysis
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Enter one keyword or phrase at a time.
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

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-violet-600" />
                  Fintech Keyword or Phrase
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. fintech SEO agency, open banking API, best BNPL platform"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAnalyse) analyse();
                    }}
                    className="h-11"
                  />
                  <Button
                    onClick={analyse}
                    disabled={!canAnalyse}
                    className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11 px-5"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Analyse
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scores are heuristic estimates based on keyword structure and
                  known competition signals — use as a directional guide.
                </p>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.keyword}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Results for "{result.keyword}"
                </h3>

                {/* Score + stats */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Difficulty score */}
                  <Card
                    className={`border shadow-sm sm:col-span-1 ${SCORE_BG(result.score)}`}
                  >
                    <CardContent className="p-5 text-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`text-6xl font-black mb-1 ${SCORE_COLOR(result.score)}`}
                      >
                        {result.score}
                      </motion.div>
                      <div className="text-xs text-muted-foreground mb-1">
                        / 100 difficulty
                      </div>
                      <span
                        className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${SCORE_BG(result.score)} ${SCORE_COLOR(result.score)}`}
                      >
                        {result.label}
                      </span>
                    </CardContent>
                  </Card>

                  {/* Intent + volume */}
                  <div className="sm:col-span-2 flex flex-col gap-4">
                    <Card className="border border-slate-100 shadow-sm flex-1">
                      <CardContent className="p-5 flex items-start gap-3">
                        <Target className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              Search Intent
                            </span>
                            <span
                              className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${INTENT_COLOR[result.intent]}`}
                            >
                              {result.intent}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {result.intentReason}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-100 shadow-sm flex-1">
                      <CardContent className="p-5 flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            Estimated Monthly Volume
                          </p>
                          <p className="text-2xl font-black text-violet-600">
                            {result.volumeRange}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Based on keyword length and structure patterns.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Long-tail suggestions */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Search className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-semibold text-slate-900">
                        Long-Tail Variations
                      </h4>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Click to copy
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.longTails.map((lt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => copyLongTail(i, lt)}
                          className="flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 transition-all text-sm text-slate-700 group"
                        >
                          <span className="leading-snug">{lt}</span>
                          {copied === i ? (
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-semibold text-slate-900">
                        Strategy Tips
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {result.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex gap-2.5 text-sm text-slate-700"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-violet-100 bg-violet-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-violet-800 leading-relaxed">
                      Want to rank for competitive fintech keywords?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-violet-900"
                      >
                        See our fintech SEO services
                      </Link>{" "}
                      or{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-violet-900"
                      >
                        book a free strategy call
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
