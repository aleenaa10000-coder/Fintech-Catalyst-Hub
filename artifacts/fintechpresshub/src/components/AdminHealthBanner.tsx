import { useLocation } from "wouter";
import {
  useHealthCheck,
  getHealthCheckQueryKey,
  type HealthStatus,
} from "@workspace/api-client-react";
import { AlertTriangle, CircleAlert, X } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

interface Issue {
  key: "api" | "db" | "email" | "seed";
  severity: "warn" | "down";
  message: string;
}

function collectIssues(
  data: HealthStatus | undefined,
  isError: boolean,
): Issue[] {
  if (isError) {
    return [
      {
        key: "api",
        severity: "down",
        message:
          "API server is unreachable. Check the API Server workflow in the Workflows pane.",
      },
    ];
  }
  if (!data) return [];

  const issues: Issue[] = [];

  if (!data.db.ok) {
    issues.push({
      key: "db",
      severity: "down",
      message: data.db.error
        ? `Database is down (${data.db.error}).`
        : "Database is down. Provision Postgres from the Database tool, then restart the API Server.",
    });
  }

  if (!data.email.ok) {
    issues.push({
      key: "email",
      severity: "warn",
      message:
        "No email transport configured. Add RESEND_API_KEY or the SMTP_* secrets to enable contact-form emails.",
    });
  }

  if (!data.seedData.ok) {
    issues.push({
      key: "seed",
      severity: "warn",
      message:
        "Demo content is missing from one or more tables. Restart the API Server workflow to re-run the seed.",
    });
  }

  return issues;
}

export function AdminHealthBanner() {
  const [pathname] = useLocation();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const isAdminRoute = pathname.startsWith("/admin");

  const { data, isError } = useHealthCheck<HealthStatus>({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
      gcTime: 60_000,
      enabled: isAdminRoute,
    },
  });

  const issues = useMemo(
    () => collectIssues(data, isError),
    [data, isError],
  );

  // Stable signature so the dismiss state survives polling refreshes but
  // resets the moment the set of issues actually changes.
  const signature = useMemo(
    () => issues.map((i) => `${i.key}:${i.severity}`).join("|"),
    [issues],
  );

  if (!isAdminRoute || issues.length === 0 || dismissed === signature) {
    return null;
  }

  const hasDown = issues.some((i) => i.severity === "down");
  const Icon = hasDown ? CircleAlert : AlertTriangle;

  const containerClass = hasDown
    ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100";

  const summary =
    issues.length === 1
      ? issues[0].message
      : `${issues.length} setup ${issues.length === 1 ? "issue" : "issues"} need attention — see the System status pills for details.`;

  return (
    <div
      role="alert"
      data-testid="admin-health-banner"
      className={cn(
        "border-b px-4 py-2 text-sm",
        containerClass,
      )}
    >
      <div className="container mx-auto max-w-5xl flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <span className="font-medium">
            {hasDown ? "Setup attention required:" : "Setup notice:"}
          </span>{" "}
          {issues.length === 1 ? (
            summary
          ) : (
            <>
              {summary}
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                {issues.map((issue) => (
                  <li key={issue.key}>{issue.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(signature)}
          aria-label="Dismiss"
          data-testid="admin-health-banner-dismiss"
          className="flex-shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
