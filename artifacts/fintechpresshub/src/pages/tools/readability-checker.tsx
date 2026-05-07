import { useMemo, useRef, useState } from "react";
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

const PASSIVE_RE =
  /\b(is|are|was|were|be|been|being|has\s+been|have\s+been|had\s+been|will\s+be|would\s+be|can\s+be|could\s+be|should\s+be|may\s+be|might\s+be|must\s+be)\s+\w*(ed|en|t)\b/i;

function isPassive(text: string): boolean {
  return PASSIVE_RE.test(text);
}

function buildVisualSegments(rawText: string): SentenceSegment[][] {
  const paragraphs = rawText.split(/\n+/).filter((p) => p.trim().length > 0);
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
    const synonym = SYNONYM_MAP[token.toLowerCase()];
    if (synonym && /^[a-zA-Z]+$/.test(token)) {
      return (
        <span
          key={i}
          className="relative underline decoration-dotted decoration-amber-500 underline-offset-2 cursor-help font-medium text-amber-800"
          style={{
            zIndex: 50,
            position: "relative",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))",
          }}
          title={`Simpler alternative: "${synonym}"`}
        >
          {token}
        </span>
      );
    }
    return token;
  });
}

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const W = 96, H = 28, pad = 3;
  const yScale = (s: number) => pad + (1 - s / 100) * (H - pad * 2);
  const xScale = (i: number) =>
    pad + (i / (scores.length - 1)) * (W - pad * 2);
  const pts = scores.map((s, i) => ({ x: xScale(i), y: yScale(s) }));
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = scores[scores.length - 1];
  const stroke =
    last >= 65 ? "#16a34a" : last >= 45 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <svg
        width={W}
        height={H}
        className="overflow-visible"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 3 : 2}
            fill={i === pts.length - 1 ? stroke : "white"}
            stroke={stroke}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <span className="whitespace-nowrap">
        {scores.length} check{scores.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
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
    setText("");
    setChecked(false);
    setCheckedText("");
    setScoreHistory([]);
  };

  const [copyImprovedState, setCopyImprovedState] = useState<"idle" | "copied">("idle");

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
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      150,
    );
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Your Results
                  </h3>
                  <Sparkline scores={scoreHistory} />
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
                        <div className="text-sm font-medium text-slate-700 mt-0.5">
                          {results.grade} reading level
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
                            left: `${Math.min(Math.max(results.score, 0), 100)}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: "5px solid transparent",
                              borderRight: "5px solid transparent",
                              borderTop: "8px solid #1e293b",
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                  ].map(({ label, value }) => (
                    <Card key={label} className="border border-slate-100 shadow-sm">
                      <CardContent className="p-3 text-center">
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

                {/* Tips */}
                {results.score > 80 ? (
                  <Card className="border border-green-100 bg-green-50 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-green-800">
                          Great job! Your content is highly readable and ready for a general audience.
                        </p>
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

                    <div className="text-sm text-slate-700 space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-100" style={{ lineHeight: "2" }}>
                      {results.visualSegments.map((para, pi) => (
                        <p key={pi}>
                          {para.map((seg, si) => {
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
                                    ? { ...baseStyle, backgroundColor: "#f3e8ff" }
                                    : {};
                            const tooltipParts: string[] = [];
                            if (seg.difficulty === "hard")
                              tooltipParts.push(`Very hard sentence — ${seg.wordCount} words (aim for under 25)`);
                            else if (seg.difficulty === "moderate")
                              tooltipParts.push(`Moderately hard sentence — ${seg.wordCount} words (aim for under 15)`);
                            if (seg.passive)
                              tooltipParts.push("Contains passive voice — consider rewriting in active voice");
                            const tooltip = tooltipParts.length > 0 ? tooltipParts.join(" · ") : undefined;
                            return (
                              <span key={si} style={highlightStyle} title={tooltip}>
                                {renderSentenceTokens(seg.text)}
                                {si < para.length - 1 ? " " : ""}
                              </span>
                            );
                          })}
                        </p>
                      ))}
                    </div>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2 h-0.5 border-b-2 border-dotted border-amber-500" />
                      Dotted-underlined words have simpler alternatives — hover to see them.
                    </p>

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
