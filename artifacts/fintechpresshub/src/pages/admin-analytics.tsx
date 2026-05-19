import { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { useListBlogPosts } from "@workspace/api-client-react";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  ArrowLeft,
  BarChart2,
  Eye,
  FileText,
  Users,
  TrendingUp,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  fleschKincaidGrade,
  gradeToBand,
  BAND_COLORS,
  BAND_LABELS,
} from "@/lib/readability";

interface AnalyticsData {
  overview: {
    totalPosts: number;
    totalViews: number;
    avgViewsPerPost: number;
    totalSubscribers: number;
  };
  topPosts: {
    slug: string;
    title: string;
    category: string;
    viewCount: number;
    publishedAt: string;
  }[];
  viewsByCategory: {
    category: string;
    totalViews: number;
    postCount: number;
  }[];
  postsByMonth: { month: string; post_count: number; total_views: number }[];
  subscribersByMonth: { month: string; new_subscribers: number }[];
  velocityByWeek: { week_start: string; published: number; scheduled: number }[];
}

const CATEGORY_COLORS = [
  "#0052FF",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold mt-0.5">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  if (!year || !month) return ym;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function formatWeek(dateStr: string): string {
  // dateStr is YYYY-MM-DD (Monday of the ISO week)
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Returns the ISO week Monday (YYYY-MM-DD) for the current week. */
function currentISOWeekMonday(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d2 = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d2}`;
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/admin/analytics", { credentials: "include" });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
  return res.json() as Promise<AnalyticsData>;
}

export default function AdminAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
    enabled: !!user?.isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPosts } = useListBlogPosts(undefined, {
    query: { queryKey: ["admin-analytics-blog-posts"], enabled: !!user?.isAdmin, staleTime: 5 * 60 * 1000 },
  });

  const readabilityTrend = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    const byMonth = new Map<string, { sum: number; count: number }>();
    for (const post of allPosts) {
      const grade = fleschKincaidGrade(post.content ?? "");
      if (grade === null) continue;
      const month = (post.publishedAt ?? "").slice(0, 7);
      if (!month) continue;
      const entry = byMonth.get(month) ?? { sum: 0, count: 0 };
      byMonth.set(month, { sum: entry.sum + grade, count: entry.count + 1 });
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, { sum, count }]) => ({
        month: formatMonth(month),
        avgGrade: Math.round((sum / count) * 10) / 10,
        postCount: count,
      }));
  }, [allPosts]);

  const overallAvgGrade = useMemo(() => {
    if (readabilityTrend.length === 0) return null;
    const total = readabilityTrend.reduce(
      (acc, d) => ({
        sum: acc.sum + d.avgGrade * d.postCount,
        count: acc.count + d.postCount,
      }),
      { sum: 0, count: 0 },
    );
    return total.count > 0
      ? Math.round((total.sum / total.count) * 10) / 10
      : null;
  }, [readabilityTrend]);

  const gradeChange = useMemo(() => {
    if (readabilityTrend.length < 2) return null;
    const prev = readabilityTrend[readabilityTrend.length - 2].avgGrade;
    const curr = readabilityTrend[readabilityTrend.length - 1].avgGrade;
    return Math.round((curr - prev) * 10) / 10;
  }, [readabilityTrend]);

  const categoryReadability = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    const byCat = new Map<string, { sum: number; count: number }>();
    for (const post of allPosts) {
      const grade = fleschKincaidGrade(post.content ?? "");
      if (grade === null) continue;
      const cat = post.category || "Uncategorised";
      const entry = byCat.get(cat) ?? { sum: 0, count: 0 };
      byCat.set(cat, { sum: entry.sum + grade, count: entry.count + 1 });
    }
    return Array.from(byCat.entries())
      .map(([category, { sum, count }]) => ({
        category,
        avgGrade: Math.round((sum / count) * 10) / 10,
        postCount: count,
      }))
      .sort((a, b) => a.avgGrade - b.avgGrade);
  }, [allPosts]);

  /**
   * For each of the last 12 months, count how many published posts fell
   * into each FK grade band. Used for the stacked "band mix" bar chart so
   * editors can see whether the *distribution* is shifting toward easier
   * writing — not just whether the average moved.
   */
  const readabilityBandByMonth = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    const byMonth = new Map<
      string,
      { elementary: number; middle: number; high: number; college: number }
    >();
    for (const post of allPosts) {
      const grade = fleschKincaidGrade(post.content ?? "");
      if (grade === null) continue;
      const month = (post.publishedAt ?? "").slice(0, 7);
      if (!month) continue;
      const entry = byMonth.get(month) ?? {
        elementary: 0,
        middle: 0,
        high: 0,
        college: 0,
      };
      const band = gradeToBand(grade);
      if (band) entry[band]++;
      byMonth.set(month, entry);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, bands]) => ({
        month: formatMonth(month),
        ...bands,
        total: bands.elementary + bands.middle + bands.high + bands.college,
      }));
  }, [allPosts]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageMeta title="Analytics — Admin" noindex />

      <div className="mb-8">
        <Link
          href="/admin/blog"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="w-7 h-7" /> Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Content performance, subscriber growth, and publishing trends across
          the last 12 months.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading analytics…</span>
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Failed to load analytics data. Please try refreshing the page.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total page views"
              value={data.overview.totalViews}
              icon={Eye}
            />
            <StatCard
              label="Blog posts"
              value={data.overview.totalPosts}
              icon={FileText}
              sub={`Avg ${data.overview.avgViewsPerPost.toLocaleString()} views/post`}
            />
            <StatCard
              label="Newsletter subscribers"
              value={data.overview.totalSubscribers}
              icon={Users}
            />
            <StatCard
              label="Avg views per post"
              value={data.overview.avgViewsPerPost}
              icon={TrendingUp}
            />
          </div>

          {/* Velocity trend: published vs scheduled per week */}
          {data.velocityByWeek.length > 0 && (
            <Card className="mb-6">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Content velocity — 8-week lookback &amp; 8-week outlook
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Published posts (past) vs. scheduled posts (pipeline). The vertical line marks this week.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400 opacity-80" />
                      Published
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-sky-400 opacity-80" />
                      Scheduled
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart
                    data={data.velocityByWeek.map((d) => ({
                      week: formatWeek(d.week_start),
                      weekKey: d.week_start,
                      Published: d.published,
                      Scheduled: d.scheduled,
                    }))}
                    margin={{ top: 4, right: 12, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradPublished" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#34d399" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradScheduled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={1}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => [val, name]}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    {/* "This week" reference line */}
                    <ReferenceLine
                      x={formatWeek(currentISOWeekMonday())}
                      stroke="#94a3b8"
                      strokeDasharray="4 3"
                      label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Published"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gradPublished)"
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Scheduled"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="url(#gradScheduled)"
                      dot={{ r: 3, fill: "#0ea5e9" }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {data.postsByMonth.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                    Posts published — last 12 months
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data.postsByMonth.map((d) => ({
                        month: formatMonth(d.month),
                        Posts: d.post_count,
                      }))}
                      margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="Posts" fill="#0052FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {data.subscribersByMonth.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                    New subscribers — last 12 months
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={data.subscribersByMonth.map((d) => ({
                        month: formatMonth(d.month),
                        Subscribers: d.new_subscribers,
                      }))}
                      margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="Subscribers"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {data.viewsByCategory.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                    Views by category
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.viewsByCategory.map((d) => ({
                          name: d.category,
                          value: d.totalViews,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {data.viewsByCategory.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) =>
                          val.toLocaleString() + " views"
                        }
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {data.viewsByCategory.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                    Category breakdown
                  </h2>
                  <div className="space-y-2.5">
                    {data.viewsByCategory.map((cat, i) => {
                      const maxViews = data.viewsByCategory[0]?.totalViews ?? 1;
                      const pct = Math.round((cat.totalViews / maxViews) * 100);
                      return (
                        <div key={cat.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate max-w-[60%]">
                              {cat.category}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {cat.totalViews.toLocaleString()} views ·{" "}
                              {cat.postCount} post
                              {cat.postCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {data.topPosts.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Top posts by lifetime views
                </h2>
                <div className="divide-y">
                  {data.topPosts.map((post, i) => (
                    <div
                      key={post.slug}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6 shrink-0 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:text-primary text-sm line-clamp-1"
                        >
                          {post.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {post.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-sm font-semibold text-muted-foreground">
                        <Eye className="w-3.5 h-3.5" />
                        {post.viewCount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Readability trend */}
          {readabilityTrend.length > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Readability trend — avg Flesch-Kincaid grade level by month
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lower grade = more accessible writing. Target: grade 8–10 for a broad fintech audience.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs shrink-0">
                    {(["elementary", "middle", "high", "college"] as const).map(
                      (band) => (
                        <span key={band} className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: BAND_COLORS[band].hex }}
                          />
                          {BAND_LABELS[band]}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {overallAvgGrade !== null && (
                  <div className="flex flex-wrap gap-6 mb-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Overall avg grade</p>
                      <p
                        className="text-2xl font-bold"
                        style={{
                          color:
                            BAND_COLORS[gradeToBand(overallAvgGrade) ?? "middle"]
                              .hex,
                        }}
                      >
                        {overallAvgGrade}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {BAND_LABELS[gradeToBand(overallAvgGrade) ?? "middle"]}
                      </p>
                    </div>
                    {gradeChange !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">vs. prev month</p>
                        <p
                          className={`text-2xl font-bold ${
                            gradeChange < 0
                              ? "text-emerald-600"
                              : gradeChange > 0
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {gradeChange > 0 ? "+" : ""}
                          {gradeChange}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {gradeChange < 0
                            ? "easier to read"
                            : gradeChange > 0
                              ? "harder to read"
                              : "no change"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={readabilityTrend}
                    margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradReadability" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <ReferenceArea y1={1} y2={5.5} fill="#16a34a" fillOpacity={0.06} />
                    <ReferenceArea y1={5.5} y2={8.5} fill="#2563eb" fillOpacity={0.06} />
                    <ReferenceArea y1={8.5} y2={12.5} fill="#d97706" fillOpacity={0.06} />
                    <ReferenceArea y1={12.5} y2={18} fill="#dc2626" fillOpacity={0.06} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[1, 18]}
                      ticks={[1, 5, 8, 12, 16]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `Gr.${v}`}
                    />
                    <Tooltip
                      formatter={(val: number, _name: string) => [
                        `Grade ${val}`,
                        "Avg FK grade",
                      ]}
                      labelFormatter={(label: string) => label}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as {
                          avgGrade: number;
                          postCount: number;
                        };
                        const band = gradeToBand(d.avgGrade);
                        return (
                          <div className="rounded-lg border bg-background shadow-md px-3 py-2 text-sm">
                            <p className="font-semibold mb-1">{label}</p>
                            <p>
                              Avg grade:{" "}
                              <span
                                className="font-bold"
                                style={{
                                  color: band ? BAND_COLORS[band].hex : undefined,
                                }}
                              >
                                {d.avgGrade}
                              </span>
                            </p>
                            {band && (
                              <p className="text-muted-foreground text-xs">
                                {BAND_LABELS[band]}
                              </p>
                            )}
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {d.postCount} post{d.postCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={8}
                      stroke="#2563eb"
                      strokeDasharray="4 3"
                      strokeWidth={1}
                      label={{
                        value: "Target 8",
                        position: "insideTopRight",
                        fontSize: 10,
                        fill: "#2563eb",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgGrade"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, payload } = props as {
                          cx: number;
                          cy: number;
                          payload: { avgGrade: number };
                        };
                        const band = gradeToBand(payload.avgGrade);
                        const color = band ? BAND_COLORS[band].hex : "#6366f1";
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Readability band mix — stacked bar per month */}
          {readabilityBandByMonth.length > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Readability band mix — posts published per FK tier per month
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each bar shows how many posts landed in each grade band that month.
                      A shift toward green &amp; blue means writing is getting more accessible.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs shrink-0">
                    {(["elementary", "middle", "high", "college"] as const).map(
                      (band) => (
                        <span key={band} className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: BAND_COLORS[band].hex }}
                          />
                          {BAND_LABELS[band]}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={readabilityBandByMonth}
                    margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      label={{
                        value: "Posts",
                        angle: -90,
                        position: "insideLeft",
                        offset: 12,
                        style: { fontSize: 10, fill: "#94a3b8" },
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const bands = [
                          "college",
                          "high",
                          "middle",
                          "elementary",
                        ] as const;
                        const total = payload.reduce(
                          (s, p) => s + ((p.value as number) ?? 0),
                          0,
                        );
                        return (
                          <div className="rounded-lg border bg-background shadow-md px-3 py-2 text-sm min-w-[160px]">
                            <p className="font-semibold mb-1.5">{label}</p>
                            {bands.map((band) => {
                              const entry = payload.find(
                                (p) => p.dataKey === band,
                              );
                              const count = (entry?.value as number) ?? 0;
                              if (!count) return null;
                              return (
                                <div
                                  key={band}
                                  className="flex items-center gap-2 py-0.5"
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: BAND_COLORS[band].hex,
                                    }}
                                  />
                                  <span className="text-muted-foreground flex-1">
                                    {BAND_LABELS[band]}
                                  </span>
                                  <span className="font-medium tabular-nums">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                            <div className="mt-1.5 pt-1.5 border-t flex justify-between text-xs text-muted-foreground">
                              <span>Total</span>
                              <span className="font-medium tabular-nums text-foreground">
                                {total}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="elementary"
                      stackId="a"
                      fill={BAND_COLORS.elementary.hex}
                      radius={[0, 0, 3, 3]}
                      name="Elementary"
                    />
                    <Bar
                      dataKey="middle"
                      stackId="a"
                      fill={BAND_COLORS.middle.hex}
                      name="Middle school"
                    />
                    <Bar
                      dataKey="high"
                      stackId="a"
                      fill={BAND_COLORS.high.hex}
                      name="High school"
                    />
                    <Bar
                      dataKey="college"
                      stackId="a"
                      fill={BAND_COLORS.college.hex}
                      radius={[3, 3, 0, 0]}
                      name="College+"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Readability by category */}
          {categoryReadability.length > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Readability by category
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Average Flesch-Kincaid grade level per content category, sorted from most to least accessible.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryReadability.map((row) => {
                    const band = gradeToBand(row.avgGrade);
                    const colors = band ? BAND_COLORS[band] : BAND_COLORS.middle;
                    const pct = Math.min(
                      100,
                      Math.round(((row.avgGrade - 1) / 17) * 100),
                    );
                    return (
                      <div key={row.category}>
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: colors.hex }}
                          />
                          <span className="text-sm font-medium flex-1 truncate">
                            {row.category}
                          </span>
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: colors.hex }}
                          >
                            Gr.{row.avgGrade}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums w-16 text-right shrink-0">
                            {row.postCount} post{row.postCount !== 1 ? "s" : ""}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${colors.bg} ${colors.text}`}
                          >
                            {band ? BAND_LABELS[band] : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: colors.hex,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Bar length represents grade level relative to the 1–18 FK scale. Shorter = more accessible.
                </p>
              </CardContent>
            </Card>
          )}

          {data.topPosts.length === 0 && data.overview.totalPosts === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12 text-muted-foreground">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No data yet</p>
                <p className="text-sm mt-1">
                  Publish your first blog post to start seeing analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
