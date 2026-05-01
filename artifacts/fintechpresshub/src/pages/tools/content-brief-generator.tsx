import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileEdit,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Download,
  BookOpen,
  Target,
  Users,
  MessageSquare,
  Link2,
  ListOrdered,
  Clock,
} from "lucide-react";

type Audience = "founders" | "marketers" | "developers" | "consumers" | "investors";
type Tone = "authoritative" | "educational" | "conversational" | "data-driven";
type WordCount = "800" | "1200" | "1800" | "2500";

type FormState = {
  keyword: string;
  audience: Audience;
  tone: Tone;
  wordCount: WordCount;
  competitors: string;
};

const DEFAULTS: FormState = {
  keyword: "",
  audience: "marketers",
  tone: "authoritative",
  wordCount: "1200",
  competitors: "",
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  founders: "Fintech founders / CEOs",
  marketers: "Marketing & growth teams",
  developers: "Developers & technical leads",
  consumers: "Personal finance consumers",
  investors: "Investors & analysts",
};

const TONE_LABELS: Record<Tone, string> = {
  authoritative: "Authoritative — expert-led, confident",
  educational: "Educational — clear, step-by-step",
  conversational: "Conversational — approachable, jargon-light",
  "data-driven": "Data-driven — stats-first, analytical",
};

type Brief = {
  keyword: string;
  audience: string;
  tone: string;
  targetWordCount: string;
  readingTime: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  h2s: { heading: string; notes: string }[];
  faqHeadings: string[];
  internalLinks: string[];
  externalLinkTypes: string[];
  cta: string;
  toneGuidance: string[];
  thingsToAvoid: string[];
};

const FINTECH_INTERNAL_LINKS = [
  "Your services page — link from any mention of 'working with an agency'",
  "Relevant blog post on a related topic",
  "Pricing page — link from any mention of 'getting started' or 'cost'",
  "Case studies or testimonials page",
  "Write For Us page — link from any contributor call-to-action",
  "Contact page — link from the conclusion CTA",
];

const EXTERNAL_LINK_TYPES = [
  "Regulatory body or official government source (e.g. FCA, CFPB, EBA)",
  "Original research or industry report (e.g. McKinsey, Accenture, Statista)",
  "Peer-reviewed academic source (where applicable)",
  "Major fintech publication for context (e.g. The Financial Brand, Tearsheet)",
];

const TONE_GUIDANCE: Record<Tone, string[]> = {
  authoritative: [
    "Open with a confident, declarative statement — no hedging.",
    "Back every claim with a named source or specific data point.",
    "Use first-person plural ('we recommend') sparingly and only when you have real expertise behind the claim.",
    "Avoid excessive qualifiers like 'might', 'could', 'perhaps'.",
  ],
  educational: [
    "Define technical terms on first use — assume the reader is smart but new to the topic.",
    "Use numbered lists and step-by-step structures wherever a process is described.",
    "Include a 'Key Takeaways' box near the top or bottom.",
    "Write short sentences. Aim for an average under 18 words.",
  ],
  conversational: [
    "Write like you're explaining this to a colleague over coffee — not a boardroom.",
    "Use contractions (it's, you'll, they're).",
    "Ask rhetorical questions to keep readers engaged.",
    "Avoid acronyms without spelling them out — even common ones like API or AML.",
  ],
  "data-driven": [
    "Lead each section with a statistic or data point.",
    "Always cite the source and year for every number used.",
    "Use tables or comparison structures where multiple data points exist.",
    "Prefer specific figures over vague claims (e.g. '42% of fintechs' not 'many fintechs').",
  ],
};

const THINGS_TO_AVOID: Record<Tone, string[]> = {
  authoritative: [
    "Unsubstantiated superlatives ('the best', 'the most important')",
    "Passive voice — keep it active and direct",
    "Padding content to hit word count — every paragraph must earn its place",
  ],
  educational: [
    "Jargon without explanation",
    "Walls of text — break every 3–4 sentences with a subheading or list",
    "Skipping the 'why it matters' context for each step",
  ],
  conversational: [
    "Overly casual language that undermines credibility",
    "Slang or idioms that may not translate internationally",
    "Rambling intros — get to the point by sentence 3",
  ],
  "data-driven": [
    "Outdated statistics (check publication dates — anything 3+ years old needs replacement)",
    "Cherry-picked data without acknowledging counter-evidence",
    "Data dumps without interpretation — always explain what the numbers mean",
  ],
};

const H2_TEMPLATES: Record<Audience, (kw: string) => { heading: string; notes: string }[]> = {
  founders: (kw) => [
    { heading: `What Is ${kw}? A Founder's Overview`, notes: "Define the concept clearly. Link to any regulatory definitions." },
    { heading: `Why ${kw} Matters for Fintech Startups in 2025`, notes: "Market context, growth trends, VC interest." },
    { heading: `The Business Case: ROI and Revenue Impact`, notes: "Include data on financial upside. Cite industry reports." },
    { heading: `Key Challenges Founders Face with ${kw}`, notes: "Be honest about difficulty. Show you understand the pain." },
    { heading: `How to Get Started: A Practical Framework`, notes: "Step-by-step, actionable. Numbered list preferred." },
    { heading: `Choosing the Right Partners and Vendors`, notes: "Criteria checklist. Do not name-drop vendors without justification." },
    { heading: `What Leading Fintechs Are Doing Differently`, notes: "2–3 mini case studies or examples." },
    { heading: `Conclusion: Your Next Step with ${kw}`, notes: "Summarise, then lead into CTA." },
  ],
  marketers: (kw) => [
    { heading: `${kw}: What Every Fintech Marketer Needs to Know`, notes: "Set the scene — why this topic matters for growth teams." },
    { heading: `How ${kw} Fits into the Fintech Marketing Funnel`, notes: "TOFU / MOFU / BOFU breakdown." },
    { heading: `Content and SEO Opportunities Around ${kw}`, notes: "Keyword clusters, content types, search intent breakdown." },
    { heading: `Campaign Ideas and Use Cases`, notes: "3–5 concrete campaign angles with brief descriptions." },
    { heading: `Measuring Success: KPIs and Metrics`, notes: "Specific metrics, not vague ones. Include benchmarks where possible." },
    { heading: `Common Mistakes Fintech Marketers Make`, notes: "Make this honest and specific — not generic." },
    { heading: `Tools and Platforms Worth Knowing`, notes: "Brief overview, no paid placements unless disclosed." },
    { heading: `Conclusion and Next Steps`, notes: "Tie back to the opening, close with CTA." },
  ],
  developers: (kw) => [
    { heading: `${kw} Explained for Developers`, notes: "Technical-first definition. No fluff." },
    { heading: `Architecture and Integration Overview`, notes: "How it fits into a typical fintech stack. Diagrams encouraged." },
    { heading: `API Design Considerations`, notes: "REST vs GraphQL, auth patterns, versioning." },
    { heading: `Security and Compliance Requirements`, notes: "PCI DSS, GDPR, open banking standards — be specific." },
    { heading: `Common Implementation Pitfalls`, notes: "Real issues developers hit. Cite community resources or docs." },
    { heading: `Testing and Monitoring Best Practices`, notes: "Unit, integration, load testing. Error handling." },
    { heading: `Code Examples and SDK Options`, notes: "Brief code snippets or pseudocode where helpful." },
    { heading: `Conclusion: Building Responsibly with ${kw}`, notes: "Ethical and compliance close. CTA to contact or docs." },
  ],
  consumers: (kw) => [
    { heading: `What Is ${kw}? A Plain-English Guide`, notes: "No jargon. Explain like you would to a friend." },
    { heading: `How Does It Work?`, notes: "Step-by-step user journey. Keep it visual if possible." },
    { heading: `Is ${kw} Safe? What You Need to Know`, notes: "Address security and regulatory protection directly." },
    { heading: `Benefits You Can Actually Feel`, notes: "Concrete, personal outcomes — not abstract features." },
    { heading: `What to Watch Out For`, notes: "Honest risks. Don't oversell." },
    { heading: `How to Choose the Best Option for You`, notes: "Decision checklist. Comparison table if applicable." },
    { heading: `Frequently Asked Questions`, notes: "Pull from real search queries around this topic." },
    { heading: `Getting Started: Your Next Step`, notes: "Low-friction CTA. Make it feel easy." },
  ],
  investors: (kw) => [
    { heading: `Market Overview: The ${kw} Landscape`, notes: "TAM, SAM, SOM. Cite authoritative market research." },
    { heading: `Key Trends Driving Growth in 2025`, notes: "Regulatory tailwinds, technology shifts, consumer adoption curves." },
    { heading: `The Competitive Landscape`, notes: "Category leaders, challengers, emerging players." },
    { heading: `Business Model Analysis`, notes: "Revenue models, unit economics, margin profiles." },
    { heading: `Risk Factors and Due Diligence Checklist`, notes: "Regulatory risk, market risk, execution risk." },
    { heading: `Notable Deals and Funding Activity`, notes: "Recent raises, M&A activity, valuations where available." },
    { heading: `What Strong Operators in ${kw} Look Like`, notes: "Differentiation factors, moats, team signals." },
    { heading: `Outlook and Investment Thesis`, notes: "Bull / bear case. Conclude with a clear POV." },
  ],
};

const FAQ_TEMPLATES: Record<Audience, (kw: string) => string[]> = {
  founders: (kw) => [
    `What is ${kw} and why does it matter for fintech startups?`,
    `How much does it cost to implement ${kw}?`,
    `What regulations apply to ${kw} in the UK/EU/US?`,
    `How long does it take to build a ${kw} solution?`,
  ],
  marketers: (kw) => [
    `How do I create content around ${kw} that ranks?`,
    `What is the search intent behind ${kw}?`,
    `How do fintech companies use ${kw} in their marketing?`,
    `What metrics should I track for ${kw} campaigns?`,
  ],
  developers: (kw) => [
    `How do I integrate ${kw} into my fintech app?`,
    `What are the security requirements for ${kw}?`,
    `Which SDKs or APIs support ${kw}?`,
    `How do I test a ${kw} implementation?`,
  ],
  consumers: (kw) => [
    `What is ${kw} in simple terms?`,
    `Is ${kw} safe to use?`,
    `How do I get started with ${kw}?`,
    `What are the fees involved with ${kw}?`,
  ],
  investors: (kw) => [
    `What is the market size for ${kw}?`,
    `Who are the leading companies in ${kw}?`,
    `What are the biggest risks in the ${kw} space?`,
    `How is ${kw} regulated globally?`,
  ],
};

const CTA_TEMPLATES: Record<Audience, string> = {
  founders: "End with a direct CTA to book a strategy call or request a fintech content audit.",
  marketers: "Close with an offer — a free content calendar template, SEO audit, or strategy call.",
  developers: "Link to documentation, a GitHub repo, or a technical contact form.",
  consumers: "Use a soft CTA — 'Ready to explore your options?' with a link to a comparison or contact page.",
  investors: "Invite readers to subscribe to your deal-flow newsletter or request a private briefing.",
};

function generateBrief(form: FormState): Brief {
  const kw = form.keyword.trim();
  const capKw = kw.charAt(0).toUpperCase() + kw.slice(1);
  const wc = parseInt(form.wordCount);
  const readingMinutes = Math.round(wc / 200);

  return {
    keyword: kw,
    audience: AUDIENCE_LABELS[form.audience],
    tone: TONE_LABELS[form.tone],
    targetWordCount: `${wc.toLocaleString()} words`,
    readingTime: `~${readingMinutes} min read`,
    metaTitle: `${capKw}: The Definitive Guide for ${AUDIENCE_LABELS[form.audience].split(" ")[0]}s (2025)`,
    metaDescription: `Everything ${AUDIENCE_LABELS[form.audience].toLowerCase()} need to know about ${kw} — from fundamentals to practical strategies. Read the full guide.`,
    h1: `${capKw}: What ${AUDIENCE_LABELS[form.audience].split(" ")[0]}s Need to Know in 2025`,
    intro: `Open with a 2–3 sentence hook that immediately establishes why ${kw} is relevant right now. Include a surprising statistic or a provocative question. Briefly outline what the article covers and who it's for. Keep the intro under 120 words.`,
    h2s: H2_TEMPLATES[form.audience](capKw),
    faqHeadings: FAQ_TEMPLATES[form.audience](kw),
    internalLinks: FINTECH_INTERNAL_LINKS.slice(0, 4),
    externalLinkTypes: EXTERNAL_LINK_TYPES,
    cta: CTA_TEMPLATES[form.audience],
    toneGuidance: TONE_GUIDANCE[form.tone],
    thingsToAvoid: THINGS_TO_AVOID[form.tone],
  };
}

function briefToText(brief: Brief): string {
  return [
    `CONTENT BRIEF: ${brief.keyword.toUpperCase()}`,
    `${"=".repeat(60)}`,
    ``,
    `OVERVIEW`,
    `--------`,
    `Target Keyword: ${brief.keyword}`,
    `Target Audience: ${brief.audience}`,
    `Tone: ${brief.tone}`,
    `Target Word Count: ${brief.targetWordCount}`,
    `Reading Time: ${brief.readingTime}`,
    ``,
    `SEO`,
    `---`,
    `Meta Title: ${brief.metaTitle}`,
    `Meta Description: ${brief.metaDescription}`,
    `H1: ${brief.h1}`,
    ``,
    `INTRO GUIDANCE`,
    `--------------`,
    brief.intro,
    ``,
    `CONTENT STRUCTURE (H2s)`,
    `-----------------------`,
    ...brief.h2s.map((h, i) => `${i + 1}. ${h.heading}\n   Notes: ${h.notes}`),
    ``,
    `FAQ SECTION (suggested questions)`,
    `----------------------------------`,
    ...brief.faqHeadings.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `INTERNAL LINKS`,
    `--------------`,
    ...brief.internalLinks.map((l) => `• ${l}`),
    ``,
    `EXTERNAL LINK TYPES`,
    `-------------------`,
    ...brief.externalLinkTypes.map((l) => `• ${l}`),
    ``,
    `TONE GUIDANCE`,
    `-------------`,
    ...brief.toneGuidance.map((t) => `• ${t}`),
    ``,
    `THINGS TO AVOID`,
    `---------------`,
    ...brief.thingsToAvoid.map((t) => `• ${t}`),
    ``,
    `CTA`,
    `---`,
    brief.cta,
  ].join("\n");
}

export default function ContentBriefGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [copied, setCopied] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setBrief(null);
  };

  const generate = () => setBrief(generateBrief(form));

  const copyBrief = () => {
    if (!brief) return;
    navigator.clipboard.writeText(briefToText(brief));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBrief = () => {
    if (!brief) return;
    const blob = new Blob([briefToText(brief)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brief.keyword.replace(/\s+/g, "-").toLowerCase()}-content-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canGenerate = form.keyword.trim().length >= 3;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="contentBriefGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Content Brief Generator"
        description="Enter a keyword and target audience to get a structured fintech article brief — with H2s, meta copy, tone guidelines, FAQ suggestions, and internal link opportunities."
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
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Brief Settings</h2>
                    <p className="text-xs text-muted-foreground">
                      Enter your keyword and choose your audience to get a tailored brief.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="space-y-5 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-rose-600" />
                    Target Keyword / Topic <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. embedded finance, open banking regulation, BNPL for businesses"
                    value={form.keyword}
                    onChange={(e) => setField("keyword", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canGenerate) generate(); }}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the main keyword or topic the article should rank for.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-600" />
                    Target Audience
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setField("audience", a)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          form.audience === a
                            ? "border-rose-400 bg-rose-50 text-rose-800 font-medium"
                            : "border-border text-muted-foreground hover:border-rose-300"
                        }`}
                      >
                        {AUDIENCE_LABELS[a]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-600" />
                    Writing Tone
                  </Label>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField("tone", t)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          form.tone === t
                            ? "border-rose-400 bg-rose-50 text-rose-800 font-medium"
                            : "border-border text-muted-foreground hover:border-rose-300"
                        }`}
                      >
                        {TONE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600" />
                    Target Word Count
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(["800", "1200", "1800", "2500"] as WordCount[]).map((wc) => (
                      <button
                        key={wc}
                        type="button"
                        onClick={() => setField("wordCount", wc)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.wordCount === wc
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-muted-foreground border-border hover:border-rose-400 hover:text-rose-600"
                        }`}
                      >
                        {parseInt(wc).toLocaleString()} words
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={!canGenerate}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content Brief
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {brief && (
              <motion.div
                key={brief.keyword}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Brief for "{brief.keyword}"
                  </h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyBrief} className="gap-1.5">
                      {copied ? (
                        <><Check className="w-4 h-4 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy</>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadBrief} className="gap-1.5">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Overview */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-600" /> Overview
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {[
                        { label: "Audience", value: brief.audience },
                        { label: "Tone", value: brief.tone.split(" — ")[0] },
                        { label: "Word count", value: brief.targetWordCount },
                        { label: "Reading time", value: brief.readingTime },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-xs font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SEO */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-rose-600" /> SEO Copy
                    </h4>
                    {[
                      { label: "Meta Title", value: brief.metaTitle },
                      { label: "Meta Description", value: brief.metaDescription },
                      { label: "H1", value: brief.h1 },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="text-sm text-slate-800 leading-snug bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{value}</p>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Intro Guidance</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{brief.intro}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* H2s */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-rose-600" /> Content Structure (H2s)
                    </h4>
                    <div className="space-y-2">
                      {brief.h2s.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            <span className="text-rose-500 mr-1.5">H2</span>{h.heading}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.notes}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ + Links + Tone side-by-side cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-rose-600" /> FAQ Suggestions
                      </h4>
                      {brief.faqHeadings.map((q, i) => (
                        <p key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-snug">
                          {q}
                        </p>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-rose-600" /> Internal Link Opportunities
                      </h4>
                      {brief.internalLinks.map((l, i) => (
                        <p key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-snug">
                          {l}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Tone guidance */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-rose-600" /> Tone Guidance
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-green-600 mb-2">Do</p>
                        <ul className="space-y-1.5">
                          {brief.toneGuidance.map((t, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-700">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500 mb-2">Avoid</p>
                        <ul className="space-y-1.5">
                          {brief.thingsToAvoid.map((t, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-700">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CTA guidance */}
                <Card className="border border-rose-100 bg-rose-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-rose-800 mb-1">CTA Guidance</p>
                    <p className="text-xs text-rose-700 leading-relaxed">{brief.cta}</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Need a fintech writer to execute this brief?{" "}
                      <Link href="/services" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        See our content services
                      </Link>{" "}
                      or{" "}
                      <Link href="/contact" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        send us the brief directly
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
