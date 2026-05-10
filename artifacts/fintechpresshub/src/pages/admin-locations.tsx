import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type LocationPage = {
  id: number;
  slug: string;
  city: string;
  region: string | null;
  country: string;
  countryCode: string;
  headline: string;
  body: string;
  publishedAt: string;
};

type LocationDraft = {
  slug: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  headline: string;
  body: string;
};

const EMPTY_DRAFT: LocationDraft = {
  slug: "",
  city: "",
  region: "",
  country: "",
  countryCode: "",
  headline: "",
  body: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error ?? "Request failed"), {
      status: res.status,
    });
  }
  return res.json() as Promise<T>;
}

function LocationForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  mode,
}: {
  initial: LocationDraft;
  onSave: (draft: LocationDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<LocationDraft>(initial);

  const set =
    (k: keyof LocationDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  const handleCityBlur = () => {
    if (mode === "create" && !draft.slug && draft.city) {
      setDraft((d) => ({ ...d, slug: slugify(d.city) }));
    }
    if (!draft.headline && draft.city) {
      setDraft((d) => ({
        ...d,
        headline: `Fintech SEO Agency in ${d.city}`,
      }));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            required
            value={draft.city}
            onChange={set("city")}
            onBlur={handleCityBlur}
            placeholder="e.g. London"
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            required
            value={draft.slug}
            onChange={set("slug")}
            placeholder="e.g. london"
            pattern="[a-z0-9][a-z0-9-]*"
            title="Lowercase letters, numbers and hyphens only"
            disabled={mode === "edit"}
          />
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground mt-1">
              Slug cannot be changed after creation.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="region">
            Region{" "}
            <span className="text-muted-foreground font-normal">
              (state / county — optional)
            </span>
          </Label>
          <Input
            id="region"
            value={draft.region}
            onChange={set("region")}
            placeholder="e.g. England, NY"
          />
        </div>
        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            required
            value={draft.country}
            onChange={set("country")}
            placeholder="e.g. United Kingdom"
          />
        </div>
        <div>
          <Label htmlFor="countryCode">
            Country code *{" "}
            <span className="text-muted-foreground font-normal">
              (ISO 3166-1 alpha-2)
            </span>
          </Label>
          <Input
            id="countryCode"
            required
            value={draft.countryCode}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                countryCode: e.target.value.toUpperCase().slice(0, 2),
              }))
            }
            placeholder="GB"
            maxLength={2}
            pattern="[A-Z]{2}"
            title="Two uppercase letters, e.g. GB, US, SG"
            className="uppercase"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="headline">
          Page headline *{" "}
          <span className="text-muted-foreground font-normal">(≤ 200 chars)</span>
        </Label>
        <Input
          id="headline"
          required
          maxLength={200}
          value={draft.headline}
          onChange={set("headline")}
          placeholder="e.g. Fintech SEO Agency in London"
        />
      </div>

      <div>
        <Label htmlFor="body">
          Page body *{" "}
          <span className="text-muted-foreground font-normal">(HTML)</span>
        </Label>
        <Textarea
          id="body"
          required
          rows={8}
          value={draft.body}
          onChange={set("body")}
          className="font-mono text-xs"
          placeholder="<p>Describe the local fintech market, your service offering in this city, and relevant regulatory context.</p>"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-[#0052FF] hover:bg-[#0040cc]"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {mode === "create" ? "Create location" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminLocations() {
  useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationPage | null>(null);

  const {
    data: locations = [],
    isLoading,
    refetch,
  } = useQuery<LocationPage[]>({
    queryKey: ["admin-locations"],
    queryFn: () => apiFetch<LocationPage[]>("/locations"),
  });

  const createMut = useMutation({
    mutationFn: (draft: LocationDraft) =>
      apiFetch<LocationPage>("/admin/locations", {
        method: "POST",
        body: JSON.stringify({
          slug: draft.slug,
          city: draft.city,
          region: draft.region || undefined,
          country: draft.country,
          countryCode: draft.countryCode,
          headline: draft.headline,
          body: draft.body,
        }),
      }),
    onSuccess: (row) => {
      toast.success(`"${row.city}" location page created`);
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      setCreating(false);
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409)
        toast.error("A location page with this slug already exists.");
      else toast.error(err.message || "Could not create location.");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: LocationDraft }) =>
      apiFetch<LocationPage>(`/admin/locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          city: draft.city,
          region: draft.region || undefined,
          country: draft.country,
          countryCode: draft.countryCode,
          headline: draft.headline,
          body: draft.body,
        }),
      }),
    onSuccess: (row) => {
      toast.success(`"${row.city}" updated`);
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      setEditingId(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not update location."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/locations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Location page deleted");
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not delete location."),
  });

  const filtered = locations.filter((loc) => {
    const q = search.toLowerCase();
    return (
      loc.city.toLowerCase().includes(q) ||
      loc.country.toLowerCase().includes(q) ||
      loc.slug.includes(q) ||
      (loc.region ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Location Pages Admin | FintechPressHub" noindex />

      <div className="container mx-auto px-4 max-w-5xl py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <MapPin className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Location Pages</h1>
            <p className="text-sm text-muted-foreground">
              {locations.length} location
              {locations.length !== 1 ? "s" : ""} · public at{" "}
              <Link href="/locations" className="underline hover:text-primary">
                /locations
              </Link>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button
              size="sm"
              className="bg-[#0052FF] hover:bg-[#0040cc]"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New location
            </Button>
          </div>
        </div>

        {creating && (
          <Card className="mb-6 border-[#0052FF]/30">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">New location page</h2>
              <LocationForm
                initial={EMPTY_DRAFT}
                onSave={(draft) => createMut.mutate(draft)}
                onCancel={() => setCreating(false)}
                isSaving={createMut.isPending}
                mode="create"
              />
            </CardContent>
          </Card>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search cities, countries, slugs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading locations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search
              ? "No locations match your search."
              : "No location pages yet. Create the first one above."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((loc) => (
              <Card key={loc.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editingId === loc.id ? (
                    <div className="p-5">
                      <h3 className="font-semibold mb-4">
                        Editing: {loc.city}
                      </h3>
                      <LocationForm
                        initial={{
                          slug: loc.slug,
                          city: loc.city,
                          region: loc.region ?? "",
                          country: loc.country,
                          countryCode: loc.countryCode,
                          headline: loc.headline,
                          body: loc.body,
                        }}
                        onSave={(draft) =>
                          updateMut.mutate({ id: loc.id, draft })
                        }
                        onCancel={() => setEditingId(null)}
                        isSaving={updateMut.isPending}
                        mode="edit"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{loc.city}</span>
                          {loc.region && (
                            <span className="text-muted-foreground text-sm">
                              {loc.region},
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {loc.countryCode}
                          </Badge>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            /locations/{loc.slug}
                          </code>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {loc.headline}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {loc.country}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="View live page"
                        >
                          <a
                            href={`/locations/${loc.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(loc.id);
                            setCreating(false);
                          }}
                          title="Edit location"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(loc)}
                          title="Delete location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteTarget?.city}" location page?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the location page at{" "}
              <code>/locations/{deleteTarget?.slug}</code> and remove it from
              the sitemap. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMut.mutate(deleteTarget.id)
              }
              disabled={deleteMut.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
