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

/**
 * Client-side mirror of BREADCRUMB_LABELS in
 * artifacts/api-server/src/lib/seoConstants.ts.
 * Cross-package imports from api-server are not permitted in this package,
 * so this copy is maintained in parallel. When adding new URL path segments,
 * update BOTH files to keep SSR breadcrumbs (Googlebot) and client-side
 * breadcrumbs (browser) consistent.
 */
export const BREADCRUMB_LABELS: Record<string, string> = {
  about: "About",
  services: "Services",
  pricing: "Pricing",
  blog: "Blog",
  authors: "Authors",
  tools: "Free Tools",
  press: "Press",
  glossary: "Glossary",
  compare: "Comparisons",
  resources: "Resources",
  category: "Category",
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
  "write-for-us": "Write For Us",
  contact: "Contact",
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Refund Policy",
  "cookie-policy": "Cookie Policy",
  terms: "Terms",
  "editorial-guidelines": "Editorial Guidelines",
  "community-guidelines": "Community Guidelines",
  locations: "Locations",
  "fintech-publications": "Fintech Publications",
  admin: "Admin",
};

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE_URL}#logo`,
    url: `${SITE_URL}/icon-512.png`,
    contentUrl: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
    caption: SITE_NAME,
  },
  description:
    "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
  foundingDate: "2021",
  areaServed: "Worldwide",
  email: "hello@fintechpresshub.com",
  inLanguage: "en-US",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/contact`,
    email: "hello@fintechpresshub.com",
    availableLanguage: {
      "@type": "Language",
      name: "English",
      alternateName: "en",
    },
  },
  sameAs: [
    "https://twitter.com/fintechpresshub",
    "https://www.linkedin.com/company/fintechpresshub",
    "https://www.crunchbase.com/organization/fintechpresshub",
    "https://www.wikidata.org/wiki/Q130531885",
  ],
  knowsAbout: [
    "Fintech SEO",
    "Content Marketing for Fintech",
    "Link Building for Financial Services",
    "Digital PR for Fintech",
    "Payments Infrastructure",
    "Embedded Finance",
    "Open Banking",
    "Banking-as-a-Service",
    "Neobanking",
    "Buy Now Pay Later",
    "Consumer Lending",
    "SME Lending",
    "Wealthtech",
    "Robo-advisors",
    "Regtech",
    "KYC and AML Compliance",
    "PSD2 and PSD3",
    "Topical Authority in Finance",
    "Answer Engine Optimization",
    "Financial Services Marketing",
  ],
} as const;

export const PAGE_META = {
  home: {
    title: "FintechPressHub | Fintech SEO & Content Marketing Agency",
    description:
      "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
  },
  about: {
    title: "About FintechPressHub | Fintech SEO Agency",
    description:
      "FintechPressHub is a specialist fintech SEO agency built by operators who have worked inside payments, lending, and banking — not generalists learning on your account. Meet the team.",
  },
  services: {
    title: "Growth Engines for Fintech Brands | FintechPressHub",
    description:
      "Comprehensive fintech SEO, link building, and content marketing services built to compound organic growth.",
  },
  pricing: {
    title: "Transparent Fintech SEO Pricing | FintechPressHub",
    description:
      "Clear, retainer-based pricing for fintech SEO and content marketing — predictable costs with senior operators on every account.",
  },
  blog: {
    title: "Fintech SEO & Content Marketing Insights | FintechPressHub",
    description:
      "Strategy, SEO, and content marketing playbooks for fintech operators — payments, embedded finance, open banking, neobanking, lending, and regtech.",
  },
  writeForUs: {
    title: "Write For Us | FintechPressHub",
    description:
      "Pitch a guest article to FintechPressHub. We publish expert-level fintech, payments, and lending content for a 50,000+ monthly reader audience. Dofollow link included.",
  },
  contact: {
    title: "Contact Us | FintechPressHub",
    description:
      "Book a free fintech SEO audit and strategy consultation with FintechPressHub. Reach our team for content marketing, link building, and organic growth enquiries.",
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
  keywordDifficultyEstimator: {
    title: "Fintech Keyword Difficulty Estimator | Free SEO Tool",
    description:
      "Enter any fintech keyword to get an estimated difficulty score, search intent, volume range, and 6 long-tail variations — no account needed.",
  },
  backlinkValueEstimator: {
    title: "Backlink Value Estimator | Free Fintech Link Building Tool",
    description:
      "Enter a referring domain's DA, traffic, and relevance to get an SEO value score out of 100, with a full breakdown and risk flags.",
  },
  contentBriefGenerator: {
    title: "Content Brief Generator | Free Fintech Content Tool",
    description:
      "Generate a structured fintech article brief in seconds — with H2s, meta copy, tone guidelines, FAQ suggestions, and internal link opportunities.",
  },
  headlineAnalyzer: {
    title: "Headline Analyzer | Free Fintech Content Tool",
    description:
      "Score any fintech article headline out of 100 across clarity, keyword presence, emotional pull, and character count — with instant rewrite suggestions.",
  },
  linkProspector: {
    title: "Link Prospector | Free Fintech Link Building Tool",
    description:
      "Paste a list of domains to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan.",
  },
  outreachEmailGenerator: {
    title: "Outreach Email Generator | Free Fintech Link Building Tool",
    description:
      "Generate a personalised link-building outreach email in seconds. Choose your tone, fill in the details, and compare subject line variants scored on open-rate factors.",
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
  press: {
    title: "Press & Media Kit | FintechPressHub",
    description:
      "Press resources for FintechPressHub — brand assets, company boilerplate, key stats, recent coverage, and press contact details for journalists and editors.",
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
