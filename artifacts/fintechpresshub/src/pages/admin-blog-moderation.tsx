import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetHreflangCheckReport,
  useRunHreflangCheck,
  useGetSitemapHealth,
  useRunSitemapHealth,
  useCheckSingleSitemapUrl,
  getGetHreflangCheckReportQueryKey,
  getGetSitemapHealthQueryKey,
  type CheckSingleUrlResult,
  type HreflangCheckReport,
  type SitemapHealthReport,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "./admin-blog-cards";

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const valueColor =
    tone === "bad"
      ? "text-amber-700"
      : tone === "good"
        ? "text-green-700"
        : "text-foreground";
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm font-medium ${valueColor}`}>{value}</div>
    </div>
  );
}

export function HreflangPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useGetHreflangCheckReport();
  const runMut = useRunHreflangCheck();

  const runNow = async () => {
    try {
      const fresh = await runMut.mutateAsync();
      qc.setQueryData(getGetHreflangCheckReportQueryKey(), fresh);
      const count = fresh.mismatchCount;
      const description = `Checked ${fresh.checkedCount} URL${fresh.checkedCount === 1 ? "" : "s"}.`;
      if (count === 0) {
        toast.success("All hreflang tags look healthy", { description });
      } else {
        toast.warning(
          `${count} hreflang mismatch${count === 1 ? "" : "es"} found`,
          { description },
        );
      }
    } catch {
      toast.error("Could not run hreflang check.");
    }
  };

  return (
    <Card className="mb-10">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5" /> Hreflang consistency
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Daily background job verifies that every page renders the correct{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">
                hreflang="en"
              </code>{" "}
              and{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">
                hreflang="x-default"
              </code>{" "}
              self-references. Admins receive an alert when mismatches appear.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runNow}
            disabled={runMut.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${runMut.isPending ? "animate-spin" : ""}`}
            />
            {runMut.isPending ? "Checking…" : "Run check now"}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            Could not load hreflang report.
          </p>
        ) : isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading report…</p>
        ) : (
          <HreflangBody report={data} />
        )}
      </CardContent>
    </Card>
  );
}

function HreflangBody({ report }: { report: HreflangCheckReport }) {
  const lastRun = report.generatedAt
    ? new Date(report.generatedAt as unknown as string).toLocaleString()
    : "never";
  const dailyJobEnabled = report.dailyJobEnabled !== false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
        {dailyJobEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Daily job active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Daily job paused (dev)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Stat label="Last run" value={lastRun} />
        <Stat label="URLs checked" value={String(report.checkedCount)} />
        <Stat
          label="Mismatches"
          value={String(report.mismatchCount)}
          tone={report.mismatchCount > 0 ? "bad" : "good"}
        />
      </div>

      {report.generatedAt === null ? (
        <p className="text-sm text-muted-foreground">
          No check has run yet. Click "Run check now" to validate hreflang tags
          across all pages.
        </p>
      ) : report.mismatches.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          All sampled pages have valid hreflang self-references.
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Hreflang
            mismatches
          </h3>
          <div className="border rounded-md divide-y">
            {report.mismatches.map(
              (row: { url: string; kind: string; detail: string }) => (
                <div
                  key={row.url}
                  className="px-3 py-2 text-xs grid grid-cols-[1fr_auto] gap-3 items-start"
                >
                  <div className="min-w-0">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate block text-[#0052FF] hover:underline font-mono"
                      title={row.url}
                    >
                      {row.url}
                    </a>
                    <span className="text-muted-foreground">{row.detail}</span>
                  </div>
                  <span className="font-mono text-amber-700 whitespace-nowrap">
                    {row.kind}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SitemapHealthPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useGetSitemapHealth();
  const runMut = useRunSitemapHealth();

  const runNow = async () => {
    try {
      const fresh = await runMut.mutateAsync();
      qc.setQueryData(getGetSitemapHealthQueryKey(), fresh);
      const broken = fresh.brokenCount;
      const description = `Checked ${fresh.total} URL${fresh.total === 1 ? "" : "s"}.`;
      if (broken === 0) {
        toast.success("Sitemap is healthy", { description });
      } else {
        toast.warning(`${broken} broken URL${broken === 1 ? "" : "s"}`, {
          description,
        });
      }
    } catch {
      toast.error("Could not run sitemap health check.");
    }
  };

  return (
    <Card className="mb-10">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5" /> Sitemap health
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Daily background job verifies every URL in{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">
                /sitemap.xml
              </code>
              . Admins receive an email whenever new 4xx/5xx links appear.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runNow}
            disabled={runMut.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${runMut.isPending ? "animate-spin" : ""}`}
            />
            {runMut.isPending ? "Checking…" : "Run check now"}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            Could not load sitemap health report.
          </p>
        ) : isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading report…</p>
        ) : (
          <SitemapHealthBody report={data} />
        )}
      </CardContent>
    </Card>
  );
}

function SitemapHealthBody({ report }: { report: SitemapHealthReport }) {
  const broken = report.results.filter((r: { isBroken: boolean }) => r.isBroken);
  const lastRun = report.generatedAt
    ? new Date(report.generatedAt as unknown as string).toLocaleString()
    : "never";
  const target = report.targetSiteUrl;
  const dailyJobEnabled = report.dailyJobEnabled !== false;
  const browsingHost =
    typeof window !== "undefined" ? window.location.host : "";
  let targetHost = "";
  try {
    if (target) targetHost = new URL(target).host;
  } catch {
    targetHost = "";
  }
  const hostMismatch = Boolean(
    target && targetHost && browsingHost && targetHost !== browsingHost,
  );
  return (
    <div className="space-y-4">
      {target && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs"
          data-testid="sitemap-health-target"
        >
          <span className="text-muted-foreground">Checking</span>
          <code className="rounded bg-background border px-1.5 py-0.5 text-foreground">
            {target}
          </code>
          {dailyJobEnabled ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-200">
              <CheckCircle2 className="w-3 h-3" />
              Daily job active
            </span>
          ) : (
            <span
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200"
              data-testid="sitemap-health-daily-paused"
              title="Daily job is paused in non-production environments unless SITE_URL is set."
            >
              <Clock className="w-3 h-3" />
              Daily job paused (dev)
            </span>
          )}
        </div>
      )}
      {hostMismatch && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="sitemap-health-host-mismatch"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <strong>Heads up — host mismatch.</strong> The link-checker
            walks <code className="rounded bg-amber-100 px-1">{targetHost}</code>{" "}
            but you're viewing the dashboard from{" "}
            <code className="rounded bg-amber-100 px-1">{browsingHost}</code>.
            If the target host doesn't actually serve this codebase, every
            URL will look broken — those results are likely false positives.
            Set <code className="rounded bg-amber-100 px-1">SITE_URL</code>{" "}
            to your preview URL to point checks at this server.
          </div>
        </div>
      )}
      <SingleUrlProbe defaultBase={target ?? null} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Stat label="Last run" value={lastRun} />
        <Stat label="URLs checked" value={String(report.total)} />
        <Stat
          label="Broken"
          value={String(report.brokenCount)}
          tone={report.brokenCount > 0 ? "bad" : "good"}
        />
      </div>
      {broken.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          All URLs in the sitemap are returning 2xx/3xx.
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Broken URLs
          </h3>
          <div className="border rounded-md divide-y">
            {broken.map((row: { url: string; lastStatusCode?: number | null; lastError?: string | null; lastCheckedAt?: string | null }) => (
              <div
                key={row.url}
                className="px-3 py-2 text-xs grid grid-cols-[1fr_auto_auto] gap-3 items-center"
              >
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[#0052FF] hover:underline"
                  title={row.url}
                >
                  {row.url}
                </a>
                <span className="font-mono text-amber-700">
                  {row.lastStatusCode ?? row.lastError ?? "—"}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {row.lastCheckedAt
                    ? formatRelativeTime(row.lastCheckedAt as unknown as string)
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PROBE_HISTORY_LIMIT = 5;

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

export function SingleUrlProbe({ defaultBase }: { defaultBase: string | null }) {
  const baseOrigin = (() => {
    if (!defaultBase) return "";
    try {
      return new URL(defaultBase).origin;
    } catch {
      return "";
    }
  })();
  const [value, setValue] = useState(baseOrigin ? `${baseOrigin}/` : "");
  const [result, setResult] = useState<CheckSingleUrlResult | null>(null);
  const [history, setHistory] = useState<CheckSingleUrlResult[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMac = useMemo(isMacPlatform, []);
  const mut = useCheckSingleSitemapUrl();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const wantsModifier = isMac ? e.metaKey : e.ctrlKey;
      if (!wantsModifier) return;
      if (e.key !== "k" && e.key !== "K") return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== inputRef.current) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable) {
          return;
        }
      }
      e.preventDefault();
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMac]);

  const resolveUrl = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("/") && baseOrigin) {
      try {
        return new URL(trimmed, baseOrigin).toString();
      } catch {
        return null;
      }
    }
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    } catch {
      return null;
    }
  };

  const probe = async (url: string) => {
    setValidationError(null);
    try {
      const probed = await mut.mutateAsync({ data: { url } });
      setResult(probed);
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.url !== probed.url);
        return [probed, ...filtered].slice(0, PROBE_HISTORY_LIMIT);
      });
    } catch {
      setResult(null);
      toast.error("Probe failed — server returned an error.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = resolveUrl(value);
    if (!url) {
      setValidationError(
        "Enter an absolute http(s) URL, or a path like /blog/foo when a target is configured.",
      );
      setResult(null);
      return;
    }
    await probe(url);
  };

  const recheck = async (url: string) => {
    setValue(url);
    await probe(url);
  };

  const tone: "good" | "bad" | null = result
    ? result.isBroken
      ? "bad"
      : "good"
    : null;

  return (
    <div
      className="rounded-md border bg-muted/20 p-3 space-y-2"
      data-testid="sitemap-health-single-probe"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Check a single URL</h3>
        <span className="text-[11px] text-muted-foreground">
          Doesn't update the report
        </span>
      </div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            inputMode="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              baseOrigin
                ? `${baseOrigin}/blog/your-slug`
                : "https://example.com/page"
            }
            className="font-mono text-xs pr-16"
            data-testid="sitemap-health-probe-input"
            disabled={mut.isPending}
            aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          />
          <kbd
            className="hidden sm:inline-flex pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
            data-testid="sitemap-health-probe-kbd"
            aria-hidden="true"
            title={
              isMac
                ? "Press ⌘K from anywhere to focus this input"
                : "Press Ctrl+K from anywhere to focus this input"
            }
          >
            {isMac ? "⌘" : "Ctrl"}
            <span>K</span>
          </kbd>
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={mut.isPending || value.trim().length === 0}
          data-testid="sitemap-health-probe-submit"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${mut.isPending ? "animate-spin" : ""}`}
          />
          {mut.isPending ? "Probing…" : "Check URL"}
        </Button>
      </form>
      {validationError && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}
      {result && (
        <div
          className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            tone === "bad"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
          data-testid="sitemap-health-probe-result"
        >
          {tone === "bad" ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span className="font-mono">
            {result.statusCode ?? result.error ?? "—"}
          </span>
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="truncate hover:underline"
            title={result.url}
          >
            {result.url}
          </a>
          <span className="ml-auto text-[11px] opacity-75 whitespace-nowrap">
            {formatRelativeTime(result.checkedAt as unknown as string)}
          </span>
        </div>
      )}
      {history.length > 0 && (
        <div
          className="space-y-1 pt-1"
          data-testid="sitemap-health-probe-history"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Recent checks ({history.length})
            </h4>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              data-testid="sitemap-health-probe-history-clear"
            >
              Clear
            </button>
          </div>
          <ul className="border rounded-md divide-y bg-background">
            {history.map((h) => (
              <li
                key={h.url}
                className="px-2.5 py-1.5 text-xs grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center"
                data-testid="sitemap-health-probe-history-row"
              >
                <span
                  className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${
                    h.isBroken
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                  title={h.error ?? undefined}
                >
                  {h.statusCode ?? "ERR"}
                </span>
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[#0052FF] hover:underline"
                  title={h.url}
                >
                  {h.url}
                </a>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(h.checkedAt as unknown as string)}
                </span>
                <button
                  type="button"
                  onClick={() => recheck(h.url)}
                  disabled={mut.isPending}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                  data-testid="sitemap-health-probe-history-recheck"
                  title="Re-probe this URL"
                >
                  <RefreshCw className="w-3 h-3" />
                  Re-check
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
