import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListBulkNoIndexAudit,
  getListBulkNoIndexAuditQueryKey,
  type BulkNoIndexAuditEntry,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  EyeOff,
  Eye,
  Clock,
  User as UserIcon,
  RefreshCw,
} from "lucide-react";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function modeBadge(mode: string) {
  const isHide = mode === "noindex";
  return (
    <Badge
      variant={isHide ? "secondary" : "outline"}
      className={
        isHide
          ? "bg-slate-100 text-slate-800 border-slate-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
      data-testid={`audit-mode-${mode}`}
    >
      {isHide ? (
        <>
          <EyeOff className="w-3 h-3 mr-1" /> No-index
        </>
      ) : (
        <>
          <Eye className="w-3 h-3 mr-1" /> Re-index
        </>
      )}
    </Badge>
  );
}

function AuditRow({ entry }: { entry: BulkNoIndexAuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  // Anchor straight to the API — session cookie travels with the request
  // and the server sets `Content-Disposition: attachment` so the browser
  // saves it without navigating away from this page.
  const csvHref = `/api/admin/audit/bulk-noindex/${entry.id}/csv`;
  const previewPosts = expanded
    ? entry.posts ?? []
    : (entry.posts ?? []).slice(0, 5);
  const remainder = (entry.posts?.length ?? 0) - previewPosts.length;

  return (
    <Card data-testid={`audit-entry-${entry.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {modeBadge(entry.mode)}
              {entry.snoozeDays != null && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-200"
                >
                  <Clock className="w-3 h-3 mr-1" /> Snooze {entry.snoozeDays}d
                </Badge>
              )}
              <span
                className="text-sm text-muted-foreground"
                title={new Date(entry.createdAt).toISOString()}
              >
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
            <div className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <UserIcon className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">
                {entry.actorEmail}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <Stat
                label="Posts changed"
                value={formatNumber(entry.updatedCount)}
                testid={`audit-${entry.id}-updated`}
              />
              <Stat
                label="Requested"
                value={formatNumber(entry.requestedSlugCount)}
                testid={`audit-${entry.id}-requested`}
              />
              <Stat
                label={
                  entry.mode === "noindex"
                    ? "Views hidden"
                    : "Views re-exposed"
                }
                value={formatNumber(entry.totalViewsHidden)}
                testid={`audit-${entry.id}-views`}
              />
              <Stat
                label="Snooze"
                value={
                  entry.snoozeDays != null
                    ? `${entry.snoozeDays}d`
                    : "—"
                }
                testid={`audit-${entry.id}-snooze`}
              />
            </div>
          </div>
          <div className="shrink-0">
            <Button asChild size="sm" variant="outline">
              <a
                href={csvHref}
                download
                data-testid={`audit-csv-${entry.id}`}
              >
                <Download className="w-4 h-4 mr-1.5" /> CSV
              </a>
            </Button>
          </div>
        </div>

        {previewPosts.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Affected posts
            </div>
            <ul className="space-y-1.5">
              {previewPosts.map((p) => (
                <li
                  key={p.slug}
                  className="text-sm flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    <a
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {p.title}
                    </a>{" "}
                    <code className="text-xs text-muted-foreground">
                      {p.slug}
                    </code>
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatNumber(p.viewCount)} views
                  </span>
                </li>
              ))}
            </ul>
            {remainder > 0 && (
              <button
                type="button"
                className="mt-2 text-xs text-primary hover:underline"
                onClick={() => setExpanded(true)}
              >
                Show {remainder} more
              </button>
            )}
            {expanded && (entry.posts?.length ?? 0) > 5 && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground hover:underline ml-3"
                onClick={() => setExpanded(false)}
              >
                Collapse
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  testid,
}: {
  label: string;
  value: string;
  testid?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums" data-testid={testid}>
        {value}
      </div>
    </div>
  );
}

export default function AdminAuditLog() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "noindex" | "reindex">("all");

  // Wouter's effect-based redirect — gate the page after auth resolves so
  // we don't render admin data to a logged-out user even for a flash.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    } else if (!authLoading && user && !user.isAdmin) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  const query = useListBulkNoIndexAudit(
    { limit: 200 },
    {
      query: {
        enabled: !!user?.isAdmin,
        queryKey: getListBulkNoIndexAuditQueryKey({ limit: 200 }),
      },
    },
  );

  const entries = useMemo(() => {
    const all = query.data ?? [];
    if (filter === "all") return all;
    return all.filter((e) => e.mode === filter);
  }, [query.data, filter]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
          </Link>
          <h1 className="text-3xl font-bold">Bulk no-index audit log</h1>
          <p className="text-muted-foreground mt-1">
            Every confirmed bulk no-index / re-index batch, newest first.
            Re-download the CSV for any past batch — the snapshot is taken
            at the time the action ran, so the export reflects the posts
            (and view counts) as they were when the change happened.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          data-testid="audit-refresh"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4" role="tablist">
        {(["all", "noindex", "reindex"] as const).map((m) => (
          <Button
            key={m}
            variant={filter === m ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(m)}
            data-testid={`audit-filter-${m}`}
          >
            {m === "all"
              ? `All${
                  query.data ? ` (${query.data.length})` : ""
                }`
              : m === "noindex"
                ? "No-index only"
                : "Re-index only"}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-muted-foreground">Loading audit entries…</p>
      ) : query.isError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load audit log:{" "}
              {query.error instanceof Error
                ? query.error.message
                : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No bulk no-index actions have been recorded yet. Run one from the admin posts list and it will appear here."
                : `No ${filter} batches yet.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <AuditRow key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
