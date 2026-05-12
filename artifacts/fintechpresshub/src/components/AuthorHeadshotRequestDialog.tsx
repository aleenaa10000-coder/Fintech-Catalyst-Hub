import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";

const HEADSHOT_MIN = { width: 800, height: 800 };

interface Props {
  authorSlug: string;
  authorName: string;
  triggerLabel?: string;
  triggerVariant?: "ghost" | "outline" | "secondary";
  className?: string;
}

async function presignAndUpload(file: {
  name: string;
  size: number;
  type: string;
}) {
  const res = await fetch("/api/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return (await res.json()) as { uploadURL: string; objectPath: string };
}

async function finalizeUpload(uploadURL: string) {
  const res = await fetch("/api/uploads/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadURL }),
  });
  if (!res.ok) throw new Error("Failed to finalize upload");
  return (await res.json()) as { objectPath: string };
}

export function AuthorHeadshotRequestDialog({
  authorSlug,
  authorName,
  triggerLabel = "Submit a new headshot",
  triggerVariant = "outline",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setPhotoUrl(null);
    setSubmitterName("");
    setSubmitterEmail("");
    setNote("");
    setSubmitting(false);
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl) {
      toast.error("Please upload a headshot first.");
      return;
    }
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      toast.error("Please enter a valid email or leave it blank.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/author-photo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: authorSlug,
          photoUrl,
          submitterName: submitterName.trim() || undefined,
          submitterEmail: submitterEmail.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (res.status === 429) {
        toast.error("Too many submissions from this address. Please try later.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        toast.error("Couldn't send the submission. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      setSubmitting(false);
    } catch {
      toast.error("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size="sm"
          className={className}
          data-testid={`headshot-request-trigger-${authorSlug}`}
        >
          <Camera className="w-4 h-4 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Submission received</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Our editorial team will review your headshot and update {authorName}
              's profile if approved.
            </p>
            <Button onClick={() => setOpen(false)} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Submit a headshot for {authorName}</DialogTitle>
              <DialogDescription>
                Upload a square 800×800&nbsp;px headshot. Our team will review
                before publishing — nothing goes live automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-1.5 block">Headshot</Label>
                {photoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <img
                      src={photoUrl}
                      alt="Submitted headshot preview"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Headshot ready</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {photoUrl}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl(null)}
                      data-testid="clear-headshot"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5 * 1024 * 1024}
                    imageMinDimensions={HEADSHOT_MIN}
                    onValidationWarning={(msg) => toast.warning(msg)}
                    onGetUploadParameters={async (file) => {
                      const { uploadURL } = await presignAndUpload({
                        name: file.name ?? "headshot",
                        size: file.size ?? 0,
                        type: file.type ?? "application/octet-stream",
                      });
                      return {
                        method: "PUT",
                        url: uploadURL,
                        headers: {
                          "Content-Type":
                            file.type ?? "application/octet-stream",
                        },
                      };
                    }}
                    onComplete={async (result) => {
                      const uploaded = result.successful?.[0];
                      const uploadURL = uploaded?.uploadURL;
                      if (!uploadURL) {
                        toast.error("Upload did not return a URL");
                        return;
                      }
                      try {
                        const { objectPath } = await finalizeUpload(uploadURL);
                        setPhotoUrl(objectPath);
                        toast.success("Headshot uploaded — add a note and submit.");
                      } catch {
                        toast.error("Could not finalize upload");
                      }
                    }}
                    buttonClassName="bg-[#0052FF] hover:bg-[#0040cc] w-full"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Choose photo (≥ 800×800)
                  </ObjectUploader>
                )}
              </div>

              <div>
                <Label htmlFor="submitter-name" className="mb-1.5 block">
                  Your name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="submitter-name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={120}
                  data-testid="submitter-name"
                />
              </div>

              <div>
                <Label htmlFor="submitter-email" className="mb-1.5 block">
                  Email <span className="text-muted-foreground">(optional, for follow-up)</span>
                </Label>
                <Input
                  id="submitter-email"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                  data-testid="submitter-email"
                />
              </div>

              <div>
                <Label htmlFor="submitter-note" className="mb-1.5 block">
                  Note <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="submitter-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. New role title, refreshed brand guidelines, etc."
                  rows={3}
                  maxLength={800}
                  data-testid="submitter-note"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!photoUrl || submitting}
                className="bg-[#0052FF] hover:bg-[#0040cc]"
                data-testid="submit-headshot-request"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit for review"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
