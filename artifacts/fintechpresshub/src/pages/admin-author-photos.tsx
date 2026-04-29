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

const HEADSHOT_MIN = { width: 800, height: 800 };

async function presignAndUpload(file: {
  name: string;
  size: number;
  type: string;
}) {
  const res = await fetch("/api/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return (await res.json()) as { uploadURL: string; objectPath: string };
}

async function finalizeUpload(uploadURL: string) {
  const res = await fetch("/api/uploads/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadURL }),
  });
  if (!res.ok) throw new Error("Failed to finalize upload");
  return (await res.json()) as { objectPath: string };
}

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadOverrides() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/author-photos");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { overrides: OverrideRow[] };
      const map: Record<string, OverrideRow> = {};
      for (const r of json.overrides) map[r.slug] = r;
      setOverrides(map);
    } catch {
      toast.error("Failed to load author photo overrides.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && isAdmin) loadOverrides();
  }, [isAuthenticated, isAdmin]);

  async function handleUpload(slug: string, uploadURL: string) {
    setBusy(slug);
    try {
      const { objectPath } = await finalizeUpload(uploadURL);
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
              onClick={loadOverrides}
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
                        onGetUploadParameters={async (file) => {
                          const { uploadURL } = await presignAndUpload({
                            name: file.name ?? "headshot",
                            size: file.size ?? 0,
                            type: file.type ?? "application/octet-stream",
                          });
                          return {
                            method: "PUT",
                            url: uploadURL,
                            headers: {
                              "Content-Type":
                                file.type ?? "application/octet-stream",
                            },
                          };
                        }}
                        onComplete={async (result) => {
                          const uploaded = result.successful?.[0];
                          const uploadURL = uploaded?.uploadURL;
                          if (!uploadURL) {
                            toast.error("Upload did not return a URL");
                            return;
                          }
                          await handleUpload(author.slug, uploadURL);
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
