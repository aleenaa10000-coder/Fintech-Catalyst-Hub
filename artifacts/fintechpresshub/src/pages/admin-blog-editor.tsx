import { useEffect, useMemo, useState } from "react";
import {
  useUpdateBlogPost,
  type BlogPost,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, RefreshCw, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { SchedulePicker } from "@/components/SchedulePicker";
import { RichTextEditor } from "@/components/RichTextEditor";
import { authors } from "@/data/authors";
import {
  GUEST_AUTHOR_VALUE,
  COVER_MIN_WIDTH,
  COVER_MIN_HEIGHT,
  warnIfCoverTooSmall,
  formatZodIssues,
  parseZodIssues,
  FieldError,
  authorSelectValue,
  AuthorOption,
  GuestAuthorOption,
  describeSeoNotification,
  seoNotificationIsSuccess,
} from "./admin-blog-shared";

export const emptyForm = {
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
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
  seoOgImage: "",
  noIndex: false,
  isDraft: false,
  faqItems: "",
  blufSummary: "",
  lastMaterialUpdateAt: "",
  aboutEntities: "",
  mentionEntities: "",
  inlineImage1: "",
  inlineImage2: "",
};

export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function OgImagePreview({
  postId,
  override,
  title,
  category,
  author,
  authorRole,
}: {
  postId: number;
  override: string;
  title: string;
  category: string;
  author: string;
  authorRole: string;
}) {
  const trimmedOverride = override.trim();
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (title.trim()) p.set("title", title.trim());
    if (category.trim()) p.set("category", category.trim());
    if (author.trim()) p.set("author", author.trim());
    if (authorRole.trim()) p.set("authorRole", authorRole.trim());
    return p.toString();
  }, [title, category, author, authorRole]);

  const [debouncedSrc, setDebouncedSrc] = useState(
    trimmedOverride || `/api/og?${params}`,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSrc(trimmedOverride || `/api/og?${params}`);
    }, 400);
    return () => clearTimeout(t);
  }, [trimmedOverride, params]);

  const isOverride = trimmedOverride.length > 0;
  const displayUrl = isOverride
    ? trimmedOverride
    : `/api/og?${params}`;
  const cacheBustedSrc = isOverride
    ? trimmedOverride
    : `${debouncedSrc}${debouncedSrc.includes("?") ? "&" : "?"}_=${reloadKey}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          Live preview ({isOverride ? "manual override" : "auto-generated"})
        </Label>
        {!isOverride && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setReloadKey((k) => k + 1)}
            className="h-7 px-2"
            aria-label="Refresh OG preview"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        )}
      </div>
      <div className="border rounded-md overflow-hidden bg-slate-900">
        <img
          key={`og-${postId}-${reloadKey}-${cacheBustedSrc}`}
          src={cacheBustedSrc}
          alt="Open Graph preview"
          width={1200}
          height={630}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
      <p className="text-xs text-muted-foreground break-all">
        <span className="font-medium">URL:</span>{" "}
        <a
          href={displayUrl}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          {displayUrl}
        </a>
      </p>
      <p className="text-xs text-muted-foreground">
        This is exactly the image LinkedIn, X, Slack, Facebook, iMessage, and
        Discord will show when someone shares this post.
      </p>
    </div>
  );
}

export function PostEditor({
  post,
  onCancel,
  onSaved,
  allTags = [],
}: {
  post: BlogPost;
  onCancel: () => void;
  onSaved: () => void;
  allTags?: string[];
}) {
  const initialPublishedAt = toDateTimeLocalValue(post.publishedAt);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    publishedAt: initialPublishedAt,
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    seoOgImage: post.seoOgImage ?? "",
    noIndex: post.noIndex ?? false,
    isDraft: (post as unknown as { isDraft?: boolean }).isDraft ?? false,
    faqItems: post.faqItems
      ? JSON.stringify(post.faqItems, null, 2)
      : "",
    blufSummary: post.blufSummary ?? "",
    lastMaterialUpdateAt: post.lastMaterialUpdateAt
      ? toDateTimeLocalValue(post.lastMaterialUpdateAt)
      : "",
    aboutEntities: (post.aboutEntities ?? []).join(", "),
    mentionEntities: (post.mentionEntities ?? []).join(", "),
    inlineImage1: ((post as unknown as Record<string, unknown>)["inlineImage1"] as string | null | undefined) ?? "",
    inlineImage2: ((post as unknown as Record<string, unknown>)["inlineImage2"] as string | null | undefined) ?? "",
  });
  const updateMut = useUpdateBlogPost();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const readingMinutes = Number(draft.readingMinutes);
    if (!Number.isFinite(readingMinutes) || readingMinutes < 1) {
      toast.error("Reading minutes must be a positive number.");
      return;
    }
    const publishedAtChanged =
      draft.publishedAt && draft.publishedAt !== initialPublishedAt;
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
            .map((t: string) => t.trim())
            .filter(Boolean),
          coverImage: draft.coverImage.trim(),
          readingMinutes,
          featured: draft.featured,
          noIndex: draft.noIndex,
          isDraft: draft.isDraft,
          ...(publishedAtChanged
            ? { publishedAt: new Date(draft.publishedAt).toISOString() }
            : {}),
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          seoOgImage: draft.seoOgImage.trim() || null,
          ...(draft.faqItems.trim()
            ? (() => {
                try {
                  return { faqItems: JSON.parse(draft.faqItems) };
                } catch {
                  return {};
                }
              })()
            : { faqItems: null }),
          blufSummary: draft.blufSummary.trim() || null,
          ...(draft.lastMaterialUpdateAt
            ? {
                lastMaterialUpdateAt: new Date(
                  draft.lastMaterialUpdateAt,
                ).toISOString(),
              }
            : { lastMaterialUpdateAt: null }),
          aboutEntities: draft.aboutEntities
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .length > 0
            ? draft.aboutEntities
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : null,
          mentionEntities: draft.mentionEntities
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .length > 0
            ? draft.mentionEntities
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : null,
          inlineImage1: draft.inlineImage1.trim() || null,
          inlineImage2: draft.inlineImage2.trim() || null,
        } as unknown as import("@workspace/api-client-react").UpdateBlogPostInput,
      });
      const description = describeSeoNotification(updated.seoNotification);
      if (seoNotificationIsSuccess(updated.seoNotification)) {
        toast.success(`Saved "${draft.title}"`, { description });
      } else {
        toast.warning(`Saved "${draft.title}"`, { description });
      }
      onSaved();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 400) {
        const issues = formatZodIssues(err);
        setFieldErrors(parseZodIssues(err));
        toast.error("Some fields are invalid. Please review and try again.", {
          description: issues ?? undefined,
          style: issues ? { whiteSpace: "pre-line" } : undefined,
        });
      } else {
        toast.error("Could not save changes.");
      }
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 mt-4">
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground shrink-0">Slug:</span>
        <code className="flex-1 truncate">{post.slug}</code>
        <button
          type="button"
          className="shrink-0 hover:text-foreground transition-colors"
          title="Copy slug"
          onClick={() => {
            void navigator.clipboard.writeText(post.slug);
            toast.success("Slug copied to clipboard");
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <Label htmlFor={`title-${post.id}`}>Title</Label>
        <Input
          id={`title-${post.id}`}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          required
          className={fieldErrors.title ? "border-destructive" : ""}
        />
        <FieldError error={fieldErrors.title} />
      </div>
      <div>
        <Label htmlFor={`excerpt-${post.id}`}>Excerpt</Label>
        <Textarea
          id={`excerpt-${post.id}`}
          rows={2}
          value={draft.excerpt}
          onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          required
          className={fieldErrors.excerpt ? "border-destructive" : ""}
        />
        <FieldError error={fieldErrors.excerpt} />
      </div>
      <div>
        <Label htmlFor={`content-${post.id}`}>Content</Label>
        <RichTextEditor
          value={draft.content}
          onChange={(html) => setDraft({ ...draft, content: html })}
          placeholder="Write your post content here… (800–1500 words recommended)"
        />
        {(() => {
          const wc = draft.content
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .filter((w: string) => w.length > 0).length;
          const tooShort = wc > 0 && wc < 800;
          const tooLong = wc > 1500;
          const ok = wc >= 800 && wc <= 1500;
          return (
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "text-xs font-medium tabular-nums",
                    ok ? "text-green-700" : tooShort ? "text-amber-600" : tooLong ? "text-destructive" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {wc} words
                </span>
                {tooShort && <span className="text-xs text-amber-600">— needs {800 - wc} more to reach the 800-word minimum</span>}
                {tooLong && <span className="text-xs text-destructive">— {wc - 1500} words over the 1500-word maximum</span>}
                {ok && <span className="text-xs text-green-700">— within 800–1500 word limit ✓</span>}
              </div>
              {wc > 0 && (
                <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden" title={`${wc} / 1500 words`}>
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${ok ? "bg-emerald-500" : tooShort ? "bg-amber-400" : "bg-destructive"}`}
                    style={{ width: `${Math.min((wc / 1500) * 100, 100)}%` }}
                  />
                  <div className="absolute inset-y-0 w-px bg-muted-foreground/30" style={{ left: "53.33%" }} />
                </div>
              )}
            </div>
          );
        })()}
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
              <AuthorOption key={a.slug} author={a} />
            ))}
            <GuestAuthorOption />
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
            className={fieldErrors.author ? "border-destructive" : ""}
          />
          <FieldError error={fieldErrors.author} />
        </div>
        <div>
          <Label htmlFor={`authorRole-${post.id}`}>Author role</Label>
          <Input
            id={`authorRole-${post.id}`}
            value={draft.authorRole}
            onChange={(e) => setDraft({ ...draft, authorRole: e.target.value })}
            required
            className={fieldErrors.authorRole ? "border-destructive" : ""}
          />
          <FieldError error={fieldErrors.authorRole} />
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
            className={fieldErrors.category ? "border-destructive" : ""}
          />
          <FieldError error={fieldErrors.category} />
        </div>
        <div>
          <Label htmlFor={`tags-${post.id}`}>Tags (comma-separated)</Label>
          <Input
            id={`tags-${post.id}`}
            list={`tags-suggestions-${post.id}`}
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
          {allTags.length > 0 && (
            <datalist id={`tags-suggestions-${post.id}`}>
              {allTags.map((t) => <option key={t} value={t} />)}
            </datalist>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`coverImage-${post.id}`}>Cover image</Label>
          <div className="flex gap-2">
            <Input
              id={`coverImage-${post.id}`}
              type="text"
              value={draft.coverImage}
              onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })}
              onBlur={(e) => { void warnIfCoverTooSmall(e.target.value); }}
              required
              className={fieldErrors.coverImage ? "border-destructive" : ""}
            />
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10 * 1024 * 1024}
              imageMinDimensions={{ width: 1600, height: 800 }}
              onValidationWarning={(msg) => toast.warning(msg)}
              onComplete={async (result) => {
                const objectPath = result.successful?.[0]?.uploadURL;
                if (!objectPath) { toast.error("Upload did not return a path"); return; }
                setDraft((d) => ({ ...d, coverImage: objectPath }));
                toast.success("Cover image uploaded");
              }}
              buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
            >
              <Upload className="w-4 h-4" />
            </ObjectUploader>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended cover size: at least {COVER_MIN_WIDTH}×{COVER_MIN_HEIGHT} px (2:1).
          </p>
          <FieldError error={fieldErrors.coverImage} />
          {draft.coverImage && (
            <div className="mt-2">
              <img
                src={draft.coverImage}
                alt="Cover preview"
                className="h-24 w-full rounded-md object-cover border border-input"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                onLoad={(e) => { e.currentTarget.style.display = "block"; }}
              />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor={`readingMinutes-${post.id}`}>Reading minutes</Label>
          <Input
            id={`readingMinutes-${post.id}`}
            type="number"
            min={1}
            value={draft.readingMinutes}
            onChange={(e) => setDraft({ ...draft, readingMinutes: e.target.value })}
            required
            className={fieldErrors.readingMinutes ? "border-destructive" : ""}
          />
          <FieldError error={fieldErrors.readingMinutes} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`inlineImage1-${post.id}`}>Inline image 1 (URL)</Label>
          <div className="flex gap-2">
            <Input
              id={`inlineImage1-${post.id}`}
              type="text"
              placeholder="https://… or upload"
              value={draft.inlineImage1}
              onChange={(e) => setDraft({ ...draft, inlineImage1: e.target.value })}
            />
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10 * 1024 * 1024}
              onValidationWarning={(msg) => toast.warning(msg)}
              onComplete={async (result) => {
                const objectPath = result.successful?.[0]?.uploadURL;
                if (!objectPath) { toast.error("Upload did not return a path"); return; }
                setDraft((d) => ({ ...d, inlineImage1: objectPath }));
                toast.success("Inline image 1 uploaded");
              }}
              buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
            >
              <Upload className="w-4 h-4" />
            </ObjectUploader>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Optional. Shown after the first content section.</p>
        </div>
        <div>
          <Label htmlFor={`inlineImage2-${post.id}`}>Inline image 2 (URL)</Label>
          <div className="flex gap-2">
            <Input
              id={`inlineImage2-${post.id}`}
              type="text"
              placeholder="https://… or upload"
              value={draft.inlineImage2}
              onChange={(e) => setDraft({ ...draft, inlineImage2: e.target.value })}
            />
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10 * 1024 * 1024}
              onValidationWarning={(msg) => toast.warning(msg)}
              onComplete={async (result) => {
                const objectPath = result.successful?.[0]?.uploadURL;
                if (!objectPath) { toast.error("Upload did not return a path"); return; }
                setDraft((d) => ({ ...d, inlineImage2: objectPath }));
                toast.success("Inline image 2 uploaded");
              }}
              buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
            >
              <Upload className="w-4 h-4" />
            </ObjectUploader>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Optional. Shown in the second half of the article.</p>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Scheduling</Label>
        <SchedulePicker
          id={`publishedAt-${post.id}`}
          value={draft.publishedAt}
          onChange={(v) => setDraft({ ...draft, publishedAt: v })}
          mode="edit"
          data-testid={`edit-post-${post.id}-published-at`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`featured-${post.id}`}
          checked={draft.featured}
          onCheckedChange={(v) => setDraft({ ...draft, featured: v === true })}
        />
        <Label htmlFor={`featured-${post.id}`} className="cursor-pointer">
          Feature on the homepage
        </Label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`noIndex-${post.id}`}
          checked={draft.noIndex}
          onCheckedChange={(v) => setDraft({ ...draft, noIndex: v === true })}
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
      <div className="flex items-start gap-2">
        <Checkbox
          id={`isDraft-${post.id}`}
          checked={draft.isDraft}
          onCheckedChange={(v) => setDraft({ ...draft, isDraft: v === true })}
          data-testid={`edit-post-${post.id}-isdraft`}
        />
        <div className="grid gap-1 leading-tight">
          <Label htmlFor={`isDraft-${post.id}`} className="cursor-pointer">
            Draft (hidden from the public site)
          </Label>
          <p className="text-xs text-muted-foreground">
            Draft posts are stored in the database but never appear on the public blog.
          </p>
        </div>
      </div>
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
              onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Used in browser tab + Google SERP.</p>
              <span className={`text-xs tabular-nums font-medium ${draft.seoTitle.length > 60 ? "text-destructive" : draft.seoTitle.length > 50 ? "text-amber-600" : draft.seoTitle.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                {draft.seoTitle.length} / 60
              </span>
            </div>
            {draft.seoTitle.length > 60 && (
              <p className="text-xs text-destructive mt-0.5">Over the 60-character limit — Google may truncate this in search results.</p>
            )}
          </div>
          <div>
            <Label htmlFor={`seoDescription-${post.id}`}>SEO description</Label>
            <Textarea
              id={`seoDescription-${post.id}`}
              rows={2}
              maxLength={300}
              value={draft.seoDescription}
              placeholder={`Defaults to the excerpt: ${post.excerpt.slice(0, 80)}…`}
              onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Shown as the snippet in Google.</p>
              <span className={`text-xs tabular-nums font-medium ${draft.seoDescription.length > 160 ? "text-destructive" : draft.seoDescription.length > 130 ? "text-amber-600" : draft.seoDescription.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                {draft.seoDescription.length} / 160
              </span>
            </div>
            {draft.seoDescription.length > 160 && (
              <p className="text-xs text-destructive mt-0.5">Over the 160-character limit — Google may truncate this snippet.</p>
            )}
          </div>
          <div>
            <Label htmlFor={`seoOgImage-${post.id}`}>OG / social image</Label>
            <div className="flex gap-2">
              <Input
                id={`seoOgImage-${post.id}`}
                type="text"
                value={draft.seoOgImage}
                placeholder="Defaults to the auto-generated card"
                onChange={(e) => setDraft({ ...draft, seoOgImage: e.target.value })}
              />
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10 * 1024 * 1024}
                imageMinDimensions={{ width: 1200, height: 630 }}
                onValidationWarning={(msg) => toast.warning(msg)}
                onComplete={async (result) => {
                  const objectPath = result.successful?.[0]?.uploadURL;
                  if (!objectPath) { toast.error("Upload did not return a path"); return; }
                  setDraft((d) => ({ ...d, seoOgImage: objectPath }));
                  toast.success("OG image uploaded");
                }}
                buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
              >
                <Upload className="w-4 h-4" />
              </ObjectUploader>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              1200×630 PNG/JPG works best for LinkedIn, X, Slack & Facebook. Leave blank to use the branded auto-generated card below.
            </p>
          </div>
          <OgImagePreview
            postId={post.id}
            override={draft.seoOgImage}
            title={draft.title || post.title}
            category={draft.category || post.category || "Insights"}
            author={draft.author || post.author}
            authorRole={draft.authorRole || post.authorRole}
          />
        </div>
      </details>
      <details className="border rounded-md p-3">
        <summary className="cursor-pointer text-sm font-medium select-none">
          Structured content (optional)
        </summary>
        <div className="space-y-4 mt-3">
          <div>
            <Label htmlFor={`blufSummary-${post.id}`}>Bottom-line summary</Label>
            <Textarea
              id={`blufSummary-${post.id}`}
              rows={2}
              maxLength={400}
              placeholder="One crisp sentence that gives the reader the key takeaway before they read."
              value={draft.blufSummary}
              onChange={(e) => setDraft({ ...draft, blufSummary: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Displayed as a "Bottom line" callout above the article and used in SpeakableSpecification JSON-LD (G3).
            </p>
          </div>
          <div>
            <Label htmlFor={`lastMaterialUpdateAt-${post.id}`}>Last material update</Label>
            <Input
              id={`lastMaterialUpdateAt-${post.id}`}
              type="datetime-local"
              value={draft.lastMaterialUpdateAt}
              onChange={(e) => setDraft({ ...draft, lastMaterialUpdateAt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Overrides <code>dateModified</code> in BlogPosting JSON-LD. Set only when this edit materially changes the article (W6).
            </p>
          </div>
          <div>
            <Label htmlFor={`aboutEntities-${post.id}`}>About (topics / entities)</Label>
            <Input
              id={`aboutEntities-${post.id}`}
              placeholder="e.g. Open Banking, PSD3, Embedded Finance"
              value={draft.aboutEntities}
              onChange={(e) => setDraft({ ...draft, aboutEntities: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated primary topics. Populates BlogPosting <code>about</code> in JSON-LD (G5).
            </p>
          </div>
          <div>
            <Label htmlFor={`mentionEntities-${post.id}`}>Mentions (entities)</Label>
            <Input
              id={`mentionEntities-${post.id}`}
              placeholder="e.g. Stripe, Visa, Mastercard, FCA"
              value={draft.mentionEntities}
              onChange={(e) => setDraft({ ...draft, mentionEntities: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated entities mentioned. Populates BlogPosting <code>mentions</code> in JSON-LD (G5).
            </p>
          </div>
          <div>
            <Label htmlFor={`faqItems-${post.id}`}>FAQ items (JSON)</Label>
            <Textarea
              id={`faqItems-${post.id}`}
              rows={5}
              className="font-mono text-xs"
              placeholder={`[\n  { "question": "What is X?", "answer": "X is…" }\n]`}
              value={draft.faqItems}
              onChange={(e) => setDraft({ ...draft, faqItems: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valid JSON array of <code>{"{ question, answer }"}</code> objects. Emits FAQPage JSON-LD and a rich-result FAQ accordion in Google (A1).
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
