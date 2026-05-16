import { Link } from "wouter";
import { SITE_URL } from "@/lib/metaData";
import { motion } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prefetchRoute } from "@/lib/route-prefetch";
import {
  Calculator,
  TrendingUp,
  FileText,
  Send,
  BookOpen,
  BarChart2,
  Link2,
  FileEdit,
  Newspaper,
  ArrowRight,
  Search,
  Mail,
} from "lucide-react";

const TOOLS = [
  {
    href: "/tools/financial-health-score-calculator",
    icon: Calculator,
    color: "bg-blue-50 text-blue-600",
    badge: "Finance",
    title: "Financial Health Score Calculator",
    description:
      "Get a 0–100 snapshot of your financial health in under a minute. We calculate your debt-to-income ratio, savings rate, emergency fund coverage, and more.",
  },
  {
    href: "/tools/meta-description-generator",
    icon: FileText,
    color: "bg-purple-50 text-purple-600",
    badge: "SEO",
    title: "Meta Description Generator",
    description:
      "Generate 3 ready-to-use SEO meta descriptions for any professional page. Enter your page title and target keyword to get started.",
  },
  {
    href: "/tools/guest-post-pitch-generator",
    icon: Send,
    color: "bg-orange-50 text-orange-600",
    badge: "Link Building",
    title: "Guest Post Pitch Generator",
    description:
      "Create a compelling, personalised guest post pitch email in seconds. Fill in a few details about your company and target publication.",
  },
  {
    href: "/tools/readability-checker",
    icon: BookOpen,
    color: "bg-teal-50 text-teal-600",
    badge: "Content",
    title: "Readability Checker",
    description:
      "Paste your article and get an instant Flesch readability score, grade level, sentence length breakdown, and actionable tips.",
  },
  {
    href: "/tools/keyword-difficulty-estimator",
    icon: BarChart2,
    color: "bg-violet-50 text-violet-600",
    badge: "SEO",
    title: "Keyword Difficulty Estimator",
    description:
      "Enter any keyword to get an estimated difficulty score, search intent classification, volume range, and 6 long-tail variations.",
  },
  {
    href: "/tools/backlink-value-estimator",
    icon: Link2,
    color: "bg-emerald-50 text-emerald-600",
    badge: "Link Building",
    title: "Backlink Value Estimator",
    description:
      "Enter a referring domain's DA, traffic, and niche relevance to get an SEO value score out of 100 — with a breakdown and risk flags.",
  },
  {
    href: "/tools/content-brief-generator",
    icon: FileEdit,
    color: "bg-rose-50 text-rose-600",
    badge: "Content",
    title: "Content Brief Generator",
    description:
      "Enter a keyword and target audience to get a full professional article brief — H2s, meta copy, tone guidelines, FAQ suggestions, and internal link opportunities.",
  },
  {
    href: "/tools/headline-analyzer",
    icon: Newspaper,
    color: "bg-indigo-50 text-indigo-600",
    badge: "Content",
    title: "Headline Analyzer",
    description:
      "Score any professional headline out of 100 across clarity, keyword presence, emotional pull, and character count — with 3 instant rewrite suggestions.",
  },
  {
    href: "/tools/link-prospector",
    icon: Search,
    color: "bg-cyan-50 text-cyan-600",
    badge: "Link Building",
    title: "Link Prospector",
    description:
      "Paste up to 50 domains (with optional DA and traffic) to bulk-score your backlink prospects — then rank by highest SEO value or easiest win for monthly outreach planning.",
  },
  {
    href: "/tools/outreach-email-generator",
    icon: Mail,
    color: "bg-blue-50 text-blue-600",
    badge: "Link Building",
    title: "Outreach Email Generator",
    description:
      "Generate a personalised link-building outreach email in seconds. Choose from Professional, Conversational, or Data-Led tone — ready to copy and send.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07 },
  }),
};

export default function ToolsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="tools"
        itemList={{
          name: "Free Fintech Marketing Tools",
          description:
            "Free, browser-based tools for fintech marketers and SEO teams. No sign-up required.",
          items: TOOLS.map((t) => ({
            name: t.title,
            url: `${SITE_URL}${t.href}`,
            description: t.description,
          })),
        }}
        speakableSelectors={["h1", ".speakable-summary", "h2"]}
        webPage={{
          datePublished:        "2024-01-01",
          dateModified:         "2026-05-16",
          conditionsOfAccess:   "https://schema.org/OnlineAccess",
          usageInfo:            `${SITE_URL}/terms`,
          isAccessibleForFree:  true,
          accessibilityFeature: ["alternativeText", "structuredNavigation"],
        }}
        faq={[
          {
            question: "What free fintech marketing tools does FintechPressHub offer?",
            answer:   "FintechPressHub offers 10 free browser-based tools: Financial Health Score Calculator, Meta Description Generator, Guest Post Pitch Generator, Readability Checker, Keyword Difficulty Estimator, Backlink Value Estimator, Content Brief Generator, Headline Analyzer, Link Prospector, and Outreach Email Generator — all free, no sign-up required.",
          },
          {
            question: "Are the FintechPressHub tools free to use?",
            answer:   "Yes. All 10 tools are completely free with no account, sign-up, or payment required. All calculations run client-side in your browser — no data is transmitted to FintechPressHub servers.",
          },
          {
            question: "Who are the FintechPressHub free tools designed for?",
            answer:   "The tools are designed for fintech marketing professionals, SEO managers, content strategists, link-building specialists, and in-house marketing teams at fintech, payments, lending, and banking-infrastructure companies.",
          },
          {
            question: "Can I embed FintechPressHub tools on my own website?",
            answer:   "Yes. Every tool includes an embed widget with a copy-ready iframe snippet. Embed any tool on your fintech blog or resource hub for free — an attribution backlink to FintechPressHub is included in the snippet.",
          },
          {
            question: "Do the FintechPressHub tools require JavaScript?",
            answer:   "Yes. All tools require JavaScript and a modern browser. No installation or plugin is needed — the tools run entirely in your browser with no server-side data processing.",
          },
        ]}
      />

      <PageHero
        eyebrow="Free Tools"
        title="Fintech Marketing Toolkit"
        description="Free, client-side tools built for digital marketers and SEO teams. No sign-up required — your data never leaves your browser."
      />

      <div className="container mx-auto px-4 pb-2">
        <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Ten free, browser-based tools for fintech marketers and SEO teams — covering financial health scoring, meta description generation, readability checking, keyword difficulty estimation, backlink valuation, content briefs, headline analysis, link prospecting, and outreach email generation. No sign-up required. All calculations run client-side.
        </p>
      </div>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.href}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  onMouseEnter={() => prefetchRoute(tool.href)}
                  onFocus={() => prefetchRoute(tool.href)}
                >
                  <Link href={tool.href} className="block h-full group">
                    <Card className="h-full border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
                      <CardContent className="p-6 flex flex-col gap-4 h-full">
                        <div className="flex items-start justify-between">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${tool.color}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5">
                            {tool.badge}
                          </span>
                        </div>

                        <div className="flex-1">
                          <h2 className="font-bold text-slate-900 text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                            {tool.title}
                          </h2>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {tool.description}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-start -ml-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                          tabIndex={-1}
                        >
                          Use tool
                          <ArrowRight className="ml-1 w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            All calculations happen entirely in your browser — no data is ever
            sent to our servers.
          </p>
        </div>
      </section>
    </div>
  );
}
