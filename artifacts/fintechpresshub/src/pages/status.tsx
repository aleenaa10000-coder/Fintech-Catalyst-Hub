import { useEffect, useState } from "react";
import {
  useHealthCheck,
  getHealthCheckQueryKey,
  type HealthStatus,
} from "@workspace/api-client-react";
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  Database,
  Mail,
  Sprout,
  RefreshCw,
  Loader2,
  ClipboardList,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;
const HISTORY_LIMIT = 12;

type Tone = "ok" | "warn" | "down" | "loading";

const TONE_COLORS: Record<Tone, { dot: string; text: string; bg: string; ring: string }> = {
  ok: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "ring-emerald-200 dark:ring-emerald-900/60",
  },
  warn: {
    dot: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-200 dark:ring-amber-900/60",
  },
  down: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    ring: "ring-red-200 dark:ring-red-900/60",
  },
  loading: {
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    ring: "ring-muted",
  },
};

function overallTone(data: HealthStatus | undefined, isError: boolean): Tone {
  if (isError) return "down";
  if (!data) return "loading";
  if (!data.db.ok) return "down";
  if (!data.email.ok || !data.seedData.ok) return "warn";
  return "ok";
}

function overallLabel(tone: Tone): string {
  switch (tone) {
    case "ok":
      return "All systems operational";
    case "warn":
      return "Some services degraded";
    case "down":
      return "Service disruption";
    case "loading":
      return "Checking status…";
  }
}

function formatChecked(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return new Date(iso).toLocaleTimeString();
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

interface SubsystemCardProps {
  icon: typeof Database;
  title: string;
  tone: Tone;
  summary: string;
  detail?: string;
  testId: string;
}

function SubsystemCard({ icon: Icon, title, tone, summary, detail, testId }: SubsystemCardProps) {
  const colors = TONE_COLORS[tone];
  const StatusIcon =
    tone === "ok"
      ? CheckCircle2
      : tone === "warn"
        ? AlertTriangle
        : tone === "down"
          ? CircleAlert
          : Loader2;
  return (
    <Card className={cn("border", colors.bg, "ring-1", colors.ring)} data-testid={testId} data-tone={tone}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-md p-2", "bg-background")}>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          <div className={cn("inline-flex items-center gap-1 text-xs font-medium", colors.text)}>
            <StatusIcon className={cn("h-3.5 w-3.5", tone === "loading" && "animate-spin")} aria-hidden />
            {tone === "ok" && "Operational"}
            {tone === "warn" && "Degraded"}
            {tone === "down" && "Down"}
            {tone === "loading" && "Checking"}
          </div>
        </div>
        <p className={cn("mt-3 text-sm", colors.text)}>{summary}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

interface HistoryEntry {
  tone: Tone;
  checkedAt: string;
}

export default function StatusPage() {
  const { data, isError, isLoading, isFetching, dataUpdatedAt, refetch } = useHealthCheck<HealthStatus>({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
      gcTime: 5 * 60_000,
    },
  });

  const tone = overallTone(data, isError);
  const colors = TONE_COLORS[tone];

  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (isLoading) return;
    const checkedAt = data?.checkedAt ?? new Date(dataUpdatedAt || Date.now()).toISOString();
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.checkedAt === checkedAt) return prev;
      return [...prev, { tone, checkedAt }].slice(-HISTORY_LIMIT);
    });
  }, [data, isError, isLoading, dataUpdatedAt, tone]);

  // Subsystem tones + summaries
  const dbTone: Tone = isError ? "down" : !data ? "loading" : data.db.ok ? "ok" : "down";
  const emailTone: Tone = isError ? "down" : !data ? "loading" : data.email.ok ? "ok" : "warn";
  const seedTone: Tone = isError ? "down" : !data ? "loading" : data.seedData.ok ? "ok" : "warn";

  return (
    <>
      <PageMeta
        page="status"
        noindex={true}
        webPage={{ datePublished: "2026-04-30", dateModified: "2026-04-30" }}
      />
      <PageHero
        eyebrow="System Status"
        title="FintechPressHub status"
        description="Live status of our public services — site, database, email transport, and demo content. Refreshes every 30 seconds."
      />

      <section className="container mx-auto px-4 pb-20 -mt-8">
        <Card className={cn("border ring-1", colors.bg, colors.ring)} data-testid="status-overall" data-tone={tone}>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-3 w-3" aria-hidden>
                  {tone !== "loading" && (
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", colors.dot)} />
                  )}
                  <span className={cn("relative inline-flex h-3 w-3 rounded-full", colors.dot)} />
                </span>
                <div>
                  <div className={cn("text-lg font-semibold", colors.text)}>{overallLabel(tone)}</div>
                  <div className="text-xs text-muted-foreground">
                    {data
                      ? `Last checked ${formatChecked(data.checkedAt)} · API uptime ${formatUptime(data.uptimeSeconds)}`
                      : isError
                        ? "The API server did not respond to the last probe."
                        : "Probing /api/healthz…"}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="status-refresh"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden />
                Refresh now
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SubsystemCard
            icon={Database}
            title="Database"
            tone={dbTone}
            summary={
              isError
                ? "Unreachable — API probe failed."
                : !data
                  ? "Checking…"
                  : data.db.ok
                    ? `Connected · ${data.db.latencyMs}ms round-trip`
                    : "Offline."
            }
            detail={data?.db.error}
            testId="status-card-db"
          />
          <SubsystemCard
            icon={Mail}
            title="Email"
            tone={emailTone}
            summary={
              isError
                ? "Unknown — API probe failed."
                : !data
                  ? "Checking…"
                  : data.email.ok
                    ? `Provider: ${data.email.provider}`
                    : "No transport configured."
            }
            detail={
              !isError && data && !data.email.ok
                ? "Outbound email is disabled until RESEND_API_KEY or the SMTP_* secrets are set."
                : undefined
            }
            testId="status-card-email"
          />
          <SubsystemCard
            icon={Sprout}
            title="Demo content"
            tone={seedTone}
            summary={
              isError
                ? "Unknown — API probe failed."
                : !data
                  ? "Checking…"
                  : data.seedData.ok
                    ? "All public tables populated."
                    : "One or more tables are empty."
            }
            detail={data?.seedData.error}
            testId="status-card-seed"
          />
        </div>

        {data?.seedData.counts && Object.keys(data.seedData.counts).length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-3">Public content row counts</h3>
              <ul
                className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm"
                data-testid="status-seed-counts"
              >
                {Object.entries(data.seedData.counts).map(([table, n]) => (
                  <li key={table} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{table}</span>
                    <span className="font-medium tabular-nums">{String(n)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Recent probes</h3>
                <span className="text-xs text-muted-foreground">
                  Last {history.length} of {HISTORY_LIMIT}
                </span>
              </div>
              <ol className="flex items-end gap-1.5" data-testid="status-history">
                {history.map((entry, i) => {
                  const c = TONE_COLORS[entry.tone];
                  return (
                    <li
                      key={`${entry.checkedAt}-${i}`}
                      className={cn("h-8 w-3 rounded-sm", c.dot)}
                      title={`${overallLabel(entry.tone)} · ${formatChecked(entry.checkedAt)}`}
                      aria-label={`${overallLabel(entry.tone)} at ${entry.checkedAt}`}
                    />
                  );
                })}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                History is captured in this browser session only — it resets on
                reload. For long-term incident history, see your hosting
                dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Raw probe data:{" "}
          <a
            href="/api/healthz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            /api/healthz
          </a>
        </p>

        {/* Setup checklist — shown whenever something is not fully green */}
        {(!isLoading || isError) && (
          <Card className="mt-8 border-slate-200" data-testid="status-setup-checklist">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">New Replit account — setup checklist</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Run these steps once after importing or forking this project into a fresh Replit account.
              </p>
              <ol className="space-y-3 text-sm" aria-label="Setup steps">
                <li className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                    dbTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {dbTone === "ok" ? "✓" : "1"}
                  </span>
                  <div>
                    <p className="font-medium leading-snug">Provision a Postgres database</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open the <strong>Database</strong> tool in Replit. One click creates the database and sets{" "}
                      <code className="bg-muted px-1 rounded text-[11px]">DATABASE_URL</code> automatically.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                    dbTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {dbTone === "ok" ? "✓" : "2"}
                  </span>
                  <div>
                    <p className="font-medium leading-snug">Run the setup script</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open the <strong>Shell</strong> tab and run:
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <pre className="flex-1 text-[11px] bg-muted rounded px-2 py-1.5 overflow-x-auto">
                        <code>bash scripts/setup.sh</code>
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopyCmd("bash scripts/setup.sh")}
                        className={cn(
                          "shrink-0 flex items-center gap-1 text-[11px] font-medium rounded px-2 py-1.5 border transition-colors",
                          copiedCmd === "bash scripts/setup.sh"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-muted hover:bg-slate-100 text-muted-foreground hover:text-foreground",
                        )}
                        aria-label="Copy setup command"
                      >
                        {copiedCmd === "bash scripts/setup.sh"
                          ? <><Check className="h-3 w-3" /> Copied</>
                          : <><Copy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This pushes the schema, seeds demo data, and runs a health check.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                    seedTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {seedTone === "ok" ? "✓" : "3"}
                  </span>
                  <div>
                    <p className="font-medium leading-snug">Verify demo content is seeded</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The <strong>Demo content</strong> card above should show "Operational". If it shows "Degraded", re-run:
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <pre className="flex-1 text-[11px] bg-muted rounded px-2 py-1.5 overflow-x-auto">
                        <code>pnpm --filter @workspace/scripts run seed:auto</code>
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopyCmd("pnpm --filter @workspace/scripts run seed:auto")}
                        className={cn(
                          "shrink-0 flex items-center gap-1 text-[11px] font-medium rounded px-2 py-1.5 border transition-colors",
                          copiedCmd === "pnpm --filter @workspace/scripts run seed:auto"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-muted hover:bg-slate-100 text-muted-foreground hover:text-foreground",
                        )}
                        aria-label="Copy seed command"
                      >
                        {copiedCmd === "pnpm --filter @workspace/scripts run seed:auto"
                          ? <><Check className="h-3 w-3" /> Copied</>
                          : <><Copy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                    emailTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {emailTone === "ok" ? "✓" : "4"}
                  </span>
                  <div>
                    <p className="font-medium leading-snug">
                      Configure email{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add <code className="bg-muted px-1 rounded text-[11px]">RESEND_API_KEY</code> in{" "}
                      <strong>Secrets</strong> to enable outbound email. The site works without it.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Full setup docs in{" "}
                  <code className="bg-muted px-1 rounded text-[11px]">replit.md</code> and{" "}
                  <code className="bg-muted px-1 rounded text-[11px]">scripts/setup.sh</code>.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
