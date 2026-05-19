import { useState } from "react";
import {
  useRepingBlogPostIndexNow,
  useCheckSingleSitemapUrl,
  getListBlogPostsQueryKey,
  type BlogPost,
  type SeoNotification,
  type CheckSingleUrlResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { RefreshCw, Activity, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authors, type Author } from "@/data/authors";

export const GUEST_AUTHOR_VALUE = "__guest__";

export const COVER_MIN_WIDTH = 1600;
export const COVER_MIN_HEIGHT = 800;

export async function probeImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | null> {
  if (!url || !/^https?:\/\//i.test(url.trim()) && !url.startsWith("/")) {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, 8000);
    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

export async function warnIfCoverTooSmall(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const dims = await probeImageDimensions(trimmed);
  if (!dims) return;
  if (dims.width < COVER_MIN_WIDTH || dims.height < COVER_MIN_HEIGHT) {
    toast.warning(
      `Cover image is ${dims.width}×${dims.height}px — recommended at least ${COVER_MIN_WIDTH}×${COVER_MIN_HEIGHT}px (2:1) for hero crispness.`,
    );
  }
}

export function formatZodIssues(err: unknown): string | null {
  const data = (err as { data?: { issues?: { path: (string | number)[]; message: string }[] } })?.data;
  if (!data?.issues?.length) return null;
  return data.issues
    .map((issue) => {
      const field = issue.path.length > 0
        ? issue.path.map(String).join(".")
        : "unknown field";
      const label = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase());
      return `• ${label}: ${issue.message}`;
    })
    .join("\n");
}

export function parseZodIssues(err: unknown): Record<string, string> {
  const data = (err as { data?: { issues?: { path: (string | number)[]; message: string }[] } })?.data;
  if (!data?.issues?.length) return {};
  const result: Record<string, string> = {};
  for (const issue of data.issues) {
    if (issue.path.length > 0) {
      const key = String(issue.path[0]);
      if (!result[key]) result[key] = issue.message;
    }
  }
  return result;
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive mt-1">{error}</p>;
}

export function authorSelectValue(name: string, role: string) {
  const match = authors.find(
    (a) => a.name === name && a.role === role,
  );
  return match ? match.slug : name || role ? GUEST_AUTHOR_VALUE : "";
}

export function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthorOption({ author }: { author: Author }) {
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
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function GuestAuthorOption() {
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

export function describeSeoNotification(seo: SeoNotification): string {
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

export function seoNotificationIsSuccess(seo: SeoNotification): boolean {
  return seo.indexNow.status === "accepted";
}

export function RepingButton({ post }: { post: BlogPost }) {
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

export function ProbeUrlButton({ post }: { post: BlogPost }) {
  const mut = useCheckSingleSitemapUrl();
  const [result, setResult] = useState<CheckSingleUrlResult | null>(null);
  const onClick = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return;
    const url = `${origin}/blog/${post.slug}`;
    try {
      const probed = await mut.mutateAsync({ data: { url } });
      setResult(probed);
      const codeOrError = probed.statusCode ?? probed.error ?? "failed";
      if (probed.isBroken) {
        toast.warning(`Live URL probe → ${codeOrError}`, {
          description: post.title,
        });
      } else {
        toast.success(`Live URL OK (${codeOrError})`, {
          description: post.title,
        });
      }
    } catch {
      setResult(null);
      toast.error(`Could not probe "${post.title}".`);
    }
  };
  const tone: "good" | "bad" | null = result
    ? result.isBroken
      ? "bad"
      : "good"
    : null;
  return (
    <div className="flex items-center gap-1">
      {result && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
            tone === "bad"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
          title={
            result.error
              ? `${result.error} — checked ${new Date(
                  result.checkedAt as unknown as string,
                ).toLocaleTimeString()}`
              : `Checked ${new Date(
                  result.checkedAt as unknown as string,
                ).toLocaleTimeString()}`
          }
          data-testid={`probe-result-${post.slug}`}
        >
          {result.statusCode ?? "ERR"}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={mut.isPending}
        aria-label={`Probe live URL for ${post.title}`}
        title="Probe the live URL (HEAD/GET via the link checker)"
        data-testid={`probe-url-${post.slug}`}
      >
        {mut.isPending ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Activity
            className={`w-4 h-4 ${
              tone === "bad"
                ? "text-amber-600"
                : tone === "good"
                  ? "text-green-600"
                  : ""
            }`}
          />
        )}
      </Button>
    </div>
  );
}

export { Select, SelectContent, SelectTrigger, SelectValue };
