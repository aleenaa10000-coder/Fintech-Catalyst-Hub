import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetNewsletterSubscribers,
  getGetNewsletterSubscribersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lock,
  LogOut,
  Download,
  Mail,
  TrendingUp,
  Calendar,
  FileText,
  Inbox,
  Building2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageMeta } from "@/components/PageMeta";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">
        {new Date(label).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      <div className="text-[#0052FF]">
        {payload[0].value} new {payload[0].value === 1 ? "signup" : "signups"}
      </div>
    </div>
  );
}

export default function AdminNewsletter() {
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    login,
    logout,
  } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const detailQuery = useGetNewsletterSubscribers({
    query: {
      queryKey: getGetNewsletterSubscribersQueryKey(),
      enabled: isAuthenticated && isAdmin,
    },
  });

  const chartData = useMemo(
    () =>
      (detailQuery.data?.dailySignups ?? []).map((d: { date: string; count: number }) => ({
        date: d.date,
        count: d.count,
      })),
    [detailQuery.data],
  );

  const briefLeads = useMemo(() => {
    return (detailQuery.data?.subscribers ?? [])
      .filter((s: { source: string | null }) => s.source?.startsWith("content-brief-request"))
      .map((s: { id: number; email: string | null; createdAt: string; source: string | null; briefStatus: string | null; briefStatusUpdatedAt: string | null }) => ({
        ...s,
        businessName: s.source?.split("|")[1]?.trim() ?? "—",
      }));
  }, [detailQuery.data]);

  type SeoBriefLead = { id: number; email: string | null; createdAt: string; source: string | null; keyword: string | null; briefStatus: string | null; briefStatusUpdatedAt: string | null };

  const seoBriefLeads = useMemo(() => {
    return (detailQuery.data?.subscribers ?? []).filter(
      (s: { source: string | null }) => s.source === "seo-brief",
    ) as SeoBriefLead[];
  }, [detailQuery.data]);

  const [kwFilter, setKwFilter] = useState("");
  type SeoSort = { col: "keyword" | "createdAt"; dir: "asc" | "desc" };
  const [seoSort, setSeoSort] = useState<SeoSort>({ col: "createdAt", dir: "desc" });

  const toggleSort = useCallback((col: SeoSort["col"]) => {
    setSeoSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  }, []);

  const topKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of seoBriefLeads) {
      const kw = lead.keyword?.trim().toLowerCase();
      if (kw) counts[kw] = (counts[kw] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [seoBriefLeads]);

  const displayedSeoBriefLeads = useMemo(() => {
    const q = kwFilter.trim().toLowerCase();
    const filtered = q
      ? seoBriefLeads.filter((l) => l.keyword?.toLowerCase().includes(q))
      : seoBriefLeads;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (seoSort.col === "keyword") {
        cmp = (a.keyword ?? "").localeCompare(b.keyword ?? "");
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return seoSort.dir === "asc" ? cmp : -cmp;
    });
  }, [seoBriefLeads, kwFilter, seoSort]);

  // Optimistic status map: id → status (overrides server value while PATCH is in-flight / confirmed)
  const [leadStatuses, setLeadStatuses] = useState<Record<number, string>>({});
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  const updateLeadStatus = useCallback(async (id: number, status: string) => {
    setLeadStatuses((prev) => ({ ...prev, [id]: status }));
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/admin/newsletter/brief-leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
    } catch {
      // On failure, revert
      setLeadStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setUpdatingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin sign in required</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to view this dashboard.
            </p>
            <Button
              size="lg"
              onClick={login}
              className="bg-[#0052FF] hover:bg-[#0040cc]"
            >
              Log in with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-6">
              You're signed in as{" "}
              <strong className="text-foreground">
                {user?.email ?? user?.firstName ?? "this account"}
              </strong>
              , but this account is not on the admin allowlist.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading subscribers…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-destructive/50">
            <CardContent className="pt-8 pb-8 text-center">
              <h1 className="text-2xl font-bold mb-2">Couldn't load subscribers</h1>
              <p className="text-muted-foreground">
                Something went wrong fetching the subscriber list. Try
                refreshing the page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;
  const csvUrl = `/api/admin/newsletter/subscribers.csv`;

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminNewsletter" />
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
              Subscriber dashboard
            </div>
            <h1 className="text-3xl font-bold">Newsletter subscribers</h1>
            <p className="text-sm text-muted-foreground">
              Master list across every signup source — homepage form, blog
              footer, financial health calculator, author opt-ins.
            </p>
          </div>
          <div className="flex gap-2">
            <a href={csvUrl} download data-testid="export-csv">
              <Button
                size="sm"
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                disabled={detail.subscribers.length === 0}
              >
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3 h-3" /> Total subscribers
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid="stat-total"
              >
                {detail.totalCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Last 30 days
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid="stat-30d"
              >
                {detail.last30DayCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Last 7 days
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid="stat-7d"
              >
                {detail.last7DayCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-semibold">Signups over time</h2>
              <span className="text-xs text-muted-foreground">
                Last 90 days
              </span>
            </div>
            {detail.subscribers.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No signups yet.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="newsletterSignupGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0052FF"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0052FF"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      minTickGap={32}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0052FF"
                      strokeWidth={2}
                      fill="url(#newsletterSignupGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Content Brief Leads ─────────────────────────────────────────── */}
        <Card className="mb-8 border-violet-200/70 bg-violet-50/30">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">Content Brief Leads</h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Submitted via the Headline Analyzer brief request modal
                  </p>
                </div>
                {briefLeads.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                    {briefLeads.length}
                  </span>
                )}
              </div>
              {briefLeads.length > 0 && (
                <a
                  href={`/api/admin/newsletter/subscribers.csv`}
                  download
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export all leads CSV
                </a>
              )}
            </div>

            {briefLeads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No content brief requests yet.</p>
                <p className="text-xs text-muted-foreground/70">
                  When users request a brief from the Headline Analyzer, their lead appears here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Business / Name</th>
                      <th className="py-2 pr-4 font-medium">Requested</th>
                      <th className="py-2 pr-6 font-medium">Status</th>
                      <th className="py-2 font-medium">Reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {briefLeads.map((lead) => {
                      const effectiveStatus = leadStatuses[lead.id] ?? lead.briefStatus ?? "new";
                      const isUpdating = updatingIds.has(lead.id);

                      const statusMeta: Record<string, { label: string; pill: string; dot: string }> = {
                        new:         { label: "New",         pill: "bg-sky-100 text-sky-700 ring-sky-200",       dot: "bg-sky-400" },
                        in_progress: { label: "In Progress", pill: "bg-amber-100 text-amber-700 ring-amber-200", dot: "bg-amber-400" },
                        sent:        { label: "Sent",        pill: "bg-indigo-100 text-indigo-700 ring-indigo-200", dot: "bg-indigo-400" },
                        actioned:    { label: "Actioned",    pill: "bg-emerald-100 text-emerald-700 ring-emerald-200", dot: "bg-emerald-400" },
                      };
                      const meta = statusMeta[effectiveStatus] ?? statusMeta["new"];

                      return (
                        <tr
                          key={lead.id}
                          className="border-b border-violet-50 last:border-b-0 hover:bg-violet-50/40 transition-colors"
                          data-testid={`brief-lead-row-${lead.id}`}
                        >
                          <td className="py-3 pr-4 font-mono text-xs">
                            {lead.email}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium text-foreground">
                                {lead.businessName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            <span title={formatDateTime(lead.createdAt)}>
                              {formatDate(lead.createdAt)}
                            </span>
                          </td>
                          <td className="py-3 pr-6">
                            <div className="flex flex-col gap-1.5">
                              {/* Current status pill */}
                              <span className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${meta.pill} ${isUpdating ? "opacity-60" : ""}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                {meta.label}
                                {isUpdating && <span className="ml-0.5 animate-spin text-[8px]">↻</span>}
                              </span>
                              {/* Status button group */}
                              <div className="flex gap-1 flex-wrap">
                                {(["new", "in_progress", "sent", "actioned"] as const).map((s) => {
                                  const sm = statusMeta[s];
                                  const isActive = effectiveStatus === s;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={isActive || isUpdating}
                                      onClick={() => updateLeadStatus(lead.id, s)}
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                        isActive
                                          ? `${sm.pill} ring-1 cursor-default`
                                          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white"
                                      } disabled:opacity-50`}
                                    >
                                      {sm.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <a
                              href={`mailto:${lead.email}?subject=Your%20FintechPressHub%20Content%20Brief&body=Hi%20${encodeURIComponent(lead.businessName)}%2C%0A%0AThank%20you%20for%20requesting%20your%20personalised%20SEO%20content%20brief.%20Here%20it%20is%3A%0A%0A`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900 transition-colors"
                            >
                              <Mail className="w-3 h-3" /> Reply
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── SEO Brief Leads ─────────────────────────────────────────────── */}
        <Card id="seo-brief-leads" className="mb-8 border-violet-200/70 bg-violet-50/30">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">SEO Brief Leads</h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Submitted via the Keyword Difficulty Estimator PDF download modal
                  </p>
                </div>
                {seoBriefLeads.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                    {seoBriefLeads.length}
                  </span>
                )}
              </div>
            </div>

            {topKeywords.length > 0 && (
              <div className="mb-5 p-4 rounded-xl bg-white border border-violet-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Top Researched Keywords</p>
                <div className="space-y-2">
                  {topKeywords.map(({ keyword, count }, i) => {
                    const maxCount = topKeywords[0]!.count;
                    const pct = Math.round((count / maxCount) * 100);
                    const isFiltered = kwFilter.trim().toLowerCase() === keyword;
                    return (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => setKwFilter(isFiltered ? "" : keyword)}
                        className={`w-full text-left group transition-all ${isFiltered ? "opacity-100" : "hover:opacity-90"}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-medium truncate max-w-[80%] ${isFiltered ? "text-violet-700" : "text-slate-700"}`}>
                            {i + 1}. {keyword}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground ml-2 shrink-0">
                            {count} {count === 1 ? "lead" : "leads"}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-violet-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isFiltered ? "bg-violet-600" : "bg-violet-400 group-hover:bg-violet-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {kwFilter && topKeywords.some(k => k.keyword === kwFilter.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => setKwFilter("")}
                    className="mt-3 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    ← Show all leads
                  </button>
                )}
              </div>
            )}

            {seoBriefLeads.length > 0 && (
              <div className="relative mb-4 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by keyword…"
                  value={kwFilter}
                  onChange={(e) => setKwFilter(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-violet-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 placeholder:text-muted-foreground"
                />
                {kwFilter && (
                  <button
                    type="button"
                    onClick={() => setKwFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {seoBriefLeads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No SEO brief leads yet.</p>
                <p className="text-xs text-muted-foreground/70">
                  When users download an SEO Strategy Brief from the Keyword Difficulty Estimator, their email appears here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort("keyword")}
                          className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                        >
                          Keyword
                          {seoSort.col === "keyword" ? (
                            seoSort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-2 pr-4 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort("createdAt")}
                          className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                        >
                          Submitted
                          {seoSort.col === "createdAt" ? (
                            seoSort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-2 pr-6 font-medium">Status</th>
                      <th className="py-2 font-medium">Reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSeoBriefLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground italic">
                          No leads match "{kwFilter}"
                        </td>
                      </tr>
                    ) : null}
                    {displayedSeoBriefLeads.map((lead) => {
                      const effectiveStatus = leadStatuses[lead.id] ?? lead.briefStatus ?? "new";
                      const isUpdating = updatingIds.has(lead.id);

                      const statusMeta: Record<string, { label: string; pill: string; dot: string }> = {
                        new:         { label: "New",         pill: "bg-sky-100 text-sky-700 ring-sky-200",           dot: "bg-sky-400" },
                        in_progress: { label: "In Progress", pill: "bg-amber-100 text-amber-700 ring-amber-200",     dot: "bg-amber-400" },
                        sent:        { label: "Sent",        pill: "bg-indigo-100 text-indigo-700 ring-indigo-200",  dot: "bg-indigo-400" },
                        actioned:    { label: "Actioned",    pill: "bg-emerald-100 text-emerald-700 ring-emerald-200", dot: "bg-emerald-400" },
                      };
                      const meta = statusMeta[effectiveStatus] ?? statusMeta["new"];

                      return (
                        <tr
                          key={lead.id}
                          className="border-b border-violet-50 last:border-b-0 hover:bg-violet-50/40 transition-colors"
                        >
                          <td className="py-3 pr-4 font-mono text-xs">{lead.email}</td>
                          <td className="py-3 pr-4 text-xs max-w-[180px]">
                            {lead.keyword ? (
                              <span className="inline-block truncate max-w-full font-medium text-slate-700" title={lead.keyword}>
                                {lead.keyword}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            <span title={formatDateTime(lead.createdAt)}>
                              {formatDate(lead.createdAt)}
                            </span>
                          </td>
                          <td className="py-3 pr-6">
                            <div className="flex flex-col gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${meta.pill} ${isUpdating ? "opacity-60" : ""}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                {meta.label}
                                {isUpdating && <span className="ml-0.5 animate-spin text-[8px]">↻</span>}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {(["new", "in_progress", "sent", "actioned"] as const).map((s) => {
                                  const sm = statusMeta[s];
                                  const isActive = effectiveStatus === s;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={isActive || isUpdating}
                                      onClick={() => updateLeadStatus(lead.id, s)}
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                        isActive
                                          ? `${sm.pill} ring-1 cursor-default`
                                          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white"
                                      } disabled:opacity-50`}
                                    >
                                      {sm.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <a
                              href={`mailto:${lead.email}?subject=Your%20FintechPressHub%20SEO%20Strategy%20Brief&body=Hi%2C%0A%0AThank%20you%20for%20downloading%20your%20SEO%20Strategy%20Brief%20from%20FintechPressHub.%20I%20wanted%20to%20follow%20up%20personally%20and%20see%20if%20there%E2%80%99s%20anything%20we%20can%20help%20you%20with.%0A%0A`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900 transition-colors"
                            >
                              <Mail className="w-3 h-3" /> Reply
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── All Subscribers ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-semibold">All Subscribers</h2>
              <span className="text-xs text-muted-foreground">
                {detail.subscribers.length}{" "}
                {detail.subscribers.length === 1 ? "person" : "people"}
              </span>
            </div>
            {detail.subscribers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No subscribers yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Subscribed</th>
                      <th className="py-2 pr-4 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.subscribers.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b last:border-b-0"
                        data-testid={`subscriber-row-${s.id}`}
                      >
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {s.email}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          <span title={formatDateTime(s.createdAt)}>
                            {formatDate(s.createdAt)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {s.source ? (
                            <code className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
                              {s.source}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
