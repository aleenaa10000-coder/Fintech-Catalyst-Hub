import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  RotateCcw,
  DollarSign,
  Users,
  MousePointerClick,
  Percent,
  ArrowLeft,
} from "lucide-react";

type Inputs = {
  monthlyTraffic: string;
  conversionRate: string;
  avgDealSize: string;
  contentCost: string;
  timeframeMonths: string;
};

const DEFAULTS: Inputs = {
  monthlyTraffic: "",
  conversionRate: "",
  avgDealSize: "",
  contentCost: "",
  timeframeMonths: "12",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtX(n: number) {
  return `${n.toFixed(1)}x`;
}

export default function ContentROICalculator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);

  const setField =
    (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setInputs((prev) => ({ ...prev, [key]: e.target.value }));

  const reset = () => setInputs(DEFAULTS);

  const metrics = useMemo(() => {
    const traffic = parseFloat(inputs.monthlyTraffic) || 0;
    const cvr = parseFloat(inputs.conversionRate) || 0;
    const deal = parseFloat(inputs.avgDealSize) || 0;
    const cost = parseFloat(inputs.contentCost) || 0;
    const months = parseFloat(inputs.timeframeMonths) || 12;

    const monthlyLeads = (traffic * cvr) / 100;
    const monthlyRevenue = monthlyLeads * deal;
    const totalRevenue = monthlyRevenue * months;
    const totalCost = cost * months;
    const netRevenue = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (netRevenue / totalCost) * 100 : 0;
    const roiMultiple = totalCost > 0 ? totalRevenue / totalCost : 0;
    const paybackMonths =
      monthlyRevenue > 0 && cost > 0 ? cost / monthlyRevenue : null;
    const hasData = traffic > 0 && cvr > 0 && deal > 0;

    return {
      monthlyLeads,
      monthlyRevenue,
      totalRevenue,
      totalCost,
      netRevenue,
      roi,
      roiMultiple,
      paybackMonths,
      hasData,
    };
  }, [inputs]);

  const roiColor =
    metrics.roi > 200
      ? "text-green-600"
      : metrics.roi > 0
        ? "text-blue-600"
        : "text-red-500";

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="contentRoiCalculator" />

      <PageHero
        eyebrow="Free Tool"
        title="Content ROI Calculator"
        description="Estimate the revenue impact of your content marketing investment. Plug in your traffic, conversion rate, and deal size to see projected returns."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Inputs */}
            <Card className="lg:col-span-3 border border-slate-100 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Your Numbers
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        All calculations happen in your browser.
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

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      Monthly Organic Traffic
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="5000"
                      value={inputs.monthlyTraffic}
                      onChange={setField("monthlyTraffic")}
                      className="h-11"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Average monthly visitors from organic search.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-green-600" />
                      Lead Conversion Rate (%)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="2.5"
                        value={inputs.conversionRate}
                        onChange={setField("conversionRate")}
                        className="h-11 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      % of visitors who become leads or trials.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Average Deal / LTV Value
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="3000"
                        value={inputs.avgDealSize}
                        onChange={setField("avgDealSize")}
                        className="h-11 pl-7"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Revenue per closed customer or LTV.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-green-600" />
                      Monthly Content Investment
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="2000"
                        value={inputs.contentCost}
                        onChange={setField("contentCost")}
                        className="h-11 pl-7"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Monthly spend on content creation, SEO, and distribution.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Projection Timeframe (months)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      placeholder="12"
                      value={inputs.timeframeMonths}
                      onChange={setField("timeframeMonths")}
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card className="border border-slate-100 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    Projected ROI
                  </h3>
                  {metrics.hasData ? (
                    <>
                      <motion.div
                        key={metrics.roi.toFixed(0)}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`text-5xl font-black mb-1 ${roiColor}`}
                      >
                        {metrics.roi >= 0
                          ? `+${metrics.roi.toFixed(0)}%`
                          : `${metrics.roi.toFixed(0)}%`}
                      </motion.div>
                      <p className="text-sm text-muted-foreground">
                        {fmtX(metrics.roiMultiple)} return on investment over{" "}
                        {inputs.timeframeMonths || 12} months
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Fill in your numbers to see your ROI.
                    </p>
                  )}
                </CardContent>
              </Card>

              {metrics.hasData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  {[
                    {
                      label: "Monthly leads",
                      value: metrics.monthlyLeads.toFixed(1),
                      prefix: "",
                    },
                    {
                      label: "Monthly revenue",
                      value: fmt(metrics.monthlyRevenue),
                      prefix: "",
                    },
                    {
                      label: `Total revenue (${inputs.timeframeMonths || 12}mo)`,
                      value: fmt(metrics.totalRevenue),
                      prefix: "",
                    },
                    {
                      label: `Total cost (${inputs.timeframeMonths || 12}mo)`,
                      value: fmt(metrics.totalCost),
                      prefix: "",
                    },
                    {
                      label: "Net revenue",
                      value: fmt(metrics.netRevenue),
                      prefix: "",
                    },
                  ].map(({ label, value }) => (
                    <Card key={label} className="border border-slate-100 shadow-sm">
                      <CardContent className="px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {value}
                        </span>
                      </CardContent>
                    </Card>
                  ))}

                  {metrics.paybackMonths !== null && (
                    <Card className="border border-green-100 bg-green-50 shadow-sm">
                      <CardContent className="px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-green-800 font-medium">
                          Payback period
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          {metrics.paybackMonths < 1
                            ? "< 1 month"
                            : `${metrics.paybackMonths.toFixed(1)} months`}
                        </span>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              <Card className="border border-blue-100 bg-blue-50 shadow-sm mt-auto">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Want help achieving these numbers?{" "}
                    <Link
                      href="/contact"
                      className="font-semibold underline underline-offset-2 hover:text-blue-900"
                    >
                      Talk to our team
                    </Link>{" "}
                    about fintech content strategy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
