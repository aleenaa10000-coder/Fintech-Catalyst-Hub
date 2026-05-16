import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { useState, useMemo } from "react";
import { SITE_URL } from "@/lib/metaData";

type Publication = {
  name: string;
  url: string;
  dr: number;
  tier: 1 | 2 | 3;
  focus: string;
  region: string;
  guestPosts: boolean;
  notes: string;
};

const publications: Publication[] = [
  { name: "Finextra", url: "https://www.finextra.com", dr: 76, tier: 1, focus: "Banking & payments news", region: "Global", guestPosts: true, notes: "High editorial bar; expert bylines only" },
  { name: "PYMNTS", url: "https://www.pymnts.com", dr: 74, tier: 1, focus: "Payments & commerce", region: "US", guestPosts: false, notes: "Original research and exclusives preferred" },
  { name: "Finovate", url: "https://finovate.com", dr: 71, tier: 1, focus: "Fintech demos & startups", region: "Global", guestPosts: true, notes: "Demo-driven; good for product launches" },
  { name: "The Financial Brand", url: "https://thefinancialbrand.com", dr: 68, tier: 1, focus: "Banking marketing & CX", region: "US", guestPosts: true, notes: "Long-form, data-rich articles preferred" },
  { name: "Fintech Futures", url: "https://www.fintechfutures.com", dr: 65, tier: 1, focus: "Banking tech & core systems", region: "Global", guestPosts: true, notes: "Strong EU/UK audience" },
  { name: "Tearsheet", url: "https://tearsheet.co", dr: 62, tier: 1, focus: "Modern banking business", region: "US", guestPosts: false, notes: "High-quality editorial; pitch via LinkedIn" },
  { name: "The Paypers", url: "https://thepaypers.com", dr: 58, tier: 2, focus: "Payments & open banking", region: "EU/Global", guestPosts: true, notes: "Strong for PSD3, A2A, and open banking content" },
  { name: "Fintech Magazine", url: "https://fintechmagazine.com", dr: 56, tier: 2, focus: "Fintech industry news", region: "Global", guestPosts: true, notes: "BizClik Media; broad fintech coverage" },
  { name: "Bankless Times", url: "https://www.banklesstimes.com", dr: 52, tier: 2, focus: "Open finance & crypto", region: "Global", guestPosts: true, notes: "Good for DeFi and neobanking content" },
  { name: "AltFi", url: "https://www.altfi.com", dr: 51, tier: 2, focus: "Alternative finance & lending", region: "UK", guestPosts: false, notes: "UK-focused alternative lending" },
  { name: "Crowdfund Insider", url: "https://www.crowdfundinsider.com", dr: 60, tier: 2, focus: "Crowdfunding & crypto", region: "US", guestPosts: true, notes: "Accepts expert columns" },
  { name: "Fintechnews Singapore", url: "https://fintechnews.sg", dr: 48, tier: 2, focus: "APAC fintech", region: "APAC", guestPosts: true, notes: "Best for MAS, Singapore, and APAC content" },
  { name: "Fintechnews Switzerland", url: "https://fintechnews.ch", dr: 46, tier: 2, focus: "Swiss & EU fintech", region: "EU", guestPosts: true, notes: "Swiss banking and WealthTech focus" },
  { name: "Payments Cards & Mobile", url: "https://paymentscardsandmobile.com", dr: 44, tier: 2, focus: "Card payments & issuing", region: "EU/UK", guestPosts: true, notes: "Card issuing, acquiring, and tokenisation" },
  { name: "IBS Intelligence", url: "https://ibsintelligence.com", dr: 53, tier: 2, focus: "Banking software & core", region: "Global", guestPosts: true, notes: "Strong for core banking and SaaS content" },
  { name: "The Block", url: "https://www.theblock.co", dr: 72, tier: 1, focus: "Crypto & DeFi", region: "Global", guestPosts: false, notes: "Research-driven; data exclusives only" },
  { name: "Ledger Insights", url: "https://www.ledgerinsights.com", dr: 55, tier: 2, focus: "Enterprise blockchain", region: "Global", guestPosts: true, notes: "B2B blockchain and CBDC focus" },
  { name: "Global Finance Magazine", url: "https://gfmag.com", dr: 67, tier: 1, focus: "Corporate & trade finance", region: "Global", guestPosts: true, notes: "Long editorial cycles; strong brand recognition" },
  { name: "Fintech Connect", url: "https://www.fintechconnect.com", dr: 40, tier: 3, focus: "Events & networking", region: "UK/EU", guestPosts: true, notes: "Good for event-adjacent content" },
  { name: "FF News", url: "https://ffnews.com", dr: 43, tier: 3, focus: "Fintech press releases & news", region: "Global", guestPosts: true, notes: "Low barrier; useful for brand presence" },
];

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1", color: "bg-[#0052FF]/10 text-[#0052FF]" },
  2: { label: "Tier 2", color: "bg-emerald-100 text-emerald-700" },
  3: { label: "Tier 3", color: "bg-slate-100 text-slate-600" },
};

const faqItems = [
  {
    question: "What is a Tier 1 fintech publication?",
    answer:
      "Tier 1 publications have a Domain Rating (DR) above 60, primarily editorial staff (not syndicated content), a verifiable fintech readership, and are cited frequently in the press coverage of fintech companies. Links from Tier 1 publications carry significant domain authority and brand-signal value.",
  },
  {
    question: "How do I pitch a guest post to these publications?",
    answer:
      "Use our Guest Post Pitch Generator tool to create a personalised pitch. Most publications prefer email pitches to their editorial team. Key elements: a specific, non-promotional topic angle, your credentials as a fintech expert, and 2–3 bullet-point article outlines. Never pitch a topic that is already covered on the target site.",
  },
  {
    question: "What Domain Rating (DR) should I target for links?",
    answer:
      "For fintech SEO, target a portfolio where at least 30% of your new referring domains are DR 50+. Links from DR 30–50 publications build topical authority, while DR 50+ links drive measurable ranking movement within 60–90 days.",
  },
];

export default function FintechPublications() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [guestFilter, setGuestFilter] = useState<boolean | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return publications.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.focus.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q);
      const matchTier = tierFilter === null || p.tier === tierFilter;
      const matchGuest = guestFilter === null || p.guestPosts === guestFilter;
      return matchSearch && matchTier && matchGuest;
    });
  }, [search, tierFilter, guestFilter]);

  const canonical = `${SITE_URL}/resources/fintech-publications`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech Publications & Media Outlets for Guest Posts | FintechPressHub"
        description={`Directory of ${publications.length} fintech publications ranked by Domain Rating, editorial focus, and guest post acceptance. Use this list to plan your link-building outreach.`}
        canonical={canonical}
        faq={faqItems}
        itemList={{
          name: "Fintech Publications Directory",
          items: publications.map((p) => ({ name: p.name, url: p.url })),
        }}
      />

      <PageHero
        eyebrow="Resource"
        title={<>Fintech Publications Directory</>}
        description={`${publications.length} curated fintech media outlets ranked by Domain Rating — with guest-post acceptance status, regional focus, and editorial notes.`}
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search publications, focus areas, regions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[null, 1, 2, 3].map((t) => (
                <button
                  key={String(t)}
                  type="button"
                  onClick={() => setTierFilter(t as number | null)}
                  className={[
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    tierFilter === t
                      ? "bg-[#0052FF] text-white border-[#0052FF]"
                      : "border-slate-200 text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {t === null ? "All tiers" : `Tier ${t}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGuestFilter(guestFilter === true ? null : true)}
                className={[
                  "text-xs px-3 py-1.5 rounded-full border transition-all",
                  guestFilter === true
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-slate-200 text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                Guest posts only
              </button>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} of {publications.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Publication</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-center">DR</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Tier</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Focus</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Region</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-center">Guest posts</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((pub) => (
                  <tr key={pub.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#0052FF] hover:underline flex items-center gap-1"
                      >
                        {pub.name}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-semibold text-slate-700">{pub.dr}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-[11px] ${TIER_LABELS[pub.tier].color} hover:${TIER_LABELS[pub.tier].color}`}
                      >
                        {TIER_LABELS[pub.tier].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px]">{pub.focus}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{pub.region}</td>
                    <td className="px-4 py-3 text-center">
                      {pub.guestPosts ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px]">Yes</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">{pub.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="text-center py-10 text-muted-foreground">No publications match your filters.</p>
          )}
        </div>
      </section>

      <FaqSection
        items={faqItems}
        heading="Frequently asked questions"
        valuePrefix="publications-faq"
      />
    </div>
  );
}
