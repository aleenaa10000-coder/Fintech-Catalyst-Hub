import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
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
} from "lucide-react";
import { SITE_URL } from "@/lib/metaData";

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
    blurb: "Cash-flow fragility detected. Stabilize before you optimize.",
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
      title: "Optimize beyond the basics",
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
      "DTI is your total monthly debt payments divided by your gross or after-tax monthly income, expressed as a percentage. Most lenders consider 35% the upper limit for healthy borrowing, with 28% or below preferred for mortgage qualification.",
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
    question: "Are my numbers stored anywhere?",
    answer:
      "No. The calculator runs entirely in your browser. We never transmit, store, or log the figures you enter — refresh the page and everything is gone.",
  },
];

export default function FinancialHealthScoreCalculator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
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

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Financial Health Score Calculator",
    description:
      "A free browser-based tool that calculates a 0–100 financial health score from monthly income, expenses, debt payments, savings, emergency fund, credit card debt, loan balances, and rent or mortgage. Includes debt-to-income ratio, savings rate, expense ratio, and emergency fund coverage.",
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Personal Finance Calculator",
    operatingSystem: "All",
    browserRequirements: "Requires a modern web browser with JavaScript enabled.",
    url: `${SITE_URL}/tools/financial-health-score-calculator`,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Debt-to-Income (DTI) ratio calculation",
      "Savings rate analysis",
      "Expense ratio benchmark",
      "Emergency fund coverage in months",
      "Personalized improvement tips",
      "Client-side, no data stored",
    ],
    publisher: {
      "@type": "Organization",
      name: "FintechPressHub",
      url: SITE_URL,
    },
  };

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (metrics.score / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="financialHealthCalculator" faq={FAQS} />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema)}
        </script>
      </Helmet>

      <PageHero
        eyebrow="Free Tool"
        title={<>Financial Health Score Calculator</>}
        description="Get a 0–100 snapshot of your financial health in under a minute. We calculate your debt-to-income ratio, savings rate, expense ratio, and emergency fund coverage — then give you personalized tips on what to fix first."
      />

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
                        Enter monthly figures unless noted otherwise. All in your local currency.
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                          $
                        </span>
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
                          className="pl-7 h-11"
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

      {/* Personalized tips */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#0052FF]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Personalized Tips
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
                Enter your monthly income above to unlock personalized recommendations.
              </div>
            )}
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
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  data-testid={`faq-item-${i}`}
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:text-[#0052FF]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
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
