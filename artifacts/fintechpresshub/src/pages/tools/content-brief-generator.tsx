import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileEdit,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Download,
  BookOpen,
  Target,
  Users,
  MessageSquare,
  Link2,
  ListOrdered,
  Clock,
  Tag,
  GraduationCap,
  ShieldCheck,
  Lightbulb,
  FileCode,
  HelpCircle,
} from "lucide-react";

type Audience = "founders" | "marketers" | "developers" | "consumers" | "investors";
type Tone = "authoritative" | "educational" | "conversational" | "data-driven";
type WordCount = "800" | "1200" | "1800" | "2500";

type FormState = {
  keyword: string;
  audience: Audience;
  tone: Tone;
  wordCount: WordCount;
  competitors: string;
};

const DEFAULTS: FormState = {
  keyword: "",
  audience: "marketers",
  tone: "authoritative",
  wordCount: "1200",
  competitors: "",
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  founders: "Fintech founders / CEOs",
  marketers: "Marketing & growth teams",
  developers: "Developers & technical leads",
  consumers: "Personal finance consumers",
  investors: "Investors & analysts",
};

const TONE_LABELS: Record<Tone, string> = {
  authoritative: "Authoritative — expert-led, confident",
  educational: "Educational — clear, step-by-step",
  conversational: "Conversational — approachable, jargon-light",
  "data-driven": "Data-driven — stats-first, analytical",
};

type FleschKincaid = {
  gradeLevel: string;
  rationale: string;
  exampleStructures: string[];
};

type StyleGuardrail = {
  writeLike: string;
  avoid: string;
};

type ContentAngle = {
  angle: string;
  why: string;
};

type SMEQuestion = {
  question: string;
  context: string;
};

type Brief = {
  keyword: string;
  audience: string;
  tone: string;
  targetWordCount: string;
  readingTime: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  h2s: { heading: string; notes: string }[];
  entities: string[];
  faqHeadings: string[];
  internalLinks: string[];
  externalLinkTypes: string[];
  cta: string;
  toneGuidance: string[];
  thingsToAvoid: string[];
  fleschKincaid: FleschKincaid;
  styleGuardrails: StyleGuardrail[];
  competingAngles: ContentAngle[];
  smeQuestions: SMEQuestion[];
};

const INTERNAL_LINKS_BY_AUDIENCE: Record<Audience, string[]> = {
  founders: [
    "/services — link from any mention of 'fintech content strategy' or 'growing your pipeline'; anchor: 'fintech content agency'",
    "/services#white-label — link from any mention of 'white-label publishing', 'branded content', or 'partner media'; anchor: 'white-label content solutions'",
    "/blog/category/roi-frameworks — link from any mention of 'content ROI', 'measuring results', or 'attribution'; anchor: 'fintech content ROI framework'",
    "/case-studies — link from any mention of 'proof points', 'client results', or 'growth case study'; anchor: 'fintech content case studies'",
    "/pricing — link from any mention of 'investment', 'budget', or 'cost of content'; anchor: 'content marketing pricing'",
    "/contact — link from the conclusion CTA; anchor: 'book a strategy call'",
  ],
  marketers: [
    "/services#content-production — link from any mention of 'outsourcing content' or 'specialist writers'; anchor: 'fintech content production service'",
    "/tools/keyword-difficulty-estimator — link from any mention of 'keyword research', 'difficulty scores', or 'search opportunity'; anchor: 'fintech keyword difficulty estimator'",
    "/tools/content-brief-generator — link from any mention of 'content briefs', 'article structure', or 'editorial planning'; anchor: 'fintech content brief generator'",
    "/blog/category/seo-strategy — link from any mention of 'organic growth', 'search rankings', or 'SEO playbook'; anchor: 'fintech SEO strategy guides'",
    "/case-studies — link from any mention of 'campaign results', 'traffic growth', or 'pipeline influence'; anchor: 'fintech marketing case studies'",
    "/write-for-us — link from any call-to-action for contributors or guest authors; anchor: 'write for FintechPressHub'",
  ],
  developers: [
    "/blog/category/api-integration — link from any mention of 'integration patterns', 'API design', or 'connecting systems'; anchor: 'fintech API integration guides'",
    "/blog/category/open-banking-tech — link from any mention of 'open banking architecture', 'PSD2 implementation', or 'banking APIs'; anchor: 'open banking technical resources'",
    "/blog/category/security-compliance — link from any mention of 'PCI DSS', 'GDPR', 'data protection', or 'secure coding'; anchor: 'fintech security and compliance guides'",
    "/case-studies#technical — link from any mention of 'real-world implementation', 'production deployment', or 'developer success story'; anchor: 'technical fintech case studies'",
    "/services#technical-content — link from any mention of 'developer documentation', 'API reference writing', or 'technical copywriting'; anchor: 'fintech technical content writing'",
    "/contact — link from any 'need expert guidance' reference or the conclusion; anchor: 'speak to a fintech technical writer'",
  ],
  consumers: [
    "/blog/category/personal-finance — link from any mention of 'managing money', 'saving', or 'budgeting tips'; anchor: 'personal finance guides'",
    "/blog/category/fintech-reviews — link from any mention of a product, app, or service; anchor: 'fintech product reviews'",
    "/blog/glossary — link from the first use of any technical term (APY, KYC, IBAN, etc.); anchor: 'fintech glossary'",
    "/blog/category/how-to-guides — link from any step-by-step reference or 'getting started' mention; anchor: 'fintech how-to guides'",
    "/tools — link from any mention of 'free tools', 'calculators', or 'check your options'; anchor: 'free fintech tools'",
    "/contact — link from the conclusion CTA; anchor: 'get in touch'",
  ],
  investors: [
    "/blog/category/market-intelligence — link from any mention of TAM, market size, or sector trends; anchor: 'fintech market intelligence'",
    "/blog/category/funding-and-ma — link from any mention of 'funding rounds', 'M&A activity', or 'valuations'; anchor: 'fintech funding and M&A tracker'",
    "/blog/category/regulatory-outlook — link from any mention of 'regulatory risk', 'licensing', or 'compliance landscape'; anchor: 'fintech regulatory outlook'",
    "/services#thought-leadership — link from any mention of 'positioning', 'category leadership', or 'investor relations content'; anchor: 'fintech thought leadership content'",
    "/case-studies#enterprise — link from any mention of 'institutional results' or 'enterprise-grade outcomes'; anchor: 'enterprise fintech case studies'",
    "/contact#newsletter — link from any call to 'stay informed' or 'follow deal flow'; anchor: 'subscribe to fintech insights'",
  ],
};

const EXTERNAL_LINK_TYPES = [
  "Regulatory body or official government source (e.g. FCA, CFPB, EBA)",
  "Original research or industry report (e.g. McKinsey, Accenture, Statista)",
  "Peer-reviewed academic source (where applicable)",
  "Major fintech publication for context (e.g. The Financial Brand, Tearsheet)",
];

const TONE_GUIDANCE: Record<Tone, string[]> = {
  authoritative: [
    "Open with a confident, declarative statement — no hedging.",
    "Back every claim with a named source or specific data point.",
    "Use first-person plural ('we recommend') sparingly and only when you have real expertise behind the claim.",
    "Avoid excessive qualifiers like 'might', 'could', 'perhaps'.",
  ],
  educational: [
    "Define technical terms on first use — assume the reader is smart but new to the topic.",
    "Use numbered lists and step-by-step structures wherever a process is described.",
    "Include a 'Key Takeaways' box near the top or bottom.",
    "Write short sentences. Aim for an average under 18 words.",
  ],
  conversational: [
    "Write like you're explaining this to a colleague over coffee — not a boardroom.",
    "Use contractions (it's, you'll, they're).",
    "Ask rhetorical questions to keep readers engaged.",
    "Avoid acronyms without spelling them out — even common ones like API or AML.",
  ],
  "data-driven": [
    "Lead each section with a statistic or data point.",
    "Always cite the source and year for every number used.",
    "Use tables or comparison structures where multiple data points exist.",
    "Prefer specific figures over vague claims (e.g. '42% of fintechs' not 'many fintechs').",
  ],
};

const THINGS_TO_AVOID: Record<Tone, string[]> = {
  authoritative: [
    "Unsubstantiated superlatives ('the best', 'the most important')",
    "Passive voice — keep it active and direct",
    "Padding content to hit word count — every paragraph must earn its place",
  ],
  educational: [
    "Jargon without explanation",
    "Walls of text — break every 3–4 sentences with a subheading or list",
    "Skipping the 'why it matters' context for each step",
  ],
  conversational: [
    "Overly casual language that undermines credibility",
    "Slang or idioms that may not translate internationally",
    "Rambling intros — get to the point by sentence 3",
  ],
  "data-driven": [
    "Outdated statistics (check publication dates — anything 3+ years old needs replacement)",
    "Cherry-picked data without acknowledging counter-evidence",
    "Data dumps without interpretation — always explain what the numbers mean",
  ],
};

const H2_TEMPLATES: Record<Audience, (kw: string) => { heading: string; notes: string }[]> = {
  founders: (kw) => [
    { heading: `What Is ${kw}? A Founder's Overview`, notes: "Define the concept clearly. Link to any regulatory definitions." },
    { heading: `Why ${kw} Matters for Fintech Startups in 2025`, notes: "Market context, growth trends, VC interest." },
    { heading: `The Business Case: ROI and Revenue Impact`, notes: "Include data on financial upside. Cite industry reports." },
    { heading: `Key Challenges Founders Face with ${kw}`, notes: "Be honest about difficulty. Show you understand the pain." },
    { heading: `How to Get Started: A Practical Framework`, notes: "Step-by-step, actionable. Numbered list preferred." },
    { heading: `Choosing the Right Partners and Vendors`, notes: "Criteria checklist. Do not name-drop vendors without justification." },
    { heading: `What Leading Fintechs Are Doing Differently`, notes: "2–3 mini case studies or examples." },
    { heading: `Conclusion: Your Next Step with ${kw}`, notes: "Summarise, then lead into CTA." },
  ],
  marketers: (kw) => [
    { heading: `${kw}: What Every Fintech Marketer Needs to Know`, notes: "Set the scene — why this topic matters for growth teams." },
    { heading: `How ${kw} Fits into the Fintech Marketing Funnel`, notes: "TOFU / MOFU / BOFU breakdown." },
    { heading: `Content and SEO Opportunities Around ${kw}`, notes: "Keyword clusters, content types, search intent breakdown." },
    { heading: `Campaign Ideas and Use Cases`, notes: "3–5 concrete campaign angles with brief descriptions." },
    { heading: `Measuring Success: KPIs and Metrics`, notes: "Specific metrics, not vague ones. Include benchmarks where possible." },
    { heading: `Common Mistakes Fintech Marketers Make`, notes: "Make this honest and specific — not generic." },
    { heading: `Tools and Platforms Worth Knowing`, notes: "Brief overview, no paid placements unless disclosed." },
    { heading: `Conclusion and Next Steps`, notes: "Tie back to the opening, close with CTA." },
  ],
  developers: (kw) => [
    { heading: `${kw} Explained for Developers`, notes: "Technical-first definition. No fluff." },
    { heading: `Architecture and Integration Overview`, notes: "How it fits into a typical fintech stack. Diagrams encouraged." },
    { heading: `API Design Considerations`, notes: "REST vs GraphQL, auth patterns, versioning." },
    { heading: `Security and Compliance Requirements`, notes: "PCI DSS, GDPR, open banking standards — be specific." },
    { heading: `Common Implementation Pitfalls`, notes: "Real issues developers hit. Cite community resources or docs." },
    { heading: `Testing and Monitoring Best Practices`, notes: "Unit, integration, load testing. Error handling." },
    { heading: `Code Examples and SDK Options`, notes: "Brief code snippets or pseudocode where helpful." },
    { heading: `Conclusion: Building Responsibly with ${kw}`, notes: "Ethical and compliance close. CTA to contact or docs." },
  ],
  consumers: (kw) => [
    { heading: `What Is ${kw}? A Plain-English Guide`, notes: "No jargon. Explain like you would to a friend." },
    { heading: `How Does It Work?`, notes: "Step-by-step user journey. Keep it visual if possible." },
    { heading: `Is ${kw} Safe? What You Need to Know`, notes: "Address security and regulatory protection directly." },
    { heading: `Benefits You Can Actually Feel`, notes: "Concrete, personal outcomes — not abstract features." },
    { heading: `What to Watch Out For`, notes: "Honest risks. Don't oversell." },
    { heading: `How to Choose the Best Option for You`, notes: "Decision checklist. Comparison table if applicable." },
    { heading: `Frequently Asked Questions`, notes: "Pull from real search queries around this topic." },
    { heading: `Getting Started: Your Next Step`, notes: "Low-friction CTA. Make it feel easy." },
  ],
  investors: (kw) => [
    { heading: `Market Overview: The ${kw} Landscape`, notes: "TAM, SAM, SOM. Cite authoritative market research." },
    { heading: `Key Trends Driving Growth in 2025`, notes: "Regulatory tailwinds, technology shifts, consumer adoption curves." },
    { heading: `The Competitive Landscape`, notes: "Category leaders, challengers, emerging players." },
    { heading: `Business Model Analysis`, notes: "Revenue models, unit economics, margin profiles." },
    { heading: `Risk Factors and Due Diligence Checklist`, notes: "Regulatory risk, market risk, execution risk." },
    { heading: `Notable Deals and Funding Activity`, notes: "Recent raises, M&A activity, valuations where available." },
    { heading: `What Strong Operators in ${kw} Look Like`, notes: "Differentiation factors, moats, team signals." },
    { heading: `Outlook and Investment Thesis`, notes: "Bull / bear case. Conclude with a clear POV." },
  ],
};

const FAQ_TEMPLATES: Record<Audience, (kw: string) => string[]> = {
  founders: (kw) => [
    `What is ${kw} and why does it matter for fintech startups?`,
    `How much does it cost to implement ${kw}?`,
    `What regulations apply to ${kw} in the UK/EU/US?`,
    `How long does it take to build a ${kw} solution?`,
  ],
  marketers: (kw) => [
    `How do I create content around ${kw} that ranks?`,
    `What is the search intent behind ${kw}?`,
    `How do fintech companies use ${kw} in their marketing?`,
    `What metrics should I track for ${kw} campaigns?`,
  ],
  developers: (kw) => [
    `How do I integrate ${kw} into my fintech app?`,
    `What are the security requirements for ${kw}?`,
    `Which SDKs or APIs support ${kw}?`,
    `How do I test a ${kw} implementation?`,
  ],
  consumers: (kw) => [
    `What is ${kw} in simple terms?`,
    `Is ${kw} safe to use?`,
    `How do I get started with ${kw}?`,
    `What are the fees involved with ${kw}?`,
  ],
  investors: (kw) => [
    `What is the market size for ${kw}?`,
    `Who are the leading companies in ${kw}?`,
    `What are the biggest risks in the ${kw} space?`,
    `How is ${kw} regulated globally?`,
  ],
};

const CTA_TEMPLATES: Record<Audience, string> = {
  founders: "End with a direct CTA to book a strategy call or request a fintech content audit.",
  marketers: "Close with an offer — a free content calendar template, SEO audit, or strategy call.",
  developers: "Link to documentation, a GitHub repo, or a technical contact form.",
  consumers: "Use a soft CTA — 'Ready to explore your options?' with a link to a comparison or contact page.",
  investors: "Invite readers to subscribe to your deal-flow newsletter or request a private briefing.",
};

// ── Semantic SEO Entities ─────────────────────────────────────────────────

const ENTITY_BUCKETS: { signals: string[]; entities: string[] }[] = [
  {
    signals: ["cbdc", "central bank digital", "digital currency", "digital pound", "digital euro", "digital dollar"],
    entities: ["ISO 20022", "Distributed Ledger Technology (DLT)", "Cryptography", "Central Bank", "Monetary Policy", "SWIFT", "BIS (Bank for International Settlements)", "Tokenisation", "Settlement Finality", "Programmable Money"],
  },
  {
    signals: ["blockchain", "defi", "crypto", "web3", "nft", "smart contract", "dao", "ethereum", "bitcoin", "stablecoin", "token"],
    entities: ["Smart Contract", "Distributed Ledger Technology (DLT)", "Proof of Stake", "Gas Fees", "Private Key", "ERC-20 Token", "Layer 2 Protocol", "Liquidity Pool", "Decentralised Finance (DeFi)", "Wallet Address"],
  },
  {
    signals: ["open banking", "psd2", "banking as a service", "baas", "embedded finance", "embedded banking", "api banking"],
    entities: ["PSD2 (Payment Services Directive 2)", "OAuth 2.0", "API Gateway", "Consent Management", "FAPI (Financial-grade API)", "TPP (Third Party Provider)", "ASPSP", "Account Information Service (AIS)", "Payment Initiation Service (PIS)", "Open Finance"],
  },
  {
    signals: ["kyc", "aml", "know your customer", "anti-money laundering", "compliance", "regtech", "sanctions", "fraud detection", "financial crime"],
    entities: ["FATF (Financial Action Task Force)", "Suspicious Activity Report (SAR)", "Customer Due Diligence (CDD)", "Enhanced Due Diligence (EDD)", "Politically Exposed Person (PEP)", "Sanctions Screening", "Risk-Based Approach", "FinCEN", "6AMLD", "Perpetual KYC"],
  },
  {
    signals: ["neobank", "challenger bank", "digital bank", "fintech bank", "mobile bank", "online bank"],
    entities: ["Customer Acquisition Cost (CAC)", "APY (Annual Percentage Yield)", "Regulatory Sandbox", "Net Promoter Score (NPS)", "Monthly Active Users (MAU)", "Churn Rate", "LTV (Lifetime Value)", "FCA Authorisation", "FSCS Protection", "Unit Economics"],
  },
  {
    signals: ["payment", "transaction", "gateway", "checkout", "merchant", "acquiring", "issuing", "card", "pos", "point of sale"],
    entities: ["PCI DSS", "3DS (3D Secure)", "Acquirer", "Issuer", "Interchange Fee", "Chargeback", "BIN (Bank Identification Number)", "Authorisation Code", "Payment Rail", "Tokenisation"],
  },
  {
    signals: ["lending", "loan", "credit", "bnpl", "buy now pay later", "mortgage", "underwriting", "debt"],
    entities: ["Annual Percentage Rate (APR)", "Credit Score", "Underwriting", "LTV (Loan-to-Value)", "Debt-to-Income (DTI) Ratio", "FICO Score", "Origination Fee", "Default Rate", "Open Banking Credit", "Credit Bureau"],
  },
  {
    signals: ["wealth", "investment", "portfolio", "robo", "asset management", "etf", "trading", "fund"],
    entities: ["AUM (Assets Under Management)", "Alpha", "Beta (Market Sensitivity)", "Sharpe Ratio", "Rebalancing", "Dollar-Cost Averaging (DCA)", "MiFID II", "Suitability Assessment", "Risk Appetite", "ETF (Exchange-Traded Fund)"],
  },
  {
    signals: ["insurance", "insurtech", "underwriting", "claims", "actuarial", "risk pool", "reinsurance"],
    entities: ["Actuarial Model", "Loss Ratio", "Parametric Insurance", "Risk Pool", "UBI (Usage-Based Insurance)", "Embedded Insurance", "Reinsurance", "API-First Underwriting", "GDPR (Health Data Compliance)", "No-Claims Discount (NCD)"],
  },
  {
    signals: ["seo", "content", "marketing", "keyword", "search", "ranking", "organic", "backlink", "link building"],
    entities: ["Search Intent", "E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)", "Topical Authority", "Semantic Search", "TF-IDF", "Core Web Vitals", "Anchor Text", "Domain Authority (DA)", "Crawl Budget", "Schema Markup"],
  },
];

const ENTITY_FALLBACK_BY_AUDIENCE: Record<Audience, string[]> = {
  founders: ["Total Addressable Market (TAM)", "Product-Market Fit", "Regulatory Sandbox", "Unit Economics", "Burn Rate", "MRR (Monthly Recurring Revenue)", "Term Sheet", "Cap Table", "Go-to-Market (GTM)", "Series A Funding"],
  marketers: ["Customer Acquisition Cost (CAC)", "Conversion Rate Optimisation (CRO)", "Content Marketing Funnel", "Search Intent", "Topical Authority", "E-E-A-T", "Organic Traffic", "Buyer Persona", "Marketing Qualified Lead (MQL)", "Attribution Model"],
  developers: ["REST API", "Webhook", "OAuth 2.0", "Rate Limiting", "Idempotency Key", "Sandbox Environment", "TLS Encryption", "JSON Web Token (JWT)", "API Versioning", "SDK (Software Development Kit)"],
  consumers: ["Annual Percentage Rate (APR)", "APY (Annual Percentage Yield)", "FSCS Protection", "Open Banking", "Two-Factor Authentication (2FA)", "Digital Wallet", "Cashback Reward", "Credit Score", "IBAN", "FCA Regulation"],
  investors: ["Total Addressable Market (TAM)", "Revenue Multiple", "EBITDA", "Net Revenue Retention (NRR)", "Gross Margin", "Burn Multiple", "Lead Investor", "Cap Table", "Due Diligence", "Liquidity Event"],
};

const FK_DATA: Record<Audience, Record<Tone, FleschKincaid>> = {
  founders: {
    authoritative: {
      gradeLevel: "Grade 11–12",
      rationale: "Founders expect business-grade prose — confident, complex enough to signal expertise, but not academic.",
      exampleStructures: [
        "In 2025, [X] represents the most significant infrastructure shift in fintech since [Y] — and founders who move early will capture disproportionate market share.",
        "[Company] secured its Series B because its investors understood that [concept] is not a feature — it is the moat.",
        "The decision is straightforward: build [capability] now, or spend 18 months catching up to competitors who already did.",
      ],
    },
    educational: {
      gradeLevel: "Grade 10–11",
      rationale: "Educational content for founders should demystify complexity without feeling patronising — crisp, structured, and practical.",
      exampleStructures: [
        "To understand [X], start with a simple question: what problem does it solve for your customers, and how fast?",
        "There are three steps to implementing [Y] successfully — and most founders stumble on the second one.",
        "Think of [X] as [analogy]: it doesn't change what you're building, it changes how quickly you can scale it.",
      ],
    },
    conversational: {
      gradeLevel: "Grade 9–10",
      rationale: "Conversational content for founders should feel like peer advice — direct, warm, and free of buzzwords.",
      exampleStructures: [
        "Here's the thing about [X]: it looks complicated on paper, but your customers don't actually care about the complexity.",
        "If you're not thinking about [Y] yet, you probably will be in 12 months — and that's fine, as long as you start now.",
        "The founders we speak to most often ask one question: 'How do I know if [X] is right for our stage?'",
      ],
    },
    "data-driven": {
      gradeLevel: "Grade 11–12",
      rationale: "Founders trust data-heavy arguments — each claim should be anchored to a specific figure or named source.",
      exampleStructures: [
        "According to [Source], [X]% of Series A fintechs that implemented [Y] in year one reported [Z]% higher retention by year two.",
        "The data is clear: [metric] is the single best leading indicator of [outcome] for founders at the $[X]M ARR mark.",
        "[Statistic] — that figure alone explains why [X] has moved from 'nice to have' to a board-level priority in 2025.",
      ],
    },
  },
  marketers: {
    authoritative: {
      gradeLevel: "Grade 10–11",
      rationale: "Marketing teams expect confident, strategy-level language — assertive but accessible enough for cross-functional reading.",
      exampleStructures: [
        "[X] is not a trend — it is the distribution layer that will define which fintech brands own search in the next three years.",
        "The most effective fintech content programmes share one trait: they treat [Y] as a strategic asset, not a publishing schedule.",
        "If your content isn't addressing [X] intent explicitly, you are optimising for traffic that will never convert.",
      ],
    },
    educational: {
      gradeLevel: "Grade 9–10",
      rationale: "Marketers learn best from clear, structured playbooks — aim for short sentences and step-by-step logic.",
      exampleStructures: [
        "Start with intent: before you write a word about [X], ask what your reader is trying to achieve when they search for it.",
        "Here's a simple framework for [Y]: break the process into three stages — awareness, evaluation, and decision — then map your content to each.",
        "Step one is always the same: define the keyword cluster before you touch the brief.",
      ],
    },
    conversational: {
      gradeLevel: "Grade 8–9",
      rationale: "Conversational marketing content should feel like a newsletter from a knowledgeable colleague — casual but credible.",
      exampleStructures: [
        "You've probably noticed that [X] keeps coming up in your analytics — here's what it actually means for your pipeline.",
        "Most fintech marketers overthink [Y]; the fix is usually simpler than you'd expect.",
        "If your [metric] is flatlining, chances are [root cause] — and there's a straightforward way to test that theory.",
      ],
    },
    "data-driven": {
      gradeLevel: "Grade 10–11",
      rationale: "Data-driven marketing content needs precision — cite the source and year for every number, and interpret the figures explicitly.",
      exampleStructures: [
        "Brands that publish [X] content at a cadence of [Y] per month generate [Z]% more MQLs than those that don't, per [Source, Year].",
        "[Metric] benchmarks for fintech sit at [X]% (industry average) — anything above [Y]% signals a content strategy that is genuinely working.",
        "The [Source] report found that [X]% of B2B fintech buyers read at least three pieces of content before requesting a demo.",
      ],
    },
  },
  developers: {
    authoritative: {
      gradeLevel: "Grade 12–13",
      rationale: "Technical audiences expect precise, high-information-density language — no hedging, no hand-holding on fundamentals.",
      exampleStructures: [
        "Implementing [X] without [Y] is not a shortcut — it is a latent security vulnerability that compounds with scale.",
        "[Protocol] mandates [requirement]; any implementation that omits this step fails compliance at the first audit.",
        "The correct abstraction here is [pattern]: it decouples [component A] from [component B] and eliminates the class of bugs caused by [issue].",
      ],
    },
    educational: {
      gradeLevel: "Grade 11–12",
      rationale: "Educational developer content should build understanding layer by layer — assume intelligence, not prior knowledge of this specific domain.",
      exampleStructures: [
        "Before you write a single line of integration code, understand what [X] actually does at the protocol level — it will save hours of debugging.",
        "The [Y] pattern solves a specific problem: [problem statement]. Here's how to recognise when you need it.",
        "Think of [X] as a contract between your service and [external system]: if either side breaks the contract, the integration fails silently.",
      ],
    },
    conversational: {
      gradeLevel: "Grade 10–11",
      rationale: "Conversational developer content works like a code review comment — direct, helpful, and free of unnecessary formality.",
      exampleStructures: [
        "If you've ever wondered why [X] throws a [error type] at exactly this step, the reason is simpler than the stack trace suggests.",
        "Most developers hit this wall on day two of the integration — here's the fix that actually works.",
        "You don't need to implement the full [Y] spec on day one; start with [minimal version] and layer in the rest as your use case grows.",
      ],
    },
    "data-driven": {
      gradeLevel: "Grade 12–13",
      rationale: "Data-driven technical content should lead with measurable benchmarks — latency, error rates, throughput — and cite the testing conditions.",
      exampleStructures: [
        "In load testing at [X] requests per second, [approach A] reduced p99 latency by [Y]ms compared to [approach B] under identical conditions.",
        "[Library/service] reports a [X]% reduction in failed webhook deliveries after implementing idempotency keys — [Source, Year].",
        "The [benchmark] shows that [X] scales linearly up to [threshold] before throughput degrades; beyond that, [mitigation] is required.",
      ],
    },
  },
  consumers: {
    authoritative: {
      gradeLevel: "Grade 8–9",
      rationale: "Consumer content needs authority without complexity — clear, reassuring, and grounded in facts the reader can verify.",
      exampleStructures: [
        "[X] is regulated by the [Authority], which means your money is protected up to [limit] — the same protection you get with a high-street bank.",
        "Independent testing by [Source] found that [X] outperforms the average [category] on [metric] — without any hidden fees.",
        "The rule is simple: if a [product] doesn't display its [regulatory credential] prominently, look elsewhere.",
      ],
    },
    educational: {
      gradeLevel: "Grade 7–8",
      rationale: "Educational consumer content should read like a conversation with a trusted friend who happens to know finance — plain, clear, and patient.",
      exampleStructures: [
        "Here's what [X] actually means in plain English: [one-sentence definition] — nothing more complicated than that.",
        "Step one: [action]. Step two: [action]. Most people stop here, but step three is where you start saving real money.",
        "Think of [X] like [everyday analogy] — once you see it that way, the rest makes sense.",
      ],
    },
    conversational: {
      gradeLevel: "Grade 6–7",
      rationale: "Conversational consumer content should feel warm and effortless — short sentences, common words, and zero jargon.",
      exampleStructures: [
        "You don't need to be a finance expert to use [X] — if you can set up a Netflix account, you can do this.",
        "It takes about five minutes to get started, and there's nothing you can do wrong in the first step.",
        "Lots of people feel nervous about [X] at first — that's normal, and it gets easier quickly.",
      ],
    },
    "data-driven": {
      gradeLevel: "Grade 8–9",
      rationale: "Data-driven consumer content should use relatable numbers — savings amounts, time saved, percentages — not industry metrics.",
      exampleStructures: [
        "The average [X] user saves £[amount] per year just by switching from a traditional bank account — that's £[daily equivalent] every day.",
        "[Source] found that [X]% of people who tried [product] stuck with it after 90 days — a higher retention rate than [comparison].",
        "Over a [timeframe], the difference between [option A] and [option B] adds up to £[amount] — enough to [relatable outcome].",
      ],
    },
  },
  investors: {
    authoritative: {
      gradeLevel: "Grade 13–14",
      rationale: "Investor content demands executive-grade prose — dense with precise terminology, free of hedging, and written to be read fast.",
      exampleStructures: [
        "[X] is not an emerging category — it is an infrastructural inevitability, and the window for category-defining positioning closes within 24 months.",
        "The structural tailwind here is regulatory: [framework] compels [behaviour], which in turn creates a durable demand floor for [solution].",
        "Operators in the [X] space who achieve [metric] by [milestone] consistently command a [Y]x revenue multiple at Series B — the data supports conviction.",
      ],
    },
    educational: {
      gradeLevel: "Grade 12–13",
      rationale: "Educational investor content should build the analytical framework first, then layer in the data — assume sophistication, not familiarity with this sub-sector.",
      exampleStructures: [
        "To evaluate [X] correctly, start with the unit economics: what does it cost to acquire a [customer type], and what is the realistic LTV at 24 months?",
        "The category breaks into three distinct business models — each with a different margin profile, burn multiple, and defensibility thesis.",
        "Before assessing any [X] operator, establish the regulatory baseline: which licences are required, in which jurisdictions, and what the typical timeline to grant looks like.",
      ],
    },
    conversational: {
      gradeLevel: "Grade 11–12",
      rationale: "Conversational investor content works like a well-structured LP update — direct, candid, and confident without being overconfident.",
      exampleStructures: [
        "The [X] opportunity is real, but the framing most analysts use understates the regulatory complexity — and that's where deal risk actually lives.",
        "Here's what the deal flow tells us: [observation] — and it's been consistent across the last three quarters.",
        "If you're building a thesis around [X], the number that matters most isn't TAM — it's [specific metric], and here's why.",
      ],
    },
    "data-driven": {
      gradeLevel: "Grade 13–14",
      rationale: "Data-driven investor content must be rigorous — every claim anchored to a named source, every projection tied to an explicit assumption.",
      exampleStructures: [
        "The [X] market reached $[size] in [year] (CAGR: [Y]%, [Source]) — with [geography] accounting for [Z]% of total deal volume.",
        "Median [metric] for [X] operators at Series A sits at [figure], per [Source]; top-quartile performers show [Y]% above the median by month [Z].",
        "The bull case rests on three assumptions: [assumption 1], [assumption 2], and [assumption 3] — each of which is testable against public comparables.",
      ],
    },
  },
};

const STYLE_GUARDRAILS: Record<Tone, StyleGuardrail[]> = {
  authoritative: [
    { writeLike: "Open with a decisive, confident claim backed by evidence", avoid: "Hedging openers — 'It could be argued that…' or 'Some believe…'" },
    { writeLike: "Use active verbs and impact-first sentence structure", avoid: "Passive constructions that dilute agency ('It was found that…')" },
    { writeLike: "Attribute every statistic to a named source and year", avoid: "Vague claims like 'studies show' or 'experts agree' with no citation" },
    { writeLike: "Deploy precise industry terminology to signal genuine expertise", avoid: "Unsubstantiated superlatives — 'the best', 'world-class', 'leading'" },
    { writeLike: "Keep paragraphs tight — one idea, three sentences maximum", avoid: "Padding with synonyms or restating the same point in different words" },
  ],
  educational: [
    { writeLike: "Define every technical term on first use, in plain language", avoid: "Assuming the reader already knows acronyms — even common ones" },
    { writeLike: "Use numbered lists and step-by-step structures for any process", avoid: "Dense prose for content that has a natural sequential structure" },
    { writeLike: "Add a 'Why this matters' sentence after each key concept", avoid: "Defining terms without connecting them to the reader's real situation" },
    { writeLike: "Aim for an average sentence length under 18 words", avoid: "Multi-clause sentences that require re-reading to parse correctly" },
    { writeLike: "Ground abstract ideas in concrete, domain-specific examples", avoid: "Generic placeholders ('Company X did Y') — use real analogies instead" },
  ],
  conversational: [
    { writeLike: "Write like you're explaining this to a smart colleague over coffee", avoid: "Boardroom jargon — 'leverage synergies', 'drive value', 'best-in-class'" },
    { writeLike: "Use contractions naturally throughout (it's, you'll, they're)", avoid: "Stiff, formal constructions that sound like a legal document or press release" },
    { writeLike: "Use relatable everyday analogies to explain complex financial ideas", avoid: "Industry acronyms without spelling them out — even familiar ones like API or AML" },
    { writeLike: "Ask rhetorical questions at section breaks to re-engage the reader", avoid: "Lecturing tone — write with the reader, not at them" },
    { writeLike: "Get to the point by sentence three in every section", avoid: "Long preambles that delay the actual value the reader came for" },
  ],
  "data-driven": [
    { writeLike: "Lead each major section with a specific, cited statistic or benchmark", avoid: "Vague quantifiers — 'many fintechs', 'a large proportion', 'most companies'" },
    { writeLike: "Name the source, publication, and year for every figure used", avoid: "Orphaned statistics with no attribution, date, or methodology note" },
    { writeLike: "Use tables or comparison structures when presenting multiple data points", avoid: "Data dumps — always interpret what numbers mean for the reader's context" },
    { writeLike: "Prefer specific figures and ranges over rounded estimates", avoid: "Statistics older than 3 years without a note or a fresher replacement" },
    { writeLike: "Acknowledge counter-evidence or limitations in your data", avoid: "Cherry-picking results that only support a predetermined conclusion" },
  ],
};

const COMPETING_ANGLES: Record<Audience, ContentAngle[]> = {
  founders: [
    { angle: "The real implementation cost breakdown most articles skip", why: "Founders need budget reality, not aspirational case studies. Specificity earns trust and drives shares among peers." },
    { angle: "What happens when it goes wrong — failure modes and recovery", why: "Competitors focus on the success path. A candid look at failure signals genuine expertise and differentiates the piece." },
    { angle: "Stage-specific advice (pre-seed vs. Series A vs. Series B)", why: "Generic founder content ignores that 'right for your startup' means entirely different things at different funding stages." },
    { angle: "Regulatory implications compared across UK, EU, and US markets", why: "Most articles pick one jurisdiction. Multi-market coverage captures searches across geographies and attracts international readers." },
  ],
  marketers: [
    { angle: "The content formats that actually convert in fintech — not just drive traffic", why: "Most fintech content marketing guides optimise for pageviews. Connecting format choice to pipeline metrics is a rare, high-value angle." },
    { angle: "How to brief and manage specialist fintech writers effectively", why: "Marketers struggle with technical accuracy and quality control — this gap is almost entirely unaddressed in the content corpus." },
    { angle: "Compliance-safe content marketing: what your legal team will actually approve", why: "A consistent pain point for fintech marketers that no generic content marketing guide addresses." },
    { angle: "Attribution for long-cycle B2B fintech deals — what attribution models actually work", why: "Standard marketing attribution advice doesn't translate to 6–18 month sales cycles. There's a clear content gap here." },
  ],
  developers: [
    { angle: "Side-by-side SDK comparison with real code — not just feature checklists", why: "Most developer content lists features; showing actual implementation differences in code is far more useful and rarely done." },
    { angle: "What production monitoring looks like 6 months after go-live", why: "Integration guides end at deployment. The operational reality after launch is almost entirely undocumented." },
    { angle: "How to handle graceful degradation when the upstream API fails", why: "Resilience patterns for third-party fintech APIs are a common gap — developers need this and it rarely appears in vendor docs." },
    { angle: "The security review checklist your compliance team will actually ask for", why: "The gap between developer implementation and security audit requirements is a consistent, underserved pain point." },
  ],
  consumers: [
    { angle: "What to do when something goes wrong — complaints, refunds, and protections", why: "Consumer content is overwhelmingly positive and promotional. A clear guide to consumer rights and recourse is almost universally missing." },
    { angle: "How this compares to what your bank already offers — honestly", why: "Readers already have a mental reference point. Content that acknowledges the comparison directly builds credibility competitors miss." },
    { angle: "The hidden fees and conditions most review sites don't flag", why: "Fee transparency content consistently outperforms promotional content in trust-building and organic search for high-intent queries." },
    { angle: "A plain-English walkthrough of the signup process — with screenshots", why: "Anxiety about the unknown is a primary barrier to conversion. Process walkthroughs are high-value, low-competition content." },
  ],
  investors: [
    { angle: "The unit economics benchmarks that separate top-quartile operators from the rest", why: "Generic market size data is everywhere. Specific performance benchmarks for deal evaluation are rare and highly valuable to LPs and analysts." },
    { angle: "What the cap table and team structure signal about operator quality", why: "Most investor content focuses on market opportunity — the human capital and governance signals are consistently underanalysed." },
    { angle: "A geography-by-geography regulatory risk matrix", why: "Investors with cross-border exposure need jurisdiction-specific regulatory analysis that most single-market content can't provide." },
    { angle: "The operational metrics VCs ask for in due diligence — and why", why: "Bridging the founder-investor information gap from the investor's side is a rare and high-authority content angle." },
  ],
};

const SME_QUESTION_TEMPLATES: Record<Audience, ((kw: string) => SMEQuestion)[]> = {
  founders: [
    (kw) => ({
      question: `What are the biggest hidden implementation costs in ${kw} that most vendors never disclose upfront?`,
      context: "Founders make budget decisions based on advertised pricing. A practitioner's frank answer exposes real costs and creates credibility that no vendor-produced content can replicate.",
    }),
    (kw) => ({
      question: `After shipping ${kw}, what would you do fundamentally differently from day one — and why?`,
      context: "Hindsight interviews are rare in fintech content. Forcing a candid reflection on mistakes distinguishes the piece from any polished case study and builds genuine authority.",
    }),
    (kw) => ({
      question: `What regulatory or compliance conversations did ${kw} force you to have earlier than you expected?`,
      context: "Regulatory friction is a consistent blindspot in founder-focused content. An SME perspective here is almost impossible to find and highly valuable for readers navigating the same path.",
    }),
  ],
  marketers: [
    (kw) => ({
      question: `Which content formats have actually moved pipeline for ${kw}, versus those that only generated traffic?`,
      context: "Most marketing content conflates vanity metrics with revenue impact. A practitioner answer that connects format choice to pipeline creates direct, conversion-focused value competitors rarely provide.",
    }),
    (kw) => ({
      question: `How do you get legal and compliance sign-off on ${kw} content without stripping out everything useful?`,
      context: "The compliance bottleneck is universally frustrating for fintech marketers. A real workflow answer from someone who has solved this is genuinely rare editorial content.",
    }),
    (kw) => ({
      question: `What's the biggest misconception your buyers have about ${kw} when they first enter the sales funnel?`,
      context: "Misalignment between marketing messaging and buyer mental models shapes every content decision. An SME answer here directly informs messaging strategy and makes the piece immediately actionable.",
    }),
  ],
  developers: [
    (kw) => ({
      question: `What's the most common mistake you see developers make when first integrating ${kw} into a production environment?`,
      context: "Practitioners have pattern-recognition on failure modes that no documentation covers. This is the highest-value developer content angle and almost entirely absent from the existing corpus.",
    }),
    (kw) => ({
      question: `How does ${kw} behave under load or in edge cases that the official API documentation doesn't address?`,
      context: "Real-world performance characteristics are almost never published. A developer SME answer here creates a genuinely irreplaceable piece that will rank for high-intent technical searches.",
    }),
    (kw) => ({
      question: `What does a clean ${kw} implementation look like architecturally, versus how most teams actually end up building it?`,
      context: "The gap between ideal patterns and real-world implementations is an almost entirely undocumented content territory. This question surfaces the opinionated, experience-backed take that developers trust most.",
    }),
  ],
  consumers: [
    (kw) => ({
      question: `What questions do people most commonly ask before they trust a product like ${kw} with their money — and how do you answer them?`,
      context: "Trust signals from a consumer-facing practitioner reveal what actually overcomes buyer hesitation. This is more useful than any UX survey and creates content that directly reduces conversion anxiety.",
    }),
    (kw) => ({
      question: `In what situations does ${kw} genuinely let consumers down, and what should they watch for before signing up?`,
      context: "Honest limitation content is almost non-existent in consumer fintech. An SME willing to go on record with this creates enormous credibility and earns links from comparison and review sites.",
    }),
    (kw) => ({
      question: `How do you explain ${kw} to someone who has never used anything beyond a traditional high-street bank account?`,
      context: "The mass-market explanation challenge reveals the communication gap that most fintech content fails to bridge. A practitioner's answer often becomes the most-shared section of the article.",
    }),
  ],
  investors: [
    (kw) => ({
      question: `What signals in a ${kw} operator's metrics tell you it's a genuine category winner versus a well-funded pretender?`,
      context: "Investors have a due-diligence lens that distinguishes exceptional content from generic market overviews. This answer is impossible to replicate without the interview and creates a defensible, high-authority piece.",
    }),
    (kw) => ({
      question: `Where is the regulatory risk in ${kw} most underpriced by the market right now?`,
      context: "Most investor content on regulatory risk is backward-looking. A practitioner forward-view creates a differentiated, high-authority piece that serious LPs and analysts will reference and share.",
    }),
    (kw) => ({
      question: `What does the team composition and cap table of the best ${kw} operators have in common that deal flow data reveals but public profiles don't?`,
      context: "Human capital signals in due diligence are almost entirely absent from public investor content. An SME take here is rare, high-value, and fills a genuine gap in the corpus.",
    }),
  ],
};

function generateEntities(keyword: string, audience: Audience): string[] {
  const kw = keyword.toLowerCase();
  for (const bucket of ENTITY_BUCKETS) {
    if (bucket.signals.some((s) => kw.includes(s))) {
      return bucket.entities;
    }
  }
  return ENTITY_FALLBACK_BY_AUDIENCE[audience];
}

function generateBrief(form: FormState): Brief {
  const kw = form.keyword.trim();
  const capKw = kw.charAt(0).toUpperCase() + kw.slice(1);
  const wc = parseInt(form.wordCount);
  const readingMinutes = Math.round(wc / 200);

  return {
    keyword: kw,
    audience: AUDIENCE_LABELS[form.audience],
    tone: TONE_LABELS[form.tone],
    targetWordCount: `${wc.toLocaleString()} words`,
    readingTime: `~${readingMinutes} min read`,
    metaTitle: `${capKw}: The Definitive Guide for ${AUDIENCE_LABELS[form.audience].split(" ")[0]}s (2025)`,
    metaDescription: `Everything ${AUDIENCE_LABELS[form.audience].toLowerCase()} need to know about ${kw} — from fundamentals to practical strategies. Read the full guide.`,
    h1: `${capKw}: What ${AUDIENCE_LABELS[form.audience].split(" ")[0]}s Need to Know in 2025`,
    intro: `Open with a 2–3 sentence hook that immediately establishes why ${kw} is relevant right now. Include a surprising statistic or a provocative question. Briefly outline what the article covers and who it's for. Keep the intro under 120 words.`,
    h2s: H2_TEMPLATES[form.audience](capKw),
    entities: generateEntities(kw, form.audience),
    faqHeadings: FAQ_TEMPLATES[form.audience](kw),
    internalLinks: INTERNAL_LINKS_BY_AUDIENCE[form.audience],
    externalLinkTypes: EXTERNAL_LINK_TYPES,
    cta: CTA_TEMPLATES[form.audience],
    toneGuidance: TONE_GUIDANCE[form.tone],
    thingsToAvoid: THINGS_TO_AVOID[form.tone],
    fleschKincaid: FK_DATA[form.audience][form.tone],
    styleGuardrails: STYLE_GUARDRAILS[form.tone],
    competingAngles: COMPETING_ANGLES[form.audience],
    smeQuestions: SME_QUESTION_TEMPLATES[form.audience].map((fn) => fn(kw)),
  };
}

function briefToText(brief: Brief): string {
  return [
    `CONTENT BRIEF: ${brief.keyword.toUpperCase()}`,
    `${"=".repeat(60)}`,
    ``,
    `OVERVIEW`,
    `--------`,
    `Target Keyword: ${brief.keyword}`,
    `Target Audience: ${brief.audience}`,
    `Tone: ${brief.tone}`,
    `Target Word Count: ${brief.targetWordCount}`,
    `Reading Time: ${brief.readingTime}`,
    ``,
    `SEO`,
    `---`,
    `Meta Title: ${brief.metaTitle}`,
    `Meta Description: ${brief.metaDescription}`,
    `H1: ${brief.h1}`,
    ``,
    `INTRO GUIDANCE`,
    `--------------`,
    brief.intro,
    ``,
    `CONTENT STRUCTURE (H2s)`,
    `-----------------------`,
    ...brief.h2s.map((h, i) => `${i + 1}. ${h.heading}\n   Notes: ${h.notes}`),
    ``,
    `SEMANTIC SEO ENTITIES (must-include)`,
    `-------------------------------------`,
    ...brief.entities.map((e) => `• ${e}`),
    ``,
    `FAQ SECTION (suggested questions)`,
    `----------------------------------`,
    ...brief.faqHeadings.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `INTERNAL LINKS`,
    `--------------`,
    ...brief.internalLinks.map((l) => `• ${l}`),
    ``,
    `EXTERNAL LINK TYPES`,
    `-------------------`,
    ...brief.externalLinkTypes.map((l) => `• ${l}`),
    ``,
    `TONE GUIDANCE`,
    `-------------`,
    ...brief.toneGuidance.map((t) => `• ${t}`),
    ``,
    `THINGS TO AVOID`,
    `---------------`,
    ...brief.thingsToAvoid.map((t) => `• ${t}`),
    ``,
    `STYLE GUARDRAILS`,
    `----------------`,
    ...brief.styleGuardrails.map((g) => `Write like this: ${g.writeLike}\nAvoid this:      ${g.avoid}`),
    ``,
    `COMPETING CONTENT ANGLES`,
    `------------------------`,
    ...brief.competingAngles.map((a, i) => `${i + 1}. ${a.angle}\n   Why: ${a.why}`),
    ``,
    `FLESCH-KINCAID READING LEVEL`,
    `----------------------------`,
    `Target Grade Level: ${brief.fleschKincaid.gradeLevel}`,
    `Rationale: ${brief.fleschKincaid.rationale}`,
    ``,
    `Example Sentence Structures:`,
    ...brief.fleschKincaid.exampleStructures.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `SME INTERVIEW QUESTIONS`,
    `-----------------------`,
    ...brief.smeQuestions.map((q, i) => `Q${i + 1}: ${q.question}\n     Why ask this: ${q.context}`),
    ``,
    `CTA`,
    `---`,
    brief.cta,
  ].join("\n");
}

function briefToMarkdown(brief: Brief): string {
  const lines: string[] = [];
  const capKw = brief.keyword.charAt(0).toUpperCase() + brief.keyword.slice(1);

  lines.push(`# Content Brief: ${capKw}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## Overview`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| **Target Keyword** | ${brief.keyword} |`);
  lines.push(`| **Target Audience** | ${brief.audience} |`);
  lines.push(`| **Tone** | ${brief.tone.split(" — ")[0]} |`);
  lines.push(`| **Word Count** | ${brief.targetWordCount} |`);
  lines.push(`| **Reading Time** | ${brief.readingTime} |`);
  lines.push(``);

  lines.push(`## SEO Copy`);
  lines.push(``);
  lines.push(`**Meta Title:** ${brief.metaTitle}`);
  lines.push(``);
  lines.push(`**Meta Description:** ${brief.metaDescription}`);
  lines.push(``);
  lines.push(`**H1:** ${brief.h1}`);
  lines.push(``);
  lines.push(`### Intro Guidance`);
  lines.push(``);
  lines.push(`> ${brief.intro}`);
  lines.push(``);

  lines.push(`## Content Structure (H2s)`);
  lines.push(``);
  brief.h2s.forEach((h, i) => {
    lines.push(`### ${i + 1}. ${h.heading}`);
    lines.push(``);
    lines.push(`> **Notes:** ${h.notes}`);
    lines.push(``);
  });

  lines.push(`## Semantic SEO Entities`);
  lines.push(``);
  lines.push(`Must include these terms naturally throughout the article:`);
  lines.push(``);
  brief.entities.forEach((e) => lines.push(`- ${e}`));
  lines.push(``);

  lines.push(`## FAQ Suggestions`);
  lines.push(``);
  brief.faqHeadings.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push(``);

  lines.push(`## Internal Link Opportunities`);
  lines.push(``);
  brief.internalLinks.forEach((l) => lines.push(`- ${l}`));
  lines.push(``);

  lines.push(`## External Link Types`);
  lines.push(``);
  brief.externalLinkTypes.forEach((l) => lines.push(`- ${l}`));
  lines.push(``);

  lines.push(`## Style Guardrails`);
  lines.push(``);
  lines.push(`| Write Like This | Avoid This |`);
  lines.push(`|---|---|`);
  brief.styleGuardrails.forEach((g) => lines.push(`| ${g.writeLike} | ${g.avoid} |`));
  lines.push(``);
  lines.push(`**Additional tone notes:**`);
  lines.push(``);
  brief.toneGuidance.forEach((t) => lines.push(`- ${t}`));
  lines.push(``);
  lines.push(`**Things to flag in review:**`);
  lines.push(``);
  brief.thingsToAvoid.forEach((t) => lines.push(`- ${t}`));
  lines.push(``);

  lines.push(`## Competing Content Angles`);
  lines.push(``);
  brief.competingAngles.forEach((a, i) => {
    lines.push(`### #${i + 1}: ${a.angle}`);
    lines.push(``);
    lines.push(`> ${a.why}`);
    lines.push(``);
  });

  lines.push(`## Flesch–Kincaid Reading Level`);
  lines.push(``);
  lines.push(`**Target Grade Level:** ${brief.fleschKincaid.gradeLevel}`);
  lines.push(``);
  lines.push(brief.fleschKincaid.rationale);
  lines.push(``);
  lines.push(`**Example Sentence Structures:**`);
  lines.push(``);
  brief.fleschKincaid.exampleStructures.forEach((s, i) => lines.push(`${i + 1}. *${s}*`));
  lines.push(``);

  lines.push(`## SME Interview Questions`);
  lines.push(``);
  lines.push(`Use these questions to get unique quotes and insights from a Subject Matter Expert before drafting.`);
  lines.push(``);
  brief.smeQuestions.forEach((q, i) => {
    lines.push(`### Q${i + 1}`);
    lines.push(``);
    lines.push(`**"${q.question}"**`);
    lines.push(``);
    lines.push(`> *Why ask this:* ${q.context}`);
    lines.push(``);
  });

  lines.push(`## CTA Guidance`);
  lines.push(``);
  lines.push(`> ${brief.cta}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Generated by [FintechPressHub Content Brief Generator](https://www.fintechpresshub.com/tools/content-brief-generator)*`);

  return lines.join("\n");
}

const GENERATING_MESSAGES = [
  "Analyzing SERP Gaps...",
  "Mapping Topical Authority...",
  "Calibrating Tone Profile...",
  "Structuring H2 Framework...",
  "Extracting Semantic Entities...",
  "Compiling Style Guardrails...",
  "Identifying Content Gaps...",
  "Finalizing Your Brief...",
];

function EntityPill({ entity }: { entity: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setChecked((v) => !v)}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-150 select-none ${
        checked
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50"
      }`}
    >
      {checked && <Check className="w-3 h-3 shrink-0" />}
      <span className={checked ? "line-through" : ""}>{entity}</span>
    </button>
  );
}

export default function ContentBriefGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessageIdx, setGenMessageIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(DEFAULTS);
    setBrief(null);
    setIsGenerating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const TOTAL_DURATION = 2200;
  const MSG_INTERVAL = TOTAL_DURATION / GENERATING_MESSAGES.length;

  const generate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setBrief(null);
    setIsGenerating(true);
    setGenMessageIdx(0);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx += 1;
      if (idx < GENERATING_MESSAGES.length) {
        setGenMessageIdx(idx);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, MSG_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsGenerating(false);
      setBrief(generateBrief(form));
    }, TOTAL_DURATION);
  };

  const copyBrief = () => {
    if (!brief) return;
    navigator.clipboard.writeText(briefToText(brief));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBriefAsMarkdown = () => {
    if (!brief) return;
    navigator.clipboard.writeText(briefToMarkdown(brief));
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const downloadBrief = () => {
    if (!brief) return;
    const blob = new Blob([briefToText(brief)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brief.keyword.replace(/\s+/g, "-").toLowerCase()}-content-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canGenerate = form.keyword.trim().length >= 3;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="contentBriefGenerator" />

      <PageHero
        eyebrow="Free Tool"
        title="Content Brief Generator"
        description="Enter a keyword and target audience to get a structured fintech article brief — with H2s, meta copy, tone guidelines, FAQ suggestions, and internal link opportunities."
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All free tools
          </Link>

          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Brief Settings</h2>
                    <p className="text-xs text-muted-foreground">
                      Enter your keyword and choose your audience to get a tailored brief.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="space-y-5 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-rose-600" />
                    Target Keyword / Topic <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. embedded finance, open banking regulation, BNPL for businesses"
                    value={form.keyword}
                    onChange={(e) => setField("keyword", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canGenerate) generate(); }}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the main keyword or topic the article should rank for.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-600" />
                    Target Audience
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setField("audience", a)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          form.audience === a
                            ? "border-rose-400 bg-rose-50 text-rose-800 font-medium"
                            : "border-border text-muted-foreground hover:border-rose-300"
                        }`}
                      >
                        {AUDIENCE_LABELS[a]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-600" />
                    Writing Tone
                  </Label>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField("tone", t)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          form.tone === t
                            ? "border-rose-400 bg-rose-50 text-rose-800 font-medium"
                            : "border-border text-muted-foreground hover:border-rose-300"
                        }`}
                      >
                        {TONE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600" />
                    Target Word Count
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(["800", "1200", "1800", "2500"] as WordCount[]).map((wc) => (
                      <button
                        key={wc}
                        type="button"
                        onClick={() => setField("wordCount", wc)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.wordCount === wc
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-muted-foreground border-border hover:border-rose-400 hover:text-rose-600"
                        }`}
                      >
                        {parseInt(wc).toLocaleString()} words
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={!canGenerate || isGenerating}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content Brief
              </Button>
            </CardContent>
          </Card>

          {/* Generating progress bar */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                <Card className="border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4 text-rose-400" />
                      </motion.div>
                      <p className="text-sm font-semibold text-white tracking-tight">Generating Brief…</p>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.p
                        key={genMessageIdx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.22 }}
                        className="text-[11px] text-slate-400 font-mono mb-3 h-4"
                      >
                        {GENERATING_MESSAGES[genMessageIdx]}
                      </motion.p>
                    </AnimatePresence>

                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-rose-600 via-rose-400 to-rose-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.2, ease: "linear" }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {GENERATING_MESSAGES.map((msg, i) => (
                        <span
                          key={i}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-all duration-300 ${
                            i <= genMessageIdx
                              ? "bg-rose-900/60 text-rose-300"
                              : "bg-slate-800 text-slate-600"
                          }`}
                        >
                          {msg.replace("...", "")}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {brief && (
              <motion.div
                key={brief.keyword}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Brief for "{brief.keyword}"
                  </h3>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" onClick={copyBrief} className="gap-1.5">
                      {copied ? (
                        <><Check className="w-4 h-4 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyBriefAsMarkdown}
                      className={`gap-1.5 transition-all ${
                        copiedMd
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "hover:border-violet-300 hover:text-violet-700"
                      }`}
                    >
                      {copiedMd ? (
                        <><Check className="w-4 h-4 text-violet-600" /> Markdown Copied</>
                      ) : (
                        <><FileCode className="w-4 h-4" /> Copy as Markdown</>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadBrief} className="gap-1.5">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Overview */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-600" /> Overview
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {[
                        { label: "Audience", value: brief.audience },
                        { label: "Tone", value: brief.tone.split(" — ")[0] },
                        { label: "Word count", value: brief.targetWordCount },
                        { label: "Reading time", value: brief.readingTime },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-xs font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SEO */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-rose-600" /> SEO Copy
                    </h4>
                    {[
                      { label: "Meta Title", value: brief.metaTitle },
                      { label: "Meta Description", value: brief.metaDescription },
                      { label: "H1", value: brief.h1 },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="text-sm text-slate-800 leading-snug bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{value}</p>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Intro Guidance</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{brief.intro}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* H2s */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-rose-600" /> Content Structure (H2s)
                    </h4>
                    <div className="space-y-2">
                      {brief.h2s.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            <span className="text-rose-500 mr-1.5">H2</span>{h.heading}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.notes}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Semantic SEO Entities */}
                {brief.entities && brief.entities.length > 0 && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-rose-600" /> Semantic SEO Entities
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Must-include terms for topical authority. Click each pill to check it off as you write.
                          </p>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-0.5">
                          {brief.entities.length} entities
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {brief.entities.map((entity) => (
                          <EntityPill key={`${brief.keyword}-${entity}`} entity={entity} />
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                        These entities signal topical depth to search engines. Mention each naturally at least once — don't force them.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* FAQ + Links + Tone side-by-side cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-rose-600" /> FAQ Suggestions
                      </h4>
                      {brief.faqHeadings.map((q, i) => (
                        <p key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-snug">
                          {q}
                        </p>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-rose-600" /> Internal Link Opportunities
                      </h4>
                      {brief.internalLinks.map((l, i) => (
                        <p key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-snug">
                          {l}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Tone guidance + Style Guardrails */}
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-rose-600" /> Style Guardrails
                    </h4>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Tone-specific writing rules for this brief — paired for quick editorial reference.
                    </p>

                    <div className="rounded-lg border border-slate-200 overflow-hidden mb-4">
                      <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200">
                        <div className="px-3 py-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Write Like This</span>
                        </div>
                        <div className="px-3 py-2 flex items-center gap-1.5 border-l border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">Avoid This</span>
                        </div>
                      </div>
                      {brief.styleGuardrails.map((row, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className={`grid grid-cols-2 ${i < brief.styleGuardrails.length - 1 ? "border-b border-slate-100" : ""}`}
                        >
                          <div className="px-3 py-2.5 flex gap-2 items-start bg-emerald-50/40">
                            <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-700 leading-relaxed">{row.writeLike}</p>
                          </div>
                          <div className="px-3 py-2.5 flex gap-2 items-start border-l border-slate-100 bg-red-50/30">
                            <span className="mt-1 text-[10px] font-bold text-red-400 shrink-0">✕</span>
                            <p className="text-xs text-slate-600 leading-relaxed">{row.avoid}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Additional tone notes</p>
                        <ul className="space-y-1.5">
                          {brief.toneGuidance.map((t, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Things to flag in review</p>
                        <ul className="space-y-1.5">
                          {brief.thingsToAvoid.map((t, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Competing Content Snapshot */}
                <Card className="border border-amber-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-amber-500" /> Competing Content Snapshot
                    </h4>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Angles your competitors are likely missing for this audience — each represents a differentiation opportunity.
                    </p>
                    <div className="space-y-2.5">
                      {brief.competingAngles.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3"
                        >
                          <p className="text-xs font-semibold text-amber-900 leading-snug mb-1">
                            <span className="text-amber-400 font-bold mr-1.5">#{i + 1}</span>{item.angle}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.why}</p>
                        </motion.div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                      Review competitor SERPs for this keyword and note which of these angles are absent — prioritise the gaps with the highest search intent match.
                    </p>
                  </CardContent>
                </Card>

                {/* Flesch-Kincaid Reading Level */}
                <Card className="border border-indigo-100 shadow-sm">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Flesch–Kincaid Reading Level Recommendation
                    </h4>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Calibrated to your selected audience and tone.
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-indigo-600 text-white shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">Target</p>
                          <p className="text-base font-extrabold leading-tight">{brief.fleschKincaid.gradeLevel.replace("Grade ", "")}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-indigo-800 mb-0.5">{brief.fleschKincaid.gradeLevel}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{brief.fleschKincaid.rationale}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 mb-2">
                        Example Sentence Structures
                      </p>
                      <div className="space-y-2">
                        {brief.fleschKincaid.exampleStructures.map((s, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5"
                          >
                            <span className="mt-0.5 text-[10px] font-bold text-indigo-400 shrink-0 w-4">{i + 1}.</span>
                            <p className="text-xs text-slate-700 leading-relaxed italic">{s}</p>
                          </motion.div>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                        Use these as structural templates when drafting — replace bracketed placeholders with specific details from your keyword and research.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* SME Interview Questions */}
                <Card className="border border-sky-100 shadow-sm bg-gradient-to-br from-sky-50/60 to-white">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                      <HelpCircle className="w-4 h-4 text-sky-600" /> Suggested SME Interview Questions
                    </h4>
                    <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                      Ask a Subject Matter Expert these questions before drafting — their answers become the unique quotes and insights that separate this piece from anything AI can generate alone.
                    </p>

                    <div className="space-y-3">
                      {(brief.smeQuestions ?? []).map((q, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="rounded-xl border border-sky-100 bg-white shadow-sm overflow-hidden"
                        >
                          <div className="flex items-start gap-3 px-4 py-3.5">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-600 text-white text-[10px] font-extrabold flex items-center justify-center mt-0.5">
                              Q{i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 leading-snug mb-2">
                                "{q.question}"
                              </p>
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-sky-500 mt-0.5 shrink-0">Why ask</span>
                                <p className="text-[11px] text-slate-500 leading-relaxed">{q.context}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <p className="mt-4 text-[10px] text-slate-400 leading-relaxed border-t border-sky-100 pt-3">
                      Tip: Record the interview, get a transcript, and pull 2–3 direct quotes into the article. Even a single authentic practitioner quote creates content that AI rewrites cannot replicate.
                    </p>
                  </CardContent>
                </Card>

                {/* CTA guidance */}
                <Card className="border border-rose-100 bg-rose-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-rose-800 mb-1">CTA Guidance</p>
                    <p className="text-xs text-rose-700 leading-relaxed">{brief.cta}</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Need a fintech writer to execute this brief?{" "}
                      <Link href="/services" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        See our content services
                      </Link>{" "}
                      or{" "}
                      <Link href="/contact" className="font-semibold underline underline-offset-2 hover:text-slate-900">
                        send us the brief directly
                      </Link>
                      .
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
