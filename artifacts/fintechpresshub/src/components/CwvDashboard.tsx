import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface RatingBucket {
  count: number;
  avg: number;
  p75: number;
}

interface VitalsSummary {
  summary: Record<string, Record<string, RatingBucket>>;
  totals: Record<string, number>;
  days: number;
  since: string;
}

const METRIC_LABELS: Record<string, { label: string; unit: string; goodThreshold: number; poorThreshold: number }> = {
  LCP: { label: "Largest Contentful Paint", unit: "ms", goodThreshold: 2500, poorThreshold: 4000 },
  CLS: { label: "Cumulative Layout Shift", unit: "", goodThreshold: 0.1, poorThreshold: 0.25 },
  INP: { label: "Interaction to Next Paint", unit: "ms", goodThreshold: 200, poorThreshold: 500 },
  FID: { label: "First Input Delay", unit: "ms", goodThreshold: 100, poorThreshold: 300 },
  TTFB: { label: "Time to First Byte", unit: "ms", goodThreshold: 800, poorThreshold: 1800 },
};

const RATING_COLORS: Record<string, string> = {
  good: "bg-emerald-500",
  "needs-improvement": "bg-amber-400",
  poor: "bg-red-500",
};

const RATING_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  good: "default",
  "needs-improvement": "secondary",
  poor: "destructive",
};

function formatValue(name: string, value: number): string {
  const meta = METRIC_LABELS[name];
  if (!meta) return String(value);
  if (meta.unit === "ms") return `${Math.round(value)} ms`;
  if (meta.unit === "") return value.toFixed(3);
  return `${value}${meta.unit}`;
}

function RatingBar({ name, ratings, total }: {
  name: string;
  ratings: Record<string, RatingBucket>;
  total: number;
}) {
  const order = ["good", "needs-improvement", "poor"];
  if (total === 0) return null;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {order.map((r) => {
        const bucket = ratings[r];
        if (!bucket) return null;
        const pct = (bucket.count / total) * 100;
        return (
          <div
            key={r}
            className={`${RATING_COLORS[r]} transition-all`}
            style={{ width: `${pct}%` }}
            title={`${r}: ${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

function MetricCard({ name, ratings, total }: {
  name: string;
  ratings: Record<string, RatingBucket>;
  total: number;
}) {
  const meta = METRIC_LABELS[name];
  if (!meta) return null;

  const good = ratings["good"];
  const goodPct = total > 0 && good ? Math.round((good.count / total) * 100) : 0;
  const p75All = Object.values(ratings).reduce(
    (best, r) => (r.p75 > best ? r.p75 : best),
    0,
  );
  // Use the "good" bucket p75 as the primary p75 signal; fall back to overall max
  const displayP75 = good?.p75 ?? p75All;

  const dominantRating =
    Object.entries(ratings).sort(([, a], [, b]) => b.count - a.count)[0]?.[0] ?? "poor";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">{name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{meta.label}</span>
        </div>
        <Badge variant={RATING_BADGE[dominantRating] ?? "outline"} className="text-xs">
          {goodPct}% good
        </Badge>
      </div>
      <RatingBar name={name} ratings={ratings} total={total} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>p75: {formatValue(name, displayP75)}</span>
        <span>{total.toLocaleString()} samples</span>
      </div>
    </div>
  );
}

export function CwvDashboard() {
  const { data, isLoading, isError } = useQuery<VitalsSummary>({
    queryKey: ["admin", "vitals", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vitals/summary?days=30", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<VitalsSummary>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const primaryMetrics = ["LCP", "CLS", "INP"];
  const secondaryMetrics = ["FID", "TTFB"];

  const hasData =
    data && Object.keys(data.summary).length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand" />
          <CardTitle className="text-base">Core Web Vitals</CardTitle>
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              Last {data.days} days
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-2 w-full rounded-full bg-muted" />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Could not load CWV data.
          </p>
        )}
        {!isLoading && !isError && !hasData && (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">No measurements yet.</p>
            <p className="text-xs text-muted-foreground">
              CWV data appears automatically once real users visit the site.
            </p>
          </div>
        )}
        {hasData && (
          <div className="space-y-4">
            <div className="space-y-4">
              {primaryMetrics.map((name) => {
                const ratings = data.summary[name];
                if (!ratings) return null;
                return (
                  <MetricCard
                    key={name}
                    name={name}
                    ratings={ratings}
                    total={data.totals[name] ?? 0}
                  />
                );
              })}
            </div>
            {secondaryMetrics.some((m) => data.summary[m]) && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  Show secondary metrics (FID, TTFB)
                </summary>
                <div className="mt-3 space-y-4">
                  {secondaryMetrics.map((name) => {
                    const ratings = data.summary[name];
                    if (!ratings) return null;
                    return (
                      <MetricCard
                        key={name}
                        name={name}
                        ratings={ratings}
                        total={data.totals[name] ?? 0}
                      />
                    );
                  })}
                </div>
              </details>
            )}
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Good</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Needs improvement</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Poor</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
