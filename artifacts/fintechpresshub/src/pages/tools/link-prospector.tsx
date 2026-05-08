import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Shield,
  Star,
  Link2,
  Check,
  Download,
  Mail,
  Copy,
  CheckCircle2,
  Settings2,
  X,
  Bookmark,
  Trash2,
  FolderOpen,
  LayoutGrid,
  List,
  FileText,
  NotebookPen,
  BarChart2,
  Filter,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

ChartJS.register(LinearScale, PointElement, ChartTooltip, Legend);

type ScoringMode = "authority" | "traffic";

type Relevance = "high" | "medium" | "low";
type Placement = "editorial" | "sidebar" | "footer" | "sponsored";

type OutreachStatus = "not_started" | "emailed" | "replied" | "won";

const STATUS_CYCLE: OutreachStatus[] = ["not_started", "emailed", "replied", "won"];

const STATUS_STYLES: Record<OutreachStatus, string> = {
  not_started: "bg-slate-100 border-slate-200 text-slate-500",
  emailed:     "bg-blue-50 border-blue-300 text-blue-700",
  replied:     "bg-amber-50 border-amber-300 text-amber-700",
  won:         "bg-emerald-50 border-emerald-300 text-emerald-700",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_started: "Not Started",
  emailed:     "Emailed",
  replied:     "Replied",
  won:         "Won ✓",
};

const LS_STATUS_KEY = "lp-outreach-status";
const LS_SAVED_LISTS_KEY = "lp-saved-lists";
const LS_NOTES_KEY = "lp-notes";

type FormState = {
  domain: string;
  da: string;
  traffic: string;
  relevance: Relevance;
  linkType: "dofollow" | "nofollow";
  placement: Placement;
};

type LinkValue = { min: number; max: number };

type AcquisitionInfo = {
  stars: number;
  label: string;
  strategyTip: string;
};

type BreakdownItem = {
  factor: string;
  contribution: number;
  note: string;
};

type ProspectResult = {
  domain: string;
  da: number;
  traffic: number;
  score: number;
  label: string;
  linkValue: LinkValue;
  acquisition: AcquisitionInfo;
  breakdown: BreakdownItem[];
  recommendations: string[];
  risks: string[];
};

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function computeLinkValue(score: number, traffic: number): LinkValue {
  const trafficBonus: [number, number] =
    traffic >= 500_000 ? [800, 1500]
    : traffic >= 100_000 ? [400, 800]
    : traffic >= 50_000  ? [200, 400]
    : traffic >= 10_000  ? [100, 250]
    : traffic >= 1_000   ? [30, 100]
    : [0, 50];
  const rawMin = score * 8 + trafficBonus[0];
  const rawMax = score * 18 + trafficBonus[1];
  const min = Math.max(100, Math.round(rawMin / 100) * 100);
  const max = Math.max(min + 100, Math.round(rawMax / 100) * 100);
  return { min, max };
}

function computeAcquisition(score: number, da: number): AcquisitionInfo {
  const daVal = Math.min(100, Math.max(0, da));
  const composite = score * 0.6 + daVal * 0.4;
  if (composite >= 80) return { stars: 5, label: "Very Hard", strategyTip: "Requires a strong existing relationship, top-tier content, or a PR-level campaign." };
  if (composite >= 65) return { stars: 4, label: "Hard", strategyTip: "Invest in a personalised pitch with a clear value exchange — a data study or co-authored piece works well." };
  if (composite >= 48) return { stars: 3, label: "Moderate", strategyTip: "A solid guest post pitch with a unique angle should do it. Follow up once." };
  if (composite >= 30) return { stars: 2, label: "Manageable", strategyTip: "A short, tailored outreach email highlighting mutual audience overlap usually converts." };
  return { stars: 1, label: "Easy", strategyTip: "Straightforward outreach — a brief, friendly email highlighting your content is usually enough." };
}

function estimateOne(domain: string, daRaw: number, trafficRaw: number, mode: ScoringMode = "authority"): ProspectResult {
  const da = Math.min(100, Math.max(0, daRaw));
  const traffic = Math.max(0, trafficRaw);

  let daContrib = 0;
  let trafficContrib = 0;
  const relevanceContrib = 15;
  const linkTypeContrib = 10;
  const placementContrib = 5;

  if (da >= 80) daContrib = 40;
  else if (da >= 60) daContrib = 32;
  else if (da >= 40) daContrib = 22;
  else if (da >= 20) daContrib = 12;
  else daContrib = 4;

  if (traffic >= 500_000) trafficContrib = 25;
  else if (traffic >= 100_000) trafficContrib = 20;
  else if (traffic >= 50_000) trafficContrib = 16;
  else if (traffic >= 10_000) trafficContrib = 12;
  else if (traffic >= 1_000) trafficContrib = 7;
  else trafficContrib = 2;

  // Normalize each component to a 0–1 scale, then apply mode weights
  const daNorm = daContrib / 40;
  const trafficNorm = trafficContrib / 25;
  const otherNorm = (relevanceContrib + linkTypeContrib + placementContrib) / 30;

  let score: number;
  if (mode === "authority") {
    // DA: 70%, Traffic: 20%, Other: 10%
    score = 0.70 * daNorm * 100 + 0.20 * trafficNorm * 100 + 0.10 * otherNorm * 100;
  } else {
    // Traffic: 70%, DA: 20%, Other: 10%
    score = 0.20 * daNorm * 100 + 0.70 * trafficNorm * 100 + 0.10 * otherNorm * 100;
  }
  score = Math.max(1, Math.min(100, Math.round(score)));

  const label =
    score >= 80 ? "Exceptional"
    : score >= 65 ? "Strong"
    : score >= 50 ? "Good"
    : score >= 35 ? "Average"
    : "Weak";

  const linkValue = computeLinkValue(score, traffic);
  const acquisition = computeAcquisition(score, da);

  const breakdown: BreakdownItem[] = [
    { factor: "Domain Authority", contribution: daContrib, note: `DA ${da}` },
    { factor: "Organic Traffic", contribution: trafficContrib, note: fmtNum(traffic) + "/mo" },
    { factor: "Niche Relevance", contribution: relevanceContrib, note: "High (default)" },
    { factor: "Link Type", contribution: linkTypeContrib, note: "Dofollow (default)" },
    { factor: "Link Placement", contribution: placementContrib, note: "Editorial (default)" },
  ];

  const recommendations: string[] = [];
  const risks: string[] = [];

  if (da >= 60) recommendations.push("High-authority domain — prioritise for outreach this month.");
  if (traffic >= 50_000) recommendations.push("Strong organic traffic signals a healthy, trusted publication.");
  if (score < 35) risks.push("Low overall value — verify DA and traffic before investing outreach effort.");

  return { domain, da, traffic, score, label, linkValue, acquisition, breakdown, recommendations, risks };
}

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .toLowerCase()
    .trim();
}

function parseLine(line: string): { domain: string; da: number; traffic: number } | null {
  const raw = line.trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim());
  const domain = cleanDomain(parts[0]);
  if (!domain) return null;
  const da = parts[1] ? parseFloat(parts[1]) : 0;
  const traffic = parts[2] ? parseFloat(parts[2]) : 0;
  return { domain, da: isNaN(da) ? 0 : da, traffic: isNaN(traffic) ? 0 : traffic };
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-emerald-600"
  : score >= 65 ? "text-blue-600"
  : score >= 50 ? "text-amber-500"
  : score >= 35 ? "text-orange-500"
  : "text-red-500";

const SCORE_BG = (score: number) =>
  score >= 80 ? "bg-emerald-50 text-emerald-700"
  : score >= 65 ? "bg-blue-50 text-blue-700"
  : score >= 50 ? "bg-amber-50 text-amber-700"
  : score >= 35 ? "bg-orange-50 text-orange-700"
  : "bg-red-50 text-red-700";

const SCORE_GLOW = (score: number): React.CSSProperties =>
  score >= 80 ? { boxShadow: "0 0 10px 2px rgba(16,185,129,0.30)" }
  : score >= 65 ? { boxShadow: "0 0 10px 2px rgba(59,130,246,0.30)" }
  : score >= 50 ? { boxShadow: "0 0 8px 2px rgba(245,158,11,0.25)" }
  : {};

type SavedList = {
  id: string;
  name: string;
  text: string;
  savedAt: number;
  domainCount: number;
};

type SortKey = "score" | "linkValueMin" | "acquisitionStars" | "da" | "traffic";
type SortDir = "asc" | "desc";

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return dir === "desc" ? <ChevronDown className="w-3 h-3 text-blue-600" /> : <ChevronUp className="w-3 h-3 text-blue-600" />;
}

function buildEstimatorUrl(r: ProspectResult): string {
  const p = new URLSearchParams({
    domain: r.domain,
    da: String(r.da),
    traffic: String(r.traffic),
    relevance: "high",
    linkType: "dofollow",
    placement: "editorial",
  });
  return `/tools/backlink-value-estimator?${p.toString()}`;
}

function buildPitchUrl(r: ProspectResult): string {
  const p = new URLSearchParams({
    targetDomain: r.domain,
    linkValueMin: String(r.linkValue.min),
    linkValueMax: String(r.linkValue.max),
  });
  return `/tools/outreach-email-generator?${p.toString()}`;
}

const EXAMPLE = `moz.com,91,250000
searchengineland.com,78,180000
finextra.com,64,40000
thefinancialbrand.com,55,22000
nerdwallet.com,88,3200000
paymentsdive.com,51,18000`;

export default function LinkProspector() {
  const [textarea, setTextarea] = useState("");
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState("");
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("authority");
  const [showSettings, setShowSettings] = useState(false);
  const scoringModeRef = useRef<ScoringMode>("authority");
  const [savedLists, setSavedLists] = useState<SavedList[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_SAVED_LISTS_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [copiedTopState, setCopiedTopState] = useState<"idle" | "copied" | "none">("idle");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [pitchModal, setPitchModal] = useState<ProspectResult | null>(null);
  const [copyTemplateState, setCopyTemplateState] = useState<"idle" | "copied">("idle");
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_NOTES_KEY) ?? "{}"); }
    catch { return {}; }
  });
  const [statusMap, setStatusMap] = useState<Record<string, OutreachStatus>>(() => {
    try {
      const stored = localStorage.getItem(LS_STATUS_KEY);
      return stored ? (JSON.parse(stored) as Record<string, OutreachStatus>) : {};
    } catch { return {}; }
  });
  const [filterStatus, setFilterStatus] = useState<"" | OutreachStatus>("");
  const [showViz, setShowViz] = useState(false);

  const cycleStatus = (domain: string) => {
    setStatusMap((prev) => {
      const current = prev[domain] ?? "not_started";
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [domain]: next };
      try { localStorage.setItem(LS_STATUS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const runWithText = useCallback((text: string, pushUrl = true) => {
    setError("");
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length === 0) { setError("Paste at least one domain to get started."); return; }
    if (lines.length > 50) { setError("Maximum 50 domains per batch."); return; }
    const parsed = lines.map(parseLine).filter(Boolean) as { domain: string; da: number; traffic: number }[];
    if (parsed.length === 0) { setError("Couldn't parse any valid domains. Check the format."); return; }
    setResults(parsed.map((p) => estimateOne(p.domain, p.da, p.traffic, scoringModeRef.current)));
    setRan(true);
    trackEvent("Tool Used", { tool: "link-prospector", domain_count: parsed.length });
    if (pushUrl) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(text)));
        const url = new URL(window.location.href);
        url.searchParams.set("data", encoded);
        window.history.replaceState(null, "", url.toString());
      } catch {
        // ignore encoding errors
      }
    }
  }, []);

  const run = () => runWithText(textarea);

  const copyTopProspects = () => {
    const top = results.filter((r) => r.score >= 80).map((r) => r.domain);
    if (top.length === 0) {
      setCopiedTopState("none");
      setTimeout(() => setCopiedTopState("idle"), 2000);
      return;
    }
    navigator.clipboard.writeText(top.join("\n")).then(() => {
      setCopiedTopState("copied");
      setTimeout(() => setCopiedTopState("idle"), 2000);
    });
  };

  const saveCurrentList = () => {
    if (!textarea.trim()) return;
    const name = saveNameInput.trim() || `Batch ${new Date().toLocaleDateString()}`;
    const domainCount = textarea.split("\n").filter((l) => l.trim()).length;
    const entry: SavedList = { id: Date.now().toString(), name, text: textarea, savedAt: Date.now(), domainCount };
    const updated = [entry, ...savedLists].slice(0, 10);
    setSavedLists(updated);
    try { localStorage.setItem(LS_SAVED_LISTS_KEY, JSON.stringify(updated)); } catch {}
    setSaveNameInput("");
    setShowSaveInput(false);
    toast("List saved", { description: `"${name}" saved with ${domainCount} domain${domainCount !== 1 ? "s" : ""}.` });
  };

  const loadSavedList = (list: SavedList) => {
    setTextarea(list.text);
    setRan(false);
    setResults([]);
    setShowSavedPanel(false);
    toast("List loaded", { description: `"${list.name}" — ${list.domainCount} domain${list.domainCount !== 1 ? "s" : ""} ready to run.` });
  };

  const deleteSavedList = (id: string) => {
    const updated = savedLists.filter((l) => l.id !== id);
    setSavedLists(updated);
    try { localStorage.setItem(LS_SAVED_LISTS_KEY, JSON.stringify(updated)); } catch {}
  };

  const [bulkStatusSelect, setBulkStatusSelect] = useState<"" | OutreachStatus>("");

  const bulkSetStatus = (status: OutreachStatus) => {
    setStatusMap((prev) => {
      const updated = { ...prev };
      filteredSorted.forEach((r) => { updated[r.domain] = status; });
      try { localStorage.setItem(LS_STATUS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast(`All ${filteredSorted.length} prospects marked as "${STATUS_LABELS[status]}"`, { duration: 2500 });
    setBulkStatusSelect("");
  };

  const exportPitchCSV = () => {
    const header = ["Domain", "Score", "Tier", "DA", "Traffic/mo", "Est Value Min", "Est Value Max", "Difficulty", "Status", "Pitch Subject"];
    const rows = filteredSorted.map((r) => {
      const subject =
        r.da > 60
          ? `Content Partnership Opportunity — ${r.domain} (High Authority)`
          : r.traffic > 50_000
          ? `Content Partnership Opportunity — ${r.domain} (Impressive Reach)`
          : `Content Partnership Opportunity — ${r.domain}`;
      return [
        r.domain,
        r.score,
        r.label,
        r.da > 0 ? r.da : "",
        r.traffic > 0 ? r.traffic : "",
        r.linkValue.min,
        r.linkValue.max,
        r.acquisition.label,
        STATUS_LABELS[statusMap[r.domain] ?? "not_started"],
        subject,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateNote = (domain: string, value: string) => {
    setNotesMap((prev) => {
      const updated = { ...prev, [domain]: value };
      try { localStorage.setItem(LS_NOTES_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const generatePitchEmail = (r: ProspectResult): string => {
    const compliment =
      r.da > 60
        ? `your site's high domain authority and the editorial reputation you've built`
        : r.traffic > 50_000
        ? `the impressive reach you've cultivated — ${fmtNum(r.traffic)} monthly readers is genuinely impressive`
        : `the quality of content you consistently produce`;
    return `Subject: Content Partnership Opportunity — ${r.domain}

Hi ${r.domain} Team,

I came across ${r.domain} recently and wanted to reach out — I've been particularly impressed by ${compliment}.

My name is [Your Name], and I work with [Your Company], where we create fintech-focused content that I believe would resonate strongly with your audience.

I'd love to explore a content collaboration — whether that's a guest contribution, a data-driven study, or a co-authored piece that genuinely adds value for your readers.

Would you be open to a quick email exchange to see if there's a natural fit?

Looking forward to hearing from you,

[Your Name]
[Your Title]
[Your Email]
[Your Company]`;
  };

  // Keep ref in sync with state so the useCallback can read the latest mode
  useEffect(() => {
    scoringModeRef.current = scoringMode;
  }, [scoringMode]);

  // Re-score existing results whenever the scoring mode changes
  useEffect(() => {
    if (!ran || !textarea.trim()) return;
    const lines = textarea.split("\n").filter((l) => l.trim());
    const parsed = lines.map(parseLine).filter(Boolean) as { domain: string; da: number; traffic: number }[];
    if (parsed.length > 0) {
      setResults(parsed.map((p) => estimateOne(p.domain, p.da, p.traffic, scoringMode)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringMode]);

  // On mount, restore state from URL if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("data");
      if (encoded) {
        const text = decodeURIComponent(escape(atob(encoded)));
        setTextarea(text);
        runWithText(text, false);
      }
    } catch {
      // ignore malformed URL params
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (!ran && !textarea.trim()) return;
    const snapshot = { textarea, results: [...results], ran };
    setTextarea("");
    setResults([]);
    setRan(false);
    setError("");
    setCopied(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("data");
    window.history.replaceState(null, "", url.toString());
    toast("Form reset", {
      description: snapshot.ran
        ? "Your domains and prospect results have been cleared."
        : "Your domain list has been cleared.",
      action: {
        label: "Undo",
        onClick: () => {
          setTextarea(snapshot.textarea);
          setResults(snapshot.results);
          setRan(snapshot.ran);
        },
      },
      duration: 5000,
    });
  };

  const loadExample = () => { setTextarea(EXAMPLE); setRan(false); };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadCsv = () => {
    const headers = [
      "Domain",
      "Score",
      "Label",
      "DA",
      "Monthly Traffic",
      "Est. Value Min ($)",
      "Est. Value Max ($)",
      "Difficulty Stars",
      "Difficulty Label",
      "Outreach Strategy",
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = filteredSorted.map((r) => [
      escape(r.domain),
      escape(r.score),
      escape(r.label),
      escape(r.da),
      escape(r.traffic),
      escape(r.linkValue.min),
      escape(r.linkValue.max),
      escape(r.acquisition.stars),
      escape(r.acquisition.label),
      escape(r.acquisition.strategyTip),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "score") { av = a.score; bv = b.score; }
      else if (sortKey === "linkValueMin") { av = a.linkValue.min; bv = b.linkValue.min; }
      else if (sortKey === "acquisitionStars") { av = a.acquisition.stars; bv = b.acquisition.stars; }
      else if (sortKey === "da") { av = a.da; bv = b.da; }
      else { av = a.traffic; bv = b.traffic; }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [results, sortKey, sortDir]);

  const filteredSorted = useMemo(() => {
    if (!filterStatus) return sorted;
    return sorted.filter((r) => (statusMap[r.domain] ?? "not_started") === filterStatus);
  }, [sorted, filterStatus, statusMap]);

  const thCls = (key: SortKey) =>
    `text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap px-3 py-2.5 transition-colors hover:text-blue-600 ${sortKey === key ? "text-blue-600" : "text-slate-500"}`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="linkProspector" />

      <PageHero
        eyebrow="Free Tool"
        title="Link Prospector"
        description="Paste a list of domains (with optional DA and traffic) to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
            {/* Input */}
            <Card className="border border-white/60 bg-white/80 backdrop-blur-md shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Paste Your Prospects</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      One per line. Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">domain,DA,monthlyTraffic</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowSavedPanel((s) => !s); setShowSettings(false); }}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showSavedPanel ? "text-violet-600 hover:text-violet-700" : "text-muted-foreground hover:text-slate-700"}`}
                      title="Saved prospect lists"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      Saved{savedLists.length > 0 && <span className="ml-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full px-1.5">{savedLists.length}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSettings((s) => !s); setShowSavedPanel(false); }}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showSettings ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground hover:text-slate-700"}`}
                      title="Scoring settings"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showSavedPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="mb-4 p-3.5 rounded-lg bg-violet-50 border border-violet-100">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" />
                            Saved Prospect Lists
                          </p>
                          <button type="button" onClick={() => setShowSavedPanel(false)} className="text-violet-400 hover:text-violet-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {savedLists.length === 0 ? (
                          <p className="text-[11px] text-violet-600 italic">No saved lists yet. Save a batch below.</p>
                        ) : (
                          <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                            {savedLists.map((list) => (
                              <div key={list.id} className="flex items-center justify-between gap-2 bg-white border border-violet-100 rounded-md px-3 py-1.5">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{list.name}</p>
                                  <p className="text-[10px] text-slate-400">{list.domainCount} domain{list.domainCount !== 1 ? "s" : ""} · {new Date(list.savedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => loadSavedList(list)}
                                    className="text-[10px] font-bold px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                                  >
                                    Load
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSavedList(list.id)}
                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showSaveInput ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={saveNameInput}
                              onChange={(e) => setSaveNameInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveCurrentList(); if (e.key === "Escape") setShowSaveInput(false); }}
                              placeholder="e.g. Fintech blogs Q3"
                              autoFocus
                              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                            />
                            <button
                              type="button"
                              onClick={saveCurrentList}
                              disabled={!textarea.trim()}
                              className="text-[11px] font-bold px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                            >
                              Save
                            </button>
                            <button type="button" onClick={() => setShowSaveInput(false)} className="text-violet-400 hover:text-violet-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowSaveInput(true)}
                            disabled={!textarea.trim()}
                            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-40 transition-colors"
                          >
                            <Bookmark className="w-3 h-3" />
                            Save current list
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="mb-4 p-3.5 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-2">Prioritize:</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setScoringMode("authority")}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${scoringMode === "authority" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white border-blue-200 text-blue-700 hover:border-blue-400"}`}
                            >
                              High Authority (DA)
                            </button>
                            <button
                              type="button"
                              onClick={() => setScoringMode("traffic")}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${scoringMode === "traffic" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white border-emerald-200 text-emerald-700 hover:border-emerald-400"}`}
                            >
                              High Traffic
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-blue-700 leading-relaxed max-w-xs">
                          {scoringMode === "authority"
                            ? "DA carries 70% of the score. Best for building domain trust and long-term SEO authority."
                            : "Traffic carries 70% of the score. Best for referral potential and audience reach."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSettings(false)}
                          className="ml-auto self-start text-blue-400 hover:text-blue-600 transition-colors"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Domains (max 50)
                  </Label>
                  <textarea
                    value={textarea}
                    onChange={(e) => setTextarea(e.target.value)}
                    placeholder={`moz.com,91,250000\nfinextra.com,64,40000\nnerdwallet.com,88,3200000`}
                    rows={10}
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    onClick={run}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Bulk Estimate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadExample}
                    className="shrink-0 text-xs text-slate-600 border-slate-200 h-11 px-4"
                  >
                    Load example
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <div className="space-y-4">
              <Card className="border border-blue-100 bg-blue-50 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Tips for the best results
                  </h3>
                  <ul className="space-y-2 text-xs text-blue-800 leading-relaxed">
                    <li className="flex gap-2"><span className="font-bold shrink-0">DA:</span>Use Moz DA or Ahrefs DR (0–100)</li>
                    <li className="flex gap-2"><span className="font-bold shrink-0">Traffic:</span>Monthly organic visits from Ahrefs/Semrush</li>
                    <li className="flex gap-2"><span className="font-bold shrink-0">Format:</span><code className="bg-blue-100 px-1 rounded">domain,DA,traffic</code> — DA and traffic are optional</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-violet-100 bg-violet-50 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-violet-600" />
                    Reading the results
                  </h3>
                  <ul className="space-y-2 text-xs text-violet-800 leading-relaxed">
                    <li><span className="font-bold">Highest Value</span> — click the Score column to surface the best links for SEO authority</li>
                    <li><span className="font-bold">Easiest Win</span> — click Difficulty to surface links you can land with light outreach effort</li>
                    <li><span className="font-bold">Deep dive</span> — click any row's external link to open the full analysis</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results table */}
          <AnimatePresence>
            {ran && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8"
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                        {filteredSorted.length}{filterStatus ? ` / ${results.length}` : ""} prospect{results.length !== 1 ? "s" : ""} scored
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowViz((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${showViz ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"}`}
                        title="Toggle scatter plot visualisation"
                      >
                        <BarChart2 className="w-3 h-3" />
                        Visualize
                      </button>
                    </div>
                    <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setView("table")}
                        className={`p-1.5 transition-colors ${view === "table" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                        title="Table view"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("kanban")}
                        className={`p-1.5 transition-colors ${view === "kanban" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                        title="Kanban / pipeline view"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Filter by Status */}
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFilterStatus("")}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${filterStatus === "" ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"}`}
                        >
                          All
                        </button>
                        {STATUS_CYCLE.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                              filterStatus === s
                                ? s === "not_started" ? "bg-slate-700 text-white border-slate-700"
                                  : s === "emailed" ? "bg-blue-600 text-white border-blue-600"
                                  : s === "replied" ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-emerald-600 text-white border-emerald-600"
                                : `${STATUS_STYLES[s]} hover:opacity-80`
                            }`}
                          >
                            {STATUS_LABELS[s]}{" "}
                            <span className="opacity-70">
                              ({sorted.filter((r) => (statusMap[r.domain] ?? "not_started") === s).length})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setSortKey("score"); setSortDir("desc"); }}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${sortKey === "score" && sortDir === "desc" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"}`}
                    >
                      Highest Value
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSortKey("acquisitionStars"); setSortDir("asc"); }}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${sortKey === "acquisitionStars" && sortDir === "asc" ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700"}`}
                    >
                      Easiest Win
                    </button>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${copied ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800"}`}
                      title="Copy a shareable link to these results"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                      {copied ? "Copied!" : "Share"}
                    </button>
                    <button
                      type="button"
                      onClick={copyTopProspects}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        copiedTopState === "copied"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : copiedTopState === "none"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                      }`}
                      title="Copy all domains scoring 80+ to clipboard"
                    >
                      {copiedTopState === "copied" ? (
                        <><Check className="w-3 h-3" />Copied!</>
                      ) : copiedTopState === "none" ? (
                        <><AlertTriangle className="w-3 h-3" />None ≥ 80</>
                      ) : (
                        <><Copy className="w-3 h-3" />Copy Top Prospects</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={exportPitchCSV}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 transition-all"
                      title="Download prospects as CSV with pitch subject lines"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Set all:</span>
                      <select
                        value={bulkStatusSelect}
                        onChange={(e) => {
                          const val = e.target.value as OutreachStatus;
                          if (val) bulkSetStatus(val);
                        }}
                        className="text-[11px] font-semibold pl-2 pr-6 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white hover:border-slate-400 transition-all cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                        title="Set outreach status for all visible prospects"
                      >
                        <option value="">— status —</option>
                        {STATUS_CYCLE.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    {filteredSorted.length > 0 && (
                      <Link
                        href={buildPitchUrl(filteredSorted[0])}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-all"
                        title={`Draft an outreach email for ${filteredSorted[0].domain}`}
                      >
                        <Mail className="w-3 h-3" />
                        Pitch Top Prospect
                      </Link>
                    )}
                  </div>
                </div>

                {/* Scatter Plot Visualisation */}
                <AnimatePresence>
                  {showViz && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden mb-5"
                    >
                      <Card className="border border-indigo-100 bg-white shadow-md">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                                Opportunity Map
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Low Difficulty + High Value = Low Hanging Fruit
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Score ≥ 80</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Score 60–79</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Score &lt; 60</span>
                            </div>
                          </div>
                          <div className="h-64">
                            <Scatter
                              data={{
                                datasets: [
                                  {
                                    label: "Score ≥ 80",
                                    data: filteredSorted
                                      .filter((r) => r.score >= 80)
                                      .map((r) => ({
                                        x: r.acquisition.stars,
                                        y: Math.round((r.linkValue.min + r.linkValue.max) / 2),
                                        domain: r.domain,
                                      })),
                                    backgroundColor: "rgba(16,185,129,0.75)",
                                    borderColor: "rgba(16,185,129,1)",
                                    pointRadius: 8,
                                    pointHoverRadius: 10,
                                  },
                                  {
                                    label: "Score 60–79",
                                    data: filteredSorted
                                      .filter((r) => r.score >= 60 && r.score < 80)
                                      .map((r) => ({
                                        x: r.acquisition.stars,
                                        y: Math.round((r.linkValue.min + r.linkValue.max) / 2),
                                        domain: r.domain,
                                      })),
                                    backgroundColor: "rgba(251,191,36,0.75)",
                                    borderColor: "rgba(245,158,11,1)",
                                    pointRadius: 8,
                                    pointHoverRadius: 10,
                                  },
                                  {
                                    label: "Score < 60",
                                    data: filteredSorted
                                      .filter((r) => r.score < 60)
                                      .map((r) => ({
                                        x: r.acquisition.stars,
                                        y: Math.round((r.linkValue.min + r.linkValue.max) / 2),
                                        domain: r.domain,
                                      })),
                                    backgroundColor: "rgba(148,163,184,0.65)",
                                    borderColor: "rgba(100,116,139,1)",
                                    pointRadius: 7,
                                    pointHoverRadius: 9,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      label(ctx) {
                                        const raw = ctx.raw as { x: number; y: number; domain: string };
                                        return `${raw.domain} — Difficulty: ${raw.x}★  Est. Value: $${raw.y.toLocaleString()}`;
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  x: {
                                    title: { display: true, text: "Difficulty (1 = Easy → 5 = Very Hard)", font: { size: 10 }, color: "#94a3b8" },
                                    min: 0.5,
                                    max: 5.5,
                                    ticks: { stepSize: 1, font: { size: 10 }, color: "#94a3b8",
                                      callback(v) { return `${"★".repeat(Number(v))}`; },
                                    },
                                    grid: { color: "rgba(148,163,184,0.15)" },
                                  },
                                  y: {
                                    title: { display: true, text: "Est. Value (mid-point, $)", font: { size: 10 }, color: "#94a3b8" },
                                    ticks: { font: { size: 10 }, color: "#94a3b8",
                                      callback(v) { const n = Number(v); return n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`; },
                                    },
                                    grid: { color: "rgba(148,163,184,0.15)" },
                                  },
                                },
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredSorted.length === 0 && filterStatus ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                    <Filter className="w-6 h-6 opacity-40" />
                    <p className="text-sm font-medium">No prospects with status "{STATUS_LABELS[filterStatus]}"</p>
                    <button type="button" onClick={() => setFilterStatus("")} className="text-xs text-indigo-600 hover:underline">Clear filter</button>
                  </div>
                ) : view === "kanban" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATUS_CYCLE.map((status) => {
                      const col = filteredSorted.filter((r) => (statusMap[r.domain] ?? "not_started") === status);
                      return (
                        <div key={status} className="flex flex-col gap-2">
                          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border font-semibold text-xs ${STATUS_STYLES[status]}`}>
                            <span>{STATUS_LABELS[status]}</span>
                            <span className="bg-white/70 px-1.5 py-0.5 rounded-full font-bold">{col.length}</span>
                          </div>
                          <div className="flex flex-col gap-2 min-h-[72px]">
                            {col.map((r) => (
                              <div key={r.domain} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                  <a
                                    href={`https://${r.domain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline underline-offset-2 leading-snug break-all"
                                  >
                                    {r.domain}
                                  </a>
                                  <span
                                    className={`shrink-0 text-[11px] font-black px-1.5 py-0.5 rounded-full ${SCORE_BG(r.score)}`}
                                    style={SCORE_GLOW(r.score)}
                                  >
                                    {r.score}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                                  {r.da > 0 && <span>DA {r.da}</span>}
                                  {r.traffic > 0 && <><span className="text-slate-200">·</span><span>{fmtNum(r.traffic)}/mo</span></>}
                                  <span className="text-slate-200">·</span>
                                  <span className="text-violet-500 font-semibold">{fmtMoney(r.linkValue.min)}–{fmtMoney(r.linkValue.max)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => cycleStatus(r.domain)}
                                    className={`flex-1 text-[10px] font-bold px-2 py-1 rounded border transition-all truncate ${STATUS_STYLES[statusMap[r.domain] ?? "not_started"]}`}
                                    title="Click to advance outreach status"
                                  >
                                    {STATUS_LABELS[statusMap[r.domain] ?? "not_started"]}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setPitchModal(r); setCopyTemplateState("idle"); }}
                                    className="p-1 rounded text-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                    title="Open pitch template"
                                  >
                                    <FileText className="w-3 h-3" />
                                  </button>
                                  <Link href={buildEstimatorUrl(r)}>
                                    <button
                                      type="button"
                                      className="p-1 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                      title="Open full analysis"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </Link>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <textarea
                                    value={notesMap[r.domain] ?? ""}
                                    onChange={(e) => updateNote(r.domain, e.target.value)}
                                    placeholder="Add notes…"
                                    rows={2}
                                    className="w-full text-[10px] text-slate-600 placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-200 transition-all"
                                  />
                                </div>
                              </div>
                            ))}
                            {col.length === 0 && (
                              <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-100 text-[11px] text-slate-300 py-8">
                                None yet
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <Card className="border border-white/60 bg-white/80 backdrop-blur-md shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50/70">
                        <tr>
                          <th className={thCls("score")} onClick={() => handleSort("score")}>
                            <span className="flex items-center gap-1">Score <SortIcon col="score" active={sortKey} dir={sortDir} /></span>
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5">Domain</th>
                          <th className={thCls("da")} onClick={() => handleSort("da")}>
                            <span className="flex items-center gap-1">DA <SortIcon col="da" active={sortKey} dir={sortDir} /></span>
                          </th>
                          <th className={thCls("traffic")} onClick={() => handleSort("traffic")}>
                            <span className="flex items-center gap-1">Traffic <SortIcon col="traffic" active={sortKey} dir={sortDir} /></span>
                          </th>
                          <th className={thCls("linkValueMin")} onClick={() => handleSort("linkValueMin")}>
                            <span className="flex items-center gap-1">Est. Value <SortIcon col="linkValueMin" active={sortKey} dir={sortDir} /></span>
                          </th>
                          <th className={thCls("acquisitionStars")} onClick={() => handleSort("acquisitionStars")}>
                            <span className="flex items-center gap-1">Difficulty <SortIcon col="acquisitionStars" active={sortKey} dir={sortDir} /></span>
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5">Status</th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredSorted.map((r, i) => (
                          <motion.tr
                            key={r.domain}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${SCORE_BG(r.score)}`}
                                style={SCORE_GLOW(r.score)}
                              >
                                <span className={`text-base font-black ${SCORE_COLOR(r.score)}`}>{r.score}</span>
                                <span className="text-[10px] font-medium opacity-70">{r.label}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://${r.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-slate-800 text-sm hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
                                >
                                  {r.domain}
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(r.domain).then(() => {
                                      setCopiedDomain(r.domain);
                                      setTimeout(() => setCopiedDomain(null), 1500);
                                    });
                                  }}
                                  className="shrink-0 p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Copy domain"
                                >
                                  {copiedDomain === r.domain ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600 font-mono text-xs">
                              {r.da > 0 ? r.da : <span className="text-muted-foreground/50">—</span>}
                            </td>
                            <td className="px-3 py-3 text-slate-600 text-xs">
                              {r.traffic > 0 ? fmtNum(r.traffic) : <span className="text-muted-foreground/50">—</span>}
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-violet-700 font-bold text-xs">
                                {fmtMoney(r.linkValue.min)}–{fmtMoney(r.linkValue.max)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="flex">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                      key={si}
                                      className={`w-3 h-3 ${si < r.acquisition.stars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                                    />
                                  ))}
                                </span>
                                <span className="text-[11px] text-slate-500">{r.acquisition.label}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => cycleStatus(r.domain)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${STATUS_STYLES[statusMap[r.domain] ?? "not_started"]}`}
                                title="Click to advance outreach status"
                              >
                                {STATUS_LABELS[statusMap[r.domain] ?? "not_started"]}
                              </button>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => { setPitchModal(r); setCopyTemplateState("idle"); }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-300 transition-all whitespace-nowrap"
                                  title={`Open pitch template for ${r.domain}`}
                                >
                                  <FileText className="w-3 h-3" />
                                  Draft Pitch
                                </button>
                                <Link href={buildEstimatorUrl(r)}>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-slate-300 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Open full analysis"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </Link>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                )}

                {/* Monthly plan callout */}
                <Card className="mt-4 border border-emerald-100 bg-emerald-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      <span className="font-bold">Building your monthly outreach plan?</span>{" "}
                      Sort by <span className="font-semibold">Easiest Win</span> to front-load quick gains, then mix in{" "}
                      <span className="font-semibold">Highest Value</span> targets for long-term authority building. Aim for 3–5 outreach attempts per week.{" "}
                      <Link href="/services" className="font-semibold underline underline-offset-2 hover:text-emerald-900">
                        Let us run this for you →
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Draft Pitch Modal ── */}
      <AnimatePresence>
        {pitchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setPitchModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg"
            >
              <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-violet-600" />
                    Pitch Template
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pitchModal.domain} · Score {pitchModal.score} · DA {pitchModal.da > 0 ? pitchModal.da : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPitchModal(null)}
                  className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4">
                <textarea
                  readOnly
                  value={generatePitchEmail(pitchModal)}
                  rows={14}
                  className="w-full text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between px-6 pb-5 gap-4">
                <p className="text-[10px] text-muted-foreground leading-snug max-w-[60%]">
                  Replace <span className="font-mono bg-slate-100 px-1 rounded">[Your Name]</span> and other placeholders before sending.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatePitchEmail(pitchModal)).then(() => {
                      setCopyTemplateState("copied");
                      setTimeout(() => setCopyTemplateState("idle"), 2000);
                    });
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                    copyTemplateState === "copied"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  {copyTemplateState === "copied" ? (
                    <><Check className="w-3.5 h-3.5" />Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" />Copy Template</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
