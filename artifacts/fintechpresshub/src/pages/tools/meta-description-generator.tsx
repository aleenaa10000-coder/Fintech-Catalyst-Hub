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

function generateDescriptions(form: FormState): string[] {
  const { pageTitle, keyword, audience, benefit } = form;
  const kw = keyword.trim() || "fintech solutions";
  const title = pageTitle.trim() || "this page";
  const aud = audience.trim() || "fintech teams";
  const ben = benefit.trim() || "grow faster";

  return [
    `Discover how ${title} helps ${aud} with ${kw}. ${ben.charAt(0).toUpperCase() + ben.slice(1)} — backed by expert fintech content strategy. Read more.`,
    `Looking for ${kw}? ${title} gives ${aud} the insights they need to ${ben.toLowerCase()}. Explore our in-depth fintech guide today.`,
    `${title} covers everything ${aud} need to know about ${kw}. Learn proven strategies to ${ben.toLowerCase()} and stay ahead in fintech.`,
  ].map((d) => {
    if (d.length > 160) return d.slice(0, 157) + "…";
    return d;
  });
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

export default function MetaDescriptionGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [edited, setEdited] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const reset = () => {
    setForm(DEFAULTS);
    setDescriptions([]);
    setEdited([]);
    setGenerated(false);
  };

  const generate = () => {
    const results = generateDescriptions(form);
    setDescriptions(results);
    setEdited(results);
    setGenerated(true);
  };

  const copyToClipboard = (idx: number) => {
    navigator.clipboard.writeText(edited[idx] ?? descriptions[idx]);
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

                {descriptions.map((_, idx) => {
                  const val = edited[idx] ?? descriptions[idx];
                  const len = val?.length ?? 0;
                  return (
                    <Card
                      key={idx}
                      className="border border-slate-100 shadow-sm"
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Option {idx + 1}
                          </span>
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
