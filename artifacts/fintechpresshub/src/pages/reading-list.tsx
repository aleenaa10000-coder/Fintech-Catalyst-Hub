import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import {
  usePublicPosts,
  type PublicPost,
} from "@/data/usePublicPosts";
import { optimizeImageUrl } from "@/lib/imageUtils";
import {
  Bookmark,
  Trash2,
  ArrowRight,
  Clock,
  Calendar,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BOOKMARK_KEY = "fph-bookmarks";
const PROGRESS_KEY = "fph-read-progress";
type BookmarkEntry = { slug: string; title: string; date: string; readTime: string };

export default function ReadingListPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [readProgressMap, setReadProgressMap] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [sortBy, setSortBy] = useState<"saved" | "progress">("saved");

  useEffect(() => {
    try {
      setBookmarks(
        JSON.parse(localStorage.getItem(BOOKMARK_KEY) ?? "[]") as BookmarkEntry[],
      );
    } catch {
      setBookmarks([]);
    }
    try {
      setReadProgressMap(
        JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, number>,
      );
    } catch {
      setReadProgressMap({});
    }
    setHydrated(true);
  }, []);

  const { posts: allPosts = [], isLoading } = usePublicPosts();

  const enriched = bookmarks.map((b) => ({
    bookmark: b,
    post: (allPosts as PublicPost[]).find((p) => p.slug === b.slug) ?? null,
  }));

  // In progress (5–94%) first → Not started (0–4%) → Done (≥95%)
  function progressGroup(p: number): number {
    if (p >= 5 && p < 95) return 0;
    if (p < 5) return 1;
    return 2;
  }

  const sorted =
    sortBy === "progress"
      ? [...enriched].sort((a, b) => {
          const pa = readProgressMap[a.bookmark.slug] ?? 0;
          const pb = readProgressMap[b.bookmark.slug] ?? 0;
          return progressGroup(pa) - progressGroup(pb);
        })
      : enriched;

  const removeBookmark = (slug: string) => {
    try {
      const next = bookmarks.filter((b) => b.slug !== slug);
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
      setBookmarks(next);
      toast.success("Removed from reading list");
    } catch {
      toast.error("Could not update reading list");
    }
  };

  const clearAll = () => {
    try {
      localStorage.removeItem(BOOKMARK_KEY);
      setBookmarks([]);
      toast.success("Reading list cleared");
    } catch {
      toast.error("Could not clear reading list");
    }
  };

  const loading = !hydrated || isLoading;

  return (
    <>
      <PageMeta
        title="Reading List | FintechPressHub"
        description="Your bookmarked fintech articles — pick up where you left off."
        noindex
      />

      {/* ── Page header ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
              Saved for later
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Reading List
          </h1>
          <p className="text-slate-400 text-base max-w-lg leading-relaxed">
            Articles you've bookmarked — they're stored in your browser and only visible to you.
          </p>
          {hydrated && bookmarks.length > 0 && (
            <div className="mt-5 flex items-center gap-5">
              <span className="text-sm text-slate-400">
                <span className="font-semibold text-white">{bookmarks.length}</span>{" "}
                {bookmarks.length === 1 ? "article" : "articles"} saved
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-slate-500 hover:text-red-400 transition-colors underline underline-offset-4 decoration-dotted"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Content area ── */}
      <section className="py-12 px-4 bg-slate-50 min-h-[50vh]">
        <div className="container mx-auto max-w-4xl">
          {/* Skeleton */}
          {loading && (
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse"
                >
                  <div className="h-40 bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-slate-100 rounded-full w-1/4" />
                    <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                    <div className="h-8 bg-slate-100 rounded-lg w-28 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && bookmarks.length === 0 && (
            <div className="py-24 flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <Bookmark className="w-9 h-9 text-slate-300" />
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-800 mb-2">
                  Your reading list is empty
                </p>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  While reading any blog post, click the{" "}
                  <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
                    <Bookmark className="w-3.5 h-3.5 inline" /> bookmark
                  </span>{" "}
                  icon in the sidebar to save it here.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-1 gap-2">
                <Link href="/blog">
                  Browse the blog <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}

          {/* Sort control */}
          {!loading && enriched.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              {(["saved", "progress"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    sortBy === opt
                      ? "bg-[#0052FF] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-[#0052FF]/40 hover:text-[#0052FF]"
                  }`}
                >
                  {opt === "saved" ? "Saved order" : "By progress"}
                </button>
              ))}
            </div>
          )}

          {/* Cards */}
          {!loading && enriched.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6">
              {sorted.map(({ bookmark, post }) => (
                <ReadingCard
                  key={bookmark.slug}
                  bookmark={bookmark}
                  post={post}
                  progress={readProgressMap[bookmark.slug] ?? 0}
                  onRemove={() => removeBookmark(bookmark.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ReadingCard({
  bookmark,
  post,
  progress,
  onRemove,
}: {
  bookmark: BookmarkEntry;
  post: PublicPost | null;
  progress: number;
  onRemove: () => void;
}) {
  const title = post?.title ?? bookmark.title;
  const date = post?.date ?? bookmark.date;
  const readTime = post?.readTime ?? bookmark.readTime;
  const coverImage = post?.image;
  const category = post?.category;
  const author = post?.author;

  const inProgress = progress >= 5 && progress < 95;
  const done = progress >= 95;

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-[#0052FF]/25 transition-all duration-200">
      {/* Cover image + progress overlays */}
      <Link
        href={`/blog/${bookmark.slug}`}
        className="relative block overflow-hidden shrink-0"
        aria-hidden="true"
        tabIndex={-1}
      >
        {coverImage ? (
          <img
            src={optimizeImageUrl(coverImage, 600)}
            alt=""
            className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            width={600}
            height={338}
          />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-slate-200" aria-hidden="true" />
          </div>
        )}

        {/* Progress badge — top-right corner */}
        {inProgress && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#0052FF] text-[11px] font-bold rounded-full px-2 py-0.5 shadow-sm tabular-nums">
            {Math.round(progress)}% read
          </span>
        )}
        {done && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[11px] font-bold rounded-full px-2 py-0.5 shadow-sm">
            ✓ Done
          </span>
        )}

        {/* Progress bar — bottom of cover */}
        {(inProgress || done) && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20" aria-hidden="true">
            <div
              className={done ? "h-full bg-emerald-400" : "h-full bg-[#0052FF]"}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {category && (
          <Badge variant="secondary" className="w-fit text-[11px] font-semibold">
            {category}
          </Badge>
        )}

        <h2 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0052FF] transition-colors">
          <Link href={`/blog/${bookmark.slug}`}>{title}</Link>
        </h2>

        {author && (
          <p className="text-xs text-slate-500 -mt-1">by {author}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto flex-wrap">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {formattedDate}
            </span>
          )}
          {readTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {readTime}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 mt-1">
          <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold">
            <Link href={`/blog/${bookmark.slug}`}>
              {inProgress ? "Resume reading" : "Read article"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove "${title}" from reading list`}
            className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
