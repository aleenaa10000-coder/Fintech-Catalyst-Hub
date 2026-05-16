import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calculator,
  TrendingUp,
  PiggyBank,
  Wallet,
  Shield,
  CreditCard,
  Banknote,
  Home as HomeIcon,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Mail,
  Loader2,
  Send,
} from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import { trackEvent } from "@/lib/analytics";
import { readSharedState } from "@/lib/toolShare";
import { ToolShareEmbed } from "@/components/ToolShareEmbed";
import { useEmailFinancialHealthScoreReport } from "@workspace/api-client-react";

type Inputs = {
  monthlyIncome: string;
  monthlyExpenses: string;
  monthlyDebtPayments: string;
  monthlySavings: string;
  emergencyFund: string;
  creditCardDebt: string;
  loanBalance: string;
  rentMortgage: string;
};

const DEFAULTS: Inputs = {
  monthlyIncome: "",
  monthlyExpenses: "",
  monthlyDebtPayments: "",
  monthlySavings: "",
  emergencyFund: "",
  creditCardDebt: "",
  loanBalance: "",
  rentMortgage: "",
};

const FIELDS: Array<{
  key: keyof Inputs;
  label: string;
  placeholder: string;
  helper: string;
  Icon: typeof Wallet;
}> = [
  {
    key: "monthlyIncome",
    label: "Monthly Income (after tax)",
    placeholder: "5000",
    helper: "Take-home pay across all sources.",
    Icon: TrendingUp,
  },
  {
    key: "monthlyExpenses",
    label: "Monthly Expenses",
    placeholder: "3200",
    helper: "All living costs excluding savings.",
    Icon: Wallet,
  },
  {
    key: "monthlyDebtPayments",
    label: "Monthly Debt Payments",
    placeholder: "650",
    helper: "Cards, loans, BNPL — minimum payments.",
    Icon: CreditCard,
  },
  {
    key: "monthlySavings",
    label: "Monthly Savings",
    placeholder: "500",
    helper: "Amount you save or invest each month.",
    Icon: PiggyBank,
  },
  {
    key: "emergencyFund",
    label: "Emergency Fund",
    placeholder: "8000",
    helper: "Liquid cash set aside for emergencies.",
    Icon: Shield,
  },
  {
    key: "creditCardDebt",
    label: "Credit Card Debt",
    placeholder: "2400",
    helper: "Total outstanding revolving balance.",
    Icon: CreditCard,
  },
  {
    key: "loanBalance",
    label: "Loan Balance",
    placeholder: "15000",
    helper: "Auto, student, personal loans combined.",
    Icon: Banknote,
  },
  {
    key: "rentMortgage",
    label: "Rent or Mortgage",
    placeholder: "1500",
    helper: "Monthly housing payment.",
    Icon: HomeIcon,
  },
];

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

type ScoreBand = {
  label: string;
  color: string;
  ring: string;
  badge: string;
  Icon: typeof CheckCircle2;
  blurb: string;
};

const bandFor = (score: number): ScoreBand => {
  if (score >= 85)
    return {
      label: "Excellent",
      color: "#0BAC6E",
      ring: "stroke-[#0BAC6E]",
      badge: "bg-[#0BAC6E]/10 text-[#0BAC6E] border-[#0BAC6E]/30",
      Icon: CheckCircle2,
      blurb: "You're in elite financial shape — keep compounding.",
    };
  if (score >= 70)
    return {
      label: "Good",
      color: "#0052FF",
      ring: "stroke-[#0052FF]",
      badge: "bg-[#0052FF]/10 text-[#0052FF] border-[#0052FF]/30",
      Icon: CheckCircle2,
      blurb: "Solid foundation. A few small moves can push you to Excellent.",
    };
  if (score >= 55)
    return {
      label: "Fair",
      color: "#F2A516",
      ring: "stroke-[#F2A516]",
      badge: "bg-[#F2A516]/10 text-[#B5760B] border-[#F2A516]/30",
      Icon: Lightbulb,
      blurb: "On track, but key ratios need work to build real resilience.",
    };
  if (score >= 40)
    return {
      label: "Needs Attention",
      color: "#E67324",
      ring: "stroke-[#E67324]",
      badge: "bg-[#E67324]/10 text-[#E67324] border-[#E67324]/30",
      Icon: AlertTriangle,
      blurb: "Multiple stress points. Focus on the top 1–2 issues this month.",
    };
  return {
    label: "High Risk",
    color: "#D8362A",
    ring: "stroke-[#D8362A]",
    badge: "bg-[#D8362A]/10 text-[#D8362A] border-[#D8362A]/30",
    Icon: XCircle,
    blurb: "Cash-flow fragility detected. Stabilise before you optimise.",
  };
};

type Tip = { title: string; body: string };

const buildTips = (m: {
  dti: number;
  savingsRate: number;
  efMonths: number;
  expenseRatio: number;
  ccDebt: number;
  income: number;
}): Tip[] => {
  const tips: Tip[] = [];

  if (m.dti > 35) {
    tips.push({
      title: "Bring debt-to-income below 35%",
      body: `Your DTI is ${m.dti.toFixed(1)}%. Lenders treat above 35% as elevated risk. Either lift income or attack the highest-APR balance first using the avalanche method to get under the threshold.`,
    });
  } else if (m.dti > 28) {
    tips.push({
      title: "Trim DTI toward the safe zone (≤28%)",
      body: `At ${m.dti.toFixed(1)}% DTI you're approved-eligible but pricier on credit. Knocking it under 28% typically unlocks better mortgage and refinance pricing.`,
    });
  }

  if (m.savingsRate < 10) {
    tips.push({
      title: "Lift your savings rate to at least 10%",
      body: `You're saving ${m.savingsRate.toFixed(1)}% of income. Automate a transfer on payday for the gap — even 2% increases compound dramatically over a decade.`,
    });
  } else if (m.savingsRate < 20) {
    tips.push({
      title: "Push toward a 20% savings rate",
      body: `Saving ${m.savingsRate.toFixed(1)}% is healthy. The 20% benchmark is what most FIRE and retirement models assume — increase by 1% every quarter to get there painlessly.`,
    });
  }

  if (m.efMonths < 3) {
    tips.push({
      title: "Build a 3-month emergency fund",
      body: `You currently have ${m.efMonths.toFixed(1)} months of expenses set aside. Park the next savings tranche in a high-yield savings account until you cross the 3-month line — this is the single biggest lever on financial resilience.`,
    });
  } else if (m.efMonths < 6) {
    tips.push({
      title: "Extend the runway to 6 months",
      body: `${m.efMonths.toFixed(1)} months is good. If your income is variable or you're a single earner, target 6 months of essential expenses for full peace of mind.`,
    });
  }

  if (m.expenseRatio > 75) {
    tips.push({
      title: "Get expenses under 75% of income",
      body: `You're spending ${m.expenseRatio.toFixed(1)}% of income. Audit the top three discretionary categories on the last 90 days of statements — that's where most overspend hides.`,
    });
  }

  if (m.ccDebt > 0 && m.income > 0 && m.ccDebt > m.income) {
    tips.push({
      title: "Eliminate revolving credit card debt",
      body: `Card balance now exceeds one month of income. At typical APRs (20–28%), every month you carry it costs more than most index funds earn. Consider a 0% balance transfer or consolidation loan to break the cycle.`,
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: "Optimise beyond the basics",
      body: "All four core ratios are in healthy ranges. Next moves: max tax-advantaged accounts, diversify across asset classes, and review insurance coverage annually.",
    });
  }

  return tips.slice(0, 5);
};

const FAQS = [
  {
    question: "What is a financial health score?",
    answer:
      "A financial health score is a single 0–100 number that summarizes how well your monthly cash flow, debt load, savings habits, and emergency reserves work together. It is a directional indicator — not a credit score — designed to help you spot which lever to pull first.",
  },
  {
    question: "How is the debt-to-income (DTI) ratio calculated?",
    answer:
      "DTI is your total monthly debt payments divided by your after-tax monthly income, expressed as a percentage. Most lenders consider 35% the upper limit for healthy borrowing, with 28% or below preferred for mortgage qualification.",
  },
  {
    question: "How many months of emergency fund do I really need?",
    answer:
      "Three months of essential expenses is the entry-level baseline. Six months is the gold standard for single-earner households or anyone with variable income. If you're a freelancer or commission-based earner, push toward nine months.",
  },
  {
    question: "What is a healthy savings rate?",
    answer:
      "A 10% savings rate is the minimum healthy floor. 20% is the rate most retirement and FIRE models are built around. Above 20% is where serious wealth-building velocity begins.",
  },
  {
    question: "Is this calculator a substitute for financial advice?",
    answer:
      "No. This tool offers an educational snapshot only. For decisions involving taxes, investments, debt restructuring, or estate planning, consult a licensed financial professional in your jurisdiction.",
  },
  {
    question: "How do I improve my financial health score?",
    answer:
      "Target the ratio with the largest penalty first. If your DTI is above 35%, use the avalanche method to pay down the highest-APR debt. If your savings rate is below 10%, automate a fixed transfer on payday. If your emergency fund is under three months, redirect savings there before investing. Small, consistent improvements to one ratio at a time compound into a measurably higher score within 90 days.",
  },
  {
    question: "Are my numbers stored anywhere?",
    answer:
      "No. The calculator runs entirely in your browser. We never transmit, store, or log the figures you enter — refresh the page and everything is gone.",
  },
];

export default function FinancialHealthScoreCalculator() {
  // Pre-fill from a share link if present. Falls back to DEFAULTS otherwise.
  const [inputs, setInputs] = useState<Inputs>(() => readSharedState(DEFAULTS));
  const [touched, setTouched] = useState(false);

  const setField = (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs((prev) => ({ ...prev, [key]: e.target.value }));
    if (!touched) setTouched(true);
  };

  const reset = () => {
    setInputs(DEFAULTS);
    setTouched(false);
  };

  const metrics = useMemo(() => {
    const income = num(inputs.monthlyIncome);
    const expenses = num(inputs.monthlyExpenses);
    const debt = num(inputs.monthlyDebtPayments);
    const savings = num(inputs.monthlySavings);
    const ef = num(inputs.emergencyFund);
    const cc = num(inputs.creditCardDebt);
    const loan = num(inputs.loanBalance);
    const rent = num(inputs.rentMortgage);

    const dti = income > 0 ? (debt / income) * 100 : 0;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const expenseRatio = income > 0 ? (expenses / income) * 100 : 0;
    const efMonths = expenses > 0 ? ef / expenses : 0;

    let score = 100;
    let dtiPenalty = 0;
    let savingsPenalty = 0;
    let efPenalty = 0;
    let expensePenalty = 0;

    if (dti > 35) {
      dtiPenalty = Math.min(25, 15 + (dti - 35));
      score -= dtiPenalty;
    }
    if (savingsRate < 10) {
      savingsPenalty = Math.min(15, (10 - savingsRate) * 1.5);
      score -= savingsPenalty;
    }
    if (efMonths < 3) {
      efPenalty = Math.min(20, (3 - efMonths) * 5);
      score -= efPenalty;
    }
    if (expenseRatio > 75) {
      expensePenalty = Math.min(15, expenseRatio - 75);
      score -= expensePenalty;
    }

    if (income === 0) score = 0;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      income,
      expenses,
      debt,
      savings,
      ef,
      cc,
      loan,
      rent,
      dti,
      savingsRate,
      expenseRatio,
      efMonths,
      score,
      dtiPenalty,
      savingsPenalty,
      efPenalty,
      expensePenalty,
    };
  }, [inputs]);

  const showResults = touched && metrics.income > 0;
  const hasTrackedToolUseRef = useRef(false);
  useEffect(() => {
    if (showResults && !hasTrackedToolUseRef.current) {
      hasTrackedToolUseRef.current = true;
      trackEvent("Tool Used", { tool: "financial-health-score-calculator" });
    }
  }, [showResults]);
  const band = bandFor(metrics.score);
  const tips = useMemo(
    () =>
      buildTips({
        dti: metrics.dti,
        savingsRate: metrics.savingsRate,
        efMonths: metrics.efMonths,
        expenseRatio: metrics.expenseRatio,
        ccDebt: metrics.cc,
        income: metrics.income,
      }),
    [metrics],
  );

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (metrics.score / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="financialHealthCalculator"
        ogImage={`${SITE_URL}/api/og?title=${encodeURIComponent("Financial Health Score Calculator")}&category=Tools`}
        faq={FAQS}
        webPage={{
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          conditionsOfAccess:  "https://schema.org/OnlineAccess",
          usageInfo:           `${SITE_URL}/terms`,
          isAccessibleForFree: true,
          accessibilityFeature: ["alternativeText", "structuredNavigation"],
        }}
        speakableSelectors={["h1", ".speakable-summary"]}
        softwareApp={{
          name:                "Financial Health Score Calculator",
          description:         "A free browser-based tool that calculates a 0–100 financial health score from monthly income, expenses, debt payments, savings, and emergency fund. Includes debt-to-income ratio, savings rate, expense ratio, and emergency fund coverage in months.",
          applicationCategory: "FinanceApplication",
          operatingSystem:     "Web",
          url:                 `${SITE_URL}/tools/financial-health-score-calculator`,
          isAccessibleForFree: true,
          offers:              { price: "0", priceCurrency: "USD" },
          inLanguage:          "en",
          datePublished:       "2024-01-01",
          dateModified:        "2026-05-16",
          provider:            { "@id": `${SITE_URL}#organization` },
          potentialAction:     { "@type": "UseAction", target: `${SITE_URL}/tools/financial-health-score-calculator` },
          featureList: [
            "Debt-to-Income (DTI) ratio calculation",
            "Savings rate analysis",
            "Expense ratio benchmark",
            "Emergency fund coverage in months",
            "Personalised improvement tips",
            "Client-side only — no data stored",
          ],
        }}
        howTo={{
          name: "How to use the Financial Health Score Calculator",
          description:
            "Calculate your personal financial health score in under a minute using the free browser-based tool.",
          totalTime: "PT2M",
          steps: [
            {
              name: "Enter your monthly income",
              text: "Input your take-home pay after tax, including all income sources.",
            },
            {
              name: "Fill in your monthly expenses and debt payments",
              text: "Add your total living costs and minimum monthly debt payments (credit cards, loans, BNPL).",
            },
            {
              name: "Complete savings and emergency fund fields",
              text: "Enter how much you save each month and your total liquid emergency fund balance.",
            },
            {
              name: "Review your score and breakdown",
              text: "The calculator outputs a 0–100 financial health score with debt-to-income ratio, savings rate, emergency fund coverage, and personalised improvement tips.",
            },
          ],
        }}
      />

      <PageHero
        eyebrow="Free Tool"
        title={<>Financial Health Score Calculator</>}
        description="Get a 0–100 snapshot of your financial health in under a minute. We calculate your debt-to-income ratio, savings rate, expense ratio, and emergency fund coverage — then give you personalised tips on what to fix first."
      />

      <div className="container mx-auto px-4 pb-2">
        <p className="speakable-summary text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Enter your after-tax monthly income, expenses, debt payments, savings, and emergency fund balance. Your financial health score updates in real time with personalised improvement tips — all calculations run in your browser and no data is stored.
        </p>
      </div>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Inputs */}
            <Card className="lg:col-span-3 border border-slate-100 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-[#0052FF]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Your Numbers
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Enter monthly figures unless noted otherwise. All in your local currency. The Debt-to-Income (DTI) ratio used here is the global lending-industry definition (also known as the &ldquo;debt service ratio&rdquo; in UK and Commonwealth markets).
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-muted-foreground"
                    data-testid="button-reset-calculator"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reset
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  {FIELDS.map(({ key, label, placeholder, helper, Icon }) => (
                    <div key={key} className="space-y-1.5">
                      <Label
                        htmlFor={`field-${key}`}
                        className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                      >
                        <Icon className="w-4 h-4 text-[#0052FF]" />
                        {label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`field-${key}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder={placeholder}
                          value={inputs[key]}
                          onChange={setField(key)}
                          data-testid={`input-${key}`}
                          className="pl-3 h-11"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {helper}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Score gauge */}
            <Card className="lg:col-span-2 border border-slate-100 shadow-sm bg-[#0A1628] text-white overflow-hidden relative">
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <CardContent className="p-6 md:p-8 relative">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
                    Your Score
                  </div>
                  <h2 className="text-lg font-bold mb-6">
                    Financial Health Index
                  </h2>

                  <div className="relative w-[220px] h-[220px] mx-auto mb-6">
                    <svg
                      viewBox="0 0 200 200"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="14"
                      />
                      <motion.circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={band.color}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{
                          strokeDashoffset: showResults
                            ? dashOffset
                            : circumference,
                        }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        key={metrics.score}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        className="text-6xl font-extrabold tracking-tight"
                        data-testid="text-score-value"
                      >
                        {showResults ? metrics.score : "—"}
                      </motion.div>
                      <div className="text-xs uppercase tracking-wider text-white/50 mt-1">
                        out of 100
                      </div>
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${band.badge}`}
                    data-testid="text-score-label"
                  >
                    <band.Icon className="w-3.5 h-3.5" />
                    {showResults ? band.label : "Awaiting input"}
                  </div>
                  <p className="text-sm text-white/70 mt-4 leading-relaxed min-h-[40px]">
                    {showResults
                      ? band.blurb
                      : "Start with your monthly income above to see your score."}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-3 text-left">
                  <Metric
                    label="DTI"
                    value={showResults ? `${metrics.dti.toFixed(1)}%` : "—"}
                    caption="≤35% healthy"
                    flagged={showResults && metrics.dti > 35}
                  />
                  <Metric
                    label="Savings Rate"
                    value={
                      showResults ? `${metrics.savingsRate.toFixed(1)}%` : "—"
                    }
                    caption="≥10% target"
                    flagged={showResults && metrics.savingsRate < 10}
                  />
                  <Metric
                    label="Emergency Fund"
                    value={
                      showResults ? `${metrics.efMonths.toFixed(1)} mo` : "—"
                    }
                    caption="3+ months"
                    flagged={showResults && metrics.efMonths < 3}
                  />
                  <Metric
                    label="Expense Ratio"
                    value={
                      showResults ? `${metrics.expenseRatio.toFixed(1)}%` : "—"
                    }
                    caption="≤75% target"
                    flagged={showResults && metrics.expenseRatio > 75}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Personalised tips */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#0052FF]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Personalised Tips
                </h2>
                <p className="text-sm text-muted-foreground">
                  {showResults
                    ? "Recommendations tailored to your inputs — work top-down."
                    : "Tips will appear once you've entered your monthly income."}
                </p>
              </div>
            </div>

            {showResults ? (
              <div className="grid md:grid-cols-2 gap-4" data-testid="tips-list">
                {tips.map((tip, i) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Card className="h-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-md bg-[#0052FF] text-white flex items-center justify-center text-sm font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 mb-1.5">
                              {tip.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {tip.body}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-muted-foreground">
                Enter your monthly income above to unlock personalised recommendations.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Score band reference table */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0052FF]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  What does my score mean?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Score bands and the key ratios behind each rating.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700">Band</th>
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700">Score</th>
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700 hidden sm:table-cell">What it signals</th>
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700 hidden md:table-cell">Priority action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "Excellent",
                      range: "85–100",
                      color: "#0BAC6E",
                      signal: "All four ratios healthy; strong savings velocity.",
                      action: "Maximise tax-advantaged accounts and diversify assets.",
                    },
                    {
                      label: "Good",
                      range: "70–84",
                      color: "#0052FF",
                      signal: "Solid foundation with minor ratio gaps.",
                      action: "Close the weakest ratio first to reach Excellent.",
                    },
                    {
                      label: "Fair",
                      range: "55–69",
                      color: "#F2A516",
                      signal: "One or two ratios need improvement.",
                      action: "Focus on savings rate or emergency fund build-up.",
                    },
                    {
                      label: "Needs Attention",
                      range: "40–54",
                      color: "#E67324",
                      signal: "Multiple stress points detected.",
                      action: "Attack highest-APR debt first; automate savings.",
                    },
                    {
                      label: "High Risk",
                      range: "0–39",
                      color: "#D8362A",
                      signal: "Cash-flow fragility; high debt or zero savings.",
                      action: "Stabilise cash flow before optimising investments.",
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            color: row.color,
                            borderColor: `${row.color}40`,
                            background: `${row.color}12`,
                          }}
                        >
                          {row.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800 tabular-nums">
                        {row.range}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                        {row.signal}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                        {row.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring methodology */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[#0052FF]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  How we calculate your score
                </h2>
                <p className="text-sm text-muted-foreground">
                  Four evidence-based ratios, each carrying a proportional
                  penalty above its threshold.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700">
                      Metric
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700">
                      Healthy threshold
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-slate-700 hidden sm:table-cell">
                      Penalty formula
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold text-slate-700">
                      Max deduction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      metric: "Debt-to-Income (DTI)",
                      threshold: "≤ 35% of after-tax income",
                      formula: "15 pts at threshold, +1 pt per additional 1% (CFPB guideline)",
                      max: "25 pts",
                    },
                    {
                      metric: "Savings rate",
                      threshold: "≥ 10% of after-tax income",
                      formula: "1.5 pts deducted for every 1% below 10% (Personal Finance Council standard)",
                      max: "15 pts",
                    },
                    {
                      metric: "Emergency fund",
                      threshold: "≥ 3 months of expenses",
                      formula: "5 pts deducted for every month below 3 (FCA / mainstream PF guidance)",
                      max: "15 pts",
                    },
                    {
                      metric: "Expense ratio",
                      threshold: "≤ 75% of after-tax income",
                      formula: "1 pt deducted for every 1% above 75% (50/30/20 budgeting rule)",
                      max: "15 pts",
                    },
                  ].map((row) => (
                    <tr
                      key={row.metric}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {row.metric}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {row.threshold}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                        {row.formula}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-[#D8362A]">
                        {row.max}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Scores start at 100. Each ratio above its threshold applies a
              proportional deduction up to the cap shown. Penalties compound
              when multiple ratios are off simultaneously. All calculations run
              locally in your browser — no data is ever transmitted to our
              servers.
            </p>
          </div>
        </div>
      </section>

      {/* Benchmark comparison table */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider mb-3">
                Reference Benchmarks
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                What is a good score for each ratio?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
                Industry benchmarks used by lenders, financial planners, and regulators. Use these to interpret your results and set realistic improvement targets.
              </p>
            </div>

            {/* DTI benchmark table */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Debt-to-Income Ratio (DTI)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">DTI Range</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">Rating</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700 hidden sm:table-cell">Typical Lender View</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { range: "< 20%",    rating: "Excellent", view: "Preferred for premium mortgage rates",             action: "Maintain — focus on investing",            color: "text-emerald-600" },
                      { range: "20 – 28%", rating: "Good",      view: "Qualifies for most mortgage products",            action: "Continue reducing consumer debt",          color: "text-green-600" },
                      { range: "28 – 35%", rating: "Fair",      view: "Acceptable; some lenders add rate premium",       action: "Prioritise highest-APR debt repayment",    color: "text-yellow-600" },
                      { range: "35 – 43%", rating: "Stretched", view: "Upper limit for Qualified Mortgage (US/EU rules)", action: "Stop new credit; avalanche method",        color: "text-orange-600" },
                      { range: "> 43%",    rating: "High Risk",  view: "Most prime lenders will decline",                 action: "Seek debt consolidation advice",            color: "text-red-600" },
                    ].map((row) => (
                      <tr key={row.range} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{row.range}</td>
                        <td className={`px-5 py-3.5 font-semibold ${row.color}`}>{row.rating}</td>
                        <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{row.view}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Savings rate benchmark */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Monthly Savings Rate</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">Savings Rate</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">Rating</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700 hidden sm:table-cell">Context</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-700">Projection (30 yr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { range: "≥ 25%",   rating: "Excellent", context: "FIRE / early retirement path",            projection: "Financial independence possible by 50s",  color: "text-emerald-600" },
                      { range: "15 – 24%", rating: "Good",     context: "Standard financial planner recommendation", projection: "Comfortable retirement by 60–65",        color: "text-green-600" },
                      { range: "10 – 14%", rating: "Fair",     context: "Minimum OECD recommended floor",           projection: "Basic retirement coverage; tight margin", color: "text-yellow-600" },
                      { range: "5 – 9%",   rating: "Low",      context: "Below global median; vulnerable to shocks", projection: "Likely retirement shortfall without change",color: "text-orange-600" },
                      { range: "< 5%",    rating: "Critical",  context: "No meaningful wealth accumulation",         projection: "Dependency on state benefits likely",     color: "text-red-600" },
                    ].map((row) => (
                      <tr key={row.range} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{row.range}</td>
                        <td className={`px-5 py-3.5 font-semibold ${row.color}`}>{row.rating}</td>
                        <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{row.context}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{row.projection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Emergency fund + expense ratio */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Emergency Fund</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: "≥ 9 months",  badge: "Ideal",     badgeColor: "bg-emerald-100 text-emerald-700", note: "Self-employed / variable income" },
                    { label: "6 months",    badge: "Excellent", badgeColor: "bg-green-100 text-green-700",    note: "Single-earner household standard" },
                    { label: "3 – 5 months",badge: "Good",      badgeColor: "bg-yellow-100 text-yellow-700",  note: "Dual-income household floor" },
                    { label: "1 – 2 months",badge: "Low",       badgeColor: "bg-orange-100 text-orange-700",  note: "Build before investing" },
                    { label: "< 1 month",   badge: "Critical",  badgeColor: "bg-red-100 text-red-700",        note: "Priority: automate savings transfer" },
                  ].map((row) => (
                    <div key={row.label} className="px-5 py-3 flex items-center justify-between gap-3">
                      <span className="font-mono font-semibold text-slate-900 text-sm">{row.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.badgeColor}`}>{row.badge}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{row.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Expense Ratio (Expenses / Income)</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: "< 50%",    badge: "Excellent", badgeColor: "bg-emerald-100 text-emerald-700", note: "50/30/20 rule: well within budget" },
                    { label: "50 – 60%", badge: "Good",      badgeColor: "bg-green-100 text-green-700",    note: "Leaves meaningful surplus each month" },
                    { label: "60 – 75%", badge: "Fair",      badgeColor: "bg-yellow-100 text-yellow-700",  note: "Limited buffer; watch discretionary spend" },
                    { label: "75 – 90%", badge: "High",      badgeColor: "bg-orange-100 text-orange-700",  note: "Savings at risk; review subscriptions" },
                    { label: "> 90%",    badge: "Critical",  badgeColor: "bg-red-100 text-red-700",        note: "Spending exceeds safe threshold" },
                  ].map((row) => (
                    <div key={row.label} className="px-5 py-3 flex items-center justify-between gap-3">
                      <span className="font-mono font-semibold text-slate-900 text-sm">{row.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.badgeColor}`}>{row.badge}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{row.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Sources: CFPB Debt-to-Income guidelines; OECD Pensions Outlook; Fidelity Retirement Savings Guidelines; UK Money and Pensions Service (MaPS).
            </p>
          </div>
        </div>
      </section>

      {/* Email report */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <EmailReportCard
              showResults={showResults}
              score={metrics.score}
              label={band.label}
              metrics={{
                dti: metrics.dti,
                savingsRate: metrics.savingsRate,
                emergencyFundMonths: metrics.efMonths,
                expenseRatio: metrics.expenseRatio,
              }}
              tips={tips}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-2xl bg-[#0A1628] text-white px-8 md:px-12 py-10 md:py-12 relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,82,255,0.35) 0%, transparent 70%)",
              }}
            />
            <div className="grid md:grid-cols-2 gap-8 items-center relative">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
                  Building a fintech product around tools like this?
                </h2>
                <p className="text-white/70 leading-relaxed">
                  We help fintech brands rank for high-intent calculator and personal-finance queries with SEO, content, and digital PR built for regulated categories.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link href="/services" data-testid="link-cta-services">
                  <Button className="h-12 px-6 bg-[#0052FF] hover:bg-[#0046d6] text-white font-semibold">
                    See our services
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/contact" data-testid="link-cta-contact">
                  <Button
                    variant="outline"
                    className="h-12 px-6 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    Book a strategy call
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-xs font-semibold uppercase tracking-wider mb-3">
                FAQ
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Common questions about financial health scoring
              </h2>
            </div>
            <Accordion
              type="single"
              collapsible
              className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
            >
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  data-testid={`faq-item-${i}`}
                  className="border-b-0 group"
                >
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
        </div>
      </section>

      {/* Related tools */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Explore more free tools
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              More browser-based tools from FintechPressHub — no sign-up
              required.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  href: "/tools/meta-description-generator",
                  title: "Meta Description Generator",
                  desc: "Generate three keyword-rich meta descriptions for any page in seconds.",
                },
                {
                  href: "/tools/readability-checker",
                  title: "Readability Checker",
                  desc: "Score your content's reading level and identify clarity improvements.",
                },
                {
                  href: "/tools/keyword-difficulty-estimator",
                  title: "Keyword Difficulty Estimator",
                  desc: "Estimate how competitive a keyword is before investing in content.",
                },
                {
                  href: "/tools/headline-analyzer",
                  title: "Headline Analyser",
                  desc: "Rate your headline on clarity, sentiment, and SEO impact instantly.",
                },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card className="h-full border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0052FF]/30 transition-all cursor-pointer group">
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="font-semibold text-slate-900 group-hover:text-[#0052FF] transition-colors mb-2 leading-snug">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                        {tool.desc}
                      </p>
                      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#0052FF]">
                        Try it free
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <ToolShareEmbed slug="financial-health-score-calculator" state={inputs} />
        </div>
      </section>
    </div>
  );
}

function EmailReportCard({
  showResults,
  score,
  label,
  metrics,
  tips,
}: {
  showResults: boolean;
  score: number;
  label: string;
  metrics: {
    dti: number;
    savingsRate: number;
    emergencyFundMonths: number;
    expenseRatio: number;
  };
  tips: { title: string; body: string }[];
}) {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<
    "success" | "info" | "error" | null
  >(null);

  const mutation = useEmailFinancialHealthScoreReport({
    mutation: {
      onSuccess: (result: { delivered: boolean; deliveryStatus?: string; message: string }) => {
        setSubmitted(true);
        if (result.delivered) {
          setStatusKind("success");
        } else if (result.deliveryStatus === "skipped_no_provider") {
          setStatusKind("info");
        } else {
          setStatusKind("error");
        }
        setStatusMsg(result.message);
      },
      onError: () => {
        setSubmitted(true);
        setStatusKind("error");
        setStatusMsg(
          "Something went wrong. Please double-check your email and try again.",
        );
      },
    },
  });

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const disabled = !showResults || !isValidEmail || mutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setStatusMsg(null);
    setStatusKind(null);
    trackEvent("Email Report Requested", { tool: "financial-health-score-calculator" });
    mutation.mutate({
      data: {
        email: email.trim(),
        score,
        label,
        metrics,
        tips: tips.map((t) => ({ title: t.title, body: t.body })),
        marketingOptIn: optIn,
      },
    });
  };

  return (
    <Card
      className="border border-slate-200 shadow-sm overflow-hidden"
      data-testid="card-email-report"
    >
      <CardContent className="p-0">
        <div className="grid md:grid-cols-5">
          <div className="md:col-span-2 bg-gradient-to-br from-[#0A1628] to-[#0B2A4A] text-white p-8 md:p-10 flex flex-col justify-center">
            <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold leading-tight mb-2">
              Email me this report
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Get a polished PDF-style summary of your score, key ratios, and
              personalised tips delivered straight to your inbox — handy for
              tracking progress month over month.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#22C55E] shrink-0" />
                Your full score breakdown
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#22C55E] shrink-0" />
                All four key ratios with targets
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#22C55E] shrink-0" />
                Personalised improvement tips
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 p-8 md:p-10">
            {submitted && statusKind === "success" ? (
              <div
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
                data-testid="email-report-success"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-900 mb-1">
                      Report on its way
                    </h3>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      {statusMsg}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setStatusMsg(null);
                        setStatusKind(null);
                        setEmail("");
                      }}
                      className="mt-3 text-xs font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-700"
                    >
                      Send to another email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label
                    htmlFor="email-report-input"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Your email address
                  </Label>
                  <Input
                    id="email-report-input"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!showResults || mutation.isPending}
                    className="mt-1.5 h-11"
                    data-testid="input-email-report"
                  />
                  {!showResults && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Enter your monthly income above to enable this.
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optIn}
                    onChange={(e) => setOptIn(e.target.checked)}
                    disabled={!showResults || mutation.isPending}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF]"
                    data-testid="checkbox-email-optin"
                  />
                  <span>
                    Also send me the FintechPressHub newsletter — new fintech
                    SEO tactics, calculators, and case studies. Unsubscribe
                    anytime.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={disabled}
                  className="w-full h-11 bg-[#0052FF] hover:bg-[#0046d6] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-send-email-report"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send my report
                    </>
                  )}
                </Button>

                {statusKind === "info" && statusMsg && (
                  <div
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900"
                    data-testid="email-report-info"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{statusMsg}</span>
                    </div>
                  </div>
                )}
                {statusKind === "error" && statusMsg && (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-900"
                    data-testid="email-report-error"
                  >
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{statusMsg}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  We don't sell your data. By submitting, you agree to receive a
                  one-time report email and, if checked, the newsletter. See our{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline underline-offset-2 hover:text-slate-900"
                  >
                    privacy policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  caption,
  flagged,
}: {
  label: string;
  value: string;
  caption: string;
  flagged: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${flagged ? "border-[#D8362A]/40 bg-[#D8362A]/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
      <div
        className={`text-[10px] ${flagged ? "text-[#FF9085]" : "text-white/40"}`}
      >
        {caption}
      </div>
    </div>
  );
}
