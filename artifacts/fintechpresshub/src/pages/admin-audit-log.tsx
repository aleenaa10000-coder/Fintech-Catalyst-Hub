import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListBulkNoIndexAudit,
  getListBulkNoIndexAuditQueryKey,
  type BulkNoIndexAuditEntry,
  type BulkNoIndexAuditPostSnapshot,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  EyeOff,
  Eye,
  Clock,
  User as UserIcon,
  RefreshCw,
  GitCompareArrows,
  ArrowRight,
  Minus,
  Plus,
  Equal,
  X,
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

interface AuditRowProps {
  entry: BulkNoIndexAuditEntry;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  selectionDisabled: boolean;
}

function AuditRow({
  entry,
  selected,
  onToggleSelect,
  selectionDisabled,
}: AuditRowProps) {
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
    <Card
      data-testid={`audit-entry-${entry.id}`}
      className={selected ? "ring-2 ring-primary/60" : undefined}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {/* Compare-select checkbox — disabled when 2 are already
              selected and this row isn't one of them, so the user can't
              accidentally select a third without first deselecting. */}
          <div className="pt-1 shrink-0">
            <Checkbox
              checked={selected}
              disabled={selectionDisabled && !selected}
              onCheckedChange={() => onToggleSelect(entry.id)}
              data-testid={`audit-compare-select-${entry.id}`}
              aria-label={`Select batch from ${formatDateTime(entry.createdAt)} for comparison`}
            />
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap flex-1 min-w-0">
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

/* ---------- Compare two batches ----------------------------------- */

interface DiffPost extends BulkNoIndexAuditPostSnapshot {
  /** True when this post appears in *both* selected batches. Used to
   *  call out posts whose state was flipped twice (e.g. hidden in A,
   *  re-exposed in B). */
  inOther: boolean;
}

interface DiffResult {
  older: BulkNoIndexAuditEntry;
  newer: BulkNoIndexAuditEntry;
  /** Posts that appeared in `older.posts` but not `newer.posts`. */
  onlyInOlder: DiffPost[];
  /** Posts that appeared in `newer.posts` but not `older.posts`. */
  onlyInNewer: DiffPost[];
  /** Posts touched by both batches — keyed by slug, value is the snapshot
   *  taken in the *newer* batch (so view counts reflect the most recent
   *  reading of the post). */
  inBoth: DiffPost[];
}

/**
 * Compute a slug-keyed diff between two audit entries. The diff is
 * directional — A is the *older* batch and B the *newer* one — so the
 * UI can phrase the result as "what changed between A and B" instead of
 * a symmetric set diff. View totals are recalculated per bucket from
 * the snapshot, not pulled from the audit row's `totalViewsHidden`,
 * because a post that appears in both batches is counted once per side
 * in `inBoth` (we use the newer snapshot's viewCount as the canonical
 * value).
 */
function diffAuditEntries(
  a: BulkNoIndexAuditEntry,
  b: BulkNoIndexAuditEntry,
): DiffResult {
  const aIsOlder = new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime();
  const older = aIsOlder ? a : b;
  const newer = aIsOlder ? b : a;
  const olderPosts = older.posts ?? [];
  const newerPosts = newer.posts ?? [];
  const olderSlugs = new Set(olderPosts.map((p) => p.slug));
  const newerSlugs = new Set(newerPosts.map((p) => p.slug));

  const onlyInOlder = olderPosts
    .filter((p) => !newerSlugs.has(p.slug))
    .map((p) => ({ ...p, inOther: false }));
  const onlyInNewer = newerPosts
    .filter((p) => !olderSlugs.has(p.slug))
    .map((p) => ({ ...p, inOther: false }));
  const inBoth = newerPosts
    .filter((p) => olderSlugs.has(p.slug))
    .map((p) => ({ ...p, inOther: true }));

  return { older, newer, onlyInOlder, onlyInNewer, inBoth };
}

function sumViews(posts: BulkNoIndexAuditPostSnapshot[]): number {
  return posts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
}

function CompareSummary({
  label,
  entry,
}: {
  label: string;
  entry: BulkNoIndexAuditEntry;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2 mb-1">
        {modeBadge(entry.mode)}
        {entry.snoozeDays != null && (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200"
          >
            <Clock className="w-3 h-3 mr-1" /> {entry.snoozeDays}d
          </Badge>
        )}
      </div>
      <div className="font-medium">{formatDateTime(entry.createdAt)}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {entry.actorEmail} · {entry.updatedCount} post
        {entry.updatedCount === 1 ? "" : "s"} ·{" "}
        {formatNumber(entry.totalViewsHidden)} views
      </div>
    </div>
  );
}

function DiffPostList({
  posts,
  emptyLabel,
  testid,
}: {
  posts: DiffPost[];
  emptyLabel: string;
  testid: string;
}) {
  if (posts.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground italic px-2 py-1.5"
        data-testid={`${testid}-empty`}
      >
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-1" data-testid={testid}>
      {posts.map((p) => (
        <li
          key={p.slug}
          className="text-sm flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/50"
        >
          <span className="truncate min-w-0">
            <a
              href={`/blog/${p.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {p.title}
            </a>{" "}
            <code className="text-xs text-muted-foreground">{p.slug}</code>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatNumber(p.viewCount)} views
          </span>
        </li>
      ))}
    </ul>
  );
}

function CompareDialog({
  entries,
  open,
  onClose,
}: {
  entries: [BulkNoIndexAuditEntry, BulkNoIndexAuditEntry] | null;
  open: boolean;
  onClose: () => void;
}) {
  const diff = useMemo(
    () => (entries ? diffAuditEntries(entries[0], entries[1]) : null),
    [entries],
  );

  if (!diff) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md" />
      </Dialog>
    );
  }

  const olderViews = sumViews(diff.onlyInOlder);
  const newerViews = sumViews(diff.onlyInNewer);
  const sharedViews = sumViews(diff.inBoth);

  // Direction hint: when older is "noindex" and newer is "reindex",
  // posts in "both" likely had their state reverted between batches.
  const looksLikeRevert =
    diff.older.mode !== diff.newer.mode && diff.inBoth.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5" />
            Compare batches
          </DialogTitle>
          <DialogDescription>
            Slug-level diff between two bulk no-index batches. The earlier
            batch is treated as the baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center mt-2">
          <CompareSummary label="Earlier (A)" entry={diff.older} />
          <ArrowRight className="hidden sm:block w-5 h-5 text-muted-foreground mx-auto" />
          <CompareSummary label="Later (B)" entry={diff.newer} />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div className="rounded-md border bg-amber-50/60 border-amber-200 p-3 text-center">
            <div className="text-xs uppercase tracking-wide text-amber-800 flex items-center justify-center gap-1">
              <Minus className="w-3 h-3" /> Only in A
            </div>
            <div
              className="text-2xl font-semibold tabular-nums"
              data-testid="diff-only-older-count"
            >
              {diff.onlyInOlder.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(olderViews)} views
            </div>
          </div>
          <div className="rounded-md border bg-slate-50 border-slate-200 p-3 text-center">
            <div className="text-xs uppercase tracking-wide text-slate-700 flex items-center justify-center gap-1">
              <Equal className="w-3 h-3" /> In both
            </div>
            <div
              className="text-2xl font-semibold tabular-nums"
              data-testid="diff-both-count"
            >
              {diff.inBoth.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(sharedViews)} views
            </div>
          </div>
          <div className="rounded-md border bg-emerald-50/60 border-emerald-200 p-3 text-center">
            <div className="text-xs uppercase tracking-wide text-emerald-800 flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Only in B
            </div>
            <div
              className="text-2xl font-semibold tabular-nums"
              data-testid="diff-only-newer-count"
            >
              {diff.onlyInNewer.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(newerViews)} views
            </div>
          </div>
        </div>

        {looksLikeRevert && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            <strong>Heads up:</strong>{" "}
            {diff.inBoth.length} post
            {diff.inBoth.length === 1 ? "" : "s"} appeared in both batches
            with opposite modes ({diff.older.mode} → {diff.newer.mode}) —
            the later batch likely reverted the earlier one for{" "}
            {diff.inBoth.length === 1 ? "this post" : "these posts"}.
          </div>
        )}

        <div className="mt-5 space-y-4">
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Minus className="w-4 h-4 text-amber-700" />
              Only in A ({diff.onlyInOlder.length})
            </h3>
            <DiffPostList
              posts={diff.onlyInOlder}
              emptyLabel="No posts unique to the earlier batch."
              testid="diff-only-older-list"
            />
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Equal className="w-4 h-4 text-slate-700" />
              In both batches ({diff.inBoth.length})
            </h3>
            <DiffPostList
              posts={diff.inBoth}
              emptyLabel="No overlap — these batches touched completely different posts."
              testid="diff-both-list"
            />
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-700" />
              Only in B ({diff.onlyInNewer.length})
            </h3>
            <DiffPostList
              posts={diff.onlyInNewer}
              emptyLabel="No posts unique to the later batch."
              testid="diff-only-newer-list"
            />
          </section>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose} data-testid="diff-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Page ------------------------------------------------- */

export default function AdminAuditLog() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "noindex" | "reindex">("all");
  /** IDs of audit entries the admin has ticked for comparison. Capped at
   *  two; selecting a third is blocked at the checkbox level so we don't
   *  silently drop someone's earlier pick. */
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

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

  // The two selected entries, resolved against the live data. Reads from
  // `query.data` (not `entries`) so a filter change can't strand a pick
  // and break the diff dialog.
  const selectedEntries = useMemo<
    [BulkNoIndexAuditEntry, BulkNoIndexAuditEntry] | null
  >(() => {
    if (compareIds.length !== 2) return null;
    const all = query.data ?? [];
    const a = all.find((e) => e.id === compareIds[0]);
    const b = all.find((e) => e.id === compareIds[1]);
    if (!a || !b) return null;
    return [a, b];
  }, [compareIds, query.data]);

  // Drop any stale selections when the underlying list refreshes (e.g. an
  // admin clears history while picks are still highlighted).
  useEffect(() => {
    if (!query.data) return;
    setCompareIds((prev) =>
      prev.filter((id) => query.data!.some((e) => e.id === id)),
    );
  }, [query.data]);

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // checkbox should already block this
      return [...prev, id];
    });
  }

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl pb-32">
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
            (and view counts) as they were when the change happened. Tick
            two batches to diff which posts overlap.
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
            <AuditRow
              key={e.id}
              entry={e}
              selected={compareIds.includes(e.id)}
              onToggleSelect={toggleCompare}
              selectionDisabled={compareIds.length >= 2}
            />
          ))}
        </div>
      )}

      {/* Sticky compare bar — appears the moment one row is ticked, so
          the admin doesn't have to hunt for the action. Z-indexed above
          the cards but below any dialog overlay. */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[95vw]">
          <div
            className="flex items-center gap-3 rounded-full border bg-background shadow-lg px-4 py-2"
            data-testid="audit-compare-bar"
          >
            <span className="text-sm">
              <strong className="tabular-nums">{compareIds.length}</strong> /
              2 selected for compare
            </span>
            <Button
              size="sm"
              onClick={() => setCompareOpen(true)}
              disabled={compareIds.length !== 2}
              data-testid="audit-compare-open"
            >
              <GitCompareArrows className="w-4 h-4 mr-1.5" />
              Compare
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCompareIds([])}
              data-testid="audit-compare-clear"
              aria-label="Clear comparison selection"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CompareDialog
        entries={selectedEntries}
        open={compareOpen && !!selectedEntries}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  );
}
