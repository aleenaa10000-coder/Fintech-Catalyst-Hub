// SEO data mirror used by the bot pre-render plugin.
//
// This file intentionally duplicates a small amount of metadata that also
// lives in TS source (PAGE_META, page-level FAQ arrays, authors). The plugin
// runs in plain Node ESM at request time, so it cannot import the .tsx files.
// Keep the values here in sync when the user-facing copy changes.

export const PAGE_META = {
  home: {
    path: "/",
    title: "FintechPressHub | Fintech SEO & Content Marketing Agency",
    description:
      "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
  },
  about: {
    path: "/about",
    title: "About FintechPressHub | Fintech SEO Agency",
    description:
      "FintechPressHub is a specialist fintech SEO agency built by operators who have worked inside payments, lending, and banking — not generalists learning on your account. Meet the team.",
  },
  services: {
    path: "/services",
    title: "Growth Engines for Fintech Brands | FintechPressHub",
    description:
      "Comprehensive fintech SEO, link building, and content marketing services built to compound organic growth.",
  },
  pricing: {
    path: "/pricing",
    title: "Transparent Fintech SEO Pricing | FintechPressHub",
    description:
      "Clear, retainer-based pricing for fintech SEO and content marketing — predictable costs with senior operators on every account.",
  },
  blog: {
    path: "/blog",
    title: "Fintech SEO & Content Marketing Insights | FintechPressHub",
    description:
      "Strategy, SEO, and content marketing playbooks for fintech operators. Covering payments, embedded finance, open banking, neobanking, lending, regtech, and wealthtech.",
  },
  authors: {
    path: "/authors",
    title: "Our Authors | Fintech SEO Specialists | FintechPressHub",
    description:
      "Meet the fintech SEO specialists, analysts, and content strategists who write for FintechPressHub — all with hands-on experience inside regulated financial services.",
  },
  writeForUs: {
    path: "/write-for-us",
    title: "Write For Us | FintechPressHub",
    description:
      "Pitch a guest article to FintechPressHub. We publish expert-level fintech, payments, and lending content for a 50,000+ monthly reader audience. Dofollow link included.",
  },
  contact: {
    path: "/contact",
    title: "Contact Us | FintechPressHub",
    description:
      "Get in touch for a free SEO audit and strategy consultation.",
  },
  privacyPolicy: {
    path: "/privacy-policy",
    title: "Privacy Policy | FintechPressHub",
    description:
      "How FintechPressHub collects, uses, and protects your personal information.",
  },
  refundPolicy: {
    path: "/refund-policy",
    title: "Refund Policy | FintechPressHub",
    description:
      "Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees.",
  },
  cookiePolicy: {
    path: "/cookie-policy",
    title: "Cookie Policy | FintechPressHub",
    description:
      "How FintechPressHub uses cookies and similar technologies on this website.",
  },
  terms: {
    path: "/terms",
    title: "Terms and Conditions | FintechPressHub",
    description:
      "The terms governing use of the FintechPressHub website and services.",
  },
  editorialGuidelines: {
    path: "/editorial-guidelines",
    title: "Editorial Guidelines | FintechPressHub",
    description:
      "The standards we hold our writers, guest contributors, and client deliverables to — accuracy, sourcing, AI usage, tone, and compliance.",
  },
  communityGuidelines: {
    path: "/community-guidelines",
    title: "Community Guidelines | FintechPressHub",
    description:
      "Standards of conduct, content quality, and IP expectations for every contributor and community participant on FintechPressHub.",
  },
  financialHealthCalculator: {
    path: "/tools/financial-health-score-calculator",
    title:
      "Financial Health Score Calculator | Debt-to-Income Checker",
    description:
      "Free Financial Health Score Calculator. Get your 0–100 score instantly with a debt-to-income ratio check, savings rate, emergency fund coverage, and personalized tips.",
  },
  linkProspector: {
    path: "/tools/link-prospector",
    title: "Link Prospector | Free Fintech Link Building Tool",
    description:
      "Paste a list of domains to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan.",
  },
  outreachEmailGenerator: {
    path: "/tools/outreach-email-generator",
    title: "Outreach Email Generator | Free Fintech Link Building Tool",
    description:
      "Generate a personalised link-building outreach email in seconds. Choose your tone, fill in the details, and compare subject line variants scored on open-rate factors.",
  },
  compare: {
    path: "/compare",
    title: "Fintech SEO Agency Comparisons | FintechPressHub",
    description:
      "Detailed head-to-head comparisons of fintech SEO approaches — agency vs in-house, specialist vs generalist, content-led vs paid. Make an informed decision.",
  },
  compareAgencyVsInHouse: {
    path: "/compare/agency-vs-in-house",
    title: "Fintech SEO Agency vs Generic Agency vs In-House | FintechPressHub",
    description:
      "Compare a fintech SEO specialist, a generic digital agency, and an in-house team across 10 criteria that matter most for regulated financial companies.",
  },
  compareVsFreelancers: {
    path: "/compare/vs-freelancers",
    title: "Fintech SEO Agency vs Freelance Writers vs Consultants | FintechPressHub",
    description:
      "Compare FintechPressHub with freelance fintech writers and independent SEO consultants. See which model delivers better ROI, consistency, and compliance coverage.",
  },
  compareVsSeoTools: {
    path: "/compare/vs-seo-tools",
    title: "Fintech SEO Agency vs DIY SEO Tools | FintechPressHub",
    description:
      "Compare using a managed fintech SEO agency against running your own SEO stack with Ahrefs, Semrush, and similar tools.",
  },
  compareVsPrAgencies: {
    path: "/compare/vs-pr-agencies",
    title: "Fintech SEO Agency vs PR Agencies | FintechPressHub",
    description:
      "SEO-focused fintech agency versus a traditional PR firm — understanding the difference in strategy, metrics, and organic growth outcomes.",
  },
  compareContentLedVsPaid: {
    path: "/compare/content-led-vs-paid",
    title: "Content-Led SEO vs Paid Search for Fintech | FintechPressHub",
    description:
      "Content-led organic SEO versus paid search (Google Ads, LinkedIn) for fintech growth — a detailed breakdown of cost, scalability, and compounding returns.",
  },
  compareSpecialistVsGeneralist: {
    path: "/compare/specialist-vs-generalist",
    title: "Specialist vs Generalist SEO Agency for Fintech | FintechPressHub",
    description:
      "Why fintech companies consistently outperform with a specialist SEO agency versus a generalist digital marketing firm.",
  },
  metaDescriptionGenerator: {
    path: "/tools/meta-description-generator",
    title: "Meta Description Generator | Free SEO Tool | FintechPressHub",
    description:
      "Generate 3 ready-to-use SEO meta descriptions for any professional page. Enter your page title and target keyword to get started.",
  },
  guestPostPitchGenerator: {
    path: "/tools/guest-post-pitch-generator",
    title: "Guest Post Pitch Generator | Free Link Building Tool | FintechPressHub",
    description:
      "Create a compelling, personalised guest post pitch email in seconds. Fill in a few details about your company and target publication.",
  },
  readabilityChecker: {
    path: "/tools/readability-checker",
    title: "Readability Checker | Free Content Tool | FintechPressHub",
    description:
      "Paste your article and get an instant Flesch readability score, grade level, sentence length breakdown, and actionable tips.",
  },
  keywordDifficultyEstimator: {
    path: "/tools/keyword-difficulty-estimator",
    title: "Keyword Difficulty Estimator | Free SEO Tool | FintechPressHub",
    description:
      "Estimate keyword difficulty and find quick-win opportunities for your fintech content strategy.",
  },
  backlinkValueEstimator: {
    path: "/tools/backlink-value-estimator",
    title: "Backlink Value Estimator | Free Link Building Tool | FintechPressHub",
    description:
      "Estimate the SEO value of a backlink opportunity before you invest time in outreach.",
  },
  contentBriefGenerator: {
    path: "/tools/content-brief-generator",
    title: "Content Brief Generator | Free SEO Tool | FintechPressHub",
    description:
      "Generate a comprehensive content brief for any fintech topic in seconds.",
  },
  headlineAnalyzer: {
    path: "/tools/headline-analyzer",
    title: "Headline Analyzer | Free SEO Tool | FintechPressHub",
    description:
      "Analyse your article headline for SEO power, emotional impact, readability, and click-worthiness.",
  },
  press: {
    path: "/press",
    title: "Press & Media Kit | FintechPressHub",
    description:
      "Press resources for FintechPressHub — brand assets, company boilerplate, key stats, recent coverage, and press contact details for journalists and editors.",
  },
  glossary: {
    path: "/glossary",
    title: "Fintech Glossary | Definitions for 100+ Terms | FintechPressHub",
    description:
      "Clear, jargon-free definitions for fintech terms — payments, lending, open banking, regtech, wealthtech, and more. Built for founders, marketers, and journalists.",
  },
  toolsIndex: {
    path: "/tools",
    title: "Free Fintech Marketing Tools | FintechPressHub",
    description:
      "Free, browser-based tools for fintech marketers and SEO teams — calculators, generators, and checkers. No sign-up required.",
  },
  fintechPublications: {
    path: "/resources/fintech-publications",
    title: "Top Fintech Publications & Media Outlets | FintechPressHub",
    description:
      "The definitive list of high-authority fintech publications, newsletters, and media outlets for link building and guest post outreach.",
  },
};

export const HOME_FAQS = [
  {
    question: "What makes fintech SEO different from regular SEO?",
    answer:
      "Fintech sits inside Google's YMYL (Your Money or Your Life) category, which means Google holds it to a far higher E-E-A-T bar than most verticals. Generic SEO playbooks — thin content, low-authority guest posts, AI-spun copy — actively hurt fintech rankings. Winning here requires writers who understand payments, lending, banking, and regulation; placements on publications your buyers and Google both trust; and a topical architecture that signals true subject-matter depth.",
  },
  {
    question: "How is FintechPressHub different from a generalist SEO agency?",
    answer:
      "We work exclusively with fintech, payments, lending, wealth, and banking infrastructure companies. Every writer, editor, and outreach lead has direct fintech experience — no generalists ramping up on your account. That focus is also why our publication relationships skew toward Finextra, The Fintech Times, Tearsheet, Finovate, and similar tier-1 trade press your buyers actually read.",
  },
  {
    question: "What kinds of fintech companies do you typically work with?",
    answer:
      "Series A through Series D fintechs, public fintechs, and infrastructure providers across payments, lending, embedded finance, neobanking, wealth tech, RegTech, and B2B SaaS for financial services. Most clients are post-product-market-fit teams investing in organic as a durable, compounding acquisition channel alongside paid.",
  },
  {
    question: "How long until we see real results?",
    answer:
      "Bottom-of-funnel and long-tail content typically lands in the top 20 within 30-60 days. Competitive head terms generally take 4-6 months of consistent publishing plus supporting links. Topical authority — the point where you start ranking for queries you didn't explicitly target — usually compounds around month 6-9 of a focused program.",
  },
  {
    question: "Do you offer one-time projects, or only ongoing retainers?",
    answer:
      "Both. The Fintech SEO Audit is a one-time, 30-day engagement with a prioritized 90-day roadmap your team can execute or hand back to us. Content writing, link building, guest posting, and topical authority programs run as ongoing retainers, typically on 6-month minimum engagements because authority compounds over time.",
  },
];

export const PRICING_FAQS = [
  {
    question: "Do you require long-term contracts?",
    answer:
      "We typically operate on 6-month minimum engagements because SEO is a long-term play. It takes time to audit, produce high-quality content, and build the authority needed to see significant ROI.",
  },
  {
    question: "Are the backlinks dofollow?",
    answer:
      "Yes. We secure permanent, dofollow backlinks from high Domain Rating (DR 60+) sites relevant to the financial industry. No PBNs, no spam.",
  },
  {
    question: "Can we upgrade or downgrade our plan?",
    answer:
      "Absolutely. You can adjust your retainer at the end of any billing cycle to match your current growth priorities and budget.",
  },
  {
    question: "How long until we see results from fintech SEO?",
    answer:
      "Most clients see meaningful ranking improvements in 3-4 months and significant organic traffic growth by month 6. Fintech is a competitive, regulated vertical, so authority and topical depth take time to compound — but the traffic we build is durable.",
  },
  {
    question: "Do you only work with fintech companies?",
    answer:
      "Yes. We work exclusively with fintech, payments, lending, wealth, and banking infrastructure companies. That focus is what lets our writers and link builders deliver work that meets compliance, accuracy, and E-E-A-T standards Google rewards in YMYL verticals.",
  },
  {
    question: "What is included in a content piece?",
    answer:
      "Every article includes topic research, SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, internal linking, on-page optimization, and unlimited revisions before publish. We also handle CMS upload if requested.",
  },
];

export const CONTACT_FAQS = [
  {
    question: "What happens after I submit this form?",
    answer:
      "A senior strategist reviews your submission within one business day, then emails you 2-3 time slots for a 30-minute discovery call. There is no automated funnel and no junior SDR — you go straight to someone who will scope and price your engagement.",
  },
  {
    question:
      "Is the discovery call free, and is there any pressure to commit?",
    answer:
      "The 30-minute call is free and consultative. We'll review your funnel, surface 2-3 quick wins you can act on regardless of whether we work together, and only propose an engagement if there's a clear fit. No obligation, no aggressive follow-up sequences.",
  },
  {
    question: "How fast can we kick off if we decide to move forward?",
    answer:
      "Typical kickoff is 7-10 business days from signed agreement. That covers contract, access provisioning (GA4, GSC, CMS), kickoff workshop, and the first sprint plan. For audits we can sometimes start within 3-5 days if your data access is ready.",
  },
  {
    question: "What's the smallest engagement you take on?",
    answer:
      "Our minimum is the SEO audit (one-time, 30-day delivery). For ongoing retainers we typically work with fintech companies investing $5k+/month so we can resource a senior strategist plus a fintech writer or outreach lead — anything smaller doesn't move the needle in this vertical.",
  },
  {
    question: "Do you sign NDAs before the discovery call?",
    answer:
      "Yes. If you're discussing pre-launch products, regulatory positioning, or sensitive funnel data, send your NDA with the form submission and we'll have it countersigned before the call.",
  },
  {
    question: "Can you work with our in-house SEO or content team?",
    answer:
      "Absolutely — about 40% of our retainers run alongside an in-house team. We slot in as the fintech-specialist layer (writers, link builders, technical SEO) and report into your head of growth or content lead. We're comfortable with shared GSC, shared editorial calendars, and joint sprint reviews.",
  },
];

export const ABOUT_PAGE = {
  description:
    "FintechPressHub is a specialist fintech digital marketing agency. We pair senior content strategists with experienced fintech writers, technical SEO operators, and digital PR leads to build defensible organic growth engines for payments, lending, banking infrastructure, and wealth tech companies.",
  slogan: "Bridging fintech expertise and search visibility.",
  knowsAbout: [
    "Fintech SEO",
    "Open Banking",
    "Banking-as-a-Service (BaaS)",
    "Embedded finance",
    "Decentralized finance (DeFi)",
    "Payments and BNPL",
    "B2B and SME lending",
    "Wealth tech and RegTech",
    "Topical authority and content cluster strategy",
    "Digital PR and high-authority link building",
    "Technical SEO for regulated finance",
    "Editorial workflow design",
  ],
};

// Per-service FAQs — mirror of artifacts/fintechpresshub/src/lib/serviceFaqs.ts
export const SERVICE_FAQS = {
  "fintech-content-writing": [
    {
      question: "Who actually writes the articles?",
      answer:
        "Senior writers with backgrounds in banking, payments, lending, or wealth tech — never generalist freelancers. Every brief is scoped by a fintech editor, drafted by a domain writer, and reviewed by a senior editor before it ships.",
    },
    {
      question:
        "How long are the articles, and how many do I get per month?",
      answer:
        "Most pieces land between 1,500 and 3,500 words depending on search intent. A typical retainer produces 4–8 long-form articles per month plus updates to existing pages — but we scope volume to your funnel, not a fixed quota.",
    },
    {
      question: "Do you use AI to write the articles?",
      answer:
        "AI is used for research support and outlining, never as the primary draft. Final copy is written and edited by humans, fact-checked, and run through originality and AI-detection checks before delivery. This keeps content safe under Google's spam policies.",
    },
    {
      question: "How long until articles start ranking?",
      answer:
        "Bottom-of-funnel and long-tail pieces typically enter the top 20 within 30–60 days. Competitive head terms generally take 4–6 months of consistent publishing plus supporting links — we'll forecast a realistic timeline for your domain in the first kickoff call.",
    },
  ],
  "off-page-seo": [
    {
      question: "Are these PBN, paid, or sponsored links?",
      answer:
        "No. Every placement is editorial — earned through digital PR, niche edits, broken-link reclamation, and HARO-style citations. We never use PBNs, link farms, or paid networks that violate Google's link spam policies.",
    },
    {
      question: "How many links do you build per month?",
      answer:
        "Typically 6–15 contextual placements per month on DR 50+ finance and fintech sites, depending on the retainer tier. We optimize for relevance, organic traffic, and anchor diversity — not raw volume.",
    },
    {
      question: "What's your average Domain Rating?",
      answer:
        "Average placements land between DR 55 and DR 75. We won't pursue a high-DR site if its traffic is fake or its niche is irrelevant — we screen every prospect against organic traffic, topical fit, and outbound link hygiene.",
    },
    {
      question: "Do you guarantee a specific number of links?",
      answer:
        "We guarantee a minimum number of placements per quarter, defined in your scope. If a placement drops or gets nofollowed within 90 days, we replace it at no extra cost.",
    },
  ],
  "guest-posting": [
    {
      question: "What kind of publications do you place on?",
      answer:
        "Tier-1 and tier-2 finance, fintech, and B2B SaaS publications that your buyers actually read — Finextra, The Fintech Times, Tearsheet, Finovate, payments and lending trade press, and ICP-aligned SaaS blogs. Every site is vetted for organic traffic, niche relevance, and a clean backlink profile.",
    },
    {
      question: "Do you write the guest posts, or do I?",
      answer:
        "We do. A dedicated outreach lead pitches editors, and our fintech writers ghostwrite the article in your or your executive's voice. You review and approve before submission. If you'd rather supply your own draft, we can pitch and place that instead.",
    },
    {
      question: "How do contextual dofollow links work?",
      answer:
        "Each placement includes one contextual, dofollow link to a priority page on your site, embedded naturally inside the article body — never in an author bio. Anchor text is chosen to balance ranking lift with a natural-looking link profile.",
    },
    {
      question: "How long does each placement take?",
      answer:
        "Pitching to publication usually takes 4–8 weeks per placement, depending on the editor's calendar. Most clients see the first 2–3 placements live within 60 days of kickoff.",
    },
  ],
  "topical-authority": [
    {
      question: "What is a topical authority program?",
      answer:
        "It's a 90-day engagement that maps every meaningful search query inside one fintech sub-vertical — say, embedded finance, BNPL, or wealth tech — and produces the cluster of pillar pages, supporting articles, and internal links Google needs to recognize you as the canonical resource on that topic.",
    },
    {
      question: "Which sub-verticals do you cover?",
      answer:
        "We've shipped topical maps for embedded finance, BNPL, payments orchestration, B2B lending, neobanking, wealth tech, RegTech, and SMB banking. If you operate in fintech, we can build a topical map for your category.",
    },
    {
      question: "How is this different from buying a content retainer?",
      answer:
        "A content retainer produces individual articles. A topical authority program produces an interlocked content system: pillar pages, supporting clusters, an internal-linking architecture, and entity optimization — designed so the whole system ranks together, not just isolated posts.",
    },
    {
      question: "How do you measure success?",
      answer:
        "We track topical share-of-voice (your visibility across the full keyword set, not just one term), pages ranked in the top 10, organic traffic to the cluster, and downstream conversions. A quarterly topical audit shows progress against the original map.",
    },
  ],
  "fintech-seo-audit": [
    {
      question: "What's included in the audit?",
      answer:
        "A full technical crawl with Core Web Vitals review, an on-page audit of your top 50 revenue pages, content gap analysis against three named competitors, a backlink profile health check, and a prioritized 90-day roadmap your team can execute (or we can execute for you).",
    },
    {
      question: "How long does the audit take?",
      answer:
        "30 days from kickoff to delivery. Week 1 is data collection, weeks 2–3 are analysis and competitor benchmarking, week 4 is the synthesis call, written report, and roadmap walkthrough.",
    },
    {
      question: "Who runs the audit?",
      answer:
        "A senior SEO operator with fintech experience leads the engagement end-to-end — never a junior analyst handing you a templated report. Specialist help (technical crawl, content, links) plugs in as needed under their direction.",
    },
    {
      question: "Will the audit work for a pre-launch or low-traffic site?",
      answer:
        "Yes. For pre-launch and early-stage fintechs, we focus the audit on competitor benchmarking, keyword opportunity sizing, technical foundations, and a launch-phase content roadmap — so you start ranking instead of trying to fix problems six months in.",
    },
  ],
};

// Mirror of artifacts/fintechpresshub/src/data/authors.ts (relevant fields).
export const AUTHORS = [
  {
    slug: "marcus-webb",
    name: "Marcus Webb",
    role: "Head of SEO Strategy",
    photo: "/author-photos/marcus-webb.png",
    shortBio:
      "Senior SEO operator who has led organic growth programs for challenger banks, lending platforms, and B2B payments companies across the US and UK.",
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
    location: "Madrid, Spain",
    social: {
      linkedin: "https://www.linkedin.com/in/elenavasquezwealth",
      twitter: "https://twitter.com/elenavasquezwm",
    },
  },
  {
    slug: "olivia-bennett",
    name: "Olivia Bennett",
    role: "Performance Marketing & Paid Media Director",
    photo: "/author-photos/olivia-bennett.png",
    shortBio:
      "Paid-media operator who has scaled fintech CAC programs across Google, Meta, and emerging financial-services ad surfaces — and writes about the levers that actually move blended payback.",
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
    location: "São Paulo, Brazil",
    social: {
      linkedin: "https://www.linkedin.com/in/lucaspereirasaas",
      twitter: "https://twitter.com/lucaspereirasaas",
    },
  },
];
