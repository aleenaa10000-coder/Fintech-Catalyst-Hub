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
// Maps common 3rd-person-singular verb forms → base/infinitive form so the
// benefit phrase reads naturally after "to" or "help [audience]".
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
  targets: "target", transforms: "transform", wins: "win", works: "work",
};

function toInfinitive(phrase: string): string {
  return phrase.replace(/^(\w+)/, (word) => VERB_BASE[word.toLowerCase()] ?? word);
}

// ── 2. Niche Detection ────────────────────────────────────────────────────────
const SERVICE_RE =
  /plumb|electri|dentist|doctor|lawyer|solicitor|cleaner|repair|remov|emergency|locksmith|builder|plaster|roofer|accountant|surveyor|glazier|pest/i;

function detectNiche(kw: string, title: string): "service" | "b2b" {
  return SERVICE_RE.test(`${kw} ${title}`) ? "service" : "b2b";
}

// ── 3. No-Ellipsis Completion ─────────────────────────────────────────────────
// Ensures the description ends with a period and never exceeds 160 chars.
// If a candidate is too long, try the next; as a last resort trim at the last
// complete word before the limit and append a period — never an ellipsis.
function ensurePeriod(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function fitToLimit(candidates: string[]): string {
  for (const raw of candidates) {
    const t = ensurePeriod(raw);
    if (t.length <= 160) return t;
  }
  // Last-resort: trim last candidate at word boundary, close with period
  const fallback = candidates[candidates.length - 1];
  const cut = fallback.lastIndexOf(" ", 158);
  return ensurePeriod(cut > 80 ? fallback.slice(0, cut) : fallback.slice(0, 158));
}

// ── 4. Keyword-in-65 Guard ────────────────────────────────────────────────────
// Verifies the keyword starts within the first 65 characters of a candidate.
function kwInFirst65(text: string, kw: string): boolean {
  return text.toLowerCase().indexOf(kw.toLowerCase()) < 65;
}

// ── Main Generator ────────────────────────────────────────────────────────────
export type ToneLabel = "Action" | "Curiosity" | "Authority";
export type GeneratedResult = { text: string; tone: ToneLabel };

function generateDescriptions(form: FormState): GeneratedResult[] {
  const { pageTitle, keyword, audience, benefit } = form;
  const kw     = keyword.trim() || "fintech solutions";
  const title  = pageTitle.trim() || "this resource";
  const aud    = audience.trim() || "fintech teams";
  const rawBen = benefit.trim() || "grow faster";

  // Normalise verb to base form for use after "to" / "help [aud]"
  const ben = toInfinitive(rawBen.charAt(0).toLowerCase() + rawBen.slice(1));

  const niche = detectNiche(kw, title);

  // ── Option 1 · Action ──────────────────────────────────────────────────────
  // Starts with a command verb; keyword must land within the first 65 chars.
  const actionVerb = niche === "service" ? "Secure" : "Discover";
  const actionCandidates = [
    `${actionVerb} ${kw} — ${title} helps ${aud} ${ben}.`,
    `${actionVerb} ${kw}: the guide built to help ${aud} ${ben}.`,
    `${actionVerb} ${kw} and help ${aud} ${ben}.`,
  ].filter((c) => kwInFirst65(c, kw));

  // ── Option 2 · Curiosity ───────────────────────────────────────────────────
  // Opens with a question aimed directly at the target audience.
  const curiosityCandidates = [
    `Are ${aud} struggling with ${kw}? ${title} shows you how to ${ben}.`,
    `Need better ${kw}? ${title} guides ${aud} to ${ben}.`,
    `Want to ${ben}? ${title} is the ${kw} resource built for ${aud}.`,
  ].filter((c) => kwInFirst65(c, kw));

  // ── Option 3 · Authority ───────────────────────────────────────────────────
  // Uses a professional claim fitted to the niche.
  const authorityPrefix = niche === "service" ? "Reliable" : "Advanced";
  const authorityCandidates = [
    `${authorityPrefix} ${kw}: ${title} is purpose-built to help ${aud} ${ben}.`,
    `${authorityPrefix} ${kw} insights for ${aud} who need to ${ben}.`,
    `Master ${kw} with ${title} — trusted guidance for ${aud} to ${ben}.`,
  ].filter((c) => kwInFirst65(c, kw));

  // Fallback: if every candidate failed the 65-char filter, use unfiltered list
  const pick = (filtered: string[], all: string[]) =>
    filtered.length ? filtered : all;

  return [
    {
      text: fitToLimit(pick(actionCandidates, [
        `${actionVerb} ${kw}: the guide built to help ${aud} ${ben}.`,
        `${actionVerb} ${kw} and help ${aud} ${ben}.`,
      ])),
      tone: "Action",
    },
    {
      text: fitToLimit(pick(curiosityCandidates, [
        `Need better ${kw}? ${title} guides ${aud} to ${ben}.`,
        `Want to ${ben}? ${title} is the ${kw} resource built for ${aud}.`,
      ])),
      tone: "Curiosity",
    },
    {
      text: fitToLimit(pick(authorityCandidates, [
        `${authorityPrefix} ${kw} insights for ${aud} who need to ${ben}.`,
        `Master ${kw} with ${title} — trusted guidance for ${aud} to ${ben}.`,
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
  };

  const copyToClipboard = (idx: number) => {
    navigator.clipboard.writeText(edited[idx] ?? results[idx]?.text ?? "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const canGenerate =
    form.pageTitle.trim().length > 0 && form.keyword.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="metaDescriptionGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Meta Description Generator"
        description="Generate 3 SEO-ready meta descriptions for any fintech page. Enter your page title and target keyword to get started — then copy, tweak, and publish."
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
                    placeholder="Best Fintech SEO Agency in 2025"
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
                    placeholder="fintech SEO agency"
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
                    placeholder="fintech startups"
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
                      Need help building a full fintech SEO strategy?{" "}
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
