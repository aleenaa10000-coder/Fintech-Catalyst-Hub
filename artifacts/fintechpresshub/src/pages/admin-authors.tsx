import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Save,
  X as XIcon,
  Search,
  UserPlus,
} from "lucide-react";
import { authorSlugFromName, type Author } from "@/data/authors";
import { useInvalidateAuthors } from "@/data/useAuthors";

interface AuthorRow extends Author {
  id?: number;
  sortOrder?: number;
}

interface AuthorFormState {
  slug: string;
  name: string;
  role: string;
  photo: string;
  shortBio: string;
  fullBio: string;
  expertise: string;
  credentials: string;
  yearsExperience: string;
  location: string;
  socialLinkedin: string;
  socialTwitter: string;
  socialWebsite: string;
  socialEmail: string;
  sortOrder: string;
  datePublished: string;
}

const EMPTY_FORM: AuthorFormState = {
  slug: "",
  name: "",
  role: "",
  photo: "",
  shortBio: "",
  fullBio: "",
  expertise: "",
  credentials: "",
  yearsExperience: "0",
  location: "",
  socialLinkedin: "",
  socialTwitter: "",
  socialWebsite: "",
  socialEmail: "",
  sortOrder: "0",
  datePublished: "",
};

function authorToForm(a: AuthorRow): AuthorFormState {
  return {
    slug: a.slug,
    name: a.name,
    role: a.role,
    photo: a.photo,
    shortBio: a.shortBio,
    fullBio: a.fullBio.join("\n\n"),
    expertise: a.expertise.join("\n"),
    credentials: a.credentials.join("\n"),
    yearsExperience: String(a.yearsExperience ?? 0),
    location: a.location ?? "",
    socialLinkedin: a.social?.linkedin ?? "",
    socialTwitter: a.social?.twitter ?? "",
    socialWebsite: a.social?.website ?? "",
    socialEmail: a.social?.email ?? "",
    sortOrder: String(a.sortOrder ?? 0),
    datePublished: (a as AuthorRow & { datePublished?: string }).datePublished ?? "",
  };
}

function formToPayload(f: AuthorFormState) {
  const social: Record<string, string> = {};
  if (f.socialLinkedin.trim()) social.linkedin = f.socialLinkedin.trim();
  if (f.socialTwitter.trim()) social.twitter = f.socialTwitter.trim();
  if (f.socialWebsite.trim()) social.website = f.socialWebsite.trim();
  if (f.socialEmail.trim()) social.email = f.socialEmail.trim();
  return {
    slug: f.slug.trim(),
    name: f.name.trim(),
    role: f.role.trim(),
    photo: f.photo.trim(),
    shortBio: f.shortBio.trim(),
    fullBio: f.fullBio
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    expertise: f.expertise
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    credentials: f.credentials
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    yearsExperience: Math.max(0, Math.min(80, Number(f.yearsExperience) || 0)),
    location: f.location.trim(),
    social,
    sortOrder: Math.max(0, Math.min(10000, Number(f.sortOrder) || 0)),
    ...(f.datePublished.trim() ? { datePublished: f.datePublished.trim() } : {}),
  };
}

export default function AdminAuthors() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const invalidateAuthors = useInvalidateAuthors();

  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AuthorFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/authors");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { authors: AuthorRow[] };
      setAuthors(json.authors ?? []);
    } catch (e) {
      toast.error("Couldn't load authors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && isAdmin) load();
  }, [isAuthenticated, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q),
    );
  }, [authors, search]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingSlug(null);
    setCreating(true);
  }

  function startEdit(a: AuthorRow) {
    setForm(authorToForm(a));
    setEditingSlug(a.slug);
    setCreating(false);
  }

  function cancel() {
    setEditingSlug(null);
    setCreating(false);
    setForm(EMPTY_FORM);
  }

  async function save() {
    const payload = formToPayload(form);
    if (!payload.slug || !payload.name || !payload.role || !payload.photo) {
      toast.error("Slug, name, role and photo are required");
      return;
    }
    if (payload.shortBio.length < 20) {
      toast.error("Short bio must be at least 20 characters");
      return;
    }
    if (payload.fullBio.length === 0) {
      toast.error("Full bio must contain at least one paragraph");
      return;
    }
    setBusy(true);
    try {
      const isNew = creating;
      const url = isNew
        ? "/api/admin/authors"
        : `/api/admin/authors/${encodeURIComponent(editingSlug ?? "")}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      toast.success(isNew ? "Author created" : "Author updated");
      cancel();
      await load();
      await invalidateAuthors();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    if (
      !window.confirm(
        `Delete author "${slug}"? Published posts that reference this author by name will continue to show, but the author archive page will 404.`,
      )
    )
      return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/admin/authors/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Author deleted");
      await load();
      await invalidateAuthors();
      if (editingSlug === slug) cancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingSlug(null);
    }
  }

  if (isLoading) {
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
              Log in
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

  const editing = creating || editingSlug !== null;

  return (
    <div className="min-h-screen bg-background py-12">
      <PageMeta page="adminBlog" noindex />
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to dashboard
            </Link>
            <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
              Author roster
            </div>
            <h1 className="text-3xl font-bold">Authors</h1>
            <p className="text-sm text-muted-foreground">
              Manage the {authors.length} contributor{authors.length === 1 ? "" : "s"} on the FintechPressHub masthead.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={startCreate}
              className="bg-[#0052FF] hover:bg-[#0040cc]"
              data-testid="button-new-author"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New author
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
          {/* Roster list */}
          <Card>
            <CardContent className="p-4">
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search authors…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No authors match.
                </p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((a) => (
                    <li
                      key={a.slug}
                      className={`py-2 px-2 -mx-2 rounded-md ${
                        editingSlug === a.slug ? "bg-blue-50" : "hover:bg-muted/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={a.photo} alt={a.name} />
                          <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.role}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {a.slug}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardContent className="p-6">
              {!editing ? (
                <div className="text-center py-16 text-muted-foreground">
                  <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Pick an author from the roster, or click <strong>New author</strong> to add one.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-lg font-bold">
                        {creating ? "New author" : `Edit · ${editingSlug}`}
                      </h2>
                      {!creating && editingSlug && (() => {
                        const a = authors.find((x) => x.slug === editingSlug);
                        return a?.createdAt || a?.updatedAt ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.createdAt && (
                              <span>
                                Created {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {a.createdAt && a.updatedAt && <span className="mx-1">·</span>}
                            {a.updatedAt && (
                              <span>
                                Last updated {new Date(a.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={cancel} disabled={busy}>
                        <XIcon className="w-4 h-4 mr-1.5" /> Cancel
                      </Button>
                      {!creating && editingSlug && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(editingSlug)}
                          disabled={busy || deletingSlug !== null}
                          data-testid="button-delete-author"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          {deletingSlug === editingSlug ? "Deleting…" : "Delete"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={save}
                        disabled={busy}
                        className="bg-[#0052FF] hover:bg-[#0040cc]"
                        data-testid="button-save-author"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {busy ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="author-name">Name</Label>
                      <Input
                        id="author-name"
                        value={form.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setForm((f) => ({
                            ...f,
                            name,
                            slug:
                              creating && !f.slug
                                ? authorSlugFromName(name)
                                : f.slug,
                          }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-slug">Slug</Label>
                      <Input
                        id="author-slug"
                        value={form.slug}
                        onChange={(e) =>
                          setForm({ ...form, slug: e.target.value.toLowerCase() })
                        }
                        placeholder="lowercase-with-dashes"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-role">Role / Title</Label>
                      <Input
                        id="author-role"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-location">Location</Label>
                      <Input
                        id="author-location"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="London, UK"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="author-photo">Photo URL</Label>
                      <Input
                        id="author-photo"
                        value={form.photo}
                        onChange={(e) => setForm({ ...form, photo: e.target.value })}
                        placeholder="/author-photos/example.png or https://…"
                        required
                      />
                      {form.photo && (
                        <div className="mt-2 flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={form.photo} alt="preview" />
                            <AvatarFallback>?</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">Preview</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="author-years">Years of experience</Label>
                      <Input
                        id="author-years"
                        type="number"
                        min={0}
                        max={80}
                        value={form.yearsExperience}
                        onChange={(e) =>
                          setForm({ ...form, yearsExperience: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-sort">Sort order</Label>
                      <Input
                        id="author-sort"
                        type="number"
                        min={0}
                        max={10000}
                        value={form.sortOrder}
                        onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Lower = appears first on /authors
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="author-shortbio">Short bio (1–2 sentences)</Label>
                    <Textarea
                      id="author-shortbio"
                      rows={3}
                      value={form.shortBio}
                      onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="author-fullbio">
                      Full bio (paragraphs separated by blank lines)
                    </Label>
                    <Textarea
                      id="author-fullbio"
                      rows={8}
                      value={form.fullBio}
                      onChange={(e) => setForm({ ...form, fullBio: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="author-expertise">Expertise (one per line)</Label>
                      <Textarea
                        id="author-expertise"
                        rows={5}
                        value={form.expertise}
                        onChange={(e) =>
                          setForm({ ...form, expertise: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-credentials">Credentials (one per line)</Label>
                      <Textarea
                        id="author-credentials"
                        rows={5}
                        value={form.credentials}
                        onChange={(e) =>
                          setForm({ ...form, credentials: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="author-linkedin">LinkedIn URL</Label>
                      <Input
                        id="author-linkedin"
                        type="url"
                        value={form.socialLinkedin}
                        onChange={(e) =>
                          setForm({ ...form, socialLinkedin: e.target.value })
                        }
                        placeholder="https://www.linkedin.com/in/…"
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-twitter">Twitter / X URL</Label>
                      <Input
                        id="author-twitter"
                        type="url"
                        value={form.socialTwitter}
                        onChange={(e) =>
                          setForm({ ...form, socialTwitter: e.target.value })
                        }
                        placeholder="https://twitter.com/…"
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-website">Personal website</Label>
                      <Input
                        id="author-website"
                        type="url"
                        value={form.socialWebsite}
                        onChange={(e) =>
                          setForm({ ...form, socialWebsite: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-email">Public email</Label>
                      <Input
                        id="author-email"
                        type="email"
                        value={form.socialEmail}
                        onChange={(e) =>
                          setForm({ ...form, socialEmail: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="author-date-published">
                        Date published{" "}
                        <span className="text-muted-foreground font-normal">(YYYY-MM-DD · optional SEO override)</span>
                      </Label>
                      <Input
                        id="author-date-published"
                        type="date"
                        value={form.datePublished}
                        onChange={(e) =>
                          setForm({ ...form, datePublished: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                        pattern="\d{4}-\d{2}-\d{2}"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Sets <code>datePublished</code> on the author's JSON-LD Person schema. Defaults to account creation date when blank.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
