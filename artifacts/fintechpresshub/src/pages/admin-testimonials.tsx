import { useState } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Star,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Testimonial = {
  id: number;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  sortOrder: number;
  createdAt: string;
};

type TestimonialDraft = {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: string;
  sortOrder: string;
};

const EMPTY_DRAFT: TestimonialDraft = {
  name: "",
  role: "",
  company: "",
  quote: "",
  rating: "5",
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
    throw Object.assign(
      new Error((err as { error?: string }).error ?? "Request failed"),
      { status: res.status },
    );
  }
  return res.json() as Promise<T>;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="focus:outline-none"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function TestimonialForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  mode,
}: {
  initial: TestimonialDraft;
  onSave: (draft: TestimonialDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<TestimonialDraft>(initial);
  const set =
    (k: keyof TestimonialDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="t-name">Name *</Label>
          <Input
            id="t-name"
            required
            value={draft.name}
            onChange={set("name")}
            placeholder="e.g. Sarah Johnson"
          />
        </div>
        <div>
          <Label htmlFor="t-role">Role *</Label>
          <Input
            id="t-role"
            required
            value={draft.role}
            onChange={set("role")}
            placeholder="e.g. Head of Marketing"
          />
        </div>
        <div>
          <Label htmlFor="t-company">Company *</Label>
          <Input
            id="t-company"
            required
            value={draft.company}
            onChange={set("company")}
            placeholder="e.g. Acme Fintech"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="t-quote">Quote *</Label>
        <Textarea
          id="t-quote"
          required
          value={draft.quote}
          onChange={set("quote")}
          placeholder="Their testimonial text…"
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Rating *</Label>
          <StarRating
            value={Number(draft.rating) || 5}
            onChange={(n) => setDraft((d) => ({ ...d, rating: String(n) }))}
          />
        </div>
        <div>
          <Label htmlFor="t-sort">
            Sort order{" "}
            <span className="font-normal text-muted-foreground">(lower = higher up)</span>
          </Label>
          <Input
            id="t-sort"
            type="number"
            value={draft.sortOrder}
            onChange={set("sortOrder")}
            placeholder="0"
          />
        </div>
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
          {mode === "create" ? "Add testimonial" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    data: testimonials = [],
    isLoading,
    refetch,
  } = useQuery<Testimonial[]>({
    queryKey: ["admin-testimonials"],
    queryFn: () => apiFetch<Testimonial[]>("/testimonials"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
    void queryClient.invalidateQueries({ queryKey: ["testimonials"] });
  };

  const createMutation = useMutation({
    mutationFn: (draft: TestimonialDraft) =>
      apiFetch<Testimonial>("/admin/testimonials", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          rating: Number(draft.rating) || 5,
          sortOrder: Number(draft.sortOrder) || 0,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      toast.success("Testimonial added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: TestimonialDraft }) =>
      apiFetch<Testimonial>(`/admin/testimonials/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...draft,
          rating: Number(draft.rating) || 5,
          sortOrder: Number(draft.sortOrder) || 0,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Testimonial updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/testimonials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success("Testimonial deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editingItem = testimonials.find((t) => t.id === editingId);
  const editingDraft: TestimonialDraft | null = editingItem
    ? {
        name: editingItem.name,
        role: editingItem.role,
        company: editingItem.company,
        quote: editingItem.quote,
        rating: String(editingItem.rating),
        sortOrder: String(editingItem.sortOrder),
      }
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Testimonials — Admin | FintechPressHub" noindex />

      <div className="container mx-auto px-4 max-w-3xl pt-10">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Star className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
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
                Add testimonial
              </Button>
            )}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Manage the "Trusted by Fintech Leaders" section on the{" "}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            homepage
          </a>
          . Testimonials are ordered by Sort Order (ascending), then creation date.
        </p>

        {showForm && (
          <Card className="mb-6 border-[#0052FF]/30">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                New testimonial
              </h2>
              <TestimonialForm
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
              <div
                key={i}
                className="h-24 bg-slate-100 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No testimonials yet</p>
              <p className="text-sm mt-1">
                Add your first one with the button above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editingId === t.id && editingDraft ? (
                    <div className="p-5">
                      <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        Edit testimonial
                      </h2>
                      <TestimonialForm
                        initial={editingDraft}
                        onSave={(draft) =>
                          updateMutation.mutate({ id: t.id, draft })
                        }
                        onCancel={() => setEditingId(null)}
                        isSaving={updateMutation.isPending}
                        mode="edit"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 opacity-40" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm leading-snug">
                            {t.name}
                          </p>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < t.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.role}, {t.company}
                          {t.sortOrder !== 0 && (
                            <span className="ml-2 opacity-60">
                              order {t.sortOrder}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                          "{t.quote}"
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setShowForm(false);
                            setEditingId(t.id);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
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
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the testimonial from the homepage.
              This action cannot be undone.
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
