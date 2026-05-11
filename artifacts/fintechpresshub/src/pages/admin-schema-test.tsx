import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  RefreshCw,
  ExternalLink,
  Code2,
  ShieldCheck,
  Copy,
  CopyCheck,
  Mail,
  History,
  CalendarClock,
  MousePointerClick,
} from "lucide-react";

interface SchemaValidationResult {
  schemaType: string;
  context: string;
  valid: boolean;
  missing: string[];
  warnings: string[];
}

interface SchemaTestData {
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    toolSlugs: number;
    serviceSlugs: number;
  };
  coverageWarnings: string[];
  results: SchemaValidationResult[];
  runAt: string;
}

interface RichResultDetectedItem {
  richResultType: string;
  items?: { name?: string; issues?: { issueMessage: string; severity: string }[] }[];
}

interface GoogleRichResultsResponse {
  inspectionResult?: {
    richResultsResult?: {
      detectedItems?: RichResultDetectedItem[];
      verdict?: string;
    };
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
    };
  };
  error?: string;
  hint?: string;
  details?: unknown;
}

interface HealthRunIssue {
  schemaType: string;
  context: string;
  valid: boolean;
  warnings: string[];
}

interface HealthRun {
  id: number;
  ranAt: string;
  trigger: "scheduled" | "manual";
  total: number;
  passed: number;
  failures: number;
  warnings: number;
  emailSent: boolean;
  skipReason: string | null;
  issues: HealthRunIssue[] | null;
}

async function fetchSchemaTest(): Promise<SchemaTestData> {
  const res = await fetch("/api/admin/schema-test", { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<SchemaTestData>;
}

async function fetchHealthHistory(): Promise<{ runs: HealthRun[] }> {
  const res = await fetch("/api/admin/schema-health/history", { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<{ runs: HealthRun[] }>;
}

async function fetchRichResults(url: string): Promise<GoogleRichResultsResponse> {
  const res = await fetch(
    `/api/seo/validate?url=${encodeURIComponent(url)}`,
    { credentials: "include" },
  );
  const json = (await res.json()) as GoogleRichResultsResponse;
  if (!res.ok) return json;
  return json;
}

function VerdictBadge({ verdict }: { verdict: string | undefined }) {
  if (!verdict) return null;
  if (verdict === "PASS")
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle2 className="w-3 h-3" /> Pass
      </Badge>
    );
  if (verdict === "FAIL")
    return (
      <Badge className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
        <XCircle className="w-3 h-3" /> Fail
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1">
      {verdict}
    </Badge>
  );
}

function CurlCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const curlCmd = [
    `curl -X POST \\`,
    `  "https://searchconsole.googleapis.com/v1/urlTestingTools/richResultsTest:run?key=YOUR_GOOGLE_RICH_RESULTS_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"url":"${url}","userAgent":"DESKTOP"}'`,
  ].join("\n");

  function handleCopy() {
    void navigator.clipboard.writeText(curlCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 shrink-0 font-mono text-xs"
      title={curlCmd}
    >
      {copied ? (
        <CopyCheck className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied!" : "Copy as cURL"}
    </Button>
  );
}

function RichResultsPanel({ data, url }: { data: GoogleRichResultsResponse; url: string }) {
  if (data.error) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">{data.error}</p>
        {data.hint && <p className="text-amber-700">{data.hint}</p>}
        {data.details && (
          <pre className="mt-2 text-xs text-amber-700 overflow-auto whitespace-pre-wrap max-h-40 rounded bg-amber-100 p-2">
            {JSON.stringify(data.details, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  const richResult = data.inspectionResult?.richResultsResult;
  const indexResult = data.inspectionResult?.indexStatusResult;
  const detected = richResult?.detectedItems ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">URL tested:</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:underline flex items-center gap-1 truncate max-w-xs"
        >
          {url} <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <VerdictBadge verdict={richResult?.verdict} />
        <CurlCopyButton url={url} />
      </div>

      {indexResult && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Index status</p>
            <p className="font-medium">{indexResult.verdict ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Coverage</p>
            <p className="font-medium">{indexResult.coverageState ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">robots.txt</p>
            <p className="font-medium">{indexResult.robotsTxtState ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Indexing</p>
            <p className="font-medium">{indexResult.indexingState ?? "—"}</p>
          </div>
        </div>
      )}

      {detected.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No rich result types detected on this URL.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {detected.length} rich result type{detected.length !== 1 ? "s" : ""} detected
          </p>
          {detected.map((item, i) => (
            <div key={i} className="rounded-md border overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40">
                <span className="font-semibold text-sm">{item.richResultType}</span>
                <Badge variant="outline" className="text-xs">
                  {(item.items ?? []).length} item{(item.items ?? []).length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {(item.items ?? []).map((entry, j) => {
                const hasIssues = (entry.issues ?? []).length > 0;
                return (
                  <div
                    key={j}
                    className={`px-4 py-2 text-sm border-t ${hasIssues ? "bg-red-50/40" : ""}`}
                  >
                    <p className="font-medium">{entry.name ?? `Item ${j + 1}`}</p>
                    {(entry.issues ?? []).map((issue, k) => (
                      <p
                        key={k}
                        className={`text-xs mt-0.5 flex items-start gap-1.5 ${
                          issue.severity === "ERROR"
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}
                      >
                        {issue.severity === "ERROR" ? (
                          <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        )}
                        {issue.issueMessage}
                      </p>
                    ))}
                    {!hasIssues && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> No issues
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SendNowResult {
  ok: boolean;
  sent: boolean;
  failures: number;
  warnings: number;
  reason: string | null;
}

async function triggerSchemaHealthAlert(): Promise<SendNowResult> {
  const res = await fetch("/api/admin/schema-health/send-now", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<SendNowResult>;
}

function SendNowBanner({ result }: { result: SendNowResult }) {
  if (result.sent) {
    const parts: string[] = [];
    if (result.failures > 0) parts.push(`${result.failures} failure${result.failures !== 1 ? "s" : ""}`);
    if (result.warnings > 0) parts.push(`${result.warnings} warning${result.warnings !== 1 ? "s" : ""}`);
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
        <Mail className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Alert email sent to ADMIN_EMAILS — {parts.join(" and ")} detected.</span>
      </div>
    );
  }
  if (result.reason === "all_healthy") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>All schemas healthy — no alert email sent (silence = healthy).</span>
      </div>
    );
  }
  if (result.reason === "no_recipients") {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Validation ran but <code className="text-xs bg-blue-100 px-1 rounded">ADMIN_EMAILS</code> is
          not set — configure it to receive alert emails.
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>Email send failed — check server logs for details.</span>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function HistoryPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ runs: HealthRun[] }>({
    queryKey: ["schema-health-history"],
    queryFn: fetchHealthHistory,
    staleTime: 0,
  });

  const runs = data?.runs ?? [];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Run History</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        )}
        {isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Failed to load history. Check that you are logged in as admin.
          </div>
        )}
        {!isLoading && !isError && runs.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No runs recorded yet — history appears here after the first "Send alert now" click or scheduled run.
          </p>
        )}
        {runs.length > 0 && (
          <div className="space-y-2">
            {runs.map((run) => {
              const healthy = run.failures === 0 && run.warnings === 0;
              const hasIssues = run.failures > 0 || run.warnings > 0;
              return (
                <details key={run.id} className="group rounded-md border overflow-hidden">
                  <summary className={`flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer select-none list-none
                    ${run.failures > 0 ? "bg-red-50/50 hover:bg-red-50" : run.warnings > 0 ? "bg-amber-50/40 hover:bg-amber-50" : "bg-muted/30 hover:bg-muted/50"}`}>
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${run.failures > 0 ? "bg-red-500" : run.warnings > 0 ? "bg-amber-400" : "bg-emerald-500"}`} />
                    {/* Timestamp */}
                    <span className="text-sm font-medium min-w-0 shrink-0" title={new Date(run.ranAt).toLocaleString()}>
                      {relativeTime(run.ranAt)}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {new Date(run.ranAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {/* Trigger badge */}
                    <Badge variant="outline" className="gap-1 text-xs shrink-0">
                      {run.trigger === "manual"
                        ? <><MousePointerClick className="w-3 h-3" /> Manual</>
                        : <><CalendarClock className="w-3 h-3" /> Scheduled</>}
                    </Badge>
                    {/* Outcome summary */}
                    <span className="flex items-center gap-2 ml-auto text-xs shrink-0">
                      {healthy && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All healthy
                        </span>
                      )}
                      {run.failures > 0 && (
                        <span className="flex items-center gap-1 text-red-700">
                          <XCircle className="w-3.5 h-3.5" /> {run.failures} failure{run.failures !== 1 ? "s" : ""}
                        </span>
                      )}
                      {run.warnings > 0 && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> {run.warnings} warning{run.warnings !== 1 ? "s" : ""}
                        </span>
                      )}
                      {run.emailSent && (
                        <span className="flex items-center gap-1 text-blue-700">
                          <Mail className="w-3.5 h-3.5" /> Alert sent
                        </span>
                      )}
                    </span>
                  </summary>
                  {/* Expanded detail */}
                  <div className="border-t px-4 py-3 text-sm space-y-2 bg-background">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span><strong className="text-foreground">{run.passed}</strong> / {run.total} schemas passed</span>
                      {run.skipReason === "all_healthy" && <span>No email sent — silence = healthy</span>}
                      {run.skipReason === "no_recipients" && <span className="text-amber-700">ADMIN_EMAILS not configured</span>}
                      {run.skipReason === "build_error" && <span className="text-red-700">Validation threw during build</span>}
                      {run.emailSent && <span className="text-blue-700">Alert email dispatched</span>}
                    </div>
                    {hasIssues && run.issues && run.issues.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {run.issues.map((issue, i) => (
                          <div key={i} className={`rounded px-2 py-1.5 text-xs ${!issue.valid ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                            <span className="font-medium">{issue.schemaType}</span>
                            <span className="text-muted-foreground ml-1">— {issue.context}</span>
                            {issue.warnings.map((w, j) => (
                              <p key={j} className="mt-0.5 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {!hasIssues && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected in this run.
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InternalSchemaPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SchemaTestData>({
    queryKey: ["admin-schema-test"],
    queryFn: fetchSchemaTest,
    staleTime: 5 * 60 * 1000,
  });

  const sendNow = useMutation({
    mutationFn: triggerSchemaHealthAlert,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["schema-health-history"] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Internal Schema Validation</CardTitle>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendNow.mutate()}
            disabled={sendNow.isPending}
            title="Trigger the daily schema health alert now and deliver a report email to ADMIN_EMAILS"
            className="gap-1.5"
          >
            {sendNow.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5" />
            )}
            {sendNow.isPending ? "Sending…" : "Send alert now"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(sendNow.isSuccess || sendNow.isError) && (
          <div className="mb-4">
            {sendNow.isSuccess ? (
              <SendNowBanner result={sendNow.data} />
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Request failed — check that you are logged in as admin.</span>
              </div>
            )}
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Running schema validation…
          </div>
        )}
        {isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Failed to run schema validation. Check that you are logged in as admin.
          </div>
        )}
        {data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <strong className="text-emerald-700">{data.summary.passed}</strong> passed
              </span>
              {data.summary.failed > 0 && (
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <strong className="text-red-700">{data.summary.failed}</strong> failed
                </span>
              )}
              {data.summary.warned > 0 && (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <strong className="text-amber-700">{data.summary.warned}</strong> warnings
                </span>
              )}
              <span className="text-muted-foreground">
                · {data.summary.toolSlugs} tools, {data.summary.serviceSlugs} services
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                Run at {new Date(data.runAt).toLocaleTimeString()}
              </span>
            </div>

            {data.coverageWarnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                {data.coverageWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Schema type / context
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Issues
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.results.map((r, i) => (
                    <tr
                      key={i}
                      className={`${!r.valid ? "bg-red-50/40" : r.warnings.length > 0 ? "bg-amber-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.schemaType}</p>
                        <p className="text-xs text-muted-foreground">{r.context}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.valid ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Pass
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-100 text-xs">
                            <XCircle className="w-3 h-3" /> Fail
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.missing.length > 0 && (
                          <p className="text-xs text-red-700">
                            Missing: {r.missing.join(", ")}
                          </p>
                        )}
                        {r.warnings.map((w, j) => (
                          <p key={j} className="text-xs text-amber-700 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                          </p>
                        ))}
                        {r.valid && r.warnings.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSchemaTest() {
  const { user } = useAuth();
  const [urlInput, setUrlInput] = useState("");
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [richData, setRichData] = useState<GoogleRichResultsResponse | null>(null);
  const [richLoading, setRichLoading] = useState(false);
  const [richError, setRichError] = useState<string | null>(null);

  if (!user?.isAdmin) return null;

  async function handleTest() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setTestUrl(trimmed);
    setRichData(null);
    setRichError(null);
    setRichLoading(true);
    try {
      const result = await fetchRichResults(trimmed);
      setRichData(result);
    } catch (err) {
      setRichError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRichLoading(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Schema & Rich Results — Admin"
        description="Validate JSON-LD structured data coverage and run live Google Rich Results Tests on any page URL."
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Schema &amp; Rich Results
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Internal structured-data coverage check + live Google Rich Results Test per URL
              </p>
            </div>
          </div>
        </div>

        {/* Live Google Rich Results Tester */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Live Google Rich Results Test</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste any absolute URL to run it against the Google Rich Results Test API and see
              which rich result types are detected, plus any validation issues.{" "}
              <span className="text-amber-700 font-medium">
                Requires <code className="text-xs bg-muted px-1 rounded">GOOGLE_RICH_RESULTS_API_KEY</code> to be configured.
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleTest(); }}
                placeholder="https://www.fintechpresshub.com/services/fintech-seo"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
              />
              <Button
                onClick={() => void handleTest()}
                disabled={richLoading || !urlInput.trim()}
                className="gap-1.5 shrink-0 bg-[#0052FF] hover:bg-[#0040cc]"
              >
                {richLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {richLoading ? "Testing…" : "Test URL"}
              </Button>
            </div>

            {richError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {richError}
              </div>
            )}

            {richData && testUrl && (
              <div className="pt-1">
                <RichResultsPanel data={richData} url={testUrl} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Internal schema validation */}
        <InternalSchemaPanel />

        {/* Run history timeline */}
        <HistoryPanel />
      </div>
    </>
  );
}
