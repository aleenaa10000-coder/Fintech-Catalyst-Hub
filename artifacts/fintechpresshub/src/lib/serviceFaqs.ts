export type ServiceFaq = { question: string; answer: string };

export const serviceFaqsBySlug: Record<string, ServiceFaq[]> = {
  "fintech-content-writing": [
    {
      question: "Who actually writes the articles?",
      answer:
        "Senior writers with backgrounds in banking, payments, lending, crypto, or wealth tech — never generalist freelancers. Every brief is scoped by a fintech editor, drafted by a domain writer, and reviewed by a senior editor before it ships.",
    },
    {
      question: "How long are the articles, and how many do I get per month?",
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
        "We've shipped topical maps for embedded finance, BNPL, payments orchestration, B2B lending, neobanking, wealth tech, RegTech, crypto on/off-ramps, and SMB banking. If you operate in fintech, we can build a topical map for your category.",
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

export function getServiceFaqs(slug: string): ServiceFaq[] {
  return serviceFaqsBySlug[slug] ?? [];
}
