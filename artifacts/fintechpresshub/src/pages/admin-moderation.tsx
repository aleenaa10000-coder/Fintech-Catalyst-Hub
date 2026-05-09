import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Lock,
  LogOut,
  ArrowLeft,
  Inbox,
  FileText,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type SubmissionStatus = "unread" | "handled";
type SubmissionStatusFilter = SubmissionStatus | "all";

type EditorialStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "revisions"
  | "published"
  | "rejected";

const EDITORIAL_STATUS_OPTIONS: { value: EditorialStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "revisions", label: "Revisions requested" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

const EDITORIAL_STATUS_STYLES: Record<
  EditorialStatus,
  { badge: string }
> = {
  submitted: { badge: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
  reviewing: { badge: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  approved: { badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  revisions: { badge: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  published: { badge: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  rejected: { badge: "bg-red-100 text-red-600 hover:bg-red-100" },
};

interface PitchSubmission {
  id: number;
  name: string;
  email: string;
  website: string | null;
  topic: string;
  category: string | null;
  pitch: string;
  sampleUrl: string | null;
  status: SubmissionStatus;
  handledAt: string | null;
  handledBy: string | null;
  editorialStatus: EditorialStatus;
  adminNotes: string | null;
  createdAt: string;
}

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  website: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  status: SubmissionStatus;
  handledAt: string | null;
  handledBy: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "handled") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" /> Handled
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="text-[10px] shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100"
    >
      Unread
    </Badge>
  );
}

function StatusActions({
  status,
  busy,
  onMark,
}: {
  status: SubmissionStatus;
  busy: boolean;
  onMark: (next: SubmissionStatus) => void;
}) {
  if (status === "unread") {
    return (
      <Button
        size="sm"
        onClick={() => onMark("handled")}
        disabled={busy}
        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
      >
        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
        {busy ? "Saving…" : "Mark as handled"}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onMark("unread")}
      disabled={busy}
      className="text-xs"
    >
      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
      {busy ? "Saving…" : "Reopen"}
    </Button>
  );
}

function EditorialStatusBadge({ status }: { status: EditorialStatus }) {
  const style = EDITORIAL_STATUS_STYLES[status] ?? EDITORIAL_STATUS_STYLES.submitted;
  const label =
    EDITORIAL_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <Badge className={`text-[10px] shrink-0 ${style.badge}`}>{label}</Badge>
  );
}

function PitchRow({
  sub,
  onSetStatus,
  onSetEditorial,
}: {
  sub: PitchSubmission;
  onSetStatus: (id: number, status: SubmissionStatus) => Promise<void>;
  onSetEditorial: (
    id: number,
    data: { editorialStatus?: EditorialStatus; adminNotes?: string | null },
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorialBusy, setEditorialBusy] = useState(false);
  const [editorialStatus, setEditorialStatus] = useState<EditorialStatus>(
    sub.editorialStatus,
  );
  const [adminNotes, setAdminNotes] = useState(sub.adminNotes ?? "");

  async function handle(next: SubmissionStatus) {
    setBusy(true);
    try {
      await onSetStatus(sub.id, next);
    } finally {
      setBusy(false);
    }
  }

  async function saveEditorial() {
    setEditorialBusy(true);
    try {
      await onSetEditorial(sub.id, {
        editorialStatus,
        adminNotes: adminNotes.trim() || null,
      });
      toast.success("Editorial workflow updated");
    } finally {
      setEditorialBusy(false);
    }
  }

  return (
    <div
      className={`border-b last:border-b-0 ${
        sub.status === "unread" ? "" : "bg-muted/20"
      }`}
    >
      <button
        className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={sub.status} />
            <EditorialStatusBadge status={sub.editorialStatus} />
            <span
              className={`font-semibold text-sm truncate ${
                sub.status === "handled" ? "text-muted-foreground" : ""
              }`}
            >
              {sub.topic}
            </span>
            {sub.category && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {sub.category}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {sub.name} · {sub.email}{" "}
            <span className="text-muted-foreground/60" title={formatDateTime(sub.createdAt)}>
              · {timeAgo(sub.createdAt)}
            </span>
          </div>
        </div>
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-4 text-sm bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-muted-foreground pt-2">
            <div>
              <span className="font-semibold text-foreground">Name:</span> {sub.name}
            </div>
            <div>
              <span className="font-semibold text-foreground">Email:</span>{" "}
              <a href={`mailto:${sub.email}`} className="text-[#0052FF] hover:underline">
                {sub.email}
              </a>
            </div>
            {sub.website && (
              <div>
                <span className="font-semibold text-foreground">Website:</span>{" "}
                <a
                  href={sub.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0052FF] hover:underline inline-flex items-center gap-1"
                >
                  {sub.website} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {sub.sampleUrl && (
              <div>
                <span className="font-semibold text-foreground">Sample URL:</span>{" "}
                <a
                  href={sub.sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0052FF] hover:underline inline-flex items-center gap-1"
                >
                  View sample <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            <div>
              <span className="font-semibold text-foreground">Received:</span>{" "}
              {formatDateTime(sub.createdAt)}
            </div>
            {sub.status === "handled" && sub.handledAt && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-foreground">Handled:</span>{" "}
                {formatDateTime(sub.handledAt)}
                {sub.handledBy && (
                  <span className="text-muted-foreground/70"> · by {sub.handledBy}</span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
              The Pitch
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 bg-background rounded-lg border p-3">
              {sub.pitch}
            </p>
          </div>

          {/* W1: Editorial workflow panel */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-background p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Editorial workflow
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {EDITORIAL_STATUS_OPTIONS.map((opt) => {
                const style = EDITORIAL_STATUS_STYLES[opt.value];
                const isActive = editorialStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditorialStatus(opt.value)}
                    className={[
                      "text-[11px] px-2.5 py-1 rounded-full border transition-all",
                      isActive
                        ? `${style.badge} border-current font-semibold`
                        : "border-slate-200 text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Internal notes (not visible to contributor)
              </div>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add feedback, revision requests, or rejection reasons…"
                className="text-xs min-h-[72px] resize-y"
              />
            </div>
            <Button
              size="sm"
              className="text-xs bg-[#0052FF] hover:bg-[#0040cc]"
              disabled={editorialBusy}
              onClick={saveEditorial}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {editorialBusy ? "Saving…" : "Save editorial status"}
            </Button>
          </div>

          <div className="flex gap-2 pt-1 flex-wrap">
            <StatusActions status={sub.status} busy={busy} onMark={handle} />
            <a href={`mailto:${sub.email}?subject=Re: Your pitch – ${sub.topic}`}>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Reply via email
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({
  sub,
  onSetStatus,
}: {
  sub: ContactSubmission;
  onSetStatus: (id: number, status: SubmissionStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle(next: SubmissionStatus) {
    setBusy(true);
    try {
      await onSetStatus(sub.id, next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`border-b last:border-b-0 ${
        sub.status === "unread" ? "" : "bg-muted/20"
      }`}
    >
      <button
        className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={sub.status} />
            <span
              className={`font-semibold text-sm ${
                sub.status === "handled" ? "text-muted-foreground" : ""
              }`}
            >
              {sub.name}
            </span>
            {sub.company && (
              <span className="text-xs text-muted-foreground">· {sub.company}</span>
            )}
            {sub.service && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {sub.service}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {sub.email}{" "}
            <span className="text-muted-foreground/60" title={formatDateTime(sub.createdAt)}>
              · {timeAgo(sub.createdAt)}
            </span>
          </div>
        </div>
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-3 text-sm bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-muted-foreground pt-2">
            <div>
              <span className="font-semibold text-foreground">Name:</span> {sub.name}
            </div>
            <div>
              <span className="font-semibold text-foreground">Email:</span>{" "}
              <a href={`mailto:${sub.email}`} className="text-[#0052FF] hover:underline">
                {sub.email}
              </a>
            </div>
            {sub.company && (
              <div>
                <span className="font-semibold text-foreground">Company:</span> {sub.company}
              </div>
            )}
            {sub.phone && (
              <div>
                <span className="font-semibold text-foreground">Phone:</span> {sub.phone}
              </div>
            )}
            {sub.website && (
              <div>
                <span className="font-semibold text-foreground">Website:</span>{" "}
                <a
                  href={sub.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0052FF] hover:underline inline-flex items-center gap-1"
                >
                  {sub.website} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {sub.budget && (
              <div>
                <span className="font-semibold text-foreground">Budget:</span> {sub.budget}
              </div>
            )}
            <div>
              <span className="font-semibold text-foreground">Received:</span>{" "}
              {formatDateTime(sub.createdAt)}
            </div>
            {sub.status === "handled" && sub.handledAt && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-foreground">Handled:</span>{" "}
                {formatDateTime(sub.handledAt)}
                {sub.handledBy && (
                  <span className="text-muted-foreground/70"> · by {sub.handledBy}</span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
              Message
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 bg-background rounded-lg border p-3">
              {sub.message}
            </p>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <StatusActions status={sub.status} busy={busy} onMark={handle} />
            <a href={`mailto:${sub.email}?subject=Re: Your enquiry`}>
              <Button size="sm" variant="outline" className="text-xs">
                Reply via email
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

interface ContentReport {
  id: number;
  contentType: string;
  contentId: string;
  contentTitle: string | null;
  contentUrl: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  inaccurate: "Inaccurate",
  inappropriate: "Inappropriate",
  copyright: "Copyright",
  broken: "Broken",
  other: "Other",
};

const REASON_COLORS: Record<string, string> = {
  spam: "bg-amber-100 text-amber-800",
  inaccurate: "bg-blue-100 text-blue-800",
  inappropriate: "bg-red-100 text-red-800",
  copyright: "bg-purple-100 text-purple-800",
  broken: "bg-slate-200 text-slate-800",
  other: "bg-slate-100 text-slate-700",
};

function ReportRow({
  report,
  onResolve,
}: {
  report: ContentReport;
  onResolve: (id: number, status: "resolved" | "dismissed", note?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"resolved" | "dismissed" | null>(null);

  async function handle(action: "resolved" | "dismissed") {
    setBusy(action);
    try {
      await onResolve(report.id, action);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-[11px] shrink-0 ${REASON_COLORS[report.reason] ?? ""}`}
            >
              {REASON_LABELS[report.reason] ?? report.reason}
            </Badge>
            <span className="font-semibold text-sm truncate">
              {report.contentTitle ?? `${report.contentType} · ${report.contentId}`}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {report.reporterEmail ?? "Anonymous"}
            {report.details && (
              <span className="text-muted-foreground/80"> · "{report.details.slice(0, 80)}{report.details.length > 80 ? "…" : ""}"</span>
            )}{" "}
            <span className="text-muted-foreground/60" title={formatDateTime(report.createdAt)}>
              · {timeAgo(report.createdAt)}
            </span>
          </div>
        </div>
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-3 text-sm bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-muted-foreground pt-2">
            <div>
              <span className="font-semibold text-foreground">Content type:</span>{" "}
              {report.contentType}
            </div>
            <div>
              <span className="font-semibold text-foreground">Reason:</span>{" "}
              {REASON_LABELS[report.reason] ?? report.reason}
            </div>
            <div>
              <span className="font-semibold text-foreground">Reporter:</span>{" "}
              {report.reporterEmail ? (
                <a href={`mailto:${report.reporterEmail}`} className="text-[#0052FF] hover:underline">
                  {report.reporterEmail}
                </a>
              ) : (
                "Anonymous"
              )}
            </div>
            <div>
              <span className="font-semibold text-foreground">Received:</span>{" "}
              {formatDateTime(report.createdAt)}
            </div>
            {report.contentUrl && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-foreground">Content URL:</span>{" "}
                <a
                  href={report.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0052FF] hover:underline inline-flex items-center gap-1 break-all"
                >
                  {report.contentUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {report.status !== "open" && report.resolvedBy && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-foreground">
                  {report.status === "resolved" ? "Resolved by:" : "Dismissed by:"}
                </span>{" "}
                {report.resolvedBy}
                {report.resolvedAt && (
                  <span className="text-muted-foreground/70">
                    {" "}· {formatDateTime(report.resolvedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
          {report.details && (
            <div>
              <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                Reporter's notes
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 bg-background rounded-lg border p-3">
                {report.details}
              </p>
            </div>
          )}
          {report.status === "open" && (
            <div className="flex gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                onClick={() => handle("resolved")}
                disabled={busy !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                data-testid={`resolve-report-${report.id}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {busy === "resolved" ? "Resolving…" : "Mark resolved"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handle("dismissed")}
                disabled={busy !== null}
                className="text-xs"
                data-testid={`dismiss-report-${report.id}`}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                {busy === "dismissed" ? "Dismissing…" : "Dismiss"}
              </Button>
              {report.contentUrl && (
                <a href={report.contentUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-xs">
                    View content <ExternalLink className="w-3 h-3 ml-1.5" />
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = "pitches" | "contacts" | "reports";
type ReportStatusFilter = "open" | "resolved" | "dismissed";

export default function AdminModeration() {
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    login,
    logout,
  } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const [tab, setTab] = useState<Tab>("pitches");
  const [pitches, setPitches] = useState<PitchSubmission[] | null>(null);
  const [contacts, setContacts] = useState<ContactSubmission[] | null>(null);
  const [reports, setReports] = useState<ContentReport[] | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({
    open: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>("open");
  const [pitchStatusFilter, setPitchStatusFilter] =
    useState<SubmissionStatusFilter>("unread");
  const [contactStatusFilter, setContactStatusFilter] =
    useState<SubmissionStatusFilter>("unread");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(which: Tab) {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (which === "pitches")
        url = `/api/admin/pitch-submissions?status=${pitchStatusFilter}`;
      else if (which === "contacts")
        url = `/api/admin/contact-submissions?status=${contactStatusFilter}`;
      else url = `/api/admin/reports?status=${reportStatusFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (which === "pitches") setPitches(json.submissions);
      else if (which === "contacts") setContacts(json.submissions);
      else {
        setReports(json.reports);
        setReportCounts(json.counts ?? { open: 0, resolved: 0, dismissed: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function setSubmissionStatus(
    kind: "pitch" | "contact",
    id: number,
    status: SubmissionStatus,
  ) {
    try {
      const url =
        kind === "pitch"
          ? `/api/admin/pitch-submissions/${id}`
          : `/api/admin/contact-submissions/${id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(
        status === "handled" ? "Marked as handled." : "Reopened — back to inbox.",
      );
      await loadData(kind === "pitch" ? "pitches" : "contacts");
    } catch (e) {
      toast.error("Couldn't update status. Please try again.");
    }
  }

  async function setPitchEditorial(
    id: number,
    data: { editorialStatus?: EditorialStatus; adminNotes?: string | null },
  ) {
    const res = await fetch(`/api/admin/pitch-submissions/${id}/editorial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setPitches((prev) =>
      prev
        ? prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  editorialStatus: data.editorialStatus ?? p.editorialStatus,
                  adminNotes:
                    "adminNotes" in data ? (data.adminNotes ?? null) : p.adminNotes,
                }
              : p,
          )
        : prev,
    );
  }

  async function resolveReport(id: number, status: "resolved" | "dismissed") {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(status === "resolved" ? "Report marked resolved." : "Report dismissed.");
      await loadData("reports");
    } catch (e) {
      toast.error("Couldn't update report. Please try again.");
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    loadData(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    reportStatusFilter,
    pitchStatusFilter,
    contactStatusFilter,
    isAuthenticated,
    isAdmin,
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin sign in required</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to view this dashboard.
            </p>
            <Button size="lg" onClick={login} className="bg-[#0052FF] hover:bg-[#0040cc]">
              Log in with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-6">
              You're signed in as{" "}
              <strong className="text-foreground">
                {user?.email ?? user?.firstName ?? "this account"}
              </strong>
              , but this account is not on the admin allowlist.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeItems =
    tab === "pitches" ? pitches : tab === "contacts" ? contacts : reports;

  const submissionFilters: SubmissionStatusFilter[] = ["unread", "handled", "all"];

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminModeration" />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to dashboard
            </Link>
            <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
              Moderation inbox
            </div>
            <h1 className="text-3xl font-bold">Moderation inbox</h1>
            <p className="text-sm text-muted-foreground">
              Guest pitches, contact enquiries, and community reports — newest first.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(tab)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b">
          <button
            onClick={() => setTab("pitches")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "pitches"
                ? "border-[#0052FF] text-[#0052FF]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Guest post pitches
            {pitches !== null && (
              <Badge
                variant="secondary"
                className={`text-[11px] ${tab === "pitches" ? "bg-[#0052FF]/10 text-[#0052FF]" : ""}`}
              >
                {pitches.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setTab("contacts")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "contacts"
                ? "border-[#0052FF] text-[#0052FF]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Contact enquiries
            {contacts !== null && (
              <Badge
                variant="secondary"
                className={`text-[11px] ${tab === "contacts" ? "bg-[#0052FF]/10 text-[#0052FF]" : ""}`}
              >
                {contacts.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "reports"
                ? "border-[#0052FF] text-[#0052FF]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-reports"
          >
            <Flag className="w-4 h-4" />
            Reports
            {reportCounts.open > 0 && (
              <Badge
                variant="secondary"
                className={`text-[11px] ${
                  tab === "reports"
                    ? "bg-red-100 text-red-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {reportCounts.open} open
              </Badge>
            )}
          </button>
        </div>

        {tab === "pitches" && (
          <div className="flex gap-1 mb-4 text-xs flex-wrap">
            {submissionFilters.map((s) => (
              <button
                key={s}
                onClick={() => setPitchStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full transition-colors capitalize ${
                  pitchStatusFilter === s
                    ? "bg-[#0052FF] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                data-testid={`pitch-filter-${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {tab === "contacts" && (
          <div className="flex gap-1 mb-4 text-xs flex-wrap">
            {submissionFilters.map((s) => (
              <button
                key={s}
                onClick={() => setContactStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full transition-colors capitalize ${
                  contactStatusFilter === s
                    ? "bg-[#0052FF] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                data-testid={`contact-filter-${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {tab === "reports" && (
          <div className="flex gap-1 mb-4 text-xs">
            {(["open", "resolved", "dismissed"] as ReportStatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setReportStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  reportStatusFilter === s
                    ? "bg-[#0052FF] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                data-testid={`report-filter-${s}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">
                  ({reportCounts[s] ?? 0})
                </span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive/50 mb-6">
            <CardContent className="pt-4 pb-4 text-sm text-destructive">
              Failed to load: {error}
            </CardContent>
          </Card>
        )}

        {loading && !activeItems && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </CardContent>
          </Card>
        )}

        {!loading && activeItems !== null && activeItems.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              {tab === "reports" ? (
                <Flag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              ) : (
                <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              )}
              <p className="text-sm text-muted-foreground">
                {tab === "pitches"
                  ? `No ${pitchStatusFilter === "all" ? "" : pitchStatusFilter + " "}pitch submissions.`
                  : tab === "contacts"
                    ? `No ${contactStatusFilter === "all" ? "" : contactStatusFilter + " "}contact enquiries.`
                    : `No ${reportStatusFilter} reports.`}
              </p>
            </CardContent>
          </Card>
        )}

        {activeItems !== null && activeItems.length > 0 && (
          <Card>
            <CardContent className="p-0">
              {tab === "pitches"
                ? (activeItems as PitchSubmission[]).map((sub) => (
                    <PitchRow
                      key={sub.id}
                      sub={sub}
                      onSetStatus={(id, status) =>
                        setSubmissionStatus("pitch", id, status)
                      }
                      onSetEditorial={setPitchEditorial}
                    />
                  ))
                : tab === "contacts"
                  ? (activeItems as ContactSubmission[]).map((sub) => (
                      <ContactRow
                        key={sub.id}
                        sub={sub}
                        onSetStatus={(id, status) =>
                          setSubmissionStatus("contact", id, status)
                        }
                      />
                    ))
                  : (activeItems as ContentReport[]).map((report) => (
                      <ReportRow
                        key={report.id}
                        report={report}
                        onResolve={resolveReport}
                      />
                    ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
