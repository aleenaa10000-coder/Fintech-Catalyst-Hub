import { useState } from "react";
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
  FileText,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type FormState = {
  pageTitle: string;
  keyword: string;
  audience: string;
  benefit: string;
};

const DEFAULTS: FormState = {
  pageTitle: "",
  keyword: "",
  audience: "",
  benefit: "",
};

// ── 1. Grammar Normalization ─────────────────────────────────────────────────
// Maps 3rd-person-singular verb forms → base/infinitive so the benefit phrase
// reads naturally after "to", "help", or "help them" (e.g. "help them eliminate").
const VERB_BASE: Record<string, string> = {
  accelerates: "accelerate", achieves: "achieve", arrives: "arrive",
  attracts: "attract", boosts: "boost", brings: "bring", builds: "build",
  closes: "close", converts: "convert", creates: "create",
  cuts: "cut", delivers: "deliver", drives: "drive", eliminates: "eliminate",
  expands: "expand", gains: "gain", generates: "generate", gets: "get",
  grows: "grow", helps: "help", improves: "improve", increases: "increase",
  leads: "lead", lowers: "lower", maximises: "maximise",
  maximizes: "maximize", optimises: "optimise", optimizes: "optimize",
  provides: "provide", raises: "raise", ranks: "rank", reaches: "reach",
  reduces: "reduce", removes: "remove", saves: "save", scales: "scale",
  secures: "secure", sends: "send", shortens: "shorten", speeds: "speed",
  streamlines: "streamline", targets: "target", transforms: "transform",
  unlocks: "unlock", wins: "win", works: "work",
};

function toInfinitive(phrase: string): string {
  return phrase.replace(/^(\w+)/, (w) => VERB_BASE[w.toLowerCase()] ?? w);
}

// ── 2. Niche Detection ────────────────────────────────────────────────────────
const SERVICE_RE =
  /plumb|electri|dentist|doctor|lawyer|solicitor|cleaner|repair|remov|emergency|locksmith|builder|plaster|roofer|accountant|surveyor|glazier|pest/i;

function detectNiche(kw: string, title: string): "service" | "b2b" {
  return SERVICE_RE.test(`${kw} ${title}`) ? "service" : "b2b";
}

// ── 3. Clean Completion ───────────────────────────────────────────────────────
// Every description must end with a full stop — never an ellipsis.
function ensurePeriod(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// ── 4. CTA Padding ────────────────────────────────────────────────────────────
// Descriptions under 145 chars get a CTA appended to reach the 155-char sweet
// spot. Tried in order; the first one that keeps the total ≤ 160 is used.
const CTAS = [
  "Read the full guide here.",
  "Learn more on our hub.",
  "Explore the full breakdown.",
  "See the full analysis here.",
  "Start reading today.",
  "Learn more.",
];

function padIfShort(text: string): string {
  if (text.length >= 145) return text;
  const bare = text.endsWith(".") ? text.slice(0, -1) : text;
  for (const cta of CTAS) {
    const candidate = `${bare}. ${cta}`;
    if (candidate.length <= 160) return candidate;
  }
  return text;
}

// ── 5. Build & Optimise ───────────────────────────────────────────────────────
// Picks the first candidate that fits within 160 chars, pads short ones with a
// CTA, and as a last resort trims at the nearest word boundary — never ellipsis.
// Short-title variants (see §7) appear later in each pool so they are only
// reached when full-title candidates overflow 160 chars.
function buildDescription(candidates: string[]): string {
  for (const raw of candidates) {
    const t = ensurePeriod(raw);
    if (t.length <= 160) return padIfShort(t);
  }
  const fallback = candidates[candidates.length - 1];
  const cut = fallback.lastIndexOf(" ", 157);
  const trimmed = ensurePeriod(cut > 80 ? fallback.slice(0, cut) : fallback.slice(0, 157));
  return padIfShort(trimmed);
}

// ── 6. Keyword-in-60 Guard ────────────────────────────────────────────────────
// SERP snippet keyword must start within the first 60 characters.
function kwInFirst60(text: string, kw: string): boolean {
  return text.toLowerCase().indexOf(kw.toLowerCase()) < 60;
}

// ── 7. Technical Preservation ────────────────────────────────────────────────
// When the Key Benefit contains a multi-word technical term (e.g. "lateral
// movement", "zero-trust architecture"), the page title is shortened rather
// than trimming the benefit mid-phrase.
// `shortenTitle` clips `title` to at most `maxLen` chars at a word boundary
// so it can be substituted into templates that would otherwise overflow 160.
function shortenTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  const cut = title.lastIndexOf(" ", maxLen);
  return cut > 4 ? title.slice(0, cut) : title.slice(0, maxLen);
}

// ── Main Generator ────────────────────────────────────────────────────────────
export type ToneLabel = "Action" | "Curiosity" | "Authority";
export type GeneratedResult = { text: string; tone: ToneLabel };

function generateDescriptions(form: FormState): GeneratedResult[] {
  const { pageTitle, keyword, audience, benefit } = form;
  const kw     = keyword.trim() || "professional solutions";
  const title  = pageTitle.trim() || "this resource";
  const aud    = audience.trim() || "professional teams";
  const rawBen = benefit.trim() || "grow faster";

  // Normalise verb: "eliminates" → "eliminate" so "help them eliminate" is correct
  const ben = toInfinitive(rawBen.charAt(0).toLowerCase() + rawBen.slice(1));

  const niche = detectNiche(kw, title);

  // §7 — Short title for technical preservation.
  // Tried AFTER full-title candidates; keeps the full `ben` phrase intact when
  // long inputs would otherwise overflow 160 chars and force a mid-phrase trim.
  const shortTitle = shortenTitle(title, 22);

  // ── [Action] ──────────────────────────────────────────────────────────────
  // High-impact command verb; keyword opens the sentence (always within 60 chars).
  const actionVerb = niche === "service" ? "Secure" : "Optimize";
  const actionPool = [
    // Full-title variants (preferred)
    `${actionVerb} ${kw}: ${title} is built to help ${aud} ${ben}.`,
    `${actionVerb} ${kw} — ${title} helps ${aud} ${ben}.`,
    `Scale ${kw} with ${title} — built to help ${aud} ${ben}.`,
    `Deploy ${kw} tactics from ${title} to help ${aud} ${ben}.`,
    // Short-title variants — used only when full-title overflows; preserves `ben`
    `${actionVerb} ${kw}: ${shortTitle} helps ${aud} ${ben}.`,
    `${actionVerb} ${kw} — helps ${aud} ${ben}.`,
  ].filter((c) => kwInFirst60(c, kw));

  // ── [Curiosity] ───────────────────────────────────────────────────────────
  // Specific question tailored to the target audience; keyword in opening clause.
  const curiosityPool = [
    // Full-title variants (preferred)
    `Need stronger ${kw}? ${title} shows ${aud} how to ${ben}.`,
    `Struggling with ${kw}? ${title} helps ${aud} ${ben}.`,
    `Is your ${kw} strategy working? ${title} guides ${aud} to ${ben}.`,
    `Want better ${kw} results? ${title} helps ${aud} ${ben}.`,
    // Short-title variants — preserves `ben` when inputs are long
    `Need stronger ${kw}? ${shortTitle} shows ${aud} how to ${ben}.`,
    `Struggling with ${kw}? Helps ${aud} ${ben}.`,
  ].filter((c) => kwInFirst60(c, kw));

  // ── [Authority] ───────────────────────────────────────────────────────────
  // Industry-grade descriptor: "Enterprise-grade"/"Advanced" for tech,
  // "Professional" for trade/service niches.
  const authPrefix = niche === "service" ? "Professional" : "Enterprise-grade";
  const authFallback = niche === "service" ? "Professional" : "Advanced";
  const authorityPool = [
    // Full-title variants (preferred)
    `${authPrefix} ${kw}: ${title} purpose-built to help ${aud} ${ben}.`,
    `${authFallback} ${kw} for ${aud} — ${title} shows how to ${ben}.`,
    `${authFallback} ${kw} insights: ${title} helps ${aud} ${ben}.`,
    // Short-title variants — preserves `ben` when inputs are long
    `${authPrefix} ${kw}: ${shortTitle} purpose-built to help ${aud} ${ben}.`,
    `${authFallback} ${kw} for ${aud} who need to ${ben}.`,
  ].filter((c) => kwInFirst60(c, kw));

  // Fallback pools (no 60-char filter) used only if all filtered candidates fail
  const pick = (filtered: string[], fallbacks: string[]) =>
    filtered.length ? filtered : fallbacks;

  return [
    {
      text: buildDescription(pick(actionPool, [
        `${actionVerb} ${kw}: ${shortTitle} helps ${aud} ${ben}.`,
        `${actionVerb} ${kw} — helps ${aud} ${ben}.`,
      ])),
      tone: "Action",
    },
    {
      text: buildDescription(pick(curiosityPool, [
        `Need stronger ${kw}? ${shortTitle} helps ${aud} ${ben}.`,
        `Struggling with ${kw}? Helps ${aud} ${ben}.`,
      ])),
      tone: "Curiosity",
    },
    {
      text: buildDescription(pick(authorityPool, [
        `${authFallback} ${kw} for ${aud} who need to ${ben}.`,
        `${authPrefix} ${kw}: trusted by ${aud} to ${ben}.`,
      ])),
      tone: "Authority",
    },
  ];
}

function CharBadge({ count }: { count: number }) {
  const color =
    count <= 160
      ? count >= 120
        ? "text-green-600 bg-green-50 border-green-200"
        : "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";
  return (
    <span
      className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${color}`}
    >
      {count}/160
    </span>
  );
}

const TONE_STYLES: Record<ToneLabel, { badge: string; label: string }> = {
  Action:    { badge: "bg-purple-50 text-purple-700 border-purple-200", label: "Action" },
  Curiosity: { badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "Curiosity" },
  Authority: { badge: "bg-slate-50 text-slate-700 border-slate-300",    label: "Authority" },
};

export default function MetaDescriptionGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [edited, setEdited] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const reset = () => {
    setForm(DEFAULTS);
    setResults([]);
    setEdited([]);
    setGenerated(false);
  };

  const generate = () => {
    const generated = generateDescriptions(form);
    setResults(generated);
    setEdited(generated.map((r) => r.text));
    setGenerated(true);
    trackEvent("Tool Used", { tool: "meta-description-generator" });
  };

  const copyToClipboard = (idx: number) => {
    navigator.clipboard.writeText(edited[idx] ?? results[idx]?.text ?? "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
    trackEvent("Result Copied", { tool: "meta-description-generator" });
  };

  const canGenerate =
    form.pageTitle.trim().length > 0 && form.keyword.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="metaDescriptionGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Meta Description Generator"
        description="Generate 3 SEO-ready meta descriptions for any professional page. Enter your page title and target keyword to get started — then copy, tweak, and publish."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Page Details
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Fill in at least the title and keyword.
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
                  <Label className="text-sm font-semibold text-slate-700">
                    Page Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Best Professional SEO Agency in 2025"
                    value={form.pageTitle}
                    onChange={setField("pageTitle")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The H1 or SEO title of the page.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Target Keyword <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="professional SEO services"
                    value={form.keyword}
                    onChange={setField("keyword")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Primary keyword you want to rank for.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Target Audience
                  </Label>
                  <Input
                    placeholder="digital startups"
                    value={form.audience}
                    onChange={setField("audience")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Who this page is for (optional).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Key Benefit
                  </Label>
                  <Input
                    placeholder="scale organic traffic by 3x"
                    value={form.benefit}
                    onChange={setField("benefit")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The main outcome or value prop (optional).
                  </p>
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={!canGenerate}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Meta Descriptions
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {generated && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Your 3 Meta Descriptions — edit &amp; copy
                </h3>

                {results.map((result, idx) => {
                  const val = edited[idx] ?? result.text;
                  const len = val?.length ?? 0;
                  const tone = TONE_STYLES[result.tone];
                  return (
                    <Card
                      key={idx}
                      className="border border-slate-100 shadow-sm"
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Option {idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${tone.badge}`}
                            >
                              {tone.label}
                            </span>
                          </div>
                          <CharBadge count={len} />
                        </div>
                        <Textarea
                          value={val}
                          onChange={(e) => {
                            const next = [...edited];
                            next[idx] = e.target.value;
                            setEdited(next);
                          }}
                          rows={3}
                          className="text-sm resize-none"
                        />
                        {len > 160 && (
                          <p className="flex items-center gap-1 text-[11px] text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            Over 160 characters — search engines may truncate
                            this.
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(idx)}
                          className="w-full"
                        >
                          {copied === idx ? (
                            <>
                              <Check className="w-4 h-4 mr-1.5 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1.5" />
                              Copy to clipboard
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}

                <Card className="border border-blue-100 bg-blue-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Need help building a full digital SEO strategy?{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-blue-900"
                      >
                        Get in touch
                      </Link>{" "}
                      — we write and optimise content that ranks.
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
