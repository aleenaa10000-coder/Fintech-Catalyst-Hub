import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, RefreshCw, BarChart2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TrustStats {
  clientsServed: number;
  articlesPublished: number;
  backlinksAcquired: number;
  averageDomainRating: number;
}

const FIELDS: { key: keyof TrustStats; label: string; description: string; max?: number }[] = [
  {
    key: "clientsServed",
    label: "Clients Served",
    description: "Total number of clients the agency has worked with",
  },
  {
    key: "articlesPublished",
    label: "Articles Published",
    description: "Total articles and blog posts published across all clients",
  },
  {
    key: "backlinksAcquired",
    label: "Backlinks Built",
    description: "Total backlinks acquired for clients",
  },
  {
    key: "averageDomainRating",
    label: "Avg. Partner DR",
    description: "Average domain rating of partner publications (0–100)",
    max: 100,
  },
];

async function fetchStats(): Promise<TrustStats> {
  const res = await fetch("/api/stats/trust");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function patchStats(updates: Partial<TrustStats>): Promise<TrustStats> {
  const res = await fetch("/api/admin/stats", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to save stats");
  }
  return res.json();
}

export default function AdminStats() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<TrustStats>({
    queryKey: ["stats", "trust"],
    queryFn: fetchStats,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setDraft({
        clientsServed: String(data.clientsServed),
        articlesPublished: String(data.articlesPublished),
        backlinksAcquired: String(data.backlinksAcquired),
        averageDomainRating: String(data.averageDomainRating),
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: patchStats,
    onSuccess: (updated) => {
      queryClient.setQueryData(["stats", "trust"], updated);
      toast.success("Stats updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save stats");
    },
  });

  function handleChange(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const updates: Partial<TrustStats> = {};
    let hasError = false;

    for (const field of FIELDS) {
      const raw = draft[field.key];
      const parsed = parseInt(raw ?? "", 10);
      if (isNaN(parsed) || parsed < 0) {
        toast.error(`"${field.label}" must be a valid non-negative number`);
        hasError = true;
        break;
      }
      if (field.max !== undefined && parsed > field.max) {
        toast.error(`"${field.label}" must be between 0 and ${field.max}`);
        hasError = true;
        break;
      }
      updates[field.key] = parsed;
    }

    if (!hasError) {
      mutation.mutate(updates);
    }
  }

  function handleReset() {
    if (data) {
      setDraft({
        clientsServed: String(data.clientsServed),
        articlesPublished: String(data.articlesPublished),
        backlinksAcquired: String(data.backlinksAcquired),
        averageDomainRating: String(data.averageDomainRating),
      });
    }
  }

  const isDirty = data
    ? FIELDS.some((f) => draft[f.key] !== String(data[f.key]))
    : false;

  return (
    <>
      <PageMeta title="Homepage Stats | Admin" noindex />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Homepage Stats</h1>
              <p className="text-sm text-muted-foreground">
                Edit the trust stat counters displayed on the homepage
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Stat Counters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">Loading current values…</p>
            )}
            {isError && (
              <p className="text-sm text-destructive">Failed to load stats. Please refresh.</p>
            )}
            {!isLoading && !isError && (
              <>
                {FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key} className="font-medium">
                      {field.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        id={field.key}
                        type="number"
                        min={0}
                        max={field.max}
                        value={draft[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-40"
                        disabled={mutation.isPending}
                      />
                      {data && draft[field.key] !== String(data[field.key]) && (
                        <span className="text-xs text-muted-foreground">
                          was {data[field.key].toLocaleString("en-US")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-2 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={mutation.isPending || !isDirty}
                    className="gap-2"
                  >
                    {mutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {mutation.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                  {isDirty && (
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      disabled={mutation.isPending}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          Changes take effect immediately on the live site. The counters animate from 0 to the
          new value when a visitor first scrolls to that section.
        </p>
      </div>
    </>
  );
}
