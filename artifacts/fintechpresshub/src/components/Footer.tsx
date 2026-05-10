import { Link } from "wouter";
import { Twitter, Linkedin, Github } from "lucide-react";
import logoSvg from "@assets/logo/fintechpresshub-logo.svg";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { prefetchRoute } from "@/lib/route-prefetch";

function PrefetchLink({
  href,
  className,
  children,
  "data-testid": testId,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      data-testid={testId}
      onMouseEnter={() => prefetchRoute(href)}
      onFocus={() => prefetchRoute(href)}
      onTouchStart={() => prefetchRoute(href)}
    >
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <PrefetchLink href="/" className="inline-flex items-center mb-4" aria-label="FintechPressHub - Home">
              <img
                src={logoSvg}
                alt="FintechPressHub - Fintech SEO Agency"
                className="h-10 sm:h-12 w-auto"
                width={260}
                height={48}
              />
            </PrefetchLink>
            <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
              We are a specialized content marketing agency bridging the gap between deep fintech expertise and search visibility. We help financial technology companies scale their organic growth.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
                <span className="sr-only">GitHub</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-foreground">Company</h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                  Services
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/authors" className="text-muted-foreground hover:text-primary transition-colors">
                  Meet the Team
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/compare" className="text-muted-foreground hover:text-primary transition-colors">
                  Compare
                </PrefetchLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-foreground">Resources</h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink href="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/glossary" className="text-muted-foreground hover:text-primary transition-colors">
                  Fintech Glossary
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/locations" className="text-muted-foreground hover:text-primary transition-colors">
                  Locations
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/tools/financial-health-score-calculator"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="link-footer-tool-financial-health"
                >
                  Financial Health Score
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/write-for-us" className="text-muted-foreground hover:text-primary transition-colors">
                  Write For Us
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/editorial-guidelines" className="text-muted-foreground hover:text-primary transition-colors">
                  Editorial Guidelines
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/status"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="link-footer-status"
                >
                  System Status
                </PrefetchLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-foreground">Legal</h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/refund-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Refund Policy
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Cookie Policy
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms and Conditions
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink href="/community-guidelines" className="text-muted-foreground hover:text-primary transition-colors">
                  Community Guidelines
                </PrefetchLink>
              </li>
              <li>
                <CookiePreferencesButton data-testid="link-footer-manage-cookies" />
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center md:text-left text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} FintechPressHub. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Built with ⚡ by a Vibe Coder | Optimized for FintechPressHub</p>
        </div>
      </div>
    </footer>
  );
}
