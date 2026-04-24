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
