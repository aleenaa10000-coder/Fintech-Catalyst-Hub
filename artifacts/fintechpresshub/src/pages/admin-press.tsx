import { useState } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type PressMention = {
  id: number;
  title: string;
  publication: string;
  url: string;
  year: string;
  sortOrder: number;
  createdAt: string;
};

type MentionDraft = {
  title: string;
  publication: string;
  url: string;
  year: string;
  sortOrder: string;
};

const EMPTY_DRAFT: MentionDraft = {
  title: "",
  publication: "",
  url: "",
  year: new Date().getFullYear().toString(),
  sortOrder: "0",
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { error?: string }).error ?? "Request failed"), {
      status: res.status,
    });
  }
  return res.json() as Promise<T>;
}

function MentionForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  mode,
}: {
  initial: MentionDraft;
  onSave: (draft: MentionDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<MentionDraft>(initial);
  const set =
    (k: keyof MentionDraft) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="pm-title">Article title *</Label>
        <Input
          id="pm-title"
          required
          value={draft.title}
          onChange={set("title")}
          placeholder="e.g. FintechPressHub named top 10 fintech SEO agency"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Label htmlFor="pm-publication">Publication *</Label>
          <Input
            id="pm-publication"
            required
            value={draft.publication}
            onChange={set("publication")}
            placeholder="e.g. Finextra"
          />
        </div>
        <div>
          <Label htmlFor="pm-year">Year *</Label>
          <Input
            id="pm-year"
            required
            value={draft.year}
            onChange={set("year")}
            placeholder="2026"
            pattern="\d{4}"
            title="4-digit year"
            maxLength={4}
          />
        </div>
        <div>
          <Label htmlFor="pm-sort">
            Sort order{" "}
            <span className="font-normal text-muted-foreground">(lower = higher up)</span>
          </Label>
          <Input
            id="pm-sort"
            type="number"
            value={draft.sortOrder}
            onChange={set("sortOrder")}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pm-url">Article URL *</Label>
        <Input
          id="pm-url"
          required
          type="url"
          value={draft.url}
          onChange={set("url")}
          placeholder="https://finextra.com/article/..."
        />
      </div>
      <div className="flex gap-2 pt-1">
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
          {mode === "create" ? "Add mention" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminPress() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: mentions = [], isLoading, refetch } = useQuery<PressMention[]>({
    queryKey: ["admin-press-mentions"],
    queryFn: () => apiFetch<PressMention[]>("/press-mentions"),
  });

  const createMutation = useMutation({
    mutationFn: (draft: MentionDraft) =>
      apiFetch<PressMention>("/admin/press-mentions", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          sortOrder: Number(draft.sortOrder) || 0,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-press-mentions"] });
      void queryClient.invalidateQueries({ queryKey: ["press-mentions"] });
      setShowForm(false);
      toast.success("Press mention added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: MentionDraft }) =>
      apiFetch<PressMention>(`/admin/press-mentions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...draft,
          sortOrder: Number(draft.sortOrder) || 0,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-press-mentions"] });
      void queryClient.invalidateQueries({ queryKey: ["press-mentions"] });
      setEditingId(null);
      toast.success("Press mention updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/press-mentions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-press-mentions"] });
      void queryClient.invalidateQueries({ queryKey: ["press-mentions"] });
      setDeleteId(null);
      toast.success("Press mention deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editingMention = mentions.find((m) => m.id === editingId);
  const editingDraft: MentionDraft | null = editingMention
    ? {
        title: editingMention.title,
        publication: editingMention.publication,
        url: editingMention.url,
        year: editingMention.year,
        sortOrder: String(editingMention.sortOrder),
      }
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Press Coverage — Admin | FintechPressHub" noindex />

      <div className="container mx-auto px-4 max-w-3xl pt-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Newspaper className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Press coverage</h1>
          <span className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {!showForm && (
              <Button
                size="sm"
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                onClick={() => {
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add mention
              </Button>
            )}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Manage the "Recent coverage" section on the{" "}
          <a href="/press" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            /press page
          </a>
          . Mentions are ordered by Sort Order (ascending), then creation date.
        </p>

        {showForm && (
          <Card className="mb-6 border-[#0052FF]/30">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                New press mention
              </h2>
              <MentionForm
                initial={EMPTY_DRAFT}
                onSave={(draft) => createMutation.mutate(draft)}
                onCancel={() => setShowForm(false)}
                isSaving={createMutation.isPending}
                mode="create"
              />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : mentions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Newspaper className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No press mentions yet</p>
              <p className="text-sm mt-1">Add your first one with the button above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mentions.map((mention) => (
              <Card key={mention.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editingId === mention.id && editingDraft ? (
                    <div className="p-5">
                      <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        Edit mention
                      </h2>
                      <MentionForm
                        initial={editingDraft}
                        onSave={(draft) => updateMutation.mutate({ id: mention.id, draft })}
                        onCancel={() => setEditingId(null)}
                        isSaving={updateMutation.isPending}
                        mode="edit"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 opacity-40" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug truncate">
                          {mention.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mention.publication} · {mention.year}
                          {mention.sortOrder !== 0 && (
                            <span className="ml-2 opacity-60">order {mention.sortOrder}</span>
                          )}
                        </p>
                        <a
                          href={mention.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1 truncate max-w-full"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{mention.url}</span>
                        </a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setShowForm(false);
                            setEditingId(mention.id);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(mention.id)}
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete press mention?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the mention from the /press page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId !== null) deleteMutation.mutate(deleteId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
