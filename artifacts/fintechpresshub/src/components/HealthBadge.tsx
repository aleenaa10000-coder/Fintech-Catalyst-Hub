import {
  useHealthCheck,
  getHealthCheckQueryKey,
  type HealthStatus,
} from "@workspace/api-client-react";
import {
  Database,
  Mail,
  Sprout,
  AlertTriangle,
  CircleAlert,
  CheckCircle2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

type Tone = "ok" | "warn" | "down" | "loading";

const TONE_CLASSES: Record<Tone, { pill: string; dot: string }> = {
  ok: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  warn: {
    pill: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  down: {
    pill: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
    dot: "bg-red-500",
  },
  loading: {
    pill: "border-muted bg-muted/40 text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
};

interface PillSpec {
  key: "db" | "email" | "seed";
  Icon: LucideIcon;
  label: string;
  tone: Tone;
  tooltip: React.ReactNode;
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

function formatChecked(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return new Date(iso).toLocaleTimeString();
}

function buildPills(
  data: HealthStatus | undefined,
  isError: boolean,
): PillSpec[] {
  if (isError) {
    const downTip = (
      <div className="space-y-0.5 text-xs leading-relaxed">
        <div>The /api/healthz endpoint did not respond.</div>
        <div>The API server may be restarting or down.</div>
      </div>
    );
    return [
      { key: "db", Icon: Database, label: "DB", tone: "down", tooltip: downTip },
      { key: "email", Icon: Mail, label: "Email", tone: "down", tooltip: downTip },
      { key: "seed", Icon: Sprout, label: "Seed", tone: "down", tooltip: downTip },
    ];
  }

  if (!data) {
    const loadingTip = <span className="text-xs">Probing /api/healthz…</span>;
    return [
      { key: "db", Icon: Database, label: "DB", tone: "loading", tooltip: loadingTip },
      { key: "email", Icon: Mail, label: "Email", tone: "loading", tooltip: loadingTip },
      { key: "seed", Icon: Sprout, label: "Seed", tone: "loading", tooltip: loadingTip },
    ];
  }

  // DB
  const dbTone: Tone = data.db.ok ? "ok" : "down";
  const dbTooltip = (
    <div className="space-y-0.5 text-xs leading-relaxed">
      <div className="font-medium">Database</div>
      {data.db.ok ? (
        <div>Connected · {data.db.latencyMs}ms</div>
      ) : (
        <div>Down{data.db.error ? ` · ${data.db.error}` : ""}</div>
      )}
      <div className="text-muted-foreground">
        Checked {formatChecked(data.checkedAt)} · Up {formatUptime(data.uptimeSeconds)}
      </div>
    </div>
  );

  // Email
  const emailTone: Tone = data.email.ok ? "ok" : "warn";
  const emailTooltip = (
    <div className="space-y-0.5 text-xs leading-relaxed">
      <div className="font-medium">Email transport</div>
      {data.email.ok ? (
        <div>Provider: {data.email.provider}</div>
      ) : (
        <div>
          No provider configured. Set <code>RESEND_API_KEY</code> or the{" "}
          <code>SMTP_*</code> secrets to enable outbound mail.
        </div>
      )}
    </div>
  );

  // Seed
  const seedTone: Tone = data.seedData.ok ? "ok" : "warn";
  const counts = data.seedData.counts ?? {};
  const seedTooltip = (
    <div className="space-y-0.5 text-xs leading-relaxed">
      <div className="font-medium">Seed data</div>
      {data.seedData.ok ? (
        <div>All public tables populated.</div>
      ) : (
        <div>
          One or more tables are empty — restart the API server to re-run the seed.
        </div>
      )}
      {Object.keys(counts).length > 0 && (
        <ul className="grid grid-cols-2 gap-x-3 pt-1 text-muted-foreground">
          {Object.entries(counts).map(([table, n]) => (
            <li key={table}>
              {table}: <span className="text-foreground">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {data.seedData.error && (
        <div className="pt-1 text-amber-700 dark:text-amber-300">
          {data.seedData.error}
        </div>
      )}
    </div>
  );

  return [
    { key: "db", Icon: Database, label: "DB", tone: dbTone, tooltip: dbTooltip },
    { key: "email", Icon: Mail, label: "Email", tone: emailTone, tooltip: emailTooltip },
    { key: "seed", Icon: Sprout, label: "Seed", tone: seedTone, tooltip: seedTooltip },
  ];
}

export function HealthBadge() {
  const { data, isError, isFetching, refetch } = useHealthCheck<HealthStatus>({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
      gcTime: 60_000,
    },
  });

  const pills = buildPills(data, isError);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="inline-flex items-center gap-1.5"
        data-testid="api-health-badge"
        role="status"
        aria-label="API health"
      >
        {pills.map((pill) => {
          const tone = TONE_CLASSES[pill.tone];
          const Icon = pill.Icon;
          const StatusIcon =
            pill.tone === "ok"
              ? CheckCircle2
              : pill.tone === "warn"
                ? AlertTriangle
                : pill.tone === "down"
                  ? CircleAlert
                  : Loader2;
          return (
            <Tooltip key={pill.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => refetch()}
                  data-testid={`api-health-pill-${pill.key}`}
                  aria-label={`${pill.label} ${pill.tone}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-opacity",
                    tone.pill,
                    isFetching && "opacity-80",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  <span>{pill.label}</span>
                  <StatusIcon
                    className={cn(
                      "h-3 w-3",
                      pill.tone === "loading" && "animate-spin",
                    )}
                    aria-hidden
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-xs">
                {pill.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
