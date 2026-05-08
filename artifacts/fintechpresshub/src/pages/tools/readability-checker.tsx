import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Eye,
  Copy,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function tokenize(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z']/g, ""))
    .filter((w) => w.length > 0);
  return { sentences, words };
}

function fleschScore(words: string[], sentences: string[]): number {
  if (sentences.length === 0 || words.length === 0) return 0;
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const asl = words.length / sentences.length;
  const asw = totalSyllables / words.length;
  const score = 206.835 - 1.015 * asl - 84.6 * asw;
  return Math.max(0, Math.min(100, score));
}

function vibeFromScore(score: number): { label: string; classes: string } {
  if (score > 80)
    return { label: "Vibe: Conversational ☕", classes: "bg-green-100 text-green-700 border-green-200" };
  if (score >= 40)
    return { label: "Vibe: Professional 💼", classes: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: "Vibe: Deep Technical 🧠", classes: "bg-purple-100 text-purple-700 border-purple-200" };
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "5th grade";
  if (score >= 80) return "6th grade";
  if (score >= 70) return "7th grade";
  if (score >= 60) return "8th–9th grade";
  if (score >= 50) return "10th–12th grade";
  if (score >= 30) return "College level";
  return "Professional / Academic";
}

function levelFromScore(score: number): {
  label: string;
  color: string;
  Icon: typeof CheckCircle2;
  ring: string;
} {
  if (score >= 65)
    return {
      label: "Easy to read",
      color: "text-green-600",
      Icon: CheckCircle2,
      ring: "ring-green-200 bg-green-50",
    };
  if (score >= 45)
    return {
      label: "Moderately complex",
      color: "text-amber-600",
      Icon: AlertTriangle,
      ring: "ring-amber-200 bg-amber-50",
    };
  return {
    label: "Difficult to read",
    color: "text-red-600",
    Icon: XCircle,
    ring: "ring-red-200 bg-red-50",
  };
}

const SYNONYM_MAP: Record<string, string> = {
  utilize: "use",
  utilise: "use",
  demonstrate: "show",
  implementation: "rollout",
  facilitate: "help",
  functionality: "features",
  approximately: "about",
  additionally: "also",
  subsequently: "then",
  fundamentally: "basically",
  methodology: "method",
  cryptocurrency: "crypto",
  authentication: "login",
  authorization: "access",
  interoperability: "compatibility",
  synchronization: "sync",
  instantaneously: "instantly",
  consequently: "so",
  significantly: "greatly",
  alternatively: "or",
  differentiate: "tell apart",
  documentation: "docs",
  configuration: "setup",
  administration: "management",
  collaboration: "teamwork",
  capitalization: "funding",
  tokenization: "encoding",
  securitization: "packaging",
  categorization: "grouping",
  optimization: "improvement",
  optimisation: "improvement",
  consideration: "thought",
  communicate: "share",
  infrastructure: "system",
};

const WEAK_WORD_MAP: Record<string, string> = {
  very: "use a stronger adjective instead",
  really: "use a more precise word",
  basically: "omit or use 'essentially'",
  stuff: "use a specific noun",
  things: "use a specific noun",
  nice: "try 'effective', 'clear', or 'strong'",
  good: "try 'strong', 'effective', or 'valuable'",
  bad: "try 'poor', 'weak', or 'ineffective'",
  big: "try 'significant', 'major', or 'substantial'",
  small: "try 'minor', 'limited', or 'modest'",
  just: "omit or use 'simply'",
  got: "use 'received', 'achieved', or 'gained'",
  get: "use 'obtain', 'achieve', or 'gain'",
  lots: "use 'many', 'numerous', or 'a range of'",
  maybe: "use 'perhaps' or make a definitive claim",
  kind: "omit or use a precise word",
  sort: "omit or use a precise word",
  thing: "use a specific noun",
};

function getTips(
  score: number,
  avgSentenceLen: number,
  wordCount: number,
  rawText: string,
  words: string[],
): string[] {
  const tips: string[] = [];

  if (avgSentenceLen > 20) {
    tips.push(
      `Your average sentence is ${avgSentenceLen.toFixed(0)} words — aim for under 20. Try splitting long sentences at conjunctions like "and", "but", or "because".`,
    );
  }

  if (wordCount > 100 && !rawText.includes("\n")) {
    tips.push(
      "Your text has no paragraph breaks. With over 100 words in one block, readers may lose their place — add a blank line every 3–5 sentences.",
    );
  }

  if (score < 50) {
    const found: Array<{ word: string; synonym: string }> = [];
    const seen = new Set<string>();
    for (const w of words) {
      const lower = w.toLowerCase();
      if (SYNONYM_MAP[lower] && !seen.has(lower)) {
        found.push({ word: lower, synonym: SYNONYM_MAP[lower] });
        seen.add(lower);
        if (found.length >= 3) break;
      }
    }
    if (found.length > 0) {
      const examples = found
        .map(({ word, synonym }) => `"${word}" → "${synonym}"`)
        .join(", ");
      tips.push(
        `Swap complex words for simpler ones to lift your score: ${examples}.`,
      );
    } else {
      tips.push(
        "Replace multi-syllable jargon with simpler alternatives — even a professional audience prefers plain language.",
      );
    }
  }

  if (score >= 65 && score < 80)
    tips.push(
      "Good score! Consider adding bullet lists or numbered steps for complex processes.",
    );
  if (score >= 80)
    tips.push(
      "Excellent readability. Your content should be accessible to a broad professional audience.",
    );
  return tips;
}

interface SentenceSegment {
  text: string;
  wordCount: number;
  difficulty: "hard" | "moderate" | "normal";
  passive: boolean;
}

const PASSIVE_IRREGULARS = [
  // -en / -n endings
  "shown","known","grown","blown","flown","thrown","drawn",
  "driven","written","risen","given","taken","spoken","broken",
  "stolen","chosen","woven","beaten","eaten","fallen","shaken",
  "forgotten","gotten","worn","torn","sworn","borne","born","done","gone",
  // -t endings (genuine irregular past participles)
  "built","dealt","felt","meant","sent","spent","left","lost",
  "kept","slept","wept","caught","taught","bought","brought",
  "thought","sought","found","bound","wound",
  // other irregulars
  "run","won","hung","begun","rung","sung","sunk","held",
  "told","sold","led","fed","fled","spread","read","heard",
  "hurt","cut","put","set","hit","let","burst","cast","shut",
  "paid","said","laid","made",
].join("|");

const PASSIVE_AUX =
  "(?:am|is|are|was|were|be|been|being" +
  "|has\\s+been|have\\s+been|had\\s+been" +
  "|will\\s+be|would\\s+be|can\\s+be|could\\s+be" +
  "|should\\s+be|may\\s+be|might\\s+be|must\\s+be)";

const PASSIVE_RE = new RegExp(
  `\\b${PASSIVE_AUX}\\s+(?:[a-zA-Z]+ed|${PASSIVE_IRREGULARS})\\b`,
  "i",
);

function isPassive(text: string): boolean {
  return PASSIVE_RE.test(text);
}

function buildVisualSegments(rawText: string): SentenceSegment[][] {
  const paragraphs = rawText.trim().split(/\n+/).filter((p) => p.trim().length > 0);
  return paragraphs.map((para) => {
    const sentenceTexts = para
      .trim()
      .replace(/([.!?]+)\s+/g, "$1\u0000")
      .split("\u0000")
      .filter((s) => s.trim().length > 0);
    return sentenceTexts.map((text) => {
      const wordCount = text
        .trim()
        .split(/\s+/)
        .filter((w) => w.replace(/[^a-zA-Z]/g, "").length > 0).length;
      const difficulty: "hard" | "moderate" | "normal" =
        wordCount > 25 ? "hard" : wordCount > 15 ? "moderate" : "normal";
      return { text, wordCount, difficulty, passive: isPassive(text) };
    });
  });
}

function renderSentenceTokens(sentenceText: string) {
  const tokens = sentenceText.split(/([a-zA-Z]+)/);
  return tokens.map((token, i) => {
    const lower = token.toLowerCase();
    if (!/^[a-zA-Z]+$/.test(token)) return token;

    const synonym = SYNONYM_MAP[lower];
    if (synonym) {
      return (
        <span
          key={i}
          className="relative underline decoration-dotted decoration-amber-500 underline-offset-2 cursor-help font-medium text-amber-800"
          style={{ zIndex: 50, position: "relative", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))" }}
          title={`Simpler alternative: "${synonym}"`}
        >
          {token}
        </span>
      );
    }

    const weakHint = WEAK_WORD_MAP[lower];
    if (weakHint) {
      return (
        <span
          key={i}
          className="underline decoration-dashed decoration-rose-400 underline-offset-2 cursor-help text-rose-700"
          title={`Weak word — ${weakHint}`}
        >
          {token}
        </span>
      );
    }

    return token;
  });
}

function ScoreHistoryChart({ scores }: { scores: number[] }) {
  const VW = 400, VH = 220;
  const padL = 32, padR = 12, padT = 28, padB = 30;
  const chartW = VW - padL - padR;
  const chartH = VH - padT - padB;

  const xScale = (i: number) =>
    padL + (scores.length <= 1 ? chartW / 2 : (i / (scores.length - 1)) * chartW);
  const yScale = (v: number) =>
    padT + (1 - Math.max(0, Math.min(100, v)) / 100) * chartH;

  const hasMultiple = scores.length >= 2;
  const pts = scores.map((s, i) => ({ x: xScale(i), y: yScale(s), s }));
  const linePath = hasMultiple
    ? pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    : "";

  const last = scores.length > 0 ? scores[scores.length - 1] : 0;
  const delta = scores.length >= 2 ? Math.round(last - scores[0]) : 0;
  const lineStroke = last >= 65 ? "#16a34a" : last >= 45 ? "#d97706" : "#dc2626";

  const bands = [
    { from: 65, to: 100, fill: "#dcfce7" },
    { from: 45, to: 65,  fill: "#fef9c3" },
    { from: 0,  to: 45,  fill: "#fee2e2" },
  ];

  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">Score History</h4>
          <div className="flex items-center gap-2 text-[11px]">
            {scores.length > 0 && (
              <span className="text-muted-foreground">{scores.length} check{scores.length !== 1 ? "s" : ""}</span>
            )}
            {hasMultiple && (
              <span className={`font-semibold tabular-nums ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-slate-400"}`}>
                {delta > 0 ? "+" : ""}{delta} overall
              </span>
            )}
          </div>
        </div>

        <div className="min-h-[240px] flex flex-col justify-center">
          {scores.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
              Run a readability check to see your score here.
            </div>
          ) : scores.length === 1 ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-2">
              <span className="text-2xl font-black" style={{ color: last >= 65 ? "#16a34a" : last >= 45 ? "#d97706" : "#dc2626" }}>
                {Math.round(last)}
              </span>
              <span className="text-sm text-muted-foreground">Edit 1 — run another check to see your trend.</span>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              className="w-full"
              style={{ height: "220px" }}
              aria-label="Score improvement chart"
            >
              {bands.map(({ from, to, fill }) => (
                <rect
                  key={from}
                  x={padL}
                  y={yScale(to)}
                  width={chartW}
                  height={yScale(from) - yScale(to)}
                  fill={fill}
                  opacity="0.6"
                />
              ))}

              {[0, 45, 65, 100].map((v) => (
                <g key={v}>
                  <line
                    x1={padL}
                    y1={yScale(v)}
                    x2={VW - padR}
                    y2={yScale(v)}
                    stroke="#cbd5e1"
                    strokeWidth="0.5"
                    strokeDasharray={v === 0 || v === 100 ? undefined : "3 3"}
                  />
                  <text
                    x={padL - 4}
                    y={yScale(v)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {v}
                  </text>
                </g>
              ))}

              <path
                d={linePath}
                fill="none"
                stroke={lineStroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {pts.map((p, i) => {
                const dotColor = p.s >= 65 ? "#16a34a" : p.s >= 45 ? "#d97706" : "#dc2626";
                const isLast = i === pts.length - 1;
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={isLast ? 5.5 : 4} fill={dotColor} stroke="white" strokeWidth="1.5" />
                    <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="10" fontWeight="700" fill={dotColor}>
                      {Math.round(p.s)}
                    </text>
                    <text x={p.x} y={VH - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
                      Edit {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200" />
            Easy (65–100)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-100 border border-yellow-200" />
            Moderate (45–65)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" />
            Difficult (0–45)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function simplifyText(text: string): string {
  let result = text;
  for (const [complex, simple] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${complex}\\b`, "gi");
    result = result.replace(regex, (match) =>
      /^[A-Z]/.test(match)
        ? simple.charAt(0).toUpperCase() + simple.slice(1)
        : simple,
    );
  }
  return result;
}

function applySimplifications(rawText: string): string {
  let result = rawText;
  for (const [complex, simple] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${complex}\\b`, "gi");
    result = result.replace(regex, (match) => {
      if (/^[A-Z]/.test(match)) {
        return simple.charAt(0).toUpperCase() + simple.slice(1);
      }
      return simple;
    });
  }
  return result;
}

export default function ReadabilityChecker() {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [checkedText, setCheckedText] = useState("");
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [copyTextState, setCopyTextState] = useState<"idle" | "copied">("idle");
  const resultsRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    if (!text.trim() && !checked) return;
    const snapshot = { text, checked, checkedText, scoreHistory: [...scoreHistory], activeRewrite };
    setText("");
    setChecked(false);
    setCheckedText("");
    setScoreHistory([]);
    setActiveRewrite(null);
    toast("Content cleared", {
      description: snapshot.checked ? "Your text and results have been reset." : "Your text has been cleared.",
      action: {
        label: "Undo",
        onClick: () => {
          setText(snapshot.text);
          setChecked(snapshot.checked);
          setCheckedText(snapshot.checkedText);
          setScoreHistory(snapshot.scoreHistory);
          setActiveRewrite(snapshot.activeRewrite);
        },
      },
      duration: 5000,
    });
  };

  const [copyImprovedState, setCopyImprovedState] = useState<"idle" | "copied">("idle");
  const [copyMdState, setCopyMdState] = useState<"idle" | "copied">("idle");
  const [activeRewrite, setActiveRewrite] = useState<{ original: string; rewritten: string } | null>(null);
  const [copyRewriteState, setCopyRewriteState] = useState<"idle" | "copied">("idle");

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    navigator.vibrate?.(40);
    setCopyTextState("copied");
    setTimeout(() => setCopyTextState("idle"), 1500);
  };

  const check = () => {
    const { sentences, words } = tokenize(text);
    const newScore = Math.round(fleschScore(words, sentences));
    setScoreHistory((prev) => [...prev, newScore]);
    setCheckedText(text);
    setChecked(true);
    trackEvent("Tool Used", { tool: "readability-checker" });
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      150,
    );
  };

  const copyAsMarkdown = async () => {
    if (!results) return;
    const lines: string[] = [];
    lines.push(`## Readability Report`);
    lines.push(``);
    lines.push(`**Flesch Score:** ${results.score.toFixed(0)} / 100 — ${results.level.label}`);
    lines.push(`**Grade Level:** ${results.grade}`);
    lines.push(`**Vibe:** ${vibeFromScore(results.score).label}`);
    lines.push(``);
    lines.push(`### Key Stats`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Word count | ${results.wordCount.toLocaleString()} |`);
    lines.push(`| Sentences | ${results.sentenceCount.toLocaleString()} |`);
    lines.push(`| Avg sentence length | ${results.avgSentenceLen.toFixed(1)} words |`);
    lines.push(`| Avg syllables per word | ${results.avgSyllables.toFixed(2)} |`);
    lines.push(`| Reading time | ${Math.max(1, Math.ceil(results.wordCount / 200))} min |`);
    lines.push(`| Passive voice | ${results.passiveCount} sentence${results.passiveCount !== 1 ? "s" : ""} |`);
    lines.push(``);
    if (results.tips.length > 0) {
      lines.push(`### Improvement Tips`);
      lines.push(``);
      results.tips.forEach((tip) => lines.push(`- ${tip}`));
      lines.push(``);
    }
    if (scoreHistory.length >= 1) {
      lines.push(`### Score History`);
      lines.push(``);
      scoreHistory.forEach((s, i) => lines.push(`- Edit ${i + 1}: ${Math.round(s)}`));
      if (scoreHistory.length >= 2) {
        const delta = Math.round(scoreHistory[scoreHistory.length - 1] - scoreHistory[0]);
        lines.push(`- **Overall change: ${delta > 0 ? "+" : ""}${delta}**`);
      }
      lines.push(``);
    }
    lines.push(`### Original Text`);
    lines.push(``);
    lines.push(checkedText);
    lines.push(``);
    await navigator.clipboard.writeText(lines.join("\n"));
    navigator.vibrate?.(40);
    trackEvent("Result Copied", { tool: "readability-checker", format: "markdown" });
    setCopyMdState("copied");
    setTimeout(() => setCopyMdState("idle"), 1500);
  };

  const copyImproved = async () => {
    const improved = applySimplifications(checkedText);
    await navigator.clipboard.writeText(improved);
    navigator.vibrate?.(40);
    setCopyImprovedState("copied");
    setTimeout(() => setCopyImprovedState("idle"), 1500);
  };

  const results = useMemo(() => {
    if (!checkedText.trim()) return null;
    const { sentences, words } = tokenize(checkedText);
    const score = fleschScore(words, sentences);
    const avgSentenceLen =
      sentences.length > 0 ? words.length / sentences.length : 0;
    const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const avgSyllables = words.length > 0 ? totalSyllables / words.length : 0;
    const grade = gradeFromScore(score);
    const level = levelFromScore(score);
    const tips = getTips(score, avgSentenceLen, words.length, checkedText, words);
    const visualSegments = buildVisualSegments(checkedText);
    const passiveCount = visualSegments.flat().filter((s) => s.passive).length;
    const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;
    if (passiveRatio > 0.2 && passiveCount > 0) {
      tips.push(
        `${passiveCount} of your ${sentences.length} sentences use passive voice (${Math.round(passiveRatio * 100)}%). Aim for under 20% — try rewriting with an active subject where possible.`,
      );
    }
    return {
      score,
      grade,
      level,
      tips,
      visualSegments,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLen,
      avgSyllables,
      passiveCount,
    };
  }, [checkedText]);

  const canCheck = text.trim().split(/\s+/).length >= 10;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="readabilityChecker" />

      <PageHero
        eyebrow="Free Tool"
        title="Readability Checker"
        description="Paste your content and get an instant Flesch readability score, grade level, and actionable tips to make your writing clearer."
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
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Paste Your Content
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Minimum 10 words. Plain text works best.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyText}
                    disabled={!text.trim()}
                    className="text-muted-foreground"
                  >
                    {copyTextState === "copied" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
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
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">
                  Article Text
                </Label>
                <Textarea
                  placeholder="Paste your blog post, landing page copy, or any professional content here…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className="resize-y text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {(() => {
                      const trimmed = text.trim();
                      const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
                      const sentenceCount = trimmed
                        ? trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
                        : 0;
                      const charCount = text.length;
                      return (
                        <>
                          <span>
                            <span className="font-semibold text-slate-700">{wordCount}</span> words
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            <span className="font-semibold text-slate-700">{sentenceCount}</span> sentences
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            <span className="font-semibold text-slate-700">{charCount}</span> chars
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  {!canCheck && text.trim().length > 0 && (
                    <span className="text-[11px] text-amber-600 shrink-0">
                      Enter at least 10 words to analyse.
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={check}
                disabled={!canCheck}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Check Readability
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {checked && results && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                      Your Results
                    </h3>
                    {scoreHistory.length > 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        {scoreHistory.length} checks
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={copyAsMarkdown}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  >
                    {copyMdState === "copied" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy as Markdown
                      </>
                    )}
                  </Button>
                </div>

                {/* Score card */}
                <Card
                  className={`border shadow-sm ring-1 ${results.level.ring}`}
                >
                  <CardContent className="p-6 space-y-5">
                    {/* Score + label row */}
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[80px]">
                        <div
                          className={`text-5xl font-black ${results.level.color}`}
                        >
                          {results.score.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          / 100
                        </div>
                      </div>
                      <div>
                        <div
                          className={`flex items-center gap-1.5 font-semibold text-base ${results.level.color}`}
                        >
                          <results.level.Icon className="w-5 h-5" />
                          {results.level.label}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Flesch Reading Ease Score
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-sm font-medium text-slate-700">
                            {results.grade} reading level
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${vibeFromScore(results.score).classes}`}>
                            {vibeFromScore(results.score).label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Benchmark scale */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Benchmark
                      </div>
                      <div className="relative pt-3">
                        {/* Needle */}
                        <div
                          className="absolute z-10 top-0"
                          style={{
                            left: `${Math.min(Math.max(results.score, 5), 95)}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: "5px solid transparent",
                              borderRight: "5px solid transparent",
                              borderTop: `8px solid ${
                                results.score >= 80 ? "#16a34a"
                                : results.score >= 60 ? "#0ea5e9"
                                : results.score >= 40 ? "#f97316"
                                : "#dc2626"
                              }`,
                            }}
                          />
                        </div>

                        {/* Zone bar */}
                        <div className="flex h-4 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-400"
                            style={{ width: "40%" }}
                            title="Academic (0–40)"
                          />
                          <div
                            className="bg-amber-400"
                            style={{ width: "20%" }}
                            title="Technical Docs (40–60)"
                          />
                          <div
                            className="bg-sky-400"
                            style={{ width: "20%" }}
                            title="Standard Blogs (60–80)"
                          />
                          <div
                            className="bg-emerald-400"
                            style={{ width: "20%" }}
                            title="Social Media (80–100)"
                          />
                        </div>

                        {/* Tick numbers */}
                        <div className="relative h-4 mt-0.5">
                          {[0, 40, 60, 80, 100].map((tick) => (
                            <span
                              key={tick}
                              className="absolute text-[7px] sm:text-[9px] text-muted-foreground leading-none"
                              style={{
                                left: `${tick}%`,
                                transform:
                                  tick === 0
                                    ? "none"
                                    : tick === 100
                                      ? "translateX(-100%)"
                                      : "translateX(-50%)",
                              }}
                            >
                              {tick}
                            </span>
                          ))}
                        </div>

                        {/* Zone name labels */}
                        <div className="flex text-[7px] sm:text-[10px] text-muted-foreground">
                          <div style={{ width: "40%" }} className="text-center px-0.5 truncate">
                            <span className="hidden sm:inline">Academic</span>
                            <span className="sm:hidden">Acad.</span>
                          </div>
                          <div style={{ width: "20%" }} className="text-center px-0.5 truncate">
                            <span className="hidden sm:inline">Tech Docs</span>
                            <span className="sm:hidden">Tech</span>
                          </div>
                          <div style={{ width: "20%" }} className="text-center px-0.5 truncate">Blogs</div>
                          <div style={{ width: "20%" }} className="text-center px-0.5 truncate">Social</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      label: "Word count",
                      value: results.wordCount.toLocaleString(),
                    },
                    {
                      label: "Sentences",
                      value: results.sentenceCount.toLocaleString(),
                    },
                    {
                      label: "Avg sentence",
                      value: `${results.avgSentenceLen.toFixed(1)} words`,
                    },
                    {
                      label: "Avg syllables",
                      value: `${results.avgSyllables.toFixed(2)} / word`,
                    },
                    {
                      label: "Reading time",
                      value: `${Math.max(1, Math.ceil(results.wordCount / 200))} min read`,
                    },
                    {
                      label: "Passive voice",
                      value: `${results.passiveCount} sentence${results.passiveCount !== 1 ? "s" : ""}`,
                    },
                  ].map(({ label, value }) => (
                    <Card key={label} className="border border-slate-100 shadow-sm transition-shadow duration-200 hover:shadow-md h-full">
                      <CardContent className="p-3 flex flex-col items-center justify-center text-center h-full">
                        <div className="text-lg font-bold text-slate-900">
                          {value}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {label}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Score History Chart */}
                <ScoreHistoryChart scores={scoreHistory} />

                {/* Tips */}
                {results.score >= 80 && results.tips.length === 0 ? (
                  <Card className="border-0 shadow-md overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-tight">
                            Perfect Score
                          </p>
                          <p className="text-green-100 text-sm mt-0.5 leading-snug">
                            Excellent clarity! Your content is easy to read and perfectly optimized for a broad audience.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : results.tips.length > 0 ? (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Improvement tips
                      </h4>
                      <ul className="space-y-2">
                        {results.tips.map((tip, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-teal-500 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Visual Analysis */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-teal-600" />
                        Visual Analysis
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-red-100" />
                          Very hard (&gt;25 words)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-yellow-100" />
                          Moderately hard (&gt;15 words)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-purple-100" />
                          Passive voice
                        </span>
                      </div>
                    </div>

                    <div
                      className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-100"
                      style={{ lineHeight: "2", fontSize: "0.875rem", fontFamily: "inherit" }}
                    >
                      {results.visualSegments.map((para, pi) => (
                        <p key={pi} className="m-0" style={{ marginBottom: pi < results.visualSegments.length - 1 ? "0.75rem" : 0 }}>
                          {para.map((seg, si) => {
                            const isHighlighted = seg.difficulty === "hard" || seg.difficulty === "moderate" || seg.passive;
                            const baseStyle: React.CSSProperties = {
                              padding: "0.1em 0.25em",
                              boxDecorationBreak: "clone",
                              WebkitBoxDecorationBreak: "clone",
                              borderRadius: "2px",
                            };
                            const highlightStyle: React.CSSProperties =
                              seg.difficulty === "hard"
                                ? { ...baseStyle, backgroundColor: "#fee2e2" }
                                : seg.difficulty === "moderate"
                                  ? { ...baseStyle, backgroundColor: "#fef9c3" }
                                  : seg.passive
                                    ? { ...baseStyle, backgroundColor: "#ddd6fe", borderBottom: "2px solid #8b5cf6" }
                                    : {};
                            const tooltipParts: string[] = [];
                            if (seg.difficulty === "hard")
                              tooltipParts.push(`Very hard sentence — ${seg.wordCount} words (aim for under 25)`);
                            else if (seg.difficulty === "moderate")
                              tooltipParts.push(`Moderately hard sentence — ${seg.wordCount} words (aim for under 15)`);
                            if (seg.passive)
                              tooltipParts.push("Contains passive voice — consider rewriting in active voice");
                            if (isHighlighted)
                              tooltipParts.push("Click to see a suggested rewrite");
                            const tooltip = tooltipParts.length > 0 ? tooltipParts.join(" · ") : undefined;
                            return (
                              <span
                                key={si}
                                style={highlightStyle}
                                title={tooltip}
                                className={isHighlighted ? "cursor-pointer" : undefined}
                                onClick={isHighlighted ? () => {
                                  const rewritten = simplifyText(seg.text);
                                  setActiveRewrite((prev) =>
                                    prev?.original === seg.text ? null : { original: seg.text, rewritten },
                                  );
                                  setCopyRewriteState("idle");
                                } : undefined}
                              >
                                {renderSentenceTokens(seg.text)}
                                {si < para.length - 1 ? " " : ""}
                              </span>
                            );
                          })}
                        </p>
                      ))}
                    </div>

                    {activeRewrite && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Suggested Rewrite
                        </div>
                        <p className="text-[11px] text-slate-400 line-through leading-relaxed m-0">
                          {activeRewrite.original}
                        </p>
                        <p className="text-sm text-slate-900 leading-relaxed m-0">
                          {activeRewrite.rewritten === activeRewrite.original
                            ? "No simpler word substitutions found — try shortening or splitting this sentence."
                            : activeRewrite.rewritten}
                        </p>
                        <Button
                          onClick={async () => {
                            await navigator.clipboard.writeText(activeRewrite.rewritten);
                            navigator.vibrate?.(40);
                            setCopyRewriteState("copied");
                            setTimeout(() => setCopyRewriteState("idle"), 1500);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          {copyRewriteState === "copied" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy rewrite
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2 h-0.5 border-b-2 border-dotted border-amber-500" />
                        Dotted amber — complex word with a simpler alternative (hover to see it).
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2 h-0.5 border-b-2 border-dashed border-rose-400" />
                        Dashed rose — weak or vague word (hover for a stronger suggestion).
                      </p>
                    </div>

                    <Button
                      onClick={copyImproved}
                      variant="outline"
                      size="sm"
                      className="w-full h-9 text-xs font-semibold border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300"
                    >
                      {copyImprovedState === "copied" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy improved text
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-teal-100 bg-teal-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-teal-800 leading-relaxed">
                      Want expert professional writers who nail readability every
                      time?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-teal-900"
                      >
                        See our content services
                      </Link>{" "}
                      or{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-teal-900"
                      >
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
