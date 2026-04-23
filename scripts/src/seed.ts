import {
  db,
  blogPostsTable,
  pricingPlansTable,
  servicesTable,
  testimonialsTable,
  siteStatsTable,
} from "@workspace/db";

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(blogPostsTable);
  await db.delete(pricingPlansTable);
  await db.delete(servicesTable);
  await db.delete(testimonialsTable);
  await db.delete(siteStatsTable);

  console.log("Seeding services...");
  await db.insert(servicesTable).values([
    {
      slug: "fintech-content-writing",
      name: "Fintech Content Writing",
      tagline: "Long-form articles written by analysts who understand finance.",
      description:
        "Editorial-grade blog posts, white papers, and pillar pages crafted by writers with backgrounds in banking, payments, lending, crypto, and wealth tech. Every piece is built on original research, mapped to high-intent search queries, and edited by a senior reviewer before it ships.",
      deliverables: [
        "Topic and keyword research mapped to your funnel",
        "1,500–3,500 word SEO-optimized articles",
        "Original charts, data points, and expert quotes",
        "On-page SEO with internal linking strategy",
        "Editorial QA by a senior fintech reviewer",
      ],
      icon: "file-text",
    },
    {
      slug: "off-page-seo",
      name: "Off-Page SEO & Authority Building",
      tagline: "Earn the backlinks that move rankings — not the ones that don’t.",
      description:
        "A monthly off-page SEO program focused on relevance, traffic, and Domain Rating that actually correlates with rankings. We combine digital PR, niche edits, broken-link reclamation, and HARO-style citations to build a defensible link profile inside the fintech and finance vertical.",
      deliverables: [
        "Custom link gap and competitor backlink analysis",
        "Outreach to vetted finance, SaaS, and fintech publications",
        "Niche edits and contextual placements (DR 50+)",
        "HARO and expert source citations",
        "Monthly anchor text and velocity reporting",
      ],
      icon: "link-2",
    },
    {
      slug: "guest-posting",
      name: "Guest Posting on Finance Publications",
      tagline: "Featured placements on the publications your buyers already read.",
      description:
        "We pitch, write, and place guest contributions on tier-1 and tier-2 finance, fintech, and B2B SaaS publications. Each placement is editorial — vetted for organic traffic, niche relevance, and a clean backlink profile — never a paid network site.",
      deliverables: [
        "Curated list of target publications matched to your ICP",
        "Editorial pitching by a dedicated outreach lead",
        "Bylined articles ghostwritten in your voice",
        "Contextual, dofollow links to priority pages",
        "Live placements tracked in a shared dashboard",
      ],
      icon: "newspaper",
    },
    {
      slug: "topical-authority",
      name: "Topical Authority Programs",
      tagline: "Own a category in search — not just a few keywords.",
      description:
        "A 90-day program that maps every search query inside a fintech sub-vertical (BNPL, embedded finance, wealth tech, payments, etc.) and produces the cluster of pillar pages, supporting articles, and internal links required to be the canonical resource Google rewards.",
      deliverables: [
        "Full topical map of your sub-vertical",
        "Pillar page + supporting article production plan",
        "Internal linking architecture",
        "On-page SEO and entity optimization",
        "Quarterly topical authority audit",
      ],
      icon: "target",
    },
  ]);

  console.log("Seeding pricing plans...");
  await db.insert(pricingPlansTable).values([
    {
      name: "Launch",
      tagline: "For early-stage fintechs starting their content engine.",
      priceMonthly: 1490,
      priceUnit: "USD/month",
      description:
        "Everything an early-stage fintech needs to publish consistently and start earning relevance signals — without hiring a full in-house team.",
      features: [
        "4 long-form articles (up to 1,500 words)",
        "Keyword research and content briefs",
        "On-page SEO and internal linking",
        "5 contextual backlinks per month",
        "Monthly performance report",
      ],
      ctaLabel: "Start with Launch",
      highlighted: false,
      sortOrder: 1,
    },
    {
      name: "Growth",
      tagline: "Most popular for fintechs ready to compete on search.",
      priceMonthly: 3490,
      priceUnit: "USD/month",
      description:
        "A full content + off-page SEO engine designed to push priority pages onto page one and build a defensible backlink profile inside your category.",
      features: [
        "8 long-form articles (up to 2,500 words)",
        "Topical map and content cluster planning",
        "12 contextual backlinks per month (DR 50+)",
        "2 guest post placements on finance publications",
        "Quarterly content audit and refresh program",
        "Dedicated account strategist",
      ],
      ctaLabel: "Choose Growth",
      highlighted: true,
      sortOrder: 2,
    },
    {
      name: "Authority",
      tagline: "For fintechs scaling past Series B and competing nationally.",
      priceMonthly: 6990,
      priceUnit: "USD/month",
      description:
        "An end-to-end topical authority program built for fintechs who want to be the canonical resource for their category in organic search.",
      features: [
        "16 long-form articles + 2 pillar pages",
        "Custom data studies and original research",
        "25 contextual backlinks per month (DR 60+)",
        "4 guest placements on tier-1 finance publications",
        "Digital PR and HARO outreach program",
        "Quarterly executive review with strategy team",
      ],
      ctaLabel: "Apply for Authority",
      highlighted: false,
      sortOrder: 3,
    },
  ]);

  console.log("Seeding testimonials...");
  await db.insert(testimonialsTable).values([
    {
      name: "Marcus Whitfield",
      role: "Head of Growth",
      company: "Northwind Payments",
      quote:
        "FintechPressHub turned our blog from a cost center into our top inbound channel. We went from page four to page one for 'embedded payments API' in under five months — and the writing actually sounds like our team wrote it.",
      rating: 5,
    },
    {
      name: "Priya Ramaswamy",
      role: "VP Marketing",
      company: "LedgerLine",
      quote:
        "We had tried two agencies before and got generic SaaS copy that no one in finance would read. The team here clearly understands lending, compliance, and the people we sell to. Bookings from organic traffic are up 4.1x year over year.",
      rating: 5,
    },
    {
      name: "David Okonkwo",
      role: "Founder & CEO",
      company: "Tessera Wealth",
      quote:
        "The off-page SEO program is what finally moved the needle. They earned us placements on publications I couldn't get a returned email from, and our domain rating climbed 22 points in two quarters.",
      rating: 5,
    },
    {
      name: "Hannah Liu",
      role: "Director of Content",
      company: "Fintral",
      quote:
        "Working with FintechPressHub feels like having a senior fintech editorial team on retainer. Briefs are sharp, drafts are clean, and the SEO results show up in the dashboard, not just in slide decks.",
      rating: 5,
    },
  ]);

  console.log("Seeding stats...");
  await db.insert(siteStatsTable).values({
    clientsServed: 184,
    articlesPublished: 2350,
    backlinksAcquired: 9700,
    averageDomainRating: 62,
  });

  console.log("Seeding blog posts...");
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  await db.insert(blogPostsTable).values([
    {
      slug: "fintech-seo-strategy-2026",
      title: "The Fintech SEO Playbook for 2026: What Actually Moves Rankings",
      excerpt:
        "Generic SaaS SEO advice doesn't work for fintech. Here's the strategy our team uses to take regulated finance brands from page four to page one.",
      content:
        "Fintech is one of the most competitive verticals in organic search. You're competing with publishers, incumbent banks, and venture-backed challengers — all bidding on the same intent. This playbook walks through the four pillars we use with every client: topical authority, editorial-grade content, off-page signal velocity, and entity optimization. We cover how to map a sub-vertical, how to brief writers who actually understand compliance, and how to structure internal linking so pillar pages compound. By the end, you'll have a model you can take to your team or your agency and audit against your current program.",
      author: "Elena Marsh",
      authorRole: "Head of SEO Strategy",
      category: "SEO Strategy",
      tags: ["SEO", "Fintech", "Strategy", "Topical Authority"],
      coverImage:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 12,
      featured: true,
      publishedAt: day(2),
    },
    {
      slug: "off-page-seo-link-building-finance",
      title: "Off-Page SEO for Finance Brands: Earning Links That Actually Rank",
      excerpt:
        "Most link building programs sold to fintechs are noise. Here's how to build a backlink profile that compounds — and survives core updates.",
      content:
        "Domain Rating is a vanity metric until it's tied to relevance. In this guide, we break down the off-page SEO framework we use to earn links from real finance publications, niche fintech blogs, and contextual SaaS sites. You'll learn how to score a target list by topical relevance and traffic, how to pitch editors without sounding like a sales rep, and how to use HARO, broken-link reclamation, and digital PR to keep your link velocity natural. We also cover the anchor text mix that protects against spam classifiers and the cadence we recommend for sustained ranking gains.",
      author: "Jordan Reyes",
      authorRole: "Director of Off-Page SEO",
      category: "Off-Page SEO",
      tags: ["Off-Page SEO", "Link Building", "Digital PR"],
      coverImage:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 14,
      featured: true,
      publishedAt: day(7),
    },
    {
      slug: "guest-posting-fintech-publications",
      title: "Guest Posting on Tier-1 Finance Publications: A Realistic Guide",
      excerpt:
        "Bylined articles on the right publications still move pipeline and rankings. Here's how to land them — and what editors are actually looking for in 2026.",
      content:
        "Guest posting got a bad name because of paid networks and spun content. But editorial guest contributions on real finance publications are still one of the most defensible link and authority plays available to fintechs. This article walks through how to identify publications that match your ICP, how to develop a pitch angle editors say yes to, how to ghostwrite for executives without losing their voice, and how to negotiate dofollow links inside contextual placements. We also share the post-placement checklist we use to extract maximum SEO and pipeline value from every byline.",
      author: "Ade Akinola",
      authorRole: "Editorial Outreach Lead",
      category: "Guest Posting",
      tags: ["Guest Posting", "Outreach", "Authority Building"],
      coverImage:
        "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 11,
      featured: true,
      publishedAt: day(14),
    },
    {
      slug: "topical-authority-fintech",
      title: "Building Topical Authority in a Regulated Fintech Sub-Vertical",
      excerpt:
        "Owning a category in search is a strategy, not a content quota. Here's the topical map we build for every fintech client before we publish a single article.",
      content:
        "Topical authority is the most under-rated SEO concept of the last five years — and the most powerful in regulated verticals. In this article we walk through how to map every entity, sub-topic, and intent inside a fintech category, how to architect a pillar-and-cluster system around it, and how to sequence production so internal linking compounds from week one. The same framework has taken clients from non-existent in their category to top-three rankings on more than 200 commercial keywords inside a single year.",
      author: "Elena Marsh",
      authorRole: "Head of SEO Strategy",
      category: "SEO Strategy",
      tags: ["Topical Authority", "Strategy", "Pillar Pages"],
      coverImage:
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 13,
      featured: false,
      publishedAt: day(21),
    },
    {
      slug: "fintech-content-marketing-roi",
      title: "How to Measure ROI on Fintech Content Marketing (Without Lying to Yourself)",
      excerpt:
        "Most fintech content dashboards are vanity in disguise. Here's the attribution model we use to prove content's contribution to pipeline and revenue.",
      content:
        "Content marketing in fintech has a measurement problem. Long sales cycles, multi-touch journeys, and compliance gates make last-click attribution useless. In this article, our analytics team walks through the multi-touch model we use with B2B fintech clients — combining first-touch, decay-weighted, and self-reported attribution — to show exactly how content contributes to pipeline and revenue. We include a downloadable template and the dashboard structure we ship with every Growth-tier engagement.",
      author: "Sasha Liang",
      authorRole: "Analytics Lead",
      category: "Analytics",
      tags: ["Attribution", "Analytics", "Content ROI"],
      coverImage:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 10,
      featured: false,
      publishedAt: day(28),
    },
    {
      slug: "writing-for-compliance-fintech",
      title: "Writing Content That Passes Compliance Without Killing Conversion",
      excerpt:
        "The best fintech content lives at the intersection of legal, brand, and growth. Here's how our editorial team ships work all three teams sign off on.",
      content:
        "Most fintechs lose weeks every quarter to compliance review cycles that could have been avoided in the brief. In this guide, our editorial leadership walks through the briefing system we use to align legal, brand, and growth before a single word is written. You'll see the disclaimer library we maintain, the claim-substantiation checklist we ship with every draft, and the redline workflow we use to keep cycle times under five business days even on regulated topics like lending, crypto, and investment products.",
      author: "Hannah Liu",
      authorRole: "Editorial Director",
      category: "Editorial",
      tags: ["Compliance", "Editorial", "Process"],
      coverImage:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 9,
      featured: false,
      publishedAt: day(40),
    },
    {
      slug: "internal-linking-fintech-blogs",
      title: "Internal Linking for Fintech Blogs: The Architecture That Compounds",
      excerpt:
        "Internal linking is the single most under-used SEO lever in fintech. Here's the architecture we deploy that turns existing content into a growth engine.",
      content:
        "Most fintech blogs leave 30–50% of their potential organic traffic on the table because of weak internal linking. In this article, our technical SEO team walks through the hub-and-spoke architecture we deploy for clients — from how we identify revenue-bearing money pages, to the contextual link patterns we use inside long-form articles, to the nav and sidebar tweaks that distribute link equity efficiently. Includes the audit script we use to find broken and orphaned pages.",
      author: "Marcus Devine",
      authorRole: "Technical SEO Lead",
      category: "Technical SEO",
      tags: ["Internal Linking", "Technical SEO", "Architecture"],
      coverImage:
        "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 8,
      featured: false,
      publishedAt: day(55),
    },
    {
      slug: "ai-content-fintech-google",
      title: "AI Content in Fintech: What Google Actually Penalizes (And What It Doesn't)",
      excerpt:
        "AI-assisted content isn't a death sentence for rankings — but unedited AI sludge is. Here's where we draw the line in our editorial process.",
      content:
        "There is a lot of fear and a lot of hype about AI content in regulated verticals like fintech. In this article, we share the editorial policy our team uses internally — what we let AI assist with, what we never let it touch, and the human review checkpoints that keep our work safely on the right side of Google's helpful content guidance. We also include the disclosure framework we recommend clients adopt to future-proof against likely regulatory changes in 2026 and beyond.",
      author: "Elena Marsh",
      authorRole: "Head of SEO Strategy",
      category: "SEO Strategy",
      tags: ["AI Content", "Google Updates", "Editorial Policy"],
      coverImage:
        "https://images.unsplash.com/photo-1488229297570-58520851e868?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 11,
      featured: false,
      publishedAt: day(70),
    },
    {
      slug: "fintech-pr-link-building",
      title: "Digital PR for Fintech: Earning Coverage That Earns Links",
      excerpt:
        "The best fintech link building programs of 2026 look more like newsrooms than outreach factories. Here's the digital PR framework we use.",
      content:
        "Digital PR has become the most efficient way to earn high-authority links in finance — but only if you have something genuinely newsworthy to pitch. In this article, our PR lead walks through the four story angles that consistently earn coverage from finance journalists (proprietary data, contrarian takes, regulatory commentary, and category-defining frameworks), how we package and pitch each, and the typical placement-to-link conversion rates we see across each format.",
      author: "Jordan Reyes",
      authorRole: "Director of Off-Page SEO",
      category: "Off-Page SEO",
      tags: ["Digital PR", "Link Building", "Outreach"],
      coverImage:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
      readingMinutes: 12,
      featured: false,
      publishedAt: day(85),
    },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
