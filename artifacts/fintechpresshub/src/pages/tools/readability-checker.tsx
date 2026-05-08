import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  Flame,
  FileDown,
  Link2,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  ArrowLeftRight,
  Printer,
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
  if (score >= 100)
    return { label: "Vibe: Pure Clarity 💎", classes: "bg-teal-100 text-teal-700 border-teal-200" };
  if (score > 80)
    return { label: "Vibe: Conversational ☕", classes: "bg-green-100 text-green-700 border-green-200" };
  if (score >= 40)
    return { label: "Vibe: Professional 💼", classes: "bg-blue-100 text-blue-700 border-blue-200" };
  if (score >= 20)
    return { label: "Vibe: Deep Technical 🧠", classes: "bg-purple-100 text-purple-700 border-purple-200" };
  return { label: "Vibe: Academic/Complex 🏛️", classes: "bg-slate-100 text-slate-700 border-slate-300" };
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

function benchmarkFromScore(score: number): { label: string; detail: string; icon: string } {
  if (score >= 90) return { icon: "📗", label: "children's picture book", detail: "Ultra-simple sentences — ideal for app onboarding copy and push notifications." };
  if (score >= 80) return { icon: "📰", label: "tabloid newspaper (e.g. The Sun)", detail: "Conversational and punchy — great for social media posts and email subject lines." };
  if (score >= 70) return { icon: "📖", label: "Reader's Digest", detail: "Accessible to most adults — the sweet spot for consumer-facing fintech content." };
  if (score >= 65) return { icon: "🗞️", label: "USA Today", detail: "Clear and direct — well-suited for news-style blog posts and landing pages." };
  if (score >= 60) return { icon: "📰", label: "New York Times", detail: "Readable but authoritative — a strong target for fintech thought leadership." };
  if (score >= 50) return { icon: "💼", label: "Time magazine / Forbes", detail: "Moderate complexity — right for educated business and investor audiences." };
  if (score >= 40) return { icon: "🎓", label: "Harvard Business Review", detail: "Dense, analytical writing — best suited to senior professionals and specialists." };
  if (score >= 30) return { icon: "🔬", label: "academic journal abstract", detail: "Highly technical — most general readers will struggle to follow along." };
  if (score >= 10) return { icon: "⚖️", label: "terms & conditions document", detail: "Very dense — typically only manageable by trained professionals." };
  return { icon: "📋", label: "technical legal contract", detail: "Extremely complex — almost no general reader can parse this comfortably." };
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

function renderWordHeatmap(paragraphs: SentenceSegment[][]) {
  return paragraphs.map((para, pi) => (
    <p key={pi} className="m-0" style={{ marginBottom: pi < paragraphs.length - 1 ? "0.75rem" : 0 }}>
      {para.map((seg, si) => {
        const tokens = seg.text.split(/([a-zA-Z]+)/);
        return (
          <span key={si}>
            {tokens.map((token, ti) => {
              if (!/^[a-zA-Z]+$/.test(token)) return <span key={ti}>{token}</span>;
              const syllables = countSyllables(token);
              const style: React.CSSProperties =
                syllables >= 3
                  ? { backgroundColor: "#fed7aa", borderRadius: "2px", padding: "0.05em 0.15em" }
                  : syllables === 2
                    ? { backgroundColor: "#fef3c7", borderRadius: "2px", padding: "0.05em 0.15em" }
                    : {};
              return (
                <span key={ti} style={style} title={`${syllables} syllable${syllables !== 1 ? "s" : ""}`}>
                  {token}
                </span>
              );
            })}
            {si < para.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  ));
}

interface SynonymTooltipProps {
  word: string;
  synonym: string;
  onSwap?: (original: string, replacement: string) => void;
}

function SynonymTooltip({ word, synonym, onSwap }: SynonymTooltipProps) {
  const [open, setOpen] = useState(false);
  const [swapped, setSwapped] = useState(false);

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const replacement = /^[A-Z]/.test(word)
      ? synonym.charAt(0).toUpperCase() + synonym.slice(1)
      : synonym.toLowerCase();
    onSwap?.(word, replacement);
    setSwapped(true);
    setTimeout(() => {
      setSwapped(false);
      setOpen(false);
    }, 800);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="underline decoration-dotted decoration-amber-500 underline-offset-2 cursor-pointer font-medium text-amber-800"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))" }}
      >
        {word}
      </span>
      {open && (
        <span
          className="absolute bottom-full left-1/2 z-50 flex flex-col items-center pointer-events-auto"
          style={{ transform: "translateX(-50%)", marginBottom: "6px" }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span className="flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap text-[11px]">
            <span className="text-slate-400 text-[10px]">simpler:</span>
            {onSwap ? (
              <button
                type="button"
                onClick={handleSwap}
                className={`font-bold px-2 py-0.5 rounded-md text-[11px] transition-all duration-150 cursor-pointer ${
                  swapped
                    ? "bg-emerald-500 text-white scale-95"
                    : "bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900"
                }`}
                title={`Click to replace "${word}" with "${synonym}" and re-run analysis`}
              >
                {swapped ? "✓ swapped!" : `"${synonym}"`}
              </button>
            ) : (
              <span className="font-semibold text-amber-300">"{synonym}"</span>
            )}
          </span>
          <span
            className="block w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #0f172a",
            }}
          />
        </span>
      )}
    </span>
  );
}

function renderSentenceTokens(
  sentenceText: string,
  onSwap?: (original: string, replacement: string) => void,
) {
  const tokens = sentenceText.split(/([a-zA-Z]+)/);
  return tokens.map((token, i) => {
    const lower = token.toLowerCase();
    if (!/^[a-zA-Z]+$/.test(token)) return token;

    const synonym = SYNONYM_MAP[lower];
    if (synonym) {
      return (
        <SynonymTooltip key={i} word={token} synonym={synonym} onSwap={onSwap} />
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

function SentenceDistributionBar({ segments }: { segments: SentenceSegment[][] }) {
  const all = segments.flat();
  const total = all.length;
  if (total === 0) return null;
  const short   = all.filter((s) => s.difficulty === "normal").length;
  const medium  = all.filter((s) => s.difficulty === "moderate").length;
  const long    = all.filter((s) => s.difficulty === "hard").length;
  const passive = all.filter((s) => s.passive).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900">Sentence Breakdown</h4>
        <div className="flex h-3 rounded-full overflow-hidden">
          {short  > 0 && <div className="bg-emerald-400 transition-all duration-500" style={{ width: `${pct(short)}%` }}  title={`Short ≤15 words: ${short}`} />}
          {medium > 0 && <div className="bg-amber-400  transition-all duration-500" style={{ width: `${pct(medium)}%` }} title={`Medium 16–25 words: ${medium}`} />}
          {long   > 0 && <div className="bg-rose-400   transition-all duration-500" style={{ width: `${pct(long)}%` }}   title={`Long 25+ words: ${long}`} />}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          {([
            { color: "bg-emerald-400", label: "Short  (≤15 words)", count: short },
            { color: "bg-amber-400",  label: "Medium (16–25 words)", count: medium },
            { color: "bg-rose-400",   label: "Long   (25+ words)",   count: long },
            { color: "bg-purple-300", label: "Passive voice",         count: passive },
          ] as const).map(({ color, label, count }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color}`} />
              <span className="text-slate-500 truncate">{label}</span>
              <span className="ml-auto font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                {count}
                <span className="text-slate-400 font-normal"> ({pct(count)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function vibeColor(score: number): string {
  if (score > 80) return "#15803d";
  if (score >= 40) return "#1d4ed8";
  return "#7e22ce";
}

function BenchmarkScale({ score }: { score: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Benchmark
      </div>
      <div className="relative pt-3">
        <div
          className="absolute z-10 top-0 transition-all duration-500 ease-in-out"
          style={{
            left: `${Math.min(Math.max(score, 5), 95)}%`,
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
                score >= 80 ? "#16a34a"
                : score >= 60 ? "#0ea5e9"
                : score >= 40 ? "#f97316"
                : "#dc2626"
              }`,
            }}
          />
        </div>
        <div className="flex h-4 rounded-full overflow-hidden">
          <div className="bg-rose-400" style={{ width: "40%" }} title="Academic (0–40)" />
          <div className="bg-amber-400" style={{ width: "20%" }} title="Technical Docs (40–60)" />
          <div className="bg-sky-400" style={{ width: "20%" }} title="Standard Blogs (60–80)" />
          <div className="bg-emerald-400" style={{ width: "20%" }} title="Social Media (80–100)" />
        </div>
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
  );
}

function monotonicCubicPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }
  const n = pts.length;
  const dx: number[] = [], dy: number[] = [], slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    dy[i] = pts[i + 1].y - pts[i].y;
    slope[i] = dy[i] / dx[i];
  }
  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-6) { m[i] = m[i + 1] = 0; continue; }
    const alpha = m[i] / slope[i], beta = m[i + 1] / slope[i];
    const s = alpha * alpha + beta * beta;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * alpha * slope[i]; m[i + 1] = t * beta * slope[i]; }
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const cp1x = pts[i].x + dx[i] / 3, cp1y = pts[i].y + (m[i] * dx[i]) / 3;
    const cp2x = pts[i + 1].x - dx[i] / 3, cp2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

function ScoreHistoryChart({ scores, onClear }: { scores: number[]; onClear?: () => void }) {
  const VW = 400, VH = 300;
  const padL = 32, padR = 12, padT = 28, padB = 30;
  const chartW = VW - padL - padR;
  const chartH = VH - padT - padB;

  const xScale = (i: number) =>
    padL + (scores.length <= 1 ? chartW / 2 : (i / (scores.length - 1)) * chartW);
  const yScale = (v: number) =>
    padT + (1 - Math.max(0, Math.min(100, v)) / 100) * chartH;

  const hasMultiple = scores.length >= 2;
  const pts = scores.map((s, i) => ({ x: xScale(i), y: yScale(s), s }));

  const last = scores.length > 0 ? scores[scores.length - 1] : 0;
  const prev = scores.length >= 2 ? scores[scores.length - 2] : last;
  const delta = scores.length >= 2 ? Math.round(last - scores[0]) : 0;
  const lineColor = hasMultiple
    ? last >= prev ? "#10b981" : "#f59e0b"
    : vibeColor(last);

  const curvePath = hasMultiple ? monotonicCubicPath(pts) : "";

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
            {onClear && scores.length > 0 && (
              <button
                onClick={onClear}
                className="text-slate-400 hover:text-slate-600 transition-colors text-[10px] underline underline-offset-2 ml-1"
                aria-label="Clear history"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="h-[300px] flex flex-col justify-center">
          {scores.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Run a readability check to see your score here.
            </div>
          ) : scores.length === 1 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <span className="text-2xl font-black" style={{ color: vibeColor(last) }}>
                {Math.round(last)}
              </span>
              <span className="text-sm text-muted-foreground">Edit 1 — run another check to see your trend.</span>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              className="w-full"
              style={{ height: "300px" }}
              aria-label="Score improvement chart"
            >
              <defs>
                <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
              </defs>
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
                d={curvePath + ` L${pts[pts.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + chartH).toFixed(1)} Z`}
                fill="url(#scoreLineGradient)"
                stroke="none"
              />
              <path
                d={curvePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {pts.map((p, i) => {
                const dotColor = vibeColor(p.s);
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

interface HistoryEntry {
  id: string;
  text: string;
  score: number;
  levelLabel: string;
  wordCount: number;
  timestamp: number;
  sentenceCount?: number;
  avgSentenceLen?: number;
}

const HISTORY_KEY = "readability-checker-history";
const DRAFT_KEY = "readability-checker-draft";
const MAX_HISTORY = 10;

const MAX_CHARS_WARN = 50_000;
const MAX_CHARS_HARD = 100_000;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export default function ReadabilityChecker() {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [checkedText, setCheckedText] = useState("");
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [copyTextState, setCopyTextState] = useState<"idle" | "copied">("idle");
  const [resetConfirm, setResetConfirm] = useState(false);
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleResetClick = () => {
    if (!text.trim() && !checked) return;
    if (checked && !resetConfirm) {
      setResetConfirm(true);
      if (resetConfirmTimerRef.current) clearTimeout(resetConfirmTimerRef.current);
      resetConfirmTimerRef.current = setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    if (resetConfirmTimerRef.current) clearTimeout(resetConfirmTimerRef.current);
    setResetConfirm(false);
    reset();
  };

  const reset = () => {
    if (!text.trim() && !checked) return;
    const snapshot = { text, checked, checkedText, scoreHistory: [...scoreHistory], activeRewrite };
    setText("");
    setChecked(false);
    setCheckedText("");
    setScoreHistory([]);
    setActiveRewrite(null);
    setActivePassiveGuide(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
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

  useEffect(() => {
    try {
      if (text) {
        localStorage.setItem(DRAFT_KEY, text);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // storage full or unavailable — ignore
    }
  }, [text]);

  const [copyImprovedState, setCopyImprovedState] = useState<"idle" | "copied">("idle");
  const [copyMdState, setCopyMdState] = useState<"idle" | "copied">("idle");
  const [copyBadgeState, setCopyBadgeState] = useState<"idle" | "copied">("idle");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeRewrite, setActiveRewrite] = useState<{ original: string; rewritten: string } | null>(null);
  const [copyRewriteState, setCopyRewriteState] = useState<"idle" | "copied">("idle");
  const [activePassiveGuide, setActivePassiveGuide] = useState<{
    sentence: string;
    passivePhrase: string;
    agentHint: string | null;
  } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [shareLinkState, setShareLinkState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    // Load persisted analysis history
    setAnalysisHistory(loadHistory());

    // Restore auto-saved draft (if no URL param overrides it)
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("t");
    if (!encoded) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setText(saved);
      } catch {
        // storage unavailable — ignore
      }
    }
    if (!encoded) return;
    try {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      if (decoded.trim().split(/\s+/).length >= 10) {
        const { sentences, words } = tokenize(decoded);
        const score = Math.round(fleschScore(words, sentences));
        setText(decoded);
        setCheckedText(decoded);
        setChecked(true);
        setScoreHistory([score]);
      }
    } catch {
      // ignore malformed URLs
    }
  }, []);

  const downloadHistoryCSV = () => {
    if (analysisHistory.length === 0) return;
    const headers = ["Date", "Score", "Level", "Word Count", "Text Preview"];
    const rows = analysisHistory.map((e) => [
      new Date(e.timestamp).toLocaleString(),
      e.score,
      e.levelLabel,
      e.wordCount,
      `"${e.text.slice(0, 120).replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `readability-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("History Exported", { tool: "readability-checker", format: "csv", count: analysisHistory.length });
  };

  const copyShareLink = async () => {
    if (!checkedText.trim()) return;
    try {
      const bytes = new TextEncoder().encode(checkedText);
      const encoded = btoa(String.fromCharCode(...Array.from(bytes)));
      const url = `${window.location.origin}${window.location.pathname}?t=${encoded}`;
      window.history.replaceState({}, "", `?t=${encoded}`);
      await writeToClipboard(url);
      setShareLinkState("copied");
      setTimeout(() => setShareLinkState("idle"), 2000);
      trackEvent("Share Link Copied", { tool: "readability-checker" });
    } catch {
      toast.error("Could not generate share link", {
        description: "Your text may be too long for a URL.",
      });
    }
  };

  const copyText = async () => {
    await writeToClipboard(text);
    setCopyTextState("copied");
    setTimeout(() => setCopyTextState("idle"), 1500);
  };

  const checkWithText = (t: string) => {
    if (t.length > MAX_CHARS_HARD) {
      toast.error("Text is too large to analyse", {
        description: `Please trim your content to under ${(MAX_CHARS_HARD / 1000).toFixed(0)}k characters (currently ${(t.length / 1000).toFixed(1)}k).`,
      });
      return;
    }
    const { sentences, words } = tokenize(t);
    const newScore = Math.round(fleschScore(words, sentences));
    setScoreHistory((prev) => [...prev, newScore]);
    setCheckedText(t);
    setChecked(true);
    trackEvent("Tool Used", { tool: "readability-checker" });

    // Persist to analysis history
    const level = levelFromScore(newScore);
    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: t,
      score: newScore,
      levelLabel: level.label,
      wordCount: words.length,
      timestamp: Date.now(),
      sentenceCount: sentences.length,
      avgSentenceLen: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    };
    setAnalysisHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });

    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      150,
    );
  };

  const check = () => checkWithText(text);

  const handleWordSwap = (original: string, replacement: string) => {
    const lower = original.toLowerCase();
    const newText = text.replace(new RegExp(`\\b${lower}\\b`, "gi"), (match) =>
      /^[A-Z]/.test(match)
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement.toLowerCase(),
    );
    setText(newText);
    checkWithText(newText);
    toast(`Swapped "${original.toLowerCase()}" → "${replacement.toLowerCase()}"`, {
      description: "Analysis re-run with the updated text.",
      duration: 3000,
    });
  };

  const copyHeatmapReport = async () => {
    if (!results) return;
    const allWords = checkedText
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z']/g, ""))
      .filter((w) => w.length > 0);
    const withSyllables = allWords.map((w) => ({ word: w, syllables: countSyllables(w) }));
    const complex = withSyllables.filter((w) => w.syllables >= 3).sort((a, b) => b.syllables - a.syllables);
    const medium = withSyllables.filter((w) => w.syllables === 2);
    const simple = withSyllables.filter((w) => w.syllables === 1);
    const dedup = (arr: { word: string; syllables: number }[]) => {
      const seen = new Set<string>();
      return arr.filter(({ word }) => {
        const k = word.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };
    const lines: string[] = [
      "Word Complexity Heatmap Report",
      "================================",
      "",
      `3+ syllables — ${complex.length} word(s):`,
      ...dedup(complex).map(({ word, syllables }) => `  ${word}  (${syllables})`),
      "",
      `2 syllables — ${medium.length} word(s):`,
      ...dedup(medium).map(({ word }) => `  ${word}`),
      "",
      `1 syllable — ${simple.length} word(s):`,
      ...dedup(simple).map(({ word }) => `  ${word}`),
    ];
    await writeToClipboard(lines.join("\n"));
    toast("Heatmap report copied", {
      description: "Plain-text syllable breakdown copied to clipboard.",
      duration: 3000,
    });
  };

  const [copyHeatmapState, setCopyHeatmapState] = useState<"idle" | "copied">("idle");

  const copyAsMarkdown = async () => {
    if (!results) return;
    const lines: string[] = [];
    lines.push(`## Readability Report`);
    lines.push(``);
    const vibeLabel = vibeFromScore(results.score).label.replace(/^Vibe:\s*/i, "");
    lines.push(`**Vibe Status:** ${vibeLabel}`);
    lines.push(``);
    lines.push(`**Flesch Score:** ${results.score.toFixed(0)} / 100 — ${results.level.label}`);
    lines.push(`**Grade Level:** ${results.grade}`);
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
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      const el = document.createElement("textarea");
      el.value = lines.join("\n");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    navigator.vibrate?.(40);
    trackEvent("Result Copied", { tool: "readability-checker", format: "markdown" });
    setCopyMdState("copied");
    setTimeout(() => setCopyMdState("idle"), 1500);
  };

  const exportPDF = async () => {
    if (!results) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;
      const LINE = 16;
      const SECTION = 26;

      const addText = (
        text: string,
        size: number,
        style: "normal" | "bold" = "normal",
        color: [number, number, number] = [30, 30, 30],
        indent = 0,
      ) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        const wrapped = doc.splitTextToSize(text, contentW - indent);
        doc.text(wrapped, margin + indent, y);
        y += wrapped.length * (size * 1.35);
      };

      const addRule = (color: [number, number, number] = [220, 220, 220]) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 10;
      };

      // Header bar
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, pageW, 56, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FintechPressHub", margin, 34);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Readability Analysis Report", margin, 48);
      y = 80;

      // Date
      addText(
        `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
        9, "normal", [130, 130, 130],
      );
      y += SECTION / 2;

      // Score + level
      const scoreRgb: [number, number, number] =
        results.score >= 65 ? [22, 163, 74] : results.score >= 45 ? [217, 119, 6] : [220, 38, 38];
      addText(`Flesch Score: ${results.score.toFixed(0)} / 100 — ${results.level.label}`, 16, "bold", scoreRgb);
      y += 4;
      const vibeLabel = vibeFromScore(results.score).label.replace(/^Vibe:\s*/i, "");
      addText(`Grade Level: ${results.grade}  ·  Vibe: ${vibeLabel}`, 11, "normal", [80, 80, 80]);
      y += 4;
      const bench = benchmarkFromScore(results.score);
      addText(`${bench.icon} Reads like a ${bench.label}. ${bench.detail}`, 9, "normal", [100, 100, 100]);
      y += SECTION;
      addRule();
      y += 4;

      // Key stats
      addText("Key Statistics", 12, "bold");
      y += 8;
      const stats: [string, string][] = [
        ["Word count", results.wordCount.toLocaleString()],
        ["Sentences", results.sentenceCount.toLocaleString()],
        ["Avg sentence length", `${results.avgSentenceLen.toFixed(1)} words`],
        ["Avg syllables per word", results.avgSyllables.toFixed(2)],
        ["Reading time", `${Math.max(1, Math.ceil(results.wordCount / 200))} min`],
        ["Passive voice", `${results.passiveCount} sentence${results.passiveCount !== 1 ? "s" : ""}`],
      ];
      stats.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(`${label}:`, margin + 8, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(value, pageW - margin, y, { align: "right" });
        y += LINE * 1.3;
      });
      y += SECTION / 2;
      addRule();
      y += 4;

      // Sentence breakdown
      const allSegs = results.visualSegments.flat();
      const total = allSegs.length;
      if (total > 0) {
        addText("Sentence Breakdown", 12, "bold");
        y += 8;
        const pct = (n: number) => Math.round((n / total) * 100);
        const short  = allSegs.filter((s) => s.difficulty === "normal").length;
        const medium = allSegs.filter((s) => s.difficulty === "moderate").length;
        const long   = allSegs.filter((s) => s.difficulty === "hard").length;
        const passive = allSegs.filter((s) => s.passive).length;
        [
          [`Short  (≤15 words)`, short],
          [`Medium (16–25 words)`, medium],
          [`Long   (25+ words)`, long],
          [`Passive voice`, passive],
        ].forEach(([label, count]) => {
          addText(`${label}: ${count} (${pct(count as number)}%)`, 10, "normal", [80, 80, 80], 8);
          y += 2;
        });
        y += SECTION / 2;
        addRule();
        y += 4;
      }

      // Improvement tips
      if (results.tips.length > 0) {
        addText("Improvement Tips", 12, "bold");
        y += 8;
        results.tips.forEach((tip) => {
          addText(`• ${tip}`, 9, "normal", [60, 60, 60], 8);
          y += 2;
        });
        y += SECTION / 2;
        addRule();
        y += 4;
      }

      // Score history
      if (scoreHistory.length >= 2) {
        addText("Score History", 12, "bold");
        y += 8;
        scoreHistory.forEach((s, i) => {
          addText(`Edit ${i + 1}: ${Math.round(s)}`, 9, "normal", [80, 80, 80], 8);
          y += 2;
        });
        const delta = Math.round(scoreHistory[scoreHistory.length - 1] - scoreHistory[0]);
        addText(
          `Overall change: ${delta > 0 ? "+" : ""}${delta}`,
          9, "bold", delta >= 0 ? [22, 163, 74] : [220, 38, 38], 8,
        );
        y += SECTION / 2;
        addRule();
        y += 4;
      }

      // Footer
      addText(
        "Generated by FintechPressHub Readability Checker · fintechpresshub.com",
        8, "normal", [160, 160, 160],
      );

      doc.save(`readability-report-${new Date().toISOString().split("T")[0]}.pdf`);
      trackEvent("Result Exported", { tool: "readability-checker", format: "pdf" });
      toast.success("PDF exported!", { description: "Your readability report has been downloaded." });
    } catch (err) {
      console.error(err);
      toast.error("PDF export failed", { description: "Please try again." });
    } finally {
      setPdfLoading(false);
    }
  };

  const writeToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    navigator.vibrate?.(40);
  };

  const printReport = () => {
    if (!results) return;
    trackEvent("Result Exported", { tool: "readability-checker", format: "print" });
    window.print();
  };

  const copyImproved = async () => {
    const improved = applySimplifications(checkedText);
    await writeToClipboard(improved);
    setCopyImprovedState("copied");
    setTimeout(() => setCopyImprovedState("idle"), 1500);
  };

  const exportCsv = () => {
    if (!results) return;
    const vibe = vibeFromScore(results.score);
    const esc = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows: [string, string][] = [
      ["Metric", "Value"],
      ["Flesch Score", Math.round(results.score).toString()],
      ["Grade Level", results.grade],
      ["Readability Level", results.level.label],
      ["Vibe", vibe.label.replace(/\s*[^\w\s].*/u, "").trim()],
      ["Word Count", results.wordCount.toString()],
      ["Sentence Count", results.sentenceCount.toString()],
      ["Avg Sentence Length (words)", results.avgSentenceLen.toFixed(1)],
      ["Avg Syllables per Word", results.avgSyllables.toFixed(2)],
      ["Reading Time (min)", Math.max(1, Math.ceil(results.wordCount / 200)).toString()],
      ["Passive Voice Sentences", results.passiveCount.toString()],
      ...results.tips.map((tip, i): [string, string] => [`Tip ${i + 1}`, tip]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `readability-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBadge = async () => {
    if (!results) return;
    const score = Math.round(results.score);
    const label = results.level.label;
    const badgeColors: Record<string, { bg: string; border: string; color: string }> = {
      "Very Easy":  { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
      "Easy":       { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
      "Fairly Easy":{ bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" },
      "Standard":   { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" },
      "Fairly Hard":{ bg: "#fff7ed", border: "#fdba74", color: "#9a3412" },
      "Difficult":  { bg: "#fff1f2", border: "#fca5a5", color: "#991b1b" },
      "Very Difficult":{ bg: "#fff1f2", border: "#fca5a5", color: "#991b1b" },
    };
    const c = badgeColors[label] ?? { bg: "#f8fafc", border: "#cbd5e1", color: "#475569" };
    const html = `<span style="display:inline-flex;align-items:center;gap:6px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:${c.bg};border:1px solid ${c.border};color:${c.color};text-decoration:none;">📖 Readability: ${score} / ${label}</span>`;
    await writeToClipboard(html);
    trackEvent("Result Copied", { tool: "readability-checker", format: "badge" });
    setCopyBadgeState("copied");
    setTimeout(() => setCopyBadgeState("idle"), 1500);
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

  const charCount = text.length;
  const tooLarge = charCount > MAX_CHARS_HARD;
  const nearLimit = charCount > MAX_CHARS_WARN && !tooLarge;
  const canCheck = text.trim().split(/\s+/).length >= 10 && !tooLarge;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="readabilityChecker" />

      <PageHero
        eyebrow="Free Tool"
        title="Readability Checker"
        description="Professional readability analysis with real-time editing and score tracking."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
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
                <div className="flex items-center gap-6">
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
                    onClick={handleResetClick}
                    className={`transition-all ${
                      resetConfirm
                        ? "text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <RotateCcw className={`w-4 h-4 mr-1.5 ${resetConfirm ? "text-red-500" : ""}`} />
                    {resetConfirm ? "Are you sure?" : "Reset"}
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
                          <span className={tooLarge ? "text-red-600 font-semibold" : nearLimit ? "text-amber-600 font-semibold" : ""}>
                            <span className="font-semibold text-slate-700">{charCount.toLocaleString()}</span> chars
                            {nearLimit && ` — approaching ${(MAX_CHARS_HARD / 1000).toFixed(0)}k limit`}
                            {tooLarge && ` — exceeds ${(MAX_CHARS_HARD / 1000).toFixed(0)}k limit`}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  {tooLarge ? (
                    <span className="text-[11px] text-red-600 font-semibold shrink-0">
                      Trim to under {(MAX_CHARS_HARD / 1000).toFixed(0)}k characters to analyse.
                    </span>
                  ) : !canCheck && text.trim().length > 0 ? (
                    <span className="text-[11px] text-amber-600 shrink-0">
                      Enter at least 10 words to analyse.
                    </span>
                  ) : null}
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
          </div>

          <ErrorBoundary
            fallback={
              <div className="mt-6 max-w-3xl mx-auto">
                <Card className="border border-red-100 shadow-sm bg-red-50">
                  <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <p className="font-semibold text-slate-800">Analysis rendering failed</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Something went wrong while displaying your results. Your text is still in the editor — try clicking{" "}
                      <strong>Check Readability</strong> again.
                    </p>
                  </CardContent>
                </Card>
              </div>
            }
          >
          <AnimatePresence>
            {checked && results && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4 max-w-6xl mx-auto"
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
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={copyShareLink}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                    >
                      {shareLinkState === "copied" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-teal-500" />
                          Link copied!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3 mr-1" />
                          Copy link
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={copyBadge}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                    >
                      {copyBadgeState === "copied" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-teal-500" />
                          Badge copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy HTML badge
                        </>
                      )}
                    </Button>
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
                    <Button
                      onClick={exportCsv}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={printReport}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      Print / PDF
                    </Button>
                    <Button
                      onClick={exportPDF}
                      disabled={pdfLoading}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto h-9 sm:h-7 px-2.5 text-[11px] font-semibold border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
                    >
                      {pdfLoading ? (
                        <>
                          <span className="w-3 h-3 mr-1 border-2 border-teal-400 border-t-transparent rounded-full animate-spin inline-block" />
                          Exporting…
                        </>
                      ) : (
                        <>
                          <FileDown className="w-3 h-3 mr-1" />
                          Export PDF
                        </>
                      )}
                    </Button>
                  </div>
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
                        {(() => {
                          const bench = benchmarkFromScore(results.score);
                          return (
                            <div className="mt-2 flex items-start gap-1.5 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100">
                              <span className="text-sm leading-none mt-px shrink-0">{bench.icon}</span>
                              <span className="text-[11px] text-slate-500 leading-snug">
                                <span className="font-semibold text-slate-700">Reads like a {bench.label}.</span>{" "}
                                {bench.detail}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Benchmark scale — visible on mobile, moved to sidebar on desktop */}
                    <div className="border-t border-slate-100 pt-4 md:hidden">
                      <BenchmarkScale score={results.score} />
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

                {/* Sentence Distribution */}
                <SentenceDistributionBar segments={results.visualSegments} />

                {/* Score History Chart — visible on mobile, moved to sidebar on desktop */}
                <div className="md:hidden">
                  <ScoreHistoryChart scores={scoreHistory} onClear={() => setScoreHistory([])} />
                </div>

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

                {/* Two-column desktop grid: Visual Analysis left, sticky sidebar right */}
                <div className="md:grid md:grid-cols-[1fr_320px] md:items-start md:gap-6">

                {/* Visual Analysis */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-teal-600" />
                          Visual Analysis
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowHeatmap((prev) => !prev)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                            showHeatmap
                              ? "bg-orange-100 border-orange-300 text-orange-700"
                              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                          }`}
                          title="Toggle word complexity heatmap"
                        >
                          <Flame className="w-3 h-3" />
                          Heatmap
                        </button>
                      </div>
                      {showHeatmap && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: "#fed7aa" }} />
                            3+ syllables
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: "#fef3c7" }} />
                            2 syllables
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-slate-100 border border-slate-200" />
                            1 syllable
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Highlight Key — shown above the text in sentence-difficulty mode */}
                    {!showHeatmap && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-md">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">
                          Highlight Key
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-sm shrink-0 border border-red-200"
                            style={{ backgroundColor: "#fee2e2" }}
                          />
                          Very Hard
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-sm shrink-0 border border-yellow-200"
                            style={{ backgroundColor: "#fef9c3" }}
                          />
                          Moderately Hard
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-sm shrink-0 border-b-2 border-purple-400"
                            style={{ backgroundColor: "#f3e8ff" }}
                          />
                          Passive Voice
                        </span>
                      </div>
                    )}

                    <div
                      className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-100"
                      style={{ lineHeight: "2", fontSize: "0.875rem", fontFamily: "inherit" }}
                    >
                      {showHeatmap ? (
                        renderWordHeatmap(results.visualSegments)
                      ) : (
                        results.visualSegments.map((para, pi) => (
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
                                      ? { ...baseStyle, backgroundColor: "#f3e8ff", borderBottom: "2px solid #c084fc" }
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
                                    if (seg.passive) {
                                      const match = seg.text.match(PASSIVE_RE);
                                      const passivePhrase = match ? match[0] : "";
                                      const byMatch = seg.text.match(/\bby\s+([^.,!?]+?)(?:[.,!?]|$)/i);
                                      const agentHint = byMatch ? byMatch[1].trim() : null;
                                      setActivePassiveGuide((prev) =>
                                        prev?.sentence === seg.text
                                          ? null
                                          : { sentence: seg.text, passivePhrase, agentHint },
                                      );
                                    } else {
                                      setActivePassiveGuide(null);
                                    }
                                    if (seg.difficulty !== "normal") {
                                      const rewritten = simplifyText(seg.text);
                                      setActiveRewrite((prev) =>
                                        prev?.original === seg.text ? null : { original: seg.text, rewritten },
                                      );
                                      setCopyRewriteState("idle");
                                    } else {
                                      setActiveRewrite(null);
                                    }
                                  } : undefined}
                                >
                                  {renderSentenceTokens(seg.text, handleWordSwap)}
                                  {si < para.length - 1 ? " " : ""}
                                </span>
                              );
                            })}
                          </p>
                        ))
                      )}
                    </div>

                    {activePassiveGuide && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">
                            Passive Voice — How to Fix
                          </div>
                          <button
                            onClick={() => setActivePassiveGuide(null)}
                            className="text-purple-300 hover:text-purple-600 text-sm leading-none p-0.5 rounded transition-colors"
                            aria-label="Dismiss"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed m-0">
                          Detected:{" "}
                          <span className="font-semibold text-purple-700 bg-purple-100 px-1 rounded">
                            "{activePassiveGuide.passivePhrase}"
                          </span>
                        </p>
                        <div className="text-xs text-slate-700 space-y-1">
                          <p className="font-medium m-0">To rewrite in active voice:</p>
                          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1 m-0">
                            <li>
                              Ask: <strong>who or what</strong> performed the action
                              {activePassiveGuide.agentHint ? (
                                <> — likely <span className="font-semibold text-purple-700">"{activePassiveGuide.agentHint}"</span></>
                              ) : "?"}
                            </li>
                            <li>Move that agent to the <em>start</em> of the sentence.</li>
                            <li>
                              Replace{" "}
                              <span className="font-mono text-[10px] bg-purple-100 px-1 rounded">
                                {activePassiveGuide.passivePhrase}
                              </span>{" "}
                              with a direct active verb.
                            </li>
                          </ol>
                        </div>
                        {activePassiveGuide.agentHint && (
                          <div className="bg-white border border-purple-100 rounded p-2 text-[11px] space-y-1">
                            <div className="text-slate-400 line-through leading-relaxed">
                              {activePassiveGuide.sentence}
                            </div>
                            <div className="text-slate-700 font-medium leading-relaxed">
                              Try starting with:{" "}
                              <span className="text-purple-700 font-semibold capitalize">
                                "{activePassiveGuide.agentHint}"
                              </span>…
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 italic">
                          Example: "The report was written by the team." → "The team wrote the report."
                        </div>
                      </div>
                    )}

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
                            await writeToClipboard(activeRewrite.rewritten);
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
                        Dotted amber — complex word with a simpler alternative (hover to preview &amp; swap it instantly).
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2 h-0.5 border-b-2 border-dashed border-rose-400" />
                        Dashed rose — weak or vague word (hover for a stronger suggestion).
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={copyImproved}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs font-semibold border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300"
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
                      {showHeatmap && (
                        <Button
                          onClick={async () => {
                            await copyHeatmapReport();
                            setCopyHeatmapState("copied");
                            setTimeout(() => setCopyHeatmapState("idle"), 1500);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 text-xs font-semibold border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
                        >
                          {copyHeatmapState === "copied" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Flame className="w-3.5 h-3.5 mr-1.5" />
                              Copy heatmap report
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sticky sidebar — desktop only */}
                <div className="hidden md:flex md:flex-col md:gap-4 md:sticky md:top-6 md:self-start">
                  <ScoreHistoryChart scores={scoreHistory} onClear={() => setScoreHistory([])} />
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <BenchmarkScale score={results.score} />
                    </CardContent>
                  </Card>
                </div>

                </div>{/* end two-column grid */}

                {/* Analysis History */}
                {analysisHistory.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowHistory((p) => !p)}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-teal-700 transition-colors"
                        >
                          <Clock className="w-4 h-4 text-teal-500 shrink-0" />
                          Past Analyses
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                            ({analysisHistory.length})
                          </span>
                          {showHistory ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <div className="flex items-center gap-3">
                          {analysisHistory.length >= 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompareMode((p) => !p);
                                setCompareSelection([]);
                                if (!showHistory) setShowHistory(true);
                              }}
                              className={`flex items-center gap-1 text-[11px] transition-colors ${compareMode ? "text-teal-600 font-semibold" : "text-slate-400 hover:text-teal-600"}`}
                              title="Compare two analyses side-by-side"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              Compare
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={downloadHistoryCSV}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-600 transition-colors"
                            title="Download history as CSV"
                          >
                            <Download className="w-3 h-3" />
                            CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnalysisHistory([]);
                              saveHistory([]);
                              setShowHistory(false);
                              setCompareMode(false);
                              setCompareSelection([]);
                            }}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                            title="Clear all history"
                          >
                            <Trash2 className="w-3 h-3" />
                            Clear
                          </button>
                        </div>
                      </div>

                      {compareMode && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          {compareSelection.length === 0
                            ? "Select two analyses below to compare them."
                            : compareSelection.length === 1
                            ? "Now select one more to compare."
                            : ""}
                        </p>
                      )}

                      {showHistory && (
                        <div className="mt-4 space-y-2">
                          {analysisHistory.map((entry) => {
                            const level = levelFromScore(entry.score);
                            const isSelected = compareSelection.includes(entry.id);
                            const selIdx = compareSelection.indexOf(entry.id);
                            const canSelect = compareMode && (compareSelection.length < 2 || isSelected);
                            const ago = (() => {
                              const s = Math.round((Date.now() - entry.timestamp) / 1000);
                              if (s < 60) return `${s}s ago`;
                              const m = Math.round(s / 60);
                              if (m < 60) return `${m}m ago`;
                              const h = Math.round(m / 60);
                              if (h < 24) return `${h}h ago`;
                              return `${Math.round(h / 24)}d ago`;
                            })();
                            return (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => {
                                  if (compareMode) {
                                    if (isSelected) {
                                      setCompareSelection((p) => p.filter((id) => id !== entry.id));
                                    } else if (compareSelection.length < 2) {
                                      setCompareSelection((p) => [...p, entry.id]);
                                    }
                                  } else {
                                    setText(entry.text);
                                    checkWithText(entry.text);
                                  }
                                }}
                                disabled={compareMode && !canSelect}
                                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
                                  compareMode && !canSelect
                                    ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50"
                                    : isSelected
                                    ? "border-teal-400 bg-teal-50 ring-1 ring-teal-300"
                                    : "border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-200"
                                }`}
                              >
                                {compareMode && (
                                  <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                    isSelected
                                      ? "border-teal-500 bg-teal-500 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}>
                                    {isSelected ? selIdx + 1 : ""}
                                  </div>
                                )}
                                <div className={`text-xl font-black w-10 text-center shrink-0 ${level.color}`}>
                                  {entry.score}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-[11px] font-semibold ${level.color}`}>
                                    {entry.levelLabel}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {entry.text.slice(0, 80).trim()}
                                    {entry.text.length > 80 ? "…" : ""}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                  <div className="text-[10px] text-muted-foreground">{ago}</div>
                                  <div className="text-[10px] text-muted-foreground">{entry.wordCount} words</div>
                                  {!compareMode && (
                                    <div className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                                      Load →
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {/* Comparison panel */}
                          {compareMode && compareSelection.length === 2 && (() => {
                            const [aId, bId] = compareSelection;
                            const a = analysisHistory.find((e) => e.id === aId)!;
                            const b = analysisHistory.find((e) => e.id === bId)!;
                            if (!a || !b) return null;
                            const rows: { label: string; aVal: number | string; bVal: number | string; higherBetter: boolean }[] = [
                              { label: "Score", aVal: a.score, bVal: b.score, higherBetter: true },
                              { label: "Words", aVal: a.wordCount, bVal: b.wordCount, higherBetter: false },
                              { label: "Sentences", aVal: a.sentenceCount ?? "—", bVal: b.sentenceCount ?? "—", higherBetter: false },
                              { label: "Avg sent. length", aVal: a.avgSentenceLen != null ? `${a.avgSentenceLen} words` : "—", bVal: b.avgSentenceLen != null ? `${b.avgSentenceLen} words` : "—", higherBetter: false },
                            ];
                            return (
                              <div className="mt-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-slate-50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-widest">Comparison</p>
                                  <button
                                    type="button"
                                    onClick={() => { setCompareSelection([]); }}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
                                  >
                                    Reset selection
                                  </button>
                                </div>
                                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 text-[11px]">
                                  <div className="text-slate-400 font-semibold" />
                                  <div className="text-center font-bold text-teal-700">① {levelFromScore(a.score).label}</div>
                                  <div className="text-center font-bold text-teal-700">② {levelFromScore(b.score).label}</div>
                                  {rows.map(({ label, aVal, bVal, higherBetter }) => {
                                    const aNum = typeof aVal === "number" ? aVal : null;
                                    const bNum = typeof bVal === "number" ? bVal : null;
                                    const diff = aNum != null && bNum != null ? bNum - aNum : null;
                                    const diffLabel = diff == null ? "" : diff === 0 ? "=" : `${diff > 0 ? "+" : ""}${typeof bVal === "number" ? diff : diff.toFixed(1)}`;
                                    const diffColor = diff == null || diff === 0 ? "text-slate-400" : (higherBetter ? diff > 0 : diff < 0) ? "text-emerald-600" : "text-amber-600";
                                    return (
                                      <React.Fragment key={label}>
                                        <div className="text-slate-500 text-right self-center pr-1">{label}</div>
                                        <div className="text-center font-semibold text-slate-700 bg-white rounded-md py-1 border border-slate-100">{String(aVal)}</div>
                                        <div className={`text-center font-semibold text-slate-700 bg-white rounded-md py-1 border border-slate-100 relative`}>
                                          {String(bVal)}
                                          {diffLabel && (
                                            <span className={`absolute -top-2 -right-1 text-[9px] font-bold ${diffColor} bg-white border border-slate-100 rounded-full px-1 leading-4`}>
                                              {diffLabel}
                                            </span>
                                          )}
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => { setText(a.text); checkWithText(a.text); }}
                                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 text-teal-700 transition-colors"
                                  >
                                    Load ①
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setText(b.text); checkWithText(b.text); }}
                                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 text-teal-700 transition-colors"
                                  >
                                    Load ②
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

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

                <p className="text-center text-[11px] text-muted-foreground py-1">
                  Designed by a Vibe Coder | Empowering Clear Communication
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          </ErrorBoundary>
        </div>
      </section>

      {/* ── Sticky mobile bottom action bar ── shown only when results are visible on small screens */}
      {checked && results && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 pt-2.5 pb-4 space-y-2">
          {/* Row 1: copy actions */}
          <div className="flex gap-2">
            <Button
              onClick={copyImproved}
              size="sm"
              className="flex-1 h-10 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              {copyImprovedState === "copied" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Improved Text
                </>
              )}
            </Button>
            <Button
              onClick={copyAsMarkdown}
              variant="outline"
              size="sm"
              className="flex-1 h-10 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {copyMdState === "copied" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy as Markdown
                </>
              )}
            </Button>
          </div>
          {/* Row 2: share actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const score = Math.round(results.score);
                const level = results.level.label;
                const url = window.location.href;
                const text = `My readability score: ${score}/100 (${level}) 📖 Check yours free: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe5c] text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                const score = Math.round(results.score);
                const level = results.level.label;
                const url = window.location.href;
                const tweet = `My readability score: ${score}/100 (${level}) 📖 Check yours free:`;
                window.open(
                  `https://x.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`,
                  "_blank",
                  "noopener",
                );
              }}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold bg-black hover:bg-slate-800 text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden print-only report ── revealed only by @media print ── */}
      {checked && results && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
@media print {
  body * { visibility: hidden !important; }
  .readability-print-report,
  .readability-print-report * { visibility: visible !important; }
  .readability-print-report {
    display: block !important;
    position: fixed !important;
    inset: 0 !important;
    padding: 32px 40px !important;
    background: #fff !important;
    font-family: system-ui, sans-serif !important;
    color: #1e293b !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
  }
  @page { margin: 0; size: A4 portrait; }
}
          ` }} />
          <div className="readability-print-report" aria-hidden="true" style={{ display: "none" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0d9488", paddingBottom: "12px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0d9488" }}>FintechPressHub</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Readability Analysis Report</div>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right" }}>
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                <br />fintechpresshub.com
              </div>
            </div>

            {/* Score + Level */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0,
                border: `4px solid ${results.score >= 65 ? "#16a34a" : results.score >= 45 ? "#d97706" : "#dc2626"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "22px", fontWeight: "800", color: results.score >= 65 ? "#16a34a" : results.score >= 45 ? "#d97706" : "#dc2626", lineHeight: "1" }}>
                  {results.score.toFixed(0)}
                </span>
                <span style={{ fontSize: "9px", color: "#94a3b8" }}>/100</span>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: results.score >= 65 ? "#16a34a" : results.score >= 45 ? "#d97706" : "#dc2626" }}>
                  {results.level.label}
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                  Grade: {results.grade}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {vibeFromScore(results.score).label.replace(/^Vibe:\s*/i, "")} · {benchmarkFromScore(results.score).icon} Reads like a {benchmarkFromScore(results.score).label}
                </div>
              </div>
            </div>

            {/* Stats table */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "8px" }}>Key Statistics</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <tbody>
                  {([
                    ["Word count", results.wordCount.toLocaleString()],
                    ["Sentences", results.sentenceCount.toLocaleString()],
                    ["Avg sentence length", `${results.avgSentenceLen.toFixed(1)} words`],
                    ["Avg syllables per word", results.avgSyllables.toFixed(2)],
                    ["Reading time", `${Math.max(1, Math.ceil(results.wordCount / 200))} min`],
                    ["Passive voice", `${results.passiveCount} sentence${results.passiveCount !== 1 ? "s" : ""}`],
                  ] as [string, string][]).map(([label, value], i) => (
                    <tr key={label} style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                      <td style={{ padding: "5px 10px", color: "#475569", fontWeight: "500" }}>{label}</td>
                      <td style={{ padding: "5px 10px", color: "#1e293b", fontWeight: "700", textAlign: "right" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tips */}
            {results.tips.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "8px" }}>Top Improvement Tips</div>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {results.tips.slice(0, 4).map((tip, i) => (
                    <li key={i} style={{ fontSize: "12px", color: "#334155", marginBottom: "5px" }}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div style={{ position: "absolute", bottom: "24px", left: "40px", right: "40px", borderTop: "1px solid #e2e8f0", paddingTop: "10px", fontSize: "10px", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
              <span>Generated by FintechPressHub Readability Checker</span>
              <span>fintechpresshub.com</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
