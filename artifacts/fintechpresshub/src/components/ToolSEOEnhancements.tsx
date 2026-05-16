import { useState } from "react";
import { Link } from "wouter";
import { Code, Copy, Check, Shield, Clock, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface ToolUseCase {
  industry: string;
  role: string;
  benefit: string;
}

export interface ToolSEOEnhancementsProps {
  toolSlug: string;
  toolName: string;
  methodologyTitle: string;
  methodologyText: string;
  accuracyNote: string;
  lastUpdated: string;
  processingNote: string;
  useCases: ToolUseCase[];
}

/**
 * Shared section rendered at the bottom of every free tool page.
 *
 * Covers four SEO categories in a single composable component:
 *  - Programmatic SEO   → "Who Uses This Tool?" industry use-case cards
 *  - White Hat SEO      → Methodology & Transparency section + last-updated + privacy notice
 *  - Off-Page SEO       → Embed Widget (iframe code) enabling external sites to link back
 *  - On-Page SEO        → Visible crawlable HTML headings and content for Googlebot
 */
export function ToolSEOEnhancements({
  toolSlug,
  toolName,
  methodologyTitle,
  methodologyText,
  accuracyNote,
  lastUpdated,
  processingNote,
  useCases,
}: ToolSEOEnhancementsProps) {
  const [copied, setCopied] = useState(false);
  const toolUrl = `https://fintechpresshub.com/tools/${toolSlug}`;
  const iframeCode =
    `<iframe\n` +
    `  src="${toolUrl}"\n` +
    `  width="100%"\n` +
    `  height="720"\n` +
    `  frameborder="0"\n` +
    `  title="${toolName} — FintechPressHub"\n` +
    `  loading="lazy"\n` +
    `  allow="clipboard-write"\n` +
    `></iframe>`;

  function copyEmbed() {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="border-t border-slate-100 pt-12 space-y-14">

      {/* ── Who Uses This Tool — Programmatic SEO ───────────────────────────── */}
      <section
        aria-labelledby={`use-cases-${toolSlug}`}
        className="container mx-auto px-4 max-w-3xl"
      >
        <h2
          id={`use-cases-${toolSlug}`}
          className="text-xl font-bold text-slate-900 mb-2"
        >
          Who Uses the {toolName}?
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          The {toolName} is used across fintech verticals — from payments
          infrastructure companies to challenger banks and regulatory-technology
          firms. Here is how different teams apply it in practice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {useCases.map((uc) => (
            <Card
              key={uc.industry}
              className="border border-slate-100 shadow-sm hover:border-[#0052FF]/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-[#0052FF] uppercase tracking-wider mb-1">
                  {uc.industry}
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1.5">
                  {uc.role}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {uc.benefit}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Methodology & Transparency — White Hat SEO ──────────────────────── */}
      <section
        aria-labelledby={`methodology-${toolSlug}`}
        className="bg-slate-50 py-10"
      >
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2
              id={`methodology-${toolSlug}`}
              className="text-xl font-bold text-slate-900"
            >
              {methodologyTitle}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {methodologyText}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {accuracyNote}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last updated: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{processingNote}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Embed Widget — Off-Page SEO ──────────────────────────────────────── */}
      <section
        aria-labelledby={`embed-${toolSlug}`}
        className="container mx-auto px-4 max-w-3xl pb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-5 h-5 text-[#0052FF]" />
          <h2
            id={`embed-${toolSlug}`}
            className="text-xl font-bold text-slate-900"
          >
            Embed This Tool on Your Site
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Add the {toolName} to your own fintech blog or resource hub for free.
          Copy the code below and paste it into your page HTML.
        </p>
        <div className="relative bg-slate-900 rounded-xl p-4 mb-3">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all pr-20">
            {iframeCode}
          </pre>
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          <p>
            Free to embed on any site. No attribution required, though a link
            to{" "}
            <Link
              href="/tools"
              className="underline underline-offset-2 hover:text-slate-900"
            >
              FintechPressHub Tools
            </Link>{" "}
            is appreciated. All calculations happen client-side — no user data
            is transmitted to our servers.
          </p>
        </div>
      </section>

    </div>
  );
}
