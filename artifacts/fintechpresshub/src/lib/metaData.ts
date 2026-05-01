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
  authors: "Authors",
  tools: "Tools",
  "financial-health-score-calculator": "Financial Health Score Calculator",
  "content-roi-calculator": "Content ROI Calculator",
  "meta-description-generator": "Meta Description Generator",
  "guest-post-pitch-generator": "Guest Post Pitch Generator",
  "readability-checker": "Readability Checker",
  "content-calendar-generator": "Content Calendar Generator",
  "write-for-us": "Write For Us",
  contact: "Contact",
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Refund Policy",
  "cookie-policy": "Cookie Policy",
  terms: "Terms",
  "editorial-guidelines": "Editorial Guidelines",
  "community-guidelines": "Community Guidelines",
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
    title: "Terms and Conditions | FintechPressHub",
    description:
      "The terms governing use of the FintechPressHub website and services.",
  },
  editorialGuidelines: {
    title: "Editorial Guidelines | FintechPressHub",
    description:
      "The standards we hold our writers, guest contributors, and client deliverables to — accuracy, sourcing, AI usage, tone, and compliance.",
  },
  communityGuidelines: {
    title: "Community Guidelines | FintechPressHub",
    description:
      "Standards of conduct, content quality, and IP expectations for every contributor and community participant on FintechPressHub.",
  },
  tools: {
    title: "Free Fintech Marketing Tools | FintechPressHub",
    description:
      "Free, browser-based tools for fintech marketers and SEO teams — calculators, generators, and checkers. No sign-up required.",
  },
  financialHealthCalculator: {
    title: "Financial Health Score Calculator | Debt-to-Income Checker",
    description:
      "Free Financial Health Score Calculator. Get your 0–100 score instantly with a debt-to-income ratio check, savings rate, emergency fund coverage, and personalized tips.",
  },
  contentRoiCalculator: {
    title: "Content ROI Calculator | Free Fintech Marketing Tool",
    description:
      "Estimate the revenue impact of your fintech content marketing. Enter traffic, conversion rate, and deal size to see projected ROI, net revenue, and payback period.",
  },
  metaDescriptionGenerator: {
    title: "Meta Description Generator for Fintech | Free SEO Tool",
    description:
      "Generate 3 ready-to-use SEO meta descriptions for any fintech page. Enter your title and keyword — no sign-up needed.",
  },
  guestPostPitchGenerator: {
    title: "Guest Post Pitch Generator | Free Fintech Link Building Tool",
    description:
      "Create a personalised guest post pitch email in seconds. Fill in your details and get a ready-to-copy pitch for any fintech publication.",
  },
  readabilityChecker: {
    title: "Readability Checker for Fintech Content | Free Tool",
    description:
      "Paste your fintech article and get an instant Flesch readability score, grade level, and actionable tips to make your content clearer.",
  },
  contentCalendarGenerator: {
    title: "Fintech Content Calendar Generator | Free Editorial Planner",
    description:
      "Build a 30, 60, or 90-day fintech content calendar in seconds. Choose your topics, cadence, and format — then export to CSV or copy into Notion.",
  },
  adminServices: {
    title: "Admin · Services | FintechPressHub",
    description: "Manage services.",
  },
  adminBlog: {
    title: "Admin · Blog | FintechPressHub",
    description: "Publish new blog posts.",
  },
  adminCommissioningTopics: {
    title: "Admin · Commissioning Topics | FintechPressHub",
    description: "Curate the topics shown on the Write For Us page.",
  },
  adminNewsletter: {
    title: "Admin · Newsletter | FintechPressHub",
    description:
      "Master list of newsletter subscribers with daily signups and CSV export.",
  },
  adminModeration: {
    title: "Admin · Moderation Inbox | FintechPressHub",
    description: "Review guest post pitch submissions and contact enquiries.",
  },
  notFound: {
    title: "Page Not Found | FintechPressHub",
    description: "The page you are looking for could not be found.",
  },
  status: {
    title: "System Status | FintechPressHub",
    description:
      "Live status of FintechPressHub services — site, database, email transport, and demo content.",
  },
} as const satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof PAGE_META;
