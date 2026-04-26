import { PageMeta } from "@/components/PageMeta";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Check, FileText, Globe, Link as LinkIcon, Loader2, Plus } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const wfuFaqs = [
  {
    question: "How long does it take to hear back on a pitch?",
    answer:
      "We review all pitches within 5–7 business days. If your topic is a strong fit you'll receive an acceptance email with a brief scope doc and a suggested deadline. Off-niche or under-specified pitches are declined with a short note.",
  },
  {
    question: "Can I include more than one dofollow link?",
    answer:
      "Every approved post earns one in-body dofollow contextual link and one dofollow author-bio link. Additional citations may be approved at editorial discretion when they reference primary data, regulator filings, or original research that materially strengthens the piece.",
  },
  {
    question: "Is payment available for guest posts?",
    answer:
      "We do not pay contributors. The compensation is two permanent dofollow backlinks from a topically-aligned fintech domain with a targeted readership — the same audience your product serves. Contributors consistently report measurable referral traffic and ranking lift from the placement.",
  },
  {
    question: "What word count do you require?",
    answer:
      "Articles must be between 800 and 1,500 words. Every word must earn its place — tightly scoped, deeply researched pieces consistently outperform padded long-form in our niche. Thin or AI-generated content is rejected at pitch stage.",
  },
  {
    question: "Do I keep copyright on my article?",
    answer:
      "FintechPressHub publishes under an exclusive licence. You retain full authorship credit and may cite the published piece in your portfolio or press mentions, but may not republish the full text — including on Medium, LinkedIn Articles, or your own blog — without written editor approval.",
  },
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  topic: z.string().min(4, "Topic must be at least 4 characters").max(200),
  category: z.string().optional(),
  pitch: z.string().min(30, "Please provide more detail in your pitch (min 30 chars)").max(4000),
  sampleUrl: z.string().url("Please enter a valid URL").optional().or(z.literal(""))
});

export default function WriteForUs() {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      website: "",
      topic: "",
      category: "",
      pitch: "",
      sampleUrl: "",
    },
  });

  const [submitted, setSubmitted] = useState(false);

  const submitPost = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && typeof data.error === "string" ? data.error : null) ||
            `Submission failed (${res.status})`,
        );
      }
      return { status: res.status, data } as { status: number; data: { ok?: boolean; emailed?: boolean } | null };
    },
  });

  const watchedName = form.watch("name");
  const watchedEmail = form.watch("email");
  const watchedPitch = form.watch("pitch");
  const requiredFilled =
    watchedName.trim().length > 0 &&
    watchedEmail.trim().length > 0 &&
    watchedPitch.trim().length > 0;
  const isSubmitDisabled = !requiredFilled || submitPost.isPending;

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitPost.mutate(values, {
      onSuccess: () => {
        setSubmitted(true);
        form.reset();
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Please try again later.";
        toast.error("Failed to submit pitch.", { description: message });
      },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="writeForUs"
        article={{
          title: "Write For Us — Fintech Guest Post Guidelines | FintechPressHub",
          description:
            "Submit a fintech guest post to FintechPressHub. Read our editorial standards, topical scope, and dofollow link policy — then pitch your idea to our editors.",
          datePublished: "2023-10-01",
          dateModified: "2026-04-25",
          section: "Contributor Guidelines",
          tags: [
            "fintech write for us",
            "fintech guest post",
            "fintech guest blogging",
            "submit a fintech article",
            "dofollow guest post",
            "fintech contributor guidelines",
          ],
          about: [
            "Fintech Guest Posting",
            "Write For Us Fintech",
            "Fintech Contributor Guidelines",
            "Dofollow Guest Post",
            "Fintech Link Building",
          ],
          mentions: [
            "B2B Fintech Marketing",
            "B2C Fintech Marketing",
            "SaaS Fintech SEO",
            "Embedded Finance",
            "Open Banking",
            "PSD2",
            "PSD3",
            "Payments Infrastructure",
            "Payment Orchestration",
            "Card Issuing",
            "Buy Now Pay Later",
            "Neobanking",
            "Digital Banking",
            "Lending",
            "Credit Underwriting",
            "Wealthtech",
            "Robo-Advisors",
            "Regtech",
            "KYC",
            "AML",
            "Compliance Marketing",
            "Cryptocurrency Payments",
            "Stablecoin Payments",
            "Treasury Management",
            "CFO Tooling",
            "Conversion Rate Optimization",
            "Topical Authority",
            "Link Building",
            "Author Bio Backlink",
            "Contextual Backlink",
          ],
        }}
        faq={wfuFaqs}
      />
      <PageHero
        eyebrow="Write For Us"
        title={<>Write for FintechPressHub</>}
        description="We accept high-quality guest contributions from established fintech operators, marketers, and founders. Read the editorial guidelines below, then send us your pitch."
      />

      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Guidelines */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Editorial Guidelines</h2>
                <p className="text-muted-foreground mb-6">
                  We maintain strict editorial standards to ensure our audience receives actionable, expert-led insights. Please read carefully before pitching.
                </p>
              </div>

              <Card className="bg-card">
                <CardContent className="pt-6 space-y-3">
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-depth"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Depth & Originality</h3>
                      <p className="text-sm text-muted-foreground">800–1,500 words. No fluff. Must include unique data, personal experience, or case studies. AI-generated content will be rejected immediately.</p>
                    </div>
                  </div>
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-fintech"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Strict Fintech Focus</h3>
                      <p className="text-sm text-muted-foreground">
                        We only publish for fintech operators and decision-makers. Accepted topics:
                        payments infrastructure, embedded finance, Open Banking &amp; PSD2/PSD3,
                        neobanking, BNPL, lending &amp; credit, regtech, KYC/AML compliance,
                        wealthtech, crypto payments, SaaS fintech SEO, and CRO for financial
                        products. Off-niche pitches are rejected without review.
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-link"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <LinkIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Dofollow Link Policy</h3>
                      <p className="text-sm text-muted-foreground">
                        Every approved post earns one dofollow contextual link to your fintech
                        product or content, plus one dofollow link in your author bio — both
                        carrying full link equity from our niche-aligned domain. Anchor text must be
                        natural; no exact-match money keywords. Affiliate, casino, CBD, payday, and
                        thin landing-page links are stripped or rejected. Extra citations may be
                        approved at editorial discretion for original data or regulatory sources.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-900">
                <h3 className="font-bold mb-4">What we do NOT accept:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Generic marketing advice</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Promotional press releases</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Casino, CBD, or payday loan links</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Plagiarized or spun content</li>
                </ul>
              </div>

              <Link
                href="/editorial-guidelines"
                data-testid="link-editorial-standards"
                className="group block rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl h-fit">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold mb-1">
                      Before you pitch
                    </p>
                    <p className="font-semibold text-foreground inline-flex items-center gap-1.5 group-hover:text-primary transition-colors">
                      Read our full Editorial Standards here
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The complete style guide, sourcing rules, and review process used by our editors.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Pitch Form */}
            <div className="lg:col-span-7">
              <div className="relative bg-card border rounded-2xl p-8 shadow-sm overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center text-center py-12 px-2"
                    data-testid="pitch-success-card"
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 220, damping: 16 }}
                      className="relative mb-6"
                    >
                      <span className="absolute inset-0 rounded-full bg-green-500/15 blur-xl" aria-hidden />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 ring-4 ring-green-50">
                        <motion.span
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                        >
                          <Check className="h-10 w-10 text-green-600" strokeWidth={3} />
                        </motion.span>
                      </div>
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.35 }}
                      className="text-3xl font-bold tracking-tight mb-3"
                    >
                      Pitch Received
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45, duration: 0.35 }}
                      className="text-muted-foreground max-w-md"
                    >
                      Our editorial team will review your pitch and get back to you via your work email within 3–5 business days.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.3 }}
                      className="mt-8"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSubmitted(false)}
                        data-testid="button-submit-another"
                      >
                        Submit another pitch
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                <h2 className="text-2xl font-bold mb-6">Submit Your Pitch</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="jane@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Website (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a topic area" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seo">SEO Strategy</SelectItem>
                                <SelectItem value="content">Content Marketing</SelectItem>
                                <SelectItem value="growth">Growth & Acquisition</SelectItem>
                                <SelectItem value="technical">Technical Marketing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proposed Working Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., How to Scale SEO for a Payment Gateway" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pitch"
                      render={({ field }) => {
                        const length = field.value?.length ?? 0;
                        const min = 30;
                        const max = 4000;
                        const underMin = length > 0 && length < min;
                        const nearMax = length >= max - 200;
                        const overMax = length > max;
                        const counterColor = overMax
                          ? "text-red-600"
                          : underMin
                          ? "text-amber-600"
                          : nearMax
                          ? "text-amber-600"
                          : "text-muted-foreground";
                        const counterText = underMin
                          ? `${min - length} more character${
                              min - length === 1 ? "" : "s"
                            } needed · ${length} / ${max}`
                          : `${length.toLocaleString()} / ${max.toLocaleString()}`;
                        return (
                          <FormItem>
                            <FormLabel>The Pitch</FormLabel>
                            <FormDescription>Outline your thesis, key takeaways, and why you are the right person to write this.</FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="Briefly outline your article structure..." 
                                className="min-h-[150px] resize-y" 
                                {...field} 
                              />
                            </FormControl>
                            <div className="flex items-center justify-between gap-3 mt-1.5">
                              <FormMessage className="m-0" />
                              <span
                                className={`text-xs tabular-nums ml-auto ${counterColor}`}
                                data-testid="pitch-char-counter"
                                aria-live="polite"
                              >
                                {counterText}
                              </span>
                            </div>
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="sampleUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Writing Sample URL (Optional)</FormLabel>
                          <FormDescription>Link to a published article that demonstrates your writing style.</FormDescription>
                          <FormControl>
                            <Input placeholder="https://example.com/blog/my-post" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitDisabled}
                      data-testid="button-submit-pitch"
                    >
                      {submitPost.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Pitch"
                      )}
                    </Button>
                    {!requiredFilled && !submitPost.isPending && (
                      <p className="text-xs text-muted-foreground text-center -mt-2">
                        Fill in your name, email, and pitch to submit.
                      </p>
                    )}
                  </form>
                </Form>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
          >
            {wfuFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`wfu-faq-${i}`} className="border-b-0 group">
                <AccordionTrigger className="px-6 py-5 text-base md:text-lg font-semibold text-left text-slate-900 hover:text-[#0052FF] hover:no-underline transition-colors [&>svg]:hidden">
                  <span className="flex-1 pr-4">{faq.question}</span>
                  <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#0052FF]/10 text-[#0052FF] transition-transform duration-300 group-data-[state=open]:rotate-45">
                    <Plus className="w-5 h-5" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-0 text-muted-foreground text-base leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
