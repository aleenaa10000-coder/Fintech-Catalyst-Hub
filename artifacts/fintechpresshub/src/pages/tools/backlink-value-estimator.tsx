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
  Link2,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  Globe,
  Users,
  Target,
  ShieldCheck,
} from "lucide-react";

type FormState = {
  domain: string;
  da: string;
  traffic: string;
  relevance: string;
  linkType: "dofollow" | "nofollow";
  placement: "editorial" | "sidebar" | "footer" | "sponsored";
};

type Relevance = "high" | "medium" | "low";
type Placement = "editorial" | "sidebar" | "footer" | "sponsored";

const DEFAULTS: FormState = {
  domain: "",
  da: "",
  traffic: "",
  relevance: "high",
  linkType: "dofollow",
  placement: "editorial",
};

const RELEVANCE_LABELS: Record<Relevance, string> = {
  high: "High — directly fintech-related",
  medium: "Medium — adjacent niche (finance, tech)",
  low: "Low — unrelated niche",
};

const PLACEMENT_LABELS: Record<Placement, string> = {
  editorial: "Editorial (in article body)",
  sidebar: "Sidebar / widget",
  footer: "Footer",
  sponsored: "Sponsored / paid placement",
};

const RELEVANCE_MULTIPLIER: Record<Relevance, number> = {
  high: 1.0,
  medium: 0.65,
  low: 0.3,
};

const PLACEMENT_MULTIPLIER: Record<Placement, number> = {
  editorial: 1.0,
  sidebar: 0.55,
  footer: 0.3,
  sponsored: 0.4,
};

type Result = {
  score: number;
  label: string;
  breakdown: { factor: string; contribution: number; note: string }[];
  verdict: string;
  recommendations: string[];
  risks: string[];
};

function estimateValue(form: FormState): Result {
  const da = Math.min(100, Math.max(0, parseFloat(form.da) || 0));
  const traffic = Math.max(0, parseFloat(form.traffic) || 0);
  const relevance = form.relevance as Relevance;
  const placement = form.placement as Placement;
  const isDofollow = form.linkType === "dofollow";

  // DA contribution (0–40 pts)
  const daScore = Math.round((da / 100) * 40);

  // Traffic contribution (0–25 pts)
  let trafficScore = 0;
  if (traffic >= 500_000) trafficScore = 25;
  else if (traffic >= 100_000) trafficScore = 20;
  else if (traffic >= 50_000) trafficScore = 16;
  else if (traffic >= 10_000) trafficScore = 12;
  else if (traffic >= 1_000) trafficScore = 7;
  else if (traffic >= 100) trafficScore = 3;

  // Relevance contribution (0–20 pts)
  const relevanceScore = Math.round(20 * RELEVANCE_MULTIPLIER[relevance]);

  // Placement contribution (0–10 pts)
  const placementScore = Math.round(10 * PLACEMENT_MULTIPLIER[placement]);

  // Dofollow bonus (0–5 pts)
  const dofollowScore = isDofollow ? 5 : 0;

  const rawScore =
    daScore + trafficScore + relevanceScore + placementScore + dofollowScore;
  const score = Math.min(100, Math.round(rawScore));

  const label =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Strong"
        : score >= 40
          ? "Moderate"
          : score >= 20
            ? "Weak"
            : "Poor";

  const breakdown = [
    {
      factor: "Domain Authority",
      contribution: daScore,
      note: `DA ${da} → ${daScore}/40 pts`,
    },
    {
      factor: "Organic Traffic",
      contribution: trafficScore,
      note: `${traffic.toLocaleString()} visitors/mo → ${trafficScore}/25 pts`,
    },
    {
      factor: "Niche Relevance",
      contribution: relevanceScore,
      note: `${RELEVANCE_LABELS[relevance]} → ${relevanceScore}/20 pts`,
    },
    {
      factor: "Link Placement",
      contribution: placementScore,
      note: `${PLACEMENT_LABELS[placement]} → ${placementScore}/10 pts`,
    },
    {
      factor: "Link Type",
      contribution: dofollowScore,
      note: `${isDofollow ? "Dofollow" : "Nofollow"} → ${dofollowScore}/5 pts`,
    },
  ];

  let verdict = "";
  if (score >= 80) {
    verdict =
      "This is a high-value backlink opportunity worth prioritising. Pursue it actively.";
  } else if (score >= 60) {
    verdict =
      "A solid backlink with meaningful SEO impact. Worth the outreach effort.";
  } else if (score >= 40) {
    verdict =
      "Moderate value — useful for diversity but not a top-tier link. Pursue if low effort.";
  } else if (score >= 20) {
    verdict =
      "Limited SEO value. Only pursue if there are branding or referral traffic benefits.";
  } else {
    verdict =
      "Very low SEO impact. Not worth significant outreach resources unless traffic is the goal.";
  }

  const recommendations: string[] = [];
  if (da < 30)
    recommendations.push(
      "Prioritise sites with DA 30+ for meaningful authority transfer.",
    );
  if (traffic < 1000)
    recommendations.push(
      "Low-traffic sites pass limited referral value — focus on higher-traffic sources.",
    );
  if (relevance === "low")
    recommendations.push(
      "Off-topic links can dilute your link profile. Focus on fintech-adjacent or finance domains.",
    );
  if (placement !== "editorial")
    recommendations.push(
      "Editorial links in article bodies carry significantly more weight than sidebar or footer links.",
    );
  if (!isDofollow)
    recommendations.push(
      "Nofollow links don't pass PageRank directly — but they can still drive traffic and build brand awareness.",
    );
  if (score >= 60)
    recommendations.push(
      "Document this opportunity in your link pipeline and begin personalised outreach within the week.",
    );

  const risks: string[] = [];
  if (placement === "sponsored")
    risks.push(
      "Sponsored links must be tagged with rel='sponsored' to comply with Google's guidelines.",
    );
  if (da >= 70 && traffic < 500)
    risks.push(
      "High DA with very low traffic may indicate a link farm or PBN — verify the site's traffic history.",
    );
  if (relevance === "low" && score >= 40)
    risks.push(
      "Irrelevant high-authority links can appear unnatural in your backlink profile.",
    );

  return { score, label, breakdown, verdict, recommendations, risks };
}

const SCORE_COLOR = (s: number) =>
  s >= 80
    ? "text-green-600"
    : s >= 60
      ? "text-blue-600"
      : s >= 40
        ? "text-amber-500"
        : s >= 20
          ? "text-orange-500"
          : "text-red-500";

const SCORE_BG = (s: number) =>
  s >= 80
    ? "bg-green-50 border-green-200"
    : s >= 60
      ? "bg-blue-50 border-blue-200"
      : s >= 40
        ? "bg-amber-50 border-amber-200"
        : s >= 20
          ? "bg-orange-50 border-orange-200"
          : "bg-red-50 border-red-200";

const LABEL_ICON = (s: number) =>
  s >= 60 ? CheckCircle2 : s >= 40 ? AlertTriangle : XCircle;

export default function BacklinkValueEstimator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<Result | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setResult(null);
  };

  const estimate = () => {
    setResult(estimateValue(form));
  };

  const canEstimate =
    (parseFloat(form.da) > 0 || parseFloat(form.traffic) > 0) &&
    form.domain.trim().length > 0;

  const LabelIcon = result ? LABEL_ICON(result.score) : null;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="backlinkValueEstimator" />

      <PageHero
        eyebrow="Free Tool"
        title="Backlink Value Estimator"
        description="Enter a referring domain's metrics to get an estimated SEO value score for that backlink opportunity — scored out of 100 with a full breakdown."
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

          {/* Input card */}
          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Link Opportunity Details
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Fill in what you know — estimates work with partial data.
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
                {/* Domain */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Referring Domain <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. thefinancialbrand.com"
                    value={form.domain}
                    onChange={(e) => setField("domain", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The site that would be linking to you.
                  </p>
                </div>

                {/* DA */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    Domain Authority (DA)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="45"
                    value={form.da}
                    onChange={(e) => setField("da", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Moz DA score (0–100). Check with Moz or Ahrefs.
                  </p>
                </div>

                {/* Traffic */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Monthly Organic Traffic
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="25000"
                    value={form.traffic}
                    onChange={(e) => setField("traffic", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Estimated monthly visitors from search.
                  </p>
                </div>

                {/* Relevance */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Niche Relevance
                  </Label>
                  <div className="flex flex-col gap-1.5">
                    {(["high", "medium", "low"] as Relevance[]).map((r) => (
                      <label
                        key={r}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          form.relevance === r
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-medium"
                            : "border-border text-muted-foreground hover:border-emerald-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="relevance"
                          value={r}
                          checked={form.relevance === r}
                          onChange={() => setField("relevance", r)}
                          className="accent-emerald-600"
                        />
                        {RELEVANCE_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Placement + Link type */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      Link Placement
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      {(
                        [
                          "editorial",
                          "sidebar",
                          "footer",
                          "sponsored",
                        ] as Placement[]
                      ).map((p) => (
                        <label
                          key={p}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            form.placement === p
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-medium"
                              : "border-border text-muted-foreground hover:border-emerald-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="placement"
                            value={p}
                            checked={form.placement === p}
                            onChange={() => setField("placement", p)}
                            className="accent-emerald-600"
                          />
                          {PLACEMENT_LABELS[p]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Link Type
                    </Label>
                    <div className="flex gap-2">
                      {(["dofollow", "nofollow"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setField("linkType", t)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                            form.linkType === t
                              ? "border-emerald-400 bg-emerald-600 text-white"
                              : "border-border text-muted-foreground hover:border-emerald-300"
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={estimate}
                disabled={!canEstimate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Estimate Backlink Value
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={`${form.domain}-${result.score}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Results for {form.domain}
                </h3>

                {/* Score */}
                <Card className={`border shadow-sm ${SCORE_BG(result.score)}`}>
                  <CardContent className="p-6 flex items-center gap-6">
                    <div className="text-center min-w-[90px]">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className={`text-6xl font-black ${SCORE_COLOR(result.score)}`}
                      >
                        {result.score}
                      </motion.div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        / 100
                      </div>
                    </div>
                    <div>
                      {LabelIcon && (
                        <div
                          className={`flex items-center gap-1.5 text-base font-bold mb-1 ${SCORE_COLOR(result.score)}`}
                        >
                          <LabelIcon className="w-5 h-5" />
                          {result.label} Backlink
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.verdict}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Score breakdown */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">
                      Score Breakdown
                    </h4>
                    <div className="space-y-3">
                      {result.breakdown.map((b) => (
                        <div key={b.factor}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">
                              {b.factor}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {b.note}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(b.contribution / [40, 25, 20, 10, 5][result.breakdown.indexOf(b)]) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: result.breakdown.indexOf(b) * 0.08 }}
                              className="h-1.5 rounded-full bg-emerald-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 text-sm text-slate-700"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Risks */}
                {result.risks.length > 0 && (
                  <Card className="border border-amber-100 bg-amber-50 shadow-sm">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Watch Out For
                      </h4>
                      <ul className="space-y-2">
                        {result.risks.map((risk, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 text-sm text-amber-800"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="border border-emerald-100 bg-emerald-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Want a done-for-you fintech link building campaign?{" "}
                      <Link
                        href="/services"
                        className="font-semibold underline underline-offset-2 hover:text-emerald-900"
                      >
                        See our link building services
                      </Link>{" "}
                      or{" "}
                      <Link
                        href="/contact"
                        className="font-semibold underline underline-offset-2 hover:text-emerald-900"
                      >
                        get a free backlink audit
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
