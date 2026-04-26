import { useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import {
  useListBlogPosts,
  usePublishBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  getListBlogPostsQueryKey,
  type BlogPost,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Lock,
  LogOut,
  Send,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Save,
  Upload,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authors } from "@/data/authors";

const GUEST_AUTHOR_VALUE = "__guest__";

function authorSelectValue(name: string, role: string) {
  const match = authors.find(
    (a) => a.name === name && a.role === role,
  );
  return match ? match.slug : name || role ? GUEST_AUTHOR_VALUE : "";
}

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

const emptyForm = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  author: "",
  authorRole: "",
  category: "",
  tags: "",
  coverImage: "",
  readingMinutes: "5",
  featured: false,
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function PostEditor({
  post,
  onCancel,
  onSaved,
}: {
  post: BlogPost;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    author: post.author,
    authorRole: post.authorRole,
    category: post.category,
    tags: (post.tags ?? []).join(", "),
    coverImage: post.coverImage,
    readingMinutes: String(post.readingMinutes),
    featured: post.featured,
  });
  const updateMut = useUpdateBlogPost();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const readingMinutes = Number(draft.readingMinutes);
    if (!Number.isFinite(readingMinutes) || readingMinutes < 1) {
      toast.error("Reading minutes must be a positive number.");
      return;
    }
    try {
      await updateMut.mutateAsync({
        slug: post.slug,
        data: {
          title: draft.title.trim(),
          excerpt: draft.excerpt.trim(),
          content: draft.content.trim(),
          author: draft.author.trim(),
          authorRole: draft.authorRole.trim(),
          category: draft.category.trim(),
          tags: draft.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          coverImage: draft.coverImage.trim(),
          readingMinutes,
          featured: draft.featured,
        },
      });
      toast.success(`Saved "${draft.title}"`, {
        description: "Search engines have been re-notified.",
      });
      onSaved();
    } catch {
      toast.error("Could not save changes.");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 mt-4">
      <div>
        <Label htmlFor={`title-${post.id}`}>Title</Label>
        <Input
          id={`title-${post.id}`}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor={`excerpt-${post.id}`}>Excerpt</Label>
        <Textarea
          id={`excerpt-${post.id}`}
          rows={2}
          value={draft.excerpt}
          onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor={`content-${post.id}`}>Content</Label>
        <Textarea
          id={`content-${post.id}`}
          rows={8}
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor={`authorSelect-${post.id}`}>Team member</Label>
        <Select
          value={authorSelectValue(draft.author, draft.authorRole)}
          onValueChange={(v) => {
            if (v === GUEST_AUTHOR_VALUE) {
              setDraft({ ...draft, author: "", authorRole: "" });
              return;
            }
            const a = authors.find((x) => x.slug === v);
            if (a) setDraft({ ...draft, author: a.name, authorRole: a.role });
          }}
        >
          <SelectTrigger id={`authorSelect-${post.id}`}>
            <SelectValue placeholder="Select a team member…" />
          </SelectTrigger>
          <SelectContent>
            {authors.map((a) => (
              <SelectItem key={a.slug} value={a.slug}>
                {a.name} — {a.role}
              </SelectItem>
            ))}
            <SelectItem value={GUEST_AUTHOR_VALUE}>
              Guest author (type below)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`author-${post.id}`}>Author</Label>
          <Input
            id={`author-${post.id}`}
            value={draft.author}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor={`authorRole-${post.id}`}>Author role</Label>
          <Input
            id={`authorRole-${post.id}`}
            value={draft.authorRole}
            onChange={(e) =>
              setDraft({ ...draft, authorRole: e.target.value })
            }
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`category-${post.id}`}>Category</Label>
          <Input
            id={`category-${post.id}`}
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor={`tags-${post.id}`}>Tags (comma-separated)</Label>
          <Input
            id={`tags-${post.id}`}
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`coverImage-${post.id}`}>Cover image</Label>
          <div className="flex gap-2">
            <Input
              id={`coverImage-${post.id}`}
              type="url"
              value={draft.coverImage}
              onChange={(e) =>
                setDraft({ ...draft, coverImage: e.target.value })
              }
              required
            />
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10 * 1024 * 1024}
              onGetUploadParameters={async (file) => {
                const { uploadURL } = await presignAndUpload({
                  name: file.name ?? "upload",
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
                try {
                  const { objectPath } = await finalizeUpload(uploadURL);
                  setDraft((d) => ({ ...d, coverImage: objectPath }));
                  toast.success("Cover image uploaded");
                } catch {
                  toast.error("Could not finalize upload");
                }
              }}
              buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
            >
              <Upload className="w-4 h-4" />
            </ObjectUploader>
          </div>
        </div>
        <div>
          <Label htmlFor={`readingMinutes-${post.id}`}>Reading minutes</Label>
          <Input
            id={`readingMinutes-${post.id}`}
            type="number"
            min={1}
            value={draft.readingMinutes}
            onChange={(e) =>
              setDraft({ ...draft, readingMinutes: e.target.value })
            }
            required
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`featured-${post.id}`}
          checked={draft.featured}
          onCheckedChange={(v) =>
            setDraft({ ...draft, featured: v === true })
          }
        />
        <Label htmlFor={`featured-${post.id}`} className="cursor-pointer">
          Feature on the homepage
        </Label>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={updateMut.isPending}
          className="bg-[#0052FF] hover:bg-[#0040cc]"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminBlog() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } =
    useAuth();
  const qc = useQueryClient();
  const { data: posts, isLoading } = useListBlogPosts();
  const publishMut = usePublishBlogPost();
  const deleteMut = useDeleteBlogPost();
  const [form, setForm] = useState(emptyForm);
  const [autoSlug, setAutoSlug] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const readingMinutes = Number(form.readingMinutes);
    if (!Number.isFinite(readingMinutes) || readingMinutes < 1) {
      toast.error("Reading minutes must be a positive number.");
      return;
    }

    try {
      const post = await publishMut.mutateAsync({
        data: {
          slug: form.slug.trim(),
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          author: form.author.trim(),
          authorRole: form.authorRole.trim(),
          category: form.category.trim(),
          tags,
          coverImage: form.coverImage.trim(),
          readingMinutes,
          featured: form.featured,
        },
      });
      toast.success(`Published "${post.title}"`, {
        description: "Search engines have been notified.",
      });
      setForm(emptyForm);
      setAutoSlug(true);
      invalidate();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error("A post with this slug already exists.");
      } else if (status === 400) {
        toast.error("Some fields are invalid. Please review and try again.");
      } else {
        toast.error("Could not publish post.");
      }
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (
      !confirm(
        `Unpublish "${post.title}"? This permanently removes it from the blog and the sitemap.`,
      )
    ) {
      return;
    }
    try {
      await deleteMut.mutateAsync({ slug: post.slug });
      toast.success(`Unpublished "${post.title}"`);
      if (editingId === post.id) setEditingId(null);
      invalidate();
    } catch {
      toast.error("Could not unpublish post.");
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
              You need to sign in to publish blog posts.
            </p>
            <Button
              size="lg"
              onClick={login}
              className="bg-[#0052FF] hover:bg-[#0040cc]"
            >
              Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blog Admin</h1>
            <p className="text-muted-foreground">
              Publish, edit, or unpublish posts. Changes reflect in
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground">
                /sitemap.xml
              </code>
              instantly, and we ping Google &amp; Bing in the background.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Signed in as{" "}
              <strong className="text-foreground">
                {user?.firstName ?? user?.email ?? "Admin"}
              </strong>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        <Card className="mb-10">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> New blog post
            </h2>
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: autoSlug ? slugify(title) : f.slug,
                    }));
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL-safe)</Label>
                <Input
                  id="slug"
                  placeholder="e.g. why-fintech-seo-is-different"
                  value={form.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  pattern="^[a-z0-9][a-z0-9-]*$"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase letters, numbers and hyphens only.
                </p>
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm({ ...form, excerpt: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Content (Markdown or HTML)</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="authorSelect">Team member</Label>
                <Select
                  value={authorSelectValue(form.author, form.authorRole)}
                  onValueChange={(v) => {
                    if (v === GUEST_AUTHOR_VALUE) {
                      setForm({ ...form, author: "", authorRole: "" });
                      return;
                    }
                    const a = authors.find((x) => x.slug === v);
                    if (a)
                      setForm({
                        ...form,
                        author: a.name,
                        authorRole: a.role,
                      });
                  }}
                >
                  <SelectTrigger id="authorSelect">
                    <SelectValue placeholder="Select a team member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>
                        {a.name} — {a.role}
                      </SelectItem>
                    ))}
                    <SelectItem value={GUEST_AUTHOR_VALUE}>
                      Guest author (type below)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Picks the right name + role and links the post to the
                  author profile page.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={form.author}
                    onChange={(e) =>
                      setForm({ ...form, author: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="authorRole">Author role</Label>
                  <Input
                    id="authorRole"
                    placeholder="e.g. Head of Content"
                    value={form.authorRole}
                    onChange={(e) =>
                      setForm({ ...form, authorRole: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g. SEO Strategy"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="seo, fintech, content"
                    value={form.tags}
                    onChange={(e) =>
                      setForm({ ...form, tags: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coverImage">Cover image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coverImage"
                      type="url"
                      placeholder="https://… or upload"
                      value={form.coverImage}
                      onChange={(e) =>
                        setForm({ ...form, coverImage: e.target.value })
                      }
                      required
                    />
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10 * 1024 * 1024}
                      onGetUploadParameters={async (file) => {
                        const { uploadURL } = await presignAndUpload({
                          name: file.name ?? "upload",
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
                        try {
                          const { objectPath } =
                            await finalizeUpload(uploadURL);
                          setForm((f) => ({ ...f, coverImage: objectPath }));
                          toast.success("Cover image uploaded");
                        } catch {
                          toast.error("Could not finalize upload");
                        }
                      }}
                      buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                    </ObjectUploader>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste an external URL or upload a file (≤10 MB).
                  </p>
                </div>
                <div>
                  <Label htmlFor="readingMinutes">Reading minutes</Label>
                  <Input
                    id="readingMinutes"
                    type="number"
                    min={1}
                    value={form.readingMinutes}
                    onChange={(e) =>
                      setForm({ ...form, readingMinutes: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) =>
                    setForm({ ...form, featured: v === true })
                  }
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Feature on the homepage
                </Label>
              </div>
              <Button
                type="submit"
                disabled={publishMut.isPending}
                size="lg"
                className="bg-[#0052FF] hover:bg-[#0040cc]"
              >
                <Send className="w-4 h-4 mr-2" />
                {publishMut.isPending ? "Publishing…" : "Publish post"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Recent posts</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {posts?.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <Card key={p.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{p.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {p.excerpt}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          slug: <code>{p.slug}</code> · {p.category} ·{" "}
                          {new Date(p.publishedAt).toLocaleDateString()}
                          {p.featured ? " · ★ featured" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`View ${p.title}`}
                        >
                          <a
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingId(isEditing ? null : p.id)
                          }
                          aria-label={
                            isEditing ? `Close editor` : `Edit ${p.title}`
                          }
                        >
                          {isEditing ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Pencil className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p)}
                          disabled={deleteMut.isPending}
                          aria-label={`Unpublish ${p.title}`}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {isEditing && (
                      <PostEditor
                        post={p}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => {
                          setEditingId(null);
                          invalidate();
                        }}
                      />
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
