import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetAuthorSubscriberDetail,
  getGetAuthorSubscriberDetailQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Lock,
  LogOut,
  Download,
  ArrowLeft,
  Mail,
  TrendingUp,
  Calendar,
  ExternalLink,
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

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

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

export default function AdminAuthorSubscribers() {
  const [, params] = useRoute<{ slug: string }>(
    "/admin/authors/:slug/subscribers",
  );
  const slug = params?.slug ?? "";

  const { user, isLoading: authLoading, isAuthenticated, login, logout } =
    useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const detailQuery = useGetAuthorSubscriberDetail(slug, {
    query: {
      queryKey: getGetAuthorSubscriberDetailQueryKey(slug),
      enabled: Boolean(slug) && isAuthenticated && isAdmin,
    },
  });

  const chartData = useMemo(
    () =>
      (detailQuery.data?.dailySignups ?? []).map((d) => ({
        date: d.date,
        count: d.count,
      })),
    [detailQuery.data],
  );

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
          <Link href="/admin/authors/subscribers">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to all authors
            </Button>
          </Link>
          <Card className="border-destructive/50">
            <CardContent className="pt-8 pb-8 text-center">
              <h1 className="text-2xl font-bold mb-2">Author not found</h1>
              <p className="text-muted-foreground">
                We couldn't find an author with the slug{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">
                  {slug}
                </code>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { author, subscribers, dailySignups } = detailQuery.data;
  const last7Total = dailySignups
    .slice(-7)
    .reduce((s, d) => s + d.count, 0);
  const csvUrl = `/api/admin/authors/${author.authorSlug}/subscribers.csv`;

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/admin/authors/subscribers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to all authors
          </Button>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={author.authorPhoto} alt={author.authorName} />
              <AvatarFallback className="bg-[#0052FF]/10 text-[#0052FF]">
                {authorInitials(author.authorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
                Subscriber dashboard
              </div>
              <h1 className="text-3xl font-bold">{author.authorName}</h1>
              <p className="text-sm text-muted-foreground">{author.authorRole}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/authors/${author.authorSlug}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1.5" /> View profile
              </Button>
            </Link>
            <a href={csvUrl} download data-testid="export-csv">
              <Button
                size="sm"
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                disabled={subscribers.length === 0}
              >
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
            </a>
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
                {author.subscriberCount.toLocaleString()}
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
                {author.last30DayCount.toLocaleString()}
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
                {last7Total.toLocaleString()}
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
            {subscribers.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No signups yet — share{" "}
                <Link
                  href={`/authors/${author.authorSlug}`}
                  className="underline mx-1"
                >
                  this author's profile
                </Link>{" "}
                to start collecting opt-ins.
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
                        id="signupGradient"
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
                      fill="url(#signupGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-semibold">Subscribers</h2>
              <span className="text-xs text-muted-foreground">
                {subscribers.length}{" "}
                {subscribers.length === 1 ? "person" : "people"}
              </span>
            </div>
            {subscribers.length === 0 ? (
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
                    {subscribers.map((s) => (
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
