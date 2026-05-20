import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { fleschKincaidGrade } from "@/lib/readability";
import {
  useListBlogPosts,
  usePublishBlogPost,
  useUpdateBlogPost,
  updateBlogPost,
  bulkRescheduleBlogPosts,
  useDeleteBlogPost,
  useBulkNoIndexBlogPosts,
  getListBlogPostsQueryKey,
  type BlogPost,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  Upload,
  RefreshCw,
  AlertTriangle,
  EyeOff,
  Eye,
  Star,
  TrendingUp,
  Clock,
  ScrollText,
  Bell,
  Inbox,
  LayoutDashboard,
  Users,
  CalendarClock,
  RotateCcw,
  GripVertical,
  LayoutList,
  CalendarDays,
  ArrowUpDown,
  Globe,
  Search,
  Copy,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authors } from "@/data/authors";
import { HealthBadge } from "@/components/HealthBadge";
import { SchedulePicker } from "@/components/SchedulePicker";
import { RichTextEditor } from "@/components/RichTextEditor";
import { formatRelativeTime, SeoStatusBadge, ReadabilityBadge, SeoMetaBadge, ReadabilityFilterPills, HardestPostsSpotlight } from "./admin-blog-cards";
import {
  GUEST_AUTHOR_VALUE,
  FieldError,
  formatZodIssues,
  parseZodIssues,
  describeSeoNotification,
  seoNotificationIsSuccess,
  RepingButton,
  ProbeUrlButton,
  warnIfCoverTooSmall,
  authorSelectValue,
  AuthorOption,
  GuestAuthorOption,
} from "./admin-blog-shared";
import { emptyForm, slugify, toDateTimeLocalValue, PostEditor } from "./admin-blog-editor";
import { ScheduledPostPanel, ScheduledCalendar } from "./admin-blog-scheduler";
import { HreflangPanel, SitemapHealthPanel } from "./admin-blog-moderation";
import {
  BulkProbeButton,
  BulkSeoFillDialog,
  BulkNoIndexImpactDialog,
  computeNoIndexImpact,
  formatViews,
} from "./admin-blog-bulk";

const PREVIEW_DEFAULT_DAYS_AHEAD = 7;

function defaultPreviewAtLocal(): string {
  const now = new Date();
  const future = new Date(
    now.getTime() + PREVIEW_DEFAULT_DAYS_AHEAD * 24 * 60 * 60 * 1000,
  );
  future.setMinutes(0, 0, 0);
  const tzOffsetMs = future.getTimezoneOffset() * 60000;
  return new Date(future.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}


export default function AdminBlog() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } =
    useAuth();
  const qc = useQueryClient();
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAtLocal, setPreviewAtLocal] = useState<string>(
    defaultPreviewAtLocal,
  );
  const previewAsOfIso = useMemo(() => {
    if (!previewMode) return undefined;
    if (!previewAtLocal) return undefined;
    const parsed = new Date(previewAtLocal);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return parsed.toISOString();
  }, [previewMode, previewAtLocal]);
  const listParams = previewAsOfIso ? { asOf: previewAsOfIso } : undefined;
  const { data: posts, isLoading } = useListBlogPosts(listParams);
  const visibilityCutoffMs = previewAsOfIso
    ? new Date(previewAsOfIso).getTime()
    : Date.now();
  const publishMut = usePublishBlogPost();
  const deleteMut = useDeleteBlogPost();
  const [form, setForm] = useState(emptyForm);
  const [publishFieldErrors, setPublishFieldErrors] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
    () => new Set(),
  );
  const bulkNoIndexMut = useBulkNoIndexBlogPosts();
  const [impactDialogMode, setImpactDialogMode] = useState<
    "noindex" | "reindex" | null
  >(null);
  const [snoozeEnabled, setSnoozeEnabled] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(14);
  const [bulkSeoDialogOpen, setBulkSeoDialogOpen] = useState(false);
  const [bulkSeoForm, setBulkSeoForm] = useState({ seoTitle: "", seoDescription: "" });
  const [bulkSeoFilling, setBulkSeoFilling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const deepLinkConsumed = useRef(false);

  const [suggestions, setSuggestions] = useState<{slug: string; title: string; category: string; publishedAt: string; url: string}[]>([]);
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<"published" | "scheduled">(
    "published",
  );

  const [readabilityFilter, setReadabilityFilter] = useState<
    "all" | "elementary" | "middle" | "high" | "college"
  >("all");

  const [seoFilter, setSeoFilter] = useState<"all" | "missing">("all");

  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localQueueOrder, setLocalQueueOrder] = useState<number[] | null>(null);
  const [reorderSavePending, setReorderSavePending] = useState(false);
  const [reorderUndoSnapshot, setReorderUndoSnapshot] = useState<{ slug: string; publishedAt: string }[] | null>(null);
  const [reorderUndoPending, setReorderUndoPending] = useState(false);

  const [calendarView, setCalendarView] = useState(false);

  const [shiftQueueOpen, setShiftQueueOpen] = useState(false);
  const [shiftHoursInput, setShiftHoursInput] = useState("");
  const [shiftQueuePending, setShiftQueuePending] = useState(false);

  const [shiftSnapshot, setShiftSnapshot] = useState<{ slug: string; publishedAt: string }[] | null>(null);
  const [shiftSnapshotLabel, setShiftSnapshotLabel] = useState<string>("");
  const [shiftUndoPending, setShiftUndoPending] = useState(false);

  const [gapThresholdHours, setGapThresholdHours] = useState(48);
  const [gapThresholdInput, setGapThresholdInput] = useState("48");

  const SCHEDULED_QUERY_KEY = ["admin", "blog", "scheduled-posts"] as const;
  const {
    data: scheduledPosts,
    isLoading: scheduledLoading,
    refetch: refetchScheduled,
  } = useQuery({
    queryKey: SCHEDULED_QUERY_KEY,
    queryFn: async (): Promise<BlogPost[]> => {
      const res = await fetch("/api/admin/blog/posts/scheduled", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load scheduled posts");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
    void refetchScheduled();
  };

  const handleJumpToPost = (id: number) => {
    setActiveTab("published");
    setReadabilityFilter("all");
    setSeoFilter("all");
    setEditingId(id);
    setTimeout(() => {
      document
        .getElementById(`admin-post-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const displayedScheduledPosts = useMemo(() => {
    if (!scheduledPosts) return [];
    if (!localQueueOrder) return scheduledPosts;
    const byId = new Map(scheduledPosts.map((p) => [p.id, p]));
    return localQueueOrder.map((id) => byId.get(id)).filter(Boolean) as typeof scheduledPosts;
  }, [scheduledPosts, localQueueOrder]);

  const matchesReadabilityFilter = (content: string) => {
    if (readabilityFilter === "all") return true;
    const grade = fleschKincaidGrade(content);
    if (grade === null) return false;
    if (readabilityFilter === "elementary") return grade <= 5;
    if (readabilityFilter === "middle") return grade > 5 && grade <= 8;
    if (readabilityFilter === "high") return grade > 8 && grade <= 12;
    if (readabilityFilter === "college") return grade > 12;
    return true;
  };

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (posts ?? []).filter((p: NonNullable<typeof posts>[number]) =>
      matchesReadabilityFilter(p.content as string) &&
      (seoFilter === "all" || !p.seoTitle || !p.seoDescription) &&
      (!q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t: string) => t.toLowerCase().includes(q)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, readabilityFilter, seoFilter, searchQuery]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    (posts ?? []).forEach((p: NonNullable<typeof posts>[number]) => {
      (p.tags ?? []).forEach((t: string) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  const filteredScheduledPosts = useMemo(
    () => displayedScheduledPosts.filter((p) => matchesReadabilityFilter(p.content)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayedScheduledPosts, readabilityFilter],
  );

  const hasQueueChanges = useMemo(
    () =>
      localQueueOrder !== null &&
      scheduledPosts !== undefined &&
      localQueueOrder.some((id, i) => scheduledPosts[i]?.id !== id),
    [localQueueOrder, scheduledPosts],
  );

  useEffect(() => {
    if (deepLinkConsumed.current) return;
    if (!posts) return;

    const params = new URLSearchParams(window.location.search);
    const targetSlug = params.get("slug");
    if (!targetSlug) {
      deepLinkConsumed.current = true;
      return;
    }

    const match = posts.find((p: { slug: string; id: number }) => p.slug === targetSlug);
    if (match) {
      setEditingId(match.id);
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

    const url = new URL(window.location.href);
    url.searchParams.delete("slug");
    window.history.replaceState({}, "", url.toString());
    deepLinkConsumed.current = true;
  }, [posts]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishFieldErrors({});

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const readingMinutes = Number(form.readingMinutes);
    if (!Number.isFinite(readingMinutes) || readingMinutes < 1) {
      toast.error("Reading minutes must be a positive number.");
      return;
    }

    const publishedAtIso = form.publishedAt
      ? new Date(form.publishedAt).toISOString()
      : undefined;
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
          isDraft: form.isDraft,
          ...(publishedAtIso ? { publishedAt: publishedAtIso } : {}),
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
          seoOgImage: (() => {
            const v = form.seoOgImage.trim();
            if (v) return v;
            const p = new URLSearchParams();
            if (form.title.trim()) p.set("title", form.title.trim());
            if (form.category.trim()) p.set("category", form.category.trim());
            if (form.author.trim()) p.set("author", form.author.trim());
            if (form.authorRole.trim()) p.set("authorRole", form.authorRole.trim());
            return `/api/og?${p.toString()}`;
          })(),
          ...(form.faqItems.trim()
            ? (() => {
                try {
                  return { faqItems: JSON.parse(form.faqItems) };
                } catch {
                  return {};
                }
              })()
            : { faqItems: null }),
          blufSummary: form.blufSummary.trim() || null,
          ...(form.lastMaterialUpdateAt
            ? {
                lastMaterialUpdateAt: new Date(
                  form.lastMaterialUpdateAt,
                ).toISOString(),
              }
            : {}),
          aboutEntities:
            form.aboutEntities
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean).length > 0
              ? form.aboutEntities
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : null,
          mentionEntities:
            form.mentionEntities
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean).length > 0
              ? form.mentionEntities
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : null,
          inlineImage1: form.inlineImage1.trim() || null,
          inlineImage2: form.inlineImage2.trim() || null,
        } as unknown as import("@workspace/api-client-react").PublishBlogPostInput,
      });
      const isScheduled = publishedAtIso
        ? new Date(publishedAtIso).getTime() > Date.now()
        : false;
      const description = describeSeoNotification(post.seoNotification);
      if (isScheduled) {
        toast.success(`Scheduled "${post.title}"`, {
          description: `Will go live on ${new Date(publishedAtIso!).toLocaleString()}.`,
        });
      } else if (seoNotificationIsSuccess(post.seoNotification)) {
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
        const fieldErrors = formatZodIssues(err);
        setPublishFieldErrors(parseZodIssues(err));
        toast.error("Some fields are invalid. Please review and try again.", {
          description: fieldErrors ?? undefined,
          style: fieldErrors ? { whiteSpace: "pre-line" } : undefined,
        });
      } else {
        toast.error("Could not publish post.");
      }
    }
  };

  const handleDelete = (post: BlogPost) => {
    setDeleteTarget(post);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const post = deleteTarget;
    setDeleteTarget(null);
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
      <PageMeta page="adminBlog" noindex />
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
            <HealthBadge />
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link href="/admin">
                <LayoutDashboard className="w-4 h-4 mr-1.5" /> Dashboard
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              data-testid="open-audit-log"
            >
              <Link href="/admin/audit-log">
                <ScrollText className="w-4 h-4 mr-1.5" /> Audit log
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              data-testid="open-notifications"
            >
              <Link href="/admin/notifications">
                <Bell className="w-4 h-4 mr-1.5" /> Notifications
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              data-testid="open-moderation"
            >
              <Link href="/admin/moderation">
                <Inbox className="w-4 h-4 mr-1.5" /> Moderation inbox
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              data-testid="open-author-photos"
            >
              <Link href="/admin/author-photos">
                <Users className="w-4 h-4 mr-1.5" /> Author photos
              </Link>
            </Button>
            <a
              href="/api/admin/blog/posts/export.csv"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              data-testid="export-csv"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </a>
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

        <Card id="new-post-form" className="mb-10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" /> New blog post
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewPostOpen((o) => !o)}
                aria-expanded={newPostOpen}
                className="gap-1.5 text-muted-foreground"
              >
                {newPostOpen ? "Collapse" : "Expand"}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${newPostOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
            <form onSubmit={handlePublish} className={`space-y-4 ${newPostOpen ? "" : "hidden"}`}>
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
                  className={publishFieldErrors.title ? "border-destructive" : ""}
                />
                <FieldError error={publishFieldErrors.title} />
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
                  className={publishFieldErrors.slug ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase letters, numbers and hyphens only.
                </p>
                <FieldError error={publishFieldErrors.slug} />
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
                  className={publishFieldErrors.excerpt ? "border-destructive" : ""}
                />
                <FieldError error={publishFieldErrors.excerpt} />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm({ ...form, content: html })}
                  placeholder="Write your post content here… (800–1500 words recommended)"
                />
                {(() => {
                  const wc = form.content
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .split(" ")
                    .filter((w) => w.length > 0).length;
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
                        <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden" title={`${wc} / 1 500 words`}>
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
                      <AuthorOption key={a.slug} author={a} />
                    ))}
                    <GuestAuthorOption />
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
                    className={publishFieldErrors.author ? "border-destructive" : ""}
                  />
                  <FieldError error={publishFieldErrors.author} />
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
                    className={publishFieldErrors.authorRole ? "border-destructive" : ""}
                  />
                  <FieldError error={publishFieldErrors.authorRole} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g. SEO Strategy"
                    value={form.category}
                    onChange={(e) => {
                      setForm({ ...form, category: e.target.value });
                      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
                      suggestionsTimerRef.current = setTimeout(() => {
                        const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
                        const params = new URLSearchParams();
                        if (e.target.value.trim()) params.set("category", e.target.value.trim());
                        if (tags.length) params.set("tags", tags.join(","));
                        if (form.slug.trim()) params.set("exclude", form.slug.trim());
                        fetch(`/api/admin/blog/posts/suggestions?${params}`, { credentials: "include" })
                          .then((r) => r.ok ? r.json() : [])
                          .then(setSuggestions)
                          .catch(() => {});
                      }, 600);
                    }}
                    required
                    className={publishFieldErrors.category ? "border-destructive" : ""}
                  />
                  <FieldError error={publishFieldErrors.category} />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    list="new-post-tags-suggestions"
                    placeholder="seo, fintech, content"
                    value={form.tags}
                    onChange={(e) => {
                      setForm({ ...form, tags: e.target.value });
                      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
                      suggestionsTimerRef.current = setTimeout(() => {
                        const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                        const params = new URLSearchParams();
                        if (form.category.trim()) params.set("category", form.category.trim());
                        if (tags.length) params.set("tags", tags.join(","));
                        if (form.slug.trim()) params.set("exclude", form.slug.trim());
                        fetch(`/api/admin/blog/posts/suggestions?${params}`, { credentials: "include" })
                          .then((r) => r.ok ? r.json() : [])
                          .then(setSuggestions)
                          .catch(() => {});
                      }, 600);
                    }}
                  />
                  {allTags.length > 0 && (
                    <datalist id="new-post-tags-suggestions">
                      {allTags.map((t) => <option key={t} value={t} />)}
                    </datalist>
                  )}
                </div>
              </div>

              {suggestions.length > 0 && (
                <details className="border rounded-md p-3 bg-sky-50/50">
                  <summary className="cursor-pointer text-sm font-medium select-none text-sky-800">
                    Internal link suggestions ({suggestions.length} related posts)
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {suggestions.map((s) => (
                      <li key={s.slug} className="text-xs flex items-center gap-2">
                        <span className="text-muted-foreground font-mono shrink-0">/blog/{s.slug}</span>
                        <span className="text-foreground truncate">{s.title}</span>
                        <button
                          type="button"
                          className="ml-auto shrink-0 text-[#0052FF] hover:underline text-xs"
                          onClick={() => {
                            const link = `<a href="/blog/${s.slug}">${s.title}</a>`;
                            navigator.clipboard.writeText(link).then(() => {
                              toast.success("Link copied to clipboard");
                            }).catch(() => {
                              toast.info(`Link: /blog/${s.slug}`);
                            });
                          }}
                        >
                          Copy link
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coverImage">Cover image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coverImage"
                      type="text"
                      placeholder="https://… or upload"
                      value={form.coverImage}
                      onChange={(e) =>
                        setForm({ ...form, coverImage: e.target.value })
                      }
                      onBlur={(e) => {
                        void warnIfCoverTooSmall(e.target.value);
                      }}
                      required
                      className={publishFieldErrors.coverImage ? "border-destructive" : ""}
                    />
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10 * 1024 * 1024}
                      imageMinDimensions={{ width: 1600, height: 800 }}
                      onValidationWarning={(msg) => toast.warning(msg)}
                      onComplete={async (result) => {
                        const objectPath = result.successful?.[0]?.uploadURL;
                        if (!objectPath) { toast.error("Upload did not return a path"); return; }
                        setForm((f) => ({ ...f, coverImage: objectPath }));
                        toast.success("Cover image uploaded");
                      }}
                      buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                    </ObjectUploader>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste an external URL or upload a file (≤10 MB).
                    Recommended cover size: at least 1600×800 px (2:1).
                  </p>
                  <FieldError error={publishFieldErrors.coverImage} />
                  {form.coverImage && (
                    <div className="mt-2">
                      <img
                        src={form.coverImage}
                        alt="Cover preview"
                        className="h-24 w-full rounded-md object-cover border border-input"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                        onLoad={(e) => { e.currentTarget.style.display = "block"; }}
                      />
                    </div>
                  )}
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
                    className={publishFieldErrors.readingMinutes ? "border-destructive" : ""}
                  />
                  <FieldError error={publishFieldErrors.readingMinutes} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Scheduling</Label>
                <SchedulePicker
                  id="publishedAt"
                  value={form.publishedAt}
                  onChange={(v) => setForm({ ...form, publishedAt: v })}
                  mode="create"
                  data-testid="new-post-published-at"
                />
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

              <div className="flex items-start gap-2">
                <Checkbox
                  id="isDraft"
                  checked={form.isDraft}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isDraft: v === true })
                  }
                  data-testid="new-post-isdraft"
                />
                <div className="grid gap-1 leading-tight">
                  <Label htmlFor="isDraft" className="cursor-pointer">
                    Save as draft (hidden from the public site)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Draft posts are stored in the database but never shown on the public blog. Uncheck to publish.
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
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        Used in browser tab + Google SERP.
                      </p>
                      <span className={`text-xs tabular-nums font-medium ${form.seoTitle.length > 60 ? "text-destructive" : form.seoTitle.length > 50 ? "text-amber-600" : form.seoTitle.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                        {form.seoTitle.length} / 60
                      </span>
                    </div>
                    {form.seoTitle.length > 60 && (
                      <p className="text-xs text-destructive mt-0.5">
                        Over the 60-character limit — Google may truncate this in search results.
                      </p>
                    )}
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
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        Shown as the snippet in Google.
                      </p>
                      <span className={`text-xs tabular-nums font-medium ${form.seoDescription.length > 160 ? "text-destructive" : form.seoDescription.length > 130 ? "text-amber-600" : form.seoDescription.length > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                        {form.seoDescription.length} / 160
                      </span>
                    </div>
                    {form.seoDescription.length > 160 && (
                      <p className="text-xs text-destructive mt-0.5">
                        Over the 160-character limit — Google may truncate this snippet.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="seoOgImage">OG / social image</Label>
                    <div className="flex gap-2">
                      <Input
                        id="seoOgImage"
                        type="text"
                        placeholder="https://… or upload"
                        value={form.seoOgImage}
                        onChange={(e) =>
                          setForm({ ...form, seoOgImage: e.target.value })
                        }
                      />
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={10 * 1024 * 1024}
                        imageMinDimensions={{ width: 1200, height: 630 }}
                        onValidationWarning={(msg) => toast.warning(msg)}
                        onComplete={async (result) => {
                          const objectPath = result.successful?.[0]?.uploadURL;
                          if (!objectPath) { toast.error("Upload did not return a path"); return; }
                          setForm((f) => ({ ...f, seoOgImage: objectPath }));
                          toast.success("OG image uploaded");
                        }}
                        buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] shrink-0"
                      >
                        <Upload className="w-4 h-4" />
                      </ObjectUploader>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      1200×630 PNG/JPG works best for LinkedIn, X, Slack &amp;
                      Facebook.
                    </p>
                  </div>
                </div>
              </details>

              <details className="border rounded-md p-3">
                <summary className="cursor-pointer text-sm font-medium select-none">
                  Structured content (optional)
                </summary>
                <div className="space-y-4 mt-3">
                  <div>
                    <Label htmlFor="blufSummary">Bottom-line summary</Label>
                    <Textarea
                      id="blufSummary"
                      rows={2}
                      maxLength={400}
                      placeholder="One crisp sentence that gives the reader the key takeaway before they read."
                      value={form.blufSummary}
                      onChange={(e) =>
                        setForm({ ...form, blufSummary: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Displayed as a "Bottom line" callout and used in
                      SpeakableSpecification JSON-LD (G3).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="lastMaterialUpdateAt">
                      Last material update
                    </Label>
                    <Input
                      id="lastMaterialUpdateAt"
                      type="datetime-local"
                      value={form.lastMaterialUpdateAt}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lastMaterialUpdateAt: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Overrides <code>dateModified</code> in BlogPosting
                      JSON-LD (W6).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="aboutEntities">
                      About (topics / entities)
                    </Label>
                    <Input
                      id="aboutEntities"
                      placeholder="e.g. Open Banking, PSD3, Embedded Finance"
                      value={form.aboutEntities}
                      onChange={(e) =>
                        setForm({ ...form, aboutEntities: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated. Populates BlogPosting{" "}
                      <code>about</code> (G5).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="mentionEntities">Mentions (entities)</Label>
                    <Input
                      id="mentionEntities"
                      placeholder="e.g. Stripe, Visa, Mastercard, FCA"
                      value={form.mentionEntities}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mentionEntities: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated. Populates BlogPosting{" "}
                      <code>mentions</code> (G5).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="faqItems">FAQ items (JSON)</Label>
                    <Textarea
                      id="faqItems"
                      rows={5}
                      className="font-mono text-xs"
                      placeholder={`[\n  { "question": "What is X?", "answer": "X is…" }\n]`}
                      value={form.faqItems}
                      onChange={(e) =>
                        setForm({ ...form, faqItems: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Valid JSON array of{" "}
                      <code>{"{ question, answer }"}</code> objects. Emits
                      FAQPage JSON-LD and Google rich result (A1).
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

        <HreflangPanel />

        <SitemapHealthPanel />

        {posts && posts.length > 0 && !previewMode && (
          <HardestPostsSpotlight
            posts={posts}
            onJumpToPost={handleJumpToPost}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab("published")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "published"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-published"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Published
              {posts && posts.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {posts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scheduled")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "scheduled"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-scheduled"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Scheduled
              {scheduledPosts && scheduledPosts.length > 0 && (
                <span className="ml-0.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] tabular-nums font-semibold">
                  {scheduledPosts.length}
                </span>
              )}
            </button>
          </div>
          {/* Preview-as-visitor control — only relevant for the published tab */}
          {activeTab === "published" && <div
            className="flex flex-wrap items-center gap-3 text-sm rounded-md border bg-background px-3 py-2"
            data-testid="preview-as-visitor-control"
          >
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <Label
              htmlFor="preview-as-visitor-toggle"
              className="cursor-pointer font-medium"
            >
              Preview as scheduled visitor
            </Label>
            <Switch
              id="preview-as-visitor-toggle"
              checked={previewMode}
              onCheckedChange={(v) => {
                setPreviewMode(v);
                if (v) setSelectedSlugs(new Set());
              }}
              data-testid="preview-as-visitor-switch"
            />
            {previewMode && (
              <>
                <Input
                  type="datetime-local"
                  value={previewAtLocal}
                  onChange={(e) => setPreviewAtLocal(e.target.value)}
                  className="h-8 w-[15rem]"
                  aria-label="Preview the public list as it will look on this date"
                  data-testid="preview-as-visitor-date"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPreviewAtLocal(defaultPreviewAtLocal())
                  }
                  title="Reset to default (one week from now)"
                  data-testid="preview-as-visitor-reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>}
          {activeTab === "published" && !previewMode && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <BulkProbeButton posts={posts ?? []} />
            </div>
          )}
          {activeTab === "published" && (
            <ReadabilityFilterPills
              value={readabilityFilter}
              onChange={setReadabilityFilter}
              totalCount={posts?.length ?? 0}
              filteredCount={filteredPosts.length}
            />
          )}
          {activeTab === "published" && (() => {
            const missingSeoCount = (posts ?? []).filter(
              (p: BlogPost) => !p.seoTitle || !p.seoDescription,
            ).length;
            return missingSeoCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-0.5">SEO meta:</span>
                <button
                  type="button"
                  onClick={() => setSeoFilter(seoFilter === "missing" ? "all" : "missing")}
                  className={[
                    "text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-all",
                    seoFilter === "missing"
                      ? "bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-300"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  ⚠ Missing ({missingSeoCount})
                </button>
                {seoFilter === "missing" && (
                  <button
                    type="button"
                    onClick={() => setSeoFilter("all")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : null;
          })()}
          {activeTab === "published" && !previewMode && posts && posts.length > 0 && (
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
                    setSelectedSlugs(new Set(posts.map((p: { slug: string }) => p.slug)));
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

        {previewMode && previewAsOfIso && (() => {
          const previewDate = new Date(previewAsOfIso);
          const visibleCount = posts?.length ?? 0;
          const newlyVisible = (posts ?? []).filter(
            (p: { publishedAt: string }) => new Date(p.publishedAt).getTime() > Date.now(),
          ).length;
          return (
            <div
              className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center gap-x-4 gap-y-1"
              data-testid="preview-as-visitor-banner"
              role="status"
            >
              <CalendarClock className="w-4 h-4 shrink-0" aria-hidden />
              <span>
                Showing the public blog list as of{" "}
                <strong>{previewDate.toLocaleString()}</strong>.
              </span>
              <span className="text-blue-800">
                <strong className="tabular-nums">{visibleCount}</strong>{" "}
                {visibleCount === 1 ? "post" : "posts"} would be live
                {newlyVisible > 0 && (
                  <>
                    {" "}
                    (
                    <strong className="tabular-nums">
                      +{newlyVisible}
                    </strong>{" "}
                    not yet public)
                  </>
                )}
                .
              </span>
              <span className="text-blue-800/80 text-xs">
                Admin actions (bulk select, edit, delete, probe) are
                hidden in preview.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-blue-900 hover:bg-blue-100"
                onClick={() => setPreviewMode(false)}
                data-testid="preview-as-visitor-exit"
              >
                Exit preview
              </Button>
            </div>
          );
        })()}

        {!previewMode && selectedSlugs.size > 0 && (() => {
          const livePreview = computeNoIndexImpact(
            selectedSlugs,
            posts,
            "noindex",
          );
          const seoIncomplete = (posts ?? []).filter(
            (p: NonNullable<typeof posts>[number]) => selectedSlugs.has(p.slug) && (!p.seoTitle || !p.seoDescription),
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
              {seoIncomplete.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkNoIndexMut.isPending || bulkSeoFilling}
                  onClick={() => {
                    setBulkSeoForm({ seoTitle: "", seoDescription: "" });
                    setBulkSeoDialogOpen(true);
                  }}
                  data-testid="bulk-fill-seo"
                >
                  <Globe className="w-4 h-4 mr-1.5" />
                  Fill SEO ({seoIncomplete.length})
                </Button>
              )}
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
              <Button
                size="sm"
                variant="destructive"
                disabled={bulkDeletePending || deleteMut.isPending}
                data-testid="bulk-unpublish"
                onClick={async () => {
                  const slugs = Array.from(selectedSlugs);
                  if (slugs.length === 0) return;
                  if (!window.confirm(`Unpublish ${slugs.length} post${slugs.length !== 1 ? "s" : ""}? This permanently removes them from the blog and sitemap.`)) return;
                  setBulkDeletePending(true);
                  try {
                    await Promise.all(slugs.map((slug) => deleteMut.mutateAsync({ slug })));
                    toast.success(`Unpublished ${slugs.length} post${slugs.length !== 1 ? "s" : ""}`);
                    setSelectedSlugs(new Set());
                    invalidate();
                  } catch {
                    toast.error("Some posts could not be unpublished.");
                  } finally {
                    setBulkDeletePending(false);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {bulkDeletePending ? "Unpublishing…" : `Unpublish (${selectedSlugs.size})`}
              </Button>
            </div>
          </div>
          );
        })()}

        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deleteMut.isPending) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unpublish post?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>"{deleteTarget?.title}"</strong> will be permanently removed from the blog and sitemap. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMut.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMut.isPending ? "Removing…" : "Unpublish"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
            const impact = computeNoIndexImpact(selectedSlugs, posts, mode);
            const slugs = impact.impacted.map((p) => p.slug);
            if (slugs.length === 0) {
              setImpactDialogMode(null);
              return;
            }
            const wantHidden = mode === "noindex";
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
              const undoSlugs = result.posts.map((p: { slug: string }) => p.slug);
              const undoNoIndex = !wantHidden;
              const undoVerbed = wantHidden ? "re-exposed" : "no-indexed";
              const message = wantHidden
                ? useSnooze
                  ? `No-indexed ${result.updatedCount} ${noun} — auto re-index in ${snoozeDays} ${snoozeDays === 1 ? "day" : "days"}`
                  : `No-indexed ${result.updatedCount} ${noun}`
                : `Removed no-index from ${result.updatedCount} ${noun}`;
              toast.success(message, {
                duration: 10_000,
                action:
                  undoSlugs.length > 0
                    ? {
                        label: "Undo",
                        onClick: async () => {
                          try {
                            const undone = await bulkNoIndexMut.mutateAsync({
                              data: {
                                slugs: undoSlugs,
                                noIndex: undoNoIndex,
                              },
                            });
                            const undoneNoun =
                              undone.updatedCount === 1 ? "post" : "posts";
                            toast.success(
                              `Undo complete — ${undoneNoun === "post" ? "1 post" : `${undone.updatedCount} ${undoneNoun}`} ${undoVerbed} again`,
                            );
                            invalidate();
                          } catch (undoErr) {
                            toast.error(
                              undoErr instanceof Error
                                ? `Undo failed: ${undoErr.message}`
                                : "Undo failed.",
                            );
                          }
                        },
                      }
                    : undefined,
              });
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

        <BulkSeoFillDialog
          open={bulkSeoDialogOpen}
          posts={(posts ?? []).filter(
            (p: NonNullable<typeof posts>[number]) =>
              selectedSlugs.has(p.slug) &&
              (!p.seoTitle || !p.seoDescription),
          )}
          form={bulkSeoForm}
          isPending={bulkSeoFilling}
          onFormChange={setBulkSeoForm}
          onCancel={() => {
            if (!bulkSeoFilling) setBulkSeoDialogOpen(false);
          }}
          onConfirm={async () => {
            const seoTitle = bulkSeoForm.seoTitle.trim() || null;
            const seoDescription = bulkSeoForm.seoDescription.trim() || null;
            const incomplete = (posts ?? []).filter(
              (p: NonNullable<typeof posts>[number]) =>
                selectedSlugs.has(p.slug) &&
                (!p.seoTitle || !p.seoDescription),
            );
            const toUpdate = incomplete.filter(
              (p: NonNullable<typeof posts>[number]) =>
                (!p.seoTitle && seoTitle) ||
                (!p.seoDescription && seoDescription),
            );
            if (toUpdate.length === 0) {
              toast.info("No empty fields to fill on the selected posts.");
              setBulkSeoDialogOpen(false);
              return;
            }
            setBulkSeoFilling(true);
            try {
              await Promise.all(
                toUpdate.map((p: NonNullable<typeof posts>[number]) =>
                  updateBlogPost(p.slug, {
                    ...(!p.seoTitle && seoTitle ? { seoTitle } : {}),
                    ...(!p.seoDescription && seoDescription
                      ? { seoDescription }
                      : {}),
                  }),
                ),
              );
              await qc.invalidateQueries({
                queryKey: getListBlogPostsQueryKey(),
              });
              toast.success(
                `SEO metadata filled on ${toUpdate.length} post${toUpdate.length !== 1 ? "s" : ""}`,
              );
              setBulkSeoDialogOpen(false);
              setSelectedSlugs(new Set());
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? `Update failed: ${err.message}`
                  : "Some updates failed. Please try again.",
              );
            } finally {
              setBulkSeoFilling(false);
            }
          }}
        />

        {/* ---- Scheduled queue tab ---- */}
        {activeTab === "scheduled" && (
          <div className="space-y-3">
            {scheduledLoading && (
              <p className="text-muted-foreground">Loading…</p>
            )}
            {!scheduledLoading && (!scheduledPosts || scheduledPosts.length === 0) && (
              <div className="rounded-md border border-dashed px-6 py-10 text-center text-muted-foreground">
                <CalendarClock className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <p className="font-medium">No posts in the queue</p>
                <p className="text-sm mt-1">
                  Create a post with a future publish date to schedule it.
                </p>
              </div>
            )}
            {!scheduledLoading && scheduledPosts && scheduledPosts.length > 0 && (
              <>
                {/* View toggle + helper text */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  {calendarView ? (
                    <p className="text-xs text-muted-foreground">
                      Click any day to see what's scheduled. Days with gaps ≥ 7 days
                      trigger a warning.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sorted earliest first. Drag{" "}
                      <GripVertical className="inline w-3 h-3" /> to reprioritize,
                      then <strong>Save order</strong> to redistribute timestamps.
                      Use <strong>Publish now</strong> to go live immediately.
                    </p>
                  )}
                  <div className="flex items-center gap-0.5 rounded-md border bg-muted p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCalendarView(false)}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                        !calendarView
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="List view"
                    >
                      <LayoutList className="w-3 h-3" />
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView(true)}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                        calendarView
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Calendar view"
                    >
                      <CalendarDays className="w-3 h-3" />
                      Calendar
                    </button>
                  </div>
                </div>

                {/* Bulk shift-queue inline form */}
                <div className="mb-3">
                  {!shiftQueueOpen ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setShiftHoursInput("");
                        setShiftQueueOpen(true);
                      }}
                    >
                      <Clock className="w-3 h-3" />
                      Shift entire queue
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        Shift all posts by
                      </span>
                      <Input
                        type="number"
                        className="h-7 w-24 text-xs"
                        placeholder="e.g. 48"
                        value={shiftHoursInput}
                        onChange={(e) => setShiftHoursInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setShiftQueueOpen(false);
                        }}
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground shrink-0">hours</span>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        disabled={shiftQueuePending || !shiftHoursInput.trim() || Number.isNaN(Number(shiftHoursInput))}
                        onClick={async () => {
                          const hours = Number(shiftHoursInput);
                          if (!scheduledPosts || Number.isNaN(hours) || hours === 0) return;
                          setShiftQueuePending(true);
                          const snapshot = scheduledPosts.map((p) => ({
                            slug: p.slug,
                            publishedAt: p.publishedAt,
                          }));
                          try {
                            const result = await bulkRescheduleBlogPosts({
                              posts: scheduledPosts.map((p) => ({
                                slug: p.slug,
                                publishedAt: new Date(
                                  new Date(p.publishedAt).getTime() + hours * 3_600_000,
                                ).toISOString(),
                              })),
                            });
                            toast.success(
                              `Shifted ${result.updatedCount} post${result.updatedCount === 1 ? "" : "s"} by ${hours > 0 ? "+" : ""}${hours}h.`,
                            );
                            setShiftSnapshot(snapshot);
                            setShiftSnapshotLabel(
                              `${hours > 0 ? "+" : ""}${hours}h across ${snapshot.length} post${snapshot.length === 1 ? "" : "s"}`,
                            );
                            invalidate();
                            setShiftQueueOpen(false);
                            setShiftHoursInput("");
                          } catch {
                            toast.error("Could not shift the queue. Try again.");
                          } finally {
                            setShiftQueuePending(false);
                          }
                        }}
                      >
                        {shiftQueuePending ? "Shifting…" : "Apply"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShiftQueueOpen(false)}
                        aria-label="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Undo last shift bar */}
                {shiftSnapshot && !shiftQueueOpen && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">
                      Last shift: <span className="font-medium">{shiftSnapshotLabel}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                      disabled={shiftUndoPending}
                      onClick={async () => {
                        if (!shiftSnapshot) return;
                        setShiftUndoPending(true);
                        try {
                          const result = await bulkRescheduleBlogPosts({ posts: shiftSnapshot });
                          toast.success(
                            `Rolled back ${result.updatedCount} post${result.updatedCount === 1 ? "" : "s"} to their previous schedule.`,
                          );
                          setShiftSnapshot(null);
                          setShiftSnapshotLabel("");
                          invalidate();
                        } catch {
                          toast.error("Could not undo the shift. Try again.");
                        } finally {
                          setShiftUndoPending(false);
                        }
                      }}
                    >
                      {shiftUndoPending ? "Undoing…" : "Undo"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
                      onClick={() => { setShiftSnapshot(null); setShiftSnapshotLabel(""); }}
                      aria-label="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Save order bar */}
                {hasQueueChanges && !calendarView && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-3 py-2 text-xs text-blue-800 dark:text-blue-300">
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">
                      Queue reordered — timestamps will redistribute to fill the original slots.
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2 text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                      disabled={reorderSavePending}
                      onClick={() => setLocalQueueOrder(null)}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={reorderSavePending}
                      onClick={async () => {
                        if (!scheduledPosts || !localQueueOrder) return;
                        setReorderSavePending(true);
                        const snapshot = scheduledPosts.map((p) => ({
                          slug: p.slug,
                          publishedAt: p.publishedAt,
                        }));
                        try {
                          const byId = new Map(scheduledPosts.map((p) => [p.id, p]));
                          const reordered = localQueueOrder
                            .map((id) => byId.get(id))
                            .filter(Boolean) as typeof scheduledPosts;
                          const patches = reordered.map((p, i) => ({
                            slug: p.slug,
                            publishedAt: scheduledPosts[i].publishedAt,
                          }));
                          const result = await bulkRescheduleBlogPosts({ posts: patches });
                          toast.success(
                            `Queue reordered — ${result.updatedCount} post${result.updatedCount === 1 ? "" : "s"} rescheduled.`,
                          );
                          setReorderUndoSnapshot(snapshot);
                          setLocalQueueOrder(null);
                          invalidate();
                        } catch {
                          toast.error("Could not save the new order. Try again.");
                        } finally {
                          setReorderSavePending(false);
                        }
                      }}
                    >
                      {reorderSavePending ? "Saving…" : "Save order"}
                    </Button>
                  </div>
                )}

                {/* Undo reorder bar */}
                {reorderUndoSnapshot && !hasQueueChanges && !calendarView && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">Queue order saved. You can undo this reorder.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                      disabled={reorderUndoPending}
                      onClick={async () => {
                        if (!reorderUndoSnapshot) return;
                        setReorderUndoPending(true);
                        try {
                          const result = await bulkRescheduleBlogPosts({ posts: reorderUndoSnapshot });
                          toast.success(
                            `Restored previous order for ${result.updatedCount} post${result.updatedCount === 1 ? "" : "s"}.`,
                          );
                          setReorderUndoSnapshot(null);
                          invalidate();
                        } catch {
                          toast.error("Could not undo the reorder. Try again.");
                        } finally {
                          setReorderUndoPending(false);
                        }
                      }}
                    >
                      {reorderUndoPending ? "Undoing…" : "Undo"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
                      onClick={() => setReorderUndoSnapshot(null)}
                      aria-label="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Gap detector settings row */}
                {!calendarView && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">Flag gaps longer than</span>
                    <Input
                      type="number"
                      min={1}
                      className="h-7 w-20 text-xs"
                      value={gapThresholdInput}
                      onChange={(e) => setGapThresholdInput(e.target.value)}
                      onBlur={() => {
                        const val = Number(gapThresholdInput);
                        if (!Number.isNaN(val) && val >= 1) setGapThresholdHours(val);
                        else setGapThresholdInput(String(gapThresholdHours));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = Number(gapThresholdInput);
                          if (!Number.isNaN(val) && val >= 1) setGapThresholdHours(val);
                          else setGapThresholdInput(String(gapThresholdHours));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      aria-label="Gap threshold in hours"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">hours between posts</span>
                    {(() => {
                      const gapCount = displayedScheduledPosts.filter((p, i) =>
                        i > 0 &&
                        (new Date(p.publishedAt).getTime() - new Date(displayedScheduledPosts[i - 1].publishedAt).getTime()) / 3_600_000 > gapThresholdHours
                      ).length;
                      return gapCount > 0 ? (
                        <span className="ml-auto shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                          {gapCount} gap{gapCount !== 1 ? "s" : ""} detected
                        </span>
                      ) : (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">No gaps detected</span>
                      );
                    })()}
                  </div>
                )}

                {/* Readability filter */}
                {!calendarView && (
                  <ReadabilityFilterPills
                    value={readabilityFilter}
                    onChange={setReadabilityFilter}
                    totalCount={displayedScheduledPosts.length}
                    filteredCount={filteredScheduledPosts.length}
                  />
                )}

                {/* Calendar view */}
                {calendarView && (
                  <ScheduledCalendar
                    posts={scheduledPosts}
                    onPostRescheduled={() => { void refetchScheduled(); }}
                    onScrollToPost={(postId) => {
                      setCalendarView(false);
                      requestAnimationFrame(() => {
                        const el = document.getElementById(`admin-post-${postId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
                          setTimeout(() => {
                            el.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
                          }, 2000);
                        }
                      });
                    }}
                  />
                )}

                {/* List view */}
                {!calendarView && <>
                {filteredScheduledPosts.length === 0 && displayedScheduledPosts.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No posts match the selected readability filter.
                  </p>
                )}
                {filteredScheduledPosts.map((p, idx) => {
                  const dragEnabled = readabilityFilter === "all";
                  const isDragging = dragEnabled && dragSrcIdx === idx;
                  const isDropTarget = dragEnabled && dragOverIdx === idx && dragSrcIdx !== idx;
                  const serverIdx = scheduledPosts?.findIndex((sp) => sp.id === p.id) ?? idx;
                  const isMoved = dragEnabled && serverIdx !== idx;

                  const prevPost = idx > 0 ? filteredScheduledPosts[idx - 1] : null;
                  const gapMs = prevPost
                    ? new Date(p.publishedAt).getTime() - new Date(prevPost.publishedAt).getTime()
                    : 0;
                  const gapHours = gapMs / 3_600_000;
                  const isGap = prevPost !== null && gapHours > gapThresholdHours;
                  const gapLabel = gapHours >= 24
                    ? `${(gapHours / 24).toFixed(1).replace(/\.0$/, "")}d gap`
                    : `${Math.round(gapHours)}h gap`;

                  return (
                    <div key={p.id}>
                      {/* Gap banner */}
                      {isGap && (
                        <div
                          aria-label={`Scheduling gap: ${gapLabel} between posts`}
                          className="flex items-center gap-2 my-1.5 px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-semibold">{gapLabel}</span>
                          <span className="text-xs text-amber-600/80 dark:text-amber-400/70">— scheduling hole exceeds {gapThresholdHours}h threshold</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto h-6 text-xs px-2 shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50 gap-1"
                            onClick={() => {
                              const midMs = (
                                new Date(prevPost!.publishedAt).getTime() +
                                new Date(p.publishedAt).getTime()
                              ) / 2;
                              const midLocalStr = toDateTimeLocalValue(new Date(midMs).toISOString());
                              setForm((f) => ({ ...f, publishedAt: midLocalStr }));
                              const el = document.getElementById("new-post-form");
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "start" });
                                el.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
                                setTimeout(() => el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2"), 2000);
                              }
                            }}
                          >
                            <CalendarClock className="w-3 h-3" />
                            Fill gap
                          </Button>
                        </div>
                      )}
                    <div
                      draggable={dragEnabled}
                      onDragStart={dragEnabled ? (e) => {
                        setDragSrcIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      } : undefined}
                      onDragOver={dragEnabled ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverIdx !== idx) setDragOverIdx(idx);
                      } : undefined}
                      onDragLeave={dragEnabled ? () => {
                        if (dragOverIdx === idx) setDragOverIdx(null);
                      } : undefined}
                      onDragEnd={dragEnabled ? () => {
                        setDragSrcIdx(null);
                        setDragOverIdx(null);
                      } : undefined}
                      onDrop={dragEnabled ? (e) => {
                        e.preventDefault();
                        const src = dragSrcIdx;
                        const dest = idx;
                        setDragSrcIdx(null);
                        setDragOverIdx(null);
                        if (src === null || src === dest || !scheduledPosts) return;
                        const currentIds = localQueueOrder ?? scheduledPosts.map((sp) => sp.id);
                        const nextIds = [...currentIds];
                        const [movedId] = nextIds.splice(src, 1);
                        nextIds.splice(dest, 0, movedId);
                        setLocalQueueOrder(nextIds);
                      } : undefined}
                      className={[
                        "transition-opacity",
                        isDragging ? "opacity-40" : "opacity-100",
                        isDropTarget ? "ring-2 ring-blue-400 ring-offset-1 rounded-lg" : "",
                      ].join(" ")}
                    >
                      <Card id={`admin-post-${p.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col items-center gap-0.5 shrink-0 self-center">
                              <div
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/60 leading-none">
                                {idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold truncate">{p.title}</span>
                                {isMoved && (
                                  <span className="shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                                    moved
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {p.excerpt}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                slug: <code>{p.slug}</code> · {p.category} ·{" "}
                                {p.featured ? "★ featured · " : ""}
                                {p.readingMinutes} min read
                              </div>
                              <div className="mt-1.5">
                                <ReadabilityBadge content={p.content} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label={`Preview ${p.title}`}
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
                                  setEditingId(editingId === p.id ? null : p.id)
                                }
                                aria-label={
                                  editingId === p.id
                                    ? "Close editor"
                                    : `Edit ${p.title}`
                                }
                              >
                                {editingId === p.id ? (
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
                                aria-label={`Remove ${p.title} from queue`}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Countdown panel */}
                          <ScheduledPostPanel
                            post={p}
                            onPublished={() => {
                              invalidate();
                              setActiveTab("published");
                            }}
                          />
                          {editingId === p.id && (
                            <PostEditor
                              post={p}
                              allTags={allTags}
                              onCancel={() => setEditingId(null)}
                              onSaved={() => {
                                setEditingId(null);
                                invalidate();
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    </div>
                  );
                })}
                {reorderSavePending && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    <RefreshCw className="inline w-3 h-3 mr-1 animate-spin" />
                    Saving new order…
                  </p>
                )}
                </>}
              </>
            )}
          </div>
        )}

        {/* ---- Published posts tab ---- */}
        {activeTab === "published" && isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : activeTab === "published" && (
          <div className="space-y-3">
            {!previewMode && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search posts by title, slug, excerpt or tag…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            )}
            {filteredPosts.length === 0 && (posts?.length ?? 0) > 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                {searchQuery.trim()
                  ? `No posts match "${searchQuery.trim()}".`
                  : "No posts match the selected filter."}
              </p>
            )}
            {filteredPosts.map((p: (typeof filteredPosts)[number]) => {
              const isEditing = editingId === p.id;
              const isSelected = selectedSlugs.has(p.slug);
              const publishedAtMs = new Date(p.publishedAt).getTime();
              const isStillScheduled = publishedAtMs > visibilityCutoffMs;
              return (
                <Card key={p.id} id={`admin-post-${p.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      {!previewMode && (
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
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-2">
                          {p.title}
                          {isStillScheduled && (
                            <span
                              title={`Scheduled — goes live on ${new Date(p.publishedAt).toLocaleString()}`}
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800"
                              data-testid={`scheduled-${p.slug}`}
                            >
                              <Clock className="w-3 h-3" />
                              scheduled →{" "}
                              {new Date(p.publishedAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          )}
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
                          {(() => {
                            const wc = p.content
                              .replace(/<[^>]*>/g, " ")
                              .replace(/\s+/g, " ")
                              .trim()
                              .split(" ")
                              .filter((w: string) => w.length > 0).length;
                            return wc > 0 ? ` · ${wc.toLocaleString()} words` : null;
                          })()}
                          {(() => {
                            const pub = new Date(p.publishedAt).getTime();
                            const upd = new Date(p.updatedAt).getTime();
                            const diffDays = (upd - pub) / 86_400_000;
                            return diffDays > 1 ? (
                              <span className="ml-1 text-blue-600/80" title={`Last edited ${new Date(p.updatedAt).toLocaleString()}`}>
                                · edited {new Date(p.updatedAt).toLocaleDateString()}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(p as unknown as { isDraft?: boolean }).isDraft && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              DRAFT
                            </span>
                          )}
                          <SeoStatusBadge
                            pingedAt={p.lastSeoPingAt}
                            status={p.lastSeoPingStatus}
                          />
                          <ReadabilityBadge content={p.content} />
                          <SeoMetaBadge
                            seoTitle={p.seoTitle}
                            seoDescription={p.seoDescription}
                            seoOgImage={p.seoOgImage}
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
                        {!previewMode && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Duplicate post — prefills the New Post form"
                              aria-label={`Duplicate ${p.title}`}
                              onClick={() => {
                                setForm({
                                  ...emptyForm,
                                  title: `${p.title} (copy)`,
                                  excerpt: p.excerpt,
                                  content: p.content,
                                  author: p.author,
                                  authorRole: p.authorRole,
                                  category: p.category,
                                  tags: (p.tags ?? []).join(", "),
                                  coverImage: p.coverImage,
                                  readingMinutes: String(p.readingMinutes),
                                  seoTitle: p.seoTitle ?? "",
                                  seoDescription: p.seoDescription ?? "",
                                  seoOgImage: p.seoOgImage ?? "",
                                });
                                setAutoSlug(true);
                                setNewPostOpen(true);
                                setTimeout(() => {
                                  document.getElementById("new-post-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 80);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <ProbeUrlButton post={p} />
                            <RepingButton post={p} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditingId(isEditing ? null : p.id)
                              }
                              aria-label={
                                isEditing
                                  ? `Close editor`
                                  : `Edit ${p.title}`
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
                          </>
                        )}
                      </div>
                    </div>
                    {isStillScheduled && !previewMode && (
                      <ScheduledPostPanel
                        post={p}
                        onPublished={() => {
                          invalidate();
                        }}
                      />
                    )}
                    {!previewMode && isEditing && (
                      <PostEditor
                        post={p}
                        allTags={allTags}
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
