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
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type GlossaryTerm = {
  id: number;
  slug: string;
  term: string;
  shortDef: string;
  body: string;
  category: string | null;
  relatedTerms: string[];
  publishedAt: string;
  updatedAt: string;
};

type TermDraft = {
  slug: string;
  term: string;
  shortDef: string;
  body: string;
  category: string;
  relatedTerms: string;
};

const EMPTY_DRAFT: TermDraft = {
  slug: "",
  term: "",
  shortDef: "",
  body: "",
  category: "",
  relatedTerms: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

function TermForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  mode,
}: {
  initial: TermDraft;
  onSave: (draft: TermDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<TermDraft>(initial);

  const set = (k: keyof TermDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const handleTermBlur = () => {
    if (mode === "create" && !draft.slug && draft.term) {
      setDraft((d) => ({ ...d, slug: slugify(d.term) }));
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
          <Label htmlFor="term">Term *</Label>
          <Input
            id="term"
            required
            value={draft.term}
            onChange={set("term")}
            onBlur={handleTermBlur}
            placeholder="e.g. Open Banking"
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            required
            value={draft.slug}
            onChange={set("slug")}
            placeholder="e.g. open-banking"
            pattern="[a-z0-9][a-z0-9-]*"
            title="Lowercase letters, numbers and hyphens only"
            disabled={mode === "edit"}
          />
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground mt-1">Slug cannot be changed after creation.</p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="shortDef">Short definition * <span className="text-muted-foreground font-normal">(≤ 500 chars)</span></Label>
        <Textarea
          id="shortDef"
          required
          rows={2}
          maxLength={500}
          value={draft.shortDef}
          onChange={set("shortDef")}
          placeholder="One-sentence definition shown in the glossary index."
        />
      </div>
      <div>
        <Label htmlFor="body">Full body * <span className="text-muted-foreground font-normal">(HTML)</span></Label>
        <Textarea
          id="body"
          required
          rows={8}
          value={draft.body}
          onChange={set("body")}
          className="font-mono text-xs"
          placeholder="<p>Full explanation with examples, regulatory context, and related fintech concepts.</p>"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={draft.category}
            onChange={set("category")}
            placeholder="e.g. Regulation, Payments, Lending"
          />
        </div>
        <div>
          <Label htmlFor="relatedTerms">Related terms <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
          <Input
            id="relatedTerms"
            value={draft.relatedTerms}
            onChange={set("relatedTerms")}
            placeholder="e.g. PSD2, API Banking, AISP"
          />
        </div>
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
          {mode === "create" ? "Create term" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminGlossary() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GlossaryTerm | null>(null);

  const { data: terms = [], isLoading, refetch } = useQuery<GlossaryTerm[]>({
    queryKey: ["admin-glossary"],
    queryFn: () => apiFetch<GlossaryTerm[]>("/glossary"),
  });

  const createMut = useMutation({
    mutationFn: (draft: TermDraft) =>
      apiFetch<GlossaryTerm>("/admin/glossary", {
        method: "POST",
        body: JSON.stringify({
          slug: draft.slug,
          term: draft.term,
          shortDef: draft.shortDef,
          body: draft.body,
          category: draft.category || undefined,
          relatedTerms: draft.relatedTerms
            ? draft.relatedTerms.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      }),
    onSuccess: (row) => {
      toast.success(`"${row.term}" created`);
      qc.invalidateQueries({ queryKey: ["admin-glossary"] });
      setCreating(false);
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409) toast.error("A term with this slug already exists.");
      else toast.error(err.message || "Could not create term.");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ slug, draft }: { slug: string; draft: TermDraft }) =>
      apiFetch<GlossaryTerm>(`/admin/glossary/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          term: draft.term,
          shortDef: draft.shortDef,
          body: draft.body,
          category: draft.category || undefined,
          relatedTerms: draft.relatedTerms
            ? draft.relatedTerms.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      }),
    onSuccess: (row) => {
      toast.success(`"${row.term}" updated`);
      qc.invalidateQueries({ queryKey: ["admin-glossary"] });
      setEditingId(null);
    },
    onError: (err: Error) => toast.error(err.message || "Could not update term."),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) =>
      apiFetch(`/admin/glossary/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Term deleted");
      qc.invalidateQueries({ queryKey: ["admin-glossary"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || "Could not delete term."),
  });

  const filtered = terms.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.term.toLowerCase().includes(q) ||
      t.slug.includes(q) ||
      (t.category ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Glossary Admin | FintechPressHub" noindex />

      <div className="container mx-auto px-4 max-w-5xl py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fintech Glossary</h1>
            <p className="text-sm text-muted-foreground">
              {terms.length} term{terms.length !== 1 ? "s" : ""} · public at{" "}
              <Link href="/glossary" className="underline hover:text-primary">
                /glossary
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
              onClick={() => { setCreating(true); setEditingId(null); }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New term
            </Button>
          </div>
        </div>

        {creating && (
          <Card className="mb-6 border-[#0052FF]/30">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">New glossary term</h2>
              <TermForm
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
            placeholder="Search terms, slugs, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading glossary…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search ? "No terms match your search." : "No terms yet. Create the first one above."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((term) => (
              <Card key={term.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editingId === term.id ? (
                    <div className="p-5">
                      <h3 className="font-semibold mb-4">Editing: {term.term}</h3>
                      <TermForm
                        initial={{
                          slug: term.slug,
                          term: term.term,
                          shortDef: term.shortDef,
                          body: term.body,
                          category: term.category ?? "",
                          relatedTerms: (term.relatedTerms ?? []).join(", "),
                        }}
                        onSave={(draft) => updateMut.mutate({ slug: term.slug, draft })}
                        onCancel={() => setEditingId(null)}
                        isSaving={updateMut.isPending}
                        mode="edit"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{term.term}</span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            /glossary/{term.slug}
                          </code>
                          {term.category && (
                            <Badge variant="secondary" className="text-xs">
                              {term.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {term.shortDef}
                        </p>
                        {term.relatedTerms && term.relatedTerms.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Related: {term.relatedTerms.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingId(term.id); setCreating(false); }}
                          title="Edit term"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(term)}
                          title="Delete term"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.term}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the glossary term and its public page at{" "}
              <code>/glossary/{deleteTarget?.slug}</code>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.slug)}
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
