import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePublishBlogPost,
  getListBlogPostsQueryKey,
  getListFeaturedPostsQueryKey,
} from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const empty = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author: "",
  authorRole: "",
  category: "",
  tags: "",
  coverImage: "",
  readingMinutes: "5",
  featured: false,
  noIndex: false,
};

/**
 * Floating "Quick publish" slide-out for admins on the home page. Renders
 * the trigger pill in the bottom-right corner and a right-anchored sheet
 * containing a stripped-down version of the full admin editor — just the
 * fields that are mandatory to publish a post via `POST /admin/blog-posts`.
 *
 * Caller is responsible for gating render on `useAuth().user?.isAdmin` so
 * non-admins never see the trigger.
 */
export function QuickPublishSheet() {
  const qc = useQueryClient();
  const publishMut = usePublishBlogPost();
  const [open, setOpen] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [form, setForm] = useState(empty);

  const reset = () => {
    setForm(empty);
    setAutoSlug(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          coverImage: form.coverImage.trim(),
          readingMinutes,
          featured: form.featured,
          noIndex: form.noIndex,
        },
      });
      toast.success(`Published "${post.title}"`, {
        description: "Open /admin/blog to fine-tune SEO fields.",
      });
      // Refresh the public lists so the new post shows up immediately.
      qc.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getListFeaturedPostsQueryKey() });
      reset();
      setOpen(false);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error("A post with this slug already exists.");
      } else if (status === 400) {
        toast.error("Some required fields are missing or invalid.");
      } else if (status === 401 || status === 403) {
        toast.error("Your session expired. Please sign in again.");
      } else {
        toast.error("Could not publish the post.");
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 shadow-lg bg-[#0052FF] hover:bg-[#0040cc] rounded-full pl-4 pr-5"
          data-testid="quick-publish-trigger"
        >
          <Zap className="w-4 h-4 mr-2" />
          Quick publish
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Quick publish</SheetTitle>
          <SheetDescription>
            Ship a new post without leaving the home page. Use{" "}
            <code className="text-xs">/admin/blog</code> for SEO overrides and
            edits.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="qp-title">Title</Label>
            <Input
              id="qp-title"
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
              data-testid="qp-title"
            />
          </div>

          <div>
            <Label htmlFor="qp-slug">Slug</Label>
            <Input
              id="qp-slug"
              value={form.slug}
              onChange={(e) => {
                setAutoSlug(false);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
              required
              data-testid="qp-slug"
            />
          </div>

          <div>
            <Label htmlFor="qp-excerpt">Excerpt</Label>
            <Textarea
              id="qp-excerpt"
              value={form.excerpt}
              onChange={(e) =>
                setForm((f) => ({ ...f, excerpt: e.target.value }))
              }
              rows={3}
              required
              data-testid="qp-excerpt"
            />
          </div>

          <div>
            <Label htmlFor="qp-content">Content (HTML)</Label>
            <Textarea
              id="qp-content"
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={8}
              required
              className="font-mono text-xs"
              data-testid="qp-content"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qp-author">Author</Label>
              <Input
                id="qp-author"
                value={form.author}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="qp-author-role">Author role</Label>
              <Input
                id="qp-author-role"
                value={form.authorRole}
                onChange={(e) =>
                  setForm((f) => ({ ...f, authorRole: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qp-category">Category</Label>
              <Input
                id="qp-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="qp-reading">Reading minutes</Label>
              <Input
                id="qp-reading"
                type="number"
                min={1}
                value={form.readingMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, readingMinutes: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="qp-tags">Tags (comma-separated)</Label>
            <Input
              id="qp-tags"
              value={form.tags}
              onChange={(e) =>
                setForm((f) => ({ ...f, tags: e.target.value }))
              }
              placeholder="SEO, Fintech, Strategy"
            />
          </div>

          <div>
            <Label htmlFor="qp-cover">Cover image URL</Label>
            <Input
              id="qp-cover"
              type="url"
              value={form.coverImage}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverImage: e.target.value }))
              }
              required
              placeholder="https://images.unsplash.com/…"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="qp-featured"
                checked={form.featured}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, featured: v === true }))
                }
              />
              <Label htmlFor="qp-featured" className="cursor-pointer">
                Feature on the homepage
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="qp-noindex"
                checked={form.noIndex}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, noIndex: v === true }))
                }
                data-testid="qp-noindex"
              />
              <Label htmlFor="qp-noindex" className="cursor-pointer">
                No-index (hide from search engines)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={publishMut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={publishMut.isPending}
              className="bg-[#0052FF] hover:bg-[#0040cc]"
              data-testid="qp-submit"
            >
              {publishMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing…
                </>
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
