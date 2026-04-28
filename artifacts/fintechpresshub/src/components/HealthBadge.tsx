import {
  useHealthCheck,
  getHealthCheckQueryKey,
  type HealthStatus,
} from "@workspace/api-client-react";
import { Activity, AlertTriangle, CircleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

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

interface BadgeView {
  label: string;
  Icon: typeof Activity;
  className: string;
  dot: string;
}

function pickView(
  data: HealthStatus | undefined,
  isError: boolean,
): BadgeView {
  if (isError || !data) {
    return {
      label: "API unreachable",
      Icon: CircleAlert,
      className:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
      dot: "bg-red-500",
    };
  }
  if (data.status === "ok" && data.db.ok) {
    return {
      label: "API healthy",
      Icon: Activity,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  return {
    label: "API degraded",
    Icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
  };
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

  const view = pickView(data, isError);
  const Icon = view.Icon;

  const tooltipLines: string[] = [];
  if (data) {
    tooltipLines.push(
      `Database: ${data.db.ok ? `ok · ${data.db.latencyMs}ms` : `down${data.db.error ? ` · ${data.db.error}` : ""}`}`,
    );
    tooltipLines.push(`Uptime: ${formatUptime(data.uptimeSeconds)}`);
    tooltipLines.push(`Checked: ${formatChecked(data.checkedAt)}`);
  } else if (isError) {
    tooltipLines.push("The /api/healthz endpoint did not respond.");
    tooltipLines.push("The API server may be restarting or down.");
  } else {
    tooltipLines.push("Probing /api/healthz…");
  }
  tooltipLines.push("Click to recheck now.");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => refetch()}
            data-testid="api-health-badge"
            aria-label={view.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity",
              view.className,
              isFetching && "opacity-80",
            )}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                  view.dot,
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  view.dot,
                )}
              />
            </span>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{view.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          <div className="space-y-0.5 text-xs leading-relaxed">
            {tooltipLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
