import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { useState, useMemo, useEffect } from "react";
import { SITE_URL } from "@/lib/metaData";

type Publication = {
  id?: number;
  name: string;
  url: string;
  dr: number;
  tier: 1 | 2 | 3;
  focus: string;
  region: string;
  guestPosts: boolean;
  notes: string;
};

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
  const [publications, setPublications] = useState<Publication[]>([]);

  useEffect(() => {
    fetch("/api/publications")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Publication[]) => setPublications(rows))
      .catch(() => {});
  }, []);

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
  }, [search, tierFilter, guestFilter, publications]);

  const canonical = `${SITE_URL}/resources/fintech-publications`;

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Fintech Publications & Media Outlets for Guest Posts | FintechPressHub"
        description={`Directory of ${publications.length || 20} fintech publications ranked by Domain Rating, editorial focus, and guest post acceptance. Use this list to plan your link-building outreach.`}
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
        description={`${publications.length || 20}+ curated fintech media outlets ranked by Domain Rating — with guest-post acceptance status, regional focus, and editorial notes.`}
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
