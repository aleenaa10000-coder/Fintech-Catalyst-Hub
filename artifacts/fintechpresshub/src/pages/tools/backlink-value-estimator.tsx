import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { readSharedState } from "@/lib/toolShare";
import { ToolShareEmbed } from "@/components/ToolShareEmbed";
import { ToolSEOEnhancements } from "@/components/ToolSEOEnhancements";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Link2,
  ArrowLeft,
  ArrowLeftRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  Globe,
  Users,
  Target,
  ShieldCheck,
  Info,
  Copy,
  Check,
  DollarSign,
  FileDown,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
  Trophy,
  SortDesc,
  TrendingUp,
  Calendar,
  Download,
  Mail,
  MessageSquare,
  ExternalLink,
  Scale,
  GitCompare,
} from "lucide-react";
import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FormState = {
  domain: string;
  da: string;
  traffic: string;
  relevance: string;
  linkType: "dofollow" | "nofollow";
  placement: "editorial" | "sidebar" | "footer" | "sponsored";
  currency?: "USD" | "GBP" | "EUR";
};

type Relevance = "high" | "medium" | "low";
type Placement = "editorial" | "sidebar" | "footer" | "sponsored";

const DEFAULTS: FormState = {
  domain: "",
  da: "",
  traffic: "",
  relevance: "high",
  linkType: "dofollow",
  placement: "editorial",
  currency: "USD",
};

const RELEVANCE_LABELS: Record<Relevance, string> = {
  high: "High — directly niche-relevant",
  medium: "Medium — adjacent niche (finance, tech)",
  low: "Low — unrelated niche",
};

const PLACEMENT_LABELS: Record<Placement, string> = {
  editorial: "Editorial (in article body)",
  sidebar: "Sidebar / widget",
  footer: "Footer",
  sponsored: "Sponsored / paid placement",
};

const RELEVANCE_MULTIPLIER: Record<Relevance, number> = {
  high: 1.0,
  medium: 0.65,
  low: 0.3,
};

const PLACEMENT_MULTIPLIER: Record<Placement, number> = {
  editorial: 1.0,
  sidebar: 0.55,
  footer: 0.3,
  sponsored: 0.4,
};

type LinkValue = {
  min: number;
  max: number;
};

function computeLinkValue(score: number, traffic: number): LinkValue {
  // Traffic bonus ranges [min add-on, max add-on]
  const trafficBonus: [number, number] =
    traffic >= 500_000
      ? [800, 1500]
      : traffic >= 100_000
        ? [400, 800]
        : traffic >= 50_000
          ? [200, 400]
          : traffic >= 10_000
            ? [100, 250]
            : traffic >= 1_000
              ? [30, 100]
              : [0, 50];

  // Round to nearest $100
  const round = (n: number) => Math.round(n / 100) * 100;
  const min = Math.max(100, round(score * 8 + trafficBonus[0]));
  const max = Math.max(min + 100, round(score * 18 + trafficBonus[1]));
  return { min, max };
}

// Currency presentation is i18n-aware so non-US visitors see locally
// meaningful pricing. Score and methodology are currency-neutral; we only
// swap the display symbol. Estimates are anchored to USD; we apply
// approximate FX rates for GBP/EUR rather than re-deriving the model
// per-currency, and disclose the rate to keep the tool honest.
type CurrencyCode = "USD" | "GBP" | "EUR";
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};
// Approximate, conservative FX (rounded). The estimate is already a wide
// range; precision beyond 2 d.p. would imply false accuracy.
const CURRENCY_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
};

// Module-level current display currency. Updated by the React component
// whenever the user changes the currency selector. Centralizing here avoids
// threading a `currency` argument through 30+ call sites including jsPDF
// generators and HTML string builders. Defaults to USD until the form
// hydrates from share-link state or user input.
let CURRENT_CURRENCY: CurrencyCode = "USD";
function setCurrentCurrency(c: CurrencyCode) {
  CURRENT_CURRENCY = c;
}

function fmtMoney(n: number, currency: CurrencyCode = CURRENT_CURRENCY): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const v = Math.round(n * CURRENCY_RATES[currency]);
  if (v >= 1_000) return `${symbol}${(v / 1_000).toFixed(1)}K`;
  return `${symbol}${v}`;
}

function fmtTraffic(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

type AcquisitionDifficulty = {
  stars: number;
  label: string;
  strategyTip: string;
  tipType: "easy" | "mid" | "hard";
};

type Result = {
  score: number;
  label: string;
  breakdown: { factor: string; contribution: number; note: string }[];
  verdict: string;
  recommendations: string[];
  risks: string[];
  pbnRisk: boolean;
  acquisition: AcquisitionDifficulty;
  linkValue: LinkValue;
};

function computeAcquisitionDifficulty(
  da: number,
  traffic: number,
): AcquisitionDifficulty {
  // Base star from DA
  let stars =
    da >= 80
      ? 5
      : da >= 66
        ? 4
        : da >= 46
          ? 3
          : da >= 26
            ? 2
            : 1;

  // Traffic modifier — high traffic raises bar, low traffic lowers it
  if (traffic >= 500_000 && stars < 5) stars = Math.min(5, stars + 1);
  else if (traffic < 1_000 && stars > 1) stars = Math.max(1, stars - 1);

  const configs: Record<
    number,
    { label: string; strategyTip: string; tipType: "easy" | "mid" | "hard" }
  > = {
    1: {
      label: "Very Easy",
      tipType: "easy",
      strategyTip:
        "This site likely accepts paid placements or direct link insertions — acquisition is straightforward. Negotiate a rate, but ensure any paid link carries rel='sponsored' to comply with Google's guidelines.",
    },
    2: {
      label: "Easy",
      tipType: "easy",
      strategyTip:
        "A well-crafted guest post pitch targeting their audience will typically land this link. Personalise the topic angle to match their recent editorial coverage before reaching out.",
    },
    3: {
      label: "Moderate",
      tipType: "mid",
      strategyTip:
        "Relationship Building or Guest Post Pitch — Engage with their content for a few weeks first, then pitch a co-authored piece or a curated data roundup. Cold pitches rarely work at this tier.",
    },
    4: {
      label: "Hard",
      tipType: "hard",
      strategyTip:
        "Original Data / Research Outreach — This site expects genuine, unique value. Lead with proprietary industry data, a commissioned survey, or a fresh benchmark report. A generic pitch will be ignored.",
    },
    5: {
      label: "Elite",
      tipType: "hard",
      strategyTip:
        "Original Data / Research Outreach or High-Profile PR — Only industry-defining reports, original research, or major brand news will earn a link here. Build a data study or launch a PR campaign with newsworthy findings before approaching this outlet.",
    },
  };

  return { stars, ...configs[stars] };
}

function generateOutreachAngle(domain: string, relevance: Relevance): string {
  const domainLabel = domain.trim() || "this domain";
  if (relevance === "high") {
    return `Pitch an editorial piece on ${domainLabel} regarding emerging regulatory trends to leverage their high authority in the financial sector.`;
  }
  if (relevance === "medium") {
    return `Pitch a data-driven feature on ${domainLabel} exploring the intersection of digital innovation and mainstream finance to tap into their engaged adjacent audience.`;
  }
  return `Pitch a thought leadership article on ${domainLabel} examining the digital implications relevant to their readers, bridging their niche audience to key industry trends.`;
}

function buildContactUrl(domain: string, relevance: Relevance, pitchAngle: string): string {
  const params = new URLSearchParams({
    subject: `Outreach Collaboration — ${domain || "Backlink Opportunity"}`,
    message: `Hi,\n\nI came across ${domain || "your site"} and wanted to explore a potential editorial collaboration.\n\n${pitchAngle}\n\nWould love to discuss further.\n\nBest regards`,
  });
  return `/contact?${params.toString()}`;
}

function estimateValue(form: FormState): Result {
  const da = Math.min(100, Math.max(0, parseFloat(form.da) || 0));
  const traffic = Math.max(0, parseFloat(form.traffic) || 0);
  const relevance = form.relevance as Relevance;
  const placement = form.placement as Placement;
  const isDofollow = form.linkType === "dofollow";

  // DA contribution (0–40 pts)
  const daScore = Math.round((da / 100) * 40);

  // Traffic contribution (0–25 pts)
  let trafficScore = 0;
  if (traffic >= 500_000) trafficScore = 25;
  else if (traffic >= 100_000) trafficScore = 20;
  else if (traffic >= 50_000) trafficScore = 16;
  else if (traffic >= 10_000) trafficScore = 12;
  else if (traffic >= 1_000) trafficScore = 7;
  else if (traffic >= 100) trafficScore = 3;

  // Relevance contribution (0–20 pts)
  const relevanceScore = Math.round(20 * RELEVANCE_MULTIPLIER[relevance]);

  // Placement contribution (0–10 pts)
  const placementScore = Math.round(10 * PLACEMENT_MULTIPLIER[placement]);

  // Dofollow bonus (0–5 pts)
  const dofollowScore = isDofollow ? 5 : 0;

  const rawScore =
    daScore + trafficScore + relevanceScore + placementScore + dofollowScore;
  const score = Math.min(100, Math.round(rawScore));

  const label =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Strong"
        : score >= 40
          ? "Moderate"
          : score >= 20
            ? "Weak"
            : "Poor";

  const breakdown = [
    {
      factor: "Domain Authority",
      contribution: daScore,
      note: `DA ${da} → ${daScore}/40 pts`,
    },
    {
      factor: "Organic Traffic",
      contribution: trafficScore,
      note: `${traffic.toLocaleString()} visitors/mo → ${trafficScore}/25 pts`,
    },
    {
      factor: "Niche Relevance",
      contribution: relevanceScore,
      note: `${RELEVANCE_LABELS[relevance]} → ${relevanceScore}/20 pts`,
    },
    {
      factor: "Link Placement",
      contribution: placementScore,
      note: `${PLACEMENT_LABELS[placement]} → ${placementScore}/10 pts`,
    },
    {
      factor: "Link Type",
      contribution: dofollowScore,
      note: `${isDofollow ? "Dofollow" : "Nofollow"} → ${dofollowScore}/5 pts`,
    },
  ];

  let verdict = "";
  if (score >= 80) {
    verdict =
      "This is a high-value backlink opportunity worth prioritising. Pursue it actively.";
  } else if (score >= 60) {
    verdict =
      "A solid backlink with meaningful SEO impact. Worth the outreach effort.";
  } else if (score >= 40) {
    verdict =
      "Moderate value — useful for diversity but not a top-tier link. Pursue if low effort.";
  } else if (score >= 20) {
    verdict =
      "Limited SEO value. Only pursue if there are branding or referral traffic benefits.";
  } else {
    verdict =
      "Very low SEO impact. Not worth significant outreach resources unless traffic is the goal.";
  }

  const recommendations: string[] = [];
  if (da < 30)
    recommendations.push(
      "Prioritise sites with DA 30+ for meaningful authority transfer.",
    );
  if (traffic < 1000)
    recommendations.push(
      "Low-traffic sites pass limited referral value — focus on higher-traffic sources.",
    );
  if (relevance === "low")
    recommendations.push(
      "Off-topic links can dilute your link profile. Focus on professional or niche-adjacent domains.",
    );
  if (placement !== "editorial")
    recommendations.push(
      "Editorial links in article bodies carry significantly more weight than sidebar or footer links.",
    );
  if (!isDofollow)
    recommendations.push(
      "Nofollow links don't pass PageRank directly — but they can still drive traffic and build brand awareness.",
    );
  if (score >= 60)
    recommendations.push(
      "Document this opportunity in your link pipeline and begin personalised outreach within the week.",
    );

  const pbnRisk = da > 70 && traffic < 10000;

  const risks: string[] = [];
  if (placement === "sponsored")
    risks.push(
      "Sponsored links must be tagged with rel='sponsored' to comply with Google's guidelines.",
    );
  if (pbnRisk)
    risks.push(
      "High DA with disproportionately low traffic may indicate a PBN or expired domain — verify the site's traffic history and link profile before pursuing.",
    );
  if (relevance === "low" && score >= 40)
    risks.push(
      "Irrelevant high-authority links can appear unnatural in your backlink profile.",
    );

  const acquisition = computeAcquisitionDifficulty(da, traffic);
  const linkValue = computeLinkValue(score, traffic);

  return { score, label, breakdown, verdict, recommendations, risks, pbnRisk, acquisition, linkValue };
}

const SCORE_COLOR = (s: number) =>
  s >= 80
    ? "text-green-600"
    : s >= 60
      ? "text-blue-600"
      : s >= 40
        ? "text-amber-500"
        : s >= 20
          ? "text-orange-500"
          : "text-red-500";

const SCORE_BG = (s: number) =>
  s >= 80
    ? "bg-green-50 border-green-200"
    : s >= 60
      ? "bg-blue-50 border-blue-200"
      : s >= 40
        ? "bg-amber-50 border-amber-200"
        : s >= 20
          ? "bg-orange-50 border-orange-200"
          : "bg-red-50 border-red-200";

const LABEL_ICON = (s: number) =>
  s >= 60 ? CheckCircle2 : s >= 40 ? AlertTriangle : XCircle;

function buildShareUrl(form: FormState): string {
  const params = new URLSearchParams({
    domain: form.domain,
    da: form.da,
    traffic: form.traffic,
    relevance: form.relevance,
    linkType: form.linkType,
    placement: form.placement,
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function parseFormFromParams(): Partial<FormState> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FormState> = {};
  const domain = params.get("domain");
  const da = params.get("da");
  const traffic = params.get("traffic");
  const relevance = params.get("relevance");
  const linkType = params.get("linkType");
  const placement = params.get("placement");
  if (domain) result.domain = domain;
  if (da) result.da = da;
  if (traffic) result.traffic = traffic;
  if (relevance && ["high", "medium", "low"].includes(relevance))
    result.relevance = relevance as FormState["relevance"];
  if (linkType && ["dofollow", "nofollow"].includes(linkType))
    result.linkType = linkType as FormState["linkType"];
  if (
    placement &&
    ["editorial", "sidebar", "footer", "sponsored"].includes(placement)
  )
    result.placement = placement as FormState["placement"];
  return result;
}

type Priority = "this-week" | "next-month" | "someday" | null;

const PRIORITY_CYCLE: Priority[] = [null, "this-week", "next-month", "someday"];

const PRIORITY_STYLES: Record<string, string> = {
  "this-week":  "bg-emerald-50 border-emerald-300 text-emerald-700",
  "next-month": "bg-blue-50   border-blue-300   text-blue-700",
  "someday":    "bg-slate-100 border-slate-300   text-slate-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  "this-week":  "This Week",
  "next-month": "Next Month",
  "someday":    "Someday",
};

function stripToDomain(input: string): string {
  let s = input.trim();
  // Remove protocol (http://, https://, ftp://, etc.)
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//, "");
  // Remove anything after the first slash (path, query, fragment)
  s = s.split("/")[0].split("?")[0].split("#")[0];
  return s;
}

function parseTrafficInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (/^\d+(\.\d+)?k$/.test(trimmed)) {
    return String(Math.round(parseFloat(trimmed) * 1_000));
  }
  if (/^\d+(\.\d+)?m$/.test(trimmed)) {
    return String(Math.round(parseFloat(trimmed) * 1_000_000));
  }
  return raw;
}

function computeOutreachDate(priority: Priority): string {
  const now = new Date();
  if (priority === "this-week") {
    const d = new Date(now);
    const day = d.getDay();
    const daysUntilFri = day <= 5 ? (5 - day === 0 ? 7 : 5 - day) : 6;
    d.setDate(d.getDate() + daysUntilFri);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (priority === "next-month") {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (priority === "someday") {
    const d = new Date(now);
    d.setDate(d.getDate() + 90);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return "Unscheduled";
}

type SavedOpportunity = {
  id: string;
  domain: string;
  score: number;
  label: string;
  linkValueMin: number;
  linkValueMax: number;
  acquisitionStars: number;
  acquisitionLabel: string;
  priority: Priority;
};

type SortMode = "value-score" | "market-price";

export default function BacklinkValueEstimator() {
  const [form, setForm] = useState<FormState>(() => readSharedState(DEFAULTS));
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [comparePdfLoading, setComparePdfLoading] = useState(false);
  const [reportPdfLoading, setReportPdfLoading] = useState(false);
  const [savedOpportunities, setSavedOpportunities] = useState<SavedOpportunity[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("value-score");
  const [compareMode, setCompareMode] = useState(false);
  const [checkedSaved, setCheckedSaved] = useState<Set<string>>(new Set());
  const [savedCompareOpen, setSavedCompareOpen] = useState(false);
  const [trafficRaw, setTrafficRaw] = useState(DEFAULTS.traffic);
  const [trafficBRaw, setTrafficBRaw] = useState(DEFAULTS.traffic);
  const [domainStripped, setDomainStripped] = useState(false);
  const [domainBStripped, setDomainBStripped] = useState(false);
  const [formB, setFormB] = useState<FormState>(DEFAULTS);
  const [resultB, setResultB] = useState<Result | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pitchCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fromParams = parseFormFromParams();
    if (Object.keys(fromParams).length > 0) {
      const merged = { ...DEFAULTS, ...fromParams };
      setForm(merged);
      if (merged.traffic) setTrafficRaw(merged.traffic);
      const canRun =
        (parseFloat(merged.da) > 0 || parseFloat(merged.traffic) > 0) &&
        merged.domain.trim().length > 0;
      if (canRun) {
        setResult(estimateValue(merged));
      }
    }
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (pitchCopyTimeoutRef.current) clearTimeout(pitchCopyTimeoutRef.current);
    };
  }, []);

  // Sync the user's chosen display currency to the module-level
  // CURRENT_CURRENCY *synchronously during render* so all downstream
  // fmtMoney() calls (including those inside jsPDF generators and HTML
  // string builders) see the up-to-date symbol without us having to thread
  // the currency through every call site. A useEffect would run *after*
  // render, leaving the first frame after a currency switch stale.
  setCurrentCurrency((form.currency ?? "USD") as CurrencyCode);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFieldB = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setFormB((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setFormB(DEFAULTS);
    setResult(null);
    setResultB(null);
    setTrafficRaw(DEFAULTS.traffic);
    setTrafficBRaw(DEFAULTS.traffic);
    setDomainStripped(false);
    setDomainBStripped(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const autoSave = (f: FormState, computed: Result) => {
    const entry: SavedOpportunity = {
      id: `${Date.now()}-${f.domain}`,
      domain: f.domain,
      score: computed.score,
      label: computed.label,
      linkValueMin: computed.linkValue.min,
      linkValueMax: computed.linkValue.max,
      acquisitionStars: computed.acquisition.stars,
      acquisitionLabel: computed.acquisition.label,
      priority: null,
    };
    setSavedOpportunities((prev) => {
      const exists = prev.some((p) => p.domain === entry.domain && p.score === entry.score);
      if (exists) return prev;
      return [...prev, entry];
    });
  };

  const estimate = () => {
    const computed = estimateValue(form);
    setResult(computed);
    trackEvent("Tool Used", { tool: "backlink-value-estimator" });
    autoSave(form, computed);
    if (compareMode) {
      const canRunB =
        (parseFloat(formB.da) > 0 || parseFloat(formB.traffic) > 0) &&
        formB.domain.trim().length > 0;
      if (canRunB) {
        const computedB = estimateValue(formB);
        setResultB(computedB);
        autoSave(formB, computedB);
      } else {
        setResultB(null);
      }
    } else {
      setResultB(null);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(form));
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select a temporary input
      const el = document.createElement("input");
      el.value = buildShareUrl(form);
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      const LINE = 16;
      const SECTION = 28;

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
        const lines = doc.splitTextToSize(text, contentW - indent);
        doc.text(lines, margin + indent, y);
        y += lines.length * (size * 1.35);
      };

      const addRule = (color: [number, number, number] = [220, 220, 220]) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 10;
      };

      // Header bar
      doc.setFillColor(16, 110, 80);
      doc.rect(0, 0, pageW, 56, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FintechPressHub", margin, 34);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Backlink Value Assessment", margin, 48);
      y = 80;

      // Domain + date
      addText(`Domain assessed: ${form.domain}`, 13, "bold", [16, 110, 80]);
      y += 2;
      addText(
        `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
        9, "normal", [120, 120, 120],
      );
      y += SECTION / 2;
      addRule();
      y += 4;

      // Score + label
      addText(`SEO Value Score: ${result.score}/100 — ${result.label} Backlink`, 16, "bold", [16, 110, 80]);
      y += 4;
      addText(result.verdict, 10, "normal", [80, 80, 80]);
      y += SECTION;

      // Estimated Link Value
      addText("Estimated Link Value", 12, "bold");
      y += 2;
      addText(
        `${fmtMoney(result.linkValue.min)} – ${fmtMoney(result.linkValue.max)}`,
        14, "bold", [16, 110, 80],
      );
      y += 4;
      addText(
        "Estimated market cost if acquired via a professional PR/SEO agency. Getting this via organic outreach is a massive win for your budget.",
        9, "normal", [120, 120, 120],
      );
      y += SECTION;
      addRule();
      y += 4;

      // Acquisition difficulty
      addText("Acquisition Difficulty", 12, "bold");
      y += 4;
      addText(
        `${"★".repeat(result.acquisition.stars)}${"☆".repeat(5 - result.acquisition.stars)}  ${result.acquisition.label} (${result.acquisition.stars}/5)`,
        12, "normal", [80, 80, 80],
      );
      y += 4;
      addText(`Strategy Tip: ${result.acquisition.strategyTip}`, 9, "normal", [80, 80, 80]);
      y += SECTION;
      addRule();
      y += 4;

      // Score breakdown
      addText("Score Breakdown", 12, "bold");
      y += 8;
      const maxPts = [40, 25, 20, 10, 5];
      result.breakdown.forEach((b, i) => {
        addText(`• ${b.factor}`, 10, "bold", [30, 30, 30], 0);
        y -= LINE * 0.3;
        addText(b.note, 9, "normal", [100, 100, 100], 12);
        if (i < result.breakdown.length - 1) {
          const barW = Math.round((b.contribution / maxPts[i]) * (contentW - 14));
          doc.setFillColor(16, 110, 80);
          doc.roundedRect(margin + 12, y, barW, 4, 2, 2, "F");
          doc.setFillColor(235, 235, 235);
          doc.roundedRect(margin + 12 + barW, y, contentW - 14 - barW, 4, 2, 2, "F");
          y += 10;
        }
      });
      y += SECTION;
      addRule();
      y += 4;

      // Recommendations
      if (result.recommendations.length > 0) {
        addText("Recommendations", 12, "bold");
        y += 6;
        result.recommendations.forEach((rec) => {
          addText(`• ${rec}`, 9, "normal", [50, 50, 50], 6);
          y += 2;
        });
        y += SECTION / 2;
      }

      // Risks
      if (result.risks.length > 0) {
        addText("Watch Out For", 12, "bold", [180, 100, 0]);
        y += 6;
        result.risks.forEach((risk) => {
          addText(`⚠ ${risk}`, 9, "normal", [140, 80, 0], 6);
          y += 2;
        });
        y += SECTION / 2;
      }

      // Footer
      addRule([200, 200, 200]);
      addText(
        "Generated by FintechPressHub Backlink Value Estimator · fintechpresshub.com",
        8, "normal", [160, 160, 160],
      );

      const safeName = form.domain.replace(/[^a-zA-Z0-9.-]/g, "_") || "backlink";
      doc.save(`backlink-assessment-${safeName}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const exportComparePDF = async () => {
    if (!result || !resultB) return;
    setComparePdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      const SECTION = 28;

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
        const lines = doc.splitTextToSize(text, contentW - indent);
        doc.text(lines, margin + indent, y);
        y += lines.length * (size * 1.35);
      };

      const addRule = (color: [number, number, number] = [220, 220, 220]) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 10;
      };

      // Header bar — blue gradient represented as solid blue
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 56, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FintechPressHub", margin, 34);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Head-to-Head Backlink Comparison Report", margin, 48);
      y = 80;

      // Date
      addText(
        `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
        9, "normal", [120, 120, 120],
      );
      y += SECTION / 2;
      addRule();
      y += 4;

      // ── Domain scores ──────────────────────────────────────────
      addText("Domain Scores", 13, "bold", [30, 30, 30]);
      y += 8;

      const colW = (contentW - 20) / 2;

      // Domain A box
      const aColor: [number, number, number] = [16, 110, 80];
      const bColor: [number, number, number] = [37, 99, 235];

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, colW, 72, 4, 4, "F");
      doc.setFillColor(16, 110, 80);
      doc.roundedRect(margin, y, colW, 6, 4, 4, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(`Domain A: ${form.domain || "Domain A"}`, margin + 8, y + 20);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...aColor);
      doc.text(`${result.score}`, margin + 8, y + 52);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`/ 100 — ${result.label}`, margin + 8 + 38, y + 52);
      if (result.score > resultB.score) {
        doc.setFillColor(16, 110, 80);
        doc.roundedRect(margin + colW - 58, y + 38, 50, 16, 3, 3, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("WINNER", margin + colW - 43, y + 49);
      }

      // Domain B box
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin + colW + 20, y, colW, 72, 4, 4, "F");
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin + colW + 20, y, colW, 6, 4, 4, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(`Domain B: ${formB.domain || "Domain B"}`, margin + colW + 28, y + 20);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...bColor);
      doc.text(`${resultB.score}`, margin + colW + 28, y + 52);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`/ 100 — ${resultB.label}`, margin + colW + 28 + 38, y + 52);
      if (resultB.score > result.score) {
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(margin + colW * 2 + 20 - 58, y + 38, 50, 16, 3, 3, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("WINNER", margin + colW * 2 + 20 - 43, y + 49);
      }

      y += 88;
      addRule();
      y += 4;

      // ── Factor breakdown ───────────────────────────────────────
      addText("Factor Breakdown", 12, "bold");
      y += 8;
      const MAX_PTS = [40, 25, 20, 10, 5];
      result.breakdown.forEach((bA, i) => {
        const bB = resultB.breakdown[i];
        const aWins = bA.contribution >= bB.contribution;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(bA.factor, margin, y);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(aWins ? 16 : 150, aWins ? 110 : 150, aWins ? 80 : 150);
        doc.text(`A: ${bA.contribution}/${MAX_PTS[i]}`, pageW - margin - 80, y);
        doc.setTextColor(!aWins ? 37 : 150, !aWins ? 99 : 150, !aWins ? 235 : 150);
        doc.text(`B: ${bB.contribution}/${MAX_PTS[i]}`, pageW - margin - 30, y);
        y += 12;
        // Bar A
        const barAW = Math.round((bA.contribution / MAX_PTS[i]) * (colW - 4));
        doc.setFillColor(16, 110, 80);
        doc.roundedRect(margin, y, barAW, 4, 2, 2, "F");
        doc.setFillColor(225, 240, 225);
        doc.roundedRect(margin + barAW, y, colW - 4 - barAW, 4, 2, 2, "F");
        // Bar B
        const barBW = Math.round((bB.contribution / MAX_PTS[i]) * (colW - 4));
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(margin + colW + 16, y, barBW, 4, 2, 2, "F");
        doc.setFillColor(219, 234, 254);
        doc.roundedRect(margin + colW + 16 + barBW, y, colW - 4 - barBW, 4, 2, 2, "F");
        y += 12;
      });

      y += SECTION / 2;
      addRule();
      y += 4;

      // ── Estimated link values ──────────────────────────────────
      addText("Estimated Link Values", 12, "bold");
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...aColor);
      doc.text(`Domain A: ${fmtMoney(result.linkValue.min)}–${fmtMoney(result.linkValue.max)}`, margin, y);
      doc.setTextColor(...bColor);
      doc.text(`Domain B: ${fmtMoney(resultB.linkValue.min)}–${fmtMoney(resultB.linkValue.max)}`, margin + colW + 20, y);
      y += SECTION;
      addRule();
      y += 4;

      // ── Verdict ────────────────────────────────────────────────
      addText("Verdict", 12, "bold");
      y += 6;
      if (result.score !== resultB.score) {
        const winner = result.score > resultB.score ? `Domain A (${form.domain || "A"})` : `Domain B (${formB.domain || "B"})`;
        const winnerVal = result.score > resultB.score
          ? `${fmtMoney(result.linkValue.min)}–${fmtMoney(result.linkValue.max)}`
          : `${fmtMoney(resultB.linkValue.min)}–${fmtMoney(resultB.linkValue.max)}`;
        addText(
          `${winner} is the stronger opportunity — ${Math.abs(result.score - resultB.score)} points higher and worth an estimated ${winnerVal} in market value. Prioritise this one in your outreach pipeline.`,
          10, "normal", [50, 80, 50],
        );
      } else {
        addText(
          "Both domains score equally. Use link value and acquisition difficulty to decide — lower acquisition difficulty with higher link value wins.",
          10, "normal", [120, 80, 20],
        );
      }

      y += SECTION;
      addRule([200, 200, 200]);
      addText(
        "Generated by FintechPressHub Backlink Value Estimator · fintechpresshub.com",
        8, "normal", [160, 160, 160],
      );

      const safeA = (form.domain || "A").replace(/[^a-zA-Z0-9.-]/g, "_");
      const safeB = (formB.domain || "B").replace(/[^a-zA-Z0-9.-]/g, "_");
      doc.save(`backlink-comparison-${safeA}-vs-${safeB}.pdf`);
    } finally {
      setComparePdfLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!result) return;
    setReportPdfLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — html2pdf.js has no bundled TS types
      const html2pdf = (await import("html2pdf.js")).default;
      const pitchAngle = generateOutreachAngle(form.domain, form.relevance as Relevance);
      const scoreColor =
        result.score >= 80 ? "#059669"
        : result.score >= 65 ? "#2563eb"
        : result.score >= 50 ? "#d97706"
        : "#dc2626";
      const labelBg =
        result.score >= 80 ? "#f0fdf4"
        : result.score >= 65 ? "#eff6ff"
        : result.score >= 50 ? "#fffbeb"
        : "#fef2f2";
      const barPct = result.breakdown.map((b) => {
        const maxPts = [40, 25, 20, 10, 5];
        const idx = result.breakdown.indexOf(b);
        return Math.round((b.contribution / maxPts[idx]) * 100);
      });
      const barColors = ["#059669", "#2563eb", "#7c3aed", "#d97706", "#0891b2"];
      const breakdownRows = result.breakdown
        .map((b, i) => `
          <tr>
            <td style="padding:6px 8px;font-size:11px;color:#475569;white-space:nowrap">${b.factor}</td>
            <td style="padding:6px 8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden;">
                  <div style="width:${barPct[i]}%;height:100%;background:${barColors[i]};border-radius:99px;"></div>
                </div>
                <span style="font-size:11px;font-weight:700;color:${barColors[i]};white-space:nowrap">${b.contribution} pts</span>
              </div>
            </td>
          </tr>`)
        .join("");
      const html = `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px 48px;color:#1e293b;background:#fff;max-width:680px;">

          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:24px;">
            <div>
              <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#2563eb;">FintechPressHub</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Backlink Value Report</div>
            </div>
            <div style="font-size:10px;color:#94a3b8;text-align:right;">
              Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}<br/>
              fintechpresshub.com
            </div>
          </div>

          <!-- Domain + Score -->
          <div style="display:flex;gap:20px;align-items:stretch;margin-bottom:24px;">
            <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Referring Domain</div>
              <div style="font-size:20px;font-weight:900;color:#0f172a;word-break:break-all;">${form.domain || "—"}</div>
              <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;">
                <span style="font-size:11px;color:#475569;">DA: <b>${form.da || "N/A"}</b></span>
                <span style="font-size:11px;color:#475569;">Traffic: <b>${form.traffic ? Number(form.traffic).toLocaleString() : "N/A"}/mo</b></span>
                <span style="font-size:11px;color:#475569;">Relevance: <b>${form.relevance}</b></span>
                <span style="font-size:11px;color:#475569;">Link type: <b>${form.linkType}</b></span>
              </div>
            </div>
            <div style="width:140px;background:${labelBg};border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Value Score</div>
              <div style="font-size:52px;font-weight:900;line-height:1;color:${scoreColor};">${result.score}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;">/ 100</div>
              <div style="font-size:12px;font-weight:700;color:${scoreColor};margin-top:6px;background:${labelBg};border:1px solid ${scoreColor}44;border-radius:99px;padding:2px 10px;">${result.label}</div>
            </div>
          </div>

          <!-- Value Estimate -->
          <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #ddd6fe;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">💰 Estimated Market Value</div>
            <div style="font-size:32px;font-weight:900;color:#6d28d9;">${fmtMoney(result.linkValue.min)}<span style="color:#a78bfa;font-weight:400;font-size:22px;margin:0 8px;">–</span>${fmtMoney(result.linkValue.max)}</div>
            <div style="font-size:11px;color:#7c3aed;margin-top:6px;">Market cost if acquired via a professional PR/SEO agency in this niche.</div>
          </div>

          <!-- Score Breakdown -->
          <div style="margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Score Breakdown</div>
            <table style="width:100%;border-collapse:collapse;">
              ${breakdownRows}
            </table>
          </div>

          <!-- Acquisition Difficulty -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">
            <div>
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Acquisition Difficulty</div>
              <div style="font-size:16px;font-weight:900;color:#f59e0b;">${"★".repeat(result.acquisition.stars)}${"☆".repeat(5 - result.acquisition.stars)}</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:#475569;">${result.acquisition.label}</div>
            <div style="flex:1;font-size:11px;color:#64748b;">${result.acquisition.strategyTip}</div>
          </div>

          <!-- Suggested Outreach Angle -->
          <div style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">✉ Suggested Outreach Angle</div>
            <div style="font-size:13px;color:#3730a3;font-style:italic;line-height:1.7;border-left:3px solid #6366f1;padding-left:14px;">"${pitchAngle}"</div>
          </div>

          <!-- Footer -->
          <div style="border-top:1px solid #e2e8f0;padding-top:14px;text-align:center;">
            <div style="font-size:10px;color:#94a3b8;">Generated by FintechPressHub Backlink Value Estimator · fintechpresshub.com · Free SEO tools for digital marketers</div>
          </div>
        </div>`;

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:720px;";
      container.innerHTML = html;
      document.body.appendChild(container);
      const safeDomain = (form.domain || "report").replace(/[^a-zA-Z0-9.-]/g, "_");
      await html2pdf()
        .set({
          margin: 0,
          filename: `backlink-report-${safeDomain}.pdf`,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "px", format: [720, 1200], orientation: "portrait" },
        })
        .from(container)
        .save();
      document.body.removeChild(container);
    } finally {
      setReportPdfLoading(false);
    }
  };

  const exportSavedComparePDF = async (oppA: SavedOpportunity, oppB: SavedOpportunity) => {
    setComparePdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      // Header bar
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 56, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FintechPressHub", margin, 34);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Saved Estimates — Head-to-Head Comparison Report", margin, 48);
      y = 76;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);
      y += 18;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 14;

      const aColor: [number, number, number] = [16, 110, 80];
      const bColor: [number, number, number] = [37, 99, 235];
      const colW = (contentW - 20) / 2;

      // Domain A box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, colW, 72, 4, 4, "F");
      doc.setFillColor(16, 110, 80);
      doc.roundedRect(margin, y, colW, 6, 4, 4, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
      doc.text(`Domain A: ${oppA.domain || "Domain A"}`, margin + 8, y + 20);
      doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.setTextColor(...aColor);
      doc.text(`${oppA.score}`, margin + 8, y + 52);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(`/ 100 — ${oppA.label}`, margin + 8 + 38, y + 52);
      if (oppA.score > oppB.score) {
        doc.setFillColor(16, 110, 80);
        doc.roundedRect(margin + colW - 58, y + 38, 50, 16, 3, 3, "F");
        doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("WINNER", margin + colW - 43, y + 49);
      }

      // Domain B box
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin + colW + 20, y, colW, 72, 4, 4, "F");
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin + colW + 20, y, colW, 6, 4, 4, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
      doc.text(`Domain B: ${oppB.domain || "Domain B"}`, margin + colW + 28, y + 20);
      doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.setTextColor(...bColor);
      doc.text(`${oppB.score}`, margin + colW + 28, y + 52);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(`/ 100 — ${oppB.label}`, margin + colW + 28 + 38, y + 52);
      if (oppB.score > oppA.score) {
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(margin + colW * 2 + 20 - 58, y + 38, 50, 16, 3, 3, "F");
        doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("WINNER", margin + colW * 2 + 20 - 43, y + 49);
      }
      y += 88;

      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y); y += 14;

      // Metrics table
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Key Metrics", margin, y); y += 14;

      const metrics = [
        ["Est. Market Value", `${fmtMoney(oppA.linkValueMin)}–${fmtMoney(oppA.linkValueMax)}`, `${fmtMoney(oppB.linkValueMin)}–${fmtMoney(oppB.linkValueMax)}`],
        ["Acquisition Difficulty", `${oppA.acquisitionStars}/5 stars — ${oppA.acquisitionLabel}`, `${oppB.acquisitionStars}/5 stars — ${oppB.acquisitionLabel}`],
        ["Value for Money", fmtMoney(((oppA.linkValueMin + oppA.linkValueMax) / 2) / Math.max(1, oppA.acquisitionStars)), fmtMoney(((oppB.linkValueMin + oppB.linkValueMax) / 2) / Math.max(1, oppB.acquisitionStars))],
        ["Outreach Priority", oppA.priority ? PRIORITY_LABELS[oppA.priority] : "Unscheduled", oppB.priority ? PRIORITY_LABELS[oppB.priority] : "Unscheduled"],
      ];

      metrics.forEach(([label, a, b]) => {
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(90, 90, 90);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...aColor);
        const aLines = doc.splitTextToSize(a, colW);
        doc.text(aLines, margin + 130, y);
        doc.setTextColor(...bColor);
        const bLines = doc.splitTextToSize(b, colW);
        doc.text(bLines, margin + 130 + colW + 10, y);
        y += Math.max(aLines.length, bLines.length) * 13 + 4;
      });

      y += 10;
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y); y += 10;

      // Verdict
      const vfmA = ((oppA.linkValueMin + oppA.linkValueMax) / 2) / Math.max(1, oppA.acquisitionStars);
      const vfmB = ((oppB.linkValueMin + oppB.linkValueMax) / 2) / Math.max(1, oppB.acquisitionStars);
      const winner = vfmA >= vfmB ? oppA.domain || "Domain A" : oppB.domain || "Domain B";
      const winnerVfm = fmtMoney(vfmA >= vfmB ? vfmA : vfmB);
      const lines = doc.splitTextToSize(
        `Value for Money Verdict: ${winner} offers better value — ${winnerVfm} estimated value per star of acquisition difficulty.`,
        contentW,
      );
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(16, 110, 80);
      doc.text(lines, margin, y);
      y += lines.length * 14 + 20;

      doc.setDrawColor(200, 200, 200); doc.line(margin, y, pageW - margin, y); y += 10;
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
      doc.text("Generated by FintechPressHub Backlink Value Estimator · fintechpresshub.com", margin, y);

      const safeA = (oppA.domain || "A").replace(/[^a-zA-Z0-9.-]/g, "_");
      const safeB = (oppB.domain || "B").replace(/[^a-zA-Z0-9.-]/g, "_");
      doc.save(`saved-comparison-${safeA}-vs-${safeB}.pdf`);
    } finally {
      setComparePdfLoading(false);
    }
  };

  const removeOpportunity = (id: string) => {
    setSavedOpportunities((prev) => prev.filter((p) => p.id !== id));
    setCheckedSaved((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const toggleSavedCheck = (id: string) => {
    setCheckedSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const valueForMoney = (opp: SavedOpportunity): number => {
    const avgValue = (opp.linkValueMin + opp.linkValueMax) / 2;
    const difficulty = Math.max(1, opp.acquisitionStars);
    return avgValue / difficulty;
  };

  const cyclePriority = (id: string, current: Priority) => {
    const idx = PRIORITY_CYCLE.indexOf(current);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    setSavedOpportunities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: next } : p)),
    );
  };

  const exportCSV = () => {
    const header = [
      "Domain", "Value Score", "Label",
      "Est. Market Price Min", "Est. Market Price Max",
      "Acquisition Difficulty (Stars)", "Acquisition Difficulty",
      "Priority", "Outreach Date",
    ];
    const rows = sortedOpportunities.map((opp) => [
      opp.domain,
      opp.score,
      opp.label,
      fmtMoney(opp.linkValueMin),
      fmtMoney(opp.linkValueMax),
      opp.acquisitionStars,
      opp.acquisitionLabel,
      opp.priority ? PRIORITY_LABELS[opp.priority] : "Unscheduled",
      computeOutreachDate(opp.priority),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospect-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedOpportunities = useMemo(() => {
    return [...savedOpportunities].sort((a, b) => {
      if (sortMode === "value-score") {
        return b.score !== a.score
          ? b.score - a.score
          : b.linkValueMin - a.linkValueMin;
      }
      // market-price: sort by estimated link value (max) descending
      return b.linkValueMax !== a.linkValueMax
        ? b.linkValueMax - a.linkValueMax
        : b.score - a.score;
    });
  }, [savedOpportunities, sortMode]);

  const _isSaved =
    !!result &&
    savedOpportunities.some(
      (p) => p.domain === form.domain && p.score === result.score,
    );

  const canEstimate =
    (parseFloat(form.da) > 0 || parseFloat(form.traffic) > 0) &&
    form.domain.trim().length > 0;

  const LabelIcon = result ? LABEL_ICON(result.score) : null;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="backlinkValueEstimator"
        faq={[
          { question: "Is the Backlink Value Estimator free?", answer: "Yes — the FintechPressHub Backlink Value Estimator is completely free with no sign-up needed." },
          { question: "What factors determine the backlink value score?", answer: "The score weights Domain Authority (40%), estimated monthly organic traffic (35%), and topical relevance to fintech (25%) to produce a 0–100 value rating." },
          { question: "What score indicates a high-value backlink opportunity?", answer: "A score above 70 indicates a premium backlink target. 50–69 is solid. Below 50 suggests the domain may not move the needle enough to justify outreach effort." },
        ]}
        webPage={{
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          conditionsOfAccess:  "https://schema.org/OnlineAccess",
          usageInfo:           "https://www.fintechpresshub.com/terms",
          isAccessibleForFree: true,
          accessibilityFeature: ["alternativeText", "structuredNavigation"],
        }}
        speakableSelectors={["h1", ".speakable-summary"]}
        softwareApp={{
          name:                "Backlink Value Estimator",
          applicationCategory: "BusinessApplication",
          operatingSystem:     "Web",
          url:                 "https://www.fintechpresshub.com/tools/backlink-value-estimator",
          description:         "Enter a referring domain's DA, traffic, and relevance to get an SEO value score out of 100, with a full breakdown and risk flags.",
          offers:              { price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
          inLanguage:          "en",
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          provider:            { "@id": "https://www.fintechpresshub.com#organization" },
          potentialAction:     { "@type": "UseAction", target: "https://www.fintechpresshub.com/tools/backlink-value-estimator" },
          featureList: [
            "0–100 backlink value score for any target domain",
            "Weighted scoring: Domain Authority (40%), organic traffic (35%), relevance (25%)",
            "Clear high/medium/low priority rating for outreach prioritisation",
            "Fintech-industry relevance calibration built in",
            "Client-side — no external API calls, data stays in browser",
          ],
        }}
        howTo={{
          name:        "How to Estimate the Value of a Fintech Backlink",
          description: "Use the free Backlink Value Estimator to score and prioritise link building opportunities.",
          steps: [
            { name: "Enter domain metrics", text: "Input the referring domain's Domain Authority, estimated monthly traffic, and relevance to your fintech niche." },
            { name: "Score the backlink", text: "Click Estimate Value to receive a 0–100 SEO value score with a full metric breakdown." },
            { name: "Check risk flags", text: "Review any risk flags raised (spammy domain, low traffic, poor relevance) before pursuing the link." },
          ],
          totalTime: "PT3M",
        }}
      />

      <PageHero
        eyebrow="Free Tool"
        title="Backlink Value Estimator"
        description="Enter a referring domain's metrics to get an estimated SEO value score for that backlink opportunity — scored out of 100 with a full breakdown."
      />

      <div className="container mx-auto px-4 pb-2">
        <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Score any referring domain 0–100 using Domain Authority (40%), organic traffic (35%), and topical relevance (25%) — free, no sign-up.
        </p>
      </div>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className={`${savedOpportunities.length > 0 ? "grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start" : ""}`}>
          <div>
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
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Link Opportunity Details
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Fill in what you know — estimates work with partial data.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCompareMode((v) => !v); setResultB(null); }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      compareMode
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Compare
                  </button>
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

              {/* Currency selector — i18n display preference. Methodology and
                  scoring are currency-neutral; this only swaps the symbol and
                  applies a disclosed FX rate for non-USD output. */}
              <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex flex-col">
                  <Label className="text-xs font-semibold text-slate-700">
                    Display currency
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Estimates anchored in USD; converted at fixed rate for display.
                  </p>
                </div>
                <select
                  data-testid="select-currency"
                  aria-label="Display currency"
                  value={form.currency ?? "USD"}
                  onChange={(e) =>
                    setField("currency", e.target.value as "USD" | "GBP" | "EUR")
                  }
                  className="h-9 px-2 text-sm font-semibold border border-slate-300 rounded-md bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                {/* Domain */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Referring Domain <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. thefinancialbrand.com or https://thefinancialbrand.com"
                    value={form.domain}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const stripped = stripToDomain(raw);
                      const wasStripped = stripped !== raw && stripped.length > 0 && raw.includes("://");
                      setDomainStripped(wasStripped);
                      setField("domain", wasStripped ? stripped : raw);
                    }}
                    className="h-11"
                  />
                  {domainStripped ? (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      URL stripped to root domain
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Paste a full URL or just the domain — we'll clean it up automatically.
                    </p>
                  )}
                </div>

                {/* DA */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    Domain Authority (DA)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="45"
                    value={form.da}
                    onChange={(e) => setField("da", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Moz DA score (0–100). Check with Moz or Ahrefs.
                  </p>
                </div>

                {/* Traffic */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Monthly Organic Traffic
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 25000 or 25k"
                    value={trafficRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTrafficRaw(raw);
                      setField("traffic", parseTrafficInput(raw));
                    }}
                    className="h-11"
                  />
                  {trafficRaw && parseTrafficInput(trafficRaw) !== trafficRaw ? (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      = {Number(parseTrafficInput(trafficRaw)).toLocaleString()} visitors/mo
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Type a number or use k / m (e.g. 50k, 1.5m).
                    </p>
                  )}
                </div>

                {/* Relevance */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Niche Relevance
                  </Label>
                  <div className="flex flex-col gap-1.5">
                    {(["high", "medium", "low"] as Relevance[]).map((r) => (
                      <label
                        key={r}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          form.relevance === r
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-medium"
                            : "border-border text-muted-foreground hover:border-emerald-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="relevance"
                          value={r}
                          checked={form.relevance === r}
                          onChange={() => setField("relevance", r)}
                          className="accent-emerald-600"
                        />
                        {RELEVANCE_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Placement + Link type */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      Link Placement
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      {(
                        [
                          "editorial",
                          "sidebar",
                          "footer",
                          "sponsored",
                        ] as Placement[]
                      ).map((p) => (
                        <label
                          key={p}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            form.placement === p
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-medium"
                              : "border-border text-muted-foreground hover:border-emerald-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="placement"
                            value={p}
                            checked={form.placement === p}
                            onChange={() => setField("placement", p)}
                            className="accent-emerald-600"
                          />
                          {PLACEMENT_LABELS[p]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Link Type
                    </Label>
                    <div className="flex gap-2">
                      {(["dofollow", "nofollow"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setField("linkType", t)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                            form.linkType === t
                              ? "border-emerald-400 bg-emerald-600 text-white"
                              : "border-border text-muted-foreground hover:border-emerald-300"
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Domain B form — shown only in compare mode */}
              {compareMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-blue-100"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700">B</div>
                    <span className="text-sm font-bold text-slate-800">Domain B — Comparison Opportunity</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-500" />
                        Referring Domain <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. bankingtech.com or https://bankingtech.com"
                        value={formB.domain}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const stripped = stripToDomain(raw);
                          const wasStripped = stripped !== raw && stripped.length > 0 && raw.includes("://");
                          setDomainBStripped(wasStripped);
                          setFieldB("domain", wasStripped ? stripped : raw);
                        }}
                        className="h-11 border-blue-200 focus-visible:ring-blue-400"
                      />
                      {domainBStripped ? (
                        <p className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" />
                          URL stripped to root domain
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Paste a full URL or just the domain — we'll clean it up automatically.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-500" />
                        Domain Authority (DA)
                      </Label>
                      <Input
                        type="number" min="0" max="100" placeholder="45"
                        value={formB.da}
                        onChange={(e) => setFieldB("da", e.target.value)}
                        className="h-11 border-blue-200 focus-visible:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Monthly Organic Traffic
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 25000 or 25k"
                        value={trafficBRaw}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setTrafficBRaw(raw);
                          setFieldB("traffic", parseTrafficInput(raw));
                        }}
                        className="h-11 border-blue-200 focus-visible:ring-blue-400"
                      />
                      {trafficBRaw && parseTrafficInput(trafficBRaw) !== trafficBRaw ? (
                        <p className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" />
                          = {Number(parseTrafficInput(trafficBRaw)).toLocaleString()} visitors/mo
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Type a number or use k / m (e.g. 50k, 1.5m).
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        Niche Relevance
                      </Label>
                      <div className="flex flex-col gap-1.5">
                        {(["high", "medium", "low"] as Relevance[]).map((r) => (
                          <label key={r} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            formB.relevance === r
                              ? "border-blue-400 bg-blue-50 text-blue-800 font-medium"
                              : "border-border text-muted-foreground hover:border-blue-300"
                          }`}>
                            <input type="radio" name="relevance-b" value={r} checked={formB.relevance === r}
                              onChange={() => setFieldB("relevance", r)} className="accent-blue-600" />
                            {RELEVANCE_LABELS[r]}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-blue-500" />
                          Link Placement
                        </Label>
                        <div className="flex flex-col gap-1.5">
                          {(["editorial","sidebar","footer","sponsored"] as Placement[]).map((p) => (
                            <label key={p} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                              formB.placement === p
                                ? "border-blue-400 bg-blue-50 text-blue-800 font-medium"
                                : "border-border text-muted-foreground hover:border-blue-300"
                            }`}>
                              <input type="radio" name="placement-b" value={p} checked={formB.placement === p}
                                onChange={() => setFieldB("placement", p)} className="accent-blue-600" />
                              {PLACEMENT_LABELS[p]}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                          Link Type
                        </Label>
                        <div className="flex gap-2">
                          {(["dofollow","nofollow"] as const).map((t) => (
                            <button key={t} type="button" onClick={() => setFieldB("linkType", t)}
                              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                                formB.linkType === t
                                  ? "border-blue-400 bg-blue-600 text-white"
                                  : "border-border text-muted-foreground hover:border-blue-300"
                              }`}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <Button
                onClick={estimate}
                disabled={!canEstimate}
                className={`w-full font-semibold h-11 mt-5 ${compareMode ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
              >
                {compareMode ? (
                  <>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Compare Both Domains
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Estimate Backlink Value
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={`${form.domain}-${result.score}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-6"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    {compareMode && resultB ? `Domain A: ${form.domain}` : `Results for ${form.domain}`}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyShareUrl}
                      className={`shrink-0 gap-1.5 text-xs font-semibold transition-all ${
                        copied
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Share Results
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={downloadReport}
                      disabled={reportPdfLoading}
                      className="shrink-0 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all"
                    >
                      {reportPdfLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <FileDown className="w-3.5 h-3.5" />
                          Download Report
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportPDF}
                      disabled={pdfLoading}
                      className="shrink-0 gap-1.5 text-xs font-semibold border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-all"
                    >
                      {pdfLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <FileDown className="w-3.5 h-3.5" />
                          Export PDF
                        </>
                      )}
                    </Button>
                    <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-md px-2.5 py-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      Auto-saved
                    </span>
                  </div>
                </div>

                {/* Head-to-Head Comparison Panel */}
                {compareMode && resultB && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Card className="border border-blue-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-blue-700 px-5 py-3 flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-white/80" />
                        <span className="text-sm font-bold text-white">Head-to-Head Comparison</span>
                      </div>
                      <CardContent className="p-0">
                        {/* Score row */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-0 divide-x divide-slate-100">
                          <div className={`p-5 flex flex-col items-center gap-1 ${result.score >= resultB.score ? "bg-emerald-50/60" : ""}`}>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">A</span>
                              {form.domain || "Domain A"}
                            </div>
                            <div className={`text-5xl font-black ${SCORE_COLOR(result.score)}`}>{result.score}</div>
                            <div className="text-xs text-muted-foreground">/ 100</div>
                            <div className={`text-xs font-bold mt-1 ${SCORE_COLOR(result.score)}`}>{result.label}</div>
                            {result.score > resultB.score && (
                              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full">
                                <Trophy className="w-2.5 h-2.5" /> Winner
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-center justify-center px-3 py-4 gap-1 bg-slate-50">
                            <ArrowLeftRight className="w-4 h-4 text-slate-300" />
                            <span className="text-[10px] text-slate-400 font-bold">VS</span>
                          </div>
                          <div className={`p-5 flex flex-col items-center gap-1 ${resultB.score > result.score ? "bg-blue-50/60" : ""}`}>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">B</span>
                              {formB.domain || "Domain B"}
                            </div>
                            <div className={`text-5xl font-black ${SCORE_COLOR(resultB.score)}`}>{resultB.score}</div>
                            <div className="text-xs text-muted-foreground">/ 100</div>
                            <div className={`text-xs font-bold mt-1 ${SCORE_COLOR(resultB.score)}`}>{resultB.label}</div>
                            {resultB.score > result.score && (
                              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">
                                <Trophy className="w-2.5 h-2.5" /> Winner
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Factor breakdown */}
                        <div className="border-t border-slate-100 px-5 py-4">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Factor Breakdown</p>
                          {(() => {
                            const MAX_PTS = [40, 25, 20, 10, 5];
                            return result.breakdown.map((bA, i) => {
                              const bB = resultB.breakdown[i];
                              const aWins = bA.contribution >= bB.contribution;
                              return (
                                <div key={bA.factor} className="mb-3">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-600">{bA.factor}</span>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className={`font-bold ${aWins ? "text-emerald-700" : "text-slate-400"}`}>A: {bA.contribution}/{MAX_PTS[i]}</span>
                                      <span className="text-slate-300">·</span>
                                      <span className={`font-bold ${!aWins ? "text-blue-700" : "text-slate-400"}`}>B: {bB.contribution}/{MAX_PTS[i]}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${Math.round((bA.contribution / MAX_PTS[i]) * 100)}%` }}
                                      />
                                    </div>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${Math.round((bB.contribution / MAX_PTS[i]) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Link value + verdict */}
                        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Domain A — Est. Value</p>
                              <p className="text-base font-black text-violet-700">{fmtMoney(result.linkValue.min)}–{fmtMoney(result.linkValue.max)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Domain B — Est. Value</p>
                              <p className="text-base font-black text-blue-700">{fmtMoney(resultB.linkValue.min)}–{fmtMoney(resultB.linkValue.max)}</p>
                            </div>
                          </div>
                          {result.score !== resultB.score && (
                            <div className={`rounded-lg px-4 py-3 text-sm font-medium leading-relaxed ${
                              result.score > resultB.score
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                : "bg-blue-50 border border-blue-200 text-blue-800"
                            }`}>
                              <span className="font-bold">
                                {result.score > resultB.score ? `Domain A (${form.domain || "A"})` : `Domain B (${formB.domain || "B"})`}
                              </span>{" "}
                              is the stronger opportunity —{" "}
                              {Math.abs(result.score - resultB.score)} points higher and worth an estimated{" "}
                              <span className="font-bold">
                                {result.score > resultB.score
                                  ? `${fmtMoney(result.linkValue.min)}–${fmtMoney(result.linkValue.max)}`
                                  : `${fmtMoney(resultB.linkValue.min)}–${fmtMoney(resultB.linkValue.max)}`}
                              </span>{" "}
                              in market value. Prioritise this one in your outreach pipeline.
                            </div>
                          )}
                          {result.score === resultB.score && (
                            <div className="rounded-lg px-4 py-3 text-sm font-medium bg-amber-50 border border-amber-200 text-amber-800">
                              Both domains score equally. Use link value and acquisition difficulty to decide — lower acquisition difficulty with higher link value wins.
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={exportComparePDF}
                              disabled={comparePdfLoading}
                              className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {comparePdfLoading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Generating…
                                </>
                              ) : (
                                <>
                                  <FileDown className="w-3.5 h-3.5" />
                                  Export Comparison PDF
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Score */}
                <Card className={`border shadow-[0_2px_16px_rgba(0,0,0,0.06)] ${SCORE_BG(result.score)}`}>
                  <CardContent className="p-6 flex items-center gap-6">
                    <div className="text-center min-w-[90px]">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className={`text-6xl font-black ${SCORE_COLOR(result.score)}`}
                      >
                        {result.score}
                      </motion.div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        / 100
                      </div>
                      {result.pbnRisk && (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-3 flex flex-col items-center gap-1 cursor-help"
                              >
                                <div className="flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide leading-none">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  High Risk
                                </div>
                                <div className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium leading-tight text-center">
                                  <span>PBN / Expired Domain</span>
                                  <Info className="w-3 h-3 shrink-0 opacity-70" />
                                </div>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-[240px] text-center leading-snug bg-slate-900 text-white text-xs"
                            >
                              <p className="font-semibold mb-1">Potential PBN or Expired Domain Risk</p>
                              <p>A DA above 70 combined with fewer than 10,000 monthly organic visitors is a common fingerprint of private blog networks (PBNs) or expired domains that have been reclaimed for link selling. Verify the site's traffic history and backlink profile before pursuing this opportunity.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div>
                      {LabelIcon && (
                        <div
                          className={`flex items-center gap-1.5 text-base font-bold mb-1 ${SCORE_COLOR(result.score)}`}
                        >
                          <LabelIcon className="w-5 h-5" />
                          {result.label} Backlink
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.verdict}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Estimated Link Value */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="rounded-xl p-[1.5px] bg-gradient-to-br from-purple-400 via-violet-400 to-blue-400 shadow-sm">
                  <Card className="border-0 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-[10px] shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-violet-600" />
                            Estimated Link Value
                            <TooltipProvider delayDuration={120}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-violet-400 cursor-help hover:text-violet-600 transition-colors shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[260px] text-xs leading-relaxed p-3"
                                >
                                  Value is calculated based on market rates for DA&nbsp;
                                  <span className="font-semibold text-violet-700">{parseFloat(form.da) || 0}</span>
                                  &nbsp;and&nbsp;
                                  <span className="font-semibold text-violet-700">{fmtTraffic(parseFloat(form.traffic) || 0)}</span>
                                  &nbsp;monthly visitors in this niche. Higher DA and traffic levels command premium placement fees based on SEO marketplace benchmarks.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Market cost if acquired via a professional PR/SEO agency.
                          </p>
                          <div className="flex items-baseline gap-2">
                            <motion.span
                              initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.2 }}
                              className="text-3xl font-black text-violet-700 tracking-tight"
                            >
                              {fmtMoney(result.linkValue.min)}
                            </motion.span>
                            <span className="text-lg font-bold text-violet-400">–</span>
                            <motion.span
                              initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.28 }}
                              className="text-3xl font-black text-violet-700 tracking-tight"
                            >
                              {fmtMoney(result.linkValue.max)}
                            </motion.span>
                          </div>
                        </div>
                        <div className="shrink-0 w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-violet-600" />
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-violet-200">
                        <p className="text-[11px] text-violet-700 leading-relaxed">
                          <span className="font-semibold">💡 Organic outreach win:</span>{" "}
                          Getting this link via organic outreach instead of paying an agency is a massive win for your budget — saving you{" "}
                          <span className="font-semibold">{fmtMoney(result.linkValue.min)}–{fmtMoney(result.linkValue.max)}</span>{" "}
                          in placement fees.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </motion.div>

                {/* Acquisition Difficulty */}
                <Card className="border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-600" />
                      Acquisition Difficulty
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                i < result.acquisition.stars
                                  ? result.acquisition.tipType === "easy"
                                    ? "fill-emerald-400 text-emerald-400"
                                    : result.acquisition.tipType === "mid"
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-rose-500 text-rose-500"
                                  : "fill-slate-100 text-slate-200"
                              }`}
                            />
                          </motion.div>
                        ))}
                      </div>
                      <div>
                        <span className={`text-sm font-bold ${
                          result.acquisition.tipType === "easy"
                            ? "text-emerald-700"
                            : result.acquisition.tipType === "mid"
                              ? "text-amber-700"
                              : "text-rose-700"
                        }`}>
                          {result.acquisition.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({result.acquisition.stars}/5 stars)
                        </span>
                      </div>
                    </div>

                    <div className={`mt-4 rounded-lg px-4 py-3 border text-sm leading-relaxed ${
                      result.acquisition.tipType === "easy"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : result.acquisition.tipType === "mid"
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                      <span className="font-semibold">Strategy Tip: </span>
                      {result.acquisition.strategyTip}
                    </div>

                    {/* Domain Health Status */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Domain Health Status</p>
                      {(() => {
                        const daVal = parseFloat(form.da) || 0;
                        const trafficVal = parseFloat(form.traffic) || 0;
                        const isCaution = daVal > 60 && trafficVal < 5000;
                        return isCaution ? (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 cursor-help">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span className="text-xs font-semibold">Caution: Potential Link Farm / Low Engagement</span>
                                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 opacity-70" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px] text-center leading-snug bg-slate-900 text-white text-xs p-3">
                                Sites with high authority but very low organic traffic are often penalized or low-quality. We recommend a manual audit before proceeding.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold">Healthy Search Presence</span>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Score Breakdown + Recommendations — two-column on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Score breakdown — Radar Chart */}
                  {(() => {
                    const MAX_PTS = [40, 25, 20, 10, 5];
                    const AXIS_LABELS = ["Domain Auth.", "Traffic", "Relevance", "Placement", "Link Type"];
                    const radarData = result.breakdown.map((b, i) => ({
                      subject: AXIS_LABELS[i],
                      value: Math.round((b.contribution / MAX_PTS[i]) * 100),
                      fullMark: 100,
                      note: b.note,
                    }));
                    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { subject: string; value: number; note: string } }> }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
                          <p className="font-bold mb-0.5">{d.subject}</p>
                          <p className="text-white/70">{d.note}</p>
                          <p className="text-emerald-400 font-semibold mt-1">{d.value}% of max</p>
                        </div>
                      );
                    };
                    return (
                      <Card className="border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                        <CardContent className="p-6">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">
                            Score Breakdown
                          </h4>
                          <div className="w-full" style={{ height: 230 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis
                                  dataKey="subject"
                                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                                />
                                <PolarRadiusAxis
                                  angle={90}
                                  domain={[0, 100]}
                                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                                  tickCount={4}
                                />
                                <Radar
                                  dataKey="value"
                                  stroke="#10b981"
                                  fill="#10b981"
                                  fillOpacity={0.18}
                                  strokeWidth={2}
                                  dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                                  isAnimationActive={true}
                                  animationBegin={100}
                                  animationDuration={900}
                                  animationEasing="ease-out"
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Compact score legend */}
                          <div className="mt-3 grid grid-cols-1 gap-1.5">
                            {result.breakdown.map((b, i) => (
                              <div key={b.factor} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-medium">{b.factor}</span>
                                <span className="text-slate-400">{b.note}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <Card className="border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                      <CardContent className="p-6">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Recommendations
                        </h4>
                        <ul className="space-y-3">
                          {result.recommendations.map((rec, i) => (
                            <li
                              key={i}
                              className="flex gap-2.5 text-sm text-slate-700"
                            >
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Suggested Outreach Angle */}
                {(() => {
                  const pitchAngle = generateOutreachAngle(
                    form.domain,
                    form.relevance as Relevance,
                  );
                  const contactUrl = buildContactUrl(
                    form.domain,
                    form.relevance as Relevance,
                    pitchAngle,
                  );
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-indigo-600" />
                              Suggested Outreach Angle
                            </h4>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(pitchAngle);
                                } catch {
                                  const el = document.createElement("textarea");
                                  el.value = pitchAngle;
                                  document.body.appendChild(el);
                                  el.select();
                                  document.execCommand("copy");
                                  document.body.removeChild(el);
                                }
                                setCopiedPitch(true);
                                if (pitchCopyTimeoutRef.current) clearTimeout(pitchCopyTimeoutRef.current);
                                pitchCopyTimeoutRef.current = setTimeout(() => setCopiedPitch(false), 2000);
                              }}
                              className={`shrink-0 gap-1.5 text-xs font-semibold transition-all ${
                                copiedPitch
                                  ? "bg-indigo-500 hover:bg-indigo-500 text-white"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                            >
                              {copiedPitch ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy to Clipboard
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-indigo-900 leading-relaxed bg-white/70 border border-indigo-100 rounded-lg px-4 py-3 italic">
                            "{pitchAngle}"
                          </p>
                          <p className="mt-2 text-[11px] text-indigo-600 leading-relaxed">
                            Based on{" "}
                            <span className="font-semibold">
                              {form.domain || "the referring domain"}
                            </span>{" "}
                            and{" "}
                            <span className="font-semibold">
                              {form.relevance === "high"
                                ? "high niche relevance"
                                : form.relevance === "medium"
                                  ? "medium niche relevance"
                                  : "low niche relevance"}
                            </span>
                            .
                          </p>
                          <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <Link href={contactUrl}>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Draft Pitch with AI
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}

                {/* Risks */}
                {result.risks.length > 0 && (
                  <Card className="border border-amber-100 bg-amber-50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Watch Out For
                      </h4>
                      <ul className="space-y-2">
                        {result.risks.map((risk, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 text-sm text-amber-800"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Write outreach email CTA */}
                <Card className="border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-900 mb-0.5">Ready to reach out?</p>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        Generate a personalised outreach email for this domain — link value pre-filled automatically.
                      </p>
                    </div>
                    <Link
                      href={`/tools/outreach-email-generator?targetDomain=${encodeURIComponent(form.domain)}&linkValueMin=${result.linkValue.min}&linkValueMax=${result.linkValue.max}&topic=${encodeURIComponent("digital marketing")}`}
                      className="shrink-0"
                    >
                      <div className="relative inline-flex">
                        <span className="absolute inset-0 rounded-md bg-blue-500/50 animate-ping" />
                        <Button
                          type="button"
                          size="sm"
                          className="relative bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Write outreach email
                        </Button>
                      </div>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-emerald-50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Want a done-for-you professional link building campaign?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-emerald-900"
                      >
                        See our link building services
                      </Link>{" "}
                      or{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-emerald-900"
                      >
                        get a free backlink audit
                      </Link>
                      .
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          </div>{/* end main content col */}

          {/* Compare Opportunities Sidebar */}
          <AnimatePresence>
            {savedOpportunities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="sticky top-6"
              >
                <Card className="border border-emerald-100 shadow-md overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-white/90" />
                        <span className="text-sm font-bold text-white">Saved Estimates</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/70 bg-white/20 rounded-full px-2 py-0.5">
                        {savedOpportunities.length} saved
                      </span>
                    </div>
                    {/* Sort tabs */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSortMode("value-score")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                          sortMode === "value-score"
                            ? "bg-white text-emerald-700 shadow-sm"
                            : "text-white/80 hover:bg-white/20"
                        }`}
                      >
                        <TrendingUp className="w-2.5 h-2.5" />
                        Value Score
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode("market-price")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                          sortMode === "market-price"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-white/80 hover:bg-white/20"
                        }`}
                      >
                        <DollarSign className="w-2.5 h-2.5" />
                        Market Price
                      </button>
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {sortedOpportunities.map((opp, idx) => (
                        <motion.div
                          key={opp.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 py-3 hover:bg-slate-50/80 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <Checkbox
                                checked={checkedSaved.has(opp.id)}
                                onCheckedChange={() => toggleSavedCheck(opp.id)}
                                disabled={!checkedSaved.has(opp.id) && checkedSaved.size >= 2}
                                className="mt-0.5 shrink-0 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                aria-label={`Select ${opp.domain} for comparison`}
                              />
                              <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]" title={opp.domain}>
                                  {opp.domain}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-black ${
                                    opp.score >= 80 ? "text-emerald-600"
                                    : opp.score >= 65 ? "text-blue-600"
                                    : opp.score >= 50 ? "text-amber-500"
                                    : "text-red-500"
                                  }`}>
                                    {opp.score}/100
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[10px] text-violet-600 font-semibold">
                                    {fmtMoney(opp.linkValueMin)}–{fmtMoney(opp.linkValueMax)}
                                  </span>
                                </div>
                                {/* Difficulty stars */}
                                <div className="flex items-center gap-1 mt-1">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                      key={si}
                                      className={`w-2.5 h-2.5 ${
                                        si < opp.acquisitionStars
                                          ? "text-amber-400 fill-amber-400"
                                          : "text-slate-200 fill-slate-200"
                                      }`}
                                    />
                                  ))}
                                  <span className="text-[9px] text-muted-foreground ml-0.5">{opp.acquisitionLabel}</span>
                                </div>
                                {/* Priority / Schedule pill */}
                                <button
                                  type="button"
                                  onClick={() => cyclePriority(opp.id, opp.priority)}
                                  title="Click to cycle outreach window"
                                  className={`mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                    opp.priority
                                      ? PRIORITY_STYLES[opp.priority]
                                      : "border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
                                  }`}
                                >
                                  <Calendar className="w-2 h-2" />
                                  {opp.priority
                                    ? `${PRIORITY_LABELS[opp.priority]} · ${computeOutreachDate(opp.priority)}`
                                    : "+ Schedule"}
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOpportunity(opp.id)}
                              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2.5">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Tick two items to compare them side-by-side. Click <span className="font-semibold text-slate-700">+ Schedule</span> to tag an outreach window.
                    </p>
                    {/* Compare selected button */}
                    <AnimatePresence>
                      {checkedSaved.size === 2 && (
                        <motion.button
                          key="compare-btn"
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => setSavedCompareOpen(true)}
                          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
                        >
                          <GitCompare className="w-3 h-3" />
                          Compare Selected
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download Full Prospect List (.csv)
                    </button>
                    {savedOpportunities.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => { setSavedOpportunities([]); setCheckedSaved(new Set()); }}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          </div>{/* end grid wrapper */}
        </div>
      </section>

      {/* ── Saved Estimates Comparison Modal ─────────────────────── */}
      {(() => {
        const ids = Array.from(checkedSaved);
        const oppA = savedOpportunities.find((o) => o.id === ids[0]);
        const oppB = savedOpportunities.find((o) => o.id === ids[1]);
        if (!oppA || !oppB) return null;
        const vfmA = valueForMoney(oppA);
        const vfmB = valueForMoney(oppB);
        const vfmWinner = vfmA >= vfmB ? "A" : "B";

        type Row = { label: string; a: React.ReactNode; b: React.ReactNode; winnerKey?: "A" | "B" | "tie" };
        const rows: Row[] = [
          {
            label: "Value Score",
            a: <span className={`font-black ${oppA.score >= 80 ? "text-emerald-600" : oppA.score >= 65 ? "text-blue-600" : oppA.score >= 50 ? "text-amber-500" : "text-red-500"}`}>{oppA.score}/100</span>,
            b: <span className={`font-black ${oppB.score >= 80 ? "text-emerald-600" : oppB.score >= 65 ? "text-blue-600" : oppB.score >= 50 ? "text-amber-500" : "text-red-500"}`}>{oppB.score}/100</span>,
            winnerKey: oppA.score > oppB.score ? "A" : oppB.score > oppA.score ? "B" : "tie",
          },
          {
            label: "Grade",
            a: <span className="font-semibold text-slate-700">{oppA.label}</span>,
            b: <span className="font-semibold text-slate-700">{oppB.label}</span>,
          },
          {
            label: "Est. Market Value",
            a: <span className="font-bold text-violet-700">{fmtMoney(oppA.linkValueMin)}–{fmtMoney(oppA.linkValueMax)}</span>,
            b: <span className="font-bold text-violet-700">{fmtMoney(oppB.linkValueMin)}–{fmtMoney(oppB.linkValueMax)}</span>,
            winnerKey: oppA.linkValueMax > oppB.linkValueMax ? "A" : oppB.linkValueMax > oppA.linkValueMax ? "B" : "tie",
          },
          {
            label: "Acquisition Difficulty",
            a: (
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < oppA.acquisitionStars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                ))}
                <span className="text-[11px] text-muted-foreground ml-0.5">{oppA.acquisitionLabel}</span>
              </span>
            ),
            b: (
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < oppB.acquisitionStars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                ))}
                <span className="text-[11px] text-muted-foreground ml-0.5">{oppB.acquisitionLabel}</span>
              </span>
            ),
            // fewer stars = easier = better
            winnerKey: oppA.acquisitionStars < oppB.acquisitionStars ? "A" : oppB.acquisitionStars < oppA.acquisitionStars ? "B" : "tie",
          },
          {
            label: "Outreach Priority",
            a: <span className={`text-[11px] font-semibold ${oppA.priority ? "text-slate-700" : "text-slate-400"}`}>{oppA.priority ? PRIORITY_LABELS[oppA.priority] : "Unscheduled"}</span>,
            b: <span className={`text-[11px] font-semibold ${oppB.priority ? "text-slate-700" : "text-slate-400"}`}>{oppB.priority ? PRIORITY_LABELS[oppB.priority] : "Unscheduled"}</span>,
          },
          {
            label: "Value for Money",
            a: (
              <span className={`font-black text-sm ${vfmWinner === "A" ? "text-emerald-600" : "text-slate-600"}`}>
                {fmtMoney(vfmA)}
                {vfmWinner === "A" && <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">Best</span>}
              </span>
            ),
            b: (
              <span className={`font-black text-sm ${vfmWinner === "B" ? "text-emerald-600" : "text-slate-600"}`}>
                {fmtMoney(vfmB)}
                {vfmWinner === "B" && <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">Best</span>}
              </span>
            ),
            winnerKey: vfmWinner === "A" ? "A" : "B",
          },
        ];

        return (
          <Dialog open={savedCompareOpen} onOpenChange={setSavedCompareOpen}>
            <DialogContent className="max-w-2xl w-full">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Head-to-Head Comparison
                </DialogTitle>
              </DialogHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="text-left py-2.5 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Metric</th>
                      <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-50 rounded-tl-lg border border-b-0 border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-black">A</span>
                          <span className="truncate max-w-[140px]" title={oppA.domain}>{oppA.domain || "Domain A"}</span>
                        </span>
                      </th>
                      <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-50 rounded-tr-lg border border-b-0 border-slate-100 border-l-0">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-black">B</span>
                          <span className="truncate max-w-[140px]" title={oppB.domain}>{oppB.domain || "Domain B"}</span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const isVfm = row.label === "Value for Money";
                      const rowBg = isVfm ? "bg-indigo-50/60" : i % 2 === 0 ? "bg-white" : "bg-slate-50/40";
                      const aHighlight = row.winnerKey === "A" ? "bg-emerald-50 border-l-2 border-l-emerald-400" : "";
                      const bHighlight = row.winnerKey === "B" ? "bg-emerald-50 border-l-2 border-l-emerald-400" : "";
                      return (
                        <tr key={row.label} className={rowBg}>
                          <td className={`py-3 pr-4 text-xs font-semibold ${isVfm ? "text-indigo-700" : "text-muted-foreground"} align-middle`}>
                            {isVfm && <Scale className="inline w-3 h-3 mr-1 text-indigo-500" />}
                            {row.label}
                          </td>
                          <td className={`py-3 px-3 align-middle border border-slate-100 border-t-0 border-r-0 ${aHighlight}`}>
                            {row.a}
                          </td>
                          <td className={`py-3 px-3 align-middle border border-slate-100 border-t-0 ${bHighlight}`}>
                            {row.b}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Verdict strip */}
              <div className={`mt-2 rounded-lg px-4 py-3 text-sm font-medium leading-relaxed ${
                vfmWinner === "A"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-blue-50 border border-blue-200 text-blue-800"
              }`}>
                <span className="font-bold">
                  {vfmWinner === "A" ? oppA.domain || "Domain A" : oppB.domain || "Domain B"}
                </span>{" "}
                offers better value for money —{" "}
                <span className="font-bold">{fmtMoney(vfmWinner === "A" ? vfmA : vfmB)}</span> estimated value per star of acquisition difficulty, versus{" "}
                <span className="font-bold">{fmtMoney(vfmWinner === "A" ? vfmB : vfmA)}</span> for{" "}
                {vfmWinner === "A" ? oppB.domain || "Domain B" : oppA.domain || "Domain A"}.
              </div>

              <div className="flex items-center justify-between mt-1 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => exportSavedComparePDF(oppA, oppB)}
                  disabled={comparePdfLoading}
                  className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {comparePdfLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      Export Comparison PDF
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSavedCompareOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <ToolSEOEnhancements
            toolSlug="backlink-value-estimator"
            toolName="Backlink Value Estimator"
            methodologyTitle="How the Backlink Value Score Is Calculated"
            methodologyText="The estimator uses a three-factor weighted formula: Domain Authority score (40% weight) — normalised from the 0–100 Moz DA scale; estimated monthly organic traffic (35% weight) — scored on a logarithmic scale calibrated to fintech-sector traffic distributions; and topical relevance to fintech (25% weight) — scored on a 1–10 input scale. The three factor scores are multiplied by their weights and summed to produce the 0–100 composite backlink value score."
            accuracyNote="DA and organic traffic figures used in this tool are self-reported inputs. For accurate DA, check Moz Link Explorer or Ahrefs. Organic traffic estimates can be sourced from Semrush or SimilarWeb. Score fintech-specialist publications at 8–10 relevance, general business and technology publications at 5–7, and unrelated domains at 1–4."
            lastUpdated="May 2026"
            processingNote="All calculations run client-side — no domain data is sent to our servers."
            useCases={[
              { industry: "Fintech SEO Agencies", role: "Link Building Specialists", benefit: "Link building specialists score prospect lists before committing outreach time — filtering out low-value domains and prioritising the prospects most likely to move rankings for their fintech clients." },
              { industry: "B2B Payments SaaS", role: "In-House SEO Teams", benefit: "Payments SaaS in-house SEO teams evaluate PR opportunities — scoring news sites and industry blogs to confirm that a press placement will deliver SEO value before the PR team invests time." },
              { industry: "Embedded Finance Platforms", role: "Growth & Partnerships Teams", benefit: "Embedded finance platforms evaluate partner co-marketing opportunities — confirming whether a partner website provides enough DA, traffic, and relevance to justify a content collaboration with link exchange." },
              { industry: "Neobanks & Digital Banks", role: "Marketing Directors", benefit: "Neobank marketing teams score inbound link opportunities from media coverage — quickly assessing whether a journalist's publication domain is worth prioritising for future relationship building." },
            ]}
          />
          <ToolShareEmbed slug="backlink-value-estimator" state={form} />
        </div>
      </section>
    </div>
  );
}
