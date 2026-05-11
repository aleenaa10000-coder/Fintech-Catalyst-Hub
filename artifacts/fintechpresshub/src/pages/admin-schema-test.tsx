import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

async function fetchSchemaTest(): Promise<SchemaTestData> {
  const res = await fetch("/api/admin/schema-test", { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<SchemaTestData>;
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

function InternalSchemaPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SchemaTestData>({
    queryKey: ["admin-schema-test"],
    queryFn: fetchSchemaTest,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Internal Schema Validation</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Re-run
        </Button>
      </CardHeader>
      <CardContent>
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
      </div>
    </>
  );
}
