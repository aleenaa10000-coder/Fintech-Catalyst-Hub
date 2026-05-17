import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Lock,
  LogOut,
  ArrowLeft,
  Upload,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Inbox,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { authors } from "@/data/authors";
import { invalidateAuthorPhotoOverrides } from "@/data/useAuthorPhotos";

interface OverrideRow {
  slug: string;
  photoUrl: string;
  updatedBy: string | null;
  updatedAt: string;
}

interface RequestRow {
  id: number;
  slug: string;
  photoUrl: string;
  submitterName: string | null;
  submitterEmail: string | null;
  note: string | null;
  status: "pending" | "approved" | "dismissed";
  createdAt: string;
}

const AUTHOR_NAMES_BY_SLUG: Record<string, string> = {};

const HEADSHOT_MIN = { width: 800, height: 800 };



async function setOverride(slug: string, photoUrl: string) {
  const res = await fetch(
    `/api/admin/author-photos/${encodeURIComponent(slug)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: true; override: OverrideRow };
}

async function reviewRequest(id: number, status: "approved" | "dismissed") {
  const res = await fetch(`/api/admin/author-photo-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: true; request: RequestRow };
}

async function deleteOverride(slug: string) {
  const res = await fetch(
    `/api/admin/author-photos/${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export default function AdminAuthorPhotos() {
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [pendingRequests, setPendingRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Build slug→name map once for the requests panel (which only has slugs).
  for (const a of authors) AUTHOR_NAMES_BY_SLUG[a.slug] = a.name;

  async function loadAll() {
    setLoading(true);
    try {
      const [overridesRes, requestsRes] = await Promise.all([
        fetch("/api/admin/author-photos"),
        fetch("/api/admin/author-photo-requests?status=pending"),
      ]);
      if (overridesRes.ok) {
        const json = (await overridesRes.json()) as { overrides: OverrideRow[] };
        const map: Record<string, OverrideRow> = {};
        for (const r of json.overrides) map[r.slug] = r;
        setOverrides(map);
      } else {
        toast.error("Failed to load author photo overrides.");
      }
      if (requestsRes.ok) {
        const json = (await requestsRes.json()) as { requests: RequestRow[] };
        setPendingRequests(json.requests);
      } else {
        toast.error("Failed to load pending requests.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && isAdmin) loadAll();
  }, [isAuthenticated, isAdmin]);

  async function handleReview(id: number, status: "approved" | "dismissed") {
    setReviewing(id);
    try {
      const { request } = await reviewRequest(id, status);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      if (status === "approved") {
        setOverrides((prev) => ({
          ...prev,
          [request.slug]: {
            slug: request.slug,
            photoUrl: request.photoUrl,
            updatedBy: null,
            updatedAt: new Date().toISOString(),
          },
        }));
        invalidateAuthorPhotoOverrides();
        toast.success("Approved — headshot is now live.");
      } else {
        toast.success("Submission dismissed.");
      }
    } catch {
      toast.error("Couldn't update the submission.");
    } finally {
      setReviewing(null);
    }
  }

  async function handleUpload(slug: string, objectPath: string) {
    setBusy(slug);
    try {
      const { override } = await setOverride(slug, objectPath);
      setOverrides((prev) => ({ ...prev, [slug]: override }));
      invalidateAuthorPhotoOverrides();
      toast.success("Headshot updated. Public site will reflect on next load.");
    } catch {
      toast.error("Couldn't save the new headshot.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevert(slug: string) {
    if (!confirm("Revert to the original committed headshot?")) return;
    setBusy(slug);
    try {
      await deleteOverride(slug);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      invalidateAuthorPhotoOverrides();
      toast.success("Override removed. Original headshot restored.");
    } catch {
      toast.error("Couldn't remove the override.");
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [search]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin sign in required</h1>
            <Button size="lg" onClick={login} className="bg-[#0052FF] hover:bg-[#0040cc]">
              Log in with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to dashboard
            </Link>
            <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
              Author profiles
            </div>
            <h1 className="text-3xl font-bold">Author headshots</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Upload replacement headshots for any contributor. The original
              committed image stays in place as a fallback. Minimum size{" "}
              <strong>800×800&nbsp;px</strong> (1:1) — uploads below spec are
              warned about but still accepted.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <Card className="mb-8 border-amber-200 bg-amber-50/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Inbox className="w-4 h-4 text-amber-700" />
                <h2 className="font-semibold text-amber-900">
                  Pending submissions
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 text-[11px]"
                >
                  {pendingRequests.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const isReviewing = reviewing === req.id;
                  return (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row gap-4 p-3 rounded-lg border border-amber-200 bg-white"
                      data-testid={`pending-request-${req.id}`}
                    >
                      <img
                        src={req.photoUrl}
                        alt="Submitted headshot"
                        className="w-20 h-20 rounded-lg object-cover border shrink-0 mx-auto sm:mx-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          For{" "}
                          <span className="text-[#0052FF]">
                            {AUTHOR_NAMES_BY_SLUG[req.slug] ?? req.slug}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          Submitted{" "}
                          {new Date(req.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          by{" "}
                          {req.submitterEmail ? (
                            <a
                              href={`mailto:${req.submitterEmail}`}
                              className="text-[#0052FF] hover:underline"
                            >
                              {req.submitterName ?? req.submitterEmail}
                            </a>
                          ) : (
                            req.submitterName ?? "anonymous"
                          )}
                        </p>
                        {req.note && (
                          <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 mt-2 whitespace-pre-wrap">
                            {req.note}
                          </p>
                        )}
                      </div>
                      <div className="flex sm:flex-col gap-2 shrink-0 self-stretch justify-end">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                          onClick={() => handleReview(req.id, "approved")}
                          disabled={isReviewing}
                          data-testid={`approve-${req.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleReview(req.id, "dismissed")}
                          disabled={isReviewing}
                          data-testid={`dismiss-${req.id}`}
                        >
                          <XIcon className="w-3.5 h-3.5 mr-1.5" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <Input
            type="search"
            placeholder="Search by name, slug, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            data-testid="author-photos-search"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((author) => {
            const override = overrides[author.slug];
            const currentPhoto = override?.photoUrl ?? author.photo;
            const isBusy = busy === author.slug;
            return (
              <Card key={author.slug} data-testid={`author-card-${author.slug}`}>
                <CardContent className="p-4 flex gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0 border">
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={author.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{author.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {author.role}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                          /{author.slug}
                        </p>
                      </div>
                      {override && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] bg-emerald-100 text-emerald-700 shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5 * 1024 * 1024}
                        imageMinDimensions={HEADSHOT_MIN}
                        onValidationWarning={(msg) => toast.warning(msg)}
                        onComplete={async (result) => {
                          const objectPath = result.successful?.[0]?.uploadURL;
                          if (!objectPath) { toast.error("Upload did not return a path"); return; }
                          await handleUpload(author.slug, objectPath);
                        }}
                        buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        {override ? "Replace" : "Upload headshot"}
                      </ObjectUploader>
                      {override && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRevert(author.slug)}
                          disabled={isBusy}
                          data-testid={`revert-${author.slug}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Revert to original
                        </Button>
                      )}
                    </div>
                    {override && (
                      <p className="text-[11px] text-muted-foreground mt-2 truncate">
                        Updated{" "}
                        {new Date(override.updatedAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                        {override.updatedBy ? ` by ${override.updatedBy}` : ""}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No authors match "{search}".
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
