import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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

function estimateOne(domain: string, daRaw: number, trafficRaw: number): ProspectResult {
  const da = Math.min(100, Math.max(0, daRaw));
  const traffic = Math.max(0, trafficRaw);

  let score = 0;
  let daContrib = 0;
  let trafficContrib = 0;
  let relevanceContrib = 15;
  let linkTypeContrib = 10;
  let placementContrib = 5;

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

  score = daContrib + trafficContrib + relevanceContrib + linkTypeContrib + placementContrib;
  score = Math.max(1, Math.min(100, score));

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

function parseLine(line: string): { domain: string; da: number; traffic: number } | null {
  const raw = line.trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim());
  const domain = parts[0];
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
  const [statusMap, setStatusMap] = useState<Record<string, OutreachStatus>>(() => {
    try {
      const stored = localStorage.getItem(LS_STATUS_KEY);
      return stored ? (JSON.parse(stored) as Record<string, OutreachStatus>) : {};
    } catch { return {}; }
  });

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
    setResults(parsed.map((p) => estimateOne(p.domain, p.da, p.traffic)));
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
    setTextarea("");
    setResults([]);
    setRan(false);
    setError("");
    setCopied(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("data");
    window.history.replaceState(null, "", url.toString());
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
    const rows = sorted.map((r) => [
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
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Paste Your Prospects</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      One per line. Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">domain,DA,monthlyTraffic</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

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
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    {results.length} prospect{results.length !== 1 ? "s" : ""} scored
                  </h3>
                  <div className="flex items-center gap-2">
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
                      onClick={downloadCsv}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-all"
                      title="Download results as CSV"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                    <Link
                      href={buildPitchUrl(sorted[0])}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-all"
                      title={`Draft an outreach email for ${sorted[0].domain}`}
                    >
                      <Mail className="w-3 h-3" />
                      Pitch Top Prospect
                    </Link>
                  </div>
                </div>

                <Card className="border border-slate-100 shadow-sm overflow-hidden">
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
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sorted.map((r, i) => (
                          <motion.tr
                            key={r.domain}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${SCORE_BG(r.score)}`}>
                                <span className={`text-base font-black ${SCORE_COLOR(r.score)}`}>{r.score}</span>
                                <span className="text-[10px] font-medium opacity-70">{r.label}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-semibold text-slate-800 text-sm">{r.domain}</span>
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
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={buildPitchUrl(r)}>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md text-violet-600 hover:text-violet-700 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all whitespace-nowrap"
                                    title={`Draft outreach email for ${r.domain}`}
                                  >
                                    <Mail className="w-3 h-3" />
                                    Pitch
                                  </button>
                                </Link>
                                <Link href={buildEstimatorUrl(r)}>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
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
    </div>
  );
}
