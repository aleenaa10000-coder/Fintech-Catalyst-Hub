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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  { value: "spam", label: "Spam or promotional" },
  { value: "inaccurate", label: "Factually inaccurate" },
  { value: "inappropriate", label: "Inappropriate or harmful" },
  { value: "copyright", label: "Copyright / plagiarism" },
  { value: "broken", label: "Broken link or media" },
  { value: "other", label: "Other" },
] as const;

interface ReportContentDialogProps {
  contentType: "blog_post" | "comment" | "other";
  contentId: string;
  contentTitle?: string;
  contentUrl?: string;
  triggerVariant?: "ghost" | "outline" | "secondary";
  triggerSize?: "sm" | "default";
  triggerLabel?: string;
  className?: string;
}

export function ReportContentDialog({
  contentType,
  contentId,
  contentTitle,
  contentUrl,
  triggerVariant = "ghost",
  triggerSize = "sm",
  triggerLabel = "Report",
  className,
}: ReportContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason("");
    setDetails("");
    setReporterEmail("");
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Please choose a reason for the report.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          contentTitle: contentTitle ?? null,
          contentUrl: contentUrl ?? null,
          reason,
          details: details.trim() || null,
          reporterEmail: reporterEmail.trim() || null,
        }),
      });

      if (res.status === 429) {
        toast.error("Too many reports from this address. Please try later.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        toast.error("Couldn't send the report. Please try again.");
        setSubmitting(false);
        return;
      }
      toast.success("Thanks — our editorial team will review this report.");
      setOpen(false);
      reset();
    } catch {
      toast.error("Couldn't send the report. Please try again.");
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
          size={triggerSize}
          className={className}
          data-testid="open-report-dialog"
        >
          <Flag className="w-3.5 h-3.5 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>
            Flag content that's inaccurate, broken, spammy, or otherwise needs
            an editor's attention. Reports are reviewed in the admin moderation
            inbox.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {contentTitle && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Reporting:</span>{" "}
              <span className="line-clamp-2">{contentTitle}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason" data-testid="report-reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">
              Details{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What should the editor know? (max 2000 chars)"
              maxLength={2000}
              rows={4}
              data-testid="report-details"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-email">
              Your email{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional — for follow-up)
              </span>
            </Label>
            <Input
              id="report-email"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="report-email"
            />
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
              disabled={submitting || !reason}
              className="bg-[#0052FF] hover:bg-[#0040cc]"
              data-testid="submit-report"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
