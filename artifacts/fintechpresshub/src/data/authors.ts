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
    slug: "naledi-khumalo",
    name: "Naledi Khumalo",
    role: "Director of Content Strategy",
    photo: "/author-photos/naledi-khumalo.png",
    shortBio:
      "Content strategist with a decade inside fintech marketing teams. Builds topical authority programs and content-attribution systems that turn category-defining brands into the canonical organic answer.",
    fullBio: [
      "Naledi leads content strategy at FintechPressHub, where she builds the topical maps, editorial calendars, and content-attribution dashboards that take fintech brands from scattered blog posts to category-owning content engines with a defensible pipeline contribution. Before joining the team she ran content programs at a Series C wealth-tech platform and a Johannesburg-listed payments company, scaling each from inconsistent publishing to a 100+ article evergreen library and a multi-touch attribution model the CFO actually trusted.",
      "She is known for her work translating complex regulatory topics — KYC, PSD2, embedded finance compliance — into editorial that ranks and converts, and for the analytics frameworks she ships alongside every content program so growth and finance teams can see exactly what content contributed to pipeline. Her topical-authority and content-ROI frameworks are now used by content leads at three publicly traded fintechs.",
      "Naledi holds an MBA from London Business School and started her career as a financial analyst at a tier-one investment bank, which informs the operator-grade rigor she brings to every content brief, pillar page, and attribution review.",
    ],
    expertise: [
      "Topical authority program design",
      "Pillar-and-cluster content architecture",
      "Editorial brief systems",
      "Content marketing ROI & multi-touch attribution",
      "Wealth-tech and embedded finance content",
    ],
    credentials: [
      "10+ years in fintech content strategy and analytics",
      "MBA, London Business School (with distinction)",
      "Former Director of Content at a JSE-listed payments company",
      "Contributing writer: Sifted, Finextra, FintechFutures",
      "Built three content programs to 1M+ monthly organic sessions",
    ],
    yearsExperience: 10,
    location: "Johannesburg, South Africa",
    social: {
      linkedin: "https://www.linkedin.com/in/naledikhumalo",
      twitter: "https://twitter.com/naledikhumalo",
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
    slug: "elena-vasquez",
    name: "Elena Vasquez",
    role: "Wealth Management & Robo-Advisor Editor",
    photo: "/author-photos/elena-vasquez.png",
    shortBio:
      "Former wealth-management product lead writing about robo-advisors, model-portfolio platforms, and the digital advice stack reshaping European retail investing.",
    fullBio: [
      "Elena leads wealth-tech and robo-advisor coverage at FintechPressHub. Before joining the editorial team she spent eight years inside two of Europe's largest retail wealth managers — first as a digital advice product lead at a Madrid-based private bank, then as Head of Platform at a Series C robo-advisor where she owned the model-portfolio engine and the suitability-assessment workflow that powered onboarding for 400,000+ retail investors.",
      "Her writing focuses on the part of wealth-tech that most marketing copy ignores: the actual mechanics of model portfolios, glide paths, tax-loss harvesting, custody economics, and the MiFID II / RDR-era distribution rules that decide which platforms can scale across borders. Her quarterly European Robo-Advisor AUM tracker is referenced inside product teams at three publicly listed wealth managers.",
      "Elena holds a CFA charter and an MSc in Finance from IE Business School, and contributes regularly to two Spanish-language fintech publications.",
    ],
    expertise: [
      "Robo-advisor product and onboarding",
      "Model portfolio construction and rebalancing",
      "Retail wealth platform unit economics",
      "MiFID II distribution and suitability content",
      "Tax-loss harvesting and tax-efficient investing",
    ],
    credentials: [
      "CFA charterholder",
      "MSc Finance, IE Business School",
      "8 years across European retail wealth platforms",
      "Former Head of Platform at a Series C robo-advisor",
      "Author of the FintechPressHub European Robo-Advisor AUM Tracker",
    ],
    yearsExperience: 11,
    location: "Madrid, Spain",
    social: {
      linkedin: "https://www.linkedin.com/in/elenavasquezwealth",
      twitter: "https://twitter.com/elenavasquezwm",
    },
  },
  {
    slug: "hiroshi-yamamoto",
    name: "Hiroshi Yamamoto",
    role: "Crypto, Web3 & Digital Assets Lead",
    photo: "/author-photos/hiroshi-yamamoto.png",
    shortBio:
      "Veteran capital-markets operator covering regulated digital assets, stablecoins, and the institutional crypto rails actually being adopted by banks and payments companies.",
    fullBio: [
      "Hiroshi covers digital assets, stablecoins, and institutional crypto infrastructure for FintechPressHub. He spent two decades inside traditional capital markets — first as a fixed-income trader at a tier-one Japanese bank, then as Head of Digital Assets at a Hong Kong–licensed virtual-asset trading platform regulated by the SFC, where he built the institutional desk and authored the firm's first regulated stablecoin custody playbook.",
      "His writing is deliberately allergic to the speculative side of crypto coverage. He focuses on the parts of the digital-asset stack that already work inside regulated finance: tokenized money-market funds, MAS- and SFC-licensed exchanges, stablecoin payment rails, on-chain settlement for FX and securities, and the prudential rules (Basel 3.1, MiCA, Hong Kong's VASP regime) that decide what banks can actually touch.",
      "Hiroshi sits on a Hong Kong industry working group on tokenized real-world assets and is a frequent speaker at Point Zero Forum, the Hong Kong FinTech Week, and Singapore FinTech Festival.",
    ],
    expertise: [
      "Regulated stablecoin and tokenized-money coverage",
      "Institutional crypto custody and settlement",
      "MiCA, MAS, SFC, and HKMA digital-asset rules",
      "Tokenized real-world assets and on-chain securities",
      "Bank and payments-company crypto go-to-market",
    ],
    credentials: [
      "20+ years in capital markets and digital assets",
      "Former Head of Digital Assets at an SFC-licensed exchange",
      "Speaker: Hong Kong FinTech Week, Point Zero Forum, SFF",
      "Member, HK industry working group on tokenized RWAs",
      "MBA, Hitotsubashi University Graduate School of Business",
    ],
    yearsExperience: 20,
    location: "Hong Kong",
    social: {
      linkedin: "https://www.linkedin.com/in/hiroshiyamamotodigitalassets",
      twitter: "https://twitter.com/hyamamoto_da",
    },
  },
  {
    slug: "olivia-bennett",
    name: "Olivia Bennett",
    role: "Performance Marketing & Paid Media Director",
    photo: "/author-photos/olivia-bennett.png",
    shortBio:
      "Paid-media operator who has scaled fintech CAC programs across Google, Meta, and emerging financial-services ad surfaces — and writes about the levers that actually move blended payback.",
    fullBio: [
      "Olivia leads paid-media and performance-marketing coverage at FintechPressHub. Over the past nine years she has built and run paid acquisition for two ASX-listed neobanks, a Series B SME-lending platform, and an APAC-wide investing app, scaling combined paid spend from $400k to $14M per quarter while pulling blended CAC payback inside 18 months.",
      "Her writing focuses on the parts of fintech paid media that organic-only SEO content tends to ignore: bid-strategy selection on regulated finance verticals, creative testing systems for compliance-heavy products, attribution under iOS 17+ privacy constraints, and the shifting ad policies on Google, Meta, TikTok, and Reddit that quietly decide which fintech categories are even allowed to advertise in a given market.",
      "Olivia is a regular speaker at Mumbrella360 and SXSW Sydney, and runs a private community of 600+ in-house performance-marketing leads at fintech and financial-services brands across APAC.",
    ],
    expertise: [
      "Paid search and paid social for regulated finance",
      "Creative testing systems for compliance-heavy ads",
      "Attribution and incrementality under iOS 17+",
      "Bid-strategy selection on high-CPC finance verticals",
      "Cross-channel CAC and payback modelling",
    ],
    credentials: [
      "9 years in fintech paid media",
      "Former Head of Growth at an ASX-listed neobank",
      "Google Ads & Meta Blueprint certified",
      "Speaker: Mumbrella360, SXSW Sydney",
      "Built APAC fintech performance community of 600+ in-house leads",
    ],
    yearsExperience: 9,
    location: "Sydney, Australia",
    social: {
      linkedin: "https://www.linkedin.com/in/oliviabennettpaid",
      twitter: "https://twitter.com/oliviabennettpx",
    },
  },
  {
    slug: "rashid-al-mansoori",
    name: "Rashid Al-Mansoori",
    role: "Insurtech & Embedded Insurance Editor",
    photo: "/author-photos/rashid-al-mansoori.png",
    shortBio:
      "Former general-insurance underwriter writing about insurtech distribution, embedded insurance APIs, and the MENA and EMEA carriers quietly modernizing their stacks.",
    fullBio: [
      "Rashid covers insurtech, embedded insurance, and digital-distribution carriers for FintechPressHub. He started his career as a general-insurance underwriter at a top-three GCC carrier and then spent five years as Head of Digital at a Dubai-headquartered insurtech MGA, where he built the embedded-insurance API stack now sitting underneath several regional super-apps and BNPL providers.",
      "His writing focuses on the operating layer of modern insurance distribution: API-first quote-and-bind flows, claims-automation cost curves, reinsurance treaty implications for embedded products, and the regulatory perimeter shifts at the DFSA, FCA, and BaFin that decide which embedded-insurance models can scale across borders. His annual MENA Insurtech Distribution Index is referenced inside strategy teams at two publicly listed regional insurers.",
      "Rashid holds the ACII designation from the Chartered Insurance Institute (London) and is a founding board member of an MENA insurtech industry association.",
    ],
    expertise: [
      "Embedded-insurance API and distribution design",
      "Insurtech MGA economics and reinsurance support",
      "Claims automation and loss-ratio impact",
      "MENA and EMEA insurance regulation (DFSA, FCA, BaFin)",
      "Super-app and BNPL embedded-insurance go-to-market",
    ],
    credentials: [
      "ACII, Chartered Insurance Institute (London)",
      "12 years across underwriting and insurtech distribution",
      "Former Head of Digital at a Dubai-based insurtech MGA",
      "Founding board member, MENA insurtech association",
      "Author of the FintechPressHub MENA Insurtech Distribution Index",
    ],
    yearsExperience: 12,
    location: "Dubai, UAE",
    social: {
      linkedin: "https://www.linkedin.com/in/rashidalmansooriinsurtech",
      twitter: "https://twitter.com/rashidinsurtech",
    },
  },
  {
    slug: "lucas-pereira",
    name: "Lucas Pereira",
    role: "Vertical Fintech SaaS Editor",
    photo: "/author-photos/lucas-pereira.png",
    shortBio:
      "Vertical fintech SaaS editor covering treasury, FP&A, AP/AR, and embedded-finance platforms — focused on the operating metrics and pricing models that actually predict retention and expansion.",
    fullBio: [
      "Lucas leads fintech SaaS coverage at FintechPressHub, focused on the vertical software platforms that finance and operations teams actually buy: treasury management systems, FP&A, AP/AR automation, spend management, billing and revenue platforms, and the embedded-finance SaaS layer that increasingly powers them. Before joining the editorial team he was a markets reporter at a São Paulo-based finance publication and, before that, a corporate-development analyst at a top-three Brazilian bank covering vertical SaaS investments across LatAm and APAC.",
      "He writes the kind of fintech SaaS teardowns that go-to-market and product leaders can share internally: source-cited, primary-document-led, and grounded in the unit economics that separate durable category leaders from feature-set demos. His quarterly fintech SaaS pricing tracker is referenced by RevOps and CFO teams at three publicly listed B2B platforms, and his repricing-around-AI playbook has been adopted by two of the largest spend-management vendors.",
      "Lucas holds a CFA Level III pass and contributes to two regional fintech publications across LatAm and APAC. His monthly Fintech SaaS Brief reaches 14,000+ subscribers across CFO, RevOps, and product teams at vertical-SaaS companies.",
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
      "Former corporate-dev analyst, vertical SaaS, top-3 Brazilian bank",
      "Contributor: LABS by iupana, regional fintech trade press",
      "14,000+ subscribers to the FintechPressHub Fintech SaaS Brief",
    ],
    yearsExperience: 7,
    location: "São Paulo, Brazil",
    social: {
      linkedin: "https://www.linkedin.com/in/lucaspereirasaas",
      twitter: "https://twitter.com/lucaspereirasaas",
    },
  },
];

// Hard cap on the size of the author roster. The blog UI is designed
// around a 12-author masthead (2 rows of 6 on desktop, 3×4 on tablet),
// the author dropdown in the admin editor uses a single-screen list,
// and the author archive page assumes a fixed-size grid. Adding a 13th
// author should be a deliberate product decision that updates the layouts
// — not something that quietly slips in via a PR. Enforced here so a
// future contributor adding to the array trips a build-time error
// instead of shipping an off-grid roster to production.
export const MAX_AUTHORS = 12;

if (authors.length > MAX_AUTHORS) {
  throw new Error(
    `[authors] roster exceeds the ${MAX_AUTHORS}-author cap (got ${authors.length}). ` +
      `Remove an entry, or update MAX_AUTHORS together with the masthead/grid layouts in ` +
      `blog.tsx and the author archive page before raising the limit.`,
  );
}

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
