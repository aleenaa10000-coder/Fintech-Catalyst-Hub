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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  Send,
  BookmarkPlus,
  Clock,
  Trophy,
  ArrowRight,
  CalendarIcon,
  Bell,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { readSharedState } from "@/lib/toolShare";
import { ToolShareEmbed } from "@/components/ToolShareEmbed";
import { ToolSEOEnhancements } from "@/components/ToolSEOEnhancements";
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

type OutreachStatus = "not_started" | "emailed" | "replied" | "won" | "shortlisted" | "ignored";

const STATUS_CYCLE: OutreachStatus[] = ["not_started", "emailed", "replied", "won"];

const STATUS_STYLES: Record<OutreachStatus, string> = {
  not_started: "bg-slate-500/10 text-slate-500 border-slate-400/20",
  emailed:     "bg-blue-500/10 text-blue-600 border-blue-400/25",
  replied:     "bg-amber-500/10 text-amber-600 border-amber-400/25",
  won:         "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
  shortlisted: "bg-violet-500/10 text-violet-600 border-violet-400/25",
  ignored:     "bg-red-500/10 text-red-400 border-red-400/20",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_started: "Not Started",
  emailed:     "Emailed",
  replied:     "Replied",
  won:         "Won ✓",
  shortlisted: "Shortlisted ★",
  ignored:     "Ignored",
};

const LS_STATUS_KEY = "lp-outreach-status";
const LS_SAVED_LISTS_KEY = "lp-saved-lists";
const LS_NOTES_KEY = "lp-notes";
const LS_TOPICS_KEY = "lp-suggested-topics";
const LS_SAVED_SEARCHES_KEY = "lp-saved-searches";
const LS_TIMELINE_KEY = "lp-timeline-events";
const LS_PROSPECTS_KEY = "lp-prospects";
const LS_SCORING_MODE_KEY = "lp-scoring-mode";
const LS_CONTACTED_KEY = "lp-last-contacted";
const MAX_TEXTAREA_WARN = 5_000;
const MAX_TEXTAREA_HARD = 10_000;

type TimelineEvent = {
  id: string;
  domain: string;
  from: OutreachStatus;
  to: OutreachStatus;
  timestamp: number;
};

type SavedSearch = {
  id: string;
  name: string;
  filterStatus: "" | OutreachStatus;
  sortKey: SortKey;
  sortDir: SortDir;
  minScore: string;
};

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

type SortKey = "score" | "linkValueMin" | "acquisitionStars" | "da" | "traffic" | "priority";
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
  // Pre-fill from `?s=` share link (raw textarea content wrapped as `{ textarea }`).
  const [textarea, setTextarea] = useState(() => readSharedState({ textarea: "" }).textarea);
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState("");
  const [ran, setRan] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(() => {
    try {
      const stored = localStorage.getItem(LS_SCORING_MODE_KEY);
      return stored === "traffic" ? "traffic" : "authority";
    } catch { return "authority"; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const scoringModeRef = useRef<ScoringMode>(scoringMode);
  const resultsRef = useRef<ProspectResult[]>([]);
  const textareaRef = useRef<string>("");
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
  const [suggestedTopicMap, setSuggestedTopicMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TOPICS_KEY) ?? "{}"); }
    catch { return {}; }
  });
  const [editingTopicDomain, setEditingTopicDomain] = useState<string | null>(null);
  const topicFetching = useRef<Set<string>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, OutreachStatus>>(() => {
    try {
      const stored = localStorage.getItem(LS_STATUS_KEY);
      return stored ? (JSON.parse(stored) as Record<string, OutreachStatus>) : {};
    } catch { return {}; }
  });
  const [filterStatus, setFilterStatus] = useState<"" | OutreachStatus>("");
  const [filterStaleness, setFilterStaleness] = useState<"" | "overdue" | "due_soon" | "recent">("");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [dismissedFollowUp, setDismissedFollowUp] = useState(false);
  const FOLLOW_UP_DAYS = 7;
  const [showViz, setShowViz] = useState(false);
  const [minScore, setMinScore] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_SAVED_SEARCHES_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [showSavedSearchDropdown, setShowSavedSearchDropdown] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [showSaveSearchInput, setShowSaveSearchInput] = useState(false);
  const [pitchText, setPitchText] = useState("");
  const [selectedPitchSubjectIdx, setSelectedPitchSubjectIdx] = useState<0 | 1>(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [contactedDateMap, setContactedDateMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_CONTACTED_KEY) ?? "{}"); }
    catch { return {}; }
  });
  const [openDatePickerDomain, setOpenDatePickerDomain] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TIMELINE_KEY) ?? "[]"); }
    catch { return []; }
  });

  const addTimelineEvents = (events: Omit<TimelineEvent, "id" | "timestamp">[]) => {
    const now = Date.now();
    const newEvents: TimelineEvent[] = events.map((e, i) => ({
      ...e,
      id: `${now}-${i}`,
      timestamp: now,
    }));
    setTimelineEvents((prev) => {
      const updated = [...newEvents, ...prev].slice(0, 200);
      try { localStorage.setItem(LS_TIMELINE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  type SitePreview = { title: string; description: string; loading: boolean; error?: string };
  const [previewMap, setPreviewMap] = useState<Record<string, SitePreview>>({});
  const previewFetching = useRef<Set<string>>(new Set());

  const fetchPreview = useCallback((domain: string) => {
    if (previewMap[domain] || previewFetching.current.has(domain)) return;
    previewFetching.current.add(domain);
    setPreviewMap((prev) => ({ ...prev, [domain]: { title: "", description: "", loading: true } }));
    fetch(`/api/tools/site-preview?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((data: { title?: string; description?: string; error?: string }) => {
        setPreviewMap((prev) => ({
          ...prev,
          [domain]: {
            title: data.title ?? "",
            description: data.description ?? "",
            loading: false,
            error: data.error,
          },
        }));
      })
      .catch(() => {
        setPreviewMap((prev) => ({
          ...prev,
          [domain]: { title: "", description: "", loading: false, error: "Could not reach site." },
        }));
      })
      .finally(() => { previewFetching.current.delete(domain); });
  }, [previewMap]);

  const cycleStatus = (domain: string) => {
    setStatusMap((prev) => {
      const current = prev[domain] ?? "not_started";
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [domain]: next };
      try { localStorage.setItem(LS_STATUS_KEY, JSON.stringify(updated)); } catch {}
      try { localStorage.setItem(LS_PROSPECTS_KEY, JSON.stringify({ textarea: textareaRef.current, results: resultsRef.current })); } catch {}
      try { localStorage.setItem(LS_SCORING_MODE_KEY, scoringModeRef.current); } catch {}
      addTimelineEvents([{ domain, from: current, to: next }]);
      return updated;
    });
  };

  const textareaNearLimit = textarea.length > MAX_TEXTAREA_WARN;
  const textareaTooLarge = textarea.length > MAX_TEXTAREA_HARD;

  const runWithText = useCallback((text: string, pushUrl = true) => {
    if (text.length > MAX_TEXTAREA_HARD) {
      toast.error(`Input is too large — trim to ${MAX_TEXTAREA_HARD.toLocaleString()} characters or fewer.`);
      return;
    }
    setError("");
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length === 0) { setError("Paste at least one domain to get started."); return; }
    if (lines.length > 50) { setError("Maximum 50 domains per batch."); return; }
    const parsed = lines.map(parseLine).filter(Boolean) as { domain: string; da: number; traffic: number }[];
    if (parsed.length === 0) { setError("Couldn't parse any valid domains. Check the format."); return; }
    const newResults = parsed.map((p) => estimateOne(p.domain, p.da, p.traffic, scoringModeRef.current));
    setResults(newResults);
    resultsRef.current = newResults;
    textareaRef.current = text;
    setRan(true);
    try { localStorage.setItem(LS_PROSPECTS_KEY, JSON.stringify({ textarea: text, results: newResults })); } catch {}
    try { localStorage.setItem(LS_SCORING_MODE_KEY, scoringModeRef.current); } catch {}
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

  const run = () => {
    setIsRunning(true);
    runWithText(textarea);
    setTimeout(() => setIsRunning(false), 900);
  };

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
      const events: Omit<TimelineEvent, "id" | "timestamp">[] = [];
      filteredSorted.forEach((r) => {
        const current = prev[r.domain] ?? "not_started";
        if (current !== status) events.push({ domain: r.domain, from: current, to: status });
        updated[r.domain] = status;
      });
      try { localStorage.setItem(LS_STATUS_KEY, JSON.stringify(updated)); } catch {}
      if (events.length > 0) addTimelineEvents(events);
      return updated;
    });
    toast(`All ${filteredSorted.length} prospects marked as "${STATUS_LABELS[status]}"`, { duration: 2500 });
    setBulkStatusSelect("");
  };

  const exportSelectedCSV = () => {
    const selected = filteredSorted.filter((r) => selectedDomains.has(r.domain));
    if (selected.length === 0) return;
    const header = ["Domain", "Score", "Tier", "DA", "Traffic/mo", "Est Value Min", "Est Value Max", "Difficulty", "Status", "Last Contacted", "Pitch Subject", "Suggested Topic", "Notes"];
    const rows = selected.map((r) => {
      const subject =
        r.da > 60
          ? `Content Partnership Opportunity — ${r.domain} (High Authority)`
          : r.traffic > 50_000
          ? `Content Partnership Opportunity — ${r.domain} (Impressive Reach)`
          : `Content Partnership Opportunity — ${r.domain}`;
      return [
        r.domain, r.score, r.label,
        r.da > 0 ? r.da : "",
        r.traffic > 0 ? r.traffic : "",
        r.linkValue.min, r.linkValue.max,
        r.acquisition.label,
        STATUS_LABELS[statusMap[r.domain] ?? "not_started"],
        contactedDateMap[r.domain] ?? "",
        subject,
        suggestedTopicMap[r.domain] ?? "",
        notesMap[r.domain] ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bulkSetSelectedStatus = (status: OutreachStatus) => {
    if (selectedDomains.size === 0) return;
    setStatusMap((prev) => {
      const updated = { ...prev };
      const events: Omit<TimelineEvent, "id" | "timestamp">[] = [];
      selectedDomains.forEach((domain) => {
        const current = prev[domain] ?? "not_started";
        if (current !== status) events.push({ domain, from: current, to: status });
        updated[domain] = status;
      });
      try { localStorage.setItem(LS_STATUS_KEY, JSON.stringify(updated)); } catch {}
      if (events.length > 0) addTimelineEvents(events);
      return updated;
    });
    const n = selectedDomains.size;
    toast(`${n} prospect${n !== 1 ? "s" : ""} marked as "${STATUS_LABELS[status]}"`, { duration: 2500 });
    setSelectedDomains(new Set());
  };

  const toggleSelectDomain = (domain: string) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain); else next.add(domain);
      return next;
    });
  };

  useEffect(() => {
    setSelectedDomains(new Set());
  }, [results]);

  useEffect(() => {
    if (pitchModal) setPitchText(generatePitchEmail(pitchModal));
    else setPitchText("");
    setSelectedPitchSubjectIdx(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchModal]);

  const saveCurrentSearch = () => {
    if (!saveSearchName.trim()) return;
    const search: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName.trim(),
      filterStatus,
      sortKey,
      sortDir,
      minScore,
    };
    const updated = [...savedSearches, search];
    setSavedSearches(updated);
    try { localStorage.setItem(LS_SAVED_SEARCHES_KEY, JSON.stringify(updated)); } catch {}
    setSaveSearchName("");
    setShowSaveSearchInput(false);
    toast(`"${search.name}" saved`, { duration: 2000 });
  };

  const applySearch = (s: SavedSearch) => {
    setFilterStatus(s.filterStatus);
    setSortKey(s.sortKey);
    setSortDir(s.sortDir);
    setMinScore(s.minScore);
    setShowSavedSearchDropdown(false);
    toast(`Applied "${s.name}"`, { duration: 1500 });
  };

  const deleteSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    try { localStorage.setItem(LS_SAVED_SEARCHES_KEY, JSON.stringify(updated)); } catch {}
  };

  const exportPitchCSV = () => {
    const header = ["Domain", "Score", "Tier", "DA", "Traffic/mo", "Est Value Min", "Est Value Max", "Difficulty", "Status", "Last Contacted", "Pitch Subject", "Suggested Topic", "Notes"];
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
        contactedDateMap[r.domain] ?? "",
        subject,
        suggestedTopicMap[r.domain] ?? "",
        notesMap[r.domain] ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCrmCSV = () => {
    const header = ["Email", "Company", "Icebreaker", "Website"];
    const rows = filteredSorted.map((r) => [
      "",
      r.domain,
      suggestedTopicMap[r.domain] ?? "",
      `https://${r.domain}`,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-import-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyMarkdownTable = () => {
    if (!filteredSorted || filteredSorted.length === 0) {
      toast.error("No prospects to copy. Run an analysis first.");
      return;
    }
    const headers = ["Domain", "Score", "Tier", "DA", "Traffic/mo", "Status", "Notes"];
    const rows = filteredSorted.map((r) => [
      r.domain,
      String(r.score),
      r.label,
      r.da > 0 ? String(r.da) : "—",
      r.traffic > 0 ? String(r.traffic.toLocaleString()) : "—",
      STATUS_LABELS[statusMap[r.domain] ?? "not_started"],
      notesMap[r.domain] ?? "",
    ]);
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map((row) => (row[i] ?? "").length), 3),
    );
    const pad = (s: string, w: number) => s.padEnd(w);
    const sep = widths.map((w) => "-".repeat(w));
    const lines = [
      "| " + headers.map((h, i) => pad(h, widths[i])).join(" | ") + " |",
      "| " + sep.map((s, i) => pad(s, widths[i])).join(" | ") + " |",
      ...rows.map(
        (row) => "| " + row.map((c, i) => pad(c, widths[i])).join(" | ") + " |",
      ),
    ];
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => toast.success(`Copied ${rows.length} prospects as Markdown table`))
      .catch(() => toast.error("Clipboard write failed — check browser permissions"));
  };

  const updateNote = (domain: string, value: string) => {
    setNotesMap((prev) => {
      const updated = { ...prev, [domain]: value };
      try { localStorage.setItem(LS_NOTES_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const updateContactedDate = (domain: string, date: Date | undefined) => {
    setContactedDateMap((prev) => {
      const updated = { ...prev };
      if (date) {
        updated[domain] = date.toISOString().slice(0, 10);
      } else {
        delete updated[domain];
      }
      try { localStorage.setItem(LS_CONTACTED_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setOpenDatePickerDomain(null);
  };

  const updateTopic = (domain: string, value: string) => {
    setSuggestedTopicMap((prev) => {
      const updated = { ...prev, [domain]: value };
      try { localStorage.setItem(LS_TOPICS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const fetchSuggestedTopic = useCallback((domain: string) => {
    if (suggestedTopicMap[domain] || topicFetching.current.has(domain)) return;
    topicFetching.current.add(domain);
    fetch(`/api/tools/suggest-topic?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((data: { topic?: string; error?: string }) => {
        if (data.topic) {
          setSuggestedTopicMap((prev) => {
            const updated = { ...prev, [domain]: data.topic! };
            try { localStorage.setItem(LS_TOPICS_KEY, JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      })
      .catch(() => {})
      .finally(() => { topicFetching.current.delete(domain); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatePitchSubjectVariants = (r: ProspectResult): [string, string] => {
    const raw = r.domain.split(".")[0];
    const site = raw.charAt(0).toUpperCase() + raw.slice(1);
    const variantA =
      r.da > 60
        ? `Content partnership for ${r.domain} — fintech resource your readers will value`
        : `Content Partnership Opportunity — ${r.domain}`;
    const variantB =
      r.traffic > 50_000
        ? `Quick question about ${site}'s fintech coverage`
        : `${site}: a new fintech resource worth sharing?`;
    return [variantA, variantB];
  };

  const scorePitchSubject = (subject: string, domain: string): number => {
    const lower = subject.toLowerCase();
    const domainBase = domain.split(".")[0].toLowerCase();
    const len = subject.length;
    const lengthScore =
      len >= 40 && len <= 60 ? 25 :
      len >= 30 && len < 40  ? 18 :
      len > 60  && len <= 75 ? 15 :
      len > 75  && len <= 90 ? 8  :
      len < 30  && len >= 20 ? 10 : 4;
    const powerWords = ["partnership", "resource", "opportunity", "content", "fintech", "value", "quick", "new", "exclusive"];
    const powerScore = Math.min(25, powerWords.filter((w) => lower.includes(w)).length * 8);
    const personalScore = lower.includes(domainBase) ? 25 : 0;
    let curiosity = 0;
    if (/\?/.test(subject)) curiosity += 10;
    if (/[—:]/.test(subject)) curiosity += 8;
    if (/\d/.test(subject)) curiosity += 7;
    const curiosityScore = Math.min(25, curiosity);
    return lengthScore + powerScore + personalScore + curiosityScore;
  };

  const subjectScoreToOpenRate = (score: number): string => {
    if (score >= 85) return "~32% avg open rate";
    if (score >= 70) return "~26% avg open rate";
    if (score >= 55) return "~20% avg open rate";
    if (score >= 40) return "~14% avg open rate";
    return "~9% avg open rate";
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

  // Auto-fetch suggested topics for all results when they change
  useEffect(() => {
    results.forEach((r) => {
      if (!suggestedTopicMap[r.domain]) {
        fetchSuggestedTopic(r.domain);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Keep refs in sync so callbacks always read the latest values
  useEffect(() => {
    scoringModeRef.current = scoringMode;
  }, [scoringMode]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    textareaRef.current = textarea;
  }, [textarea]);

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

  // On mount, restore state from URL if present, otherwise from localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("data");
      if (encoded) {
        const text = decodeURIComponent(escape(atob(encoded)));
        setTextarea(text);
        runWithText(text, false);
        return;
      }
    } catch {
      // ignore malformed URL params
    }
    // Fallback: restore from localStorage
    try {
      const saved = localStorage.getItem(LS_PROSPECTS_KEY);
      if (saved) {
        const { textarea: savedText, results: savedResults } = JSON.parse(saved) as { textarea: string; results: ProspectResult[] };
        if (savedText && Array.isArray(savedResults) && savedResults.length > 0) {
          setTextarea(savedText);
          setResults(savedResults);
          resultsRef.current = savedResults;
          textareaRef.current = savedText;
          setRan(true);
        }
      }
    } catch {
      // ignore malformed localStorage data
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
    setClearConfirm(false);
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

  const clearAll = () => {
    try { localStorage.removeItem(LS_PROSPECTS_KEY); } catch {}
    try { localStorage.removeItem(LS_SCORING_MODE_KEY); } catch {}
    try { localStorage.removeItem(LS_STATUS_KEY); } catch {}
    try { localStorage.removeItem(LS_NOTES_KEY); } catch {}
    try { localStorage.removeItem(LS_TIMELINE_KEY); } catch {}
    setTextarea("");
    setResults([]);
    setRan(false);
    setError("");
    setCopied(false);
    setStatusMap({});
    setNotesMap({});
    setScoringMode("authority");
    setClearConfirm(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("data");
    window.history.replaceState(null, "", url.toString());
    toast("All data cleared", {
      description: "Prospects, statuses, notes and saved session have been wiped.",
      duration: 4000,
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
      "Suggested Topic",
      "Notes",
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
      escape(suggestedTopicMap[r.domain] ?? ""),
      escape(notesMap[r.domain] ?? ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const computePriority = (r: ProspectResult) =>
    r.acquisition.stars > 0 ? r.linkValue.min / r.acquisition.stars : 0;

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "score") { av = a.score; bv = b.score; }
      else if (sortKey === "linkValueMin") { av = a.linkValue.min; bv = b.linkValue.min; }
      else if (sortKey === "acquisitionStars") { av = a.acquisition.stars; bv = b.acquisition.stars; }
      else if (sortKey === "da") { av = a.da; bv = b.da; }
      else if (sortKey === "priority") { av = computePriority(a); bv = computePriority(b); }
      else { av = a.traffic; bv = b.traffic; }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [results, sortKey, sortDir]);

  const filteredSorted = useMemo(() => {
    const minScoreNum = minScore === "" ? 0 : Math.max(0, Math.min(100, Number(minScore) || 0));
    let rows = filterStatus
      ? sorted.filter((r) => (statusMap[r.domain] ?? "not_started") === filterStatus)
      : sorted;
    if (minScoreNum > 0) rows = rows.filter((r) => r.score >= minScoreNum);
    if (filterStaleness) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => {
        const dateStr = contactedDateMap[r.domain];
        if (!dateStr) return filterStaleness === "overdue";
        const contacted = new Date(dateStr + "T00:00:00");
        const days = Math.round((today.getTime() - contacted.getTime()) / 86_400_000);
        if (filterStaleness === "overdue") return days > 30;
        if (filterStaleness === "due_soon") return days >= 14 && days <= 30;
        return days < 14;
      });
    }
    return rows;
  }, [sorted, filterStatus, statusMap, minScore, filterStaleness, contactedDateMap]);

  const followUpProspects = useMemo(() => {
    if (!ran) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return results.filter((r) => {
      if ((statusMap[r.domain] ?? "not_started") !== "emailed") return false;
      const dateStr = contactedDateMap[r.domain];
      if (!dateStr) return true;
      const contacted = new Date(dateStr + "T00:00:00");
      const days = Math.round((today.getTime() - contacted.getTime()) / 86_400_000);
      return days >= FOLLOW_UP_DAYS;
    });
  }, [results, statusMap, contactedDateMap, ran]);

  const allVisibleSelected = filteredSorted.length > 0 && filteredSorted.every((r) => selectedDomains.has(r.domain));
  const someVisibleSelected = !allVisibleSelected && filteredSorted.some((r) => selectedDomains.has(r.domain));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const thCls = (key: SortKey) =>
    `text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap px-3 py-2.5 transition-colors hover:text-blue-600 ${sortKey === key ? "text-blue-600" : "text-slate-500"}`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="linkProspector"
        faq={[
          { question: "Is the Link Prospector free?", answer: "Yes — the FintechPressHub Link Prospector is free to use with no account required." },
          { question: "How many domains can I score with the Link Prospector?", answer: "You can paste and score a list of domains in one batch. It is designed for bulk evaluation so you can prioritise an entire outreach list in a single session." },
          { question: "Can I export my scored prospect list?", answer: "Yes — once scored, you can copy the prioritised list and paste it into any spreadsheet or outreach CRM to begin your link-building campaign." },
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
          name:                "Link Prospector for Fintech",
          applicationCategory: "BusinessApplication",
          operatingSystem:     "Web",
          url:                 "https://www.fintechpresshub.com/tools/link-prospector",
          description:         "Paste a list of domains to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan.",
          offers:              { price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
          inLanguage:          "en",
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          provider:            { "@id": "https://www.fintechpresshub.com#organization" },
          potentialAction:     { "@type": "UseAction", target: "https://www.fintechpresshub.com/tools/link-prospector" },
          featureList: [
            "Bulk domain scoring — paste an entire outreach list at once",
            "Value and ease-of-acquisition scores for each prospect",
            "Sort by highest value or easiest win",
            "Copyable prioritised output for import into any outreach CRM",
            "No sign-up required",
          ],
        }}
        howTo={{
          name:        "How to Prospect and Score Fintech Backlink Opportunities",
          description: "Use the free Link Prospector to bulk-score and prioritise your fintech link building pipeline.",
          steps: [
            { name: "Paste your domain list", text: "Enter a list of referring domains you are considering for outreach, one per line." },
            { name: "Score all prospects", text: "Click Score Prospects to receive a value and effort score for each domain." },
            { name: "Sort and prioritise", text: "Sort by highest value or easiest win to build your prioritised outreach list." },
          ],
          totalTime: "PT5M",
        }}
      />

      <PageHero
        eyebrow="Free Tool"
        title="Link Prospector"
        description="Paste a list of domains (with optional DA and traffic) to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan."
      />

      <div className="container mx-auto px-4 pb-2">
        <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Bulk-score backlink prospects from a pasted domain list and rank each by SEO value or acquisition effort — free, no account needed.
        </p>
      </div>

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
                    {clearConfirm ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600 font-medium">Clear all saved data?</span>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-xs font-semibold px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Yes, clear all
                        </button>
                        <button
                          type="button"
                          onClick={() => setClearConfirm(false)}
                          className="text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setClearConfirm(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
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
                    className={`w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${textareaTooLarge ? "border-red-400 focus:ring-red-400" : textareaNearLimit ? "border-amber-400 focus:ring-amber-400" : "border-input focus:ring-blue-500"}`}
                  />
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {textareaTooLarge ? (
                      <p className="text-[11px] text-red-500 font-medium">Input too large — trim to {MAX_TEXTAREA_HARD.toLocaleString()} characters or fewer.</p>
                    ) : textareaNearLimit ? (
                      <p className="text-[11px] text-amber-600">Approaching {MAX_TEXTAREA_HARD.toLocaleString()} character limit.</p>
                    ) : (
                      <span />
                    )}
                    <p className={`text-[11px] tabular-nums shrink-0 ${textareaTooLarge ? "text-red-500 font-medium" : textareaNearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
                      {textarea.length.toLocaleString()} / {MAX_TEXTAREA_HARD.toLocaleString()}
                    </p>
                  </div>
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
                    disabled={textareaTooLarge}
                    className={`flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isRunning ? "animate-pulse" : ""}`}
                  >
                    <Sparkles className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                    {isRunning ? "Processing…" : "Run Bulk Estimate"}
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
                    {/* Target Score threshold */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Min Score
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={minScore}
                        onChange={(e) => setMinScore(e.target.value)}
                        className="w-14 h-6 px-1.5 text-xs rounded border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 text-slate-700 bg-white"
                      />
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
                    {/* Filter by Staleness */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1">
                        {(
                          [
                            { key: "overdue",  label: "Overdue",  title: "No contact or last contacted > 30 days ago",  activeCls: "bg-red-600 text-white border-red-600",    inactiveCls: "border-red-200 text-red-600 hover:border-red-400" },
                            { key: "due_soon", label: "Due Soon", title: "Last contacted 14–30 days ago",                activeCls: "bg-amber-500 text-white border-amber-500", inactiveCls: "border-amber-200 text-amber-600 hover:border-amber-400" },
                            { key: "recent",   label: "Recent",   title: "Last contacted within the last 14 days",       activeCls: "bg-emerald-600 text-white border-emerald-600", inactiveCls: "border-emerald-200 text-emerald-700 hover:border-emerald-400" },
                          ] as const
                        ).map(({ key, label, title, activeCls, inactiveCls }) => (
                          <button
                            key={key}
                            type="button"
                            title={title}
                            onClick={() => setFilterStaleness(filterStaleness === key ? "" : key)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${filterStaleness === key ? activeCls : inactiveCls}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setSortKey("priority"); setSortDir("desc"); }}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${sortKey === "priority" && sortDir === "desc" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700"}`}
                      title="Sort by Priority Score (Value ÷ Difficulty) — surfaces the highest-return, easiest wins first"
                    >
                      <Trophy className="w-3 h-3" />
                      Easiest Wins
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSortKey("score"); setSortDir("desc"); }}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${sortKey === "score" && sortDir === "desc" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"}`}
                    >
                      Highest Value
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTimeline((v) => !v)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${showTimeline ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700"}`}
                      title="Toggle Outreach Timeline — audit trail of all status changes"
                    >
                      <Clock className="w-3 h-3" />
                      Timeline{timelineEvents.length > 0 && <span className={`ml-0.5 text-[10px] font-bold rounded-full px-1.5 ${showTimeline ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>{timelineEvents.length}</span>}
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
                    {/* ── Export CSV dropdown ── */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowExportDropdown((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${showExportDropdown ? "border-violet-400 text-violet-700 bg-violet-50" : "border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700"}`}
                        title="Export prospects as CSV"
                      >
                        <Download className="w-3 h-3" />
                        Export CSV
                        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showExportDropdown ? "rotate-180" : ""}`} />
                      </button>
                      {showExportDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowExportDropdown(false)} />
                          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[240px]">
                            <button
                              type="button"
                              onClick={() => { exportPitchCSV(); setShowExportDropdown(false); }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors"
                            >
                              <p className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                                <Download className="w-3 h-3 text-slate-500" />
                                Standard CSV
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-4">Full prospect data — scores, notes, status</p>
                            </button>
                            <div className="mx-3 my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              onClick={() => { exportCrmCSV(); setShowExportDropdown(false); }}
                              className="w-full text-left px-3.5 py-2 hover:bg-violet-50 transition-colors"
                            >
                              <p className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                                <Send className="w-3 h-3 text-violet-500" />
                                CRM Import
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">Lemlist / Hunter</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-4">Email, Company, Icebreaker, Website</p>
                            </button>
                            <div className="mx-3 my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              onClick={() => { copyMarkdownTable(); setShowExportDropdown(false); }}
                              className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 transition-colors"
                            >
                              <p className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-emerald-600" />
                                Copy as Markdown Table
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-4">Paste into Notion, GitHub, or any Markdown editor</p>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    {/* ── Saved Searches ── */}
                    <div className="relative">
                      <div className="flex items-center gap-1">
                        {showSaveSearchInput ? (
                          <>
                            <input
                              type="text"
                              placeholder="Name this view…"
                              value={saveSearchName}
                              onChange={(e) => setSaveSearchName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveCurrentSearch();
                                if (e.key === "Escape") { setShowSaveSearchInput(false); setSaveSearchName(""); }
                              }}
                              autoFocus
                              className="text-[11px] w-28 px-2 py-1 rounded-full border border-indigo-300 focus:border-indigo-500 focus:outline-none text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={saveCurrentSearch}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                            >Save</button>
                            <button
                              type="button"
                              onClick={() => { setShowSaveSearchInput(false); setSaveSearchName(""); }}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowSaveSearchInput(true)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-all"
                            title="Save current filters and sort as a named preset"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            Save View
                          </button>
                        )}
                        {savedSearches.length > 0 && !showSaveSearchInput && (
                          <button
                            type="button"
                            onClick={() => setShowSavedSearchDropdown((v) => !v)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-all"
                          >
                            <Bookmark className="w-3 h-3" />
                            Saved ({savedSearches.length})
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {showSavedSearchDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowSavedSearchDropdown(false)} />
                          <div className="absolute left-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                            {savedSearches.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 group/saved"
                              >
                                <button
                                  type="button"
                                  onClick={() => applySearch(s)}
                                  className="text-[11px] font-medium text-slate-700 text-left flex-1 truncate"
                                  title={`Status: ${s.filterStatus || "all"} · Min: ${s.minScore || "—"} · Sort: ${s.sortKey} ${s.sortDir}`}
                                >
                                  {s.name}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSearch(s.id)}
                                  className="ml-2 opacity-0 group-hover/saved:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                  title="Delete this saved search"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
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

                {/* ── Follow-up Alert Banner ── */}
                <AnimatePresence>
                  {followUpProspects.length > 0 && !dismissedFollowUp && (
                    <motion.div
                      key="followup-alert"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 flex-wrap px-3.5 py-2.5 mb-3 rounded-lg border border-amber-300 bg-amber-50 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {followUpProspects.length} emailed prospect{followUpProspects.length !== 1 ? "s have" : " has"} not replied in {FOLLOW_UP_DAYS}+ days
                      </span>
                      <span className="w-px h-4 bg-amber-300 shrink-0" />
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStatus("emailed");
                          setFilterStaleness("overdue");
                          setDismissedFollowUp(true);
                        }}
                        className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border border-amber-400 text-amber-800 bg-amber-100 hover:bg-amber-200 transition-all whitespace-nowrap"
                      >
                        <Filter className="w-3 h-3" />
                        Show these
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedFollowUp(true)}
                        className="ml-auto text-amber-500 hover:text-amber-700 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bulk Actions bar — visible when ≥1 row selected */}
                <AnimatePresence>
                  {selectedDomains.size > 0 && (
                    <motion.div
                      key="bulk-bar"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 flex-wrap px-3 py-2 mb-3 rounded-lg border border-indigo-200 bg-indigo-50 text-[11px]"
                    >
                      <span className="font-semibold text-indigo-700">
                        {selectedDomains.size} prospect{selectedDomains.size !== 1 ? "s" : ""} selected
                      </span>
                      <span className="w-px h-4 bg-indigo-200 shrink-0" />
                      <span className="font-medium text-indigo-500 whitespace-nowrap">Bulk action:</span>
                      <button
                        type="button"
                        onClick={() => bulkSetSelectedStatus("emailed")}
                        className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all whitespace-nowrap"
                      >
                        <Mail className="w-3 h-3" />
                        Mark as Pitch Sent
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetSelectedStatus("shortlisted")}
                        className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-all whitespace-nowrap"
                      >
                        <Bookmark className="w-3 h-3" />
                        Move to Shortlist
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetSelectedStatus("ignored")}
                        className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-all whitespace-nowrap"
                      >
                        <X className="w-3 h-3" />
                        Mark as Ignored
                      </button>
                      <span className="w-px h-4 bg-indigo-200 shrink-0" />
                      <button
                        type="button"
                        onClick={exportSelectedCSV}
                        className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 transition-all whitespace-nowrap"
                        title={`Download CSV for ${selectedDomains.size} selected prospect${selectedDomains.size !== 1 ? "s" : ""}`}
                      >
                        <Download className="w-3 h-3" />
                        Export Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDomains(new Set())}
                        className="ml-auto text-indigo-400 hover:text-indigo-600 font-semibold px-2 py-1 transition-colors"
                        title="Clear selection"
                      >
                        Clear
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                          <div className={`flex items-center justify-between px-3 py-2 rounded-full border font-semibold text-xs ${STATUS_STYLES[status]}`}>
                            <span>{STATUS_LABELS[status]}</span>
                            <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{col.length}</span>
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
                                    className={`flex-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all truncate ${STATUS_STYLES[statusMap[r.domain] ?? "not_started"]}`}
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
                          <th className="w-8 px-3 py-2.5">
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              checked={allVisibleSelected}
                              onChange={() => {
                                if (allVisibleSelected) {
                                  setSelectedDomains((prev) => {
                                    const next = new Set(prev);
                                    filteredSorted.forEach((r) => next.delete(r.domain));
                                    return next;
                                  });
                                } else {
                                  setSelectedDomains((prev) => {
                                    const next = new Set(prev);
                                    filteredSorted.forEach((r) => next.add(r.domain));
                                    return next;
                                  });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer accent-indigo-600"
                              title="Select all visible prospects"
                            />
                          </th>
                          <th className={thCls("priority")} onClick={() => handleSort("priority")} title="Priority Score = Est. Value ÷ Difficulty — higher means a better ROI for your outreach effort">
                            <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" /><Sparkles className="w-3 h-3 text-violet-400" />Priority <SortIcon col="priority" active={sortKey} dir={sortDir} /></span>
                          </th>
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
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5 min-w-[160px]">
                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-violet-400" />Suggested Topic</span>
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5 min-w-[140px]">
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3 text-slate-400" />Last Contacted</span>
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5 min-w-[100px]">
                            <span className="flex items-center gap-1">Days Since</span>
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2.5 min-w-[160px]">
                            <span className="flex items-center gap-1"><NotebookPen className="w-3 h-3 text-slate-400" />Notes</span>
                          </th>
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
                            className={`hover:bg-slate-50/80 transition-colors group ${selectedDomains.has(r.domain) ? "bg-indigo-50/60" : ""}`}
                          >
                            <td className="px-3 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={selectedDomains.has(r.domain)}
                                onChange={() => toggleSelectDomain(r.domain)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer accent-indigo-600"
                              />
                            </td>
                            <td className="px-3 py-3">
                              {(() => {
                                const p = computePriority(r);
                                const pCls =
                                  p >= 400 ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : p >= 200 ? "bg-orange-50 text-orange-600 border-orange-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200";
                                return (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${pCls}`} title={`Priority Score: ${p.toFixed(0)} = $${r.linkValue.min} ÷ ${r.acquisition.stars} (${r.acquisition.label})`}>
                                    <Trophy className="w-2.5 h-2.5" />
                                    {p.toFixed(0)}
                                  </span>
                                );
                              })()}
                            </td>
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
                                {/* Domain with site-preview tooltip */}
                                <div
                                  className="relative group/domain"
                                  onMouseEnter={() => fetchPreview(r.domain)}
                                >
                                  <a
                                    href={`https://${r.domain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold text-slate-800 text-sm hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
                                  >
                                    {r.domain}
                                  </a>
                                  {/* Tooltip card */}
                                  <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-50 w-72 opacity-0 group-hover/domain:opacity-100 transition-opacity duration-150">
                                    <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-left">
                                      {!previewMap[r.domain] ? (
                                        <p className="text-[11px] text-slate-400 italic">Hover to load preview…</p>
                                      ) : previewMap[r.domain].loading ? (
                                        <div className="flex items-center gap-2">
                                          <svg className="animate-spin w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                          </svg>
                                          <span className="text-[11px] text-slate-400">Loading preview…</span>
                                        </div>
                                      ) : previewMap[r.domain].error ? (
                                        <p className="text-[11px] text-slate-400 italic">Preview unavailable</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <p className="text-[12px] font-semibold text-slate-800 leading-snug line-clamp-2">
                                            {previewMap[r.domain].title || <span className="italic text-slate-400">No title found</span>}
                                          </p>
                                          {previewMap[r.domain].description && (
                                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                                              {previewMap[r.domain].description}
                                            </p>
                                          )}
                                          <p className="text-[10px] text-blue-500 font-medium">{r.domain}</p>
                                        </div>
                                      )}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute left-4 bottom-[-5px] w-2.5 h-2.5 rotate-45 border-r border-b border-slate-200 bg-white" />
                                  </div>
                                </div>
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
                              <div className="relative group/difficulty flex items-center gap-1.5">
                                <span className="flex cursor-default">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                      key={si}
                                      className={`w-3 h-3 ${si < r.acquisition.stars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                                    />
                                  ))}
                                </span>
                                <span className="text-[11px] text-slate-500">{r.acquisition.label}</span>
                                {/* Dark tooltip */}
                                <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-50 w-64 opacity-0 group-hover/difficulty:opacity-100 transition-opacity duration-150">
                                  <div className="rounded-lg bg-slate-900 border border-slate-700 shadow-xl px-3 py-2.5 text-left">
                                    <p className="text-[11px] font-semibold text-white leading-snug mb-1">
                                      {r.acquisition.stars >= 5
                                        ? "High Authority"
                                        : r.acquisition.stars <= 2
                                        ? "High Opportunity"
                                        : "Moderate Difficulty"}
                                    </p>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                      {r.acquisition.stars >= 5
                                        ? "These sites have strict editorial standards."
                                        : r.acquisition.stars <= 2
                                        ? "Higher likelihood of outreach success based on current metrics."
                                        : r.acquisition.strategyTip}
                                    </p>
                                  </div>
                                  <div className="absolute left-4 bottom-[-5px] w-2.5 h-2.5 rotate-45 border-r border-b border-slate-700 bg-slate-900" />
                                </div>
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
                            {/* Suggested Topic cell */}
                            <td className="px-3 py-3 max-w-[220px]">
                              {editingTopicDomain === r.domain ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={suggestedTopicMap[r.domain] ?? ""}
                                  onChange={(e) => updateTopic(r.domain, e.target.value)}
                                  onBlur={() => setEditingTopicDomain(null)}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingTopicDomain(null); }}
                                  className="w-full text-[11px] px-2 py-1 rounded-md border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 text-slate-700 bg-white"
                                />
                              ) : suggestedTopicMap[r.domain] ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingTopicDomain(r.domain)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors text-left leading-tight cursor-text group/topic"
                                  title="Click to edit topic"
                                >
                                  <Sparkles className="w-2.5 h-2.5 shrink-0 text-violet-400" />
                                  <span className="line-clamp-2">{suggestedTopicMap[r.domain]}</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-300 italic">
                                  <svg className="animate-spin w-2.5 h-2.5 text-violet-300" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                  </svg>
                                  Generating…
                                </span>
                              )}
                            </td>
                            {/* Last Contacted cell */}
                            <td className="px-3 py-3">
                              <Popover
                                open={openDatePickerDomain === r.domain}
                                onOpenChange={(open) => setOpenDatePickerDomain(open ? r.domain : null)}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-md border whitespace-nowrap transition-colors ${
                                      contactedDateMap[r.domain]
                                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                        : "border-slate-200 bg-transparent text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Set last contacted date"
                                  >
                                    <CalendarIcon className="w-3 h-3 shrink-0" />
                                    {contactedDateMap[r.domain]
                                      ? new Date(contactedDateMap[r.domain] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
                                      : <span className="italic">Set date</span>
                                    }
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={contactedDateMap[r.domain] ? new Date(contactedDateMap[r.domain] + "T00:00:00") : undefined}
                                    onSelect={(date) => updateContactedDate(r.domain, date)}
                                    initialFocus
                                  />
                                  {contactedDateMap[r.domain] && (
                                    <div className="px-3 pb-3">
                                      <button
                                        type="button"
                                        onClick={() => updateContactedDate(r.domain, undefined)}
                                        className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        Clear date
                                      </button>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </td>
                            {/* Days Since Last Contact cell */}
                            <td className="px-3 py-3">
                              {(() => {
                                const dateStr = contactedDateMap[r.domain];
                                if (!dateStr) return <span className="text-[11px] text-slate-300 italic">—</span>;
                                const contacted = new Date(dateStr + "T00:00:00");
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const days = Math.round((today.getTime() - contacted.getTime()) / 86_400_000);
                                const cls =
                                  days < 14
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : days <= 30
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200";
                                const label = days === 0 ? "Today" : days === 1 ? "1 day" : `${days}d`;
                                return (
                                  <span
                                    className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}
                                    title={`Last contacted ${days} day${days !== 1 ? "s" : ""} ago`}
                                  >
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            {/* Notes cell */}
                            <td className="px-3 py-3 max-w-[200px]">
                              <input
                                type="text"
                                value={notesMap[r.domain] ?? ""}
                                onChange={(e) => updateNote(r.domain, e.target.value)}
                                placeholder="Add a note…"
                                className="w-full text-[11px] px-2 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 text-slate-600 placeholder:text-slate-300 bg-transparent hover:bg-white hover:border-slate-300 transition-colors"
                              />
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

                {/* Outreach Timeline panel */}
                <AnimatePresence>
                  {showTimeline && (
                    <motion.div
                      key="timeline"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden mt-4"
                    >
                      <Card className="border border-indigo-100 bg-white shadow-md">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                Outreach Timeline
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Full audit trail of every status change across all prospects
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {timelineEvents.length > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const header = "Domain,From,To,Date,Time\n";
                                      const rows = timelineEvents.map((evt) => {
                                        const d = new Date(evt.timestamp);
                                        return [
                                          evt.domain,
                                          STATUS_LABELS[evt.from],
                                          STATUS_LABELS[evt.to],
                                          d.toLocaleDateString(),
                                          d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
                                        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
                                      });
                                      const csv = header + rows.join("\n");
                                      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `outreach-timeline-${new Date().toISOString().slice(0, 10)}.csv`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                      toast("Timeline exported", { duration: 2000 });
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                                    title="Download timeline as CSV"
                                  >
                                    Export CSV
                                  </button>
                                  <span className="text-slate-200 text-[10px]">·</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTimelineEvents([]);
                                      try { localStorage.removeItem(LS_TIMELINE_KEY); } catch {}
                                      toast("Timeline cleared", { duration: 2000 });
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                                  >
                                    Clear all
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowTimeline(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {timelineEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-300">
                              <Clock className="w-8 h-8 opacity-40" />
                              <p className="text-xs font-medium text-slate-400">No activity yet</p>
                              <p className="text-[11px] text-slate-300 text-center max-w-[240px]">
                                Status changes will appear here as you update prospects. Every click is logged.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-0 max-h-80 overflow-y-auto pr-1">
                              {timelineEvents.map((evt, idx) => {
                                const isFirst = idx === 0;
                                const date = new Date(evt.timestamp);
                                const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                                const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                                const fromStyle = STATUS_STYLES[evt.from];
                                const toStyle = STATUS_STYLES[evt.to];
                                return (
                                  <div key={evt.id} className="flex items-start gap-3 group/evt">
                                    {/* Timeline spine */}
                                    <div className="flex flex-col items-center shrink-0 pt-1">
                                      <div className={`w-2 h-2 rounded-full border-2 ${isFirst ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"}`} />
                                      {idx < timelineEvents.length - 1 && (
                                        <div className="w-px flex-1 bg-slate-100 mt-0.5 min-h-[24px]" />
                                      )}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 pb-4 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-800 truncate">{evt.domain}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${fromStyle}`}>{STATUS_LABELS[evt.from]}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${toStyle}`}>{STATUS_LABELS[evt.to]}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{dateStr} at {timeStr}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

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

          <ToolSEOEnhancements
            toolSlug="link-prospector"
            toolName="Link Prospector"
            methodologyTitle="How the Link Prospector Scores Domains"
            methodologyText="The Link Prospector bulk-scores each domain in your list using the same three-factor weighted formula as the Backlink Value Estimator — Domain Authority (40%), estimated organic traffic (35%), and topical relevance to fintech (25%) — applied in batch mode. Domains are auto-detected from common paste formats (one-per-line, comma-separated, or URL-formatted). The scored list is then sorted by highest value or easiest acquisition to help you prioritise your outreach campaign."
            accuracyNote="The prospector scores domains based on your input data. DA figures should be sourced from Moz Link Explorer or Ahrefs. Organic traffic estimates can be sourced from Semrush or SimilarWeb. Score dedicated fintech publications at 8–10 relevance, general business media at 5–7, and unrelated domains at 1–4. The tool processes up to 50 domains per batch."
            lastUpdated="May 2026"
            processingNote="All scoring runs client-side — your domain lists never leave your browser."
            useCases={[
              { industry: "Fintech SEO Agencies", role: "Link Building Teams", benefit: "Link building teams at fintech agencies score full outreach lists in one session — prioritising the top 20% of high-value prospects before a campaign begins and filtering out low-DA noise automatically." },
              { industry: "Digital PR & Comms Teams", role: "PR Managers", benefit: "Fintech PR managers score journalists' publication domains after receiving media coverage — determining whether to invest in cultivating the journalist relationship based on the domain's long-term backlink value." },
              { industry: "Embedded Finance", role: "Partnership & BD Teams", benefit: "Embedded finance partnership teams evaluate potential co-marketing domains — scoring partner websites before agreeing to content collaborations or joint case studies that include backlinks." },
              { industry: "WealthTech & Robo-Advisory", role: "Content Marketing Teams", benefit: "WealthTech content teams evaluate financial influencer and blogger domains before pitching guest content — confirming each prospect's authority and relevance justify the content creation effort." },
            ]}
            faq={[
              { question: "Is the Link Prospector free?", answer: "Yes — the FintechPressHub Link Prospector is free to use with no account required." },
              { question: "How many domains can I score with the Link Prospector?", answer: "You can paste and score a list of domains in one batch. It is designed for bulk evaluation so you can prioritise an entire outreach list in a single session." },
              { question: "Can I export my scored prospect list?", answer: "Yes — once scored, you can copy the prioritised list and paste it into any spreadsheet or outreach CRM to begin your link-building campaign." },
            ]}
            citationUrls={[
              { label: "Link Building — Wikipedia", url: "https://en.wikipedia.org/wiki/Link_building" },
              { label: "Domain Authority — Wikipedia", url: "https://en.wikipedia.org/wiki/Domain_authority" },
            ]}
          />
          <ToolShareEmbed slug="link-prospector" state={{ textarea }} />
        </div>
      </section>

      {/* ── Draft Pitch Side Panel (Sheet) ── */}
      <Sheet open={pitchModal !== null} onOpenChange={(open) => { if (!open) setPitchModal(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden"
        >
          {pitchModal && (
            <>
              {/* Header */}
              <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <NotebookPen className="w-4 h-4 text-violet-600 shrink-0" />
                      Draft Pitch
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {pitchModal.domain}
                    </SheetDescription>
                  </div>
                  <SheetClose className="shrink-0 mt-0.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <X className="w-4 h-4" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>
              </SheetHeader>

              {/* Site stats strip */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Site Stats</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-2 text-center">
                    <p className={`text-base font-black leading-none ${SCORE_COLOR(pitchModal.score)}`}>{pitchModal.score}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Score</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-2 text-center">
                    <p className="text-base font-black leading-none text-slate-800">{pitchModal.da > 0 ? pitchModal.da : "—"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">DA</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-2 text-center">
                    <p className="text-base font-black leading-none text-slate-800">{pitchModal.traffic > 0 ? fmtNum(pitchModal.traffic) : "—"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Traffic</p>
                  </div>
                  <div className="rounded-lg bg-white border border-violet-100 px-3 py-2 text-center">
                    <p className="text-sm font-black leading-none text-violet-700">{fmtMoney(pitchModal.linkValue.min)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Est. Value</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`w-3 h-3 ${si < pitchModal.acquisition.stars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{pitchModal.acquisition.label} to acquire</span>
                  <span className="mx-1 text-slate-200">·</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SCORE_BG(pitchModal.score)}`}>{pitchModal.label}</span>
                </div>
              </div>

              {/* Subject line variant cards */}
              {(() => {
                const variants = generatePitchSubjectVariants(pitchModal);
                const scores = variants.map((v) => scorePitchSubject(v, pitchModal.domain));
                const recommendedIdx = scores[0] >= scores[1] ? 0 : 1;
                const CIRC_R = 30;
                const CIRC_C = 2 * Math.PI * CIRC_R;
                const gaugeColor = (s: number) =>
                  s >= 75 ? "#10b981" : s >= 55 ? "#3b82f6" : s >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <div className="px-5 pt-4 pb-2 border-b border-slate-100 shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                      Generated Subject Lines
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {variants.map((v, idx) => {
                        const score = scores[idx];
                        const isRec = idx === recommendedIdx;
                        const isSelected = selectedPitchSubjectIdx === idx;
                        const offset = CIRC_C * (1 - score / 100);
                        const color = gaugeColor(score);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPitchSubjectIdx(idx as 0 | 1)}
                            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                              isSelected
                                ? "border-violet-400 bg-violet-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
                            }`}
                          >
                            {isRec && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white whitespace-nowrap tracking-wide">
                                Recommended
                              </span>
                            )}
                            {/* Circular gauge */}
                            <div className="relative flex items-center justify-center mt-1">
                              <svg width="64" height="64" viewBox="0 0 70 70" className="-rotate-90">
                                <circle cx="35" cy="35" r={CIRC_R} fill="none" stroke="#f1f5f9" strokeWidth="6" />
                                <circle
                                  cx="35" cy="35" r={CIRC_R}
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeDasharray={CIRC_C}
                                  strokeDashoffset={offset}
                                  style={{ transition: "stroke-dashoffset 0.45s ease" }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-black leading-none" style={{ color }}>{score}</span>
                                <span className="text-[8px] font-semibold text-slate-400 leading-none mt-0.5">/100</span>
                              </div>
                            </div>
                            {/* Open rate estimate */}
                            <p className="text-[10px] font-semibold text-slate-500 leading-none">
                              {subjectScoreToOpenRate(score)}
                            </p>
                            {/* Subject text */}
                            <p className="text-[11px] font-semibold text-slate-700 leading-snug text-center line-clamp-3">
                              {v}
                            </p>
                            {/* Variant label */}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? "bg-violet-200 text-violet-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              Variant {idx === 0 ? "A" : "B"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Editable email template */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Template</p>
                <textarea
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value)}
                  className="w-full h-full min-h-[220px] text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 leading-relaxed"
                  spellCheck={false}
                />
                <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
                  Replace <span className="font-mono bg-slate-100 px-1 rounded">[Your Name]</span> and other placeholders before sending.
                </p>
              </div>

              {/* Footer actions */}
              <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pitchText).then(() => {
                      setCopyTemplateState("copied");
                      setTimeout(() => setCopyTemplateState("idle"), 2000);
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all ${
                    copyTemplateState === "copied"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 bg-white"
                  }`}
                >
                  {copyTemplateState === "copied" ? (
                    <><Check className="w-3.5 h-3.5" />Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" />Copy</>
                  )}
                </button>
                <a
                  href={`mailto:info@${pitchModal.domain}?subject=${encodeURIComponent(generatePitchSubjectVariants(pitchModal)[selectedPitchSubjectIdx])}&body=${encodeURIComponent(pitchText.replace(/^Subject:[^\n]*\n\n?/, "").trim())}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  title={`Open email client with draft to info@${pitchModal.domain}`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send via Email
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
