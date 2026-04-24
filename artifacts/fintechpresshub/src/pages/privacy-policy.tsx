import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHero } from "@/components/PageHero";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  number: number;
  title: string;
  summary: string;
};

const SECTIONS: Section[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    summary: "We respect your privacy and explain in plain terms what we do with your data.",
  },
  {
    id: "data-we-collect",
    number: 2,
    title: "Data We Collect",
    summary: "Just the basics: your name, contact info, technical details (IP, browser), and how you use our site.",
  },
  {
    id: "how-we-use-data",
    number: 3,
    title: "How We Use Your Data",
    summary: "Only when allowed by law — to deliver our contract with you, run our business, or meet legal duties.",
  },
  {
    id: "data-security",
    number: 4,
    title: "Data Security",
    summary: "We use industry-standard safeguards and limit access to people who actually need it.",
  },
  {
    id: "contact-us",
    number: 5,
    title: "Contact Us",
    summary: "Questions? Email privacy@fintechpresshub.com and we'll get back to you.",
  },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${id}`);
  }
}

export default function PrivacyPolicy() {
  useDocumentTitle("Privacy Policy | FintechPressHub");
  const [activeId, setActiveId] = useState<string>(SECTIONS[0]!.id);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash && SECTIONS.some((s) => s.id === hash)) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "auto", block: "start" });
        setActiveId(hash);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <PageHero
        eyebrow="Legal"
        title={<>Privacy Policy</>}
        description="How FintechPressHub collects, uses, and protects the personal data of visitors, prospects, and clients."
      />

      <div className="container mx-auto px-4 max-w-6xl py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <aside className="lg:col-span-3">
            <nav
              aria-label="Plain-English summary of the privacy policy"
              className="lg:sticky lg:top-24"
              data-testid="privacy-quick-summary"
            >
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wider font-semibold text-primary mb-1">
                  Quick Summary
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Plain-English explanations. The legal text on the right is what actually applies.
                </p>
                <ol className="space-y-4 list-none p-0 m-0">
                  {SECTIONS.map((section) => {
                    const isActive = activeId === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToSection(section.id);
                          }}
                          data-testid={`summary-link-${section.id}`}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "block rounded-lg p-3 -mx-1 border-l-2 transition-colors duration-200 hover:bg-muted/60",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-transparent",
                          )}
                        >
                          <div className="flex items-baseline gap-2 mb-1">
                            <span
                              className={cn(
                                "inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded text-[10px] font-bold",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {section.number}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isActive ? "text-primary" : "text-foreground",
                              )}
                            >
                              {section.title}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                            {section.summary}
                          </p>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </nav>
          </aside>

          <article className="lg:col-span-9 min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none scroll-mt-24 prose-headings:scroll-mt-24">
              <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>

              <h2 id="introduction">1. Introduction</h2>
              <p>
                FintechPressHub ("we", "our", or "us") respects your privacy and is committed to
                protecting your personal data. This privacy policy will inform you as to how we
                look after your personal data when you visit our website (regardless of where you
                visit it from) and tell you about your privacy rights and how the law protects you.
              </p>

              <h2 id="data-we-collect">2. The Data We Collect About You</h2>
              <p>
                Personal data, or personal information, means any information about an individual
                from which that person can be identified. We may collect, use, store and transfer
                different kinds of personal data about you which we have grouped together as
                follows:
              </p>
              <ul>
                <li>
                  <strong>Identity Data</strong> includes first name, last name, username or
                  similar identifier.
                </li>
                <li>
                  <strong>Contact Data</strong> includes email address and telephone numbers.
                </li>
                <li>
                  <strong>Technical Data</strong> includes internet protocol (IP) address, your
                  login data, browser type and version, time zone setting and location.
                </li>
                <li>
                  <strong>Usage Data</strong> includes information about how you use our website,
                  products and services.
                </li>
              </ul>

              <h2 id="how-we-use-data">3. How We Use Your Personal Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we
                will use your personal data in the following circumstances:
              </p>
              <ul>
                <li>
                  Where we need to perform the contract we are about to enter into or have entered
                  into with you.
                </li>
                <li>
                  Where it is necessary for our legitimate interests (or those of a third party)
                  and your interests and fundamental rights do not override those interests.
                </li>
                <li>Where we need to comply with a legal obligation.</li>
              </ul>

              <h2 id="data-security">4. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent your personal data
                from being accidentally lost, used or accessed in an unauthorized way, altered or
                disclosed. In addition, we limit access to your personal data to those employees,
                agents, contractors and other third parties who have a business need to know.
              </p>

              <h2 id="contact-us">5. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy or our privacy practices,
                please contact us at privacy@fintechpresshub.com.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
