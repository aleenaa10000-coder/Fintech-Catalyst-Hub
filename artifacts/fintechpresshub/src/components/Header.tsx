import { Link, useLocation } from "wouter";
import { Menu, X, BarChart2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/write-for-us", label: "Write For Us" },
];

export function Header() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-200 border-b",
        scrolled
          ? "backdrop-blur-md backdrop-saturate-150 bg-background/70 border-border/60 shadow-sm"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <BarChart2 className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight text-foreground">
            FintechPressHub
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/contact">
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm"
            >
              Contact Us
            </Button>
          </Link>
        </nav>

        {/* Mobile Nav */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-6 pt-12">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-lg font-medium transition-colors hover:text-primary",
                    location === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border">
                <Link href="/contact" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
