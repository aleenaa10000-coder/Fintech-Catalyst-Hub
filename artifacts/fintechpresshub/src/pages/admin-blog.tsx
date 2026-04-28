import { useEffect, useRef, useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import {
  useListBlogPosts,
  usePublishBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useRepingBlogPostIndexNow,
  useBulkNoIndexBlogPosts,
  useGetSitemapHealth,
  useRunSitemapHealth,
  getListBlogPostsQueryKey,
  getGetSitemapHealthQueryKey,
  type BlogPost,
  type SeoNotification,
  type SitemapHealthReport,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Eye,
  Star,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, UserPlus } from "lucide-react";
import { authors, type Author } from "@/data/authors";

const GUEST_AUTHOR_VALUE = "__guest__";

function authorSelectValue(name: string, role: string) {
  const match = authors.find(
    (a) => a.name === name && a.role === role,
  );
  return match ? match.slug : name || role ? GUEST_AUTHOR_VALUE : "";
}

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Editorial-calendar guardrail: each author can publish at most this many
 * posts per calendar month before the admin UI starts warning. The number
 * is intentionally low (3) to keep the 12-author roster active and avoid
 * any single author monopolising the publishing schedule. Lifted into a
 * named constant so the threshold can be tuned in one place — and so the
 * dashboard summary, author dropdown, and inline form warnings all read
 * from the same source of truth.
 */
const MAX_POSTS_PER_AUTHOR_PER_MONTH = 3;

/** "YYYY-MM" key for the month a given timestamp falls into, in local time. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Bucket the API-managed blog posts by author for the current calendar
 * month. Returns a Map keyed by author *display name* (matching what the
 * `BlogPost.author` field stores) so lookups from the author select can
 * happen in O(1) without re-scanning the whole list on every keystroke.
 *
 * Uses `publishedAt` rather than `updatedAt` so editing an old post does
 * not surprise the admin by suddenly counting against the author's
 * current-month quota.
 */
function computeAuthorMonthlyUsage(
  posts: BlogPost[] | undefined,
): Map<string, number> {
  const usage = new Map<string, number>();
  if (!posts) return usage;
  const currentKey = monthKey(new Date());
  for (const p of posts) {
    if (!p.author) continue;
    const t = new Date(p.publishedAt);
    if (Number.isNaN(t.getTime())) continue;
    if (monthKey(t) !== currentKey) continue;
    usage.set(p.author, (usage.get(p.author) ?? 0) + 1);
  }
  return usage;
}

/** Tone tier for a given month-to-date count vs the cap. */
function quotaTone(
  count: number,
): "ok" | "warn" | "over" {
  if (count >= MAX_POSTS_PER_AUTHOR_PER_MONTH) return "over";
  if (count >= MAX_POSTS_PER_AUTHOR_PER_MONTH - 1) return "warn";
  return "ok";
}

function AuthorOption({
  author,
  monthlyCount = 0,
}: {
  author: Author;
  monthlyCount?: number;
}) {
  const tone = quotaTone(monthlyCount);
  const badgeCls =
    tone === "over"
      ? "bg-red-100 text-red-700"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-muted text-muted-foreground";
  return (
    <SelectPrimitive.Item
      value={author.slug}
      className="relative flex w-full cursor-default select-none items-center gap-3 rounded-sm py-2 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={author.photo} alt={author.name} />
        <AvatarFallback className="text-xs bg-[#0052FF]/10 text-[#0052FF]">
          {authorInitials(author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <SelectPrimitive.ItemText>{author.name}</SelectPrimitive.ItemText>
        <div className="text-xs text-muted-foreground truncate">
          {author.role}
        </div>
      </div>
      <span
        className={`mr-6 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${badgeCls}`}
        title={
          tone === "over"
            ? `Over the ${MAX_POSTS_PER_AUTHOR_PER_MONTH}-posts-per-month cap`
            : tone === "warn"
              ? `Approaching the ${MAX_POSTS_PER_AUTHOR_PER_MONTH}-posts-per-month cap`
              : `${monthlyCount} of ${MAX_POSTS_PER_AUTHOR_PER_MONTH} posts this month`
        }
        data-testid={`author-quota-${author.slug}`}
      >
        {monthlyCount}/{MAX_POSTS_PER_AUTHOR_PER_MONTH}
      </span>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

/**
 * Inline warning rendered beneath each author select when the currently
 * picked author is at or over the monthly publishing cap. Pure visual
 * nudge — does not block the publish action, since occasional overrides
 * (re-publishing a delayed post, special-occasion piece) are legitimate.
 */
function AuthorQuotaInlineWarning({
  authorName,
  usage,
}: {
  authorName: string;
  usage: Map<string, number>;
}) {
  if (!authorName) return null;
  const count = usage.get(authorName) ?? 0;
  const tone = quotaTone(count);
  if (tone === "ok") return null;
  const isOver = tone === "over";
  return (
    <div
      className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
        isOver
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
      data-testid="author-quota-inline-warning"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <strong>{authorName}</strong> has{" "}
        {isOver ? "already published" : "published"}{" "}
        <strong>
          {count} of {MAX_POSTS_PER_AUTHOR_PER_MONTH}
        </strong>{" "}
        posts allotted for this month.{" "}
        {isOver
          ? "Publishing now will exceed the editorial cap — consider rotating to another team member to keep the calendar balanced."
          : "One more post will hit the monthly cap — plan accordingly."}
      </div>
    </div>
  );
}

function GuestAuthorOption() {
  return (
    <SelectPrimitive.Item
      value={GUEST_AUTHOR_VALUE}
      className="relative flex w-full cursor-default select-none items-center gap-3 rounded-sm py-2 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        <UserPlus className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <SelectPrimitive.ItemText>Guest author</SelectPrimitive.ItemText>
        <div className="text-xs text-muted-foreground truncate">
          Type a custom name and role below
        </div>
      </div>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

/**
 * Convert the structured `seoNotification` from the publish/update API
 * response into a human-readable line for the success toast. Surfaces
 * real failure modes (missing key, IndexNow rejection, timeout) instead
 * of a generic "Search engines have been notified" message.
 */
function describeSeoNotification(seo: SeoNotification): string {
  const idx = seo.indexNow;
  switch (idx.status) {
    case "accepted":
      return idx.urlsSubmitted > 0
        ? `IndexNow accepted ${idx.urlsSubmitted} URL${idx.urlsSubmitted === 1 ? "" : "s"} for Bing, Yandex, Seznam & Naver.`
        : "IndexNow accepted (no new URLs to submit).";
    case "rejected":
      return `IndexNow rejected the ping (HTTP ${idx.httpStatus ?? "?"}). Search engines were not notified.`;
    case "skipped_no_key":
      return "INDEXNOW_KEY is not set on the API server, so Bing/Yandex/Seznam/Naver were not notified.";
    case "skipped_malformed_key":
      return "INDEXNOW_KEY is malformed (must be 8–128 chars, [a-zA-Z0-9-]). Search engines were not notified.";
    case "error":
      return idx.message;
    default:
      return idx.message;
  }
}

function seoNotificationIsSuccess(seo: SeoNotification): boolean {
  return seo.indexNow.status === "accepted";
}

/**
 * Render an absolute timestamp as a short relative-time string
 * ("2 m ago", "3 h ago", "5 d ago"). Used by the per-post IndexNow
 * badge so admins can spot stale posts at a glance. Falls back to a
 * locale date for anything older than a week.
 */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "unknown";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Per-row badge in the admin posts list summarising the latest
 * IndexNow ping for the post. Three visual states:
 *   - green: pinged successfully (shows "indexed Nm ago")
 *   - amber: last attempt failed/skipped (shows the status reason)
 *   - gray: never pinged (post predates the feature OR INDEXNOW_KEY
 *     was unset at publish time)
 *
 * Title attribute carries the full status string for hover details.
 */
function SeoStatusBadge({
  pingedAt,
  status,
}: {
  pingedAt: string | null | undefined;
  status: string | null | undefined;
}) {
  if (pingedAt) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800"
        title={`IndexNow accepted at ${new Date(pingedAt).toLocaleString()}`}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green-600" />
        indexed {formatRelativeTime(pingedAt)}
      </span>
    );
  }
  if (status && status !== "accepted") {
    const label =
      status === "skipped_no_key"
        ? "no INDEXNOW_KEY"
        : status === "skipped_malformed_key"
          ? "bad INDEXNOW_KEY"
          : status === "rejected"
            ? "ping rejected"
            : status === "error"
              ? "ping errored"
              : status;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
        title={`Last IndexNow attempt status: ${status}`}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
      title="This post has never been submitted to IndexNow. Edit & save it to ping search engines now."
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      not indexed
    </span>
  );
}

/**
 * Per-row "Re-ping IndexNow" button. Mirrors the publish notification
 * flow without changing any post fields, so admins can resubmit a stale
 * post (or one that missed its original ping due to missing
 * INDEXNOW_KEY) in one click. On success, invalidates the posts list so
 * the SeoStatusBadge refreshes.
 */
function RepingButton({ post }: { post: BlogPost }) {
  const qc = useQueryClient();
  const repingMut = useRepingBlogPostIndexNow();
  const onClick = async () => {
    try {
      const updated = await repingMut.mutateAsync({ slug: post.slug });
      const description = describeSeoNotification(updated.seoNotification);
      if (seoNotificationIsSuccess(updated.seoNotification)) {
        toast.success(`Re-pinged "${post.title}"`, { description });
      } else {
        toast.warning(`Re-ping attempted for "${post.title}"`, {
          description,
        });
      }
      qc.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        toast.error("Post not found.");
      } else {
        toast.error("Could not re-ping search engines.");
      }
    }
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={repingMut.isPending}
      aria-label={`Re-ping IndexNow for ${post.title}`}
      title="Re-submit this URL to IndexNow + Google"
    >
      <RefreshCw
        className={`w-4 h-4 ${repingMut.isPending ? "animate-spin" : ""}`}
      />
    </Button>
  );
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
  seoTitle: "",
  seoDescription: "",
  seoOgImage: "",
  noIndex: false,
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
  authorUsage,
  onCancel,
  onSaved,
}: {
  post: BlogPost;
  // Current-month publishing count keyed by author display name. Drives
  // the per-row badges inside the author select and the inline warning
  // beneath it. Threaded down from <AdminBlog> so it stays in sync with
  // the dashboard summary card without a second computation pass.
  authorUsage: Map<string, number>;
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
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    seoOgImage: post.seoOgImage ?? "",
    noIndex: post.noIndex ?? false,
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
      const updated = await updateMut.mutateAsync({
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
          noIndex: draft.noIndex,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          seoOgImage: draft.seoOgImage.trim() || null,
        },
      });
      const description = describeSeoNotification(updated.seoNotification);
      if (seoNotificationIsSuccess(updated.seoNotification)) {
        toast.success(`Saved "${draft.title}"`, { description });
      } else {
        toast.warning(`Saved "${draft.title}"`, { description });
      }
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
              <AuthorOption
                key={a.slug}
                author={a}
                monthlyCount={authorUsage.get(a.name) ?? 0}
              />
            ))}
            <GuestAuthorOption />
          </SelectContent>
        </Select>
        <AuthorQuotaInlineWarning
          authorName={draft.author}
          usage={authorUsage}
        />
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

      <div className="flex items-start gap-2">
        <Checkbox
          id={`noIndex-${post.id}`}
          checked={draft.noIndex}
          onCheckedChange={(v) =>
            setDraft({ ...draft, noIndex: v === true })
          }
          data-testid={`edit-post-${post.id}-noindex`}
        />
        <div className="grid gap-1 leading-tight">
          <Label htmlFor={`noIndex-${post.id}`} className="cursor-pointer">
            No-index (hide from search engines)
          </Label>
          <p className="text-xs text-muted-foreground">
            Emits{" "}
            <code>&lt;meta name="robots" content="noindex,nofollow"&gt;</code>{" "}
            on the post detail page.
          </p>
        </div>
      </div>

      {/* SEO overrides — leave blank to use the post title/excerpt/cover.
          Filled values take precedence in <title>, meta description,
          and Open Graph / Twitter image tags. */}
      <details className="border rounded-md p-3">
        <summary className="cursor-pointer text-sm font-medium select-none">
          SEO overrides (optional)
        </summary>
        <div className="space-y-4 mt-3">
          <div>
            <Label htmlFor={`seoTitle-${post.id}`}>SEO title</Label>
            <Input
              id={`seoTitle-${post.id}`}
              value={draft.seoTitle}
              maxLength={70}
              placeholder={`Defaults to: ${post.title}`}
              onChange={(e) =>
                setDraft({ ...draft, seoTitle: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended ≤ 60 chars. Used in browser tab + Google SERP.
            </p>
          </div>
          <div>
            <Label htmlFor={`seoDescription-${post.id}`}>
              SEO description
            </Label>
            <Textarea
              id={`seoDescription-${post.id}`}
              rows={2}
              maxLength={300}
              value={draft.seoDescription}
              placeholder={`Defaults to the excerpt: ${post.excerpt.slice(0, 80)}…`}
              onChange={(e) =>
                setDraft({ ...draft, seoDescription: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended ≤ 160 chars. Shown as the snippet in Google.
            </p>
          </div>
          <div>
            <Label htmlFor={`seoOgImage-${post.id}`}>OG / social image</Label>
            <Input
              id={`seoOgImage-${post.id}`}
              type="url"
              value={draft.seoOgImage}
              placeholder="Defaults to the cover image"
              onChange={(e) =>
                setDraft({ ...draft, seoOgImage: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              1200×630 PNG/JPG works best for LinkedIn, X, Slack & Facebook.
            </p>
          </div>
        </div>
      </details>

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

/**
 * Inline panel showing the latest sitemap link-check report. The daily
 * cron job runs in the background and emails admins on regressions, but
 * this panel lets an admin trigger an on-demand recheck and see all
 * currently-broken or recently-recovered URLs without leaving the
 * dashboard.
 */
function SitemapHealthPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useGetSitemapHealth();
  const runMut = useRunSitemapHealth();

  const runNow = async () => {
    try {
      const fresh = await runMut.mutateAsync();
      qc.setQueryData(getGetSitemapHealthQueryKey(), fresh);
      const broken = fresh.brokenCount;
      const description = `Checked ${fresh.total} URL${fresh.total === 1 ? "" : "s"}.`;
      if (broken === 0) {
        toast.success("Sitemap is healthy", { description });
      } else {
        toast.warning(`${broken} broken URL${broken === 1 ? "" : "s"}`, {
          description,
        });
      }
    } catch {
      toast.error("Could not run sitemap health check.");
    }
  };

  return (
    <Card className="mb-10">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5" /> Sitemap health
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Daily background job verifies every URL in{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">
                /sitemap.xml
              </code>
              . Admins receive an email whenever new 4xx/5xx links appear.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runNow}
            disabled={runMut.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${runMut.isPending ? "animate-spin" : ""}`}
            />
            {runMut.isPending ? "Checking…" : "Run check now"}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            Could not load sitemap health report.
          </p>
        ) : isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading report…</p>
        ) : (
          <SitemapHealthBody report={data} />
        )}
      </CardContent>
    </Card>
  );
}

function SitemapHealthBody({ report }: { report: SitemapHealthReport }) {
  const broken = report.results.filter((r) => r.isBroken);
  const lastRun = report.generatedAt
    ? new Date(report.generatedAt as unknown as string).toLocaleString()
    : "never";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Stat label="Last run" value={lastRun} />
        <Stat label="URLs checked" value={String(report.total)} />
        <Stat
          label="Broken"
          value={String(report.brokenCount)}
          tone={report.brokenCount > 0 ? "bad" : "good"}
        />
      </div>
      {broken.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          All URLs in the sitemap are returning 2xx/3xx.
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Broken URLs
          </h3>
          <div className="border rounded-md divide-y">
            {broken.map((row) => (
              <div
                key={row.url}
                className="px-3 py-2 text-xs grid grid-cols-[1fr_auto_auto] gap-3 items-center"
              >
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[#0052FF] hover:underline"
                  title={row.url}
                >
                  {row.url}
                </a>
                <span className="font-mono text-amber-700">
                  {row.lastStatusCode ?? row.lastError ?? "—"}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {row.lastCheckedAt
                    ? formatRelativeTime(
                        row.lastCheckedAt as unknown as string,
                      )
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const valueColor =
    tone === "bad"
      ? "text-amber-700"
      : tone === "good"
        ? "text-green-700"
        : "text-foreground";
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm font-medium ${valueColor}`}>{value}</div>
    </div>
  );
}

/**
 * Number of days a post is considered "recently published". Posts inside
 * this window get a warning chip in the no-index impact preview because
 * they're typically still earning their initial wave of organic traffic
 * and de-indexing them can wipe rankings before they've even matured.
 */
const RECENT_POST_WINDOW_DAYS = 30;

/**
 * Compute the "before-you-confirm" impact summary for a bulk no-index /
 * remove-no-index action. The result drives the <BulkNoIndexImpactDialog>
 * so the admin can see exactly which currently-indexed posts (and how
 * much traffic) would disappear from search before they pull the trigger.
 *
 *  - For `mode: "noindex"` the impact set is the selected posts that are
 *    currently indexed (i.e. `noIndex !== true`). Posts already hidden are
 *    excluded from the impact because re-flagging them is a no-op.
 *  - For `mode: "reindex"` the impact set is the selected posts that are
 *    currently hidden, since those are the only ones that would actually
 *    re-appear in search.
 */
function computeNoIndexImpact(
  selectedSlugs: Set<string>,
  posts: BlogPost[] | undefined,
  mode: "noindex" | "reindex",
) {
  const selected = (posts ?? []).filter((p) => selectedSlugs.has(p.slug));
  const wantHidden = mode === "noindex";
  const impacted = selected.filter((p) =>
    wantHidden ? !p.noIndex : !!p.noIndex,
  );
  const skipped = selected.filter((p) =>
    wantHidden ? !!p.noIndex : !p.noIndex,
  );

  const totalViews = impacted.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
  const featuredCount = impacted.filter((p) => p.featured).length;
  const recentCutoff = Date.now() - RECENT_POST_WINDOW_DAYS * 86_400_000;
  const recentCount = impacted.filter((p) => {
    const t = new Date(p.publishedAt).getTime();
    return Number.isFinite(t) && t >= recentCutoff;
  }).length;

  const topByViews = [...impacted]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5);

  return {
    selectedCount: selected.length,
    impactedCount: impacted.length,
    skippedCount: skipped.length,
    totalViews,
    featuredCount,
    recentCount,
    topByViews,
    impacted,
  };
}

type NoIndexImpact = ReturnType<typeof computeNoIndexImpact>;

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/**
 * "Preview no-index impact" panel — a confirmation dialog that lists how
 * many of the selected posts would actually be hidden from search (vs
 * already-hidden no-ops), the total view count those URLs are currently
 * pulling in, the highest-traffic posts in the impact set, and warnings
 * for featured / recently-published posts so an admin never accidentally
 * de-indexes a high-traffic post in a bulk action.
 */
function BulkNoIndexImpactDialog({
  open,
  mode,
  impact,
  isPending,
  snoozeEnabled,
  snoozeDays,
  onSnoozeEnabledChange,
  onSnoozeDaysChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: "noindex" | "reindex";
  impact: NoIndexImpact;
  isPending: boolean;
  snoozeEnabled: boolean;
  snoozeDays: number;
  onSnoozeEnabledChange: (v: boolean) => void;
  onSnoozeDaysChange: (v: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isHide = mode === "noindex";
  const verb = isHide ? "Hide" : "Re-expose";
  const verbed = isHide ? "hidden" : "re-exposed";
  const noun = impact.impactedCount === 1 ? "post" : "posts";
  const hasImpact = impact.impactedCount > 0;
  const hasHighTraffic = impact.totalViews >= 500;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent
        className="max-w-xl"
        data-testid="bulk-noindex-impact-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isHide ? (
              <EyeOff className="w-5 h-5 text-amber-600" />
            ) : (
              <Eye className="w-5 h-5 text-green-600" />
            )}
            Preview no-index impact
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {isHide ? (
                <>
                  Each affected post will get{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    &lt;meta name="robots" content="noindex,nofollow"&gt;
                  </code>{" "}
                  and drop out of Google, Bing &amp; co. on the next crawl.
                  The URL stays publicly reachable — only search engines
                  are told to forget it.
                </>
              ) : (
                <>
                  Each affected post will lose its{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    noindex
                  </code>{" "}
                  flag and become eligible for the index again on the next
                  crawl.
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <ImpactStat
            label={isHide ? "Will be hidden" : "Will return"}
            value={impact.impactedCount.toLocaleString()}
            tone={hasImpact ? (isHide ? "warn" : "good") : "neutral"}
            testid="impact-stat-impacted"
          />
          <ImpactStat
            label={
              isHide
                ? "Views being hidden"
                : "Views returning"
            }
            value={formatViews(impact.totalViews)}
            tone={
              isHide && hasHighTraffic
                ? "warn"
                : hasImpact
                  ? "good"
                  : "neutral"
            }
            testid="impact-stat-views"
          />
          <ImpactStat
            label="Already no-op"
            value={impact.skippedCount.toLocaleString()}
            tone="neutral"
            testid="impact-stat-skipped"
          />
        </div>

        {!hasImpact && (
          <div
            className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            data-testid="impact-empty"
          >
            None of the {impact.selectedCount} selected{" "}
            {impact.selectedCount === 1 ? "post is" : "posts are"} eligible
            for this action — every selected post is already in the
            target state. Nothing will change.
          </div>
        )}

        {hasImpact && isHide && (
          <div className="space-y-2">
            {impact.featuredCount > 0 && (
              <ImpactWarning
                icon={<Star className="w-4 h-4" />}
                tone="warn"
                testid="impact-warn-featured"
              >
                <strong>{impact.featuredCount}</strong>{" "}
                {impact.featuredCount === 1 ? "post is" : "posts are"}{" "}
                marked <em>featured</em> on the public blog. Hiding{" "}
                {impact.featuredCount === 1 ? "it" : "them"} will also
                strip {impact.featuredCount === 1 ? "it" : "them"} from
                search snippets while the public blog still links there.
              </ImpactWarning>
            )}
            {impact.recentCount > 0 && (
              <ImpactWarning
                icon={<Clock className="w-4 h-4" />}
                tone="warn"
                testid="impact-warn-recent"
              >
                <strong>{impact.recentCount}</strong>{" "}
                {impact.recentCount === 1 ? "post was" : "posts were"}{" "}
                published in the last {RECENT_POST_WINDOW_DAYS} days and
                may still be ranking up — de-indexing now usually wipes
                the early-traffic ramp.
              </ImpactWarning>
            )}
            {hasHighTraffic && (
              <ImpactWarning
                icon={<TrendingUp className="w-4 h-4" />}
                tone="warn"
                testid="impact-warn-traffic"
              >
                <strong>{formatViews(impact.totalViews)} views</strong>{" "}
                across the selection — that traffic will stop landing
                from search after the next crawl.
              </ImpactWarning>
            )}
          </div>
        )}

        {hasImpact && isHide && (
          <div
            className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-2"
            data-testid="snooze-noindex-control"
          >
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Checkbox
                checked={snoozeEnabled}
                onCheckedChange={(v) => onSnoozeEnabledChange(v === true)}
                data-testid="snooze-toggle"
              />
              <Clock className="w-4 h-4 text-muted-foreground" />
              Snooze — auto re-expose after a set number of days
            </label>
            {snoozeEnabled && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <span className="text-sm text-muted-foreground">Hide for</span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={snoozeDays}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(n)) onSnoozeDaysChange(n);
                  }}
                  className="w-20 h-8"
                  data-testid="snooze-days-input"
                />
                <span className="text-sm text-muted-foreground">
                  {snoozeDays === 1 ? "day" : "days"}, then auto re-index on{" "}
                  <strong className="text-foreground">
                    {new Date(
                      Date.now() + snoozeDays * 86_400_000,
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
            )}
            <p className="pl-6 text-xs text-muted-foreground">
              {snoozeEnabled
                ? "An hourly background job will flip these posts back to indexed once the snooze window elapses — no need to remember to re-expose them."
                : "Leave off for an indefinite hide that only a manual action can reverse."}
            </p>
          </div>
        )}

        {hasImpact && impact.topByViews.length > 0 && (
          <div className="rounded-md border">
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b">
              Highest-traffic posts in this batch
            </div>
            <ul
              className="divide-y text-sm"
              data-testid="impact-top-posts"
            >
              {impact.topByViews.map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                  data-testid={`impact-top-post-${p.slug}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">/blog/{p.slug}</span>
                      {p.featured && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <Star className="w-3 h-3" />
                          featured
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {(p.viewCount ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      views
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {impact.impactedCount > impact.topByViews.length && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground border-t bg-muted/40">
                + {impact.impactedCount - impact.topByViews.length} more
                {" "}
                {impact.impactedCount - impact.topByViews.length === 1
                  ? "post"
                  : "posts"}{" "}
                in this batch
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            data-testid="impact-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !hasImpact}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={
              isHide
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-[#0052FF] hover:bg-[#0040cc]"
            }
            data-testid="impact-confirm"
          >
            {isPending
              ? "Working…"
              : hasImpact
                ? `${verb} ${impact.impactedCount} ${noun}`
                : `Nothing to be ${verbed}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ImpactStat({
  label,
  value,
  tone,
  testid,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
  testid?: string;
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-700"
      : tone === "good"
        ? "text-green-700"
        : "text-foreground";
  return (
    <div className="rounded-md border px-3 py-2" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-base font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function ImpactWarning({
  icon,
  tone,
  children,
  testid,
}: {
  icon: React.ReactNode;
  tone: "warn" | "info";
  children: React.ReactNode;
  testid?: string;
}) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`}
      data-testid={testid}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
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
  // Slugs of posts the admin has ticked for a bulk-noindex / bulk-index
  // operation. Stored as a Set for O(1) membership checks while rendering
  // each row's checkbox.
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
    () => new Set(),
  );
  const bulkNoIndexMut = useBulkNoIndexBlogPosts();
  // Per-author publishing count for the current calendar month. Computed
  // once per render against the in-memory posts list (cheap — bounded by
  // the admin page size). Threaded into both author selects (new post
  // form + inline editor) and the dashboard summary so the editorial
  // calendar guardrails stay consistent across the whole admin surface.
  const authorUsage = computeAuthorMonthlyUsage(posts);
  const currentMonthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const authorsAtOrOver = authors
    .map((a) => ({ author: a, count: authorUsage.get(a.name) ?? 0 }))
    .filter(({ count }) => count >= MAX_POSTS_PER_AUTHOR_PER_MONTH - 1)
    .sort((a, b) => b.count - a.count);
  // Which bulk no-index dialog is open (if any). Driving the dialog from
  // here — instead of inline window.confirm() — lets us render a rich
  // "preview impact" panel before the destructive action fires.
  const [impactDialogMode, setImpactDialogMode] = useState<
    "noindex" | "reindex" | null
  >(null);
  // "Snooze no-index for N days" controls inside the impact dialog. When
  // `snoozeEnabled` is true, the bulk-noindex mutation forwards
  // `snoozeDays` so the API stamps each post's `noindex_until`, and the
  // hourly background job will auto-flip them back to indexed once the
  // window elapses. Defaults to a 14-day window — the typical "fix thin
  // content / re-publish" turnaround for a fintech blog post.
  const [snoozeEnabled, setSnoozeEnabled] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(14);
  // Whether we've already consumed the `?slug=` deep-link query param. We
  // only auto-open once per visit so re-opening the editor doesn't re-trigger
  // when the user later navigates away and back.
  const deepLinkConsumed = useRef(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });

  /**
   * Deep-link handler: when an admin lands here from a public post via the
   * "Edit" pencil button (`/admin/blog?slug=<slug>`), auto-open that post in
   * the inline editor and scroll it into view. If the slug doesn't match any
   * API-managed post (e.g., the public post is one of the legacy seed posts
   * shipped in `posts.js`), we surface a friendly toast instead of silently
   * doing nothing. The query param is stripped after handling so a refresh
   * doesn't re-trigger the behaviour.
   */
  useEffect(() => {
    if (deepLinkConsumed.current) return;
    if (!posts) return;

    const params = new URLSearchParams(window.location.search);
    const targetSlug = params.get("slug");
    if (!targetSlug) {
      deepLinkConsumed.current = true;
      return;
    }

    const match = posts.find((p) => p.slug === targetSlug);
    if (match) {
      setEditingId(match.id);
      // Wait one tick so the editor card has rendered before scrolling.
      window.setTimeout(() => {
        const card = document.getElementById(`admin-post-${match.id}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    } else {
      toast.error(`No editable post found for "${targetSlug}".`, {
        description:
          "This post may be a legacy seed post served from static data. Publish it through this dashboard to make it editable here.",
      });
    }

    // Strip the query param without triggering a navigation.
    const url = new URL(window.location.href);
    url.searchParams.delete("slug");
    window.history.replaceState({}, "", url.toString());
    deepLinkConsumed.current = true;
  }, [posts]);

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
          noIndex: form.noIndex,
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
          seoOgImage: form.seoOgImage.trim() || null,
        },
      });
      const description = describeSeoNotification(post.seoNotification);
      if (seoNotificationIsSuccess(post.seoNotification)) {
        toast.success(`Published "${post.title}"`, { description });
      } else {
        toast.warning(`Published "${post.title}"`, { description });
      }
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
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = "/admin/login";
                }}
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                data-testid="admin-blog-go-to-login"
              >
                Sign in with email & password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={login}
                className="text-muted-foreground"
              >
                Or sign in with Replit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-2">
              You're signed in as{" "}
              <strong className="text-foreground">
                {user?.email ?? user?.firstName ?? "this account"}
              </strong>
              , but this account is not on the admin allowlist.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Add this email to the{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">
                ADMIN_EMAILS
              </code>{" "}
              env var on the API server, then sign out and back in.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
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

        {authorsAtOrOver.length > 0 && (
          <Card
            className="mb-6 border-amber-200 bg-amber-50/40"
            data-testid="author-quota-summary"
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Editorial calendar — author quota check ·{" "}
                    {currentMonthLabel}
                  </h3>
                  <p className="mt-1 text-xs text-amber-900/80">
                    Each author is capped at{" "}
                    <strong>
                      {MAX_POSTS_PER_AUTHOR_PER_MONTH} posts per month
                    </strong>{" "}
                    to keep the 12-author masthead active. The following{" "}
                    {authorsAtOrOver.length === 1 ? "author has" : "authors have"}{" "}
                    hit or are approaching the cap — rotate to another team
                    member for new commissions.
                  </p>
                  <ul
                    className="mt-3 flex flex-wrap gap-2"
                    data-testid="author-quota-summary-list"
                  >
                    {authorsAtOrOver.map(({ author: a, count }) => {
                      const tone = quotaTone(count);
                      const isOver = tone === "over";
                      return (
                        <li
                          key={a.slug}
                          className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
                            isOver
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-amber-200 bg-white text-amber-900"
                          }`}
                          data-testid={`author-quota-summary-${a.slug}`}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={a.photo} alt={a.name} />
                            <AvatarFallback className="text-[9px] bg-[#0052FF]/10 text-[#0052FF]">
                              {authorInitials(a.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{a.name}</span>
                          <span className="tabular-nums">
                            {count}/{MAX_POSTS_PER_AUTHOR_PER_MONTH}
                          </span>
                          {isOver && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold">
                              over cap
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                      <AuthorOption
                        key={a.slug}
                        author={a}
                        monthlyCount={authorUsage.get(a.name) ?? 0}
                      />
                    ))}
                    <GuestAuthorOption />
                  </SelectContent>
                </Select>
                <AuthorQuotaInlineWarning
                  authorName={form.author}
                  usage={authorUsage}
                />
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

              <div className="flex items-start gap-2">
                <Checkbox
                  id="noIndex"
                  checked={form.noIndex}
                  onCheckedChange={(v) =>
                    setForm({ ...form, noIndex: v === true })
                  }
                  data-testid="new-post-noindex"
                />
                <div className="grid gap-1 leading-tight">
                  <Label htmlFor="noIndex" className="cursor-pointer">
                    No-index this post (hide from search engines)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Adds <code>&lt;meta name="robots" content="noindex,nofollow"&gt;</code> to the post page. The URL stays publicly accessible.
                  </p>
                </div>
              </div>

              <details className="border rounded-md p-3">
                <summary className="cursor-pointer text-sm font-medium select-none">
                  SEO overrides (optional)
                </summary>
                <div className="space-y-4 mt-3">
                  <div>
                    <Label htmlFor="seoTitle">SEO title</Label>
                    <Input
                      id="seoTitle"
                      maxLength={70}
                      placeholder="Defaults to the post title"
                      value={form.seoTitle}
                      onChange={(e) =>
                        setForm({ ...form, seoTitle: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended ≤ 60 chars. Used in browser tab + Google
                      SERP.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="seoDescription">SEO description</Label>
                    <Textarea
                      id="seoDescription"
                      rows={2}
                      maxLength={300}
                      placeholder="Defaults to the excerpt"
                      value={form.seoDescription}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          seoDescription: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended ≤ 160 chars. Shown as the snippet in
                      Google.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="seoOgImage">OG / social image</Label>
                    <Input
                      id="seoOgImage"
                      type="url"
                      placeholder="Defaults to the cover image"
                      value={form.seoOgImage}
                      onChange={(e) =>
                        setForm({ ...form, seoOgImage: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      1200×630 PNG/JPG works best for LinkedIn, X, Slack &
                      Facebook.
                    </p>
                  </div>
                </div>
              </details>

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

        <SitemapHealthPanel />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Recent posts</h2>
          {posts && posts.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="select-all-posts"
                checked={
                  selectedSlugs.size > 0 &&
                  selectedSlugs.size === posts.length
                    ? true
                    : selectedSlugs.size > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(v) => {
                  if (v === true) {
                    setSelectedSlugs(new Set(posts.map((p) => p.slug)));
                  } else {
                    setSelectedSlugs(new Set());
                  }
                }}
                data-testid="select-all-posts"
              />
              <Label
                htmlFor="select-all-posts"
                className="cursor-pointer text-muted-foreground"
              >
                Select all
              </Label>
            </div>
          )}
        </div>

        {selectedSlugs.size > 0 && (() => {
          // Live "before-you-confirm" preview rendered directly in the
          // bulk action bar. Computed on every render against the current
          // selection — cheap because `posts` is already in memory and
          // capped at the admin list page size. Driving both the inline
          // strip and the impact dialog from the same helper keeps the
          // numbers consistent.
          const livePreview = computeNoIndexImpact(
            selectedSlugs,
            posts,
            "noindex",
          );
          return (
          <div
            className="sticky top-16 z-20 mb-4 rounded-md border bg-background/95 backdrop-blur px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3"
            data-testid="bulk-actions-bar"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div>
                <strong>{selectedSlugs.size}</strong>{" "}
                {selectedSlugs.size === 1 ? "post" : "posts"} selected
              </div>
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                data-testid="bulk-impact-preview"
              >
                <span
                  className={
                    livePreview.impactedCount > 0
                      ? "inline-flex items-center gap-1 text-amber-700"
                      : "inline-flex items-center gap-1"
                  }
                  data-testid="bulk-impact-would-hide"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <strong className="tabular-nums">
                    {livePreview.impactedCount}
                  </strong>{" "}
                  indexed →&nbsp;hidden
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  data-testid="bulk-impact-views"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <strong className="tabular-nums">
                    {formatViews(livePreview.totalViews)}
                  </strong>{" "}
                  views at risk
                </span>
                {livePreview.skippedCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    data-testid="bulk-impact-skipped"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <strong className="tabular-nums">
                      {livePreview.skippedCount}
                    </strong>{" "}
                    already&nbsp;hidden
                  </span>
                )}
                {livePreview.featuredCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-amber-700"
                    data-testid="bulk-impact-featured"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <strong className="tabular-nums">
                      {livePreview.featuredCount}
                    </strong>{" "}
                    featured
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSlugs(new Set())}
                disabled={bulkNoIndexMut.isPending}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkNoIndexMut.isPending}
                onClick={() => setImpactDialogMode("reindex")}
                data-testid="bulk-remove-noindex"
              >
                <Eye className="w-4 h-4 mr-1.5" /> Remove no-index
              </Button>
              <Button
                size="sm"
                disabled={bulkNoIndexMut.isPending}
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                onClick={() => setImpactDialogMode("noindex")}
                data-testid="bulk-noindex"
              >
                <EyeOff className="w-4 h-4 mr-1.5" />
                {bulkNoIndexMut.isPending
                  ? "Updating…"
                  : "No-index selected"}
              </Button>
            </div>
          </div>
          );
        })()}

        <BulkNoIndexImpactDialog
          open={impactDialogMode !== null}
          mode={impactDialogMode ?? "noindex"}
          impact={computeNoIndexImpact(
            selectedSlugs,
            posts,
            impactDialogMode ?? "noindex",
          )}
          isPending={bulkNoIndexMut.isPending}
          snoozeEnabled={snoozeEnabled}
          snoozeDays={snoozeDays}
          onSnoozeEnabledChange={setSnoozeEnabled}
          onSnoozeDaysChange={(n) =>
            setSnoozeDays(Math.min(365, Math.max(1, n)))
          }
          onCancel={() => {
            if (!bulkNoIndexMut.isPending) {
              setImpactDialogMode(null);
              setSnoozeEnabled(false);
            }
          }}
          onConfirm={async () => {
            const mode = impactDialogMode;
            if (!mode) return;
            // Only fire the mutation against the slugs that would actually
            // change state — posts already in the target state are filtered
            // out so the request stays minimal and the response count
            // matches the impact preview the admin just confirmed.
            const impact = computeNoIndexImpact(selectedSlugs, posts, mode);
            const slugs = impact.impacted.map((p) => p.slug);
            if (slugs.length === 0) {
              setImpactDialogMode(null);
              return;
            }
            const wantHidden = mode === "noindex";
            // Only forward `snoozeDays` when hiding AND the snooze toggle
            // is on. The API treats the absent field as "indefinite hide"
            // and clears any prior `noindex_until` automatically.
            const useSnooze =
              wantHidden && snoozeEnabled && snoozeDays >= 1;
            try {
              const result = await bulkNoIndexMut.mutateAsync({
                data: {
                  slugs,
                  noIndex: wantHidden,
                  ...(useSnooze ? { snoozeDays } : {}),
                },
              });
              const noun =
                result.updatedCount === 1 ? "post" : "posts";
              toast.success(
                wantHidden
                  ? useSnooze
                    ? `No-indexed ${result.updatedCount} ${noun} — auto re-index in ${snoozeDays} ${snoozeDays === 1 ? "day" : "days"}`
                    : `No-indexed ${result.updatedCount} ${noun}`
                  : `Removed no-index from ${result.updatedCount} ${noun}`,
              );
              setSelectedSlugs(new Set());
              setImpactDialogMode(null);
              setSnoozeEnabled(false);
              invalidate();
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Failed to update posts",
              );
            }
          }}
        />

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {posts?.map((p) => {
              const isEditing = editingId === p.id;
              const isSelected = selectedSlugs.has(p.slug);
              return (
                <Card key={p.id} id={`admin-post-${p.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => {
                            setSelectedSlugs((prev) => {
                              const next = new Set(prev);
                              if (v === true) next.add(p.slug);
                              else next.delete(p.slug);
                              return next;
                            });
                          }}
                          aria-label={`Select ${p.title}`}
                          data-testid={`select-post-${p.slug}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-2">
                          {p.title}
                          {p.noIndex && (
                            <span
                              title="Hidden from search engines (noindex)"
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              <EyeOff className="w-3 h-3" /> noindex
                            </span>
                          )}
                          {p.noIndex && p.noindexUntil && (
                            <span
                              title={`Auto re-index on ${new Date(p.noindexUntil).toLocaleString()}`}
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                              data-testid={`snoozed-until-${p.slug}`}
                            >
                              <Clock className="w-3 h-3" />
                              snoozed →{" "}
                              {new Date(p.noindexUntil).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {p.excerpt}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          slug: <code>{p.slug}</code> · {p.category} ·{" "}
                          {new Date(p.publishedAt).toLocaleDateString()}
                          {p.featured ? " · ★ featured" : ""}
                        </div>
                        <div className="mt-2">
                          <SeoStatusBadge
                            pingedAt={p.lastSeoPingAt}
                            status={p.lastSeoPingStatus}
                          />
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
                        <RepingButton post={p} />
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
                        authorUsage={authorUsage}
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
