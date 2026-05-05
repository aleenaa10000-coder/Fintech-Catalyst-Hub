import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "wouter";
import jsPDF from "jspdf";
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
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  AlertTriangle,
  Clock,
  Network,
  ZoomIn,
  ZoomOut,
  Gauge,
  ArrowRight,
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
  Informational:  "bg-blue-50   text-blue-700   border-blue-200   shadow-[0_0_0_1px_rgba(59,130,246,0.35)]",
  Commercial:     "bg-purple-50  text-purple-700  border-purple-200  shadow-[0_0_0_1px_rgba(147,51,234,0.35)]",
  Transactional:  "bg-green-50  text-green-700  border-green-200  shadow-[0_0_0_1px_rgba(22,163,74,0.35)]",
  Navigational:   "bg-slate-100 text-slate-700  border-slate-300  shadow-[0_0_0_1px_rgba(100,116,139,0.30)]",
};

const CLUSTER_COLOR: Record<Cluster, string> = {
  "Infrastructure & Security": "bg-cyan-50   text-cyan-700   border-cyan-200   shadow-[0_0_0_1px_rgba(8,145,178,0.35)]",
  "Commercial Solutions":      "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-[0_0_0_1px_rgba(79,70,229,0.35)]",
  "Fintech General":           "bg-teal-50   text-teal-700   border-teal-200   shadow-[0_0_0_1px_rgba(13,148,136,0.35)]",
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

type DriverLevel = "High" | "Medium" | "Low";
type ScoreDrivers = {
  domainAuthority:  { value: number; label: DriverLevel };
  contentQuality:   { value: number; label: DriverLevel };
  backlinkStrength: { value: number; label: DriverLevel };
};

function toDriverLevel(v: number): DriverLevel {
  return v >= 60 ? "High" : v >= 35 ? "Medium" : "Low";
}

function computeScoreDrivers(r: Result): ScoreDrivers {
  const commercialBoost =
    r.intent === "Commercial" || r.intent === "Transactional" ? 10 : 0;
  const da = Math.min(95, Math.round(r.score * 0.80 + 15));
  const cq = Math.min(95, Math.round(r.score * 0.75 + 18 + commercialBoost));
  const bl = Math.min(96, Math.round(r.score * 0.88 + 8));
  return {
    domainAuthority:  { value: da, label: toDriverLevel(da) },
    contentQuality:   { value: cq, label: toDriverLevel(cq) },
    backlinkStrength: { value: bl, label: toDriverLevel(bl) },
  };
}

const DRIVER_LEVEL_COLOR: Record<DriverLevel, { bar: string; badge: string }> = {
  High:   { bar: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200" },
  Medium: { bar: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  Low:    { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

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
  a, b, onClose, cannibalization,
}: {
  a: HistoryEntry; b: HistoryEntry; onClose: () => void; cannibalization?: boolean;
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
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
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
        {cannibalization && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-bold">Cannibalization risk detected.</span>{" "}
              These terms have high semantic overlap. Consider targeting them within a single high-authority pillar page rather than separate articles.
            </p>
          </div>
        )}
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

// ── Cluster Map helpers ────────────────────────────────────────────────────

const CLUSTER_ZONE_CONFIG: Record<
  Cluster,
  { cx: number; cy: number; bgColor: string; strokeColor: string; labelColor: string }
> = {
  "Infrastructure & Security": {
    cx: 118, cy: 162,
    bgColor: "rgba(8,145,178,0.07)",
    strokeColor: "rgba(8,145,178,0.28)",
    labelColor: "#0e7490",
  },
  "Commercial Solutions": {
    cx: 354, cy: 162,
    bgColor: "rgba(79,70,229,0.07)",
    strokeColor: "rgba(79,70,229,0.28)",
    labelColor: "#4338ca",
  },
  "Fintech General": {
    cx: 590, cy: 162,
    bgColor: "rgba(13,148,136,0.07)",
    strokeColor: "rgba(13,148,136,0.28)",
    labelColor: "#0f766e",
  },
};

function getClusterBubbleOffsets(count: number): Array<{ dx: number; dy: number }> {
  if (count === 0) return [];
  if (count === 1) return [{ dx: 0, dy: 0 }];
  const positions: Array<{ dx: number; dy: number }> = [];
  const rings = [
    { r: 0, slots: 1 },
    { r: 52, slots: 6 },
    { r: 94, slots: 8 },
  ];
  let placed = 0;
  for (const ring of rings) {
    if (placed >= count) break;
    const n = Math.min(ring.slots, count - placed);
    if (ring.r === 0) {
      positions.push({ dx: 0, dy: 0 });
      placed++;
    } else {
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        positions.push({ dx: Math.cos(angle) * ring.r, dy: Math.sin(angle) * ring.r });
      }
      placed += n;
    }
  }
  return positions;
}

function clusterBubbleR(kw: string): number {
  return Math.max(15, 27 - kw.trim().split(/\s+/).length * 2);
}

function clusterBubbleFill(score: number): string {
  return score >= 75 ? "#ef4444" : score >= 55 ? "#f97316" : score >= 35 ? "#f59e0b" : "#22c55e";
}

function clusterBubbleFillLight(score: number): string {
  return score >= 75
    ? "rgba(239,68,68,0.13)"
    : score >= 55
      ? "rgba(249,115,22,0.13)"
      : score >= 35
        ? "rgba(245,158,11,0.13)"
        : "rgba(34,197,94,0.13)";
}

function KeywordClusterMap({
  history,
  result,
  onSelect,
}: {
  history: HistoryEntry[];
  result: Result | null;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const VW = 708;
  const VH = 330;
  const ZONE_RX = 102;
  const ZONE_RY = 126;

  const clusterGroups = useMemo(() => {
    const g: Record<Cluster, HistoryEntry[]> = {
      "Infrastructure & Security": [],
      "Commercial Solutions": [],
      "Fintech General": [],
    };
    history.forEach((h) => g[h.cluster].push(h));
    return g;
  }, [history]);

  const gaps = useMemo(
    () => (Object.keys(clusterGroups) as Cluster[]).filter((c) => clusterGroups[c].length === 0),
    [clusterGroups],
  );

  const zoomIn  = useCallback(() => setZoom((z) => Math.min(3.5, +(z * 1.28).toFixed(3))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.55, +(z / 1.28).toFixed(3))), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.11;
    setZoom((z) => Math.max(0.55, Math.min(3.5, +(z * delta).toFixed(3))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest("g[data-bubble]")) return;
    setDragging(true);
    setDragOrigin({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: dragOrigin.px + e.clientX - dragOrigin.mx, y: dragOrigin.py + e.clientY - dragOrigin.my });
  };
  const onMouseUp = () => setDragging(false);

  const tx = VW / 2 + pan.x;
  const ty = VH / 2 + pan.y;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <Card className="border border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Network className="w-4 h-4 text-violet-600 shrink-0" />
            <h4 className="text-sm font-semibold text-slate-900">Keyword Cluster Map</h4>
            <span className="text-[10px] text-muted-foreground">
              {history.length} keyword{history.length !== 1 ? "s" : ""} · grouped by topic cluster
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={zoomIn}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition-colors" title="Zoom in">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={zoomOut}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition-colors" title="Zoom out">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={resetView}
                className="px-2 py-1 text-[10px] font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition-colors">
                Fit
              </button>
            </div>
          </div>

          {/* Chart canvas */}
          <div
            ref={containerRef}
            className="relative rounded-xl overflow-hidden border border-slate-100 bg-gradient-to-br from-slate-50 to-white"
            style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              className="w-full"
              style={{ height: 310, display: "block" }}
            >
              <defs>
                <filter id="kcm-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.12" />
                </filter>
                <filter id="kcm-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <g transform={`translate(${tx} ${ty}) scale(${zoom}) translate(-${VW / 2} -${VH / 2})`}>

                {/* Grid dots (subtle background) */}
                {Array.from({ length: 8 }, (_, row) =>
                  Array.from({ length: 14 }, (_, col) => (
                    <circle
                      key={`dot-${row}-${col}`}
                      cx={col * 54 + 27} cy={row * 46 + 18}
                      r={1} fill="#cbd5e1" opacity={0.35}
                    />
                  ))
                )}

                {/* Connector lines between zones */}
                {[
                  { x1: 220, x2: 252 },
                  { x1: 456, x2: 488 },
                ].map(({ x1, x2 }, i) => (
                  <line key={i} x1={x1} y1={VH / 2} x2={x2} y2={VH / 2}
                    stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" />
                ))}

                {/* Cluster zones */}
                {(Object.keys(CLUSTER_ZONE_CONFIG) as Cluster[]).map((cluster) => {
                  const cfg = CLUSTER_ZONE_CONFIG[cluster];
                  const count = clusterGroups[cluster].length;
                  return (
                    <g key={cluster}>
                      <ellipse
                        cx={cfg.cx} cy={cfg.cy}
                        rx={ZONE_RX} ry={ZONE_RY}
                        fill={cfg.bgColor}
                        stroke={cfg.strokeColor}
                        strokeWidth={1.5}
                        strokeDasharray="5 3.5"
                      />
                      {/* Cluster label — above zone */}
                      <text
                        x={cfg.cx} y={cfg.cy - ZONE_RY - 10}
                        textAnchor="middle"
                        fontSize={8.5} fontWeight={700}
                        fill={cfg.labelColor}
                        letterSpacing={0.6}
                        style={{ textTransform: "uppercase" } as React.CSSProperties}
                      >
                        {cluster}
                      </text>
                      {/* Empty zone placeholder */}
                      {count === 0 && (
                        <>
                          <text x={cfg.cx} y={cfg.cy - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">
                            No keywords yet
                          </text>
                          <text x={cfg.cx} y={cfg.cy + 8} textAnchor="middle" fontSize={8} fill="#cbd5e1">
                            Topical gap
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Bubbles */}
                {(Object.keys(clusterGroups) as Cluster[]).map((cluster) => {
                  const entries = clusterGroups[cluster];
                  const cfg = CLUSTER_ZONE_CONFIG[cluster];
                  const offsets = getClusterBubbleOffsets(entries.length);

                  return entries.map((entry, i) => {
                    const off = offsets[i] ?? { dx: 0, dy: 0 };
                    const bx = cfg.cx + off.dx;
                    const by = cfg.cy + off.dy;
                    const br = clusterBubbleR(entry.keyword);
                    const fill = clusterBubbleFill(entry.score);
                    const fillLight = clusterBubbleFillLight(entry.score);
                    const isActive = result?.keyword.toLowerCase() === entry.keyword.toLowerCase();
                    const isHov = hovered === entry.keyword;
                    const shortLabel = entry.keyword.length > 11
                      ? entry.keyword.slice(0, 10) + "…"
                      : entry.keyword;

                    // Tooltip placement: above by default, flip below if near top
                    const tipY = by < 70 ? by + br + 4 : by - br - 4;
                    const tipAnchorY = by < 70 ? tipY + 38 : tipY;

                    return (
                      <g
                        key={entry.keyword}
                        data-bubble="1"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); onSelect(entry); }}
                        onMouseEnter={() => setHovered(entry.keyword)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {/* Outer glow ring for active / hovered */}
                        {(isActive || isHov) && (
                          <circle cx={bx} cy={by} r={br + 6}
                            fill="none" stroke={fill} strokeWidth={2} opacity={0.35} />
                        )}
                        {isActive && (
                          <circle cx={bx} cy={by} r={br + 10}
                            fill="none" stroke={fill} strokeWidth={1} opacity={0.15} />
                        )}

                        {/* Bubble body */}
                        <circle
                          cx={bx} cy={by} r={br}
                          fill={isActive ? fill : fillLight}
                          stroke={fill}
                          strokeWidth={isActive ? 2 : 1.5}
                          filter={isActive ? "url(#kcm-shadow)" : undefined}
                          opacity={isHov && !isActive ? 0.92 : 1}
                        />

                        {/* Score label inside bubble */}
                        <text
                          x={bx} y={by + 1}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={Math.max(8, Math.round(br * 0.58))}
                          fontWeight={700}
                          fill={isActive ? "white" : fill}
                          style={{ pointerEvents: "none" } as React.CSSProperties}
                        >
                          {entry.score}
                        </text>

                        {/* Keyword label below bubble */}
                        <text
                          x={bx} y={by + br + 11}
                          textAnchor="middle"
                          fontSize={7.5}
                          fontWeight={isActive ? 700 : 400}
                          fill={isActive ? "#3730a3" : "#475569"}
                          style={{ pointerEvents: "none" } as React.CSSProperties}
                        >
                          {shortLabel}
                        </text>

                        {/* Hover tooltip */}
                        {isHov && (
                          <g style={{ pointerEvents: "none" } as React.CSSProperties}>
                            <rect
                              x={bx - 66} y={tipY - (by < 70 ? 0 : 40)}
                              width={132} height={38}
                              rx={5} ry={5}
                              fill="white"
                              stroke="#e2e8f0"
                              strokeWidth={1}
                              filter="url(#kcm-shadow)"
                            />
                            <text
                              x={bx} y={tipY - (by < 70 ? 0 : 40) + 14}
                              textAnchor="middle"
                              fontSize={8.5} fontWeight={600} fill="#1e293b"
                            >
                              {entry.keyword.length > 20 ? entry.keyword.slice(0, 19) + "…" : entry.keyword}
                            </text>
                            <text
                              x={bx} y={tipY - (by < 70 ? 0 : 40) + 26}
                              textAnchor="middle"
                              fontSize={7.5} fill="#64748b"
                            >
                              {entry.score}/100 · {entry.label} · {entry.intent}
                            </text>
                            {/* Arrow */}
                            {by >= 70 && (
                              <polygon
                                points={`${bx - 5},${by - br - 5} ${bx + 5},${by - br - 5} ${bx},${by - br + 1}`}
                                fill="white" stroke="#e2e8f0" strokeWidth={1}
                              />
                            )}
                            {by < 70 && (
                              <polygon
                                points={`${bx - 5},${by + br + 3} ${bx + 5},${by + br + 3} ${bx},${by + br + 9}`}
                                fill="white" stroke="#e2e8f0" strokeWidth={1}
                              />
                            )}
                          </g>
                        )}
                      </g>
                    );
                  });
                })}
              </g>
            </svg>

            {/* Difficulty legend */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 border border-slate-100 shadow-sm">
              {[
                { color: "#22c55e", label: "Easy" },
                { color: "#f59e0b", label: "Medium" },
                { color: "#f97316", label: "Hard" },
                { color: "#ef4444", label: "V.Hard" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[8.5px] text-slate-500 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* Interaction hint */}
            <div className="absolute bottom-2 right-2 text-[8.5px] text-slate-400 bg-white/90 rounded px-1.5 py-0.5 border border-slate-100">
              Scroll · Drag · Click bubble to load
            </div>
          </div>

          {/* Topical gap alert */}
          {gaps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Topical gap detected.</span>{" "}
                No keywords yet in the{" "}
                {gaps.map((g, i) => (
                  <span key={g}>
                    {i > 0 && i === gaps.length - 1 ? " or " : i > 0 ? ", " : ""}
                    <span className="font-semibold">"{g}"</span>
                  </span>
                ))}{" "}
                cluster{gaps.length > 1 ? "s" : ""}. Expanding here can help you build broader Topical Authority.
              </p>
            </motion.div>
          )}

          {/* Overlap summary row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(clusterGroups) as Cluster[]).map((cluster) => {
              const entries = clusterGroups[cluster];
              const cfg = CLUSTER_ZONE_CONFIG[cluster];
              const avgScore = entries.length
                ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
                : null;
              return (
                <div key={cluster} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: cfg.labelColor }}>
                    {cluster.split(" & ")[0].split(" ")[0]}
                  </p>
                  <p className="text-lg font-black text-slate-800">{entries.length}</p>
                  <p className="text-[8.5px] text-slate-400">
                    {entries.length === 0 ? "gap" : avgScore !== null ? `avg ${avgScore}/100` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── SERP Snapshot ─────────────────────────────────────────────────────────

type SerpFeature = { id: string; label: string; bg: string; text: string };

type SerpEntry = {
  type: "ad" | "organic" | "featured_snippet" | "paa" | "video";
  position?: number;
  title: string;
  domain: string;
  path: string;
  snippet: string;
  contentType?: string;
};

type SerpData = {
  targetPositionMin: number;
  targetPositionMax: number;
  timeToRankMin: number;
  timeToRankMax: number;
  winningFormat: string;
  winningFormatDetail: string;
  daRequired: number;
  features: SerpFeature[];
  entries: SerpEntry[];
};

function generateSerpSnapshot(result: Result): SerpData {
  const kw = result.keyword;
  const yr = new Date().getFullYear();
  const slug = kw.replace(/\s+/g, "-");
  const kwCap = kw.charAt(0).toUpperCase() + kw.slice(1);
  const reviewCount = (kw.length * 37 + 112) % 450 + 80;

  let targetMin: number, targetMax: number, timeMin: number, timeMax: number, daRequired: number;
  if (result.score <= 25) { targetMin = 3; targetMax = 8; timeMin = 3; timeMax = 6; daRequired = 25; }
  else if (result.score <= 45) { targetMin = 5; targetMax = 12; timeMin = 6; timeMax = 12; daRequired = 35; }
  else if (result.score <= 60) { targetMin = 8; targetMax = 18; timeMin = 10; timeMax = 16; daRequired = 45; }
  else if (result.score <= 75) { targetMin = 12; targetMax = 25; timeMin = 14; timeMax = 24; daRequired = 55; }
  else { targetMin = 20; targetMax = 40; timeMin = 24; timeMax = 36; daRequired = 65; }

  let winningFormat: string, winningFormatDetail: string;
  if (result.intent === "Commercial") {
    winningFormat = result.score >= 55 ? "Long-form comparison article" : "Comparison article";
    winningFormatDetail = result.score >= 55 ? "3,000+ word deep dives with comparison tables dominate these SERPs" : "Side-by-side comparison tables with pros/cons outperform basic reviews";
  } else if (result.intent === "Transactional") {
    winningFormat = "Conversion landing page";
    winningFormatDetail = "Clean product/service pages with clear pricing, social proof, and a single CTA";
  } else if (result.intent === "Navigational") {
    winningFormat = "Brand / product page";
    winningFormatDetail = "Official pages with structured schema markup and sitelinks win by default";
  } else {
    winningFormat = result.score >= 60 ? "Pillar / comprehensive guide" : "How-to guide";
    winningFormatDetail = result.score >= 60 ? "10,000+ word pillar pages with strong internal linking clusters" : "Practical step-by-step guides with supporting visuals and FAQs";
  }

  const features: SerpFeature[] = [];
  if (result.intent === "Informational" && result.score < 60)
    features.push({ id: "featured", label: "Featured Snippet",    bg: "bg-blue-50",   text: "text-blue-700"   });
  if (result.intent !== "Navigational")
    features.push({ id: "paa",      label: "People Also Ask",     bg: "bg-green-50",  text: "text-green-700"  });
  if (result.intent === "Informational")
    features.push({ id: "video",    label: "Video Carousel",      bg: "bg-red-50",    text: "text-red-700"    });
  if (result.intent === "Commercial" || result.intent === "Transactional")
    features.push({ id: "ads",      label: result.intent === "Transactional" ? "Paid Ads (2–4)" : "Shopping / Text Ads", bg: "bg-amber-50",  text: "text-amber-700"  });
  if (result.intent === "Navigational")
    features.push({ id: "knowledge",label: "Knowledge Panel",     bg: "bg-violet-50", text: "text-violet-700" });
  if (result.intent === "Navigational" || result.intent === "Transactional")
    features.push({ id: "sitelinks",label: "Sitelinks",           bg: "bg-slate-100", text: "text-slate-600"  });
  if (result.score >= 50)
    features.push({ id: "stories",  label: "Top Stories",         bg: "bg-orange-50", text: "text-orange-700" });
  features.push({ id: "related",    label: "Related Searches",    bg: "bg-slate-100", text: "text-slate-600"  });

  const entries: SerpEntry[] = [];

  if (result.intent === "Informational" && result.score < 55) {
    entries.push({ type: "featured_snippet", title: `What is ${kw}? — Quick Answer`, domain: "fintech-authority.io", path: `/guides/${slug}`, snippet: `${kwCap} refers to a suite of financial technology solutions that enable... [Google extracts this as a featured snippet from a well-structured definition section]`, contentType: "guide" });
  }
  if (result.intent === "Commercial" || result.intent === "Transactional") {
    entries.push({ type: "ad", title: `${kwCap} — Trusted by 10,000+ Fintech Teams`, domain: "ads.sponsor.com", path: `/${slug}`, snippet: `Get started with ${kw} today. Free demo available. No credit card required. Rated #1 by fintech leaders.` });
  }

  if (result.intent === "Commercial") {
    entries.push({ type: "organic", position: 1, title: `Best ${kw} Platforms in ${yr} — Expert Comparison`, domain: "techreviewer.io", path: `/fintech/best-${slug}`, snippet: `We compared the top 12 ${kw} solutions across pricing, features, and integrations. See our picks for growing fintechs and enterprise teams.`, contentType: "comparison" });
    entries.push({ type: "organic", position: 2, title: `Top 10 ${kw} Tools: Reviews & Pricing (${yr})`, domain: "fintechadvisor.com", path: `/reviews/${slug}-tools`, snippet: `Updated for ${yr}. Our analysts tested each platform hands-on. Compare features, pricing, and API quality side by side.`, contentType: "listicle" });
    entries.push({ type: "paa", title: "People Also Ask", domain: "", path: "", snippet: `• What is the best ${kw} for startups?\n• How much does ${kw} cost?\n• Is ${kw} worth the investment?` });
    entries.push({ type: "organic", position: 3, title: `${kw} Guide: What to Look For in ${yr}`, domain: "businessfintech.io", path: `/guides/${slug}`, snippet: `Choosing the right ${kw} is critical. This guide covers key evaluation criteria, questions to ask vendors, and red flags to avoid.`, contentType: "guide" });
    entries.push({ type: "organic", position: 4, title: `${kwCap} — Official Site`, domain: `${kw.replace(/\s+/g, "")}.com`, path: `/`, snippet: `The leading ${kw} platform trusted by 5,000+ businesses. Start free. Scale as you grow. 24/7 support included.`, contentType: "official" });
  } else if (result.intent === "Transactional") {
    entries.push({ type: "organic", position: 1, title: `${kwCap} — Start Free Trial`, domain: `top${kw.replace(/\s+/g, "")}.io`, path: `/`, snippet: `Start your 14-day free trial. No credit card required. Used by thousands of fintech companies worldwide.`, contentType: "landing" });
    entries.push({ type: "organic", position: 2, title: `${kwCap} Pricing — Compare Plans`, domain: "fintech-tools.io", path: `/pricing/${slug}`, snippet: `Compare ${kw} pricing across all tiers. See which plan fits your fintech's growth stage and targets.`, contentType: "landing" });
    entries.push({ type: "paa", title: "People Also Ask", domain: "", path: "", snippet: `• How much does ${kw} cost?\n• Is there a free version of ${kw}?\n• What integrations does ${kw} support?` });
    entries.push({ type: "organic", position: 3, title: `Get Started with ${kw} Today`, domain: "fintechplatform.com", path: `/signup`, snippet: `Join 8,000+ fintech teams already using ${kw}. Set up in under 10 minutes. Integrates with your existing stack.`, contentType: "landing" });
  } else if (result.intent === "Navigational") {
    entries.push({ type: "organic", position: 1, title: `${kwCap} — Official Site`, domain: `${kw.replace(/\s+/g, "")}.com`, path: `/`, snippet: `The official home of ${kw}. Documentation, pricing, and getting started guides. Trusted by teams worldwide.`, contentType: "official" });
    entries.push({ type: "organic", position: 2, title: `${kwCap} Reviews — ${reviewCount} Verified Ratings`, domain: "g2.com", path: `/products/${slug}/reviews`, snippet: `See what real users say about ${kw}. ${reviewCount} verified reviews. Average rating 4.${kw.length % 4 + 5}/5 stars on G2.`, contentType: "review" });
    entries.push({ type: "organic", position: 3, title: `Best ${kwCap} Alternatives (${yr})`, domain: "alternativeto.net", path: `/${slug}`, snippet: `Looking for alternatives to ${kw}? Here are the top-rated options according to the fintech community.`, contentType: "comparison" });
  } else {
    entries.push({ type: "organic", position: 1, title: `What Is ${kw}? Complete Guide for ${yr}`, domain: "fintechexplained.io", path: `/guides/${slug}`, snippet: `${kwCap} is a critical component of modern financial infrastructure. This guide covers how it works, key benefits, and implementation strategies.`, contentType: "guide" });
    entries.push({ type: "organic", position: 2, title: `${kwCap}: How It Works & Why It Matters`, domain: "moneytechinsider.com", path: `/learn/${slug}`, snippet: `Understand the mechanics of ${kw} and why fintech leaders are prioritising it in ${yr}. Includes real-world examples and case studies.`, contentType: "guide" });
    entries.push({ type: "paa", title: "People Also Ask", domain: "", path: "", snippet: `• How does ${kw} work?\n• What are the benefits of ${kw}?\n• Who uses ${kw} today?` });
    entries.push({ type: "video", title: `${kwCap} Explained in 5 Minutes`, domain: "youtube.com", path: `/watch`, snippet: `Video · 5:23 · FinTech Simplified — 142K views · How ${kw} is transforming payments and financial services.` });
    entries.push({ type: "organic", position: 3, title: `${kwCap}: Benefits, Challenges & Best Practices`, domain: "paymentsintelligence.io", path: `/articles/${slug}`, snippet: `A fintech leader's guide to ${kw}. Includes common implementation pitfalls, ROI data, and expert recommendations.`, contentType: "guide" });
    entries.push({ type: "organic", position: 4, title: `Top 7 ${kw} Best Practices in ${yr}`, domain: "fintechweekly.co", path: `/best-practices/${slug}`, snippet: `Industry experts share their top advice on ${kw}. Updated with the latest regulatory and technology developments.`, contentType: "listicle" });
  }

  return { targetPositionMin: targetMin, targetPositionMax: targetMax, timeToRankMin: timeMin, timeToRankMax: timeMax, winningFormat, winningFormatDetail, daRequired, features, entries };
}

const SERP_CONTENT_LABEL: Record<string, string> = { guide: "Guide", comparison: "Comparison", listicle: "Listicle", landing: "Landing page", official: "Official site", video: "Video", review: "Review" };
const SERP_CONTENT_DOT: Record<string, string>  = { guide: "bg-blue-400", comparison: "bg-violet-400", listicle: "bg-amber-400", landing: "bg-green-400", official: "bg-slate-400", video: "bg-red-400", review: "bg-orange-400" };

function SerpSnapshotCard({ result }: { result: Result }) {
  const data = useMemo(() => generateSerpSnapshot(result), [result]);

  return (
    <Card className="border border-slate-100 shadow-sm overflow-hidden">
      <CardContent className="p-5">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-violet-600" />
          <h4 className="text-sm font-semibold text-slate-900">SERP Snapshot</h4>
          <span className="text-[10px] text-muted-foreground">illustrative competitive landscape</span>
        </div>

        {/* 3-col stat row */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: "Target positions", value: `${data.targetPositionMin}–${data.targetPositionMax}` },
            { label: "Time to rank",     value: `${data.timeToRankMin}–${data.timeToRankMax} mo` },
            { label: "DA needed",        value: `${data.daRequired}+` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg border border-slate-100 px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm font-black text-slate-800 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Winning format */}
        <div className="flex items-start gap-2.5 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5 mb-4">
          <BookOpen className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">Winning content format</p>
            <p className="text-[12px] font-bold text-violet-800">{data.winningFormat}</p>
            <p className="text-[11px] text-violet-600 leading-snug mt-0.5">{data.winningFormatDetail}</p>
          </div>
        </div>

        {/* SERP features */}
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Likely SERP features</p>
          <div className="flex flex-wrap gap-1.5">
            {data.features.map((f) => (
              <span key={f.id} className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border border-current/20 ${f.bg} ${f.text}`}>
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Simulated SERP results */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Simulated competitive landscape</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100">
            {data.entries.map((entry, i) => {
              if (entry.type === "ad") return (
                <div key={i} className="px-3 py-2.5 bg-amber-50/50">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] font-bold border border-amber-400 text-amber-700 rounded px-1 leading-tight">Ad</span>
                    <span className="text-[9.5px] text-green-700 font-medium truncate">{entry.domain}{entry.path}</span>
                  </div>
                  <p className="text-[11px] text-blue-700 font-semibold leading-snug">{entry.title}</p>
                  <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{entry.snippet}</p>
                </div>
              );
              if (entry.type === "featured_snippet") return (
                <div key={i} className="px-3 py-2.5 bg-blue-50/30 border-l-2 border-blue-400">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[8px] font-bold border border-blue-300 text-blue-700 rounded px-1 leading-tight">Featured Snippet</span>
                  </div>
                  <p className="text-[11px] text-blue-700 font-semibold leading-snug">{entry.title}</p>
                  <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{entry.snippet}</p>
                  <p className="text-[9.5px] text-green-700 font-medium mt-0.5">{entry.domain}{entry.path}</p>
                </div>
              );
              if (entry.type === "paa") return (
                <div key={i} className="px-3 py-2.5 bg-slate-50/70">
                  <p className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">People Also Ask</p>
                  {entry.snippet.split("\n").map((q, qi) => (
                    <div key={qi} className="flex items-center gap-1.5 py-0.5">
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="text-[10.5px] text-slate-700 font-medium">{q.replace("• ", "")}</span>
                    </div>
                  ))}
                </div>
              );
              if (entry.type === "video") return (
                <div key={i} className="px-3 py-2.5 flex items-start gap-2.5">
                  <div className="w-11 h-7 rounded bg-red-100 flex items-center justify-center shrink-0 mt-0.5 border border-red-200">
                    <span className="text-[9px] text-red-600 font-black">▶</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-blue-700 font-semibold leading-snug">{entry.title}</p>
                    <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5">{entry.snippet}</p>
                  </div>
                </div>
              );
              return (
                <div key={i} className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold text-slate-400 tabular-nums w-4 shrink-0">{entry.position}.</span>
                    <span className="text-[9.5px] text-green-700 font-medium truncate">{entry.domain}{entry.path}</span>
                    {entry.contentType && (
                      <span className="ml-auto shrink-0 flex items-center gap-1 text-[8.5px] text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SERP_CONTENT_DOT[entry.contentType] ?? "bg-slate-300"}`} />
                        {SERP_CONTENT_LABEL[entry.contentType] ?? entry.contentType}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-700 font-semibold leading-snug">{entry.title}</p>
                  <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{entry.snippet}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 text-center italic">
            Illustrative landscape only — actual SERP varies by location, device, and personalisation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Keyword Brief Generator ──────────────────────────────────────────────

type KeywordBrief = {
  wordCountMin: number;
  wordCountMax: number;
  contentFormat: string;
  audience: string;
  h2s: string[];
  internalLinks: { anchor: string; page: string }[];
  metaDescription: string;
  cta: string;
};

function briefWordCount(entry: HistoryEntry): [number, number] {
  if (entry.score >= 70) return [2500, 3500];
  if (entry.score >= 45) {
    if (entry.intent === "Transactional") return [800, 1200];
    if (entry.intent === "Commercial") return [1400, 2000];
    return [1800, 2500];
  }
  if (entry.intent === "Transactional") return [600, 900];
  if (entry.intent === "Commercial") return [1000, 1400];
  if (entry.intent === "Navigational") return [600, 900];
  return [1200, 1600];
}

function briefFormat(entry: HistoryEntry): string {
  if (entry.intent === "Transactional") return "Landing page / product page";
  if (entry.intent === "Navigational") return "Feature overview page";
  if (entry.intent === "Commercial") return entry.score >= 55 ? "Long-form comparison article" : "Comparison article";
  return entry.score >= 65 ? "Pillar page / comprehensive guide" : "How-to guide";
}

function briefAudience(entry: HistoryEntry): string {
  if (entry.intent === "Transactional") return "Fintech buyers & decision-makers";
  if (entry.intent === "Navigational") return "Existing customers & users";
  if (entry.intent === "Commercial") return "Fintech leaders evaluating solutions";
  return "Fintech practitioners & content teams";
}

function briefH2s(entry: HistoryEntry): string[] {
  const kw = entry.keyword;
  const yr = new Date().getFullYear();
  if (entry.intent === "Commercial") {
    return [
      `Top ${kw} platforms compared (${yr})`,
      `What to look for in a ${kw} solution`,
      `${kw}: pricing and total cost breakdown`,
      `How to evaluate ${kw} providers`,
      `${kw} integration and technical requirements`,
      `${kw} real-world results and case studies`,
      `Our verdict: which ${kw} is right for you?`,
    ];
  }
  if (entry.intent === "Transactional") {
    return [
      `Why choose ${kw}`,
      `Core features of ${kw}`,
      `${kw} pricing plans explained`,
      `${kw} integrations`,
      `Getting started with ${kw}`,
      `${kw} frequently asked questions`,
    ];
  }
  if (entry.intent === "Navigational") {
    return [
      `${kw} overview`,
      `Key features of ${kw}`,
      `How to get started with ${kw}`,
      `${kw} documentation and resources`,
      `${kw} support and FAQs`,
    ];
  }
  return [
    `What is ${kw}?`,
    `How ${kw} works in practice`,
    `Key benefits of ${kw} for fintech companies`,
    `${kw} vs traditional alternatives`,
    `Common challenges with ${kw} (and how to overcome them)`,
    `How to implement ${kw}: a step-by-step guide`,
    `The future of ${kw} in financial services`,
  ];
}

function briefInternalLinks(entry: HistoryEntry): { anchor: string; page: string }[] {
  const common = [
    { anchor: "fintech content marketing guide", page: "/blog/fintech-content-marketing" },
    { anchor: "keyword difficulty estimator", page: "/tools/keyword-difficulty-estimator" },
  ];
  if (entry.cluster === "Infrastructure & Security") {
    return [
      { anchor: "API banking best practices", page: "/blog/api-banking-guide" },
      { anchor: "fintech security & compliance overview", page: "/blog/fintech-compliance" },
      { anchor: "RegTech explained for marketers", page: "/blog/regtech-guide" },
      ...common,
    ];
  }
  if (entry.cluster === "Commercial Solutions") {
    return [
      { anchor: "fintech product marketing strategies", page: "/blog/fintech-product-marketing" },
      { anchor: "how to write fintech case studies", page: "/blog/fintech-case-studies" },
      { anchor: "fintech pricing page copywriting tips", page: "/blog/pricing-page-copy" },
      ...common,
    ];
  }
  return [
    { anchor: "fintech SEO guide", page: "/blog/fintech-seo" },
    { anchor: "content strategy for fintech startups", page: "/blog/fintech-content-strategy" },
    { anchor: "top fintech blog topics", page: "/blog/fintech-blog-topics" },
    ...common,
  ];
}

function briefMeta(entry: HistoryEntry): string {
  const kw = entry.keyword;
  const yr = new Date().getFullYear();
  if (entry.intent === "Commercial") {
    return `Compare the best ${kw} solutions in ${yr}. Expert reviews, feature breakdowns, and top picks to help fintech teams make the right choice.`;
  }
  if (entry.intent === "Transactional") {
    return `Get started with ${kw} today. Explore features, pricing, and integrations — request a free demo to see if it's right for your fintech.`;
  }
  if (entry.intent === "Navigational") {
    return `Explore everything about ${kw}. Find documentation, guides, and support resources to get the most from your ${kw} platform.`;
  }
  return `Learn everything about ${kw}. This expert guide covers how it works, key benefits for fintech companies, and implementation best practices.`;
}

function briefCta(entry: HistoryEntry): string {
  if (entry.intent === "Transactional") return "Start your free trial today";
  if (entry.intent === "Commercial") return "Request a free content strategy consultation";
  if (entry.intent === "Navigational") return "Book a product demo";
  return "Subscribe to the FintechPressHub newsletter for weekly fintech content insights";
}

function generateBrief(entry: HistoryEntry): KeywordBrief {
  const [wordCountMin, wordCountMax] = briefWordCount(entry);
  return {
    wordCountMin,
    wordCountMax,
    contentFormat: briefFormat(entry),
    audience: briefAudience(entry),
    h2s: briefH2s(entry),
    internalLinks: briefInternalLinks(entry),
    metaDescription: briefMeta(entry),
    cta: briefCta(entry),
  };
}

function KeywordBriefPanel({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const brief = useMemo(() => generateBrief(entry), [entry]);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedH2s, setCopiedH2s] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const copyMeta = () => {
    navigator.clipboard.writeText(brief.metaDescription);
    setCopiedMeta(true);
    setTimeout(() => setCopiedMeta(false), 1800);
  };

  const copyH2s = () => {
    navigator.clipboard.writeText(brief.h2s.map((h, i) => `${i + 1}. ${h}`).join("\n"));
    setCopiedH2s(true);
    setTimeout(() => setCopiedH2s(false), 1800);
  };

  const copyFull = () => {
    const md = [
      `# Content Brief: ${entry.keyword}`,
      ``,
      `## Overview`,
      `- **Format**: ${brief.contentFormat}`,
      `- **Target word count**: ${brief.wordCountMin.toLocaleString()}–${brief.wordCountMax.toLocaleString()} words`,
      `- **Search intent**: ${entry.intent}`,
      `- **Target audience**: ${brief.audience}`,
      `- **Difficulty score**: ${entry.score}/100 (${entry.label})`,
      `- **Volume estimate**: ${entry.volumeRange}`,
      ``,
      `## Suggested H2 Structure`,
      ``,
      ...brief.h2s.map((h, i) => `${i + 1}. ${h}`),
      ``,
      `## Internal Linking Opportunities`,
      ``,
      ...brief.internalLinks.map((l) => `- [${l.anchor}](${l.page})`),
      ``,
      `## Meta Description (${brief.metaDescription.length} chars)`,
      ``,
      brief.metaDescription,
      ``,
      `## Primary CTA`,
      ``,
      brief.cta,
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="mt-4 rounded-xl border border-violet-200 bg-white shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-100">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-sm font-bold text-violet-900 shrink-0">Content Brief</span>
          <span className="text-xs text-violet-500 font-medium truncate">"{entry.keyword}"</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview chips */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            { label: "Format", value: brief.contentFormat },
            { label: "Word count", value: `${brief.wordCountMin.toLocaleString()}–${brief.wordCountMax.toLocaleString()}` },
            { label: "Intent", value: entry.intent },
            { label: "Audience", value: brief.audience },
          ] as const).map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className="text-[11px] font-semibold text-slate-700 leading-snug">{value}</p>
            </div>
          ))}
        </div>

        {/* H2 structure */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Suggested H2 Structure</p>
            <button
              type="button"
              onClick={copyH2s}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
            >
              {copiedH2s ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedH2s ? "Copied!" : "Copy all"}
            </button>
          </div>
          <ol className="space-y-1.5">
            {brief.h2s.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-violet-400 tabular-nums w-4 shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-[11.5px] font-medium text-slate-700 leading-snug">{h}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Internal links */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Internal Linking Opportunities</p>
          <ul className="space-y-1">
            {brief.internalLinks.map((l) => (
              <li key={l.page} className="flex items-center gap-2">
                <ArrowRight className="w-2.5 h-2.5 text-violet-400 shrink-0" />
                <span className="text-[11px] text-violet-600 font-medium">{l.anchor}</span>
                <span className="text-[10px] text-slate-400 truncate">{l.page}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Meta description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Meta Description</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold tabular-nums ${brief.metaDescription.length > 160 ? "text-red-500" : brief.metaDescription.length > 140 ? "text-amber-500" : "text-emerald-600"}`}>
                {brief.metaDescription.length} / 160 chars
              </span>
              <button
                type="button"
                onClick={copyMeta}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
              >
                {copiedMeta ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedMeta ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <p className="text-[12px] text-slate-700 leading-relaxed">{brief.metaDescription}</p>
          </div>
        </div>

        {/* CTA suggestion */}
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
          <Target className="w-4 h-4 text-violet-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">Primary CTA</p>
            <p className="text-[12px] font-semibold text-violet-800">{brief.cta}</p>
          </div>
        </div>
      </div>

      {/* Footer: copy full brief */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={copyFull}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold text-[12px] py-2.5 transition-colors"
        >
          {copiedFull ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedFull ? "Brief copied to clipboard!" : "Copy full brief as Markdown"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Content Gap Score ─────────────────────────────────────────────────────

type GapCategory =
  | "Payments"
  | "Security & Compliance"
  | "Lending & Credit"
  | "Wealth Tech"
  | "InsurTech"
  | "Neobanking";

type EssentialTopic = {
  id: string;
  name: string;
  category: GapCategory;
  signals: string[];
  suggestedKw: string;
};

const ESSENTIAL_TOPICS: EssentialTopic[] = [
  // Payments (6)
  { id: "pay-proc",     name: "Payment Processing",    category: "Payments",              signals: ["payment processing", "payment processor", "merchant acquiring"],           suggestedKw: "payment processing fintech" },
  { id: "open-bank",    name: "Open Banking",          category: "Payments",              signals: ["open banking", "psd2", "account access api"],                              suggestedKw: "open banking API solutions" },
  { id: "dig-pay",      name: "Digital Payments",      category: "Payments",              signals: ["digital payment", "mobile pay", "contactless", "e-wallet"],                suggestedKw: "digital payments platform" },
  { id: "bnpl",         name: "Buy Now Pay Later",     category: "Payments",              signals: ["bnpl", "buy now pay later", "pay later", "instalment credit"],             suggestedKw: "best BNPL platform" },
  { id: "xborder",      name: "Cross-Border Payments", category: "Payments",              signals: ["cross-border", "cross border", "remittance", "international transfer"],    suggestedKw: "cross-border payment solutions" },
  { id: "gateway",      name: "Payment Gateway",       category: "Payments",              signals: ["payment gateway", "checkout api", "payment link", "merchant payment"],     suggestedKw: "payment gateway comparison" },
  // Security & Compliance (6)
  { id: "kyc",          name: "KYC / Identity",        category: "Security & Compliance", signals: ["kyc", "know your customer", "identity verification", "ekyc"],              suggestedKw: "KYC verification fintech" },
  { id: "aml",          name: "AML Compliance",        category: "Security & Compliance", signals: ["aml", "anti-money laundering", "financial crime", "sanctions screening"],  suggestedKw: "AML compliance software" },
  { id: "fraud",        name: "Fraud Detection",       category: "Security & Compliance", signals: ["fraud detection", "fraud prevention", "chargeback", "risk scoring"],       suggestedKw: "fraud detection fintech" },
  { id: "datasec",      name: "Data Security",         category: "Security & Compliance", signals: ["data security", "encryption", "gdpr fintech", "pci dss", "cybersecurity"], suggestedKw: "fintech data security" },
  { id: "regtech",      name: "RegTech & Compliance",  category: "Security & Compliance", signals: ["regtech", "regulatory compliance", "fca compliance", "sec fintech"],       suggestedKw: "regtech compliance platform" },
  { id: "apisec",       name: "API Security",          category: "Security & Compliance", signals: ["api security", "api authentication", "oauth fintech", "token security"],   suggestedKw: "fintech API security" },
  // Lending & Credit (4)
  { id: "diglend",      name: "Digital Lending",       category: "Lending & Credit",      signals: ["digital lending", "online lending", "fintech loan", "lending platform"],   suggestedKw: "digital lending platform" },
  { id: "credscor",     name: "Credit Scoring",        category: "Lending & Credit",      signals: ["credit scoring", "credit score", "alternative credit", "credit risk ai"],  suggestedKw: "fintech credit scoring" },
  { id: "embfin",       name: "Embedded Finance",      category: "Lending & Credit",      signals: ["embedded finance", "embedded banking", "banking as a service", "baas"],    suggestedKw: "embedded finance solutions" },
  { id: "p2plend",      name: "P2P Lending",           category: "Lending & Credit",      signals: ["p2p lending", "peer-to-peer lending", "marketplace lending"],              suggestedKw: "peer-to-peer lending platform" },
  // Wealth Tech (4)
  { id: "robo",         name: "Robo Advisors",         category: "Wealth Tech",           signals: ["robo advisor", "robo-advisor", "automated investing", "digital advisor"],  suggestedKw: "robo advisor fintech" },
  { id: "wlth",         name: "Wealth Management",     category: "Wealth Tech",           signals: ["wealthtech", "digital wealth", "portfolio management", "asset management fintech"], suggestedKw: "wealthtech platform" },
  { id: "crypto",       name: "Crypto & DeFi",         category: "Wealth Tech",           signals: ["crypto", "defi", "decentralised finance", "web3 finance", "blockchain finance"], suggestedKw: "crypto fintech platform" },
  { id: "trading",      name: "Trading Platforms",     category: "Wealth Tech",           signals: ["trading platform", "stock trading fintech", "brokerage api", "retail investor"], suggestedKw: "fintech trading platform" },
  // InsurTech (2)
  { id: "insurtech",    name: "InsurTech",             category: "InsurTech",             signals: ["insurtech", "insurance tech", "digital insurance", "insurance platform"],  suggestedKw: "insurtech platform" },
  { id: "embinsure",    name: "Embedded Insurance",    category: "InsurTech",             signals: ["embedded insurance", "parametric insurance", "usage-based insurance"],     suggestedKw: "embedded insurance solutions" },
  // Neobanking (2)
  { id: "neobank",      name: "Neobanks",              category: "Neobanking",            signals: ["neobank", "challenger bank", "digital bank", "virtual bank"],              suggestedKw: "best neobank 2025" },
  { id: "baas",         name: "Banking as a Service",  category: "Neobanking",            signals: ["banking as a service", "baas", "bank api", "white label banking"],         suggestedKw: "banking as a service platform" },
];

const GAP_CATEGORY_CFG: Record<GapCategory, { color: string; bgColor: string; borderColor: string; barColor: string }> = {
  "Payments":               { color: "#6d28d9", bgColor: "rgba(109,40,217,0.06)", borderColor: "rgba(109,40,217,0.22)", barColor: "#7c3aed" },
  "Security & Compliance":  { color: "#0e7490", bgColor: "rgba(8,145,178,0.06)",  borderColor: "rgba(8,145,178,0.22)",  barColor: "#0891b2" },
  "Lending & Credit":       { color: "#b45309", bgColor: "rgba(180,83,9,0.06)",   borderColor: "rgba(180,83,9,0.22)",   barColor: "#d97706" },
  "Wealth Tech":            { color: "#047857", bgColor: "rgba(4,120,87,0.06)",   borderColor: "rgba(4,120,87,0.22)",   barColor: "#10b981" },
  "InsurTech":              { color: "#be185d", bgColor: "rgba(190,24,93,0.06)",  borderColor: "rgba(190,24,93,0.22)",  barColor: "#ec4899" },
  "Neobanking":             { color: "#4338ca", bgColor: "rgba(67,56,202,0.06)",  borderColor: "rgba(67,56,202,0.22)",  barColor: "#6366f1" },
};

function topicIsCovered(topic: EssentialTopic, history: HistoryEntry[]): boolean {
  const histText = history.map((h) => h.keyword).join(" ").toLowerCase();
  return topic.signals.some((sig) => histText.includes(sig.toLowerCase()));
}

const GAP_RING_R = 46;
const GAP_RING_CIRC = 2 * Math.PI * GAP_RING_R;

function computeGapAnalysis(history: HistoryEntry[]) {
  const covered: EssentialTopic[] = [];
  const missing: EssentialTopic[] = [];
  const byCategory = {} as Record<GapCategory, { covered: number; total: number }>;

  for (const topic of ESSENTIAL_TOPICS) {
    if (!byCategory[topic.category]) byCategory[topic.category] = { covered: 0, total: 0 };
    byCategory[topic.category].total++;
    if (topicIsCovered(topic, history)) {
      covered.push(topic);
      byCategory[topic.category].covered++;
    } else {
      missing.push(topic);
    }
  }

  const pct = Math.round((covered.length / ESSENTIAL_TOPICS.length) * 100);
  const grade = pct >= 75 ? "A" : pct >= 55 ? "B" : pct >= 35 ? "C" : pct >= 20 ? "D" : "F";
  const gradeColor = pct >= 75 ? "text-emerald-600" : pct >= 55 ? "text-blue-600" : pct >= 35 ? "text-amber-600" : pct >= 20 ? "text-orange-600" : "text-red-600";
  const ringColor  = pct >= 75 ? "#10b981" : pct >= 55 ? "#3b82f6" : pct >= 35 ? "#f59e0b" : pct >= 20 ? "#f97316" : "#ef4444";
  const coverageLabel = pct < 35 ? "Thin coverage — expand your topic range to build authority." : pct < 65 ? "Partial coverage — fill the gaps below to deepen topical authority." : "Strong coverage — a few more clusters will complete your topical map.";

  return { pct, grade, gradeColor, ringColor, coverageLabel, covered, missing, byCategory, total: ESSENTIAL_TOPICS.length };
}

function ContentGapScore({
  history,
  onSuggest,
}: {
  history: HistoryEntry[];
  onSuggest: (kw: string) => void;
}) {
  const gap = useMemo(() => computeGapAnalysis(history), [history]);
  const [showAll, setShowAll] = useState(false);
  const dashOffset = GAP_RING_CIRC * (1 - gap.pct / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <Card className="border border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-5">

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-violet-600 shrink-0" />
            <h4 className="text-sm font-semibold text-slate-900">Content Gap Score</h4>
            <span className="text-[10px] text-muted-foreground ml-0.5">
              vs {gap.total} essential fintech topics
            </span>
          </div>

          <div className="flex gap-5 items-start">

            {/* Score ring */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <svg width={114} height={114} viewBox="0 0 114 114" aria-label={`${gap.pct}% topical coverage`}>
                {/* Track */}
                <circle cx={57} cy={57} r={GAP_RING_R} fill="none" stroke="#e2e8f0" strokeWidth={10} />
                {/* Arc */}
                <motion.circle
                  cx={57} cy={57} r={GAP_RING_R}
                  fill="none"
                  stroke={gap.ringColor}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={GAP_RING_CIRC}
                  initial={{ strokeDashoffset: GAP_RING_CIRC }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
                  transform="rotate(-90 57 57)"
                />
                {/* Inner labels */}
                <text x={57} y={51} textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={800} fill="#0f172a">
                  {gap.pct}%
                </text>
                <text x={57} y={67} textAnchor="middle" fontSize={8.5} fill="#94a3b8" fontWeight={500} letterSpacing={0.3}>
                  covered
                </text>
              </svg>

              {/* Grade badge */}
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-lg border-current bg-white shadow-sm ${gap.gradeColor}`}>
                {gap.grade}
              </div>
              <span className="text-[9px] text-slate-400 font-medium tabular-nums">
                {gap.covered.length} / {gap.total} topics
              </span>
            </div>

            {/* Category breakdown bars */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {(Object.keys(GAP_CATEGORY_CFG) as GapCategory[]).map((cat) => {
                const stats = gap.byCategory[cat];
                if (!stats) return null;
                const cfg = GAP_CATEGORY_CFG[cat];
                const catPct = Math.round((stats.covered / stats.total) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-semibold text-slate-600 leading-none">{cat}</span>
                      <span className="text-[10px] font-bold tabular-nums leading-none" style={{ color: cfg.color }}>
                        {stats.covered}/{stats.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: cfg.barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${catPct}%` }}
                        transition={{ duration: 0.75, ease: "easeOut", delay: 0.12 }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Tip line */}
              <p className="text-[10.5px] text-muted-foreground leading-relaxed pt-1">
                {gap.coverageLabel}
              </p>
            </div>
          </div>

          {/* Missing topics */}
          {gap.missing.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Uncovered topics — click to analyse
                </p>
                {gap.missing.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    {showAll ? "Show fewer" : `+${gap.missing.length - 8} more`}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {(showAll ? gap.missing : gap.missing.slice(0, 8)).map((topic, i) => {
                    const cfg = GAP_CATEGORY_CFG[topic.category];
                    return (
                      <motion.button
                        key={topic.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.86 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => onSuggest(topic.suggestedKw)}
                        title={`Analyse: "${topic.suggestedKw}"`}
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full border transition-all hover:shadow-sm active:scale-95"
                        style={{ backgroundColor: cfg.bgColor, borderColor: cfg.borderColor, color: cfg.color }}
                      >
                        <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                        {topic.name}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Full coverage celebration */}
          {gap.missing.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 pt-4 border-t border-slate-100"
            >
              <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
                <Trophy className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">
                  Full topical coverage! You've analysed keywords across all essential fintech areas.
                </p>
              </div>
            </motion.div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Content Roadmap ───────────────────────────────────────────────────────

function buildRoadmapMonths(result: Result) {
  const kw = result.keyword;
  const s = result.score;
  const ideas = generateClusterIdeas(result.cluster, kw);

  const m1: { id: string; label: string }[] = [
    { id: "m1-pillar",   label: `Write and publish a pillar page targeting "${kw}"` },
    { id: "m1-meta",     label: "Optimise title tag, meta description, and H1" },
    { id: "m1-schema",   label: "Add structured data markup (Article + FAQ schema)" },
    { id: "m1-gsc",      label: "Submit URL to Google Search Console" },
    { id: "m1-track",    label: `Set up rank tracking for "${kw}"` },
  ];
  if (s >= 55) {
    m1.push({ id: "m1-cwv",   label: "Run a Core Web Vitals audit and fix issues" });
    m1.push({ id: "m1-crawl", label: "Fix crawlability issues (canonical, hreflang, robots)" });
  }
  if (s < 35) {
    m1.push({ id: "m1-int",   label: "Build 3+ internal links from related existing pages" });
    m1.push({ id: "m1-now",   label: "Prioritise now — low-competition window won't last long" });
  }

  const m2: { id: string; label: string }[] = [
    { id: "m2-c1",      label: `Publish: "${ideas[0]}"` },
    { id: "m2-c2",      label: `Publish: "${ideas[1]}"` },
    { id: "m2-c3",      label: `Publish: "${ideas[2]}"` },
    { id: "m2-lout",    label: "Add internal links: pillar page → each cluster article" },
    { id: "m2-lin",     label: "Add internal links: each cluster article → pillar page" },
    { id: "m2-update",  label: "Update pillar page to reference the new cluster articles" },
  ];

  const m3: { id: string; label: string }[] = [
    { id: "m3-gsc",    label: `Review Search Console impressions & CTR for "${kw}"` },
    { id: "m3-rank",   label: "Track ranking position weekly for at least 4 weeks" },
    { id: "m3-comp",   label: "Identify top 5 competitor backlink sources" },
  ];
  if (s >= 55) {
    m3.push({ id: "m3-guest", label: "Launch guest post outreach (target 3+ DR 40+ domains)" });
    m3.push({ id: "m3-pr",    label: "Identify digital PR angles for natural link acquisition" });
  }
  if (s < 35) {
    m3.push({ id: "m3-ref",  label: "Refresh pillar page with new data, stats, or expert quotes" });
    m3.push({ id: "m3-faq",  label: "Expand FAQ section targeting related long-tail questions" });
  }
  m3.push({ id: "m3-next", label: "Review gaps and plan next quarter's content cluster" });

  return [
    {
      num: 1,
      title: "Pillar Page Creation",
      sub: "Technical SEO",
      icon: <Clock className="w-4 h-4" />,
      accent: "#7c3aed",
      accentBg: "bg-violet-50",
      accentBorder: "border-violet-200",
      accentText: "text-violet-700",
      tasks: m1,
    },
    {
      num: 2,
      title: "3× Cluster Articles",
      sub: "Topical Authority",
      icon: <BookOpen className="w-4 h-4" />,
      accent: "#0891b2",
      accentBg: "bg-cyan-50",
      accentBorder: "border-cyan-200",
      accentText: "text-cyan-700",
      tasks: m2,
    },
    {
      num: 3,
      title: "Backlink Outreach",
      sub: "Performance Monitoring",
      icon: <TrendingUp className="w-4 h-4" />,
      accent: "#059669",
      accentBg: "bg-emerald-50",
      accentBorder: "border-emerald-200",
      accentText: "text-emerald-700",
      tasks: m3,
    },
  ] as const;
}


function ContentRoadmap({ result }: { result: Result }) {
  const [activeMonth, setActiveMonth] = useState<number>(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copiedRoadmap, setCopiedRoadmap] = useState(false);
  const months = useMemo(() => buildRoadmapMonths(result), [result]);

  const copyRoadmap = () => {
    const text = [
      `3-Month Content Roadmap: "${result.keyword}"`,
      "",
      ...months.flatMap((m) => [
        `MONTH ${m.num}: ${m.title.toUpperCase()} · ${m.sub.toUpperCase()}`,
        ...m.tasks.map((t) => `☐ ${t.label}`),
        "",
      ]),
      "—",
      "Generated by FintechPressHub Keyword Difficulty Estimator",
      "https://fintechpresshub.com/tools/keyword-difficulty-estimator",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRoadmap(true);
      setTimeout(() => setCopiedRoadmap(false), 2200);
    }).catch(() => {});
  };

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const active = months[activeMonth];

  return (
    <Card className="border border-slate-100 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <ArrowRight className="w-4 h-4 text-violet-600 shrink-0" />
          <h4 className="text-sm font-semibold text-slate-900">Content Roadmap</h4>
          <span className="text-[10px] text-muted-foreground ml-0.5">3-month execution plan</span>
          <button
            type="button"
            onClick={copyRoadmap}
            className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
              copiedRoadmap
                ? "bg-green-50 border-green-200 text-green-700"
                : "border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            {copiedRoadmap
              ? <><Check className="w-2.5 h-2.5" /> Copied!</>
              : <><Copy className="w-2.5 h-2.5" /> Copy Roadmap</>}
          </button>
        </div>

        {/* Horizontal timeline */}
        <div className="relative flex items-start mb-4">
          {/* Connector track behind nodes */}
          <div className="absolute top-5 left-[calc(16.66%)] right-[calc(16.66%)] h-0.5 bg-slate-200 z-0">
            <motion.div
              className="h-full bg-violet-300 origin-left"
              animate={{ scaleX: activeMonth === 0 ? 0 : activeMonth === 1 ? 0.5 : 1 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
          </div>

          {months.map((m, i) => {
            const isActive = activeMonth === i;
            const allDone = m.tasks.every((t) => checked[t.id]);
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => setActiveMonth(i)}
                className="relative z-10 flex flex-col items-center gap-1.5 flex-1 min-w-0 group"
              >
                <motion.div
                  animate={{
                    backgroundColor: isActive
                      ? m.accent
                      : allDone
                        ? "#10b981"
                        : "#f8fafc",
                    borderColor: isActive
                      ? m.accent
                      : allDone
                        ? "#10b981"
                        : "#e2e8f0",
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-sm"
                  style={{
                    color: isActive ? "#fff" : allDone ? "#fff" : m.accent,
                  }}
                >
                  {allDone && !isActive
                    ? <Check className="w-4 h-4" />
                    : m.icon}
                </motion.div>
                <div className="text-center px-1">
                  <p className={`text-[10px] font-bold leading-tight transition-colors ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}>
                    Month {m.num}
                  </p>
                  <p className={`text-[9px] leading-tight mt-0.5 transition-colors hidden sm:block ${isActive ? "text-slate-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                    {m.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expanded checklist */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMonth}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            <div className={`rounded-xl border ${active.accentBorder} ${active.accentBg} p-4`}>
              {/* Checklist header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span style={{ color: active.accent }}>{active.icon}</span>
                <span className={`text-xs font-bold ${active.accentText}`}>
                  Month {active.num}: {active.title}
                </span>
                <span className={`ml-auto text-[10px] font-semibold tabular-nums ${active.accentText} opacity-60`}>
                  {active.tasks.filter((t) => checked[t.id]).length}/{active.tasks.length} done
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 w-full bg-white/70 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: active.accent }}
                  animate={{
                    width: `${(active.tasks.filter((t) => checked[t.id]).length / active.tasks.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Tasks */}
              <div className="space-y-1.5">
                {active.tasks.map((task, i) => (
                  <motion.button
                    key={task.id}
                    type="button"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.035 }}
                    onClick={() => toggle(task.id)}
                    className="w-full flex items-start gap-2.5 text-left group"
                  >
                    <motion.div
                      animate={{
                        backgroundColor: checked[task.id] ? active.accent : "#fff",
                        borderColor: checked[task.id] ? active.accent : "#cbd5e1",
                      }}
                      transition={{ duration: 0.14 }}
                      className="mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center"
                    >
                      {checked[task.id] && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                    <span
                      className={`text-[12px] leading-snug transition-colors ${
                        checked[task.id]
                          ? "line-through text-slate-400"
                          : "text-slate-700 group-hover:text-slate-900"
                      }`}
                    >
                      {task.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Campaign Export Modal ─────────────────────────────────────────────────

function CampaignExportModal({
  history,
  onClose,
  onGenerate,
}: {
  history: HistoryEntry[];
  onClose: () => void;
  onGenerate: (clientName: string, selected: Set<string>) => void;
}) {
  const [clientName, setClientName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(history.map((h) => h.keyword)),
  );

  const allSelected = selected.size === history.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(history.map((h) => h.keyword)));
  const toggleOne = (kw: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  const canGenerate = clientName.trim().length >= 2 && selected.size >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-violet-700">
          <Sparkles className="w-4 h-4 text-violet-200 shrink-0" />
          <div>
            <p className="text-sm font-bold text-white leading-tight">Full Campaign Export</p>
            <p className="text-[10px] text-violet-300 leading-tight">Multi-page PDF · Score · Matrix · Roadmap</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-violet-300 hover:text-white hover:bg-violet-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Client name */}
          <div>
            <Label htmlFor="campaign-client" className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Client Name
            </Label>
            <Input
              id="campaign-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Fintech Ltd"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canGenerate) {
                  onGenerate(clientName.trim(), selected);
                  onClose();
                }
              }}
            />
            {clientName.trim().length >= 2 && (
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                Report title:{" "}
                <span className="text-violet-600 font-semibold">
                  "{clientName.trim()} — Fintech Content Growth Campaign"
                </span>
              </p>
            )}
          </div>

          {/* Keyword selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">
                Keywords to include{" "}
                <span className="text-slate-400 font-normal">
                  ({selected.size} of {history.length})
                </span>
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {history.map((h) => {
                const qInfo = getQuadrantInfo(h.score, h.intent);
                const isChecked = selected.has(h.keyword);
                const sColorClass =
                  h.score >= 70
                    ? "bg-red-500"
                    : h.score >= 40
                      ? "bg-orange-500"
                      : "bg-green-500";
                return (
                  <button
                    key={h.keyword}
                    type="button"
                    onClick={() => toggleOne(h.keyword)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isChecked ? "bg-violet-50" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: isChecked ? "#7c3aed" : "#fff",
                        borderColor: isChecked ? "#7c3aed" : "#cbd5e1",
                      }}
                      className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
                    >
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                    <span
                      className={`shrink-0 w-7 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center ${sColorClass}`}
                    >
                      {h.score}
                    </span>
                    <span className="text-xs font-medium text-slate-700 flex-1 min-w-0 truncate">
                      {h.keyword}
                    </span>
                    <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                      {qInfo.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Each keyword gets a dedicated page with its{" "}
              <span className="font-semibold text-slate-700">Difficulty Score</span>,{" "}
              <span className="font-semibold text-slate-700">Opportunity Matrix</span>, and{" "}
              <span className="font-semibold text-slate-700">3-Month Content Roadmap</span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => {
              if (canGenerate) {
                onGenerate(clientName.trim(), selected);
                onClose();
              }
            }}
            className="flex-[2] py-2.5 rounded-lg bg-violet-700 hover:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Generate Campaign PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function KeywordDifficultyEstimator() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedCluster, setCopiedCluster] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("kde_history");
      return saved ? (JSON.parse(saved) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [briefEntry, setBriefEntry] = useState<HistoryEntry | null>(null);
  const [scoreDriversOpen, setScoreDriversOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollToResultsRef = useRef(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const cannibalizationSet = useMemo((): Set<string> => {
    const flagged = new Set<string>();
    if (history.length < 2) return flagged;

    const STOP = new Set([
      "what","is","how","to","for","in","the","a","an","of","and","or","vs",
      "best","guide","use","from","are","be","with","on","at","by","that",
      "this","your","their","our","not","but","more","less","get","do","so",
      "as","it","if","can","about","when","where","why","will","would",
    ]);

    function tokenize(kw: string): Set<string> {
      return new Set(
        kw.toLowerCase().split(/\s+/)
          .map((w) => w.replace(/[^a-z]/g, "").replace(/s$/, ""))
          .filter((w) => w.length > 2 && !STOP.has(w))
      );
    }

    function overlapCoefficient(a: Set<string>, b: Set<string>): number {
      if (!a.size || !b.size) return 0;
      let shared = 0;
      a.forEach((w) => { if (b.has(w)) shared++; });
      return shared / Math.min(a.size, b.size);
    }

    const tokenCache = new Map<string, Set<string>>();
    history.forEach((h) => tokenCache.set(h.keyword, tokenize(h.keyword)));

    for (let i = 0; i < history.length; i++) {
      for (let j = i + 1; j < history.length; j++) {
        const tA = tokenCache.get(history[i].keyword)!;
        const tB = tokenCache.get(history[j].keyword)!;
        if (overlapCoefficient(tA, tB) > 0.7) {
          flagged.add(history[i].keyword);
          flagged.add(history[j].keyword);
        }
      }
    }
    return flagged;
  }, [history]);

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
    localStorage.setItem("kde_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (result && scrollToResultsRef.current) {
      scrollToResultsRef.current = false;
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, [result]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q && q.trim().length >= 2) {
      analyseKw(q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setKeyword("");
    setResult(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = [
      "Keyword",
      "Score",
      "Difficulty Label",
      "Search Intent",
      "Intent Reason",
      "Cluster",
      "Volume Range",
      "Long-tail Variations",
      "Content Tips",
    ];
    const rows = history.map((h) => [
      escape(h.keyword),
      String(h.score),
      escape(h.label),
      escape(h.intent),
      escape(h.intentReason),
      escape(h.cluster),
      escape(h.volumeRange),
      escape(h.longTails.join(" | ")),
      escape(h.tips.join(" | ")),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintech-keywords-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyseKw = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    const r = estimateDifficulty(trimmed);
    setKeyword(trimmed);
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

  const analyse = () => analyseKw(keyword);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {});
  };

  const copyLongTail = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const copyClusterIdea = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCluster(idx);
      setTimeout(() => setCopiedCluster(null), 2000);
    }).catch(() => {});
  };

  const copyMarkdown = (r: Result) => {
    const ideas = generateClusterIdeas(r.cluster, r.keyword);
    const timeline =
      r.score < 30
        ? "Estimated 2–4 weeks to Page 1 with optimized content."
        : r.score <= 60
          ? "Estimated 3–6 months of consistent authority building."
          : "High-competition term. Estimated 6+ months; requires aggressive backlink strategy.";
    const contentGap =
      r.intent === "Commercial" || r.intent === "Transactional"
        ? "Top results lack transparent pricing comparisons—add a table to stand out."
        : "Current guides are text-heavy—rank faster by including a technical architecture diagram or API flow-chart.";
    const md = [
      `# ${r.keyword}`,
      ``,
      `| Property | Value |`,
      `|---|---|`,
      `| **Difficulty** | ${r.score}/100 — ${r.label} |`,
      `| **Intent** | ${r.intent} |`,
      `| **Volume** | ${r.volumeRange} |`,
      `| **Cluster** | ${r.cluster} |`,
      `| **Timeline** | ${timeline} |`,
      ``,
      `## Long-Tail Variations`,
      ``,
      ...r.longTails.map((lt, i) => `${i + 1}. ${lt}`),
      ``,
      `## Cluster Content Ideas`,
      ``,
      ...ideas.map((idea, i) => `${i + 1}. ${idea}`),
      ``,
      `## Strategy Tips`,
      ``,
      ...r.tips.map((tip) => `- ${tip}`),
      ``,
      `## The Content Gap`,
      ``,
      `> ${contentGap}`,
      ``,
      `---`,
      `*Generated by [FintechPressHub Keyword Difficulty Estimator](https://fintechpresshub.com/tools/keyword-difficulty-estimator)*`,
    ].join("\n");
    navigator.clipboard.writeText(md).then(() => {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    }).catch(() => {});
  };

  const downloadSessionReport = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pw - margin * 2;
    let y = 0;

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // ── Header ─────────────────────────────────────────────────────────────────
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, pw, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("FintechPressHub", margin, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 180, 254);
    doc.text("FINTECH SEO & CONTENT MARKETING", margin, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("FULL SESSION REPORT", pw - margin, 17, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 180, 254);
    doc.text(`Generated ${today}`, pw - margin, 24, { align: "right" });

    y = 54;

    // ── Session title ──────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(`${history.length} Keywords Analysed`, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Difficulty benchmarks, ranking timelines, and content gap insights for each term.", margin, y);
    y += 10;

    // ── Summary table ──────────────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 7;

    const colX = [margin, margin + 76, margin + 98, margin + 134];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("KEYWORD", colX[0], y);
    doc.text("SCORE", colX[1], y);
    doc.text("INTENT", colX[2], y);
    doc.text("QUADRANT", colX[3], y);
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pw - margin, y);
    y += 5;

    history.forEach((h, i) => {
      const qInfo = getQuadrantInfo(h.score, h.intent);
      const scoreRgb: [number, number, number] =
        h.score >= 70 ? [220, 38, 38] : h.score >= 40 ? [234, 88, 12] : [22, 163, 74];
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 2.5, contentW, 7.5, "F");
      }
      const kw = h.keyword.length > 32 ? h.keyword.slice(0, 30) + "…" : h.keyword;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(kw, colX[0], y + 2.5);
      doc.setFillColor(...scoreRgb);
      doc.roundedRect(colX[1], y - 1, 16, 6, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${h.score}`, colX[1] + 8, y + 2.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(h.intent, colX[2], y + 2.5);
      doc.text(qInfo.label, colX[3], y + 2.5);
      y += 7.5;
    });

    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    // ── Per-keyword detail ─────────────────────────────────────────────────────
    history.forEach((h, idx) => {
      if (y > ph - 70) { doc.addPage(); y = 20; }

      const scoreRgb: [number, number, number] =
        h.score >= 70 ? [220, 38, 38] : h.score >= 40 ? [234, 88, 12] : [22, 163, 74];
      const timelineText =
        h.score < 30
          ? "2–4 weeks to Page 1 with optimized content."
          : h.score <= 60
            ? "3–6 months of consistent authority building."
            : "6+ months; requires aggressive backlink strategy.";
      const cgText =
        h.intent === "Commercial" || h.intent === "Transactional"
          ? "Top results lack transparent pricing comparisons—add a comparison table."
          : "Current guides are text-heavy—add a technical architecture diagram or API flow-chart.";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${h.keyword}`, margin, y);
      y += 5;

      doc.setFillColor(...scoreRgb);
      doc.roundedRect(margin, y, 22, 6.5, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${h.score}/100`, margin + 11, y + 4.4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`⏱  ${timelineText}`, margin + 26, y + 4.4);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOP LONG-TAIL VARIATIONS", margin, y);
      y += 4;
      h.longTails.slice(0, 3).forEach((lt) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`• ${lt}`, margin + 2, y);
        y += 4.5;
      });

      y += 2;
      const cgLines = doc.splitTextToSize(`Content Gap: ${cgText}`, contentW - 8) as string[];
      const cgH = cgLines.length * 4.5 + 5;
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin, y, contentW, cgH, 1.5, 1.5, "F");
      doc.setDrawColor(253, 230, 138);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentW, cgH, 1.5, 1.5, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 15);
      doc.text(cgLines, margin + 4, y + 4);
      y += cgH + 6;

      if (idx < history.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pw - margin, y);
        y += 8;
      }
    });

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = ph - 12;
    if (y > footerY - 22) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 250, 252);
    doc.rect(0, footerY - 7, pw, 20, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(0, footerY - 7, pw, footerY - 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Strategy prepared by FintechPressHub — Experts in High-Authority Search Growth", pw / 2, footerY - 1, { align: "center" });
    const contactUrl = "https://fintechpresshub.com/contact";
    doc.setTextColor(109, 40, 217);
    doc.textWithLink(contactUrl, pw / 2, footerY + 4, { align: "center", url: contactUrl });

    doc.save(`session-report-${history.length}-keywords-${new Date().toISOString().slice(0, 10)}.pdf`);
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

  const downloadSeoBrief = (r: Result) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pw - margin * 2;
    let y = 0;

    // ── Header band ──────────────────────────────────────────────────────────
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, pw, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("FintechPressHub", margin, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 180, 254);
    doc.text("FINTECH SEO & CONTENT MARKETING", margin, 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("SEO STRATEGY BRIEF", pw - margin, 17, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 180, 254);
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    doc.text(`Generated ${today}`, pw - margin, 24, { align: "right" });

    y = 54;

    // ── Keyword heading ───────────────────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(r.keyword, margin, y);
    y += 9;

    // ── Badges row ────────────────────────────────────────────────────────────
    const scoreRgb: [number, number, number] =
      r.score >= 70 ? [220, 38, 38] : r.score >= 40 ? [234, 88, 12] : [22, 163, 74];
    doc.setFillColor(...scoreRgb);
    doc.roundedRect(margin, y, 42, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Difficulty: ${r.score}/100`, margin + 21, y + 5.4, { align: "center" });

    const quadrantInfo = getQuadrantInfo(r.score, r.intent);
    const qColorMap: Record<string, [number, number, number]> = {
      "Quick Win":        [22, 163, 74],
      "Long-term Target": [234, 88, 12],
      "Filler Content":   [100, 116, 139],
      "Supporting Asset": [109, 40, 217],
    };
    const qRgb: [number, number, number] = qColorMap[quadrantInfo.label] ?? [100, 116, 139];
    doc.setFillColor(...qRgb);
    doc.roundedRect(margin + 46, y, 50, 8, 2, 2, "F");
    doc.text(quadrantInfo.label, margin + 71, y + 5.4, { align: "center" });

    doc.setFillColor(51, 65, 85);
    doc.roundedRect(margin + 100, y, 38, 8, 2, 2, "F");
    doc.text(r.intent, margin + 119, y + 5.4, { align: "center" });

    y += 12;

    // ── Ranking Timeline ──────────────────────────────────────────────────────
    const timelineText =
      r.score < 30
        ? "⏱  Estimated 2–4 weeks to Page 1 with optimized content."
        : r.score <= 60
          ? "⏱  Estimated 3–6 months of consistent authority building."
          : "⏱  High-competition term. Estimated 6+ months; requires aggressive backlink strategy.";
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(timelineText, margin + 4, y + 5.2);
    y += 13;

    // ── Topical Cluster ───────────────────────────────────────────────────────
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("TOPICAL CLUSTER", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(r.cluster, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Est. Volume: ${r.volumeRange}`, margin, y);
    y += 10;

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    // ── Long-tail variations ──────────────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("6 Long-Tail Variations", margin, y);
    y += 6;

    r.longTails.forEach((lt, i) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(109, 40, 217);
      doc.text(`${i + 1}.`, margin + 3, y + 5.2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(lt, margin + 9, y + 5.2);
      y += 10;
    });

    y += 4;

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    // ── Strategy Tips ─────────────────────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Strategy Tips", margin, y);
    y += 6;

    r.tips.forEach((tip) => {
      const lines = doc.splitTextToSize(`• ${tip}`, contentW);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(lines, margin, y);
      y += (lines as string[]).length * 5 + 2;
    });

    // ── Content Gap ───────────────────────────────────────────────────────────
    const contentGapText =
      r.intent === "Commercial" || r.intent === "Transactional"
        ? "Top results lack transparent pricing comparisons—add a comparison table to stand out."
        : "Current guides are text-heavy—rank faster by including a technical architecture diagram or API flow-chart.";
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("The Content Gap", margin, y);
    y += 6;
    doc.setFillColor(255, 251, 235);
    const gapLines = doc.splitTextToSize(`💡  ${contentGapText}`, contentW - 8) as string[];
    const gapH = gapLines.length * 5 + 6;
    doc.roundedRect(margin, y, contentW, gapH, 1.5, 1.5, "F");
    doc.setDrawColor(253, 230, 138);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentW, gapH, 1.5, 1.5, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 53, 15);
    doc.text(gapLines, margin + 4, y + 5);
    y += gapH + 4;

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = ph - 12;
    if (y > footerY - 22) y = footerY - 22;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, footerY - 7, pw, 20, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(0, footerY - 7, pw, footerY - 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Strategy prepared by FintechPressHub — Experts in High-Authority Search Growth",
      pw / 2,
      footerY - 1,
      { align: "center" },
    );

    const contactUrl = "https://fintechpresshub.com/contact";
    doc.setTextColor(109, 40, 217);
    doc.textWithLink(contactUrl, pw / 2, footerY + 4, {
      align: "center",
      url: contactUrl,
    });

    doc.save(
      `${r.keyword.replace(/\s+/g, "-").toLowerCase()}-seo-strategy-brief.pdf`,
    );
    setEmailSent(false);
    setEmailInput("");
    setShowEmailModal(true);
  };

  const downloadCampaignPdf = (clientName: string, selectedKws: Set<string>) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pw - margin * 2;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const entries = history.filter((h) => selectedKws.has(h.keyword));

    const addKwHeader = (kw: string, num: number, total: number) => {
      doc.setFillColor(109, 40, 217);
      doc.rect(0, 0, pw, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`${clientName} — Fintech Content Growth Campaign`, margin, 9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(216, 180, 254);
      doc.text(`Keyword ${num} of ${total}  ·  ${kw.length > 40 ? kw.slice(0, 38) + "…" : kw}`, pw - margin, 9, { align: "right" });
    };

    // ── COVER PAGE ─────────────────────────────────────────────────────────
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, pw, 74, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(216, 180, 254);
    doc.text("FINTECHPRESSHUB", margin, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("FINTECH SEO & CONTENT MARKETING", margin, 27);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(clientName, contentW - 10) as string[];
    let tY = 46;
    titleLines.forEach((line) => { doc.text(line, margin, tY); tY += 9; });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(196, 181, 253);
    doc.text("Fintech Content Growth Campaign", margin, tY + 2);

    let y = 88;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    const meta: [string, string][] = [
      ["Report generated", today],
      ["Keywords in campaign", `${entries.length}`],
      ["Prepared by", "FintechPressHub — Fintech SEO & Content Marketing"],
    ];
    meta.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(value, margin + 46, y);
      y += 7;
    });

    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Campaign Keywords at a Glance", margin, y);
    y += 8;

    const colX = [margin, margin + 74, margin + 97, margin + 132];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    ["KEYWORD", "SCORE", "INTENT", "QUADRANT"].forEach((h, i) => doc.text(h, colX[i], y));
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pw - margin, y);
    y += 5;

    entries.forEach((h, i) => {
      if (y > ph - 24) { doc.addPage(); y = 24; }
      const qInfo = getQuadrantInfo(h.score, h.intent);
      const sRgb: [number, number, number] = h.score >= 70 ? [220, 38, 38] : h.score >= 40 ? [234, 88, 12] : [22, 163, 74];
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 2.5, contentW, 7.5, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(30, 41, 59);
      doc.text(h.keyword.length > 36 ? h.keyword.slice(0, 34) + "…" : h.keyword, colX[0], y + 2.5);
      doc.setFillColor(...sRgb);
      doc.roundedRect(colX[1], y - 1, 16, 6, 1, 1, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text(`${h.score}`, colX[1] + 8, y + 2.8, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text(h.intent, colX[2], y + 2.5);
      doc.text(qInfo.label, colX[3], y + 2.5);
      y += 7.5;
    });

    // ── PER-KEYWORD PAGES ──────────────────────────────────────────────────
    entries.forEach((h, idx) => {
      doc.addPage();
      addKwHeader(h.keyword, idx + 1, entries.length);
      y = 22;

      const sRgb: [number, number, number] = h.score >= 70 ? [220, 38, 38] : h.score >= 40 ? [234, 88, 12] : [22, 163, 74];
      const qInfo = getQuadrantInfo(h.score, h.intent);
      const qColorMap: Record<string, [number, number, number]> = {
        "Quick Win": [22, 163, 74], "Long-term Target": [234, 88, 12],
        "Filler Content": [100, 116, 139], "Supporting Asset": [109, 40, 217],
      };
      const qRgb = qColorMap[qInfo.label] ?? [100, 116, 139];

      // Keyword title
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
      const kwLines = doc.splitTextToSize(h.keyword, contentW) as string[];
      kwLines.forEach((line) => { doc.text(line, margin, y); y += 7; });
      y += 1;

      // Badges
      doc.setFillColor(...sRgb);
      doc.roundedRect(margin, y, 46, 7.5, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text(`${h.score}/100 — ${h.label}`, margin + 23, y + 5.2, { align: "center" });
      doc.setFillColor(...qRgb);
      doc.roundedRect(margin + 49, y, 50, 7.5, 1.5, 1.5, "F");
      doc.text(qInfo.label, margin + 74, y + 5.2, { align: "center" });
      doc.setFillColor(51, 65, 85);
      doc.roundedRect(margin + 102, y, 32, 7.5, 1.5, 1.5, "F");
      doc.text(h.intent, margin + 118, y + 5.2, { align: "center" });
      y += 13;

      // ── Opportunity Assessment ──
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text("OPPORTUNITY ASSESSMENT", margin, y);
      y += 5;

      const gW = 86; const gH = 34; const cW = gW / 2; const cH = gH / 2;
      const gx = margin; const gy = y;
      const cells: { x: number; y: number; fill: [number,number,number]; label: string; rgb: [number,number,number] }[] = [
        { x: gx,    y: gy,    fill: [236,253,245], label: "Quick Win",        rgb: [22,163,74]   },
        { x: gx+cW, y: gy,    fill: [255,251,235], label: "Long-term Target", rgb: [234,88,12]   },
        { x: gx,    y: gy+cH, fill: [248,250,252], label: "Filler Content",   rgb: [100,116,139] },
        { x: gx+cW, y: gy+cH, fill: [239,246,255], label: "Supporting Asset", rgb: [59,130,246]  },
      ];
      cells.forEach((c) => {
        doc.setFillColor(...c.fill); doc.rect(c.x, c.y, cW, cH, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...c.rgb);
        const lb = doc.splitTextToSize(c.label, cW - 3) as string[];
        lb.forEach((l, li) => doc.text(l, c.x + 2, c.y + 5 + li * 3.5));
      });
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25);
      doc.rect(gx, gy, gW, gH, "S");
      doc.line(gx + cW, gy, gx + cW, gy + gH);
      doc.line(gx, gy + cH, gx + gW, gy + cH);

      // dot
      const dotX = gx + (h.score / 100) * gW;
      const dotY = gy + (1 - intentValue(h.intent)) * gH;
      doc.setFillColor(...qRgb); doc.circle(dotX, dotY, 2.2, "F");
      doc.setFillColor(255, 255, 255); doc.circle(dotX, dotY, 0.9, "F");

      doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(148, 163, 184);
      doc.text("← Low Difficulty", gx + 1, gy + gH + 4);
      doc.text("High Difficulty →", gx + gW - 1, gy + gH + 4, { align: "right" });

      // right-side info
      const rx = gx + gW + 6;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...qRgb);
      doc.text(qInfo.label, rx, gy + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      const subLines = doc.splitTextToSize(qInfo.sublabel, contentW - gW - 8) as string[];
      subLines.forEach((l, i) => doc.text(l, rx, gy + 13 + i * 4));
      doc.text(`Volume: ${h.volumeRange}`, rx, gy + 25);
      doc.text(`Cluster: ${h.cluster}`, rx, gy + 30);

      y = gy + gH + 10;
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
      doc.line(margin, y, pw - margin, y);
      y += 7;

      // ── 3-Month Content Roadmap ──
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text("3-MONTH CONTENT ROADMAP", margin, y);
      y += 6;

      const roadmap = buildRoadmapMonths(h);
      const monthColors: [number,number,number][] = [[124,58,237],[8,145,178],[5,150,105]];

      roadmap.forEach((month, mi) => {
        if (y > ph - 36) { doc.addPage(); addKwHeader(h.keyword, idx + 1, entries.length); y = 22; }
        doc.setFillColor(...monthColors[mi]);
        doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text(`Month ${month.num}: ${month.title}  ·  ${month.sub}`, margin + 4, y + 5.4);
        y += 11;

        month.tasks.forEach((task) => {
          if (y > ph - 20) { doc.addPage(); addKwHeader(h.keyword, idx + 1, entries.length); y = 22; }
          doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
          doc.rect(margin + 1, y - 2.5, 3.5, 3.5, "S");
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(51, 65, 85);
          const taskLines = doc.splitTextToSize(task.label, contentW - 8) as string[];
          taskLines.forEach((line, li) => doc.text(line, margin + 7, y + li * 3.8));
          y += taskLines.length * 3.8 + 2.5;
        });
        y += 4;
      });
    });

    // ── CTA / BACK PAGE ───────────────────────────────────────────────────
    doc.addPage();
    doc.setFillColor(109, 40, 217); doc.rect(0, 0, pw, 72, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    const ctaHead = doc.splitTextToSize("Ready to execute this campaign?", contentW) as string[];
    let ctaY = 34;
    ctaHead.forEach((l) => { doc.text(l, margin, ctaY); ctaY += 8; });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(196, 181, 253);
    const ctaBody = doc.splitTextToSize(
      "FintechPressHub delivers high-authority fintech content that ranks. Book a strategy call to start your campaign.",
      contentW,
    ) as string[];
    ctaBody.forEach((l) => { doc.text(l, margin, ctaY); ctaY += 5; });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, ctaY + 2, 72, 9, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(109, 40, 217);
    doc.text("fintechpresshub.com/contact", margin + 36, ctaY + 7.2, { align: "center" });

    y = 86;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(`Report prepared for: ${clientName}  ·  ${today}`, margin, y);
    doc.text("Generated by FintechPressHub Keyword Difficulty Estimator", margin, y + 5);
    doc.text("All difficulty estimates are heuristic — based on keyword structure and competitive signals.", margin, y + 10);

    const fileName = `${clientName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-fintech-content-growth-campaign.pdf`;
    doc.save(fileName);
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
                                    {cannibalizationSet.has(h.keyword) && (
                                      <span
                                        title="Caution: These terms have high semantic overlap. Consider targeting them within a single high-authority pillar page rather than separate articles."
                                        className="shrink-0 flex items-center"
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                      </span>
                                    )}
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
                                <button
                                  type="button"
                                  onClick={() => setBriefEntry((prev) => prev?.keyword === h.keyword ? null : h)}
                                  className={`mt-1.5 w-full inline-flex items-center justify-center gap-1 text-[10px] font-semibold rounded-md px-2 py-1 border transition-all ${
                                    briefEntry?.keyword === h.keyword
                                      ? "bg-violet-600 text-white border-violet-600"
                                      : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                                  }`}
                                >
                                  <BookOpen className="w-2.5 h-2.5" />
                                  {briefEntry?.keyword === h.keyword ? "Close brief" : "Brief"}
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
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportCSV}
                      className="text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export CSV
                    </Button>
                  )}
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
                          {cannibalizationSet.has(h.keyword) && (
                            <span
                              title="Caution: These terms have high semantic overlap. Consider targeting them within a single high-authority pillar page rather than separate articles."
                              className="shrink-0 flex items-center"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
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

          {/* ── Keyword Cluster Map ── */}
          <AnimatePresence>
            {history.length >= 1 && (
              <motion.div
                key="cluster-map"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4"
              >
                <KeywordClusterMap
                  history={history}
                  result={result}
                  onSelect={(entry) => { setResult(entry); setKeyword(entry.keyword); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Content Gap Score ── */}
          <AnimatePresence>
            {history.length >= 1 && (
              <motion.div
                key="content-gap-score"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4"
              >
                <ContentGapScore
                  history={history}
                  onSuggest={(kw) => { scrollToResultsRef.current = true; analyseKw(kw); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Keyword Brief Panel ── */}
          <AnimatePresence>
            {briefEntry && (
              <KeywordBriefPanel
                key={briefEntry.keyword}
                entry={briefEntry}
                onClose={() => setBriefEntry(null)}
              />
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
                  cannibalization={cannibalizationSet.has(kwA) && cannibalizationSet.has(kwB)}
                />
              );
            })()}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                ref={resultsRef}
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

                      {/* What's driving this score? */}
                      {(() => {
                        const drivers = computeScoreDrivers(result);
                        const rows: { label: string; key: keyof ScoreDrivers; desc: string }[] = [
                          { key: "domainAuthority",  label: "Domain Authority of Top 10",  desc: "Average DA of the pages currently ranking in the top 10 results." },
                          { key: "contentQuality",   label: "Content Quality Benchmark",   desc: "Depth and comprehensiveness expected to compete for this keyword." },
                          { key: "backlinkStrength", label: "Backlink Profile Strength",   desc: "Volume and quality of backlinks pointing to top-ranking pages." },
                        ];
                        return (
                          <div className="mt-4 border-t border-current/10 pt-3">
                            <button
                              type="button"
                              onClick={() => setScoreDriversOpen((o) => !o)}
                              className="w-full flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              <span>What's driving this score?</span>
                              {scoreDriversOpen
                                ? <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                              }
                            </button>
                            <AnimatePresence initial={false}>
                              {scoreDriversOpen && (
                                <motion.div
                                  key="drivers"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 space-y-3 text-left">
                                    {rows.map(({ key, label, desc }) => {
                                      const d = drivers[key];
                                      const { bar, badge } = DRIVER_LEVEL_COLOR[d.label];
                                      return (
                                        <div key={key}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-slate-600 leading-tight">
                                              {label}
                                            </span>
                                            <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${badge}`}>
                                              {d.label}
                                            </span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                              className={`h-full rounded-full ${bar}`}
                                              initial={{ width: 0 }}
                                              animate={{ width: `${d.value}%` }}
                                              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
                                            />
                                          </div>
                                          <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">
                                            {desc}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })()}
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

                {/* Content Roadmap */}
                <ContentRoadmap key={result.keyword} result={result} />

                {/* Cluster Content Ideas — glassmorphism */}
                <div
                  className="relative rounded-xl border border-violet-100/70 shadow-lg overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(237,233,254,0.65) 0%, rgba(255,255,255,0.80) 50%, rgba(207,250,254,0.55) 100%)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                  }}
                >
                  {/* decorative orb */}
                  <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-300/20 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-cyan-300/20 blur-2xl" />

                  <div className="relative p-5">
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
                          className="flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg border border-white/60 bg-white/50 hover:bg-white/80 hover:border-violet-200 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm text-slate-700 leading-snug truncate">
                              {idea}
                            </span>
                          </div>
                          <AnimatePresence mode="wait" initial={false}>
                            {copiedCluster === i ? (
                              <motion.span
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                className="shrink-0"
                              >
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      ))}
                    </div>
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
                          <span className="shrink-0 w-4 h-4 relative flex items-center justify-center">
                            <AnimatePresence mode="wait" initial={false}>
                              {copied === i ? (
                                <motion.span
                                  key="check"
                                  initial={{ scale: 0, opacity: 0, rotate: -15 }}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 520, damping: 22 }}
                                  className="absolute inset-0 flex items-center justify-center"
                                >
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="copy"
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SERP Snapshot */}
                <SerpSnapshotCard result={result} />

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

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">The Content Gap</p>
                      <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[12px] text-amber-900 leading-relaxed">
                          {result.intent === "Commercial" || result.intent === "Transactional"
                            ? "Top results lack transparent pricing comparisons—add a table to stand out."
                            : "Current guides are text-heavy—rank faster by including a technical architecture diagram or API flow-chart."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Download buttons */}
                <div className="flex flex-col items-center gap-2.5 pt-1 pb-2">
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => downloadSeoBrief(result)}
                      className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-700 hover:bg-violet-800 active:bg-violet-900 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      Download SEO Strategy Brief
                      <span className="text-violet-300 text-xs font-normal">.pdf</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyMarkdown(result)}
                      className={`group inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold shadow-sm transition-all duration-200 ${
                        copiedMarkdown
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:shadow-md"
                      }`}
                    >
                      {copiedMarkdown
                        ? <><Check className="w-4 h-4" /> Copied!</>
                        : <><Copy className="w-4 h-4" /> Copy as Markdown</>}
                    </button>
                  </div>
                  {(history.length >= 2) && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {history.length >= 3 && (
                        <button
                          type="button"
                          onClick={downloadSessionReport}
                          className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-semibold transition-all duration-200 hover:shadow-md"
                        >
                          <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
                          Full Session Report
                          <span className="text-violet-400 text-xs font-normal">({history.length} kw) .pdf</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCampaignModal(true)}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                        Full Campaign Export
                        <span className="text-violet-300 text-xs font-normal">.pdf</span>
                      </button>
                    </div>
                  )}
                </div>

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

      {/* Email capture modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            key="email-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false); }}
          >
            <motion.div
              key="email-modal-panel"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Violet header strip */}
              <div className="bg-violet-700 px-6 pt-6 pb-5 text-white">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="absolute top-4 right-4 text-violet-300 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5 mb-1">
                  <Mail className="w-5 h-5 text-violet-300 shrink-0" />
                  <h2 className="text-base font-bold">Want this brief in your inbox?</h2>
                </div>
                <p className="text-sm text-violet-200 leading-relaxed">
                  Your PDF has been downloaded. Enter your email and we'll send you a copy plus fintech SEO tips from our editorial team.
                </p>
              </div>

              <div className="px-6 py-5">
                {emailSent ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">You're on the list!</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Check your inbox for your SEO Strategy Brief and our fintech content tips.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="mt-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const email = emailInput.trim();
                      if (!email) return;
                      try {
                        await fetch("/api/newsletter/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, source: "seo-brief", keyword: result?.keyword ?? keyword }),
                        });
                      } catch {
                        // fail silently — still show success to user
                      }
                      setEmailSent(true);
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        Work email address
                      </Label>
                      <Input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="h-10 text-sm"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send me the brief
                    </button>
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      No spam. Unsubscribe any time. By submitting you agree to our{" "}
                      <Link href="/privacy" className="underline hover:text-slate-600">
                        privacy policy
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCampaignModal && (
          <CampaignExportModal
            history={history}
            onClose={() => setShowCampaignModal(false)}
            onGenerate={(clientName, selected) => downloadCampaignPdf(clientName, selected)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
