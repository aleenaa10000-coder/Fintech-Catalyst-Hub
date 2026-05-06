import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ExternalLink,
} from "lucide-react";

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

const TONES: { id: Tone; label: string; sublabel: string; icon: typeof Mail }[] = [
  { id: "professional", label: "Professional", sublabel: "Formal, confident, agency-style", icon: Briefcase },
  { id: "conversational", label: "Conversational", sublabel: "Warm, human, relationship-first", icon: MessageCircle },
  { id: "data-led", label: "Data-Led", sublabel: "Metric-driven, value-first pitch", icon: BarChart2 },
];

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

type GeneratedEmail = { subject: string; body: string };

function generateEmail(form: FormState, tone: Tone): GeneratedEmail {
  const domain = fmtDomain(form.targetDomain) || "yourtargetsite.com";
  const name = form.yourName.trim() || "Your Name";
  const company = form.yourCompany.trim() || "Your Company";
  const website = fmtDomain(form.yourWebsite) || "yourwebsite.com";
  const pitch = form.contentPitch.trim() || "our recent in-depth guide on this topic";
  const topic = form.topic.trim() || "fintech";
  const site = siteName(domain);
  const hasValue = form.linkValueMin && form.linkValueMax;
  const valueRange = hasValue
    ? `$${form.linkValueMin}–$${form.linkValueMax}`
    : "a high-authority link placement";

  if (tone === "professional") {
    return {
      subject: `Content partnership opportunity — ${company} × ${site}`,
      body: `Hi ${site} team,

I'm ${name} from ${company} (${website}). I came across ${domain} while researching ${topic} resources for fintech professionals, and your coverage stood out.

We've recently published ${pitch} — it covers ${topic} in a way I believe your readers would find genuinely useful as a follow-on resource.

I'd love to explore a content partnership: a guest contribution, editorial mention, or resource page link. The piece would complement your existing ${topic} content and add real depth for your audience.

I'm happy to share the full piece for your review before you make any decision — no commitment required.

Would you have 15 minutes this week for a quick call, or would email work better?

Best regards,
${name}
${company}
${website}`,
    };
  }

  if (tone === "conversational") {
    return {
      subject: `Quick question about ${site}'s ${topic} coverage`,
      body: `Hey ${site} team,

Huge fan of the work you're doing over at ${domain} — your ${topic} content is genuinely some of the best in the space.

I'm ${name} from ${company} (${website}), and we've just published ${pitch}.

I think it could be a great fit as a reference or next-step resource for your readers — especially anyone looking to go deeper on ${topic} after reading your content.

Would love to explore whether there's a natural home for it in your existing pieces. No pressure at all — just wanted to put it on your radar.

If it's not a fit, completely understood. Either way, keep up the great work!

Cheers,
${name}
${company} · ${website}`,
    };
  }

  // data-led
  return {
    subject: `${capitalize(topic)} resource for ${site} — ${hasValue ? `estimated SEO value ${valueRange}` : "worth a look"}`,
    body: `Hi ${site} team,

I'm ${name}, ${topic} content lead at ${company} (${website}).

I'm reaching out because ${domain} ranks well for ${topic} content, and I believe we've published something that could meaningfully strengthen your existing coverage.

${company} has recently published ${pitch}. It fills a specific gap in the current ${topic} content landscape — covering angles and data points that your readers are actively searching for.

${hasValue ? `Based on your domain authority and traffic profile, a link from your ${topic} content is estimated to be worth ${valueRange} in organic authority to our campaign — which gives you a sense of how seriously we're approaching this outreach.` : `We've been selective with our outreach, and your site is one of a small number we've identified as a genuinely strong fit.`}

I can share the full resource for your review immediately. If it's a good fit, I'm flexible on format — guest post, resource page mention, or editorial inclusion.

Would a 15-minute call this week work to discuss? I'm also happy to keep this to email if that's easier.

Best,
${name}
${company}
${website}`,
  };
}

function parseParams(): Partial<FormState> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<FormState> = {};
  const td = params.get("targetDomain");
  const lmin = params.get("linkValueMin");
  const lmax = params.get("linkValueMax");
  const topic = params.get("topic");
  if (td) result.targetDomain = td;
  if (lmin) result.linkValueMin = lmin;
  if (lmax) result.linkValueMax = lmax;
  if (topic) result.topic = topic;
  return result;
}

const TONE_COLORS: Record<Tone, { ring: string; bg: string; text: string; icon: string }> = {
  professional:    { ring: "border-blue-400",    bg: "bg-blue-50",    text: "text-blue-700",   icon: "text-blue-500"   },
  conversational:  { ring: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
  "data-led":      { ring: "border-violet-400",  bg: "bg-violet-50",  text: "text-violet-700",  icon: "text-violet-500"  },
};

export default function OutreachEmailGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [tone, setTone] = useState<Tone>("professional");
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const copiedRef = { current: null as ReturnType<typeof setTimeout> | null };

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

  const generate = () => {
    setEmail(generateEmail(form, tone));
    setBodyExpanded(true);
  };

  const reset = () => {
    setForm(DEFAULTS);
    setEmail(null);
    setCopied(null);
  };

  const copy = async (type: "subject" | "body" | "all") => {
    if (!email) return;
    const text =
      type === "subject" ? email.subject
      : type === "body" ? email.body
      : `Subject: ${email.subject}\n\n${email.body}`;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(type);
    if (copiedRef.current) clearTimeout(copiedRef.current);
    copiedRef.current = setTimeout(() => setCopied(null), 2000);
  };

  const colors = TONE_COLORS[tone];

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="outreachEmailGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Outreach Email Generator"
        description="Generate a personalised link-building outreach email in seconds. Choose your tone, fill in the details, and copy a ready-to-send template — no fluff, no generic spam."
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
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                {/* Tone selector */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
                    Email tone
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONES.map((t) => {
                      const Icon = t.icon;
                      const c = TONE_COLORS[t.id];
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
                    <Label className="text-xs font-semibold text-slate-700">
                      Topic / niche
                    </Label>
                    <Input
                      value={form.topic}
                      onChange={(e) => setField("topic", e.target.value)}
                      placeholder="fintech SEO, open banking…"
                    />
                    <p className="text-[10px] text-muted-foreground">The subject area (optional but helps personalise)</p>
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
                    <Label className="text-xs font-semibold text-slate-700">
                      Your website
                    </Label>
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
                    placeholder="our 2025 Fintech SEO State of the Market report with 12 months of first-party ranking data"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground">Describe the piece you want them to link to — be specific, it makes the pitch stronger.</p>
                </div>

                {/* Link value (optional, pre-filled from estimator) */}
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
                        ${form.linkValueMin}–${form.linkValueMax} — used in the Data-Led tone
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
                      Used in the Data-Led tone only.{" "}
                      <Link href="/tools/backlink-value-estimator" className="underline hover:text-blue-600">
                        Estimate it first →
                      </Link>
                    </p>
                  </div>
                )}

                <Button
                  onClick={generate}
                  disabled={!canGenerate}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate outreach email
                </Button>
              </CardContent>
            </Card>

            {/* ── Tips sidebar ── */}
            <div className="space-y-4">
              <Card className="border border-blue-100 bg-blue-50 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Outreach tips
                  </h3>
                  <ul className="space-y-2.5 text-xs text-blue-800 leading-relaxed">
                    <li><span className="font-bold">Professional</span> — best for cold outreach to high-DA publications with formal editorial teams.</li>
                    <li><span className="font-bold">Conversational</span> — works well for niche blogs and smaller sites where you want to build a relationship first.</li>
                    <li><span className="font-bold">Data-Led</span> — use this when you have real metrics to back your pitch. Editors respond to specificity.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-slate-100 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">What makes a great pitch</h3>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Specific content — don't say "great article", say exactly what you're pitching</li>
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Audience-first framing — explain why their readers benefit, not just you</li>
                    <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">✓</span>Low friction CTA — a 15-min call or email reply, not "let me know if interested"</li>
                    <li className="flex gap-2"><span className="text-red-400 font-bold shrink-0">✗</span>Avoid "I love your content" with no specifics — it reads as a template instantly</li>
                    <li className="flex gap-2"><span className="text-red-400 font-bold shrink-0">✗</span>Don't mention DA, PageRank, or SEO value to editorial contacts — use value-to-reader framing instead</li>
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
                    first — the link value will pre-fill the Data-Led template automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Generated email ── */}
          <AnimatePresence>
            {email && (
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copy("all")}
                    className={`gap-1.5 text-xs font-semibold transition-all ${
                      copied === "all"
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {copied === "all" ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy full email</>}
                  </Button>
                </div>

                {/* Subject line */}
                <Card className={`border ${colors.ring} ${colors.bg} shadow-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject line</p>
                        <p className={`text-sm font-bold ${colors.text} leading-snug`}>{email.subject}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy("subject")}
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                          copied === "subject"
                            ? `${colors.ring} ${colors.bg} ${colors.text}`
                            : "border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                      >
                        {copied === "subject" ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
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
                          onClick={(e) => { e.stopPropagation(); copy("body"); }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                            copied === "body"
                              ? "border-blue-400 bg-blue-50 text-blue-700"
                              : "border-slate-200 text-slate-500 hover:border-slate-400"
                          }`}
                        >
                          {copied === "body" ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                        {bodyExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
                              {email.body}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* Tone variants prompt */}
                <Card className="border border-slate-100 shadow-sm bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">Not quite right?</span>{" "}
                      Switch tone above and click Generate again to get a different angle — no data is re-entered.
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {TONES.filter((t) => t.id !== tone).map((t) => {
                        const c = TONE_COLORS[t.id];
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setTone(t.id); setEmail(generateEmail(form, t.id)); }}
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
        </div>
      </section>
    </div>
  );
}
