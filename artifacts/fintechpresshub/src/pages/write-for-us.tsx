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
import {
  ArrowRight,
  BookOpen,
  Check,
  X,
  FileText,
  Globe,
  Link as LinkIcon,
  Loader2,
  Plus,
  TrendingUp,
  Users,
  Award,
  Target,
  Send,
  Sparkles,
  PenLine,
  Layers,
  Image as ImageIcon,
  Quote,
  Shield,
  Clock,
  UserCheck,
  Rocket,
  Lightbulb,
} from "lucide-react";
import aboutOfficeImg from "@/assets/about-office.png";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const benefits = [
  {
    icon: Award,
    title: "Authority in a YMYL niche",
    description:
      "Get your byline in front of fintech decision-makers on a domain that Google already trusts for regulated finance topics.",
  },
  {
    icon: Users,
    title: "50k+ targeted monthly readers",
    description:
      "Reach payments leads, growth marketers, compliance officers, and founders actively researching tooling and strategy.",
  },
  {
    icon: TrendingUp,
    title: "Two permanent dofollow links",
    description:
      "Earn one in-body contextual dofollow link plus one author-bio dofollow link from a niche-aligned, topically relevant domain.",
  },
  {
    icon: Target,
    title: "Sustained referral traffic",
    description:
      "Approved posts are kept evergreen, internally linked, and refreshed — driving qualified visitors long after publication.",
  },
];

const topicCategories = [
  {
    title: "Payments Infrastructure",
    items: [
      "Card issuing & processing",
      "Payment orchestration",
      "Cross-border rails",
    ],
  },
  {
    title: "Embedded Finance",
    items: [
      "BaaS architecture",
      "Embedded lending playbooks",
      "Vertical SaaS payments",
    ],
  },
  {
    title: "Open Banking & PSD3",
    items: [
      "Account-to-account payments",
      "Variable recurring payments",
      "Data-sharing compliance",
    ],
  },
  {
    title: "Neobanking & Digital Banks",
    items: [
      "Activation & retention",
      "Fee economics",
      "Regulatory sandboxing",
    ],
  },
  {
    title: "BNPL & Consumer Lending",
    items: [
      "Underwriting models",
      "Affordability checks",
      "Merchant integrations",
    ],
  },
  {
    title: "B2B & SME Lending",
    items: [
      "Cash-flow underwriting",
      "Embedded SME credit",
      "Receivables financing",
    ],
  },
  {
    title: "Wealthtech & Robo-advisors",
    items: [
      "Portfolio construction",
      "Advisor SaaS marketing",
      "Self-directed investing",
    ],
  },
  {
    title: "Regtech & Compliance",
    items: [
      "Transaction monitoring",
      "Reg reporting tooling",
      "Sanctions screening",
    ],
  },
  {
    title: "KYC, AML & Fraud",
    items: [
      "Identity verification",
      "Fraud orchestration",
      "Synthetic ID detection",
    ],
  },
  {
    title: "Fintech SaaS",
    items: [
      "Treasury & FP&A platforms",
      "AP/AR & spend management",
      "Embedded-finance SaaS",
    ],
  },
  {
    title: "Fintech SEO & Content",
    items: [
      "Topical authority builds",
      "Programmatic SEO",
      "Editorial workflows",
    ],
  },
  {
    title: "Fintech CRO & Growth",
    items: [
      "Onboarding funnels",
      "Pricing experiments",
      "Lifecycle messaging",
    ],
  },
  {
    title: "Treasury & CFO Tooling",
    items: [
      "AP/AR automation",
      "Spend management",
      "Multi-entity treasury",
    ],
  },
  {
    title: "Insurtech",
    items: [
      "Embedded insurance",
      "Underwriting AI",
      "Claims automation",
    ],
  },
  {
    title: "Wealth & Robo Marketing",
    items: [
      "Compliant ad creative",
      "Disclosures & disclaimers",
      "RIA referral programs",
    ],
  },
  {
    title: "AI in Financial Services",
    items: [
      "LLM risk frameworks",
      "Agentic finance UX",
      "Model governance",
    ],
  },
];

const guidelines = [
  {
    icon: Sparkles,
    title: "100% Original",
    description: "Unpublished, no AI boilerplate, no spun rewrites.",
  },
  {
    icon: PenLine,
    title: "Compelling Headlines",
    description: "Specific, benefit-led, ≤ 65 characters where possible.",
  },
  {
    icon: Lightbulb,
    title: "Strong Hook",
    description: "Open with a stat, contrarian take, or fresh insight.",
  },
  {
    icon: Layers,
    title: "Clear Structure",
    description: "H2 / H3 hierarchy, scannable lists, summary takeaways.",
  },
  {
    icon: Clock,
    title: "Timely Angles",
    description: "Tie to a regulation, product launch, or 2026 trend.",
  },
  {
    icon: ImageIcon,
    title: "Quality Visuals",
    description: "Original charts, diagrams, or licensed imagery only.",
  },
  {
    icon: Quote,
    title: "Cite Primary Sources",
    description: "Regulator filings, peer-reviewed studies, first-party data.",
  },
  {
    icon: Shield,
    title: "Brand-safe Voice",
    description: "Expert, neutral tone — no aggressive product pitches.",
  },
  {
    icon: FileText,
    title: "Word Count Discipline",
    description: "800–1,500 words. Tight beats long. No padding.",
  },
  {
    icon: UserCheck,
    title: "Real Author Bio",
    description: "Two-line bio, headshot URL, LinkedIn for credibility checks.",
  },
  {
    icon: Rocket,
    title: "Editor Review",
    description: "Expect light copy edits and fact-check questions — reply within 48h.",
  },
  {
    icon: LinkIcon,
    title: "Submission Format",
    description: "Google Doc with comment access, or pasted Markdown.",
  },
];

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

  /**
   * Click handler for the topic cards: pre-fills the "Proposed Working Title"
   * with the card title, smooth-scrolls to the pitch form, then focuses the
   * topic input so the contributor can start typing their angle immediately.
   * `shouldDirty` ensures the value sticks; `shouldValidate` defers the error
   * UI until the user leaves the field.
   */
  function handleTopicCardClick(title: string) {
    form.setValue("topic", title, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });

    const formEl = document.getElementById("pitch-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Focus the topic input after the smooth-scroll animation kicks in,
    // and place the caret at the end so the user can append their angle.
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="topic"]',
      );
      if (input) {
        input.focus({ preventScroll: true });
        const len = input.value.length;
        try {
          input.setSelectionRange(len, len);
        } catch {
          /* setSelectionRange unsupported on some input types — safe to ignore */
        }
      }
    }, 450);
  }

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
            "Fintech SaaS",
            "SaaS Fintech",
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

      {/* Benefits */}
      <section className="py-24" id="benefits">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">
                Welcome to FintechPressHub
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Explore the Benefits of Guest Posting With Us
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl">
                A placement on FintechPressHub is more than a backlink — it&rsquo;s
                positioning in front of the buyers, builders, and operators
                shaping the next decade of financial services.
              </p>
              <div className="space-y-5">
                {benefits.map((b) => (
                  <div
                    key={b.title}
                    className="flex gap-4"
                    data-testid={`benefit-${b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    <div className="shrink-0 bg-primary/10 p-3 rounded-xl h-fit">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-border/60">
                <img
                  src={aboutOfficeImg}
                  alt="Editorial team reviewing a fintech guest pitch"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--primary))]/40 via-transparent to-transparent"
                />
              </div>
              <a
                href="#pitch-form"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("pitch-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                data-testid="link-jump-to-form"
                className="absolute -bottom-6 right-6 md:-bottom-8 md:right-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm md:text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Send className="w-4 h-4" />
                Submit Your Guest Post
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Topics grid */}
      <section className="py-24 bg-secondary/30 border-y border-border/60" id="topics">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">
                What we publish
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Contribute to FintechPressHub: Guest Post Topics We&rsquo;re
                Looking For
              </h2>
            </div>
            <p className="text-muted-foreground self-end">
              Pick a category, then pitch a sharp, data-backed angle. Off-niche
              submissions (general marketing, crypto trading tips, generic
              business advice) are auto-rejected.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topicCategories.map((cat) => (
              <button
                key={cat.title}
                type="button"
                onClick={() => handleTopicCardClick(cat.title)}
                aria-label={`Pitch a ${cat.title} article — pre-fill the form below`}
                data-testid={`topic-${cat.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="group text-left rounded-2xl bg-card border border-border/70 p-6 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {cat.title}
                  </h3>
                  <ArrowRight
                    aria-hidden="true"
                    className="w-4 h-4 mt-1 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <ul className="space-y-2">
                  {cat.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Pitch this topic
                  <ArrowRight aria-hidden="true" className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>

          {/* What we don't accept */}
          <div
            className="mt-12 rounded-2xl border border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/50 p-6 sm:p-8 shadow-sm"
            data-testid="not-accepted-callout"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                <X className="h-5 w-5" strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-red-900 dark:text-red-200 mb-2">
                  Topics We Don&rsquo;t Accept
                </h3>
                <p className="text-sm sm:text-base text-foreground/90 mb-4">
                  Our editorial scope was tightened in 2026. The categories
                  below are auto-rejected regardless of writing quality or
                  backlink offer — please do not pitch them.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <X
                      className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                      strokeWidth={2.5}
                    />
                    <span>
                      <strong>Cryptocurrency</strong> — token launches,
                      exchanges, on-chain trading, DeFi yield, NFT marketing
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X
                      className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                      strokeWidth={2.5}
                    />
                    <span>
                      <strong>Stablecoins</strong> — issuer marketing, reserve
                      attestations, on/off-ramp UX, tokenized treasuries
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X
                      className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                      strokeWidth={2.5}
                    />
                    <span>
                      <strong>Crypto-adjacent</strong> — Web3 marketing, wallet
                      UX, custody platforms, MiCA / GENIUS Act takes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X
                      className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                      strokeWidth={2.5}
                    />
                    <span>
                      <strong>General off-niche</strong> — generic marketing,
                      gambling, adult, payday, CBD, and other YMYL-risky verticals
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guidelines grid */}
      <section className="py-24" id="guidelines">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">
              Before you submit
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Guidelines for Submitting Guest Blog Posts With Us
            </h2>
            <p className="text-muted-foreground">
              Pitches that hit every line below get prioritised review. The full
              style guide is in our{" "}
              <Link
                href="/editorial-guidelines"
                className="text-primary font-semibold hover:underline"
              >
                Editorial Standards
              </Link>
              .
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {guidelines.map((g) => (
              <div
                key={g.title}
                data-testid={`guideline-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="rounded-2xl bg-card border border-border/70 p-6 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="bg-primary/10 p-2.5 rounded-xl w-fit mb-4">
                  <g.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">{g.title}</h3>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl bg-red-50 border border-red-100 p-6 text-red-900 max-w-3xl mx-auto">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> What we do NOT accept
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-red-600 font-bold">×</span> Generic
                marketing advice
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-600 font-bold">×</span> Promotional
                press releases
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-600 font-bold">×</span> Casino, CBD or
                payday loan links
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-600 font-bold">×</span> Plagiarised or
                AI-spun content
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pitch form */}
      <section className="py-24 bg-secondary/30 border-t border-border/60" id="pitch-form">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">
              Pitch us
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Send your guest post idea
            </h2>
            <p className="text-muted-foreground">
              Editors review every pitch within 5–7 business days.
            </p>
          </div>
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
