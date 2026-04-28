import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

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

interface PitchSubmission {
  id: number;
  name: string;
  email: string;
  website: string | null;
  topic: string;
  category: string | null;
  pitch: string;
  sampleUrl: string | null;
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
  createdAt: string;
}

function PitchRow({ sub }: { sub: PitchSubmission }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{sub.topic}</span>
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
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
              The Pitch
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 bg-background rounded-lg border p-3">
              {sub.pitch}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`mailto:${sub.email}?subject=Re: Your pitch – ${sub.topic}`}>
              <Button size="sm" className="bg-[#0052FF] hover:bg-[#0040cc] text-xs">
                Reply via email
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({ sub }: { sub: ContactSubmission }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{sub.name}</span>
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
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
              Message
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 bg-background rounded-lg border p-3">
              {sub.message}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`mailto:${sub.email}?subject=Re: Your enquiry`}>
              <Button size="sm" className="bg-[#0052FF] hover:bg-[#0040cc] text-xs">
                Reply via email
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

type Tab = "pitches" | "contacts";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(which: Tab) {
    setLoading(true);
    setError(null);
    try {
      const url =
        which === "pitches"
          ? "/api/admin/pitch-submissions"
          : "/api/admin/contact-submissions";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (which === "pitches") setPitches(json.submissions);
      else setContacts(json.submissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    loadData(tab);
  }, [tab, isAuthenticated, isAdmin]);

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

  const activeItems = tab === "pitches" ? pitches : contacts;

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminModeration" />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin/blog"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to admin
            </Link>
            <div className="text-xs uppercase tracking-wider text-[#0052FF] font-semibold mb-1">
              Moderation inbox
            </div>
            <h1 className="text-3xl font-bold">Submissions</h1>
            <p className="text-sm text-muted-foreground">
              Guest post pitches and contact form enquiries — newest first.
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
        </div>

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
              <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No {tab === "pitches" ? "pitch submissions" : "contact enquiries"} yet.
              </p>
            </CardContent>
          </Card>
        )}

        {activeItems !== null && activeItems.length > 0 && (
          <Card>
            <CardContent className="p-0">
              {tab === "pitches"
                ? (activeItems as PitchSubmission[]).map((sub) => (
                    <PitchRow key={sub.id} sub={sub} />
                  ))
                : (activeItems as ContactSubmission[]).map((sub) => (
                    <ContactRow key={sub.id} sub={sub} />
                  ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
