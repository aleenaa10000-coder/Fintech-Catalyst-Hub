import { useMemo } from "react";
import { fleschKincaidGrade } from "@/lib/readability";
import { type BlogPost } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

/**
 * Render an absolute timestamp as a short relative-time string
 * ("2 m ago", "3 h ago", "5 d ago"). Used by the per-post IndexNow
 * badge so admins can spot stale posts at a glance. Falls back to a
 * locale date for anything older than a week.
 */
export function formatRelativeTime(iso: string): string {
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
export function SeoStatusBadge({
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
 * Displays a colour-coded Flesch-Kincaid grade-level badge.
 */
export function ReadabilityBadge({ content }: { content: string }) {
  const grade = fleschKincaidGrade(content);
  if (grade === null) return null;

  let colorClass: string;
  let label: string;
  if (grade <= 5) {
    colorClass = "bg-green-100 text-green-800";
    label = "Elementary";
  } else if (grade <= 8) {
    colorClass = "bg-blue-100 text-blue-800";
    label = "Middle school";
  } else if (grade <= 12) {
    colorClass = "bg-amber-100 text-amber-800";
    label = "High school";
  } else {
    colorClass = "bg-red-100 text-red-800";
    label = "College+";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
      title={`Flesch-Kincaid grade level ≈ ${grade} — ${label} reading level`}
    >
      <svg
        aria-hidden
        className="w-3 h-3 shrink-0"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M2 2h12v2H2V2zm0 4h8v2H2V6zm0 4h10v2H2v-2z" />
      </svg>
      Grade {grade}
    </span>
  );
}

/**
 * Shows how many of the three core SEO metadata fields are filled in.
 */
export function SeoMetaBadge({
  seoTitle,
  seoDescription,
  seoOgImage,
}: {
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  seoOgImage: string | null | undefined;
}) {
  const checks = [
    { label: "SEO title", ok: !!seoTitle },
    { label: "SEO description", ok: !!seoDescription },
    { label: "OG image", ok: !!seoOgImage },
  ];
  const score = checks.filter((c) => c.ok).length;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  const { colorClass, dotClass } =
    score === 3
      ? { colorClass: "bg-green-100 text-green-800", dotClass: "bg-green-600" }
      : score === 2
        ? { colorClass: "bg-amber-100 text-amber-800", dotClass: "bg-amber-500" }
        : score === 1
          ? { colorClass: "bg-orange-100 text-orange-800", dotClass: "bg-orange-500" }
          : { colorClass: "bg-red-100 text-red-800", dotClass: "bg-red-500" };

  const title =
    score === 3
      ? "SEO metadata complete — title, description, and OG image all set"
      : `SEO metadata incomplete — missing: ${missing.join(", ")}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
      title={title}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      SEO {score}/3
    </span>
  );
}

export type ReadabilityBand = "all" | "elementary" | "middle" | "high" | "college";

export const READABILITY_BANDS: {
  value: ReadabilityBand;
  label: string;
  colorClass: string;
}[] = [
  { value: "all", label: "All grades", colorClass: "bg-muted text-muted-foreground" },
  { value: "elementary", label: "≤ 5 Elementary", colorClass: "bg-green-100 text-green-800" },
  { value: "middle", label: "6–8 Middle", colorClass: "bg-blue-100 text-blue-800" },
  { value: "high", label: "9–12 High school", colorClass: "bg-amber-100 text-amber-800" },
  { value: "college", label: "13+ College", colorClass: "bg-red-100 text-red-800" },
];

/**
 * Row of pill buttons that let editors filter posts by Flesch-Kincaid
 * grade band.
 */
export function ReadabilityFilterPills({
  value,
  onChange,
  totalCount,
  filteredCount,
}: {
  value: ReadabilityBand;
  onChange: (v: ReadabilityBand) => void;
  totalCount: number;
  filteredCount: number;
}) {
  if (totalCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-0.5">Readability:</span>
      {READABILITY_BANDS.map((band) => {
        const active = value === band.value;
        return (
          <button
            key={band.value}
            type="button"
            onClick={() => onChange(band.value)}
            className={[
              "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all",
              active
                ? `${band.colorClass} border-current ring-1 ring-current`
                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            {band.label}
          </button>
        );
      })}
      {value !== "all" && (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {filteredCount} of {totalCount}
        </span>
      )}
    </div>
  );
}

const HARDEST_POSTS_TOP_N = 5;

/**
 * Spotlight panel listing the top-N published posts with the highest
 * Flesch-Kincaid grade levels.
 */
export function HardestPostsSpotlight({
  posts,
  onJumpToPost,
}: {
  posts: BlogPost[];
  onJumpToPost: (id: number) => void;
}) {
  const ranked = useMemo(() => {
    return posts
      .map((p) => ({ post: p, grade: fleschKincaidGrade(p.content ?? "") }))
      .filter((x): x is { post: BlogPost; grade: number } => x.grade !== null)
      .sort((a, b) => b.grade - a.grade)
      .slice(0, HARDEST_POSTS_TOP_N);
  }, [posts]);

  if (ranked.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50/50" data-testid="hardest-posts-spotlight">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-red-100">
        <BookOpen className="w-4 h-4 text-red-600 shrink-0" />
        <h2 className="text-sm font-semibold text-red-900">
          Hardest posts — readability spotlight
        </h2>
        <span className="ml-auto text-xs text-red-600/70">
          Top {ranked.length} by FK grade · needs rewrite
        </span>
      </div>
      <ol className="divide-y divide-red-100">
        {ranked.map(({ post, grade }, i) => {
          const gradeBg =
            grade > 12
              ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800";
          return (
            <li
              key={post.id}
              className="flex items-center gap-3 px-4 py-2.5"
              data-testid={`hardest-post-row-${post.slug}`}
            >
              <span className="text-xs font-bold text-red-300 w-4 shrink-0 tabular-nums text-right">
                {i + 1}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${gradeBg}`}
                title={`Flesch-Kincaid grade level ≈ ${grade}`}
              >
                Grade {grade}
              </span>
              <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                {post.title}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {post.category}
              </span>
              <button
                type="button"
                onClick={() => onJumpToPost(post.id)}
                className="shrink-0 text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2 whitespace-nowrap"
                data-testid={`hardest-post-edit-${post.slug}`}
              >
                Open editor
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
