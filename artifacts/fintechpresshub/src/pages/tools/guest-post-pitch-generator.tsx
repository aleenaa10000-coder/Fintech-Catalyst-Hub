import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Send,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  RefreshCw,
  User,
  Building2,
  Globe,
  BookOpen,
  Lightbulb,
  Heart,
  SlidersHorizontal,
  Download,
  Clock,
  ChevronDown,
  Trash2,
  Mail,
  ExternalLink,
  Newspaper,
  Link2,
  Loader2,
} from "lucide-react";

const MINOR_WORDS = new Set([
  "a","an","the","and","but","or","nor","for","so","yet",
  "at","by","in","of","on","to","up","as","is","it",
]);

type Publication = {
  name: string;
  siteUrl: string;
  guestPostUrl: string;
  description: string;
  drTier: "High" | "Medium";
  tags: string[];
};

const PUBLICATIONS: Publication[] = [
  {
    name: "The Financial Brand",
    siteUrl: "https://thefinancialbrand.com",
    guestPostUrl: "https://thefinancialbrand.com/about/write-for-us/",
    description: "Retail banking, digital strategy, credit unions",
    drTier: "High",
    tags: ["banking","digital banking","credit union","retail","lending","digital","brand","marketing"],
  },
  {
    name: "Tearsheet",
    siteUrl: "https://tearsheet.co",
    guestPostUrl: "https://tearsheet.co/contact/",
    description: "Fintech, embedded finance, open banking, payments",
    drTier: "High",
    tags: ["payments","embedded finance","open banking","banking","fintech","b2b","saas","neobank"],
  },
  {
    name: "Finextra",
    siteUrl: "https://finextra.com",
    guestPostUrl: "https://www.finextra.com/communitylounge/bloglounge",
    description: "Banking technology, payments, regtech, blockchain",
    drTier: "High",
    tags: ["banking","payments","regtech","blockchain","open banking","compliance","swift","iso20022"],
  },
  {
    name: "PYMNTS",
    siteUrl: "https://pymnts.com",
    guestPostUrl: "https://www.pymnts.com/contact-us/",
    description: "Payments, digital commerce, crypto, fraud",
    drTier: "High",
    tags: ["payments","digital commerce","crypto","fraud","fintech","cards","buy now pay later","bnpl"],
  },
  {
    name: "Finovate",
    siteUrl: "https://finovate.com",
    guestPostUrl: "https://finovate.com/contact/",
    description: "Fintech innovation, AI in banking, investing",
    drTier: "High",
    tags: ["fintech","banking","ai","innovation","payments","investing","wealthtech","demo"],
  },
  {
    name: "American Banker",
    siteUrl: "https://americanbanker.com",
    guestPostUrl: "https://www.americanbanker.com/opinion",
    description: "Banking regulation, lending, compliance, fintech",
    drTier: "High",
    tags: ["banking","lending","regulation","compliance","fintech","mortgage","credit","cra"],
  },
  {
    name: "The Paypers",
    siteUrl: "https://thepaypers.com",
    guestPostUrl: "https://thepaypers.com/contribute",
    description: "Payments, e-commerce, open banking, fraud",
    drTier: "Medium",
    tags: ["payments","e-commerce","open banking","fraud","fintech","psd2","acquiring","issuing"],
  },
  {
    name: "Payments Journal",
    siteUrl: "https://paymentsjournal.com",
    guestPostUrl: "https://www.paymentsjournal.com/write-for-us/",
    description: "Payments technology, fraud, compliance, banking",
    drTier: "Medium",
    tags: ["payments","fraud","compliance","banking","cards","debit","credit","tokenisation"],
  },
  {
    name: "Fintech Futures",
    siteUrl: "https://fintechfutures.com",
    guestPostUrl: "https://www.fintechfutures.com/contact-us/",
    description: "Global fintech, banking, payments, core banking",
    drTier: "Medium",
    tags: ["fintech","banking","payments","core banking","digital","saas","cloud","api"],
  },
  {
    name: "The Block",
    siteUrl: "https://theblock.co",
    guestPostUrl: "https://www.theblock.co/contact",
    description: "Crypto, blockchain, DeFi, Web3 research",
    drTier: "Medium",
    tags: ["crypto","blockchain","defi","web3","bitcoin","ethereum","stablecoin","tokenisation","nft"],
  },
  {
    name: "Crowdfund Insider",
    siteUrl: "https://crowdfundinsider.com",
    guestPostUrl: "https://www.crowdfundinsider.com/contact/",
    description: "Crowdfunding, blockchain, crypto, alternative finance",
    drTier: "Medium",
    tags: ["crowdfunding","blockchain","crypto","investing","alternative finance","equity","defi"],
  },
  {
    name: "Insuretech Insights",
    siteUrl: "https://insurtechinsights.com",
    guestPostUrl: "https://insurtechinsights.com/contact/",
    description: "Insurtech, insurance technology, AI in insurance",
    drTier: "Medium",
    tags: ["insurtech","insurance","ai","underwriting","claims","telematics","embedded insurance"],
  },
];

function getSuggestions(topic: string): Publication[] {
  const words = topic.toLowerCase().split(/\W+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored = PUBLICATIONS.map((pub) => {
    const score = pub.tags.filter((tag) =>
      words.some((w) => tag.includes(w) || w.includes(tag.split(" ")[0]))
    ).length + (pub.drTier === "High" ? 0.5 : 0);
    return { pub, score };
  });
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ pub }) => pub);
}

const HISTORY_KEY = "fph:pitch-history";
const MAX_HISTORY = 5;

type PitchEntry = {
  id: string;
  timestamp: number;
  topic: string;
  blog: string;
  tone: Tone;
  pitch: string;
};

type StrengthLevel = "weak" | "good" | "strong" | "excellent";

const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; color: string; bar: string; tip: string }
> = {
  weak:      { label: "Weak",      color: "text-red-600",    bar: "bg-red-400",    tip: "Add your role, company, expertise, editor name, and a recent article to strengthen it." },
  good:      { label: "Good",      color: "text-amber-600",  bar: "bg-amber-400",  tip: "Fill all fields and write 100+ characters in both the Recent Article and Expertise fields to unlock a stronger rating." },
  strong:    { label: "Strong",    color: "text-blue-600",   bar: "bg-blue-500",   tip: "Almost there — expand your Recent Article and Expertise to 100+ characters each to reach Excellent." },
  excellent: { label: "Excellent", color: "text-green-600",  bar: "bg-green-500",  tip: "Your pitch is highly personalised and ready to send." },
};

function getPitchStrength(form: FormState): { score: number; level: StrengthLevel } {
  let score = 0;
  if (form.senderCompany.trim())    score++;
  if (form.senderRole.trim())       score++;
  if (form.targetEditorName.trim()) score++;
  if (form.recentArticle.trim())    score++;
  if (form.yourExpertise.trim())    score++;

  const recentArticleLong = form.recentArticle.trim().length > 100;
  const expertiseLong = form.yourExpertise.trim().length > 100;
  const bothLong = recentArticleLong && expertiseLong;

  let level: StrengthLevel;
  if (score <= 1) {
    level = "weak";
  } else if (score <= 3) {
    level = "good";
  } else if (score === 4) {
    level = bothLong ? "strong" : "good";
  } else {
    level = bothLong ? "excellent" : "good";
  }
  return { score, level };
}

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i !== 0 && MINOR_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

type Tone = "friendly" | "formal" | "direct";

type FormState = {
  senderName: string;
  senderCompany: string;
  senderRole: string;
  targetBlog: string;
  targetEditorName: string;
  proposedTopic: string;
  yourExpertise: string;
  recentArticle: string;
  tone: Tone;
};

const DEFAULTS: FormState = {
  senderName: "",
  senderCompany: "",
  senderRole: "",
  targetBlog: "",
  targetEditorName: "",
  proposedTopic: "",
  yourExpertise: "",
  recentArticle: "",
  tone: "friendly",
};

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: "friendly", label: "Friendly", description: "Warm and personable" },
  { value: "formal", label: "Formal", description: "Professional and polished" },
  { value: "direct", label: "Direct", description: "Concise and to the point" },
];

const FRIENDLY_OPENINGS = [
  (blog: string) =>
    `I've been a reader of ${blog} for a while now and genuinely appreciate the quality of fintech content you publish — it consistently hits the right balance of depth and accessibility.`,
  (blog: string) =>
    `I came across ${blog} while researching for a recent project and was genuinely impressed by the calibre of your fintech coverage — it's rare to find analysis that's both rigorous and immediately practical.`,
  (blog: string) =>
    `A colleague recommended ${blog} to me recently, and after spending time with your archive I can see why — your take on fintech consistently cuts through the noise in a way I find genuinely useful.`,
  (blog: string) =>
    `I've followed ${blog} for some time and always appreciate how you cover fintech with real depth without losing accessibility for busy practitioners.`,
];

const FORMAL_OPENINGS = [
  (blog: string) =>
    `I am writing to express my interest in contributing a guest article to ${blog}.`,
  (blog: string) =>
    `I am reaching out to propose a guest article contribution to ${blog}, whose editorial standards I hold in high regard.`,
  (blog: string) =>
    `I write to put forward a guest post proposal for ${blog}, a publication I have followed closely for its rigorous fintech coverage.`,
  (blog: string) =>
    `Having followed ${blog}'s coverage of the fintech landscape, I am writing to propose a guest article that I believe would serve your readership well.`,
];

const DIRECT_PITCHES = [
  (topic: string, blog: string) =>
    `I'd like to pitch a guest post on "${topic}" for ${blog}. It's a challenge fintech teams are actively navigating — your audience would find it directly useful.`,
  (topic: string, blog: string) =>
    `I'm pitching "${topic}" for ${blog}. It's timely, practical, and directly relevant to what your readers are working through right now.`,
  (topic: string, blog: string) =>
    `Guest post idea for ${blog}: "${topic}". Fintech teams are grappling with this right now — the piece gives them a clear, actionable framework.`,
  (topic: string, blog: string) =>
    `Here's my pitch for ${blog}: "${topic}". This is a challenge your readers are actively navigating — I can give them a practical playbook.`,
];

function buildPitch(form: FormState, variation: number = 0): string {
  const {
    senderName,
    senderCompany,
    senderRole,
    targetBlog,
    targetEditorName,
    proposedTopic,
    yourExpertise,
    recentArticle,
    tone,
  } = form;

  const rawEditor = targetEditorName.trim();
  const firstName = rawEditor ? rawEditor.split(/\s+/)[0] : "";
  const informalGreeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const formalGreeting = firstName ? `Dear ${firstName},` : "Hi there,";
  const name = senderName.trim() || "Your Name";
  const company = senderCompany.trim() || "Your Company";
  const role = senderRole.trim() || "content lead";
  const blog = targetBlog.trim() || "your publication";
  const topic = proposedTopic.trim() || "a topic in fintech";
  const subject = `Guest Post Proposal: ${toTitleCase(topic)} | ${toTitleCase(name)}`;
  const expertise =
    yourExpertise.trim() || "fintech content strategy and SEO growth";
  const article = recentArticle.trim();

  const articleSentence = article
    ? `I particularly enjoyed your recent piece on ${article}, which prompted me to reach out with this related idea.`
    : "";

  const idx = Math.abs(variation) % 4;

  if (tone === "formal") {
    const openingLine = `${FORMAL_OPENINGS[idx](blog)}${articleSentence ? " " + articleSentence : ""}`;
    return `Subject: ${subject}

${formalGreeting}

My name is ${name}, ${role} at ${company}. ${openingLine}

I would like to propose an article on the topic of "${topic}". Given the rigorous editorial standards of ${blog}, I believe this subject would provide genuine value to your readership and aligns with the calibre of content you consistently publish.

Regarding my background: ${expertise}. My work is grounded in practical experience and would include substantiated examples, data-driven insights, and actionable guidance.

The proposed article would be:
- Approximately 1,200–1,800 words
- Entirely original and not published or submitted elsewhere
- Optimised for readability without compromising analytical depth
- Delivered within 2–3 business days of acceptance

I would welcome the opportunity to provide an outline for your review prior to submitting a full draft, or to proceed directly as you prefer.

Thank you for your consideration. I look forward to your response.

Yours sincerely,
${name}
${role}, ${company}`;
  }

  if (tone === "direct") {
    const articleLine = articleSentence ? `\n\n${articleSentence}` : "";
    const pitchLine = DIRECT_PITCHES[idx](topic, blog);
    return `Subject: ${subject}

${informalGreeting}

I'm ${name}, ${role} at ${company}.${articleLine}

${pitchLine}

My background: ${expertise}. The piece would be practical, not theoretical — real examples, actionable takeaways, original data where possible.

Specs:
- 1,200–1,800 words
- 100% original
- Ready within 2–3 days of a green light

Prefer an outline first, or a full draft? Either works for me.

Best,
${name}
${role}, ${company}`;
  }

  const readerOpening = FRIENDLY_OPENINGS[idx](blog);
  const introLine = `My name is ${name}, ${role} at ${company}. ${readerOpening}${articleSentence ? " " + articleSentence : ""}`;

  return `Subject: ${subject}

${informalGreeting}

${introLine}

I'd love to contribute a guest post on the topic of "${topic}". I think it would resonate strongly with your audience because it addresses a challenge that most fintech teams are actively navigating right now.

A bit about my background: ${expertise}. I write from hands-on experience, not theory — so the piece would include real examples, actionable takeaways, and original data where possible.

The draft would be:
- Approximately 1,200–1,800 words
- Fully original (not published or submitted elsewhere)
- Optimised for readability without sacrificing depth
- Ready within 2–3 days of acceptance

Would you be open to a quick outline first, or would you prefer I send a full draft? Happy to work to your editorial guidelines and tone.

Thanks for your time — I look forward to hearing from you.

Best,
${name}
${role}, ${company}`;
}

function loadHistory(): PitchEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as PitchEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: PitchEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function GuestPostPitchGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [pitch, setPitch] = useState("");
  const [editedPitch, setEditedPitch] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedPreviewSubject, setCopiedPreviewSubject] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [variation, setVariation] = useState(0);
  const [pitchWordDelta, setPitchWordDelta] = useState<number | null>(null);
  const [history, setHistory] = useState<PitchEntry[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [targetBlogHighlighted, setTargetBlogHighlighted] = useState(false);
  const pitchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const targetBlogInputRef = useRef<HTMLInputElement>(null);

  function selectPublication(name: string) {
    setForm((prev) => ({ ...prev, targetBlog: name }));
    const el = targetBlogInputRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTargetBlogHighlighted(true);
      setTimeout(() => setTargetBlogHighlighted(false), 1400);
    }
  }

  async function fetchTitleFromUrl(url: string) {
    setUrlFetching(true);
    setUrlError(null);
    try {
      const resp = await fetch(
        `/api/tools/fetch-title?url=${encodeURIComponent(url)}`,
        { credentials: "include" },
      );
      const data = await resp.json() as { title?: string; error?: string };
      if (!resp.ok || !data.title) {
        setUrlError(data.error ?? "Couldn't fetch a title from that URL.");
      } else {
        setForm((prev) => ({ ...prev, recentArticle: data.title! }));
        setUrlError(null);
      }
    } catch {
      setUrlError("Network error — couldn't reach the page.");
    } finally {
      setUrlFetching(false);
    }
  }

  useEffect(() => {
    const el = pitchTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editedPitch]);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setTone = (value: Tone) =>
    setForm((prev) => ({ ...prev, tone: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setPitch("");
    setEditedPitch("");
    setGenerated(false);
    setVariation(0);
    setPitchWordDelta(null);
  };

  const generate = () => {
    const nextVariation = 0;
    setVariation(nextVariation);
    const result = buildPitch(form, nextVariation);
    setPitch(result);
    setEditedPitch(result);
    setGenerated(true);
    setPitchWordDelta(null);
    const entry: PitchEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      topic: form.proposedTopic.trim() || "a topic in fintech",
      blog: form.targetBlog.trim() || "your publication",
      tone: form.tone,
      pitch: result,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  const regenerate = () => {
    const nextVariation = variation + 1;
    setVariation(nextVariation);
    const prevWords = editedPitch.trim() ? editedPitch.trim().split(/\s+/).length : 0;
    const result = buildPitch(form, nextVariation);
    const newWords = result.trim() ? result.trim().split(/\s+/).length : 0;
    setPitchWordDelta(newWords - prevWords);
    setPitch(result);
    setEditedPitch(result);
    const entry: PitchEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      topic: form.proposedTopic.trim() || "a topic in fintech",
      blog: form.targetBlog.trim() || "your publication",
      tone: form.tone,
      pitch: result,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  const copy = () => {
    navigator.clipboard.writeText(editedPitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([editedPitch], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-post-pitch.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const mailtoHref = (() => {
    const firstLine = editedPitch.split("\n")[0] ?? "";
    const subject = firstLine.startsWith("Subject: ")
      ? firstLine.slice("Subject: ".length).trim()
      : firstLine.trim();
    const body = editedPitch.split("\n").slice(2).join("\n").trim();
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  const gmailHref = (() => {
    const firstLine = editedPitch.split("\n")[0] ?? "";
    const subject = firstLine.startsWith("Subject: ")
      ? firstLine.slice("Subject: ".length).trim()
      : firstLine.trim();
    const body = editedPitch.split("\n").slice(2).join("\n").trim();
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  const canGenerate =
    form.senderName.trim().length > 0 &&
    form.targetBlog.trim().length > 0 &&
    form.proposedTopic.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="guestPostPitchGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Guest Post Pitch Generator"
        description="Create a compelling, personalised pitch email for any fintech publication in seconds. Fill in a few details and get a ready-to-send draft you can refine and copy."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All free tools
            </Link>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Recent Pitches
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">
                  {history.length}
                </span>
              </button>
            )}
          </div>

          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Send className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Your Details
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Fields marked * are required.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    Your Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Alex Johnson"
                    value={form.senderName}
                    onChange={setField("senderName")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    Your Company
                  </Label>
                  <Input
                    placeholder="PayFlow Inc."
                    value={form.senderCompany}
                    onChange={setField("senderCompany")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    Your Role / Title
                  </Label>
                  <Input
                    placeholder="Head of Content"
                    value={form.senderRole}
                    onChange={setField("senderRole")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    Target Publication <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={targetBlogInputRef}
                    placeholder="Fintech Magazine"
                    value={form.targetBlog}
                    onChange={setField("targetBlog")}
                    className={`h-11 transition-all duration-300 ${
                      targetBlogHighlighted
                        ? "ring-2 ring-orange-400 border-orange-400 bg-orange-50"
                        : ""
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    Editor's Name (if known)
                  </Label>
                  <Input
                    placeholder="Sarah Chen"
                    value={form.targetEditorName}
                    onChange={setField("targetEditorName")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Defaults to "Hi there," if left blank. First name only if a full name is entered.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-orange-600" />
                    Proposed Article Topic <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="How AI is reshaping credit scoring in 2025"
                    value={form.proposedTopic}
                    onChange={setField("proposedTopic")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-orange-600" />
                      Recent Article You Liked
                    </Label>
                    <button
                      type="button"
                      disabled={urlFetching}
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (isUrl(text)) {
                            await fetchTitleFromUrl(text);
                          } else {
                            setUrlError("Clipboard doesn't contain a URL. Copy a link first.");
                          }
                        } catch {
                          setUrlError("Couldn't read clipboard. Paste the URL directly into the field.");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 bg-orange-50 hover:bg-orange-100 rounded px-2 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {urlFetching ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Link2 className="w-3 h-3" />
                      )}
                      Paste from URL
                    </button>
                  </div>
                  <Input
                    placeholder="e.g., Your recent piece on Neobank regulation"
                    value={form.recentArticle}
                    onChange={(e) => {
                      setUrlError(null);
                      setField("recentArticle")(e);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      if (isUrl(pasted)) {
                        e.preventDefault();
                        void fetchTitleFromUrl(pasted);
                      }
                    }}
                    className="h-11"
                    disabled={urlFetching}
                  />
                  {urlError ? (
                    <p className="text-[11px] text-red-600 leading-snug">{urlError}</p>
                  ) : urlFetching ? (
                    <p className="text-[11px] text-orange-600 leading-snug">Fetching page title…</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Paste a URL and the title will be auto-filled — or type it directly. A personalised sentence referencing this article will be added to the opening paragraph.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-orange-600" />
                    Your Relevant Expertise
                  </Label>
                  <Textarea
                    placeholder="5 years building embedded finance products at two YC-backed startups, with bylines in The Financial Brand and Tearsheet."
                    value={form.yourExpertise}
                    onChange={setField("yourExpertise")}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is your credibility hook — be specific.
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                    Tone
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTone(opt.value)}
                        className={`rounded-lg border px-4 py-3 text-left transition-all ${
                          form.tone === opt.value
                            ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`block text-sm font-semibold ${form.tone === opt.value ? "text-orange-700" : "text-slate-700"}`}>
                          {opt.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(() => {
                const { score, level } = getPitchStrength(form);
                const cfg = STRENGTH_CONFIG[level];
                const pct = Math.round((score / 5) * 100);
                return (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Pitch Strength
                      </span>
                      <span className={`text-sm font-bold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {cfg.tip}
                    </p>
                  </div>
                );
              })()}

              {canGenerate && (() => {
                const preview = buildPitch(form, 0);
                const lines = preview.split("\n").filter(Boolean);
                const subjectLine = lines[0] ?? "";
                const subjectText = subjectLine.startsWith("Subject: ")
                  ? subjectLine.slice("Subject: ".length).trim()
                  : subjectLine.trim();
                const openingLines = lines.slice(1, 4).join(" ").replace(/\s+/g, " ").trim();
                const truncated = openingLines.length > 200 ? openingLines.slice(0, 200) + "…" : openingLines;
                return (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Live Preview
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 leading-snug flex-1">{subjectLine}</p>
                      {subjectText && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(subjectText);
                            setCopiedPreviewSubject(true);
                            setTimeout(() => setCopiedPreviewSubject(false), 2000);
                          }}
                          className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700"
                        >
                          {copiedPreviewSubject ? (
                            <><Check className="w-3 h-3 text-green-500" /><span className="text-green-600">Copied</span></>
                          ) : (
                            <><Copy className="w-3 h-3" />Copy Subject</>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{truncated}</p>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Button
                  onClick={generate}
                  disabled={!canGenerate}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Pitch Email
                </Button>
                {generated && (
                  <Button
                    onClick={regenerate}
                    disabled={!canGenerate}
                    variant="outline"
                    className="h-11 px-4 font-semibold border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
                    title="Get a fresh opening angle on the same inputs"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                    {pitchWordDelta !== null && (
                      <span className="ml-2 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 leading-none">
                        {pitchWordDelta === 0 ? "~same" : pitchWordDelta > 0 ? `+${pitchWordDelta}w` : `${pitchWordDelta}w`}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-800 leading-relaxed">
                  💡 <span className="font-semibold">Pro Tip:</span> 70% of guest posts are rejected due to poor site authority. Want us to handle the outreach to high-DR sites for you?{" "}
                  <Link
                    href="/services"
                    className="font-semibold underline underline-offset-2 hover:text-blue-900"
                  >
                    See our services
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence>
            {form.proposedTopic.trim().length > 1 && (() => {
              const suggestions = getSuggestions(form.proposedTopic);
              if (suggestions.length === 0) return null;
              return (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Newspaper className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                      Suggested Publications
                    </h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((pub) => {
                      const isSelected = form.targetBlog === pub.name;
                      return (
                        <div
                          key={pub.name}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectPublication(pub.name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectPublication(pub.name);
                            }
                          }}
                          className={`relative flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                            isSelected
                              ? "border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-400"
                              : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                          <div className="flex items-start justify-between gap-2 pr-6">
                            <span className={`text-sm font-semibold truncate ${isSelected ? "text-orange-700" : "text-slate-800"}`}>
                              {pub.name}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 ${
                              pub.drTier === "High"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              DR {pub.drTier}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-snug ${isSelected ? "text-orange-800/70" : "text-muted-foreground"}`}>
                            {pub.description}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className={`text-[11px] font-semibold ${isSelected ? "text-orange-600" : "text-slate-400"}`}>
                              {isSelected ? "✓ Selected as target" : "Click to select"}
                            </span>
                            <a
                              href={pub.guestPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-orange-600 transition-colors"
                            >
                              Guidelines
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {generated && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Your Pitch — edit before sending
                </h3>

                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    {(() => {
                      const firstLine = editedPitch.split("\n")[0] ?? "";
                      const subjectText = firstLine.startsWith("Subject: ")
                        ? firstLine.slice("Subject: ".length).trim()
                        : firstLine.trim();
                      const copySubject = () => {
                        navigator.clipboard.writeText(subjectText);
                        setCopiedSubject(true);
                        setTimeout(() => setCopiedSubject(false), 2000);
                      };
                      return subjectText ? (
                        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-widest shrink-0">
                            Subject
                          </span>
                          <span className="text-sm font-medium text-indigo-900 leading-snug break-words min-w-0 flex-1">
                            {subjectText}
                          </span>
                          <button
                            type="button"
                            onClick={copySubject}
                            aria-label="Copy subject line"
                            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-colors border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300"
                          >
                            {copiedSubject ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy subject</>
                            )}
                          </button>
                        </div>
                      ) : null;
                    })()}
                    <Textarea
                      ref={pitchTextareaRef}
                      value={editedPitch}
                      onChange={(e) => setEditedPitch(e.target.value)}
                      className="text-sm font-sans resize-none overflow-hidden leading-relaxed"
                      style={{ minHeight: "200px" }}
                    />
                    {(() => {
                      const words = editedPitch.trim() ? editedPitch.trim().split(/\s+/).length : 0;
                      const readSec = Math.round((words / 238) * 60);
                      const readMin = Math.floor(readSec / 60);
                      const readRemSec = readSec % 60;
                      const readLabel = readMin > 0
                        ? `~${readMin}m ${readRemSec > 0 ? `${readRemSec}s` : ""}read`
                        : `~${readSec}s read`;
                      const overLimit = words > 250;
                      const nearLimit = !overLimit && words >= 200;
                      return (
                        <div className="space-y-1.5">
                          <p className={`text-xs text-right -mt-1 font-medium ${
                            overLimit ? "text-amber-600" : nearLimit ? "text-amber-500" : "text-muted-foreground"
                          }`}>
                            {words} words · {readLabel}
                            {overLimit && ` · ${words - 250} over recommended`}
                          </p>
                          {overLimit && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                              <span className="text-lg leading-none mt-0.5 shrink-0">💡</span>
                              <p className="text-xs text-amber-800 leading-snug">
                                <span className="font-semibold">Optimization Tip:</span> Your pitch is {words} words. Editors prefer pitches under 250 words for quicker reading. Consider trimming the expertise section for better results.
                              </p>
                            </div>
                          )}
                          {nearLimit && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                              <span className="text-lg leading-none mt-0.5 shrink-0">💡</span>
                              <p className="text-xs text-amber-800 leading-snug">
                                <span className="font-semibold">Optimization Note:</span> You're approaching the 250-word recommended limit. Consider tightening the opening paragraph to keep editors engaged.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex gap-2">
                      <Button
                        onClick={copy}
                        className={`flex-1 h-11 font-semibold transition-all duration-200 ${
                          copied
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to clipboard
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={download}
                        variant="outline"
                        className="h-11 px-4 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download .txt
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 px-4 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <a href={gmailHref} target="_blank" rel="noopener noreferrer">
                          <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="currentColor"/>
                          </svg>
                          Open in Gmail
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-orange-100 bg-orange-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-orange-800 leading-relaxed">
                      Want a done-for-you guest posting campaign?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-orange-900"
                      >
                        See our link building services
                      </Link>{" "}
                      for fintech brands.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <SheetTitle className="flex items-center gap-2 text-slate-900">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Recent Pitches
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">
                    {history.length}
                  </span>
                </SheetTitle>
                <p className="text-[12px] text-muted-foreground">
                  Last {history.length} generated pitch{history.length !== 1 ? "es" : ""}. Click Restore to load one back into the editor.
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {history.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {toTitleCase(entry.topic)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {entry.blog} · <span className="capitalize">{entry.tone}</span> · {timeAgo(entry.timestamp)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                        #{history.length - i}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {entry.pitch.split("\n").filter(Boolean).slice(1, 3).join(" ")}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => {
                          setEditedPitch(entry.pitch);
                          setGenerated(true);
                          setHistoryOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                        Restore
                      </Button>
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                        onClick={() =>
                          setHistory((prev) => {
                            const next = prev.filter((e) => e.id !== entry.id);
                            saveHistory(next);
                            return next;
                          })
                        }
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {history.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100">
                  <button
                    type="button"
                    className="w-full text-center text-[11px] text-muted-foreground hover:text-red-500 py-1 transition-colors"
                    onClick={() => {
                      saveHistory([]);
                      setHistory([]);
                      setHistoryOpen(false);
                    }}
                  >
                    Clear all history
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </section>
    </div>
  );
}
