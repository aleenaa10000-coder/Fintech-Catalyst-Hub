import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Loader2, FileEdit, Trash2, Send, EyeOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageMeta } from "@/components/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PostAuditEntry {
  id: number;
  actorEmail: string;
  actorUserId: string | null;
  action: string;
  postId: string;
  postSlug: string;
  postTitle: string;
  changedFields: Record<string, unknown>;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  published: {
    label: "Published",
    icon: <Send className="h-3 w-3" />,
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  updated: {
    label: "Updated",
    icon: <FileEdit className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  deleted: {
    label: "Deleted",
    icon: <Trash2 className="h-3 w-3" />,
    color: "bg-red-100 text-red-800 border-red-200",
  },
  unpublished: {
    label: "Unpublished",
    icon: <EyeOff className="h-3 w-3" />,
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  scheduled: {
    label: "Scheduled",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { label: action, icon: null, color: "bg-muted text-foreground border-border" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
        meta.color,
      )}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminPostAuditLog() {
  const [limit] = useState(200);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<PostAuditEntry[]>({
    queryKey: ["admin-post-audit-log", limit],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit/post-actions?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json() as Promise<PostAuditEntry[]>;
    },
    staleTime: 30_000,
  });

  const entries = data ?? [];

  return (
    <>
      <PageMeta title="Post Audit Log — Admin" noindex />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Post Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every time a post is published, updated, or deleted — who did it and when.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading audit log…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load audit log.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && entries.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <FileEdit className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No post actions recorded yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Actions appear here as soon as a post is published, updated, or deleted.
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-36">When</TableHead>
                  <TableHead className="w-28">Action</TableHead>
                  <TableHead>Post</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="w-40">Changed fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="text-sm align-top">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell className="py-3">
                      <ActionBadge action={entry.action} />
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium leading-snug line-clamp-2">{entry.postTitle}</p>
                      <a
                        href={`/blog/${entry.postSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 font-mono"
                      >
                        /{entry.postSlug}
                      </a>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground break-all">
                      {entry.actorEmail}
                    </TableCell>
                    <TableCell className="py-3">
                      {Object.keys(entry.changedFields ?? {}).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(entry.changedFields).slice(0, 5).map((field) => (
                            <Badge key={field} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                              {field}
                            </Badge>
                          ))}
                          {Object.keys(entry.changedFields).length > 5 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{Object.keys(entry.changedFields).length - 5}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
