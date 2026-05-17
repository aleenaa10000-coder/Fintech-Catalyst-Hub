import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RatingData {
  toolSlug: string;
  ratingValue: number | null;
  ratingCount: number;
}

interface ToolRatingWidgetProps {
  toolSlug: string;
  toolName: string;
}

const STORAGE_KEY = (slug: string) => `fph_rated_${slug}`;

export function ToolRatingWidget({ toolSlug, toolName }: ToolRatingWidgetProps) {
  const [data, setData] = useState<RatingData | null>(null);
  const [hover, setHover] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setHasRated(!!localStorage.getItem(STORAGE_KEY(toolSlug)));
    fetch(`/api/tools/${toolSlug}/ratings`)
      .then((r) => r.json())
      .then((d: RatingData) => setData(d))
      .catch(() => null);
  }, [toolSlug]);

  async function submitRating(rating: number) {
    if (hasRated || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tools/${toolSlug}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: RatingData = await res.json();
      setData(updated);
      setHasRated(true);
      localStorage.setItem(STORAGE_KEY(toolSlug), "1");
      toast.success("Thanks for your rating!");
    } catch {
      toast.error("Could not submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayRating = data?.ratingValue ?? 0;
  const displayCount = data?.ratingCount ?? 0;

  return (
    <div className="flex flex-col items-center gap-2 py-6 border-t border-slate-100">
      <p className="text-sm font-medium text-slate-700">
        {hasRated ? `Thanks! ${toolName} is rated` : `Rate this tool`}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={hasRated || isSubmitting}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
            onMouseEnter={() => !hasRated && setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submitRating(star)}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hover || (hasRated ? displayRating : 0))
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
      {displayCount > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-slate-700">{displayRating.toFixed(1)}/5</span>
          {" "}from {displayCount.toLocaleString()} {displayCount === 1 ? "rating" : "ratings"}
        </p>
      )}
      {!hasRated && (
        <p className="text-xs text-muted-foreground">Your feedback helps other fintech teams find the best tools.</p>
      )}
    </div>
  );
}
