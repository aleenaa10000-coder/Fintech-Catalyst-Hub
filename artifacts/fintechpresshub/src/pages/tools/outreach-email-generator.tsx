import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Mail,
  Briefcase,
  MessageCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Zap,
  ClipboardCheck,
  Clock,
  Trash2,
  ArrowLeftRight,
  Download,
  CalendarDays,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "professional" | "conversational" | "data-led";

type FormState = {
  targetDomain: string;
  yourName: string;
  yourCompany: string;
  yourWebsite: string;
  contentPitch: string;
  topic: string;
  linkValueMin: string;
  linkValueMax: string;
};

const DEFAULTS: FormState = {
  targetDomain: "",
  yourName: "",
  yourCompany: "",
  yourWebsite: "",
  contentPitch: "",
  topic: "",
  linkValueMin: "",
  linkValueMax: "",
};

type SubjectScore = {
  length: number;     // 0–25
  powerWords: number; // 0–25
  personal: number;   // 0–25
  curiosity: number;  // 0–25
  total: number;      // 0–100
};

type EmailEntry = {
  id: string;
  timestamp: number;
  targetDomain: string;
  topic: string;
  tone: Tone;
  subject: string;
  body: string;
  form: FormState;
};

type FollowUpEmail = {
  day: number;
  label: string;
  subject: string;
  body: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "fph:outreach-history";
const MAX_HISTORY = 5;

const TONES: { id: Tone; label: string; sublabel: string; icon: typeof Mail }[] = [
  { id: "professional",   label: "Professional",   sublabel: "Formal, confident, agency-style",  icon: Briefcase      },
  { id: "conversational", label: "Conversational", sublabel: "Warm, human, relationship-first",  icon: MessageCircle  },
  { id: "data-led",       label: "Data-Led",       sublabel: "Metric-driven, value-first pitch", icon: BarChart2      },
];

const TONE_COLORS: Record<Tone, { ring: string; bg: string; text: string; icon: string; bar: string }> = {
  professional:    { ring: "border-blue-400",    bg: "bg-blue-50",    text: "text-blue-700",    icon: "text-blue-500",    bar: "bg-blue-500"    },
  conversational:  { ring: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", bar: "bg-emerald-500" },
  "data-led":      { ring: "border-violet-400",  bg: "bg-violet-50",  text: "text-violet-700",  icon: "text-violet-500",  bar: "bg-violet-500"  },
};

const POWER_WORDS = [
  "exclusive", "proven", "free", "new", "introducing", "important", "guarantee",
  "opportunity", "resource", "partnership", "discover", "insider", "results",
  "guide", "report", "data", "expert", "featured", "complete", "your", "you",
  "instantly", "today", "now", "how", "why", "announcement",
];

const SCORE_DIMS: { key: keyof SubjectScore; label: string; tip: string }[] = [
  { key: "length",     label: "Length",         tip: "Optimal: 40–60 characters" },
  { key: "powerWords", label: "Power words",    tip: "High-impact vocabulary" },
  { key: "personal",   label: "Personalisation", tip: "Contains recipient's brand name" },
  { key: "curiosity",  label: "Curiosity gap",  tip: "Creates intrigue or tension" },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function fmtDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function siteName(domain: string): string {
  const d = fmtDomain(domain);
  return capitalize(d.split(".")[0]);
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function loadHistory(): EmailEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as EmailEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: EmailEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function scoreSubjectLine(subject: string, domain: string): SubjectScore {
  const lower = subject.toLowerCase();
  const site   = siteName(domain).toLowerCase();
  const domainBase = fmtDomain(domain).split(".")[0].toLowerCase();

  // Length score (optimal 40–60)
  const len = subject.length;
  let lengthScore: number;
  if (len >= 40 && len <= 60)      lengthScore = 25;
  else if (len >= 30 && len < 40)  lengthScore = 18;
  else if (len > 60 && len <= 75)  lengthScore = 15;
  else if (len > 75 && len <= 90)  lengthScore = 8;
  else if (len < 30 && len >= 20)  lengthScore = 10;
  else                             lengthScore = 4;

  // Power word score (each unique hit = 8 pts, capped at 25)
  const found = POWER_WORDS.filter((w) => lower.includes(w));
  const powerScore = Math.min(25, found.length * 8);

  // Personalisation: site name or domain base appears in subject
  const hasPersonal = lower.includes(site) || lower.includes(domainBase);
  const personalScore = hasPersonal ? 25 : 0;

  // Curiosity gap: ?, em-dash, colon, numbers, brackets, contrast words
  let curiositySignals = 0;
  if (/\?/.test(subject))                                   curiositySignals += 10;
  if (/[—:]/.test(subject))                                 curiositySignals += 8;
  if (/\d/.test(subject))                                   curiositySignals += 7;
  if (/\bvs\.?\b|\bbut\b|\byet\b|\bsurprise\b/.test(lower)) curiositySignals += 5;
  if (/\[.*\]/.test(subject))                               curiositySignals += 5;
  const curiosityScore = Math.min(25, curiositySignals);

  return {
    length:     lengthScore,
    powerWords: powerScore,
    personal:   personalScore,
    curiosity:  curiosityScore,
    total:      lengthScore + powerScore + personalScore + curiosityScore,
  };
}

function generateSubjectVariants(form: FormState, tone: Tone): [string, string] {
  const domain  = fmtDomain(form.targetDomain) || "yourtargetsite.com";
  const company = form.yourCompany.trim() || "Your Company";
  const topic   = form.topic.trim() || "digital marketing";
  const site    = siteName(domain);
  const hasValue = form.linkValueMin && form.linkValueMax;
  const valueRange = hasValue ? `$${form.linkValueMin}–$${form.linkValueMax}` : null;

  if (tone === "professional") {
    return [
      `Content partnership opportunity — ${company} × ${site}`,
      `${site}: a ${topic} resource your readers will thank you for`,
    ];
  }
  if (tone === "conversational") {
    return [
      `Quick question about ${site}'s ${topic} coverage`,
      `Thought you'd want to see this — new ${topic} content for ${site}'s audience`,
    ];
  }
  // data-led
  return [
    valueRange
      ? `${capitalize(topic)} resource for ${site} — estimated SEO value ${valueRange}`
      : `${capitalize(topic)} resource for ${site} — worth a look`,
    `How ${site} can close its ${topic} content gap with one addition`,
  ];
}

function generateEmailBody(form: FormState, tone: Tone, subject: string): string {
  const domain  = fmtDomain(form.targetDomain) || "yourtargetsite.com";
  const name    = form.yourName.trim() || "Your Name";
  const company = form.yourCompany.trim() || "Your Company";
  const website = fmtDomain(form.yourWebsite) || "yourwebsite.com";
  const pitch   = form.contentPitch.trim() || "our recent in-depth guide on this topic";
  const topic   = form.topic.trim() || "digital marketing";
  const site    = siteName(domain);
  const hasValue = form.linkValueMin && form.linkValueMax;
  const valueRange = hasValue ? `$${form.linkValueMin}–$${form.linkValueMax}` : "a high-authority link placement";

  if (tone === "professional") {
    return `Hi ${site} team,

I'm ${name} from ${company} (${website}). I came across ${domain} while researching ${topic} resources for digital professionals, and your coverage stood out.

We've recently published ${pitch} — it covers ${topic} in a way I believe your readers would find genuinely useful as a follow-on resource.

I'd love to explore a content partnership: a guest contribution, editorial mention, or resource page link. The piece would complement your existing ${topic} content and add real depth for your audience.

I'm happy to share the full piece for your review before you make any decision — no commitment required.

Would you have 15 minutes this week for a quick call, or would email work better?

Best regards,
${name}
${company}
${website}`;
  }

  if (tone === "conversational") {
    return `Hey ${site} team,

Huge fan of the work you're doing over at ${domain} — your ${topic} content is genuinely some of the best in the space.

I'm ${name} from ${company} (${website}), and we've just published ${pitch}.

I think it could be a great fit as a reference or next-step resource for your readers — especially anyone looking to go deeper on ${topic} after reading your content.

Would love to explore whether there's a natural home for it in your existing pieces. No pressure at all — just wanted to put it on your radar.

If it's not a fit, completely understood. Either way, keep up the great work!

Cheers,
${name}
${company} · ${website}`;
  }

  return `Hi ${site} team,

I'm ${name}, ${topic} content lead at ${company} (${website}).

I'm reaching out because ${domain} ranks well for ${topic} content, and I believe we've published something that could meaningfully strengthen your existing coverage.

${company} has recently published ${pitch}. It fills a specific gap in the current ${topic} content landscape — covering angles and data points that your readers are actively searching for.

${hasValue
  ? `Based on your domain authority and traffic profile, a link from your ${topic} content is estimated to be worth ${valueRange} in organic authority to our campaign — which gives you a sense of how seriously we're approaching this outreach.`
  : `We've been selective with our outreach, and your site is one of a small number we've identified as a genuinely strong fit.`}

I can share the full resource for your review immediately. If it's a good fit, I'm flexible on format — guest post, resource page mention, or editorial inclusion.

Would a 15-minute call this week work to discuss? I'm also happy to keep this to email if that's easier.

Best,
${name}
${company}
${website}`;
}

function generateFollowUpSequence(form: FormState, tone: Tone, originalSubject: string): FollowUpEmail[] {
  const domain  = fmtDomain(form.targetDomain) || "yourtargetsite.com";
  const name    = form.yourName.trim() || "Your Name";
  const company = form.yourCompany.trim() || "Your Company";
  const website = fmtDomain(form.yourWebsite) || "yourwebsite.com";
  const topic   = form.topic.trim() || "digital marketing";
  const site    = siteName(domain);

  if (tone === "professional") {
    return [
      {
        day: 3,
        label: "Day 3 — Polite bump",
        subject: `Re: ${originalSubject}`,
        body: `Hi ${site} team,

I wanted to follow up on my email from a couple of days ago regarding a content partnership opportunity.

I know editorial inboxes are busy, so I'll keep this brief: we believe the resource we mentioned would add real depth to your ${topic} coverage and is a genuinely strong fit for your readers.

If it's easier, I'm happy to send a direct link to the piece so you can review it at your own pace — no commitment required.

Best regards,
${name}
${company}`,
      },
      {
        day: 7,
        label: "Day 7 — Add value",
        subject: `One more thought on ${topic} for ${site}`,
        body: `Hi ${site} team,

I wanted to share one more thought before I wrap up my outreach.

Since my last email, I noticed a gap in the current ${topic} content landscape that our resource addresses directly — specifically around [key angle from your piece]. Given ${domain}'s position in this space, it feels like a natural extension of what you're already publishing.

I'd be happy to tailor a section of the content to better align with your audience's needs, or explore a guest contribution format if that works better for your editorial calendar.

Would it be worth a quick 10-minute call to explore?

Best,
${name}
${company}
${website}`,
      },
      {
        day: 14,
        label: "Day 14 — Final nudge",
        subject: `Last one from me — ${company} + ${site}`,
        body: `Hi ${site} team,

I'll keep this short — I promise this is my last email on this.

If the timing isn't right or the fit isn't there, I completely understand. If things change or you're revisiting your content calendar in the future, I'd love to reconnect.

On the off chance this landed in the wrong inbox — I've been reaching out about a ${topic} resource we think your readers would genuinely value. Happy to forward the details if useful.

Either way, best of luck with everything at ${domain}. It's a great resource.

Warmly,
${name}
${company}`,
      },
    ];
  }

  if (tone === "conversational") {
    return [
      {
        day: 3,
        label: "Day 3 — Friendly check-in",
        subject: `Re: ${originalSubject}`,
        body: `Hey ${site} team,

Just floating this back to the top of your inbox in case it got buried!

No pressure at all — just wanted to make sure you had a chance to see my note about the ${topic} content we've published. I think it could be a really natural fit for your audience.

Happy to share more details or the piece itself whenever suits you.

Cheers,
${name}`,
      },
      {
        day: 7,
        label: "Day 7 — Offer something new",
        subject: `Thought of something else for ${site}'s ${topic} readers`,
        body: `Hey ${site} team,

I had another thought since my last note.

Beyond the piece I mentioned, we've also been working on [related content or data point] that might be interesting for your ${topic} coverage specifically. I'd be happy to share that too — no strings attached.

I genuinely think there's something here worth exploring together. Even a quick 10-minute chat could be worthwhile!

Cheers,
${name}
${company} · ${website}`,
      },
      {
        day: 14,
        label: "Day 14 — Sign off warmly",
        subject: `Signing off — but keeping the door open 👋`,
        body: `Hey ${site} team,

Last one from me, I promise!

If the timing's not right, no worries at all. I'll leave it here and hope our paths cross again down the line.

If something shifts and you want to chat about ${topic} content collaboration, you know where to find me.

Keep up the great work — ${domain} is genuinely one of my favourite resources in this space.

All the best,
${name}
${company}`,
      },
    ];
  }

  // data-led
  return [
    {
      day: 3,
      label: "Day 3 — Re-surface with data",
      subject: `Re: ${originalSubject}`,
      body: `Hi ${site} team,

Following up on my previous email regarding a ${topic} content opportunity.

To add a bit more context: the resource I mentioned has been performing well in search — ranking for [relevant keyword cluster] and attracting the exact audience segment your readers likely overlap with.

I can share the full performance data if it's helpful. It would give you a clearer picture of the referral quality a link placement could generate.

Worth a quick conversation?

Best,
${name}
${company}`,
    },
    {
      day: 7,
      label: "Day 7 — Sharpen the value case",
      subject: `${site}: the ${topic} content gap worth closing`,
      body: `Hi ${site} team,

One more thought on our ${topic} resource.

After reviewing your current coverage more carefully, I noticed that [specific angle] isn't addressed anywhere in your existing ${topic} content — it's a gap that search data confirms your audience is actively looking for.

Our resource fills that exact gap. A mention or link would strengthen your coverage and provide your readers with a clear next step.

I'd love to walk you through the numbers if you have 10 minutes.

Best,
${name}
${company}
${website}`,
    },
    {
      day: 14,
      label: "Day 14 — Final value close",
      subject: `Closing the loop — ${company} + ${site}`,
      body: `Hi ${site} team,

This will be my last email — I want to respect your time.

I'll leave you with one final thought: the ${topic} content gap we identified on ${domain} is one that your competitors are increasingly covering. A single resource link now could meaningfully reinforce your authority in this space before the window closes.

If the opportunity becomes relevant in the future, I'd genuinely welcome the conversation. My details are below.

Thank you for your time.

Best,
${name}
${company}
${website}`,
    },
  ];
}

function parseParams(): Partial<FormState> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FormState> = {};
  const td    = params.get("targetDomain");
  const lmin  = params.get("linkValueMin");
  const lmax  = params.get("linkValueMax");
  const topic = params.get("topic");
  if (td)    result.targetDomain = td;
  if (lmin)  result.linkValueMin = lmin;
  if (lmax)  result.linkValueMax = lmax;
  if (topic) result.topic = topic;
  return result;
}

// ─── Sub-component: score bar ─────────────────────────────────────────────────

function ScoreDimBar({
  label, score, max = 25, bar, tip,
}: {
  label: string; score: number; max?: number; bar: string; tip: string;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div title={tip}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-[9px] font-bold text-slate-600">{score}/{max}</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: A/B subject tester ────────────────────────────────────────

function SubjectABTester({
  variants,
  scores,
  selectedIdx,
  onSelect,
  tone,
  targetDomain,
}: {
  variants: [string, string];
  scores: [SubjectScore, SubjectScore];
  selectedIdx: 0 | 1;
  onSelect: (idx: 0 | 1) => void;
  tone: Tone;
  targetDomain: string;
}) {
  const colors = TONE_COLORS[tone];
  const [copiedIdx, setCopiedIdx] = useState<0 | 1 | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const winnerIdx = scores[0].total >= scores[1].total ? 0 : 1;

  const copy = async (idx: 0 | 1) => {
    try { await navigator.clipboard.writeText(variants[idx]); }
    catch {
      const el = document.createElement("textarea");
      el.value = variants[idx];
      document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopiedIdx(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedIdx(null), 2000);
  };

  const scoreDiff = Math.abs(scores[0].total - scores[1].total);

  return (
    <Card className="border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-amber-900">A/B Subject Line Tester</h4>
          <p className="text-[10px] text-amber-700 leading-snug">
            Scored on length, power words, personalisation &amp; curiosity gap.{" "}
            {scoreDiff > 0 ? (
              <span className="font-semibold">Variant {winnerIdx === 0 ? "A" : "B"} leads by {scoreDiff} pts.</span>
            ) : (
              <span className="font-semibold">Both variants tied.</span>
            )}
          </p>
        </div>
      </div>

      <CardContent className="p-4 grid sm:grid-cols-2 gap-3">
        {([0, 1] as const).map((idx) => {
          const isWinner  = idx === winnerIdx && scoreDiff > 0;
          const isSelected = idx === selectedIdx;
          const score = scores[idx];

          return (
            <motion.div
              key={idx}
              layout
              className={`relative rounded-xl border-2 p-3.5 transition-all cursor-pointer ${
                isSelected
                  ? `${colors.ring} ${colors.bg}`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => onSelect(idx)}
            >
              {/* Labels row */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  isSelected ? `${colors.bg} ${colors.text} border ${colors.ring}` : "bg-slate-100 text-slate-600"
                }`}>
                  {idx === 0 ? "A" : "B"}
                </span>
                {isWinner && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md">
                    <Trophy className="w-2.5 h-2.5" />
                    Recommended
                  </span>
                )}
                {isSelected && !isWinner && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                    Active
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <span className={`text-xs font-black ${isSelected ? colors.text : "text-slate-700"}`}>
                    {score.total}
                    <span className="text-[9px] font-normal text-slate-400">/100</span>
                  </span>
                </div>
              </div>

              {/* Subject text */}
              <p className={`text-[11px] font-semibold leading-snug mb-3 ${
                isSelected ? colors.text : "text-slate-700"
              }`}>
                {variants[idx]}
              </p>

              {/* Score breakdown */}
              <div className="space-y-1.5 mb-3">
                {SCORE_DIMS.map((dim) => (
                  <ScoreDimBar
                    key={dim.key}
                    label={dim.label}
                    score={score[dim.key] as number}
                    tip={dim.tip}
                    bar={isSelected ? colors.bar : "bg-slate-400"}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(idx); }}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                    isSelected
                      ? `${colors.ring} ${colors.bg} ${colors.text}`
                      : "border-slate-200 text-slate-600 hover:border-slate-400 bg-white"
                  }`}
                >
                  {isSelected ? "✓ Selected" : "Use this one"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); copy(idx); }}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-400 transition-all"
                >
                  {copiedIdx === idx
                    ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</>
                    : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </motion.div>
          );
        })}
      </CardContent>

      {/* Scoring explanation */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
          {SCORE_DIMS.map((dim) => (
            <div key={dim.key} className="flex items-start gap-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide shrink-0 w-20 leading-tight pt-px">{dim.label}</span>
              <span className="text-[9px] text-slate-400 leading-tight">{dim.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OutreachEmailGenerator() {
  const [form, setForm]         = useState<FormState>(DEFAULTS);
  const [tone, setTone]         = useState<Tone>("professional");
  const [body, setBody]         = useState<string | null>(null);
  const [variants, setVariants] = useState<[string, string] | null>(null);
  const [scores, setScores]     = useState<[SubjectScore, SubjectScore] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<0 | 1>(0);
  const [copied, setCopied]     = useState<"subject" | "body" | "all" | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUpEmail[] | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [copiedFollowUp, setCopiedFollowUp] = useState<number | "all" | null>(null);
  const [history, setHistory]   = useState<EmailEntry[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCompareEntry, setHistoryCompareEntry] = useState<EmailEntry | null>(null);
  const copiedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = parseParams();
    if (Object.keys(p).length > 0) setForm((prev) => ({ ...prev, ...p }));
    return () => { if (copiedRef.current) clearTimeout(copiedRef.current); };
  }, []);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const canGenerate =
    form.targetDomain.trim().length > 0 &&
    form.yourName.trim().length > 0 &&
    form.yourCompany.trim().length > 0 &&
    form.contentPitch.trim().length > 0;

  const generate = (t: Tone = tone) => {
    const vars = generateSubjectVariants(form, t);
    const s0   = scoreSubjectLine(vars[0], form.targetDomain);
    const s1   = scoreSubjectLine(vars[1], form.targetDomain);
    const winnerIdx: 0 | 1 = s1.total > s0.total ? 1 : 0;
    const emailBody = generateEmailBody(form, t, vars[winnerIdx]);
    setVariants(vars);
    setScores([s0, s1]);
    setSelectedIdx(winnerIdx);
    setBody(emailBody);
    setBodyExpanded(true);
    setFollowUps(generateFollowUpSequence(form, t, vars[winnerIdx]));
    setFollowUpOpen(false);
    setCopiedFollowUp(null);
    trackEvent("Tool Used", { tool: "outreach-email-generator", tone: t });

    const entry: EmailEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      targetDomain: form.targetDomain.trim(),
      topic: form.topic.trim() || "digital marketing",
      tone: t,
      subject: vars[winnerIdx],
      body: emailBody,
      form: { ...form },
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  const reset = () => {
    if (!body && !variants) return;
    const snapshot = { form: { ...form }, body, variants, scores };
    setForm(DEFAULTS);
    setBody(null);
    setVariants(null);
    setScores(null);
    setCopied(null);
    setFollowUps(null);
    setFollowUpOpen(false);
    toast("Form reset", {
      description: snapshot.body
        ? "Your inputs and generated email have been cleared."
        : "Your inputs have been cleared.",
      action: {
        label: "Undo",
        onClick: () => {
          setForm(snapshot.form);
          setBody(snapshot.body);
          setVariants(snapshot.variants);
          setScores(snapshot.scores);
        },
      },
      duration: 5000,
    });
  };

  const restoreEntry = (entry: EmailEntry) => {
    setForm(entry.form);
    setTone(entry.tone);
    const vars = generateSubjectVariants(entry.form, entry.tone);
    const s0   = scoreSubjectLine(vars[0], entry.form.targetDomain);
    const s1   = scoreSubjectLine(vars[1], entry.form.targetDomain);
    const winnerIdx: 0 | 1 = s1.total > s0.total ? 1 : 0;
    setVariants(vars);
    setScores([s0, s1]);
    setSelectedIdx(winnerIdx);
    setBody(entry.body);
    setBodyExpanded(true);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeSubject = variants ? variants[selectedIdx] : null;

  const copyAsMarkdown = async () => {
    if (!activeSubject || !body || !scores) return;
    const activeScore = scores[selectedIdx];
    const variantLabel = selectedIdx === 0 ? "A" : "B";
    const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);

    const lines: string[] = [];
    lines.push(`# Outreach Email Report`);
    lines.push(``);

    // Campaign metadata
    lines.push(`## Campaign Details`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|---|---|`);
    if (form.yourName)     lines.push(`| **From** | ${form.yourName}${form.yourCompany ? ` — ${form.yourCompany}` : ""} |`);
    if (form.yourWebsite)  lines.push(`| **Website** | ${fmtDomain(form.yourWebsite)} |`);
    if (form.targetDomain) lines.push(`| **To** | ${form.targetDomain} |`);
    if (form.topic)        lines.push(`| **Topic** | ${form.topic} |`);
    lines.push(`| **Tone** | ${toneLabel} |`);
    lines.push(``);

    // Subject line + score breakdown
    lines.push(`## Subject Line (Variant ${variantLabel}) — Score: ${activeScore.total}/100`);
    lines.push(``);
    lines.push(`> ${activeSubject}`);
    lines.push(``);
    lines.push(`### Score Breakdown`);
    lines.push(``);
    lines.push(`| Dimension | Score | Max | Notes |`);
    lines.push(`|---|---|---|---|`);
    lines.push(`| Length | ${activeScore.length} | 25 | Optimal: 40–60 characters |`);
    lines.push(`| Power words | ${activeScore.powerWords} | 25 | High-impact vocabulary |`);
    lines.push(`| Personalisation | ${activeScore.personal} | 25 | Recipient brand name in subject |`);
    lines.push(`| Curiosity gap | ${activeScore.curiosity} | 25 | Questions, em-dashes, numbers |`);
    lines.push(`| **Total** | **${activeScore.total}** | **100** | |`);
    lines.push(``);

    // Email body
    lines.push(`## Email Body`);
    lines.push(``);
    lines.push(body);
    lines.push(``);

    const md = lines.join("\n");
    try { await navigator.clipboard.writeText(md); }
    catch {
      const el = document.createElement("textarea");
      el.value = md; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    trackEvent("Result Copied", { tool: "outreach-email-generator", format: "markdown" });
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const downloadAsEml = () => {
    if (!activeSubject || !body) return;
    const from = form.yourName
      ? `${form.yourName}${form.yourWebsite ? ` <hello@${fmtDomain(form.yourWebsite)}>` : ""}`
      : "Outreach Sender";
    const to = form.targetDomain ? `editor@${fmtDomain(form.targetDomain)}` : "";
    const date = new Date().toUTCString();

    const emlContent = [
      `MIME-Version: 1.0`,
      `Date: ${date}`,
      `From: ${from}`,
      ...(to ? [`To: ${to}`] : []),
      `Subject: ${activeSubject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      body,
    ].join("\r\n");

    const blob = new Blob([emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeDomain = fmtDomain(form.targetDomain || "outreach").replace(/[^a-z0-9]/gi, "-");
    a.href = url;
    a.download = `outreach-${safeDomain}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackEvent("Result Exported", { tool: "outreach-email-generator", format: "eml" });
  };

  const copyFollowUp = async (idx: number | "all") => {
    if (!followUps) return;
    const text =
      idx === "all"
        ? followUps
            .map((f) => `--- ${f.label} ---\nSubject: ${f.subject}\n\n${f.body}`)
            .join("\n\n")
        : `Subject: ${followUps[idx].subject}\n\n${followUps[idx].body}`;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopiedFollowUp(idx);
    trackEvent("Result Copied", { tool: "outreach-email-generator", format: "follow-up" });
    setTimeout(() => setCopiedFollowUp(null), 2000);
  };

  const copyText = async (type: "subject" | "body" | "all") => {
    if (!activeSubject || !body) return;
    const text =
      type === "subject" ? activeSubject
      : type === "body"  ? body
      : `Subject: ${activeSubject}\n\n${body}`;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(type);
    trackEvent("Result Copied", { tool: "outreach-email-generator", format: type });
    if (copiedRef.current) clearTimeout(copiedRef.current);
    copiedRef.current = setTimeout(() => setCopied(null), 2000);
  };

  const colors = TONE_COLORS[tone];
  const hasResults = body !== null && variants !== null && scores !== null;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="outreachEmailGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Outreach Email Generator"
        description="Generate a personalised link-building outreach email in seconds. Choose your tone, fill in the details, and compare two subject line variants — scored on open-rate factors — before you hit send."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <div className="grid md:grid-cols-[1fr_340px] gap-6 items-start">
            {/* ── Input card ── */}
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Your campaign details</h2>
                      <p className="text-xs text-muted-foreground">Fill in what you know — the rest is generated.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      History
                      {history.length > 0 && (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                          {history.length}
                        </span>
                      )}
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={reset}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Tone selector */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
                    Email tone
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONES.map((t) => {
                      const Icon = t.icon;
                      const c    = TONE_COLORS[t.id];
                      const active = tone === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTone(t.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                            active
                              ? `${c.ring} ${c.bg}`
                              : "border-border hover:border-slate-300 bg-white"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? c.icon : "text-muted-foreground"}`} />
                          <span className={`text-[11px] font-bold ${active ? c.text : "text-slate-700"}`}>
                            {t.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground leading-tight hidden sm:block">
                            {t.sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target site */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Target domain <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={form.targetDomain}
                      onChange={(e) => setField("targetDomain", e.target.value)}
                      placeholder="moz.com"
                    />
                    <p className="text-[10px] text-muted-foreground">The site you want a link from</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Topic / niche</Label>
                    <Input
                      value={form.topic}
                      onChange={(e) => setField("topic", e.target.value)}
                      placeholder="digital SEO, content marketing…"
                    />
                    <p className="text-[10px] text-muted-foreground">Helps personalise both variants</p>
                  </div>
                </div>

                {/* Your details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Your name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={form.yourName}
                      onChange={(e) => setField("yourName", e.target.value)}
                      placeholder="Alex Johnson"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Your company <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={form.yourCompany}
                      onChange={(e) => setField("yourCompany", e.target.value)}
                      placeholder="FintechPress Inc."
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Your website</Label>
                    <Input
                      value={form.yourWebsite}
                      onChange={(e) => setField("yourWebsite", e.target.value)}
                      placeholder="fintechpresshub.com"
                    />
                  </div>
                </div>

                {/* Content pitch */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Content you're pitching <span className="text-red-400">*</span>
                  </Label>
                  <textarea
                    value={form.contentPitch}
                    onChange={(e) => setField("contentPitch", e.target.value)}
                    placeholder="our 2025 Digital SEO State of the Market report with 12 months of first-party ranking data"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Be specific — it makes both the pitch and subject lines stronger.
                  </p>
                </div>

                {/* Link value */}
                {(form.linkValueMin || form.linkValueMax) ? (
                  <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <BarChart2 className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-violet-800">
                        Estimated link value pre-filled from your assessment
                      </p>
                      <p className="text-[10px] text-violet-600">
                        ${form.linkValueMin}–${form.linkValueMax} — used in the Data-Led subject variant
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Est. link value min ($)
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.linkValueMin}
                        onChange={(e) => setField("linkValueMin", e.target.value)}
                        placeholder="1200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Est. link value max ($)
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.linkValueMax}
                        onChange={(e) => setField("linkValueMax", e.target.value)}
                        placeholder="2500"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground sm:col-span-2 -mt-2">
                      Used in the Data-Led variant only.{" "}
                      <Link href="/tools/backlink-value-estimator" className="underline hover:text-blue-600">
                        Estimate it first →
                      </Link>
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => generate()}
                  disabled={!canGenerate}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate email + compare subject lines
                </Button>
              </CardContent>
            </Card>

            {/* ── Tips sidebar ── */}
            <div className="space-y-4">
              <Card className="border border-amber-100 bg-amber-50 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    How subject scoring works
                  </h3>
                  <ul className="space-y-2 text-xs text-amber-800 leading-relaxed">
                    <li><span className="font-bold">Length (25 pts)</span> — 40–60 chars hits the sweet spot for most email clients. Too short = no context; too long = truncated.</li>
                    <li><span className="font-bold">Power words (25 pts)</span> — Words that drive action: "exclusive", "resource", "partnership", "how", "data", etc.</li>
                    <li><span className="font-bold">Personalisation (25 pts)</span> — The recipient's brand name in the subject boosts open rates by up to 26%.</li>
                    <li><span className="font-bold">Curiosity gap (25 pts)</span> — Questions, em-dashes, colons, and numbers create tension that compels the open.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-blue-100 bg-blue-50 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Tone guide
                  </h3>
                  <ul className="space-y-2.5 text-xs text-blue-800 leading-relaxed">
                    <li><span className="font-bold">Professional</span> — best for cold outreach to high-DA publications with formal editorial teams.</li>
                    <li><span className="font-bold">Conversational</span> — works well for niche blogs and smaller sites where you want a relationship first.</li>
                    <li><span className="font-bold">Data-Led</span> — use this when you have real metrics. Editors respond to specificity.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-slate-100 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">What makes a great pitch</h3>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Specific content — name the exact piece you're pitching</li>
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Audience-first framing — explain why their readers benefit</li>
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Low-friction CTA — a 15-min call or email reply</li>
                    <li className="flex gap-2"><span className="text-red-400 font-bold shrink-0">✗</span>Avoid generic "I love your content" openers</li>
                    <li className="flex gap-2"><span className="text-red-400 font-bold shrink-0">✗</span>Don't mention DA or SEO value to editorial contacts</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-emerald-100 bg-emerald-50 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <span className="font-bold">Haven't estimated your link's value yet?</span>{" "}
                    Use the{" "}
                    <Link href="/tools/backlink-value-estimator" className="font-semibold underline underline-offset-2 hover:text-emerald-900">
                      Backlink Value Estimator
                    </Link>{" "}
                    first — the value will pre-fill the Data-Led variant automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Results ── */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                key={`${tone}-${form.targetDomain}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 space-y-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    Generated email
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText("all")}
                      className={`gap-1.5 text-xs font-semibold transition-all ${
                        copied === "all"
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      {copied === "all"
                        ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy full email</>}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyAsMarkdown}
                      className={`gap-1.5 text-xs font-semibold transition-all ${
                        copiedMarkdown
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {copiedMarkdown
                        ? <><Check className="w-3.5 h-3.5" /> Copied MD!</>
                        : <><ClipboardCheck className="w-3.5 h-3.5" /> Copy Markdown</>}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadAsEml}
                      className="gap-1.5 text-xs font-semibold transition-all border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50"
                    >
                      <Download className="w-3.5 h-3.5" /> Download .eml
                    </Button>
                  </div>
                </div>

                {/* A/B tester */}
                <SubjectABTester
                  variants={variants!}
                  scores={scores!}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                  tone={tone}
                  targetDomain={form.targetDomain}
                />

                {/* Active subject line summary */}
                <Card className={`border ${colors.ring} ${colors.bg} shadow-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Active subject line · Variant {selectedIdx === 0 ? "A" : "B"} · Score {scores![selectedIdx].total}/100
                        </p>
                        <p className={`text-sm font-bold ${colors.text} leading-snug`}>
                          {activeSubject}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("subject")}
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                          copied === "subject"
                            ? `${colors.ring} ${colors.bg} ${colors.text}`
                            : "border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                      >
                        {copied === "subject"
                          ? <><Check className="w-3 h-3" /> Copied</>
                          : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Body */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setBodyExpanded((e) => !e)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-900">Email body</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyText("body"); }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                            copied === "body"
                              ? "border-blue-400 bg-blue-50 text-blue-700"
                              : "border-slate-200 text-slate-500 hover:border-slate-400"
                          }`}
                        >
                          {copied === "body"
                            ? <><Check className="w-3 h-3" /> Copied</>
                            : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                        {bodyExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {bodyExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-slate-100">
                            <pre className="mt-4 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                              {body}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* Follow-up sequence */}
                {followUps && (
                  <Card className="border border-violet-200 shadow-sm">
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={() => setFollowUpOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50/50 transition-colors rounded-t-xl"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-900">Follow-up sequence</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            Day 3 · Day 7 · Day 14
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyFollowUp("all"); }}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                              copiedFollowUp === "all"
                                ? "border-violet-400 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
                            }`}
                          >
                            {copiedFollowUp === "all"
                              ? <><Check className="w-3 h-3" /> Copied all</>
                              : <><Copy className="w-3 h-3" /> Copy all</>}
                          </button>
                          {followUpOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {followUpOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-violet-100 divide-y divide-violet-100">
                              {followUps.map((fu, idx) => (
                                <div key={fu.day} className="px-5 py-4 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">
                                        {fu.label}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyFollowUp(idx)}
                                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                        copiedFollowUp === idx
                                          ? "border-violet-400 bg-violet-50 text-violet-700"
                                          : "border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600"
                                      }`}
                                    >
                                      {copiedFollowUp === idx
                                        ? <><Check className="w-3 h-3" /> Copied</>
                                        : <><Copy className="w-3 h-3" /> Copy</>}
                                    </button>
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                                    <span className="text-slate-400 font-normal">Subject: </span>{fu.subject}
                                  </p>
                                  <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-violet-50/60 rounded-lg px-3 py-2.5">
                                    {fu.body}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                )}

                {/* Tone switch quick-links */}
                <Card className="border border-slate-100 shadow-sm bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">Not quite right?</span>{" "}
                      Switch tone to get new email copy and a fresh set of subject line variants — no data re-entry.
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {TONES.filter((t) => t.id !== tone).map((t) => {
                        const c = TONE_COLORS[t.id];
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setTone(t.id); generate(t.id); }}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${c.ring} ${c.bg} ${c.text} hover:opacity-80`}
                          >
                            Try {t.label} →
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-100 bg-blue-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Want a fully managed link-building campaign — outreach, placement, and reporting included?{" "}
                      <Link href="/services" className="font-semibold underline underline-offset-2 hover:text-blue-900">
                        See our link building services
                      </Link>{" "}
                      or{" "}
                      <Link href="/contact" className="font-semibold underline underline-offset-2 hover:text-blue-900">
                        get a free backlink audit
                      </Link>
                      .
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── History Sheet ── */}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <SheetTitle className="flex items-center gap-2 text-slate-900">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Saved Emails
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600">
                    {history.length}
                  </span>
                </SheetTitle>
                <p className="text-[12px] text-muted-foreground">
                  Last {history.length} generated email{history.length !== 1 ? "s" : ""}. Click Restore to load one back into the editor.
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No emails saved yet</p>
                    <p className="text-xs text-muted-foreground">Generate your first email and it will appear here.</p>
                  </div>
                )}
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
                          {fmtDomain(entry.targetDomain)} · <span className="capitalize">{entry.tone}</span> · {timeAgo(entry.timestamp)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                        #{history.length - i}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                      {entry.subject}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {entry.body.split("\n").filter(Boolean).slice(0, 2).join(" ")}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => restoreEntry(entry)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                        Restore
                      </Button>
                      {hasResults && (
                        <button
                          type="button"
                          className="h-8 px-2.5 rounded border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                          onClick={() => setHistoryCompareEntry(entry)}
                          aria-label="Compare with current email"
                          title="Compare with current email"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                <div className="px-6 py-4 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md py-2 transition-colors hover:bg-slate-50"
                    onClick={() => {
                      const header = "id,timestamp,date,targetDomain,topic,tone,subject,body";
                      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
                      const rows = history.map((e) => {
                        const date = new Date(e.timestamp).toISOString().split("T")[0];
                        return [e.id, e.timestamp, date, escape(e.targetDomain), escape(e.topic), escape(e.tone), escape(e.subject), escape(e.body)].join(",");
                      });
                      const csv = [header, ...rows].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `outreach-history-${new Date().toISOString().split("T")[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export as CSV
                  </button>
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

          {/* ── Compare Dialog ── */}
          <Dialog
            open={historyCompareEntry !== null}
            onOpenChange={(open) => { if (!open) setHistoryCompareEntry(null); }}
          >
            <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100">
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                  Compare Emails
                  {historyCompareEntry && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      — {toTitleCase(historyCompareEntry.topic)} · {fmtDomain(historyCompareEntry.targetDomain)} · {timeAgo(historyCompareEntry.timestamp)}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 max-h-[65vh] overflow-hidden">
                {/* Historical email */}
                <div className="flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Previous · {historyCompareEntry ? toTitleCase(historyCompareEntry.tone) : ""}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {historyCompareEntry && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                        <p className="text-[12px] font-semibold text-slate-700 mb-3 leading-snug">{historyCompareEntry.subject}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Body</p>
                        <pre className="text-[12px] leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                          {historyCompareEntry.body}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
                {/* Current email */}
                <div className="flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                      Current · {toTitleCase(tone)}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {activeSubject && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                        <p className="text-[12px] font-semibold text-slate-700 mb-3 leading-snug">{activeSubject}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Body</p>
                        <pre className="text-[12px] leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                          {body}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold border-slate-200"
                  onClick={() => setHistoryCompareEntry(null)}
                >
                  Close
                </Button>
                {historyCompareEntry && (
                  <Button
                    size="sm"
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      if (historyCompareEntry) {
                        restoreEntry(historyCompareEntry);
                        setHistoryCompareEntry(null);
                      }
                    }}
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    Restore previous
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
