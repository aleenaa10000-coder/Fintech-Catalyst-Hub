import { Link } from "wouter";
import {
  useHealthCheck,
  getHealthCheckQueryKey,
  type HealthStatus,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

type Tone = "ok" | "degraded" | "down" | "loading";

const TONE: Record<
  Tone,
  { dot: string; pulse: string; label: string; pillExtra?: string }
> = {
  ok: {
    dot: "bg-emerald-400",
    pulse: "bg-emerald-400/70",
    label: "All systems operational",
  },
  degraded: {
    dot: "bg-amber-400",
    pulse: "bg-amber-400/70",
    label: "Some services degraded",
  },
  down: {
    dot: "bg-red-400",
    pulse: "bg-red-400/70",
    label: "Service disruption",
  },
  loading: {
    dot: "bg-white/50",
    pulse: "bg-white/30",
    label: "Checking status…",
  },
};

function deriveTone(
  data: HealthStatus | undefined,
  isError: boolean,
  isLoading: boolean,
): Tone {
  if (isError) return "down";
  if (isLoading || !data) return "loading";
  if (!data.db.ok) return "down";
  if (!data.email.ok || !data.seedData.ok) return "degraded";
  return "ok";
}

interface Props {
  className?: string;
}

export function LandingHealthIndicator({ className }: Props) {
  const { data, isError, isLoading } = useHealthCheck<HealthStatus>({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: POLL_MS / 2,
      gcTime: 5 * 60_000,
    },
  });

  const tone = deriveTone(data, isError, isLoading);
  const t = TONE[tone];

  return (
    <Link
      href="/status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-white/15 transition-colors",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Site status: ${t.label}. View status page.`}
      data-testid="landing-health-indicator"
      data-tone={tone}
    >
      <span className="relative inline-flex h-2 w-2">
        {tone !== "loading" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              t.pulse,
            )}
            aria-hidden
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            t.dot,
          )}
          aria-hidden
        />
      </span>
      <span>{t.label}</span>
    </Link>
  );
}
