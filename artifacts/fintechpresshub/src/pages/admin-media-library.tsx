import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy, Check, ImageIcon, FileIcon, RefreshCw,
  Loader2, Trash2, CheckSquare, Square, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageMeta } from "@/components/PageMeta";
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
import { cn } from "@/lib/utils";

interface MediaFile {
  id: string;
  objectPath: string;
  contentType: string;
  sizeBytes: number;
  visibility: string;
}

interface MediaListResponse {
  files: MediaFile[];
  total: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy URL"}
    </Button>
  );
}

export default function AdminMediaLibrary() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch, isFetching } = useQuery<MediaListResponse>({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load media");
      return res.json() as Promise<MediaListResponse>;
    },
    staleTime: 30_000,
  });

  const files = data?.files ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/media/${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: "include",
          }).then((r) => {
            if (!r.ok && r.status !== 404) throw new Error(`Failed to delete ${id}`);
            return id;
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) throw new Error(`${failed.length} file(s) could not be deleted`);
      return ids;
    },
    onMutate: (ids) => {
      setDeletingIds(new Set(ids));
    },
    onSuccess: (ids) => {
      toast.success(`${ids.length} file${ids.length !== 1 ? "s" : ""} deleted`);
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Delete failed");
      void queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onSettled: () => {
      setDeletingIds(new Set());
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.id)));
    }
  }

  function handleDeleteSelected() {
    setConfirmOpen(true);
  }

  function confirmDelete() {
    setConfirmOpen(false);
    deleteMutation.mutate(Array.from(selected));
  }

  const allSelected = files.length > 0 && selected.size === files.length;
  const someSelected = selected.size > 0;

  return (
    <>
      <PageMeta title="Media Library — Admin" noindex />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Media Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data ? `${data.total} file${data.total !== 1 ? "s" : ""} uploaded` : "All uploaded files"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching || deleteMutation.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Bulk-action toolbar — only visible when files exist */}
        {files.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-muted/40">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allSelected ? "Deselect all" : "Select all"}
            </button>

            {someSelected && (
              <>
                <span className="text-muted-foreground text-sm">
                  {selected.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={handleDeleteSelected}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Delete {selected.size} file{selected.size !== 1 ? "s" : ""}
                </Button>
              </>
            )}
          </div>
        )}

        {/* States */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading media files…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load media files.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && files.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Files appear here after they are uploaded through the blog editor.
            </p>
          </div>
        )}

        {/* File grid */}
        {files.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {files.map((file) => {
              const isSelected = selected.has(file.id);
              const isDeleting = deletingIds.has(file.id);
              return (
                <Card
                  key={file.id}
                  className={cn(
                    "overflow-hidden group transition-all duration-150 cursor-pointer",
                    isSelected && "ring-2 ring-primary",
                    isDeleting && "opacity-40 pointer-events-none",
                  )}
                  onClick={() => toggleSelect(file.id)}
                >
                  {/* Preview */}
                  <div className="relative bg-muted aspect-video flex items-center justify-center overflow-hidden">
                    {isImage(file.contentType) ? (
                      <img
                        src={file.objectPath}
                        alt={file.id}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <FileIcon className="h-10 w-10 text-muted-foreground/40" />
                    )}
                    {/* Selection overlay */}
                    <div
                      className={cn(
                        "absolute top-2 right-2 rounded-full bg-background/90 p-0.5 shadow transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {isDeleting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <CardContent className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono truncate max-w-full">
                        {file.contentType.split("/")[1] ?? file.contentType}
                      </Badge>
                      {file.visibility === "public" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200">
                          public
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate" title={file.id}>
                      {file.id.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                    <div className="flex gap-1.5">
                      <CopyUrlButton url={file.objectPath} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete file"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(new Set([file.id]));
                          setConfirmOpen(true);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selected.size} file{selected.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selected.size === 1 ? "this file" : `these ${selected.size} files`} from the server.
              Any blog posts or pages referencing {selected.size === 1 ? "it" : "them"} will show broken images.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete {selected.size === 1 ? "file" : `${selected.size} files`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
