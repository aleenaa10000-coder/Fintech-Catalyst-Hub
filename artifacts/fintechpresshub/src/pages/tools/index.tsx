import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  TrendingUp,
  FileText,
  Send,
  BookOpen,
  CalendarDays,
  ArrowRight,
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
    href: "/tools/content-roi-calculator",
    icon: TrendingUp,
    color: "bg-green-50 text-green-600",
    badge: "Marketing",
    title: "Content ROI Calculator",
    description:
      "Estimate the revenue impact of your content marketing investment. Enter your traffic, conversion rate, and deal size to see projected returns.",
  },
  {
    href: "/tools/meta-description-generator",
    icon: FileText,
    color: "bg-purple-50 text-purple-600",
    badge: "SEO",
    title: "Meta Description Generator",
    description:
      "Generate 3 ready-to-use SEO meta descriptions for any fintech page. Enter your page title and target keyword to get started.",
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
      "Paste your fintech article and get an instant Flesch readability score, grade level, sentence length breakdown, and actionable tips.",
  },
  {
    href: "/tools/content-calendar-generator",
    icon: CalendarDays,
    color: "bg-indigo-50 text-indigo-600",
    badge: "Planning",
    title: "Content Calendar Generator",
    description:
      "Build a 30, 60, or 90-day fintech editorial calendar in seconds. Pick your topics and cadence, then export to CSV or copy into Notion.",
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
      <PageMeta page="tools" />

      <PageHero
        eyebrow="Free Tools"
        title="Fintech Marketing Toolkit"
        description="Free, client-side tools built for fintech marketers and SEO teams. No sign-up required — your data never leaves your browser."
      />

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
