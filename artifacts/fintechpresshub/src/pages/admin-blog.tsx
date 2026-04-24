import { useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import {
  useListBlogPosts,
  usePublishBlogPost,
  getListBlogPostsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Lock, LogOut, Send, ExternalLink } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

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

export default function AdminBlog() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } =
    useAuth();
  const qc = useQueryClient();
  const { data: posts, isLoading } = useListBlogPosts();
  const publishMut = usePublishBlogPost();
  const [form, setForm] = useState(emptyForm);
  const [autoSlug, setAutoSlug] = useState(true);

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
              Publish a new post. It appears on the public blog and in
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
                  <Label htmlFor="coverImage">Cover image URL</Label>
                  <Input
                    id="coverImage"
                    type="url"
                    placeholder="https://…"
                    value={form.coverImage}
                    onChange={(e) =>
                      setForm({ ...form, coverImage: e.target.value })
                    }
                    required
                  />
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
            {posts?.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-6 flex items-start justify-between gap-4">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
