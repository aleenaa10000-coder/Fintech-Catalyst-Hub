import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Link2,
  ArrowLeft,
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
} from "lucide-react";
import { useMemo } from "react";
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
};

const RELEVANCE_LABELS: Record<Relevance, string> = {
  high: "High — directly fintech-related",
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

function fmtMoney(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
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
        "Original Data / Research Outreach — This site expects genuine, unique value. Lead with proprietary fintech data, a commissioned survey, or a fresh industry benchmark report. A generic pitch will be ignored.",
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
      "Off-topic links can dilute your link profile. Focus on fintech-adjacent or finance domains.",
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

type SortMode = "highest-value" | "easiest-win";

export default function BacklinkValueEstimator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedOpportunities, setSavedOpportunities] = useState<SavedOpportunity[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("highest-value");
  const [alreadySaved, setAlreadySaved] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fromParams = parseFormFromParams();
    if (Object.keys(fromParams).length > 0) {
      const merged = { ...DEFAULTS, ...fromParams };
      setForm(merged);
      const canRun =
        (parseFloat(merged.da) > 0 || parseFloat(merged.traffic) > 0) &&
        merged.domain.trim().length > 0;
      if (canRun) {
        setResult(estimateValue(merged));
      }
    }
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setResult(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const estimate = () => {
    setResult(estimateValue(form));
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

  const saveOpportunity = () => {
    if (!result) return;
    const entry: SavedOpportunity = {
      id: `${Date.now()}-${form.domain}`,
      domain: form.domain,
      score: result.score,
      label: result.label,
      linkValueMin: result.linkValue.min,
      linkValueMax: result.linkValue.max,
      acquisitionStars: result.acquisition.stars,
      acquisitionLabel: result.acquisition.label,
      priority: null,
    };
    setSavedOpportunities((prev) => {
      const exists = prev.some(
        (p) => p.domain === entry.domain && p.score === entry.score,
      );
      if (exists) { setAlreadySaved(true); return prev; }
      setAlreadySaved(false);
      return [...prev, entry];
    });
  };

  const removeOpportunity = (id: string) =>
    setSavedOpportunities((prev) => prev.filter((p) => p.id !== id));

  const cyclePriority = (id: string, current: Priority) => {
    const idx = PRIORITY_CYCLE.indexOf(current);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    setSavedOpportunities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: next } : p)),
    );
  };

  const exportCSV = () => {
    const header = [
      "Domain", "Score", "Label",
      "Est. Value Min", "Est. Value Max",
      "Difficulty Stars", "Difficulty",
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
    a.download = `outreach-calendar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedOpportunities = useMemo(() => {
    return [...savedOpportunities].sort((a, b) => {
      if (sortMode === "highest-value") {
        return b.score !== a.score
          ? b.score - a.score
          : b.linkValueMin - a.linkValueMin;
      }
      return a.acquisitionStars !== b.acquisitionStars
        ? a.acquisitionStars - b.acquisitionStars
        : b.score - a.score;
    });
  }, [savedOpportunities, sortMode]);

  const isSaved =
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
      <PageMeta page="backlinkValueEstimator" />

      <PageHero
        eyebrow="Free Tool"
        title="Backlink Value Estimator"
        description="Enter a referring domain's metrics to get an estimated SEO value score for that backlink opportunity — scored out of 100 with a full breakdown."
      />

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

              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                {/* Domain */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Referring Domain <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. thefinancialbrand.com"
                    value={form.domain}
                    onChange={(e) => setField("domain", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The site that would be linking to you.
                  </p>
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
                    type="number"
                    min="0"
                    placeholder="25000"
                    value={form.traffic}
                    onChange={(e) => setField("traffic", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Estimated monthly visitors from search.
                  </p>
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

              <Button
                onClick={estimate}
                disabled={!canEstimate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Estimate Backlink Value
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
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Results for {form.domain}
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
                          Share link
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={saveOpportunity}
                      className={`shrink-0 gap-1.5 text-xs font-semibold transition-all ${
                        isSaved
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : alreadySaved
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Score */}
                <Card className={`border shadow-sm ${SCORE_BG(result.score)}`}>
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
                  <Card className="border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-violet-600" />
                            Estimated Link Value
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
                </motion.div>

                {/* Acquisition Difficulty */}
                <Card className="border border-slate-100 shadow-sm">
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
                  </CardContent>
                </Card>

                {/* Score breakdown */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">
                      Score Breakdown
                    </h4>
                    <div className="space-y-3">
                      {result.breakdown.map((b) => (
                        <div key={b.factor}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">
                              {b.factor}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {b.note}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(b.contribution / [40, 25, 20, 10, 5][result.breakdown.indexOf(b)]) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: result.breakdown.indexOf(b) * 0.08 }}
                              className="h-1.5 rounded-full"
                              style={{ background: "linear-gradient(to right, #f97316, #3b82f6)" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
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

                {/* Risks */}
                {result.risks.length > 0 && (
                  <Card className="border border-amber-100 bg-amber-50 shadow-sm">
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
                <Card className="border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-900 mb-0.5">Ready to reach out?</p>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        Generate a personalised outreach email for this domain — link value pre-filled automatically.
                      </p>
                    </div>
                    <Link
                      href={`/tools/outreach-email-generator?targetDomain=${encodeURIComponent(form.domain)}&linkValueMin=${result.linkValue.min}&linkValueMax=${result.linkValue.max}&topic=${encodeURIComponent("fintech")}`}
                      className="shrink-0"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 text-xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Write outreach email
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-emerald-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Want a done-for-you fintech link building campaign?{" "}
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
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="sticky top-6"
              >
                <Card className="border border-emerald-100 shadow-md overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-white/90" />
                        <span className="text-sm font-bold text-white">Compare Opportunities</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/70 bg-white/20 rounded-full px-2 py-0.5">
                        {savedOpportunities.length} saved
                      </span>
                    </div>
                    {/* Sort tabs */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSortMode("highest-value")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                          sortMode === "highest-value"
                            ? "bg-white text-emerald-700 shadow-sm"
                            : "text-white/80 hover:bg-white/20"
                        }`}
                      >
                        <TrendingUp className="w-2.5 h-2.5" />
                        Highest Value
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode("easiest-win")}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                          sortMode === "easiest-win"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-white/80 hover:bg-white/20"
                        }`}
                      >
                        <SortDesc className="w-2.5 h-2.5" />
                        Easiest Win
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
                      Click <span className="font-semibold text-slate-700">+ Schedule</span> on any row to tag it with an outreach window. Click again to cycle or clear.
                    </p>
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Export Outreach Calendar (.csv)
                    </button>
                    {savedOpportunities.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => setSavedOpportunities([])}
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
    </div>
  );
}
