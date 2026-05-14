import { lazy, Suspense, type ComponentType } from "react";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ExternalLink } from "lucide-react";
import { SITE_ORIGIN } from "@/lib/toolShare";

/**
 * EmbedShell — minimal chrome-free wrapper for the `/embed/:slug` route.
 *
 * Renders the same per-tool React component used at `/tools/:slug` but
 * strips the global Header / Footer / breadcrumb so the tool fits inside
 * a third-party iframe without visual conflict.
 *
 * Three SEO/UX guardrails:
 *
 *   1. `<meta name="robots" content="noindex">` — the embed URL must NOT
 *      compete with the canonical `/tools/:slug` page for ranking. We
 *      want backlinks to embeds; we do NOT want them indexed.
 *   2. `<link rel="canonical" href="/tools/:slug">` — every embed
 *      explicitly attributes ranking authority to the canonical tool page.
 *   3. **"Powered by FintechPressHub" attribution** — every embed shows a
 *      small footer with a `dofollow` link back to the tool's canonical
 *      URL. This is the backlink hook for organic off-page SEO; we keep
 *      the markup honest (visible, descriptive anchor text, not hidden).
 */

const SLUG_TO_COMPONENT: Record<string, () => Promise<{ default: ComponentType }>> = {
  "financial-health-score-calculator": () =>
    import("@/pages/tools/financial-health-score-calculator"),
  "meta-description-generator": () =>
    import("@/pages/tools/meta-description-generator"),
  "guest-post-pitch-generator": () =>
    import("@/pages/tools/guest-post-pitch-generator"),
  "readability-checker": () => import("@/pages/tools/readability-checker"),
  "keyword-difficulty-estimator": () =>
    import("@/pages/tools/keyword-difficulty-estimator"),
  "backlink-value-estimator": () =>
    import("@/pages/tools/backlink-value-estimator"),
  "content-brief-generator": () => import("@/pages/tools/content-brief-generator"),
  "headline-analyzer": () => import("@/pages/tools/headline-analyzer"),
  "link-prospector": () => import("@/pages/tools/link-prospector"),
  "outreach-email-generator": () => import("@/pages/tools/outreach-email-generator"),
};

const SLUG_TO_TITLE: Record<string, string> = {
  "financial-health-score-calculator": "Financial Health Score Calculator",
  "meta-description-generator": "Meta Description Generator",
  "guest-post-pitch-generator": "Guest Post Pitch Generator",
  "readability-checker": "Readability Checker",
  "keyword-difficulty-estimator": "Keyword Difficulty Estimator",
  "backlink-value-estimator": "Backlink Value Estimator",
  "content-brief-generator": "Content Brief Generator",
  "headline-analyzer": "Headline Analyzer",
  "link-prospector": "Link Prospector",
  "outreach-email-generator": "Outreach Email Generator",
};

export default function EmbedShell() {
  const [, params] = useRoute("/embed/:slug");
  const slug = params?.slug ?? "";
  const loader = SLUG_TO_COMPONENT[slug];

  if (!loader) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <Helmet>
          <title>Embed not found — FintechPressHub</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <h1 className="text-lg font-bold text-slate-900">Embed not found</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          That tool isn't available as an embed. Browse the full free tools
          collection on{" "}
          <a
            href={`${SITE_ORIGIN}/tools`}
            target="_blank"
            rel="noopener"
            className="text-blue-600 hover:underline"
          >
            FintechPressHub
          </a>
          .
        </p>
      </div>
    );
  }

  const Tool = lazy(loader);
  const canonical = `${SITE_ORIGIN}/tools/${slug}`;
  const title = SLUG_TO_TITLE[slug] ?? "Free FintechPressHub Tool";

  return (
    <div className="min-h-screen bg-background flex flex-col" data-embed-shell="true">
      <Helmet>
        <title>{title} — Embed</title>
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={canonical} />
        {/*
          The embed exposes a single freshness signal (now) so iframe
          hosts that prefetch metadata don't see a stale cache time.
        */}
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </Helmet>

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }>
        <Tool />
      </Suspense>

      {/*
        Attribution footer — required on every embed. Provides:
          - clear visual brand attribution for end users
          - a descriptive dofollow backlink for off-page SEO
          - a route off the embed back to the canonical tool page
      */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-3 px-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          Powered by{" "}
          <a
            href={canonical}
            target="_blank"
            rel="noopener"
            className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            FintechPressHub
            <ExternalLink className="w-3 h-3" />
          </a>
          {" "}— free fintech marketing tools, no sign-up.
        </p>
      </footer>
    </div>
  );
}
