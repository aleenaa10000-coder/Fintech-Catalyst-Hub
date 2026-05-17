import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ALL_TOOLS: Record<string, { title: string; description: string; badge: string }> = {
  "financial-health-score-calculator": {
    title: "Financial Health Score Calculator",
    badge: "Finance",
    description: "Get a 0–100 snapshot of your financial health in under a minute.",
  },
  "meta-description-generator": {
    title: "Meta Description Generator",
    badge: "SEO",
    description: "Generate 3 ready-to-use SEO meta descriptions for any professional page.",
  },
  "guest-post-pitch-generator": {
    title: "Guest Post Pitch Generator",
    badge: "Link Building",
    description: "Create a compelling, personalised guest post pitch email in seconds.",
  },
  "readability-checker": {
    title: "Readability Checker",
    badge: "Content",
    description: "Get an instant Flesch readability score, grade level, and actionable tips.",
  },
  "keyword-difficulty-estimator": {
    title: "Keyword Difficulty Estimator",
    badge: "SEO",
    description: "Estimated difficulty score, search intent, volume range, and long-tail variations.",
  },
  "backlink-value-estimator": {
    title: "Backlink Value Estimator",
    badge: "Link Building",
    description: "Score any referring domain's SEO value out of 100 with risk flags.",
  },
  "content-brief-generator": {
    title: "Content Brief Generator",
    badge: "Content",
    description: "Full professional article brief with H2s, meta copy, and FAQ suggestions.",
  },
  "headline-analyzer": {
    title: "Headline Analyzer",
    badge: "Content",
    description: "Score any headline out of 100 with 3 instant rewrite suggestions.",
  },
  "link-prospector": {
    title: "Link Prospector",
    badge: "Link Building",
    description: "Bulk-score up to 50 backlink prospects and rank by SEO value.",
  },
  "outreach-email-generator": {
    title: "Outreach Email Generator",
    badge: "Link Building",
    description: "Generate a personalised link-building outreach email in seconds.",
  },
};

const BADGE_COLORS: Record<string, string> = {
  Finance: "bg-blue-100 text-blue-700",
  SEO: "bg-purple-100 text-purple-700",
  "Link Building": "bg-emerald-100 text-emerald-700",
  Content: "bg-rose-100 text-rose-700",
};

interface RelatedToolsProps {
  currentSlug: string;
  relatedSlugs: string[];
}

export function RelatedTools({ currentSlug, relatedSlugs }: RelatedToolsProps) {
  const tools = relatedSlugs
    .filter((s) => s !== currentSlug && ALL_TOOLS[s])
    .slice(0, 3);

  if (tools.length === 0) return null;

  return (
    <section className="py-12 border-t border-slate-100 bg-slate-50/50">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Related Tools</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          More free tools from FintechPressHub — no sign-up required.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tools.map((slug) => {
            const tool = ALL_TOOLS[slug];
            return (
              <Link key={slug} href={`/tools/${slug}`}>
                <Card className="h-full hover:border-[#0052FF] hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_COLORS[tool.badge] ?? "bg-slate-100 text-slate-600"}`}>
                        {tool.badge}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#0052FF] transition-colors" />
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#0052FF] transition-colors leading-snug">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <div className="text-center mt-6">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-[#0052FF] hover:underline font-medium">
            View all 10 free tools
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
