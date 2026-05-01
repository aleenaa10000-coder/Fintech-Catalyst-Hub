import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
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
} from "recharts";
import {
  ArrowLeft,
  BarChart2,
  Eye,
  FileText,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";

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

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageMeta title="Analytics — Admin" />

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
