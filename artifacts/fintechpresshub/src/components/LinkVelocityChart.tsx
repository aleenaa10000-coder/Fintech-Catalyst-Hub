import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, ExternalLink } from "lucide-react";

interface LinkVelocityWeek {
  weekLabel: string;
  weekStart: string;
  newDomains: number;
}

interface LinkVelocityData {
  weeks: LinkVelocityWeek[];
  totalDomains: number;
  avgPerWeek: number;
}

async function fetchLinkVelocity(): Promise<LinkVelocityData> {
  const res = await fetch("/api/admin/seo-performance/link-velocity", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<LinkVelocityData>;
}

const chartConfig = {
  newDomains: {
    label: "New Referring Domains",
    color: "#0052FF",
  },
} satisfies ChartConfig;

export function LinkVelocityChart() {
  const { data, isLoading, isError } = useQuery<LinkVelocityData>({
    queryKey: ["admin-link-velocity"],
    queryFn: fetchLinkVelocity,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0052FF]" />
              Link Velocity
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              New referring domains per week — last 90 days
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold tabular-nums leading-tight">
                  {data.totalDomains.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg/week</p>
                <p className="text-xl font-bold tabular-nums leading-tight">
                  {data.avgPerWeek.toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading && (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Loading link velocity data…
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Failed to load link velocity data.
          </div>
        )}

        {data && data.weeks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              No referring domain data yet for the last 90 days.
            </p>
            <p className="text-xs text-muted-foreground">
              Import your referring domains from Google Search Console or Ahrefs to populate this chart.
            </p>
          </div>
        )}

        {data && data.weeks.length > 0 && (
          <>
            <ChartContainer config={chartConfig} className="h-52 w-full">
              <BarChart
                data={data.weeks}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  width={32}
                />
                <ReferenceLine
                  y={data.avgPerWeek}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `avg ${data.avgPerWeek.toFixed(1)}`,
                    position: "right",
                    fontSize: 10,
                    fill: "#94a3b8",
                    offset: 4,
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        `${value} new domain${Number(value) !== 1 ? "s" : ""}`,
                        "Referring domains",
                      ]}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                  }
                />
                <Bar
                  dataKey="newDomains"
                  fill="var(--color-newDomains)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>

            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <ExternalLink className="w-3 h-3 shrink-0" />
              Data sourced from GSC exports and manual domain entries. Dashed line shows 13-week average.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
