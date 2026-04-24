export type PageMeta = {
  title: string;
  description: string;
};

export const SITE_NAME = "FintechPressHub";

export const SITE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_SITE_URL?: string } }).env
      ?.VITE_SITE_URL) ||
  "https://www.fintechpresshub.com";

export const BREADCRUMB_LABELS: Record<string, string> = {
  about: "About",
  services: "Services",
  pricing: "Pricing",
  blog: "Blog",
  "write-for-us": "Write For Us",
  contact: "Contact",
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Refund Policy",
  "cookie-policy": "Cookie Policy",
  terms: "Terms",
  "editorial-guidelines": "Editorial Guidelines",
  admin: "Admin",
};

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description:
    "Specialized content marketing and SEO agency for fintech companies.",
  sameAs: [
    "https://twitter.com/fintechpresshub",
    "https://www.linkedin.com/company/fintechpresshub",
  ],
} as const;

export const PAGE_META = {
  home: {
    title: "FintechPressHub | Fintech SEO & Content Marketing Agency",
    description:
      "Expert content marketing and off-page SEO for fintech companies.",
  },
  about: {
    title: "About FintechPressHub | Fintech SEO Agency",
    description:
      "Bridging the gap between deep fintech expertise and search visibility.",
  },
  services: {
    title: "Growth Engines for Fintech Brands",
    description:
      "Comprehensive fintech SEO, link building, and content marketing services built to compound organic growth.",
  },
  pricing: {
    title: "Transparent Fintech SEO Pricing",
    description:
      "Clear, retainer-based pricing for fintech SEO and content marketing — predictable costs with senior operators on every account.",
  },
  blog: {
    title: "Insights & Analysis | FintechPressHub",
    description:
      "Strategy, SEO, and content marketing playbooks for fintech operators.",
  },
  writeForUs: {
    title: "Write For Us | FintechPressHub",
    description: "Submit a guest post pitch to FintechPressHub.",
  },
  contact: {
    title: "Contact Us | FintechPressHub",
    description:
      "Get in touch for a free SEO audit and strategy consultation.",
  },
  privacyPolicy: {
    title: "Privacy Policy | FintechPressHub",
    description:
      "How FintechPressHub collects, uses, and protects your personal information.",
  },
  refundPolicy: {
    title: "Refund Policy | FintechPressHub",
    description:
      "Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees.",
  },
  cookiePolicy: {
    title: "Cookie Policy | FintechPressHub",
    description:
      "How FintechPressHub uses cookies and similar technologies on this website.",
  },
  terms: {
    title: "Terms of Service | FintechPressHub",
    description:
      "The terms governing use of the FintechPressHub website and services.",
  },
  editorialGuidelines: {
    title: "Editorial Guidelines | FintechPressHub",
    description:
      "The standards we hold our writers, guest contributors, and client deliverables to — accuracy, sourcing, AI usage, tone, and compliance.",
  },
  adminServices: {
    title: "Admin · Services | FintechPressHub",
    description: "Manage services.",
  },
  adminBlog: {
    title: "Admin · Blog | FintechPressHub",
    description: "Publish new blog posts.",
  },
  notFound: {
    title: "Page Not Found | FintechPressHub",
    description: "The page you are looking for could not be found.",
  },
} as const satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof PAGE_META;
