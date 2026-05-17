import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { SITE_URL } from "@/lib/metaData";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

const SECTIONS = [
  {
    heading: "Core Pages",
    links: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About FintechPressHub" },
      { href: "/services", label: "Fintech SEO Services" },
      { href: "/pricing", label: "Pricing Plans" },
      { href: "/contact", label: "Contact Us" },
      { href: "/press", label: "Press & Media" },
      { href: "/status", label: "System Status" },
    ],
  },
  {
    heading: "Services",
    links: [
      { href: "/services/off-page-seo", label: "Off-Page SEO" },
      { href: "/services/content-marketing", label: "Content Marketing" },
      { href: "/services/technical-seo", label: "Technical SEO" },
      { href: "/services/off-page-seo/for-payments-fintechs", label: "Off-Page SEO for Payments Fintechs" },
      { href: "/services/off-page-seo/for-embedded-finance", label: "Off-Page SEO for Embedded Finance" },
      { href: "/services/off-page-seo/for-neobanks", label: "Off-Page SEO for Neobanks" },
      { href: "/services/off-page-seo/for-regtech", label: "Off-Page SEO for Regtech" },
      { href: "/services/content-marketing/for-wealthtech", label: "Content Marketing for Wealthtech" },
      { href: "/services/content-marketing/for-consumer-lending", label: "Content Marketing for Consumer Lending" },
      { href: "/services/content-marketing/for-insurtech", label: "Content Marketing for Insurtech" },
      { href: "/services/technical-seo/for-fintech-saas", label: "Technical SEO for Fintech SaaS" },
      { href: "/services/technical-seo/for-b2b-payments", label: "Technical SEO for B2B Payments" },
      { href: "/services/technical-seo/for-open-banking", label: "Technical SEO for Open Banking" },
    ],
  },
  {
    heading: "Comparisons",
    links: [
      { href: "/compare", label: "All Comparisons" },
      { href: "/compare/agency-vs-in-house", label: "Agency vs In-House" },
      { href: "/compare/content-led-vs-paid", label: "Content-Led SEO vs Paid Search" },
      { href: "/compare/vs-freelancers", label: "Agency vs Freelancers" },
      { href: "/compare/specialist-vs-generalist", label: "Specialist vs Generalist Agency" },
      { href: "/compare/seo-vs-pr", label: "SEO vs PR" },
    ],
  },
  {
    heading: "Blog",
    links: [
      { href: "/blog", label: "All Blog Posts" },
      { href: "/blog/category/seo-strategy", label: "SEO Strategy" },
      { href: "/blog/category/link-building", label: "Link Building" },
      { href: "/blog/category/content-marketing", label: "Content Marketing" },
      { href: "/blog/category/technical-seo", label: "Technical SEO" },
    ],
  },
  {
    heading: "Free Tools",
    links: [
      { href: "/tools", label: "All Free Tools" },
      { href: "/tools/financial-health-score-calculator", label: "Financial Health Score Calculator" },
      { href: "/tools/meta-description-generator", label: "Meta Description Generator" },
      { href: "/tools/guest-post-pitch-generator", label: "Guest Post Pitch Generator" },
      { href: "/tools/readability-checker", label: "Readability Checker" },
      { href: "/tools/keyword-difficulty-estimator", label: "Keyword Difficulty Estimator" },
      { href: "/tools/backlink-value-estimator", label: "Backlink Value Estimator" },
      { href: "/tools/content-brief-generator", label: "Content Brief Generator" },
      { href: "/tools/headline-analyzer", label: "Headline Analyzer" },
      { href: "/tools/link-prospector", label: "Link Prospector" },
      { href: "/tools/outreach-email-generator", label: "Outreach Email Generator" },
    ],
  },
  {
    heading: "Glossary",
    links: [
      { href: "/glossary", label: "Fintech Glossary (All Terms)" },
    ],
  },
  {
    heading: "Locations",
    links: [
      { href: "/locations", label: "All Locations" },
    ],
  },
  {
    heading: "Write For Us",
    links: [
      { href: "/write-for-us", label: "Write For Us" },
      { href: "/write-for-us/payments-infrastructure", label: "Guest Posts: Payments Infrastructure" },
      { href: "/write-for-us/embedded-finance", label: "Guest Posts: Embedded Finance" },
      { href: "/write-for-us/open-banking", label: "Guest Posts: Open Banking & PSD3" },
      { href: "/write-for-us/neobanking", label: "Guest Posts: Neobanking" },
      { href: "/write-for-us/bnpl-consumer-lending", label: "Guest Posts: BNPL & Consumer Lending" },
      { href: "/write-for-us/regtech-compliance", label: "Guest Posts: Regtech & Compliance" },
      { href: "/write-for-us/fintech-seo-content", label: "Guest Posts: Fintech SEO & Content" },
    ],
  },
  {
    heading: "Authors",
    links: [
      { href: "/authors", label: "All Authors" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/reading-list", label: "Reading List" },
      { href: "/resources/fintech-publications", label: "Fintech Publications" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookie-policy", label: "Cookie Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/editorial-guidelines", label: "Editorial Guidelines" },
      { href: "/community-guidelines", label: "Community Guidelines" },
    ],
  },
  {
    heading: "XML Sitemaps",
    links: [
      { href: "/sitemap_index.xml", label: "Sitemap Index", external: true },
      { href: "/sitemap.xml", label: "Pages Sitemap", external: true },
      { href: "/sitemap-blog.xml", label: "Blog Sitemap", external: true },
      { href: "/sitemap-glossary.xml", label: "Glossary Sitemap", external: true },
      { href: "/sitemap-tools.xml", label: "Tools Sitemap", external: true },
    ],
  },
];

export default function SitemapHub() {
  const canonical = `${SITE_URL}/sitemap`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="HTML Sitemap — All Pages | FintechPressHub"
        description="A complete, human-readable sitemap of FintechPressHub — all services, blog posts, tools, glossary terms, comparison pages, and legal documents in one place."
        canonical={canonical}
        webPage={{
          dateModified: "2026-05-17",
          about: ["Sitemap", "FintechPressHub", "Fintech SEO"],
          isAccessibleForFree: true,
        }}
      />

      <PageHero
        eyebrow="Navigation"
        title="HTML Sitemap"
        description="Every page on FintechPressHub — organised by category for quick navigation."
      />

      <div className="container mx-auto px-4 max-w-5xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                {section.heading}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#0052FF] hover:underline"
                      >
                        {link.label}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-[#0052FF] hover:underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-muted-foreground">
            For machine-readable sitemaps, see the{" "}
            <a href="/sitemap_index.xml" className="text-[#0052FF] hover:underline">
              XML Sitemap Index
            </a>
            .{" "}
            Last updated: <time dateTime="2026-05-17">May 2026</time>.
          </p>
        </div>
      </div>
    </div>
  );
}
