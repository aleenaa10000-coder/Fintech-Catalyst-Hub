import { useState } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldOff,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type DisavowDomain = {
  id: number;
  domain: string;
  reason: string | null;
  addedBy: string | null;
  createdAt: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error ?? "Request failed"), { status: res.status });
  }
  return res.json() as Promise<T>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminDisavow() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DisavowDomain | null>(null);

  const { data: domains = [], isLoading, refetch } = useQuery<DisavowDomain[]>({
    queryKey: ["admin-disavow"],
    queryFn: () => apiFetch<DisavowDomain[]>("/admin/disavow"),
  });

  const addMut = useMutation({
    mutationFn: () =>
      apiFetch<DisavowDomain>("/admin/disavow", {
        method: "POST",
        body: JSON.stringify({ domain: domain.trim(), reason: reason.trim() || undefined }),
      }),
    onSuccess: (row) => {
      toast.success(`domain:${row.domain} added to disavow list`);
      qc.invalidateQueries({ queryKey: ["admin-disavow"] });
      setDomain("");
      setReason("");
      setShowForm(false);
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409) toast.error("Domain is already in the disavow list.");
      else toast.error(err.message || "Could not add domain.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/disavow/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Domain removed from disavow list");
      qc.invalidateQueries({ queryKey: ["admin-disavow"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || "Could not remove domain."),
  });

  const handleExport = () => {
    window.open("/api/admin/disavow/export", "_blank");
  };

  const filtered = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase()) ||
    (d.reason ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Disavow Manager | FintechPressHub" noindex />

      <div className="container mx-auto px-4 max-w-4xl py-10">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <ShieldOff className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Disavow Manager</h1>
            <p className="text-sm text-muted-foreground">
              {domains.length} domain{domains.length !== 1 ? "s" : ""} queued for Google disavow
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={domains.length === 0}>
              <Download className="w-4 h-4 mr-1.5" /> Export .txt
            </Button>
            <Button
              size="sm"
              className="bg-[#0052FF] hover:bg-[#0040cc]"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add domain
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 ml-14">
          Add toxic or spammy referring domains here, then export and submit the file to{" "}
          <a
            href="https://search.google.com/search-console/disavow-links"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            Google Search Console
          </a>
          .
        </p>

        {showForm && (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Add domain to disavow list</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="domain">Domain *</Label>
                  <Input
                    id="domain"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. spammy-links.example.com"
                    type="text"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the root domain or subdomain. Do not include <code>https://</code> or trailing slashes.
                  </p>
                </div>
                <div>
                  <Label htmlFor="reason">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    id="reason"
                    rows={2}
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. PBN link farm, unrelated niche, manual action referral"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={addMut.isPending || !domain.trim()}
                    className="bg-[#0052FF] hover:bg-[#0040cc]"
                  >
                    {addMut.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add to list
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search domains or reasons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading disavow list…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search
              ? "No domains match your search."
              : "No domains in the disavow list. Add toxic backlink sources above."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono font-medium">domain:{d.domain}</code>
                      <span className="text-xs text-muted-foreground">
                        Added {formatDate(d.createdAt)}
                        {d.addedBy ? ` by ${d.addedBy}` : ""}
                      </span>
                    </div>
                    {d.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setDeleteTarget(d)}
                    title="Remove from disavow list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            After adding or removing domains, export the file and resubmit it to Google Search Console.
          </p>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove domain:{deleteTarget?.domain}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the domain from your disavow list. Google will stop ignoring links from it once you re-export and resubmit the file to Search Console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
