import { useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import {
  useListServices,
  useCreateService,
  useDeleteService,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, Lock, LogOut } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const emptyForm = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  deliverables: "",
  icon: "sparkles",
};

export default function AdminServices() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const qc = useQueryClient();
  const { data: services, isLoading } = useListServices();
  const createMut = useCreateService();
  const deleteMut = useDeleteService();
  const [form, setForm] = useState(emptyForm);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListServicesQueryKey() });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const deliverables = form.deliverables
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (deliverables.length === 0) {
      toast.error("Add at least one deliverable.");
      return;
    }

    try {
      await createMut.mutateAsync({
        data: {
          slug: form.slug.trim(),
          name: form.name.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          deliverables,
          icon: form.icon.trim() || "sparkles",
        },
      });
      toast.success(`Created "${form.name}"`);
      setForm(emptyForm);
      invalidate();
    } catch (err) {
      toast.error("Could not create service. Check the slug isn't already used.");
    }
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMut.mutateAsync({ slug });
      toast.success(`Deleted "${name}"`);
      invalidate();
    } catch {
      toast.error("Could not delete service.");
    }
  };

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
            <p className="text-muted-foreground mb-6">
              You need to sign in to manage services.
            </p>
            <Button size="lg" onClick={login} className="bg-[#0052FF] hover:bg-[#0040cc]">
              Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminServices" />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Services Admin</h1>
            <p className="text-muted-foreground">
              Add or remove services. Changes appear on the public Services page immediately.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Signed in as <strong className="text-foreground">{user?.firstName ?? user?.email ?? "Admin"}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        <Card className="mb-10">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add a service
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (URL-safe)</Label>
                  <Input
                    id="slug"
                    placeholder="e.g. fintech-content-writing"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliverables">Deliverables (one per line)</Label>
                <Textarea
                  id="deliverables"
                  rows={5}
                  placeholder={"Topic and keyword research\n1,500–3,500 word articles\n..."}
                  value={form.deliverables}
                  onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon name (lucide)</Label>
                <Input
                  id="icon"
                  placeholder="sparkles"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={createMut.isPending} size="lg">
                {createMut.isPending ? "Creating..." : "Create service"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Existing services</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {services?.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-6 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {s.tagline}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      slug: <code>{s.slug}</code> · {s.deliverables.length} deliverables
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.slug, s.name)}
                    disabled={deleteMut.isPending}
                    aria-label={`Delete ${s.name}`}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
