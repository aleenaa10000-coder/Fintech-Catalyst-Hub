import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ImageIcon, FileIcon, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageMeta } from "@/components/PageMeta";
import { toast } from "sonner";

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

  return (
    <>
      <PageMeta title="Media Library — Admin" noindex />
      <div className="p-6 max-w-7xl mx-auto">
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
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

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

        {files.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden group">
                <div className="relative bg-muted aspect-video flex items-center justify-center overflow-hidden">
                  {isImage(file.contentType) ? (
                    <img
                      src={file.objectPath}
                      alt={file.id}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("style");
                      }}
                    />
                  ) : null}
                  {!isImage(file.contentType) && (
                    <FileIcon className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  {isImage(file.contentType) && (
                    <div
                      className="absolute inset-0 items-center justify-center hidden"
                      aria-hidden
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
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
                  <CopyUrlButton url={file.objectPath} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
