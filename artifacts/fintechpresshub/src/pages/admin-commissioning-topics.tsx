import { useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import {
  useListAdminCommissioningTopics,
  useCreateCommissioningTopic,
  useUpdateCommissioningTopic,
  useDeleteCommissioningTopic,
  getListAdminCommissioningTopicsQueryKey,
  getListCommissioningTopicsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, Lock, LogOut, Eye, EyeOff, Save } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const emptyForm = {
  title: "",
  angle: "",
  category: "",
  priority: 0,
  isActive: true,
};

type FormState = typeof emptyForm;

export default function AdminCommissioningTopics() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const qc = useQueryClient();
  const { data: topics, isLoading } = useListAdminCommissioningTopics();
  const createMut = useCreateCommissioningTopic();
  const updateMut = useUpdateCommissioningTopic();
  const deleteMut = useDeleteCommissioningTopic();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListAdminCommissioningTopicsQueryKey() });
    qc.invalidateQueries({ queryKey: getListCommissioningTopicsQueryKey() });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }
    try {
      await createMut.mutateAsync({
        data: {
          title: form.title.trim(),
          angle: form.angle.trim(),
          category: form.category.trim(),
          priority: Number.isFinite(form.priority) ? form.priority : 0,
          isActive: form.isActive,
        },
      });
      toast.success(`Added "${form.title}"`);
      setForm(emptyForm);
      invalidate();
    } catch {
      toast.error("Could not add topic.");
    }
  };

  const startEdit = (t: NonNullable<typeof topics>[number]) => {
    setEditingId(t.id);
    setEditForm({
      title: t.title,
      angle: t.angle,
      category: t.category,
      priority: t.priority,
      isActive: t.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleSaveEdit = async (id: number) => {
    if (editForm.title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id,
        data: {
          title: editForm.title.trim(),
          angle: editForm.angle.trim(),
          category: editForm.category.trim(),
          priority: Number.isFinite(editForm.priority) ? editForm.priority : 0,
          isActive: editForm.isActive,
        },
      });
      toast.success("Saved");
      cancelEdit();
      invalidate();
    } catch {
      toast.error("Could not save changes.");
    }
  };

  const handleToggle = async (t: NonNullable<typeof topics>[number]) => {
    try {
      await updateMut.mutateAsync({
        id: t.id,
        data: {
          title: t.title,
          angle: t.angle,
          category: t.category,
          priority: t.priority,
          isActive: !t.isActive,
        },
      });
      toast.success(t.isActive ? "Hidden from public list" : "Now showing on Write For Us");
      invalidate();
    } catch {
      toast.error("Could not update.");
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteMut.mutateAsync({ id });
      toast.success("Deleted");
      invalidate();
    } catch {
      toast.error("Could not delete topic.");
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
              You need to sign in to manage commissioning topics.
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
      <PageMeta page="adminCommissioningTopics" />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Commissioning Topics</h1>
            <p className="text-muted-foreground">
              Curate the &ldquo;Topics We&rsquo;re Currently Commissioning&rdquo; list shown
              on the public Write For Us page. Active topics are sorted by priority
              (lower number = higher up).
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
              <Plus className="w-5 h-5" /> Add a topic
            </h2>
            <form onSubmit={handleCreate} className="space-y-4" data-testid="commissioning-topic-form">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Treasury platform pricing teardown"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={160}
                  required
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="angle">Angle / brief (optional)</Label>
                <Textarea
                  id="angle"
                  placeholder="What angle do you want? Primary sources to cite, audience cut, etc."
                  rows={3}
                  value={form.angle}
                  onChange={(e) => setForm({ ...form, angle: e.target.value })}
                  maxLength={600}
                  data-testid="input-angle"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Category (optional)</Label>
                  <Input
                    id="category"
                    placeholder="e.g. Fintech SaaS"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    maxLength={80}
                    data-testid="input-category"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority (lower = higher)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={0}
                    max={9999}
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: Number.parseInt(e.target.value || "0", 10) })
                    }
                    data-testid="input-priority"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 mt-6 md:mt-0 md:self-end">
                  <span className="text-sm">Show publicly</span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                    data-testid="switch-active"
                  />
                </div>
              </div>
              <Button type="submit" disabled={createMut.isPending} size="lg" data-testid="button-create-topic">
                {createMut.isPending ? "Adding..." : "Add topic"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Existing topics</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !topics || topics.length === 0 ? (
          <p className="text-muted-foreground">
            No topics yet. Add one above and it will appear on the Write For Us page immediately.
          </p>
        ) : (
          <div className="space-y-3">
            {topics.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <Card key={t.id} data-testid={`topic-row-${t.id}`}>
                  <CardContent className="pt-6">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                          maxLength={160}
                        />
                        <Textarea
                          value={editForm.angle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, angle: e.target.value })
                          }
                          rows={3}
                          maxLength={600}
                          placeholder="Angle / brief"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            placeholder="Category"
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm({ ...editForm, category: e.target.value })
                            }
                            maxLength={80}
                          />
                          <Input
                            type="number"
                            min={0}
                            max={9999}
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                priority: Number.parseInt(e.target.value || "0", 10),
                              })
                            }
                          />
                          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                            <span className="text-sm">Show publicly</span>
                            <Switch
                              checked={editForm.isActive}
                              onCheckedChange={(v) =>
                                setEditForm({ ...editForm, isActive: v })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(t.id)}
                            disabled={updateMut.isPending}
                          >
                            <Save className="w-4 h-4 mr-1.5" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold">{t.title}</span>
                            {t.category ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                                {t.category}
                              </span>
                            ) : null}
                            {t.isActive ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Live
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Hidden
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              priority {t.priority}
                            </span>
                          </div>
                          {t.angle ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {t.angle}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(t)}
                            disabled={updateMut.isPending}
                            aria-label={t.isActive ? "Hide" : "Show"}
                          >
                            {t.isActive ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(t)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t.id, t.title)}
                            disabled={deleteMut.isPending}
                            aria-label={`Delete ${t.title}`}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
