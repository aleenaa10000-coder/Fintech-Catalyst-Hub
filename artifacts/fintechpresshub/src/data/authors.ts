export type Author = {
  slug: string;
  name: string;
  role: string;
  photo: string;
  shortBio: string;
  fullBio: string[];
  expertise: string[];
  credentials: string[];
  yearsExperience: number;
  location: string;
  social: {
    linkedin?: string;
    twitter?: string;
    website?: string;
    email?: string;
  };
};

export const authors: Author[] = [
  {
    slug: "marcus-webb",
    name: "Marcus Webb",
    role: "Head of SEO Strategy",
    photo: "/author-photos/marcus-webb.png",
    shortBio:
      "Senior SEO operator who has led organic growth programs for challenger banks, lending platforms, and B2B payments companies across the US and UK.",
    fullBio: [
      "Marcus has spent the last 12 years running SEO programs for finance and fintech brands — first in-house at two challenger banks, then leading the SEO practice at a London-based growth agency before joining FintechPressHub. His work has driven a combined nine-figure increase in organic revenue across portfolio companies in business banking, B2B payments, and SME lending.",
      "He specializes in technical SEO, featured-snippet capture, and the editorial systems required to publish at scale without sacrificing quality. He is a regular speaker at BrightonSEO and SearchLove, and his teardowns of fintech ranking patterns are referenced by SEO leads at several public neobanks.",
      "Outside of FintechPressHub, Marcus mentors operators inside the Fintech Insider community and writes a weekly notebook on Google algorithm shifts that affect regulated finance verticals.",
    ],
    expertise: [
      "Technical SEO for regulated finance",
      "Featured snippet & SERP feature capture",
      "On-page SEO for high-CPC categories",
      "Editorial workflow design",
      "Core Web Vitals optimization",
    ],
    credentials: [
      "12+ years in SEO, 9 of those in fintech",
      "Former Head of SEO at two UK challenger banks",
      "Speaker: BrightonSEO, SearchLove London, MozCon",
      "Google Analytics 4 & Search Console certified",
      "Author of the FintechSEO Quarterly benchmark report",
    ],
    yearsExperience: 12,
    location: "London, UK",
    social: {
      linkedin: "https://www.linkedin.com/in/marcuswebbseo",
      twitter: "https://twitter.com/marcuswebbseo",
    },
  },
  {
    slug: "priya-nair",
    name: "Priya Nair",
    role: "Director of Content Strategy",
    photo: "/author-photos/priya-nair.png",
    shortBio:
      "Content strategist with a decade inside fintech marketing teams. Builds topical authority programs that turn category-defining brands into the canonical organic answer.",
    fullBio: [
      "Priya leads content strategy at FintechPressHub, where she builds the topical maps and editorial calendars that take fintech brands from scattered blog posts to category-owning content engines. Before joining the team she ran content programs at a Series C wealth-tech platform and a public payments company, scaling each from inconsistent publishing to a 100+ article evergreen library.",
      "She is known for her work translating complex regulatory topics — KYC, PSD2, embedded finance compliance — into editorial that ranks and converts. Her topical-authority frameworks are now used by content leads at three publicly traded fintechs.",
      "Priya holds an MBA from INSEAD and started her career as a financial analyst at a tier-one investment bank, which informs the operator-grade rigor she brings to every content brief and pillar page.",
    ],
    expertise: [
      "Topical authority program design",
      "Pillar-and-cluster content architecture",
      "Editorial brief systems",
      "Wealth-tech and embedded finance content",
      "Long-form research and original data studies",
    ],
    credentials: [
      "10+ years in fintech content strategy",
      "MBA, INSEAD (with distinction)",
      "Former Director of Content at a public payments company",
      "Contributing writer: Sifted, Finextra, FintechFutures",
      "Built three content programs to 1M+ monthly organic sessions",
    ],
    yearsExperience: 10,
    location: "Singapore",
    social: {
      linkedin: "https://www.linkedin.com/in/priyanair",
      twitter: "https://twitter.com/priyanair",
    },
  },
  {
    slug: "james-okafor",
    name: "James Okafor",
    role: "Head of Digital PR & Link Building",
    photo: "/author-photos/james-okafor.png",
    shortBio:
      "Digital PR lead who has placed fintech bylines and data studies on Bloomberg, the FT, TechCrunch, and the entire tier-one finance press circuit.",
    fullBio: [
      "James runs the off-page SEO and digital PR practice at FintechPressHub. Over the past nine years he has secured editorial placements and dofollow backlinks for fintech clients on Bloomberg, the Financial Times, TechCrunch, American Banker, Finextra, and dozens of regional finance publications. His original-research campaigns regularly earn 40+ placements per cycle.",
      "Before agency life, James worked in-house as a journalist at a London-based finance publication, which is where he developed the editorial pitching style — short, data-led, no fluff — that drives his current placement rate. He still keeps a working list of 600+ active fintech editors and updates it weekly.",
      "He is the architect of FintechPressHub's HARO and expert-source program, which delivers an average of 12 high-DR citations per client per month in the financial-news ecosystem.",
    ],
    expertise: [
      "Digital PR for regulated finance",
      "Original research & data study campaigns",
      "Editorial pitching to tier-one finance press",
      "HARO and expert-source citations",
      "Backlink gap analysis and competitor link audits",
    ],
    credentials: [
      "9 years in digital PR, all in finance and fintech",
      "Former finance journalist (London)",
      "Placements: Bloomberg, FT, TechCrunch, American Banker",
      "Built FintechPressHub's 600+ editor relationship database",
      "Average client lift: +28 referring domains per quarter",
    ],
    yearsExperience: 9,
    location: "Lagos, Nigeria",
    social: {
      linkedin: "https://www.linkedin.com/in/jamesokafor",
      twitter: "https://twitter.com/jamesokafor",
    },
  },
  {
    slug: "sarah-chen",
    name: "Sarah Chen",
    role: "Senior Fintech Content Analyst",
    photo: "/author-photos/sarah-chen.png",
    shortBio:
      "Former equity research analyst turned fintech writer. Specializes in long-form analysis on payments, lending, and the infrastructure powering modern finance.",
    fullBio: [
      "Sarah covers payments, lending, and embedded-finance infrastructure for FintechPressHub. Her long-form pieces are read by product and growth leaders at challenger banks, lending platforms, and B2B SaaS companies that sell into financial services.",
      "She spent six years as an equity research analyst on the fintech and payments desk at a tier-one investment bank, where she covered Visa, Mastercard, Adyen, Block, and a portfolio of European challengers. That research background shows up in her writing — every claim is sourced, every chart is original, and every framework is benchmarked against publicly disclosed metrics.",
      "Sarah holds a CFA charter and has been quoted in Sifted, The Block, and the Wall Street Journal on payments-network economics and the unit economics of consumer lending.",
    ],
    expertise: [
      "Payments network economics",
      "Lending unit economics and risk models",
      "Embedded finance infrastructure",
      "Long-form analytical writing",
      "Original chart and data visualization",
    ],
    credentials: [
      "CFA charterholder",
      "6 years as a fintech equity research analyst",
      "Quoted in: Sifted, The Block, Wall Street Journal",
      "BSc Economics, London School of Economics",
      "Author of 80+ long-form fintech research articles",
    ],
    yearsExperience: 8,
    location: "New York, NY",
    social: {
      linkedin: "https://www.linkedin.com/in/sarahchenfintech",
      twitter: "https://twitter.com/sarahchenfintech",
    },
  },
  {
    slug: "daniel-reyes",
    name: "Daniel Reyes",
    role: "Embedded Finance & Open Banking Lead",
    photo: "/author-photos/daniel-reyes.png",
    shortBio:
      "Former product lead turned editor covering the BaaS, open-banking, and embedded-finance stack that powers every modern fintech go-to-market.",
    fullBio: [
      "Daniel covers embedded finance, Banking-as-a-Service, and open-banking infrastructure for FintechPressHub. Before joining the editorial team he spent six years as a product lead at a US-based BaaS provider, where he shipped the partner APIs that now sit underneath several Series B and C consumer fintechs.",
      "His writing focuses on the unglamorous middle layer of modern finance — sponsor-bank relationships, ledger architecture, KYC orchestration, BIN sponsorship economics — translated into briefs that growth and SEO teams can actually use to plan content. He's particularly known for his teardowns of public pricing pages from Unit, Treasury Prime, Synctera, and Galileo.",
      "Daniel mentors product managers transitioning into fintech through On Deck and writes a monthly newsletter on the regulatory perimeter shifts that move the BaaS market.",
    ],
    expertise: [
      "Banking-as-a-Service product strategy",
      "Open banking and PSD2/PSD3 readiness",
      "Sponsor-bank and BIN-sponsor economics",
      "Embedded-finance go-to-market content",
      "API documentation as an SEO surface",
    ],
    credentials: [
      "8 years across BaaS product and editorial",
      "Former Senior PM at a US Banking-as-a-Service platform",
      "Mentor: On Deck Fintech",
      "Speaker: Money 20/20, Finovate, Fintech Meetup",
      "Author of the FintechPressHub BaaS Pricing Index",
    ],
    yearsExperience: 8,
    location: "San Francisco, CA",
    social: {
      linkedin: "https://www.linkedin.com/in/danielreyesfintech",
      twitter: "https://twitter.com/danielreyesbaas",
    },
  },
  {
    slug: "aisha-mensah",
    name: "Aisha Mensah",
    role: "Compliance & Regtech Editor",
    photo: "/author-photos/aisha-mensah.png",
    shortBio:
      "Lawyer-turned-content-strategist who makes KYC, AML, and regulatory marketing actually rank — without losing the legal nuance compliance teams demand.",
    fullBio: [
      "Aisha leads coverage of compliance, regtech, and regulatory marketing at FintechPressHub. She trained as a financial-services lawyer in Toronto and spent four years at a global law firm advising challenger banks, money-services businesses, and crypto-asset platforms before pivoting into content strategy for the regtech vendors she used to brief.",
      "She specializes in the editorial problem most fintech marketing teams quietly fail at: producing content on KYC, AML, sanctions screening, and consumer-protection rules that satisfies both Google and a real compliance officer's red-pen review. Her review framework is now used by content leads at three publicly traded regtech vendors.",
      "Aisha sits on the editorial board of a Canadian fintech association and runs a private Slack community for compliance marketers across the EU, UK, US, and Canada.",
    ],
    expertise: [
      "KYC, AML, and sanctions-screening content",
      "Compliance-officer-safe marketing copy",
      "Regtech vendor positioning and SEO",
      "Cross-jurisdictional regulatory explainers",
      "Consumer-protection and disclosure compliance",
    ],
    credentials: [
      "JD, Osgoode Hall Law School (Canada)",
      "4 years as a financial-services regulatory lawyer",
      "Member, Canadian Lenders Association",
      "Quoted in: American Banker, Finextra, Law360",
      "Built compliance review workflows for 3 public regtech vendors",
    ],
    yearsExperience: 7,
    location: "Toronto, Canada",
    social: {
      linkedin: "https://www.linkedin.com/in/aishamensahcompliance",
      twitter: "https://twitter.com/aishamensahreg",
    },
  },
  {
    slug: "tomas-lindqvist",
    name: "Tomas Lindqvist",
    role: "BNPL & Consumer Lending Analyst",
    photo: "/author-photos/tomas-lindqvist.png",
    shortBio:
      "Former credit-risk analyst writing about BNPL, point-of-sale lending, and the unit economics that decide which consumer-credit brands survive a cycle.",
    fullBio: [
      "Tomas covers BNPL, point-of-sale lending, and consumer credit for FintechPressHub. He spent the first decade of his career as a credit-risk analyst inside a Nordic challenger bank and then at the European arm of a global BNPL provider, where he owned underwriting models for the merchant categories that drive most of the sector's loss volatility.",
      "His writing strips the marketing language out of consumer-credit narratives and replaces it with the metrics that actually matter — vintage curves, charge-off rates by cohort, take-rate compression, merchant-fee economics, funding-cost sensitivity. His quarterly BNPL benchmark report is read inside risk teams at three of the largest US and European BNPL platforms.",
      "Tomas holds a MSc in Quantitative Finance from the Stockholm School of Economics and continues to advise two early-stage consumer-lending startups on credit-risk infrastructure.",
    ],
    expertise: [
      "BNPL underwriting and vintage analysis",
      "Consumer-lending unit economics",
      "Merchant-fee and take-rate modeling",
      "Credit-risk infrastructure for early-stage lenders",
      "Funding-stack and warehouse-line content",
    ],
    credentials: [
      "MSc Quantitative Finance, Stockholm School of Economics",
      "10 years in credit risk and underwriting",
      "Former Senior Risk Analyst at a European BNPL provider",
      "Author of the FintechPressHub BNPL Benchmark Report",
      "Advisor: 2 early-stage consumer-lending startups",
    ],
    yearsExperience: 10,
    location: "Stockholm, Sweden",
    social: {
      linkedin: "https://www.linkedin.com/in/tomaslindqvistcredit",
      twitter: "https://twitter.com/tomaslindqvistx",
    },
  },
  {
    slug: "mei-tanaka",
    name: "Mei Tanaka",
    role: "Fintech SaaS Correspondent",
    photo: "/author-photos/mei-tanaka.png",
    shortBio:
      "Vertical fintech SaaS analyst covering treasury, FP&A, AP/AR, and embedded-finance platforms — focused on the operating metrics that actually predict retention and expansion.",
    fullBio: [
      "Mei leads fintech SaaS coverage at FintechPressHub, focused on the vertical software platforms that finance and operations teams actually buy: treasury management systems, FP&A, AP/AR automation, spend management, billing and revenue platforms, and the embedded-finance SaaS layer that increasingly powers them. Before joining the editorial team she was a markets reporter at a Tokyo-based finance publication and, before that, a corporate-development analyst at a top-three Japanese bank covering vertical SaaS investments.",
      "She writes the kind of fintech SaaS teardowns that go-to-market and product leaders can share internally: source-cited, primary-document-led, and grounded in the unit economics that separate durable category leaders from feature-set demos. Her quarterly fintech SaaS pricing tracker is referenced by RevOps and CFO teams at three publicly listed B2B platforms.",
      "Mei holds a CFA Level III pass and contributes to two regional fintech publications across APAC. Her monthly Fintech SaaS Brief reaches 14,000+ subscribers across CFO, RevOps, and product teams at vertical-SaaS companies.",
    ],
    expertise: [
      "Vertical fintech SaaS competitive analysis",
      "CFO, treasury & FP&A platform coverage",
      "AP/AR automation and spend management SaaS",
      "Embedded-finance SaaS landscape",
      "Fintech SaaS pricing & packaging teardowns",
    ],
    credentials: [
      "CFA Level III pass",
      "7 years across fintech SaaS markets reporting and analysis",
      "Former corporate-dev analyst, vertical SaaS, top-3 Japanese bank",
      "Contributor: Sifted Asia, regional fintech trade press",
      "14,000+ subscribers to the FintechPressHub Fintech SaaS Brief",
    ],
    yearsExperience: 7,
    location: "Tokyo, Japan",
    social: {
      linkedin: "https://www.linkedin.com/in/meitanakasaas",
      twitter: "https://twitter.com/meitanakasaas",
    },
  },
];

export function authorSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function getAuthorByName(name: string): Author | undefined {
  const slug = authorSlugFromName(name);
  return authors.find((a) => a.slug === slug);
}

export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
