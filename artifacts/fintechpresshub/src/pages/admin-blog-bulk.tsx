import { useEffect, useState } from "react";
import {
  useCheckSingleSitemapUrl,
  checkSingleSitemapUrl,
  useGetNotificationSettings,
  usePostBrokenUrlsToSlack,
  getGetNotificationSettingsQueryKey,
  type BlogPost,
  type CheckSingleUrlResult,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCopy,
  Download,
  Eye,
  EyeOff,
  Globe,
  Send as SendIcon,
  Star,
  TrendingUp,
} from "lucide-react";
import { fleschKincaidGrade } from "@/lib/readability";
import { formatRelativeTime } from "./admin-blog-cards";

const BULK_PROBE_CONCURRENCY = 6;
const BULK_PROBE_STORAGE_KEY = "fph:admin:bulkProbeSummary:v1";
const BULK_PROBE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const RECENT_POST_WINDOW_DAYS = 30;

interface BulkProbeRowResult {
  post: BlogPost;
  result: CheckSingleUrlResult | null;
}

interface BulkProbeSummary {
  okCount: number;
  brokenCount: number;
  total: number;
  broken: BulkProbeRowResult[];
  ranAt: string;
}

function loadStoredBulkProbeSummary(): BulkProbeSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BULK_PROBE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BulkProbeSummary | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.okCount !== "number" ||
      typeof parsed.brokenCount !== "number" ||
      typeof parsed.total !== "number" ||
      typeof parsed.ranAt !== "string" ||
      !Array.isArray(parsed.broken)
    ) {
      return null;
    }
    const ranAtMs = Date.parse(parsed.ranAt);
    if (!Number.isFinite(ranAtMs)) return null;
    if (Date.now() - ranAtMs > BULK_PROBE_MAX_AGE_MS) {
      window.localStorage.removeItem(BULK_PROBE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try { window.localStorage.removeItem(BULK_PROBE_STORAGE_KEY); } catch { }
    return null;
  }
}

export function computeNoIndexImpact(
  selectedSlugs: Set<string>,
  posts: BlogPost[] | undefined,
  mode: "noindex" | "reindex",
) {
  const selected = (posts ?? []).filter((p) => selectedSlugs.has(p.slug));
  const wantHidden = mode === "noindex";
  const impacted = selected.filter((p) =>
    wantHidden ? !p.noIndex : !!p.noIndex,
  );
  const skipped = selected.filter((p) =>
    wantHidden ? !!p.noIndex : !p.noIndex,
  );

  const totalViews = impacted.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
  const featuredCount = impacted.filter((p) => p.featured).length;
  const recentCutoff = Date.now() - RECENT_POST_WINDOW_DAYS * 86_400_000;
  const recentCount = impacted.filter((p) => {
    const t = new Date(p.publishedAt).getTime();
    return Number.isFinite(t) && t >= recentCutoff;
  }).length;

  const topByViews = [...impacted]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5);

  return {
    selectedCount: selected.length,
    impactedCount: impacted.length,
    skippedCount: skipped.length,
    totalViews,
    featuredCount,
    recentCount,
    topByViews,
    impacted,
  };
}

type NoIndexImpact = ReturnType<typeof computeNoIndexImpact>;

export function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildImpactCsv(impacted: BlogPost[]): string {
  const header = ["slug", "title", "current_views", "featured"];
  const rows = impacted.map((p) => [p.slug, p.title, p.viewCount ?? 0, p.featured ? "true" : "false"]);
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(","));
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

function buildBulkProbeCsv(broken: BulkProbeRowResult[]): string {
  const header = ["slug", "url", "status_code", "error", "fk_grade", "checked_at"];
  const rows = broken.map(({ post, result }) => {
    const grade = fleschKincaidGrade(post.content);
    return [post.slug, result?.url ?? "", result?.statusCode ?? "", result?.error ?? "", grade !== null ? String(grade) : "", result?.checkedAt ?? ""];
  });
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(","));
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

function mdEscapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  if (str === "") return "—";
  return str.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildBulkProbeMarkdown(broken: BulkProbeRowResult[]): string {
  const header = ["#", "Slug", "URL", "Status", "Error", "FK Grade", "Checked at"];
  const lines: string[] = [];
  lines.push(`**Bulk URL probe — ${broken.length} broken URL${broken.length === 1 ? "" : "s"}** (${new Date().toISOString()})`);
  lines.push("");
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  broken.forEach(({ post, result }, i) => {
    const grade = fleschKincaidGrade(post.content);
    const row = [String(i + 1), mdEscapeCell(post.slug), mdEscapeCell(result?.url ?? ""), mdEscapeCell(result?.statusCode ?? "ERR"), mdEscapeCell(result?.error ?? ""), grade !== null ? mdEscapeCell(grade) : "—", mdEscapeCell(result?.checkedAt ?? "")];
    lines.push(`| ${row.join(" | ")} |`);
  });
  return lines.join("\n");
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { }
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function downloadBulkProbeCsv(broken: BulkProbeRowResult[]) {
  const csv = buildBulkProbeCsv(broken);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bulk-probe-broken_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadImpactCsv(impacted: BlogPost[], mode: "noindex" | "reindex") {
  const csv = buildImpactCsv(impacted);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bulk-${mode}-impact_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function BulkProbeButton({ posts }: { posts: BlogPost[] }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<BulkProbeSummary | null>(loadStoredBulkProbeSummary);

  const slackSettingsQuery = useGetNotificationSettings({
    query: {
      queryKey: getGetNotificationSettingsQueryKey(),
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  });
  const slackPostMutation = usePostBrokenUrlsToSlack({
    mutation: {
      onSuccess: (result: { ok: boolean; posted?: number; error?: string }) => {
        if (result.ok) {
          toast.success(`Posted ${result.posted ?? "list"} to Slack — check the channel.`);
        } else {
          toast.error(`Slack post failed: ${result.error ?? "unknown error"}`);
        }
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to post to Slack");
      },
    },
  });
  const slackEnabled = slackSettingsQuery.data?.slackEnabled === true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (summary) {
        window.localStorage.setItem(BULK_PROBE_STORAGE_KEY, JSON.stringify(summary));
      } else {
        window.localStorage.removeItem(BULK_PROBE_STORAGE_KEY);
      }
    } catch { /* localStorage may be unavailable (private mode / QuotaExceededError) — non-fatal */ }
  }, [summary]);

  const runAll = async () => {
    if (posts.length === 0 || progress !== null) return;
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    setSummary(null);
    setProgress({ done: 0, total: posts.length });

    const queue = posts.slice();
    const results: BulkProbeRowResult[] = [];
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= queue.length) return;
        const post = queue[idx];
        let probed: CheckSingleUrlResult | null = null;
        try {
          probed = await checkSingleSitemapUrl({ url: `${origin}/blog/${post.slug}` });
        } catch { probed = null; }
        results.push({ post, result: probed });
        setProgress({ done: results.length, total: queue.length });
      }
    };

    const workerCount = Math.min(BULK_PROBE_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    const broken = results.filter((r) => r.result === null || r.result.isBroken);
    const orderIndex = new Map(posts.map((p, i) => [p.slug, i]));
    broken.sort((a, b) => (orderIndex.get(a.post.slug) ?? 0) - (orderIndex.get(b.post.slug) ?? 0));

    const okCount = results.length - broken.length;
    setSummary({ okCount, brokenCount: broken.length, total: results.length, broken, ranAt: new Date().toISOString() });
    setProgress(null);

    if (broken.length === 0) {
      toast.success(`Probed ${okCount} URL${okCount === 1 ? "" : "s"} — all OK`);
    } else {
      const sample = broken.slice(0, 3).map((b) => b.post.slug).join(", ");
      const more = broken.length > 3 ? ` and ${broken.length - 3} more` : "";
      toast.warning(`${okCount}/${results.length} OK · ${broken.length} broken`, { description: `${sample}${more}` });
    }
  };

  if (posts.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={runAll}
        disabled={progress !== null}
        data-testid="bulk-probe-button"
        title="Run the link-checker probe against every post in this list"
      >
        <Activity className={`w-4 h-4 mr-1.5 ${progress ? "animate-pulse" : ""}`} />
        {progress ? `Probing ${progress.done}/${progress.total}…` : `Probe all (${posts.length})`}
      </Button>
      {summary && (
        <div className="basis-full rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-1.5" data-testid="bulk-probe-summary">
          <div className="flex flex-wrap items-center gap-2">
            {summary.brokenCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              <strong className="tabular-nums">{summary.okCount}</strong>/
              <span className="tabular-nums">{summary.total}</span> OK
              {summary.brokenCount > 0 && (
                <> {" · "}<strong className="tabular-nums text-amber-800" data-testid="bulk-probe-broken-count">{summary.brokenCount}</strong> broken</>
              )}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">{formatRelativeTime(summary.ranAt)}</span>
            {summary.broken.length > 0 && (
              <>
                <button type="button" onClick={() => downloadBulkProbeCsv(summary.broken)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline" data-testid="bulk-probe-summary-export" title="Download the broken-URL list as CSV">
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const md = buildBulkProbeMarkdown(summary.broken);
                    const ok = await copyTextToClipboard(md);
                    if (ok) {
                      toast.success(`Copied ${summary.broken.length} broken URL${summary.broken.length === 1 ? "" : "s"} as Markdown — paste into Slack, GitHub, or Linear.`);
                    } else {
                      toast.error("Couldn't access the clipboard. Try the CSV export instead.");
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  data-testid="bulk-probe-summary-copy-md"
                  title="Copy the broken-URL list as a Markdown table (Slack / GitHub / Linear)"
                >
                  <ClipboardCopy className="w-3 h-3" />
                  Copy as Markdown
                </button>
                {slackEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      slackPostMutation.mutate({
                        data: {
                          broken: summary.broken.map(({ post, result }) => ({
                            slug: post.slug,
                            title: post.title,
                            url: result?.url ?? `${typeof window !== "undefined" ? window.location.origin : ""}/blog/${post.slug}`,
                            statusCode: result?.statusCode ?? null,
                            error: result?.error ?? null,
                            checkedAt: (result?.checkedAt as unknown as string | undefined) ?? null,
                          })),
                        },
                      });
                    }}
                    disabled={slackPostMutation.isPending}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                    data-testid="bulk-probe-summary-send-slack"
                    title="Post the broken-URL list to the configured Slack channel"
                  >
                    <SendIcon className="w-3 h-3" />
                    {slackPostMutation.isPending ? "Posting…" : "Send to Slack"}
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={() => setSummary(null)} className="text-[11px] text-muted-foreground hover:text-foreground hover:underline" data-testid="bulk-probe-summary-dismiss">
              Dismiss
            </button>
          </div>
          {summary.broken.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.broken.map(({ post, result }) => {
                const code = result?.statusCode ?? "ERR";
                const tooltip = result?.error ? `${result.error}` : result ? `Status ${result.statusCode ?? "—"}` : "Request failed";
                const grade = fleschKincaidGrade(post.content);
                const gradeLabel = grade === null ? null
                  : grade <= 5 ? { text: `Gr.${grade}`, cls: "text-green-700 border-green-200" }
                  : grade <= 8 ? { text: `Gr.${grade}`, cls: "text-blue-700 border-blue-200" }
                  : grade <= 12 ? { text: `Gr.${grade}`, cls: "text-amber-700 border-amber-300" }
                  : { text: `Gr.${grade}`, cls: "text-red-700 border-red-200" };
                return (
                  <a
                    key={post.slug}
                    href={`#admin-post-${post.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`admin-post-${post.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    title={`${tooltip}${grade !== null ? ` · FK grade ${grade}` : ""} — click to scroll to this post`}
                    className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-900 hover:bg-amber-100"
                    data-testid={`bulk-probe-broken-chip-${post.slug}`}
                  >
                    <span className="font-mono text-[10px]">{code}</span>
                    <span className="truncate max-w-[16rem]">{post.slug}</span>
                    {gradeLabel && (
                      <span className={`border-l pl-1 font-medium text-[10px] ${gradeLabel.cls}`} aria-label={`Flesch-Kincaid grade ${grade}`}>
                        {gradeLabel.text}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function BulkSeoFillDialog({
  open,
  posts,
  form,
  isPending,
  onFormChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  posts: BlogPost[];
  form: { seoTitle: string; seoDescription: string };
  isPending: boolean;
  onFormChange: (f: { seoTitle: string; seoDescription: string }) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const willUpdate = posts.filter(
    (p) => (!p.seoTitle && form.seoTitle.trim()) || (!p.seoDescription && form.seoDescription.trim()),
  );
  const nothingToFill = (form.seoTitle.trim() || form.seoDescription.trim()) && willUpdate.length === 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0052FF]" />
            Fill missing SEO metadata
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {posts.length} selected post{posts.length !== 1 ? "s" : ""} have incomplete SEO. Values entered below are applied only where the field is currently empty — nothing already filled will be overwritten.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label>SEO title</Label>
            <Input value={form.seoTitle} maxLength={70} placeholder="e.g. Why Fintech SEO Is Different | FintechPressHub" onChange={(e) => onFormChange({ ...form, seoTitle: e.target.value })} />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Leave blank to skip this field.</p>
              <span className={`text-xs tabular-nums font-medium ${form.seoTitle.length > 60 ? "text-destructive" : form.seoTitle.length > 50 ? "text-amber-600" : form.seoTitle.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                {form.seoTitle.length} / 60
              </span>
            </div>
          </div>
          <div>
            <Label>SEO description</Label>
            <Textarea rows={2} maxLength={300} value={form.seoDescription} placeholder="e.g. Discover why fintech companies need a different SEO approach…" onChange={(e) => onFormChange({ ...form, seoDescription: e.target.value })} />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Leave blank to skip this field.</p>
              <span className={`text-xs tabular-nums font-medium ${form.seoDescription.length > 160 ? "text-destructive" : form.seoDescription.length > 130 ? "text-amber-600" : form.seoDescription.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                {form.seoDescription.length} / 160
              </span>
            </div>
          </div>
          {willUpdate.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Will update {willUpdate.length} post{willUpdate.length !== 1 ? "s" : ""}:</p>
              <div className="max-h-36 overflow-y-auto rounded-md border border-input bg-muted/30 divide-y divide-input">
                {willUpdate.map((p) => (
                  <div key={p.slug} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="font-medium truncate flex-1 min-w-0">{p.title}</span>
                    <div className="flex gap-1 ml-2 shrink-0">
                      {!p.seoTitle && form.seoTitle.trim() && <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium">title</span>}
                      {!p.seoDescription && form.seoDescription.trim() && <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium">desc</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {nothingToFill && (
            <p className="text-xs text-muted-foreground text-center py-1">All selected posts already have these fields filled — nothing will change.</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || willUpdate.length === 0 || (!form.seoTitle.trim() && !form.seoDescription.trim())}
            onClick={onConfirm}
            className="bg-[#0052FF] hover:bg-[#0040cc]"
          >
            {isPending ? "Updating…" : `Apply to ${willUpdate.length} post${willUpdate.length !== 1 ? "s" : ""}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ImpactStat({ label, value, tone, testid }: { label: string; value: string; tone: "neutral" | "good" | "warn"; testid?: string }) {
  const toneClass = tone === "warn" ? "text-amber-700" : tone === "good" ? "text-green-700" : "text-foreground";
  return (
    <div className="rounded-md border px-3 py-2" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function ImpactWarning({ icon, tone, children, testid }: { icon: React.ReactNode; tone: "warn" | "info"; children: React.ReactNode; testid?: string }) {
  const cls = tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`} data-testid={testid}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function BulkNoIndexImpactDialog({
  open, mode, impact, isPending, snoozeEnabled, snoozeDays,
  onSnoozeEnabledChange, onSnoozeDaysChange, onCancel, onConfirm,
}: {
  open: boolean;
  mode: "noindex" | "reindex";
  impact: NoIndexImpact;
  isPending: boolean;
  snoozeEnabled: boolean;
  snoozeDays: number;
  onSnoozeEnabledChange: (v: boolean) => void;
  onSnoozeDaysChange: (v: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isHide = mode === "noindex";
  const verb = isHide ? "Hide" : "Re-expose";
  const verbed = isHide ? "hidden" : "re-exposed";
  const noun = impact.impactedCount === 1 ? "post" : "posts";
  const hasImpact = impact.impactedCount > 0;
  const hasHighTraffic = impact.totalViews >= 500;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="max-w-xl" data-testid="bulk-noindex-impact-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isHide ? <EyeOff className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-green-600" />}
            Preview no-index impact
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {isHide ? (
                <>Each affected post will get <code className="rounded bg-muted px-1 py-0.5 text-[11px]">&lt;meta name="robots" content="noindex,nofollow"&gt;</code> and drop out of Google, Bing &amp; co. on the next crawl. The URL stays publicly reachable — only search engines are told to forget it.</>
              ) : (
                <>Each affected post will lose its <code className="rounded bg-muted px-1 py-0.5 text-[11px]">noindex</code> flag and become eligible for the index again on the next crawl.</>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <ImpactStat label={isHide ? "Will be hidden" : "Will return"} value={impact.impactedCount.toLocaleString()} tone={hasImpact ? (isHide ? "warn" : "good") : "neutral"} testid="impact-stat-impacted" />
          <ImpactStat label={isHide ? "Views being hidden" : "Views returning"} value={formatViews(impact.totalViews)} tone={isHide && hasHighTraffic ? "warn" : hasImpact ? "good" : "neutral"} testid="impact-stat-views" />
          <ImpactStat label="Already no-op" value={impact.skippedCount.toLocaleString()} tone="neutral" testid="impact-stat-skipped" />
        </div>

        {!hasImpact && (
          <div className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground" data-testid="impact-empty">
            None of the {impact.selectedCount} selected {impact.selectedCount === 1 ? "post is" : "posts are"} eligible for this action — every selected post is already in the target state. Nothing will change.
          </div>
        )}

        {hasImpact && isHide && (
          <div className="space-y-2">
            {impact.featuredCount > 0 && (
              <ImpactWarning icon={<Star className="w-4 h-4" />} tone="warn" testid="impact-warn-featured">
                <strong>{impact.featuredCount}</strong> {impact.featuredCount === 1 ? "post is" : "posts are"} marked <em>featured</em> on the public blog. Hiding {impact.featuredCount === 1 ? "it" : "them"} will also strip {impact.featuredCount === 1 ? "it" : "them"} from search snippets while the public blog still links there.
              </ImpactWarning>
            )}
            {impact.recentCount > 0 && (
              <ImpactWarning icon={<Clock className="w-4 h-4" />} tone="warn" testid="impact-warn-recent">
                <strong>{impact.recentCount}</strong> {impact.recentCount === 1 ? "post was" : "posts were"} published in the last {RECENT_POST_WINDOW_DAYS} days and may still be ranking up — de-indexing now usually wipes the early-traffic ramp.
              </ImpactWarning>
            )}
            {hasHighTraffic && (
              <ImpactWarning icon={<TrendingUp className="w-4 h-4" />} tone="warn" testid="impact-warn-traffic">
                <strong>{formatViews(impact.totalViews)} views</strong> across the selection — that traffic will stop landing from search after the next crawl.
              </ImpactWarning>
            )}
          </div>
        )}

        {hasImpact && isHide && (
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-2" data-testid="snooze-noindex-control">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Checkbox checked={snoozeEnabled} onCheckedChange={(v) => onSnoozeEnabledChange(v === true)} data-testid="snooze-toggle" />
              <Clock className="w-4 h-4 text-muted-foreground" />
              Snooze — auto re-expose after a set number of days
            </label>
            {snoozeEnabled && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <span className="text-sm text-muted-foreground">Hide for</span>
                <Input
                  type="number" min={1} max={365} step={1} value={snoozeDays}
                  onChange={(e) => { const n = Number.parseInt(e.target.value, 10); if (Number.isFinite(n)) onSnoozeDaysChange(n); }}
                  className="w-20 h-8"
                  data-testid="snooze-days-input"
                />
                <span className="text-sm text-muted-foreground">
                  {snoozeDays === 1 ? "day" : "days"}, then auto re-index on{" "}
                  <strong className="text-foreground">
                    {new Date(Date.now() + snoozeDays * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </strong>
                </span>
              </div>
            )}
            <p className="pl-6 text-xs text-muted-foreground">
              {snoozeEnabled
                ? "An hourly background job will flip these posts back to indexed once the snooze window elapses — no need to remember to re-expose them."
                : "Leave off for an indefinite hide that only a manual action can reverse."}
            </p>
          </div>
        )}

        {hasImpact && (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2" data-testid="impact-csv-export">
            <div className="min-w-0 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Audit trail</span> — download every affected URL (slug, title, current views, featured) as a CSV before you confirm.
            </div>
            <button type="button" onClick={() => downloadImpactCsv(impact.impacted, mode)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground" data-testid="impact-csv-download">
              <Download className="w-3.5 h-3.5" />
              Download CSV
              <span className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">{impact.impactedCount}</span>
            </button>
          </div>
        )}

        {hasImpact && impact.topByViews.length > 0 && (
          <div className="rounded-md border">
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b">Highest-traffic posts in this batch</div>
            <ul className="divide-y text-sm" data-testid="impact-top-posts">
              {impact.topByViews.map((p) => (
                <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-2" data-testid={`impact-top-post-${p.slug}`}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">/blog/{p.slug}</span>
                      {p.featured && <span className="inline-flex items-center gap-0.5 text-amber-600"><Star className="w-3 h-3" />featured</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums">{(p.viewCount ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">views</div>
                  </div>
                </li>
              ))}
            </ul>
            {impact.impactedCount > impact.topByViews.length && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground border-t bg-muted/40">
                + {impact.impactedCount - impact.topByViews.length} more {impact.impactedCount - impact.topByViews.length === 1 ? "post" : "posts"} in this batch
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} data-testid="impact-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !hasImpact}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className={isHide ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-[#0052FF] hover:bg-[#0040cc]"}
            data-testid="impact-confirm"
          >
            {isPending ? "Working…" : hasImpact ? `${verb} ${impact.impactedCount} ${noun}` : `Nothing to be ${verbed}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
