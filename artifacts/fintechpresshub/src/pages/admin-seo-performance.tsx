import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link2Off,
  Link2,
  RefreshCw,
  FileText,
  TrendingUp,
} from "lucide-react";

interface SeoPost {
  id: number;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  viewCount: number;
  noIndex: boolean;
  noindexUntil: string | null;
  lastSeoPingAt: string | null;
  lastSeoPingStatus: string | null;
  hasSeoTitle: boolean;
  hasSeoDescription: boolean;
  hasSeoOgImage: boolean;
  isBroken: boolean | null;
  lastStatusCode: number | null;
  brokenSince: string | null;
  lastCheckedAt: string | null;
}

interface SeoData {
  summary: {
    totalPublished: number;
    totalIndexed: number;
    totalHidden: number;
    pingAccepted: number;
    pingPending: number;
    brokenLinks: number;
  };
  statusBreakdown: Record<string, number>;
  posts: SeoPost[];
}

type SortKey =
  | "title"
  | "viewCount"
  | "publishedAt"
  | "noIndex"
  | "lastSeoPingStatus"
  | "lastSeoPingAt"
  | "metaScore"
  | "isBroken";
type SortDir = "asc" | "desc";
type FilterKey = "all" | "indexed" | "hidden" | "ping_issue" | "broken";

async function fetchSeoPerformance(): Promise<SeoData> {
  const res = await fetch("/api/admin/seo-performance", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<SeoData>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function metaScore(post: SeoPost): number {
  return (
    (post.hasSeoTitle ? 1 : 0) +
    (post.hasSeoDescription ? 1 : 0) +
    (post.hasSeoOgImage ? 1 : 0)
  );
}

function PingBadge({ status }: { status: string | null }) {
  if (!status || status === "not_pinged") {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Clock className="w-3 h-3" /> Not pinged
      </Badge>
    );
  }
  if (status === "accepted") {
    return (
      <Badge className="text-xs gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle2 className="w-3 h-3" /> Accepted
      </Badge>
    );
  }
  if (status === "skipped_no_key") {
    return (
      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" /> No key
      </Badge>
    );
  }
  return (
    <Badge className="text-xs gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
      <XCircle className="w-3 h-3" /> {status}
    </Badge>
  );
}

function MetaScoreDots({ post }: { post: SeoPost }) {
  const items = [
    { label: "SEO title", has: post.hasSeoTitle },
    { label: "Meta description", has: post.hasSeoDescription },
    { label: "OG image", has: post.hasSeoOgImage },
  ];
  return (
    <div className="flex items-center gap-1" title={items.map((i) => `${i.label}: ${i.has ? "✓" : "✗"}`).join(" · ")}>
      {items.map((i) => (
        <span
          key={i.label}
          className={`w-2 h-2 rounded-full ${i.has ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground tabular-nums">
        {items.filter((i) => i.has).length}/3
      </span>
    </div>
  );
}

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (col !== sortKey)
    return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="w-3 h-3 ml-1" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1" />
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  accent?: "green" | "red" | "amber" | "blue";
}) {
  const iconClass =
    accent === "green"
      ? "text-emerald-600 bg-emerald-50"
      : accent === "red"
        ? "text-red-600 bg-red-50"
        : accent === "amber"
          ? "text-amber-600 bg-amber-50"
          : "text-primary bg-primary/10";
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2.5 ${iconClass}`}>
            <Icon className="w-5 h-5" />
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

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All posts",
  indexed: "Indexed",
  hidden: "Hidden (no-index)",
  ping_issue: "Ping issues",
  broken: "Broken links",
};

export default function AdminSeoPerformance() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<SeoData>({
      queryKey: ["admin-seo-performance"],
      queryFn: fetchSeoPerformance,
      enabled: !!user?.isAdmin,
      staleTime: 2 * 60 * 1000,
    });

  const [sortKey, setSortKey] = useState<SortKey>("viewCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  const filteredPosts = useMemo(() => {
    if (!data) return [];
    let posts = data.posts;

    if (search.trim()) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (filter === "indexed") posts = posts.filter((p) => !p.noIndex);
    else if (filter === "hidden") posts = posts.filter((p) => p.noIndex);
    else if (filter === "ping_issue")
      posts = posts.filter(
        (p) =>
          !p.lastSeoPingStatus ||
          p.lastSeoPingStatus === "error" ||
          p.lastSeoPingStatus === "rejected",
      );
    else if (filter === "broken") posts = posts.filter((p) => p.isBroken);

    return [...posts].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "viewCount") cmp = a.viewCount - b.viewCount;
      else if (sortKey === "publishedAt")
        cmp =
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      else if (sortKey === "noIndex")
        cmp = Number(a.noIndex) - Number(b.noIndex);
      else if (sortKey === "lastSeoPingStatus")
        cmp = (a.lastSeoPingStatus ?? "").localeCompare(
          b.lastSeoPingStatus ?? "",
        );
      else if (sortKey === "lastSeoPingAt")
        cmp =
          new Date(a.lastSeoPingAt ?? 0).getTime() -
          new Date(b.lastSeoPingAt ?? 0).getTime();
      else if (sortKey === "metaScore") cmp = metaScore(a) - metaScore(b);
      else if (sortKey === "isBroken")
        cmp = Number(a.isBroken ?? false) - Number(b.isBroken ?? false);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, filter, search, sortKey, sortDir]);

  const ThBtn = ({
    col,
    children,
  }: {
    col: SortKey;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
    >
      {children}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  return (
    <>
      <PageMeta
        title="SEO Performance — Admin"
        description="Content indexing health, IndexNow ping status, and per-post SEO metadata completeness."
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">SEO Performance</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Indexing health, IndexNow ping status &amp; metadata completeness across published posts
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-muted-foreground">
            Loading SEO data…
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Failed to load SEO performance data.
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                label="Published"
                value={data.summary.totalPublished}
                icon={FileText}
                accent="blue"
              />
              <StatCard
                label="Indexed"
                value={data.summary.totalIndexed}
                icon={Eye}
                accent="green"
                sub="visible to search engines"
              />
              <StatCard
                label="Hidden"
                value={data.summary.totalHidden}
                icon={EyeOff}
                accent={data.summary.totalHidden > 0 ? "amber" : undefined}
                sub="no-index flag set"
              />
              <StatCard
                label="Ping Accepted"
                value={data.summary.pingAccepted}
                icon={CheckCircle2}
                accent="green"
                sub="IndexNow confirmed"
              />
              <StatCard
                label="Not Yet Pinged"
                value={data.summary.pingPending}
                icon={Clock}
                accent={data.summary.pingPending > 0 ? "amber" : undefined}
                sub="awaiting first ping"
              />
              <StatCard
                label="Broken Links"
                value={data.summary.brokenLinks}
                icon={Link2Off}
                accent={data.summary.brokenLinks > 0 ? "red" : undefined}
                sub="from link health check"
              />
            </div>

            {/* Ping status breakdown */}
            {Object.keys(data.statusBreakdown).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    IndexNow Ping Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(data.statusBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, cnt]) => (
                        <div
                          key={status}
                          className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                        >
                          <PingBadge status={status === "not_pinged" ? null : status} />
                          <span className="font-semibold tabular-nums">{cnt}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters + search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posts…"
                  className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className={filter === f ? "bg-[#0052FF] hover:bg-[#0040cc]" : ""}
                  >
                    {FILTER_LABELS[f]}
                    {f !== "all" && data && (
                      <span className="ml-1.5 opacity-70 tabular-nums text-xs">
                        {f === "indexed"
                          ? data.summary.totalIndexed
                          : f === "hidden"
                            ? data.summary.totalHidden
                            : f === "ping_issue"
                              ? data.posts.filter(
                                  (p) =>
                                    !p.lastSeoPingStatus ||
                                    p.lastSeoPingStatus === "error" ||
                                    p.lastSeoPingStatus === "rejected",
                                ).length
                              : data.summary.brokenLinks}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left">
                      <ThBtn col="title">Post</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      <ThBtn col="viewCount">Views</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="noIndex">Index</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="lastSeoPingStatus">Ping status</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="lastSeoPingAt">Last ping</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="metaScore">SEO meta</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="isBroken">Link health</ThBtn>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <ThBtn col="publishedAt">Published</ThBtn>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPosts.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No posts match the current filter.
                      </td>
                    </tr>
                  )}
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.slug}
                      className={`hover:bg-muted/30 transition-colors ${post.isBroken ? "bg-red-50/40" : ""}`}
                    >
                      {/* Post title + slug */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium truncate leading-snug">
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {post.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {post.category}
                          </span>
                          <a
                            href={`/admin/blog?slug=${post.slug}`}
                            className="text-xs text-blue-600 hover:underline shrink-0"
                          >
                            Edit
                          </a>
                        </div>
                      </td>

                      {/* Views */}
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {post.viewCount.toLocaleString()}
                      </td>

                      {/* Index status */}
                      <td className="px-3 py-3">
                        {post.noIndex ? (
                          <Badge className="text-xs gap-1 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                            <EyeOff className="w-3 h-3" /> Hidden
                            {post.noindexUntil && (
                              <span className="ml-0.5 opacity-70">
                                until {new Date(post.noindexUntil).toLocaleDateString()}
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <Badge className="text-xs gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <Eye className="w-3 h-3" /> Indexed
                          </Badge>
                        )}
                      </td>

                      {/* Ping status */}
                      <td className="px-3 py-3">
                        <PingBadge status={post.lastSeoPingStatus} />
                      </td>

                      {/* Last ping */}
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(post.lastSeoPingAt)}
                      </td>

                      {/* SEO meta completeness */}
                      <td className="px-3 py-3">
                        <MetaScoreDots post={post} />
                      </td>

                      {/* Link health */}
                      <td className="px-3 py-3">
                        {post.lastCheckedAt === null ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Not checked
                          </span>
                        ) : post.isBroken ? (
                          <span className="text-xs text-red-700 flex items-center gap-1">
                            <Link2Off className="w-3 h-3" />
                            {post.lastStatusCode ?? "Error"}
                            {post.brokenSince && (
                              <span className="text-muted-foreground">
                                · {timeAgo(post.brokenSince)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            OK
                            <span className="text-muted-foreground">
                              · {timeAgo(post.lastCheckedAt)}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Published date */}
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(post.publishedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPosts.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {filteredPosts.length} post
                {filteredPosts.length !== 1 ? "s" : ""} shown
                {filter !== "all" || search
                  ? ` (filtered from ${data.posts.length})`
                  : ""}
              </p>
            )}

            {/* Data source note */}
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p>
                      <strong>Views</strong> are counted from direct page visits tracked
                      in-app. <strong>Ping status</strong> reflects IndexNow submissions
                      to Bing, Yandex, and other participating engines — not Google.{" "}
                      <strong>Link health</strong> is updated by the daily sitemap
                      link-checker job.
                    </p>
                    <p>
                      For Google organic clicks, impressions, and average position, connect
                      Google Search Console and add the GSC API integration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
