import { useEffect, useMemo, useState } from "react";
import {
  useUpdateBlogPost,
  type BlogPost,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCountdown(targetMs: number): string {
  const remaining = targetMs - Date.now();
  if (remaining <= 0) return "any moment now";
  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ScheduledPostPanel({
  post,
  onPublished,
}: {
  post: BlogPost;
  onPublished: () => void;
}) {
  const updateMut = useUpdateBlogPost();
  const targetMs = new Date(post.publishedAt).getTime();
  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdown(targetMs),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(targetMs));
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const publishNow = async () => {
    try {
      await updateMut.mutateAsync({
        slug: post.slug,
        data: { publishedAt: new Date().toISOString() },
      });
      toast.success(`"${post.title}" is now live.`);
      onPublished();
    } catch {
      toast.error("Could not publish post immediately.");
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
      <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
      <span className="text-blue-800 font-medium">Scheduled</span>
      <span className="text-blue-700">
        {new Date(post.publishedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className="font-mono text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
        {countdown}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-900"
        onClick={publishNow}
        disabled={updateMut.isPending}
        data-testid={`publish-now-${post.slug}`}
      >
        {updateMut.isPending ? (
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5 mr-1.5" />
        )}
        Publish now
      </Button>
    </div>
  );
}

export function ScheduledCalendar({
  posts,
  onScrollToPost,
}: {
  posts: BlogPost[];
  onScrollToPost: (postId: number) => void;
}) {
  const today = new Date();
  const firstPostDate =
    posts.length > 0 ? new Date(posts[0].publishedAt) : today;
  const initYear =
    firstPostDate < today ? today.getFullYear() : firstPostDate.getFullYear();
  const initMonth =
    firstPostDate < today ? today.getMonth() : firstPostDate.getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const postsByDay = useMemo(() => {
    const map = new Map<string, BlogPost[]>();
    for (const p of posts) {
      const key = localDateKey(new Date(p.publishedAt));
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ date: Date; isCurrentMonth: boolean } | null> = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(viewYear, viewMonth, -startOffset + i + 1);
      cells.push({ date: d, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d), isCurrentMonth: true });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 1; i <= 7 - remainder; i++) {
        cells.push({ date: new Date(viewYear, viewMonth + 1, i), isCurrentMonth: false });
      }
    }
    return cells;
  }, [viewYear, viewMonth]);

  const postsThisMonth = useMemo(
    () =>
      posts.filter((p) => {
        const d = new Date(p.publishedAt);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      }),
    [posts, viewYear, viewMonth],
  );

  const longestGap = useMemo(() => {
    if (postsThisMonth.length < 2) return 0;
    const dates = postsThisMonth
      .map((p) => new Date(p.publishedAt).getTime())
      .sort((a, b) => a - b);
    let max = 0;
    for (let i = 1; i < dates.length; i++) {
      const gap = Math.round((dates[i] - dates[i - 1]) / 86_400_000);
      if (gap > max) max = gap;
    }
    return max;
  }, [postsThisMonth]);

  const todayKey = localDateKey(today);
  const selectedPosts = selectedKey ? (postsByDay.get(selectedKey) ?? []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {longestGap >= 7 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          Longest gap this month: <strong>{longestGap} days</strong> between
          scheduled posts — consider filling it.
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">Density:</span>
        {(
          [
            { label: "Empty",  bg: "bg-background border border-border" },
            { label: "1 post", bg: "bg-sky-50 border border-sky-200" },
            { label: "2–3",    bg: "bg-blue-100 border border-blue-200" },
            { label: "4+ ⚠",  bg: "bg-amber-100 border border-amber-300" },
          ] as const
        ).map(({ label, bg }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block w-3.5 h-3.5 rounded-sm ${bg}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} className="bg-background" />;
          const key = localDateKey(cell.date);
          const dayPosts = postsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const hasPosts = dayPosts.length > 0;
          const isOtherMonth = !cell.isCurrentMonth;

          const tier = isOtherMonth ? -1 : dayPosts.length === 0 ? 0 : dayPosts.length === 1 ? 1 : dayPosts.length <= 3 ? 2 : 3;
          const tierBg  = tier === 1 ? "bg-sky-50"    : tier === 2 ? "bg-blue-100"  : tier === 3 ? "bg-amber-100" : "bg-background";
          const tierHover = tier === 1 ? "hover:bg-sky-100" : tier === 2 ? "hover:bg-blue-200" : tier === 3 ? "hover:bg-amber-200" : "hover:bg-muted/30";
          const tierRing  = tier === 3 ? "ring-2 ring-inset ring-amber-400" : "ring-2 ring-inset ring-blue-400";
          const tierDot   = tier === 3 ? "bg-amber-500" : tier === 2 ? "bg-blue-600" : "bg-sky-500";
          const tierBadge = tier === 3 ? "text-amber-700" : tier === 2 ? "text-blue-700" : "text-sky-600";

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (!hasPosts) return;
                setSelectedKey(isSelected ? null : key);
              }}
              className={[
                "relative flex flex-col items-start p-1.5 min-h-[64px] text-left transition-colors",
                isOtherMonth ? "bg-muted/30 text-muted-foreground/40" : tierBg,
                hasPosts && !isOtherMonth ? `${tierHover} cursor-pointer` : "cursor-default",
                isSelected ? tierRing : "",
              ].join(" ")}
              disabled={!hasPosts}
              aria-label={
                hasPosts
                  ? `${cell.date.getDate()} — ${dayPosts.length} post${dayPosts.length > 1 ? "s" : ""}`
                  : String(cell.date.getDate())
              }
            >
              <span
                className={[
                  "text-xs font-medium leading-none mb-1",
                  isToday
                    ? "flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px]"
                    : "",
                  !isToday && isOtherMonth ? "text-muted-foreground/40" : "",
                  !isToday && !isOtherMonth ? "text-foreground" : "",
                ].join(" ")}
              >
                {cell.date.getDate()}
              </span>

              {hasPosts && !isOtherMonth && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className={`block w-1.5 h-1.5 rounded-full ${tierDot}`}
                      title={p.title}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <span className={`text-[9px] font-bold leading-none mt-0.5 ${tierBadge}`}>
                      +{dayPosts.length - 3}
                    </span>
                  )}
                </div>
              )}

              {hasPosts && !isOtherMonth && (
                <span className={`mt-auto text-[9px] font-semibold ${tierBadge}`}>
                  {dayPosts.length === 1 ? "1 post" : `${dayPosts.length} posts`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && selectedPosts.length > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 divide-y divide-blue-100">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">
              {new Date(selectedKey + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" — "}
              {selectedPosts.length} post{selectedPosts.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="text-blue-500 hover:text-blue-700 p-0.5"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {selectedPosts.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-blue-900">{p.title}</p>
                <p className="text-xs text-blue-700 truncate">{p.excerpt}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  {new Date(p.publishedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {p.category} · {p.readingMinutes} min read
                </p>
              </div>
              <button
                type="button"
                onClick={() => onScrollToPost(p.id)}
                className="shrink-0 text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 whitespace-nowrap"
              >
                Go to post
              </button>
            </div>
          ))}
        </div>
      )}

      {postsThisMonth.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">
          No posts scheduled in {monthLabel}.
        </p>
      )}
    </div>
  );
}
