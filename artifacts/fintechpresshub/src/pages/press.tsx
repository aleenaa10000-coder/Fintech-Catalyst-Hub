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
} from "lucide-react";
import { SITE_URL } from "@/lib/metaData";
import { useState } from "react";
import { toast } from "sonner";

const stats = [
  { label: "Monthly Readers", value: "50,000+", icon: Users },
  { label: "Articles Published", value: "200+", icon: BookOpen },
  { label: "Fintech Categories", value: "8", icon: TrendingUp },
  { label: "Founded", value: "2021", icon: Award },
];

const boilerplate = `FintechPressHub is a specialist SEO and content marketing agency for fintech companies. Founded in 2021, the agency helps ambitious fintech brands — in payments, embedded finance, open banking, neobanking, lending, and regtech — scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals and accepts guest contributions from established operators and founders. The agency is headquartered online and serves clients worldwide.`;

const recentCoverage: Array<{ title: string; publication: string; url: string; year: string }> = [
];

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

export default function PressPage() {
  const [copied, setCopied] = useState(false);

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
        webPage={{ dateModified: "2026-05-09", datePublished: "2026-05-09" }}
      />

      <PageHero
        eyebrow="Press & Media"
        title={<>Media Kit & Press Resources</>}
        description="Everything journalists and editors need to cover FintechPressHub — company boilerplate, brand assets, key stats, and press contact details."
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">

          {/* Key Stats */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Key stats at a glance</h2>
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
          </div>

          {/* Boilerplate */}
          <div>
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight">Company boilerplate</h2>
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
            <h2 className="text-2xl font-bold tracking-tight mb-6">Brand assets</h2>
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
            <h2 className="text-2xl font-bold tracking-tight mb-6">Brand colours</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {brandColors.map((c) => (
                <Card key={c.hex}>
                  <CardContent className="pt-5 pb-4">
                    <div
                      className="w-full h-16 rounded-lg mb-4 border border-border"
                      style={{ backgroundColor: c.hex }}
                    />
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.hex}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.usage}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Coverage */}
          {recentCoverage.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-6">Recent coverage</h2>
              <div className="space-y-3">
                {recentCoverage.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                  >
                    <span>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.publication} · {item.year}</p>
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Editorial guidelines callout */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">For contributors</h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 pb-5">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  FintechPressHub accepts guest contributions from established fintech operators, marketers, and founders. Approved posts earn up to two permanent dofollow links and reach 50,000+ targeted monthly readers.
                </p>
                <Button asChild size="sm">
                  <Link href="/write-for-us">View contributor guidelines</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Press contact */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Press contact</h2>
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
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="FintechPressHub on X / Twitter"
                  >
                    <Twitter className="h-4 w-4" />
                    @fintechpresshub
                  </a>
                  <a
                    href="https://www.linkedin.com/company/fintechpresshub"
                    target="_blank"
                    rel="noopener noreferrer"
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

        </div>
      </section>
    </div>
  );
}
