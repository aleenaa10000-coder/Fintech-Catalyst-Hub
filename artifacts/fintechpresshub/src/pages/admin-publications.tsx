import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageMeta } from "@/components/PageMeta";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Pencil, X, Save, Lock } from "lucide-react";
import { Link } from "wouter";

interface Publication {
  id: number;
  name: string;
  url: string;
  dr: number;
  tier: number;
  focus: string;
  region: string;
  guestPosts: boolean;
  notes: string;
  sortOrder: number;
}

const TIER_COLORS: Record<number, string> = {
  1: "bg-[#0052FF]/10 text-[#0052FF]",
  2: "bg-emerald-100 text-emerald-700",
  3: "bg-slate-100 text-slate-600",
};

const emptyForm = {
  name: "",
  url: "",
  dr: "",
  tier: "2",
  focus: "",
  region: "Global",
  guestPosts: false,
  notes: "",
  sortOrder: "0",
};

type FormState = typeof emptyForm;

export default function AdminPublications() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/publications");
      if (!r.ok) throw new Error("Failed to load");
      setPublications(await r.json());
    } catch {
      toast.error("Could not load publications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/admin/publications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          url: createForm.url.trim(),
          dr: Number(createForm.dr) || 0,
          tier: Number(createForm.tier) || 2,
          focus: createForm.focus.trim(),
          region: createForm.region.trim() || "Global",
          guestPosts: createForm.guestPosts,
          notes: createForm.notes.trim(),
          sortOrder: Number(createForm.sortOrder) || 0,
        }),
      });
      if (!r.ok) throw new Error("Failed to create");
      toast.success(`Added "${createForm.name}"`);
      setCreateForm(emptyForm);
      setShowCreate(false);
      await load();
    } catch {
      toast.error("Could not create publication.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: number) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/publications/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          url: editForm.url.trim(),
          dr: Number(editForm.dr) || 0,
          tier: Number(editForm.tier) || 2,
          focus: editForm.focus.trim(),
          region: editForm.region.trim() || "Global",
          guestPosts: editForm.guestPosts,
          notes: editForm.notes.trim(),
          sortOrder: Number(editForm.sortOrder) || 0,
        }),
      });
      if (!r.ok) throw new Error("Failed to update");
      toast.success("Saved changes");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pub: Publication) {
    if (!window.confirm(`Delete "${pub.name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/admin/publications/${pub.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to delete");
      toast.success(`Deleted "${pub.name}"`);
      await load();
    } catch {
      toast.error("Could not delete publication.");
    }
  }

  function startEdit(pub: Publication) {
    setEditingId(pub.id);
    setEditForm({
      name: pub.name,
      url: pub.url,
      dr: String(pub.dr),
      tier: String(pub.tier),
      focus: pub.focus,
      region: pub.region,
      guestPosts: pub.guestPosts,
      notes: pub.notes,
      sortOrder: String(pub.sortOrder),
    });
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="w-8 h-8 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold mb-2">Admin access required</h1>
            <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/admin/login">Sign in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" noindex />
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">Fintech Publications</h1>
            <p className="text-muted-foreground text-sm">Manage the directory shown on the public Fintech Publications resource page.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm"><Link href="/admin">← Dashboard</Link></Button>
            <Button size="sm" className="bg-[#0052FF] hover:bg-[#0040cc]" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add publication
            </Button>
          </div>
        </div>

        {showCreate && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Add new publication</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PublicationFormFields form={createForm} setForm={setCreateForm} />
                <div className="sm:col-span-2 flex gap-2">
                  <Button type="submit" size="sm" className="bg-[#0052FF] hover:bg-[#0040cc]" disabled={saving}>
                    {saving ? "Saving…" : "Add publication"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowCreate(false); setCreateForm(emptyForm); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading && <p className="text-muted-foreground">Loading…</p>}

        {!loading && publications.length === 0 && (
          <div className="rounded-md border border-dashed px-6 py-10 text-center text-muted-foreground">
            <p className="font-medium">No publications yet</p>
            <p className="text-sm mt-1">Click "Add publication" to get started.</p>
          </div>
        )}

        <div className="space-y-3">
          {publications.map((pub) => (
            <Card key={pub.id} className="overflow-hidden">
              {editingId === pub.id ? (
                <CardContent className="pt-5">
                  <form
                    onSubmit={(e) => { e.preventDefault(); void handleUpdate(pub.id); }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <PublicationFormFields form={editForm} setForm={setEditForm} />
                    <div className="sm:col-span-2 flex gap-2">
                      <Button type="submit" size="sm" className="bg-[#0052FF] hover:bg-[#0040cc]" disabled={saving}>
                        <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save changes"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              ) : (
                <CardContent className="pt-4 pb-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{pub.name}</span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 ${TIER_COLORS[pub.tier] ?? ""}`}>
                        Tier {pub.tier}
                      </Badge>
                      {pub.guestPosts && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700">
                          Guest posts
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-muted-foreground">DR {pub.dr}</span>
                      <span className="text-xs text-muted-foreground">{pub.region}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pub.focus}</p>
                    {pub.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{pub.notes}</p>}
                    <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0052FF] hover:underline inline-flex items-center gap-1 mt-1">
                      {pub.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(pub)} aria-label={`Edit ${pub.name}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDelete(pub)} aria-label={`Delete ${pub.name}`} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublicationFormFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <>
      <div>
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Finextra" />
      </div>
      <div>
        <Label>URL</Label>
        <Input required type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" />
      </div>
      <div>
        <Label>Domain Rating (DR)</Label>
        <Input type="number" min={0} max={100} value={form.dr} onChange={(e) => setForm((f) => ({ ...f, dr: e.target.value }))} placeholder="0–100" />
      </div>
      <div>
        <Label>Tier</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={form.tier}
          onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
        >
          <option value="1">Tier 1 (DR 60+)</option>
          <option value="2">Tier 2 (DR 40–60)</option>
          <option value="3">Tier 3 (DR &lt;40)</option>
        </select>
      </div>
      <div>
        <Label>Editorial focus</Label>
        <Input value={form.focus} onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))} placeholder="e.g. Payments & open banking" />
      </div>
      <div>
        <Label>Region</Label>
        <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="e.g. Global, US, EU/UK" />
      </div>
      <div>
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Short editorial note…" />
      </div>
      <div>
        <Label>Sort order</Label>
        <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="0" />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="guestPosts"
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={form.guestPosts}
          onChange={(e) => setForm((f) => ({ ...f, guestPosts: e.target.checked }))}
        />
        <Label htmlFor="guestPosts" className="cursor-pointer">Accepts guest posts</Label>
      </div>
    </>
  );
}
