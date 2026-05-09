import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  TrendingUp,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

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

interface ImportResult {
  imported: number;
  skipped: number;
  totalInFile: number;
  truncated: boolean;
  maxRows: number;
}

async function fetchLinkVelocity(): Promise<LinkVelocityData> {
  const res = await fetch("/api/admin/seo-performance/link-velocity", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<LinkVelocityData>;
}

async function importCsv(csvText: string): Promise<ImportResult> {
  const res = await fetch("/api/admin/referring-domains/import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  });
  const json = (await res.json()) as ImportResult & { error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Import failed");
  return json;
}

const chartConfig = {
  newDomains: {
    label: "New Referring Domains",
    color: "#0052FF",
  },
} satisfies ChartConfig;

type ImportState =
  | { status: "idle" }
  | { status: "picking" }
  | { status: "loading" }
  | { status: "success"; result: ImportResult }
  | { status: "error"; message: string };

export function LinkVelocityChart() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  const { data, isLoading, isError } = useQuery<LinkVelocityData>({
    queryKey: ["admin-link-velocity"],
    queryFn: fetchLinkVelocity,
    staleTime: 5 * 60 * 1000,
  });

  function openPicker() {
    setImportState({ status: "picking" });
    fileRef.current?.click();
  }

  function dismissImport() {
    setImportState({ status: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImportState({ status: "idle" });
      return;
    }
    setImportState({ status: "loading" });
    try {
      const text = await file.text();
      const result = await importCsv(text);
      setImportState({ status: "success", result });
      // Refresh the chart to reflect newly imported domains
      await queryClient.invalidateQueries({ queryKey: ["admin-link-velocity"] });
    } catch (err) {
      setImportState({
        status: "error",
        message: err instanceof Error ? err.message : "Import failed",
      });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card>
      {/* Hidden file input — triggered programmatically */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="hidden"
        onChange={handleFile}
      />

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

          <div className="flex items-start gap-4 shrink-0">
            {data && (
              <div className="flex items-center gap-4 text-right">
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

            <Button
              size="sm"
              variant="outline"
              onClick={openPicker}
              disabled={importState.status === "loading"}
              className="gap-1.5 shrink-0"
            >
              {importState.status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Import CSV
            </Button>
          </div>
        </div>

        {/* Import feedback banner */}
        {importState.status === "success" && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {importState.result.imported.toLocaleString()} domain
                {importState.result.imported !== 1 ? "s" : ""} imported
              </span>
              {importState.result.skipped > 0 && (
                <span className="text-emerald-700">
                  {" "}· {importState.result.skipped} already existed (skipped)
                </span>
              )}
              {importState.result.truncated && (
                <span className="text-emerald-700">
                  {" "}· file truncated to {importState.result.maxRows.toLocaleString()} rows
                </span>
              )}
            </div>
            <button onClick={dismissImport} className="shrink-0 text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {importState.status === "error" && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 min-w-0">{importState.message}</span>
            <button onClick={dismissImport} className="shrink-0 text-red-600 hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">No referring domain data yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Click <strong>Import CSV</strong> to upload an Ahrefs, SEMrush, or Majestic
                referring-domains export, or a plain list of domains.
              </p>
            </div>
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

            <div className="mt-3 rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground/80">Accepted CSV formats</p>
              <p>
                <strong>Ahrefs</strong> — "Referring Domain, Domain Rating, …, First seen, …"
              </p>
              <p>
                <strong>SEMrush / Majestic</strong> — any CSV with a "Domain" or "Referring Domain" column
              </p>
              <p>
                <strong>Plain list</strong> — one domain per line (no header needed)
              </p>
              <p className="pt-0.5">
                Duplicate domains are silently skipped. Max {(5000).toLocaleString()} rows per import.
                Dashed line = 13-week average.
              </p>
            </div>
          </>
        )}

        {/* Show format hint in empty state too */}
        {data && data.weeks.length === 0 && (
          <div className="mt-2 rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground/80">Accepted CSV formats</p>
            <p><strong>Ahrefs</strong> — "Referring Domain, …, First seen, …"</p>
            <p><strong>SEMrush / Majestic</strong> — any CSV with a "Domain" column</p>
            <p><strong>Plain list</strong> — one domain per line</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
