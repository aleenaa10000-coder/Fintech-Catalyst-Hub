import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
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
  Layers,
  Crosshair,
  Trophy,
  BookOpen,
  Download,
  Link2,
  PanelLeft,
  GitCompare,
  X,
  Trash2,
} from "lucide-react";

type Intent = "Informational" | "Commercial" | "Transactional" | "Navigational";

type Cluster = "Infrastructure & Security" | "Commercial Solutions" | "Fintech General";

type Result = {
  keyword: string;
  score: number;
  label: string;
  intent: Intent;
  intentReason: string;
  cluster: Cluster;
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

function detectCluster(kw: string): Cluster {
  if (kw.includes("security") || kw.includes("api")) return "Infrastructure & Security";
  if (kw.includes("best") || kw.includes("platform")) return "Commercial Solutions";
  return "Fintech General";
}

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
  const cluster = detectCluster(kw);

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

  tips.push(
    `To rank for "${keyword.trim()}", you should also create content for 3–5 related terms in the ${cluster} cluster to build Topical Authority.`,
  );

  return {
    keyword: keyword.trim(),
    score,
    label,
    intent,
    intentReason,
    cluster,
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

const CLUSTER_COLOR: Record<Cluster, string> = {
  "Infrastructure & Security": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Commercial Solutions": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Fintech General": "bg-teal-50 text-teal-700 border-teal-200",
};

function intentValue(intent: Intent): number {
  return intent === "Commercial" || intent === "Transactional" ? 1 : 0;
}

type QuadrantInfo = {
  label: string;
  sublabel: string;
  dotColor: string;
  ringColor: string;
  labelColor: string;
};

const CLUSTER_CONTENT_TEMPLATES: Record<Cluster, string[]> = {
  "Infrastructure & Security": [
    "How to Secure {kw}: A Complete Fintech Compliance Guide",
    "{kw} Best Practices: What Enterprise Security Teams Get Right",
    "The {kw} Implementation Checklist for Regulated Industries",
    "{kw} vs Alternatives: A Technical Security Breakdown",
    "What Every Fintech CTO Must Know About {kw}",
  ],
  "Commercial Solutions": [
    "Best {kw} Tools in 2025: An Honest Comparison",
    "How to Choose the Right {kw} for Your Fintech Stack",
    "{kw} Pricing Explained: What You're Actually Paying For",
    "Why High-Growth Fintechs Are Switching to {kw}",
    "{kw} ROI: Real Case Studies from Fintech Leaders",
  ],
  "Fintech General": [
    "What Is {kw}? A Plain-English Guide for Fintech Teams",
    "How {kw} Is Reshaping Financial Services in 2025",
    "{kw} Trends Every Fintech Founder Should Track",
    "The Beginner's Guide to {kw}: Concepts, Tools & Strategy",
    "{kw} Best Practices: Lessons from Industry Leaders",
  ],
};

function generateClusterIdeas(cluster: Cluster, keyword: string): string[] {
  return CLUSTER_CONTENT_TEMPLATES[cluster].map((t) =>
    t.replace(/\{kw\}/g, keyword.trim()),
  );
}

const CONFETTI_COLORS = [
  "bg-emerald-400", "bg-lime-400", "bg-violet-500",
  "bg-yellow-400", "bg-pink-400", "bg-cyan-400", "bg-orange-400",
];

function QuickWinBurst() {
  const [particles] = useState(() =>
    Array.from({ length: 56 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: (Math.random() - 0.5) * 780,
      y: -(Math.random() * 560 + 100),
      rotate: Math.random() * 720 - 360,
      w: Math.random() * 10 + 5,
      h: Math.random() * 7 + 4,
      delay: Math.random() * 0.35,
      duration: 1.4 + Math.random() * 0.9,
      isCircle: i % 4 === 0,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 80, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.1 }}
          transition={{ duration: p.duration, ease: "easeOut", delay: p.delay }}
          className={`absolute ${p.color} ${p.isCircle ? "rounded-full" : "rounded-[2px]"}`}
          style={{ width: p.w, height: p.h }}
        />
      ))}
    </div>
  );
}

function getQuadrantInfo(score: number, intent: Intent): QuadrantInfo {
  const highValue = intentValue(intent) === 1;
  const highDifficulty = score >= 50;
  if (!highDifficulty && highValue)
    return { label: "Quick Win", sublabel: "Low difficulty · High commercial value", dotColor: "bg-emerald-500", ringColor: "bg-emerald-400", labelColor: "text-emerald-700" };
  if (highDifficulty && highValue)
    return { label: "Long-term Target", sublabel: "High value · Needs authority building", dotColor: "bg-amber-500", ringColor: "bg-amber-400", labelColor: "text-amber-700" };
  if (!highDifficulty && !highValue)
    return { label: "Filler Content", sublabel: "Easy to rank · Low commercial intent", dotColor: "bg-slate-400", ringColor: "bg-slate-300", labelColor: "text-slate-600" };
  return { label: "Supporting Asset", sublabel: "Hard to rank · Use as cluster support", dotColor: "bg-blue-500", ringColor: "bg-blue-400", labelColor: "text-blue-700" };
}

function scoreColor(score: number, active: boolean): string {
  if (active) return "rgba(255,255,255,0.9)";
  return score >= 75
    ? "#f87171"
    : score >= 55
      ? "#fb923c"
      : score >= 35
        ? "#fbbf24"
        : "#22c55e";
}

function SparkLine({ scores, active }: { scores: number[]; active: boolean }) {
  const W = 36;
  const H = 14;
  const last = scores[scores.length - 1];
  const color = scoreColor(last, active);

  if (scores.length === 1) {
    const cy = H - (Math.min(100, Math.max(0, last)) / 100) * H;
    return (
      <svg width={W} height={H} className="shrink-0 overflow-visible" aria-hidden>
        <line x1={0} y1={cy} x2={W} y2={cy} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity={0.35} />
        <circle cx={W / 2} cy={cy} r={2.5} fill={color} opacity={0.9} />
      </svg>
    );
  }

  const xs = scores.map((_, i) => (i / (scores.length - 1)) * W);
  const ys = scores.map((s) => H - (Math.min(100, Math.max(0, s)) / 100) * H);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <svg width={W} height={H} className="shrink-0 overflow-visible" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {scores.map((_, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={ys[i]}
          r={i === scores.length - 1 ? 2.5 : 1.5}
          fill={color}
          opacity={i === scores.length - 1 ? 1 : 0.5}
        />
      ))}
    </svg>
  );
}

function TrendArrow({ scores, active }: { scores: number[]; active: boolean }) {
  if (scores.length < 2) return null;
  const first = scores[0];
  const last = scores[scores.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 2) {
    return <span className={`text-[9px] font-bold ${active ? "text-violet-200" : "text-slate-400"}`} title="Stable">—</span>;
  }
  if (diff > 0) {
    return <span className={`text-[9px] font-bold ${active ? "text-red-300" : "text-red-400"}`} title={`+${diff} harder`}>↑</span>;
  }
  return <span className={`text-[9px] font-bold ${active ? "text-emerald-300" : "text-emerald-500"}`} title={`${diff} easier`}>↓</span>;
}

type HistoryEntry = Result & { scores: number[] };

const QUADRANT_MINI_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Quick Win":        { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Long-term Target": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  "Filler Content":   { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  "Supporting Asset": { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
};

function MiniQuadrant({ entry }: { entry: HistoryEntry }) {
  const qInfo = getQuadrantInfo(entry.score, entry.intent);
  const dotXPct = 5 + (entry.score / 100) * 90;
  const dotYPct = 5 + (1 - intentValue(entry.intent)) * 90;
  return (
    <div className="relative w-full rounded-md overflow-hidden border border-slate-100" style={{ paddingBottom: "70%" }}>
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0">
        <div className="bg-emerald-50 border-r border-b border-slate-100" />
        <div className="bg-amber-50 border-b border-slate-100" />
        <div className="bg-slate-50 border-r border-slate-100" />
        <div className="bg-blue-50" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />
        </div>
        <div
          className="absolute z-10"
          style={{ left: `${dotXPct}%`, top: `${dotYPct}%`, transform: "translate(-50%,-50%)" }}
        >
          <div className={`w-3 h-3 rounded-full ${qInfo.dotColor} ring-2 ring-white shadow`} />
        </div>
      </div>
    </div>
  );
}

function ComparePanelOverlay({
  a, b, onClose,
}: {
  a: HistoryEntry; b: HistoryEntry; onClose: () => void;
}) {
  const qa = getQuadrantInfo(a.score, a.intent);
  const qb = getQuadrantInfo(b.score, b.intent);

  function Side({ entry, qInfo }: { entry: HistoryEntry; qInfo: ReturnType<typeof getQuadrantInfo> }) {
    const styles = QUADRANT_MINI_STYLES[qInfo.label] ?? { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
    return (
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${styles.bg} ${styles.text} border-current/20`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {qInfo.label}
          </span>
          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${INTENT_COLOR[entry.intent]}`}>
            {entry.intent}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black ${SCORE_COLOR(entry.score)}`}>{entry.score}</span>
          <span className="text-xs text-muted-foreground">/ 100 · {entry.label}</span>
        </div>
        <MiniQuadrant entry={entry} />
        <div className={`rounded-lg px-3 py-2 border ${styles.bg} border-current/10`}>
          <p className={`text-[11px] font-medium leading-relaxed ${styles.text}`}>
            <span className="font-bold">{qInfo.label}:</span> {qInfo.sublabel}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Volume est.</p>
          <p className="text-sm font-bold text-violet-600">{entry.volumeRange}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cluster</p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${CLUSTER_COLOR[entry.cluster]}`}>
            <Layers className="w-2.5 h-2.5" />
            {entry.cluster}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-4 rounded-xl border border-violet-200 bg-white shadow-lg overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-bold text-violet-900">Phrasing Comparison</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate mb-3" title={a.keyword}>"{a.keyword}"</p>
            <Side entry={a} qInfo={qa} />
          </div>
          <div className="w-px bg-slate-100 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate mb-3" title={b.keyword}>"{b.keyword}"</p>
            <Side entry={b} qInfo={qb} />
          </div>
        </div>
        {qa.label !== qb.label && (
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Takeaway:</span>{" "}
              <span className="font-semibold">"{a.keyword}"</span> lands in{" "}
              <span className={`font-bold ${QUADRANT_MINI_STYLES[qa.label]?.text ?? "text-slate-700"}`}>{qa.label}</span>{" "}
              while{" "}
              <span className="font-semibold">"{b.keyword}"</span> is a{" "}
              <span className={`font-bold ${QUADRANT_MINI_STYLES[qb.label]?.text ?? "text-slate-700"}`}>{qb.label}</span>.{" "}
              {intentValue(a.intent) > intentValue(b.intent)
                ? `Prioritise "${a.keyword}" for commercial return.`
                : intentValue(b.intent) > intentValue(a.intent)
                  ? `Prioritise "${b.keyword}" for commercial return.`
                  : a.score < b.score
                    ? `"${a.keyword}" is easier to rank — consider targeting it first.`
                    : `"${b.keyword}" is easier to rank — consider targeting it first.`}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function KeywordDifficultyEstimator() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedCluster, setCopiedCluster] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (kw: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) {
        next.delete(kw);
      } else if (next.size < 2) {
        next.add(kw);
      }
      return next;
    });
    setShowCompare(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q && q.trim().length >= 2) {
      const kw = q.trim();
      setKeyword(kw);
      const r = estimateDifficulty(kw);
      setResult(r);
      setHistory([{ ...r, scores: [r.score] }]);
    }
  }, []);

  const reset = () => {
    setKeyword("");
    setResult(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const analyse = () => {
    if (!keyword.trim()) return;
    const r = estimateDifficulty(keyword);
    setResult(r);
    setHistory((prev) => {
      const idx = prev.findIndex(
        (h) => h.keyword.toLowerCase() === r.keyword.toLowerCase(),
      );
      const existingScores = idx >= 0 ? prev[idx].scores : [];
      const scores = [...existingScores, r.score].slice(-5);
      const entry = { ...r, scores };
      const filtered = prev.filter((_, i) => i !== idx);
      return [entry, ...filtered].slice(0, 10);
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?q=${encodeURIComponent(r.keyword)}`,
    );
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyLongTail = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyClusterIdea = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCluster(idx);
    setTimeout(() => setCopiedCluster(null), 2000);
  };

  const downloadAnalysis = (r: Result) => {
    const ideas = generateClusterIdeas(r.cluster, r.keyword);
    const sep = "─".repeat(48);
    const lines = [
      "KEYWORD ANALYSIS REPORT",
      "=".repeat(48),
      `Keyword:       ${r.keyword}`,
      `Difficulty:    ${r.score} / 100 — ${r.label}`,
      `Intent:        ${r.intent}`,
      `Intent Note:   ${r.intentReason}`,
      `Cluster:       ${r.cluster}`,
      `Volume Est.:   ${r.volumeRange}`,
      "",
      `CLUSTER CONTENT IDEAS  [${r.cluster}]`,
      sep,
      ...ideas.map((t, i) => `${i + 1}. ${t}`),
      "",
      "LONG-TAIL VARIATIONS",
      sep,
      ...r.longTails.map((lt, i) => `${i + 1}. ${lt}`),
      "",
      "STRATEGY TIPS",
      sep,
      ...r.tips.map((tip) => `• ${tip}`),
      "",
      sep,
      "Generated by FintechPressHub — Keyword Difficulty Estimator",
      "https://fintechpresshub.com/tools/keyword-difficulty-estimator",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.keyword.replace(/\s+/g, "-").toLowerCase()}-analysis.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex gap-6 items-start">

            {/* ── Collapsible Search History Sidebar ── */}
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.aside
                  key="sidebar"
                  initial={{ opacity: 0, width: 0, x: -20 }}
                  animate={{ opacity: 1, width: 256, x: 0 }}
                  exit={{ opacity: 0, width: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="shrink-0 overflow-hidden sticky top-6 self-start hidden lg:block"
                  style={{ width: 256 }}
                >
                  <div className="w-64 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Sidebar header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-1.5">
                        <PanelLeft className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Search History</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {history.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setHistory([]); setResult(null); setKeyword(""); setCompareSet(new Set()); setShowCompare(false); }}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Clear history"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSidebarOpen(false)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Compare action bar */}
                    <AnimatePresence>
                      {compareSet.size > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-b border-violet-100"
                        >
                          <div className="px-3 py-2 bg-violet-50 flex items-center gap-2">
                            <span className="text-[10px] text-violet-700 font-semibold flex-1">
                              {compareSet.size === 1 ? "Pick one more to compare" : "Ready to compare"}
                            </span>
                            {compareSet.size === 2 && (
                              <button
                                type="button"
                                onClick={() => setShowCompare((v) => !v)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-600 text-white rounded-full px-2.5 py-1 hover:bg-violet-700 transition-colors"
                              >
                                <GitCompare className="w-3 h-3" />
                                Compare
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setCompareSet(new Set()); setShowCompare(false); }}
                              className="text-violet-400 hover:text-violet-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* History cards */}
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      {history.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                          <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Analyse a keyword to start building your history.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {history.map((h) => {
                            const isActive = result?.keyword.toLowerCase() === h.keyword.toLowerCase();
                            const qInfo = getQuadrantInfo(h.score, h.intent);
                            const styles = QUADRANT_MINI_STYLES[qInfo.label] ?? { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
                            const inCompare = compareSet.has(h.keyword);
                            return (
                              <motion.div
                                key={h.keyword}
                                layout
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`px-3 py-2.5 transition-colors ${isActive ? "bg-violet-50" : "hover:bg-slate-50"}`}
                              >
                                {/* Keyword + score row */}
                                <button
                                  type="button"
                                  className="w-full text-left"
                                  onClick={() => { setResult(h); setKeyword(h.keyword); }}
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className={`text-[11px] font-semibold truncate flex-1 ${isActive ? "text-violet-700" : "text-slate-700"}`}>
                                      {h.keyword}
                                    </span>
                                    <span className={`text-xs font-black tabular-nums shrink-0 ${SCORE_COLOR(h.score)}`}>
                                      {h.score}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${styles.bg} ${styles.text}`}>
                                      <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
                                      {qInfo.label}
                                    </span>
                                    <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${INTENT_COLOR[h.intent]}`}>
                                      {h.intent}
                                    </span>
                                  </div>
                                  <MiniQuadrant entry={h} />
                                  {h.scores.length >= 2 && (
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                      <SparkLine scores={h.scores} active={false} />
                                      <TrendArrow scores={h.scores} active={false} />
                                      <span className="text-[9px] text-slate-400">{h.scores.length} analyses</span>
                                    </div>
                                  )}
                                </button>
                                {/* Compare toggle */}
                                <button
                                  type="button"
                                  onClick={() => toggleCompare(h.keyword)}
                                  disabled={!inCompare && compareSet.size >= 2}
                                  className={`mt-2 w-full inline-flex items-center justify-center gap-1 text-[10px] font-semibold rounded-md px-2 py-1 border transition-all ${
                                    inCompare
                                      ? "bg-violet-600 text-white border-violet-600"
                                      : compareSet.size >= 2
                                        ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                                  }`}
                                >
                                  <GitCompare className="w-2.5 h-2.5" />
                                  {inCompare ? "Selected" : "Compare"}
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0 max-w-3xl mx-auto lg:mx-0">

          <div className="flex items-center gap-3 mb-8">
            {/* Sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-colors shrink-0"
              title={sidebarOpen ? "Hide history sidebar" : "Show history sidebar"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All free tools
            </Link>
          </div>

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

          {/* Keyword history strip */}
          <AnimatePresence>
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">
                    Recent
                  </span>
                  <div className="flex-1 overflow-x-auto flex items-center gap-1.5 pb-0.5 min-w-0 scrollbar-none">
                    {history.map((h) => {
                      const isActive = result?.keyword.toLowerCase() === h.keyword.toLowerCase();
                      return (
                        <motion.button
                          key={h.keyword}
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          type="button"
                          title={
                            h.scores.length >= 2
                              ? `Score history: ${h.scores.join(" → ")} (${h.scores[h.scores.length - 1] - h.scores[0] > 0 ? "+" : ""}${h.scores[h.scores.length - 1] - h.scores[0]} vs first attempt)`
                              : `Difficulty: ${h.score} — re-analyse to track changes`
                          }
                          onClick={() => {
                            setResult(h);
                            setKeyword(h.keyword);
                          }}
                          className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                            isActive
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              h.score >= 75
                                ? "bg-red-400"
                                : h.score >= 55
                                  ? "bg-orange-400"
                                  : h.score >= 35
                                    ? "bg-amber-400"
                                    : "bg-green-500"
                            } ${isActive ? "opacity-80" : ""}`}
                          />
                          <span className="max-w-[100px] truncate">{h.keyword}</span>
                          <span className={`font-bold tabular-nums ${isActive ? "text-violet-200" : "text-slate-400"}`}>
                            {h.score}
                          </span>
                          <SparkLine scores={h.scores} active={isActive} />
                          <TrendArrow scores={h.scores} active={isActive} />
                        </motion.button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHistory([]); setResult(null); setKeyword(""); }}
                    className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-medium"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session comparison chart */}
          <AnimatePresence>
            {history.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4"
              >
                <Card className="border border-slate-100 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-semibold text-slate-900">
                        Session Comparison
                      </h4>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {history.length} keyword{history.length !== 1 ? "s" : ""} · difficulty 0–100
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(history.length * 38, 80)}>
                      <BarChart
                        data={[...history].reverse().map((h) => ({
                          name: h.keyword.length > 22 ? h.keyword.slice(0, 21) + "…" : h.keyword,
                          full: h.keyword,
                          score: h.score,
                          label: h.label,
                          isActive: result?.keyword.toLowerCase() === h.keyword.toLowerCase(),
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
                        barSize={14}
                      >
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                          tickCount={6}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={({ x, y, payload }) => {
                            const isActive = result?.keyword.toLowerCase().startsWith(
                              payload.value.replace("…", "").toLowerCase()
                            );
                            return (
                              <text
                                x={x - 4}
                                y={y}
                                dy={4}
                                textAnchor="end"
                                fontSize={11}
                                fontWeight={isActive ? 700 : 400}
                                fill={isActive ? "#7c3aed" : "#64748b"}
                              >
                                {payload.value}
                              </text>
                            );
                          }}
                          width={130}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f1f5f9" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                                <p className="font-semibold text-slate-800 mb-0.5">{d.full}</p>
                                <p className="text-slate-500">
                                  Difficulty: <span className="font-bold text-slate-700">{d.score}</span> — {d.label}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="3 3" />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                          {[...history].reverse().map((h, i) => {
                            const isActive = result?.keyword.toLowerCase() === h.keyword.toLowerCase();
                            const baseColor =
                              h.score >= 75 ? "#dc2626"
                              : h.score >= 55 ? "#f97316"
                              : h.score >= 35 ? "#f59e0b"
                              : "#16a34a";
                            return (
                              <Cell
                                key={i}
                                fill={baseColor}
                                opacity={isActive ? 1 : 0.45}
                                stroke={isActive ? baseColor : "none"}
                                strokeWidth={isActive ? 1.5 : 0}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Active keyword shown at full opacity · dashed line = medium difficulty (50)
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Compare Panel ── */}
          <AnimatePresence>
            {showCompare && compareSet.size === 2 && (() => {
              const [kwA, kwB] = [...compareSet];
              const entA = history.find((h) => h.keyword === kwA);
              const entB = history.find((h) => h.keyword === kwB);
              if (!entA || !entB) return null;
              return (
                <ComparePanelOverlay
                  a={entA}
                  b={entB}
                  onClose={() => setShowCompare(false)}
                />
              );
            })()}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.keyword}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Results for "{result.keyword}"
                  </h3>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border px-3 py-1.5 rounded-lg transition-all ${
                        copiedLink
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3" />
                          Share
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAnalysis(result)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Export Brief
                    </button>
                  </motion.div>
                </div>

                {/* Quick Win confetti burst */}
                {result.score < 30 && result.intent === "Commercial" && (
                  <QuickWinBurst key={result.keyword} />
                )}

                {/* Score + stats */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Difficulty score */}
                  <Card
                    className={`border shadow-sm sm:col-span-1 ${SCORE_BG(result.score)} ${
                      result.score < 30 && result.intent === "Commercial"
                        ? "ring-2 ring-emerald-300 ring-offset-2 shadow-lg shadow-emerald-100"
                        : ""
                    }`}
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
                      {result.score < 30 && result.intent === "Commercial" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0, y: 6 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.3 }}
                          className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md"
                        >
                          <Trophy className="w-3 h-3" />
                          Quick Win!
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Intent + volume */}
                  <div className="sm:col-span-2 flex flex-col gap-4">
                    <Card className="border border-slate-100 shadow-sm flex-1">
                      <CardContent className="p-5 flex items-start gap-3">
                        <Target className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              Search Intent
                            </span>
                            <span
                              className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${INTENT_COLOR[result.intent]}`}
                            >
                              {result.intent}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${CLUSTER_COLOR[result.cluster]}`}
                            >
                              <Layers className="w-2.5 h-2.5" />
                              {result.cluster}
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

                {/* Opportunity Assessment Grid */}
                {(() => {
                  const qInfo = getQuadrantInfo(result.score, result.intent);
                  const dotXPct = 5 + (result.score / 100) * 90;
                  const dotYPct = 5 + (1 - intentValue(result.intent)) * 90;
                  return (
                    <Card className="border border-slate-100 shadow-sm overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Crosshair className="w-4 h-4 text-violet-600" />
                          <h4 className="text-sm font-semibold text-slate-900">
                            Opportunity Assessment
                          </h4>
                          <span className={`ml-auto text-[10px] font-bold border rounded-full px-2 py-0.5 ${qInfo.labelColor} border-current bg-white`}>
                            {qInfo.label}
                          </span>
                        </div>

                        <div className="flex gap-3 items-stretch">
                          {/* Y-axis label */}
                          <div className="flex flex-col items-center justify-between py-1 shrink-0">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider rotate-[-90deg] whitespace-nowrap origin-center" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.12em" }}>
                              High Value
                            </span>
                            <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.12em" }}>
                              Low Value
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col gap-1">
                            {/* Grid */}
                            <div className="relative w-full" style={{ paddingBottom: "56%" }}>
                              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 rounded-lg overflow-hidden border border-slate-100">
                                {/* Top-left: Quick Win */}
                                <div className="bg-emerald-50 flex flex-col items-start justify-start p-2.5 border-r border-b border-slate-100">
                                  <span className="text-[10px] font-bold text-emerald-700 leading-tight">Quick Win</span>
                                  <span className="text-[9px] text-emerald-500 mt-0.5 leading-tight hidden sm:block">Low difficulty · High value</span>
                                </div>
                                {/* Top-right: Long-term Target */}
                                <div className="bg-amber-50 flex flex-col items-end justify-start p-2.5 border-b border-slate-100">
                                  <span className="text-[10px] font-bold text-amber-700 leading-tight">Long-term Target</span>
                                  <span className="text-[9px] text-amber-500 mt-0.5 leading-tight hidden sm:block">High difficulty · High value</span>
                                </div>
                                {/* Bottom-left: Filler Content */}
                                <div className="bg-slate-50 flex flex-col items-start justify-end p-2.5 border-r border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Filler Content</span>
                                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight hidden sm:block">Low difficulty · Low value</span>
                                </div>
                                {/* Bottom-right: Supporting Asset */}
                                <div className="bg-blue-50 flex flex-col items-end justify-end p-2.5">
                                  <span className="text-[10px] font-bold text-blue-700 leading-tight">Supporting Asset</span>
                                  <span className="text-[9px] text-blue-500 mt-0.5 leading-tight hidden sm:block">High difficulty · Low value</span>
                                </div>

                                {/* Divider lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200" />
                                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />
                                </div>

                                {/* Pulse dot */}
                                <motion.div
                                  key={`dot-${result.keyword}`}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
                                  className="absolute z-10"
                                  style={{ left: `${dotXPct}%`, top: `${dotYPct}%`, transform: "translate(-50%, -50%)" }}
                                >
                                  {/* Outer ring pulse */}
                                  <motion.div
                                    animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className={`absolute inset-0 rounded-full ${qInfo.ringColor}`}
                                    style={{ width: 20, height: 20, margin: -4 }}
                                  />
                                  <div className={`w-3 h-3 rounded-full ${qInfo.dotColor} shadow-lg ring-2 ring-white`} />
                                </motion.div>
                              </div>
                            </div>

                            {/* X-axis labels */}
                            <div className="flex justify-between px-1 mt-0.5">
                              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">← Low Difficulty</span>
                              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">High Difficulty →</span>
                            </div>
                          </div>
                        </div>

                        {/* Quadrant result summary */}
                        <div className={`mt-3 rounded-lg px-3 py-2 border border-current/10 bg-white flex items-center gap-2`}>
                          <div className={`w-2 h-2 rounded-full ${qInfo.dotColor} shrink-0`} />
                          <p className={`text-xs font-medium ${qInfo.labelColor}`}>
                            <span className="font-bold">{qInfo.label}:</span> {qInfo.sublabel}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Cluster Content Ideas */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-semibold text-slate-900">
                        Cluster Content Ideas
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ml-1 ${CLUSTER_COLOR[result.cluster]}`}
                      >
                        <Layers className="w-2.5 h-2.5" />
                        {result.cluster}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Click to copy
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                      Create these 5 supporting articles to build Topical Authority around{" "}
                      <span className="font-semibold text-slate-700">"{result.keyword}"</span>.
                    </p>
                    <div className="flex flex-col gap-2">
                      {generateClusterIdeas(result.cluster, result.keyword).map((idea, i) => (
                        <motion.button
                          key={i}
                          type="button"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          onClick={() => copyClusterIdea(i, idea)}
                          className="flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm text-slate-700 leading-snug truncate">
                              {idea}
                            </span>
                          </div>
                          {copiedCluster === i ? (
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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

                {(() => {
                  const ctaConfig: Record<Intent, { text: string; linkLabel: string; linkHref: string; ctaLabel: string; ctaHref: string }> = {
                    Commercial: {
                      text: `Ready to convert traffic for "${result.keyword}"? Our SEO experts specialize in high-intent fintech content.`,
                      linkLabel: "See our conversion-focused services",
                      linkHref: "/services",
                      ctaLabel: "book a strategy call",
                      ctaHref: "/contact",
                    },
                    Transactional: {
                      text: `Targeting buyers searching for "${result.keyword}"? We build bottom-funnel content that drives action.`,
                      linkLabel: "Explore our fintech content services",
                      linkHref: "/services",
                      ctaLabel: "get a free audit",
                      ctaHref: "/contact",
                    },
                    Informational: {
                      text: `Need an authority-building whitepaper for "${result.keyword}"? See how our editorial team can lead the conversation.`,
                      linkLabel: "See our thought leadership packages",
                      linkHref: "/services",
                      ctaLabel: "talk to our editors",
                      ctaHref: "/contact",
                    },
                    Navigational: {
                      text: `Building brand visibility around "${result.keyword}"? We help fintech brands own their branded search results.`,
                      linkLabel: "See our brand SEO services",
                      linkHref: "/services",
                      ctaLabel: "book a free strategy call",
                      ctaHref: "/contact",
                    },
                  };
                  const cta = ctaConfig[result.intent];
                  return (
                    <Card className="border border-violet-100 bg-violet-50 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-violet-800 leading-relaxed">
                          {cta.text}{" "}
                          <Link
                            href={cta.linkHref}
                            className="font-semibold underline underline-offset-2 hover:text-violet-900"
                          >
                            {cta.linkLabel}
                          </Link>{" "}
                          or{" "}
                          <Link
                            href={cta.ctaHref}
                            className="font-semibold underline underline-offset-2 hover:text-violet-900"
                          >
                            {cta.ctaLabel}
                          </Link>
                          .
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

            </div>{/* /main content */}
          </div>{/* /flex layout */}
        </div>{/* /container */}
      </section>
    </div>
  );
}
