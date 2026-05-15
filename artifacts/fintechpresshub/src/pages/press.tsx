import { Helmet } from "react-helmet-async";
import { PageMeta } from "@/components/PageMeta";
import { PageHero } from "@/components/PageHero";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Mail,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Linkedin,
  Twitter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type PressMention = {
  id: number;
  title: string;
  publication: string;
  url: string;
  year: string;
  excerpt?: string | null;
  logoUrl?: string | null;
  category?: string | null;
  sortOrder: number;
};

function usePressMentions() {
  return useQuery<PressMention[]>({
    queryKey: ["press-mentions"],
    queryFn: async () => {
      const res = await fetch("/api/press-mentions");
      if (!res.ok) throw new Error("Failed to load press mentions");
      return res.json() as Promise<PressMention[]>;
    },
    staleTime: 60_000,
  });
}

const stats = [
  { label: "Monthly Readers", value: "50,000+", icon: Users },
  { label: "Articles Published", value: "200+", icon: BookOpen },
  { label: "Fintech Categories", value: "8", icon: TrendingUp },
  { label: "Founded", value: "2021", icon: Award },
];

const boilerplate = `FintechPressHub is a specialist SEO and content marketing agency for fintech companies. Founded in 2021, the agency helps ambitious fintech brands — in payments, embedded finance, open banking, neobanking, lending, and regtech — scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals and accepts guest contributions from established operators and founders. The agency is headquartered online and serves clients worldwide.`;

const brandColors = [
  { name: "Primary Blue", hex: "#0052FF", usage: "Primary CTA, links, highlights" },
  { name: "Dark Navy", hex: "#0a0f1e", usage: "Dark mode background, text" },
  { name: "White", hex: "#FFFFFF", usage: "Light background, reversed text" },
];

const logoAssets = [
  { label: "Logo — SVG", href: `${SITE_URL}/favicon.svg`, ext: "SVG" },
  { label: "Icon 512×512", href: `${SITE_URL}/icon-512.png`, ext: "PNG" },
  { label: "Icon 192×192", href: `${SITE_URL}/icon-192.png`, ext: "PNG" },
  { label: "Apple Touch Icon", href: `${SITE_URL}/apple-touch-icon.png`, ext: "PNG" },
];

const pressFAQs: Array<{ question: string; answer: string }> = [
  {
    question: "What is FintechPressHub?",
    answer:
      "FintechPressHub is a specialist fintech SEO and content marketing agency founded in 2021. FintechPressHub helps ambitious fintech brands in payments, embedded finance, open banking, neobanking, lending, regtech, and wealthtech scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals.",
  },
  {
    question: "How can journalists and editors contact FintechPressHub?",
    answer:
      "Journalists and editors can reach the FintechPressHub press team at hello@fintechpresshub.com. The team typically responds to press enquiries within one business day. For urgent requests, include 'PRESS INQUIRY' in the subject line. FintechPressHub serves clients and media contacts worldwide.",
  },
  {
    question: "Is FintechPressHub available for expert commentary on fintech topics?",
    answer:
      "Yes. FintechPressHub's editorial team provides expert commentary on fintech SEO, content marketing, open banking, payments technology, digital lending, regtech, and the broader fintech ecosystem. To request a quote or expert opinion, email hello@fintechpresshub.com with your publication name, deadline, and the topic requiring commentary.",
  },
  {
    question: "What fintech topics does FintechPressHub cover?",
    answer:
      "FintechPressHub covers eight fintech verticals: payments and card processing, embedded finance, open banking and API banking, neobanking and challenger banks, consumer and SME lending (BNPL, personal loans, mortgages), regtech and compliance, wealthtech and investment platforms, and fintech SEO and content marketing strategy. The editorial team has direct working experience in these sectors — not general marketing.",
  },
  {
    question: "What brand assets are available for media use?",
    answer:
      "The following FintechPressHub brand assets are freely available for editorial and media use: the SVG logo, PNG icons at 512×512 and 192×192 pixels, and the Apple Touch Icon. The primary brand colour is #0052FF (Primary Blue) on a dark navy (#0a0f1e) background. All assets can be downloaded directly from this press page at no cost.",
  },
  {
    question: "Does FintechPressHub accept guest contributions?",
    answer:
      "Yes. FintechPressHub accepts guest contributions from established fintech operators, marketers, and founders. Approved posts earn up to two permanent dofollow links and reach 50,000+ targeted monthly readers. All submissions are editorially reviewed against FintechPressHub's editorial guidelines before publication. Visit the Write For Us page for contributor guidelines and the pitching form.",
  },
  {
    question: "What is the editorial standard at FintechPressHub?",
    answer:
      "FintechPressHub follows strict editorial standards: all content must be original, written by individuals with verifiable fintech experience, and free from undisclosed paid promotions. Claims must be sourced. The editorial team independently verifies statistics and links before publication. FintechPressHub publishes corrections prominently when errors are identified. Full editorial guidelines are published at fintechpresshub.com/editorial-guidelines.",
  },
  {
    question: "How many monthly readers does FintechPressHub reach?",
    answer:
      "FintechPressHub reaches 50,000+ monthly readers (as of 2026) across its editorial content. The readership is primarily comprised of fintech founders, product managers, marketers, compliance officers, and investors in payments, open banking, lending, and adjacent sectors.",
  },
  {
    question: "When was FintechPressHub founded?",
    answer:
      "FintechPressHub was founded in 2021. Since founding, the agency has published over 200 original articles across eight fintech verticals and built an editorial network serving 50,000+ monthly readers. FintechPressHub serves fintech clients worldwide.",
  },
  {
    question: "What is FintechPressHub's approved company boilerplate for press use?",
    answer:
      "Approved press boilerplate: 'FintechPressHub is a specialist SEO and content marketing agency for fintech companies. Founded in 2021, the agency helps ambitious fintech brands — in payments, embedded finance, open banking, neobanking, lending, and regtech — scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals and accepts guest contributions from established operators and founders. The agency is headquartered online and serves clients worldwide.'",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  "trade-press": "Trade Press",
  "national": "National Media",
  "industry-blog": "Industry Blog",
  "podcast": "Podcast",
  "award": "Award",
};

export default function PressPage() {
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { data: mentions = [] } = usePressMentions();

  const mentionsByYear = mentions.reduce<Record<string, PressMention[]>>((acc, m) => {
    (acc[m.year] ??= []).push(m);
    return acc;
  }, {});
  const sortedYears = Object.keys(mentionsByYear).sort((a, b) => Number(b) - Number(a));

  function copyBoilerplate() {
    navigator.clipboard
      .writeText(boilerplate)
      .then(() => {
        setCopied(true);
        toast.success("Boilerplate copied to clipboard");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => toast.error("Copy failed — please select and copy manually"));
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta
        page="press"
        webPage={{
          dateModified: "2026-05-15",
          datePublished: "2023-06-01",
          keywords: [
            "FintechPressHub press kit",
            "fintech SEO agency press",
            "fintech media kit",
            "FintechPressHub brand assets",
            "fintech press contact",
            "FintechPressHub boilerplate",
            "fintech content marketing agency",
          ],
          about: [
            "FintechPressHub",
            "Fintech SEO Agency",
            "Fintech Content Marketing",
            "Press Kit",
            "Media Kit",
            "Brand Assets",
          ],
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          license: `${SITE_URL}/terms`,
          copyrightNotice: "© 2026 FintechPressHub. All rights reserved.",
        }}
        faq={pressFAQs}
        faqDateModified="2026-05-15"
        faqDatePublished="2023-06-01"
        speakableSelectors={["h1", ".speakable-summary", ".press-faq-answer", "h2"]}
        itemList={
          mentions.length > 0
            ? {
                name: "FintechPressHub Press Mentions",
                description:
                  "Media coverage of FintechPressHub across fintech trade press, national media, and industry publications.",
                items: mentions.map((m) => ({
                  name: `${m.title} — ${m.publication}`,
                  url: m.url,
                  description: m.excerpt ?? `${m.publication}, ${m.year}`,
                  image: m.logoUrl ?? undefined,
                })),
              }
            : undefined
        }
      />

      <Helmet>
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}/press`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/press`} />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
      </Helmet>

      <PageHero
        eyebrow="Press & Media"
        title={<>FintechPressHub Press & Media Kit</>}
        description="Everything journalists and editors need to cover FintechPressHub — approved company boilerplate, brand assets, key statistics, and press contact details."
      />

      <main className="py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">

          {/* BLUF / Direct Answer Block — speakable-summary */}
          <p className="speakable-summary text-base leading-relaxed text-muted-foreground border-l-4 border-primary pl-5 py-2">
            FintechPressHub is a specialist fintech SEO and content marketing agency founded in 2021,
            reaching 50,000+ monthly readers across eight fintech verticals. For press enquiries, brand
            assets, or expert commentary on fintech SEO, email{" "}
            <a href="mailto:hello@fintechpresshub.com" className="text-primary hover:underline">
              hello@fintechpresshub.com
            </a>
            . The press team responds within one business day.
          </p>

          {/* Key Stats */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">
              FintechPressHub at a Glance — Key Statistics (2026)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s) => (
                <Card key={s.label} className="text-center">
                  <CardContent className="pt-6 pb-5">
                    <s.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">All figures as of 2026.</p>
          </div>

          {/* Approved Company Boilerplate */}
          <div>
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight">Approved Company Boilerplate</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={copyBoilerplate}
                className="gap-2 shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy text"}
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{boilerplate}</p>
              </CardContent>
            </Card>
          </div>

          {/* Brand Assets */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">
              Brand Assets — Logos & Icons
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {logoAssets.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">{a.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{a.ext}</Badge>
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Brand Colours */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">
              Brand Colours — Official Palette
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {brandColors.map((c) => (
                <Card key={c.hex}>
                  <CardContent className="pt-5 pb-4">
                    <div
                      className="w-full h-16 rounded-lg mb-4 border border-border"
                      style={{ backgroundColor: c.hex }}
                      aria-label={`${c.name} — ${c.hex}`}
                      role="img"
                    />
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.hex}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.usage}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Coverage — grouped by year */}
          {mentions.length > 0 && (
            <div id="press-coverage">
              <h2 className="text-2xl font-bold tracking-tight mb-6">
                FintechPressHub Media Coverage
              </h2>
              <div className="space-y-8">
                {sortedYears.map((year) => (
                  <div key={year}>
                    <h3 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                      {year}
                    </h3>
                    <div className="space-y-3" id={`press-${year}`}>
                      {mentionsByYear[year].map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              {item.category && CATEGORY_LABELS[item.category] && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {CATEGORY_LABELS[item.category]}
                                </Badge>
                              )}
                            </span>
                            <p className="text-xs text-muted-foreground">{item.publication} · {item.year}</p>
                            {item.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                "{item.excerpt}"
                              </p>
                            )}
                          </span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Standards */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Editorial Standards</h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 pb-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All FintechPressHub editorial content is written by individuals with verifiable
                  fintech experience, independently fact-checked, and free from undisclosed paid
                  promotions. FintechPressHub publishes corrections prominently when errors are
                  identified. External links to cited sources are always unsponsored.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/editorial-guidelines">View editorial guidelines</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/services">Our fintech SEO services</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* For contributors */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Guest Contributions — Write For FintechPressHub
            </h2>
            <Card>
              <CardContent className="pt-6 pb-5">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  FintechPressHub accepts guest contributions from established fintech operators,
                  marketers, and founders. Approved posts earn up to two permanent dofollow links and
                  reach 50,000+ targeted monthly readers across eight fintech verticals.
                </p>
                <Button asChild size="sm">
                  <Link href="/write-for-us">View contributor guidelines</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Press Contact */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Press Contact</h2>
            <Card>
              <CardContent className="pt-6 pb-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Press enquiries</p>
                    <a
                      href="mailto:hello@fintechpresshub.com"
                      className="text-sm text-primary hover:underline"
                    >
                      hello@fintechpresshub.com
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Response within one business day. Worldwide enquiries welcome.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a
                      href={SITE_URL}
                      className="text-sm text-primary hover:underline"
                    >
                      {SITE_URL.replace("https://", "")}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href="https://twitter.com/fintechpresshub"
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="FintechPressHub on X / Twitter"
                  >
                    <Twitter className="h-4 w-4" />
                    @fintechpresshub
                  </a>
                  <a
                    href="https://www.linkedin.com/company/fintechpresshub"
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="FintechPressHub on LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div id="press-faq">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Press FAQ — Common Journalist Questions
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Answers to the most common questions from journalists, editors, and podcast hosts covering the fintech SEO space.
            </p>
            <div className="space-y-3">
              {pressFAQs.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.question}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 pt-1 border-t border-border bg-muted/20">
                      <p id={`press-faq-answer-${i}`} className="press-faq-answer text-sm leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Additional enquiries:{" "}
              <a href="mailto:hello@fintechpresshub.com" className="text-primary hover:underline">
                hello@fintechpresshub.com
              </a>
              {" · "}
              <Link href="/editorial-guidelines" className="text-primary hover:underline">
                Editorial guidelines
              </Link>
              {" · "}
              <Link href="/write-for-us" className="text-primary hover:underline">
                Write for us
              </Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
