import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useListAuthorSubscriberSummary,
  getListAuthorSubscriberSummaryQueryKey,
  type AuthorSubscriberSummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, LogOut, Mail, ArrowRight, TrendingUp } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function SummaryCard({ row }: { row: AuthorSubscriberSummary }) {
  return (
    <Link
      href={`/admin/authors/${row.authorSlug}/subscribers`}
      data-testid={`author-summary-${row.authorSlug}`}
    >
      <Card className="group hover:border-[#0052FF]/50 hover:shadow-md transition-all cursor-pointer h-full">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={row.authorPhoto} alt={row.authorName} />
              <AvatarFallback className="bg-[#0052FF]/10 text-[#0052FF]">
                {authorInitials(row.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{row.authorName}</div>
              <div className="text-xs text-muted-foreground truncate">
                {row.authorRole}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#0052FF] transition-colors shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3 h-3" /> Total
              </div>
              <div
                className="text-2xl font-bold tabular-nums"
                data-testid={`total-${row.authorSlug}`}
              >
                {row.subscriberCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Last 30d
              </div>
              <div
                className="text-2xl font-bold tabular-nums"
                data-testid={`recent-${row.authorSlug}`}
              >
                {row.last30DayCount.toLocaleString()}
              </div>
            </div>
          </div>

          {row.latestSubscribedAt && (
            <div className="text-xs text-muted-foreground mt-4">
              Latest signup{" "}
              {new Date(row.latestSubscribedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminAuthorsSubscribers() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } =
    useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const summaryQuery = useListAuthorSubscriberSummary({
    query: {
      queryKey: getListAuthorSubscriberSummaryQueryKey(),
      enabled: isAuthenticated && isAdmin,
    },
  });

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
              You need to sign in to view per-author subscriber dashboards.
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

  const rows = summaryQuery.data ?? [];
  const totalSubscribers = rows.reduce((s, r) => s + r.subscriberCount, 0);
  const totalRecent = rows.reduce((s, r) => s + r.last30DayCount, 0);

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-2">
            Admin / Subscribers
          </div>
          <h1 className="text-3xl font-bold mb-2">Author subscriber lists</h1>
          <p className="text-muted-foreground max-w-2xl">
            Each card shows how many readers have opted in to follow that
            author specifically. Click through to see the full subscriber list,
            a 90-day signup chart, and to export a CSV for email sends.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Total opt-ins
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid="total-all-authors"
              >
                {totalSubscribers.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Across all authors
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Last 30 days
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid="recent-all-authors"
              >
                {totalRecent.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                New author follows
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Authors
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {rows.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                With opt-in lists
              </div>
            </CardContent>
          </Card>
        </div>

        {summaryQuery.isLoading && (
          <p className="text-muted-foreground">Loading subscriber counts…</p>
        )}
        {summaryQuery.isError && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 pb-6 text-sm text-destructive">
              Couldn't load subscriber summary. Try refreshing the page.
            </CardContent>
          </Card>
        )}
        {!summaryQuery.isLoading && rows.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              No authors found.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <SummaryCard key={row.authorSlug} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
