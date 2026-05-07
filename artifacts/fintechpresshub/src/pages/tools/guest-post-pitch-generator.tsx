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
  Send,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  User,
  Building2,
  Globe,
  BookOpen,
  Lightbulb,
  Heart,
  SlidersHorizontal,
} from "lucide-react";

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

function buildPitch(form: FormState): string {
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
  const editor = rawEditor ? rawEditor.split(/\s+/)[0] : "there";
  const name = senderName.trim() || "Your Name";
  const company = senderCompany.trim() || "Your Company";
  const role = senderRole.trim() || "content lead";
  const blog = targetBlog.trim() || "your publication";
  const topic = proposedTopic.trim() || "a topic in fintech";
  const expertise =
    yourExpertise.trim() || "fintech content strategy and SEO growth";
  const article = recentArticle.trim();

  const articleSentence = article
    ? `I particularly enjoyed your recent piece on ${article}, which prompted me to reach out with this related idea.`
    : "";

  if (tone === "formal") {
    const openingLine = `I am writing to express my interest in contributing a guest article to ${blog}.${articleSentence ? " " + articleSentence : ""}`;
    return `Subject: Guest Post Submission — ${topic}

Dear ${editor},

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
    return `Subject: Guest Post Pitch — ${topic}

Hi ${editor},

I'm ${name}, ${role} at ${company}.${articleLine}

I'd like to pitch a guest post on "${topic}" for ${blog}. It's a challenge fintech teams are actively navigating — your audience would find it directly useful.

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

  const introLine = `My name is ${name}, ${role} at ${company}. I've been a reader of ${blog} for a while now and genuinely appreciate the quality of fintech content you publish — it consistently hits the right balance of depth and accessibility.${articleSentence ? " " + articleSentence : ""}`;

  return `Subject: Guest Post Pitch — ${topic}

Hi ${editor},

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

export default function GuestPostPitchGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [pitch, setPitch] = useState("");
  const [editedPitch, setEditedPitch] = useState("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);
  const pitchTextareaRef = useRef<HTMLTextAreaElement>(null);

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
  };

  const generate = () => {
    const result = buildPitch(form);
    setPitch(result);
    setEditedPitch(result);
    setGenerated(true);
  };

  const copy = () => {
    navigator.clipboard.writeText(editedPitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                    placeholder="Fintech Magazine"
                    value={form.targetBlog}
                    onChange={setField("targetBlog")}
                    className="h-11"
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
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-orange-600" />
                    Recent Article You Liked
                  </Label>
                  <Input
                    placeholder="e.g., Your recent piece on Neobank regulation"
                    value={form.recentArticle}
                    onChange={setField("recentArticle")}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    If provided, a personalised sentence referencing this article will be added to the opening paragraph.
                  </p>
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

              <Button
                onClick={generate}
                disabled={!canGenerate}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Pitch Email
              </Button>

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
                    <Textarea
                      ref={pitchTextareaRef}
                      value={editedPitch}
                      onChange={(e) => setEditedPitch(e.target.value)}
                      className="text-sm font-sans resize-none overflow-hidden leading-relaxed"
                      style={{ minHeight: "200px" }}
                    />
                    <Button
                      onClick={copy}
                      className={`w-full h-11 font-semibold transition-all duration-200 ${
                        copied
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied to clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy pitch to clipboard
                        </>
                      )}
                    </Button>
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
        </div>
      </section>
    </div>
  );
}
