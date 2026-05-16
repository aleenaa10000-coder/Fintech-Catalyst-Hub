import { useState } from "react";
import { toast } from "sonner";
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
import { readSharedState } from "@/lib/toolShare";
import { ToolShareEmbed } from "@/components/ToolShareEmbed";
import { ToolSEOEnhancements } from "@/components/ToolSEOEnhancements";

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
  // Pre-fill from `?s=<base64url>` if the visitor arrived via a share link.
  // readSharedState falls back to DEFAULTS for missing/malformed payloads.
  const [form, setForm] = useState<FormState>(() => readSharedState(DEFAULTS));
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [edited, setEdited] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const reset = () => {
    if (form.pageTitle === "" && form.keyword === "" && form.audience === "" && form.benefit === "" && results.length === 0) return;
    const snapshot = { form: { ...form }, results: [...results], edited: [...edited], generated };
    setForm(DEFAULTS);
    setResults([]);
    setEdited([]);
    setGenerated(false);
    toast("Form reset", {
      description: snapshot.generated
        ? "Your inputs and generated results have been cleared."
        : "Your inputs have been cleared.",
      action: {
        label: "Undo",
        onClick: () => {
          setForm(snapshot.form);
          setResults(snapshot.results);
          setEdited(snapshot.edited);
          setGenerated(snapshot.generated);
        },
      },
      duration: 5000,
    });
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
      <PageMeta
        page="metaDescriptionGenerator"
        faq={[
          { question: "Is the Meta Description Generator free?", answer: "Yes — the FintechPressHub Meta Description Generator is free with no account needed." },
          { question: "How long should a meta description be?", answer: "Google typically displays 150–160 characters. The generator targets this range and includes your target keyword naturally for maximum CTR." },
          { question: "Will the generated meta descriptions include my keyword?", answer: "Yes — the generator weaves your target keyword into all three description variants to strengthen on-page relevance signals for Google." },
        ]}
        webPage={{
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          conditionsOfAccess:  "https://schema.org/OnlineAccess",
          usageInfo:           "https://www.fintechpresshub.com/terms",
          isAccessibleForFree: true,
          accessibilityFeature: ["alternativeText", "structuredNavigation"],
        }}
        speakableSelectors={["h1", ".speakable-summary"]}
        softwareApp={{
          name:                "Meta Description Generator for Fintech",
          applicationCategory: "BusinessApplication",
          operatingSystem:     "Web",
          url:                 "https://www.fintechpresshub.com/tools/meta-description-generator",
          description:         "Generate 3 ready-to-use SEO meta descriptions for any fintech page. Enter your title and keyword — no sign-up needed.",
          offers:              { price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
          inLanguage:          "en",
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          provider:            { "@id": "https://www.fintechpresshub.com#organization" },
          potentialAction:     { "@type": "UseAction", target: "https://www.fintechpresshub.com/tools/meta-description-generator" },
          featureList: [
            "Generates 3 unique meta description variants per request",
            "Targets your specified primary keyword naturally",
            "Enforces 155-character limit for full SERP display",
            "Optimised for fintech, payments, and financial services pages",
            "No sign-up required — fully client-side",
          ],
        }}
        howTo={{
          name:        "How to Generate Fintech Meta Descriptions",
          description: "Use the free Meta Description Generator to create SEO-optimised descriptions for fintech pages.",
          steps: [
            { name: "Enter page title and keyword", text: "Type your fintech page title and primary target keyword into the fields." },
            { name: "Generate descriptions", text: "Click Generate to receive three ready-to-use meta descriptions under 160 characters each." },
            { name: "Copy your preferred variant", text: "Click Copy on the description that best matches your page intent and paste it into your CMS." },
          ],
          totalTime: "PT2M",
        }}
      />

      <PageHero
        eyebrow="Free Tool"
        title="Meta Description Generator"
        description="Generate 3 SEO-ready meta descriptions for any professional page. Enter your page title and target keyword to get started — then copy, tweak, and publish."
      />

      <div className="container mx-auto px-4 pb-2">
        <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Generate three 150–160 character SEO meta descriptions from your page title and target keyword — free, no sign-up required.
        </p>
      </div>

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

          <ToolSEOEnhancements
            toolSlug="meta-description-generator"
            toolName="Meta Description Generator"
            methodologyTitle="How the Meta Description Generator Works"
            methodologyText="The generator uses a template engine with four structural patterns — question-led, benefit-led, keyword-anchored, and action-led — selecting the three variants most likely to drive clicks for your input. It enforces a 155-character target range (below the 160-character SERP cutoff), normalises verb conjugation for natural benefit phrases, and detects B2B vs local-service contexts to apply the most effective call-to-action language."
            accuracyNote="Generated descriptions include your target keyword in a natural position — not keyword-stuffed as a prefix. A CTA padding algorithm appends a tested phrase when the initial draft falls under 145 characters, pushing the total into the optimal 155–160 character window."
            lastUpdated="May 2026"
            processingNote="All generation runs in your browser — no text is sent to our servers."
            useCases={[
              { industry: "Payments & Checkout", role: "SEO Managers", benefit: "Payments SEO teams craft keyword-rich meta descriptions for high-competition queries like \"payment gateway API\" and \"embedded payments\", testing multiple variants before A/B testing in Search Console." },
              { industry: "Digital Banking", role: "Content Strategists", benefit: "Neobank content teams generate localised meta descriptions for region-specific landing pages — ensuring each description hits the 155-character sweet spot for full SERP display." },
              { industry: "Fintech Startups", role: "Founding Marketing Teams", benefit: "Early-stage fintech startups create professional meta descriptions for every product page without hiring a specialist — dramatically reducing time-to-launch for new feature pages." },
              { industry: "RegTech & Compliance", role: "Content Writers", benefit: "RegTech writers craft SERP-preview text that accurately represents regulatory content — a YMYL requirement ensuring no misleading previews on financial-services pages." },
            ]}
            faq={[
              { question: "Is the Meta Description Generator free?", answer: "Yes — the FintechPressHub Meta Description Generator is free with no account needed." },
              { question: "How long should a meta description be?", answer: "Google typically displays 150–160 characters. The generator targets this range and includes your target keyword naturally for maximum CTR." },
              { question: "Will the generated meta descriptions include my keyword?", answer: "Yes — the generator weaves your target keyword into all three description variants to strengthen on-page relevance signals for Google." },
            ]}
            citationUrls={[
              { label: "Meta Element — Wikipedia", url: "https://en.wikipedia.org/wiki/Meta_element" },
              { label: "Google Search — Snippet Appearance", url: "https://developers.google.com/search/docs/appearance/snippet" },
            ]}
          />
          <ToolShareEmbed slug="meta-description-generator" state={form} />
        </div>
      </section>
    </div>
  );
}
