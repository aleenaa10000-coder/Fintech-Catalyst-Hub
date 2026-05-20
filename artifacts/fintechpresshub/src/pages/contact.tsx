import { PageMeta } from "@/components/PageMeta";
import { BRAND_NAP, SITE_URL } from "@/lib/metaData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitContactForm, useListTestimonials } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MapPin, Mail, Clock, Globe, ShieldCheck, Timer,
  Linkedin, Twitter, FileText, UserCheck, PhoneCall, FileCheck2, Star,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { FaqSection } from "@/components/FaqSection";
import { PageHero } from "@/components/PageHero";
import { Link } from "wouter";
import { useEffect, useState } from "react";

const contactFaqs = [
  {
    question: "What is a fintech SEO agency?",
    answer:
      "A fintech SEO agency is a specialist search-engine-optimisation firm that works exclusively — or primarily — with financial-technology companies: neobanks, payment platforms, regtech providers, wealthtech startups, and embedded-finance businesses. Unlike a generalist SEO agency, a fintech SEO specialist understands FCA/SEC regulatory constraints on financial content, the YMYL (Your Money or Your Life) quality bar Google applies to financial pages, and the high-authority link-building required to outrank established banks and legacy finance publishers. FintechPressHub was founded in 2021 to serve exactly this niche.",
  },
  {
    question: "How much does fintech SEO cost per month?",
    answer:
      "Fintech SEO retainers typically range from $3,000 to $30,000 per month, depending on the scope of work and the competitiveness of your target keywords. At FintechPressHub, our minimum monthly retainer is $5,000, which covers a senior fintech SEO strategist, specialist content production, and a link-building allocation. One-time SEO audits start at a lower fixed fee. Pricing is scoped individually after a free 30-minute discovery call, where we assess your current search footprint and growth targets. We price in USD, GBP, SGD, and AUD.",
  },
  {
    question: "What happens after I submit the contact form?",
    answer:
      "A senior strategist reviews your submission within one business day and emails you two or three time slots for a free 30-minute discovery call. There is no automated funnel and no junior SDR — you go straight to someone who will scope and price your engagement on the first call.",
  },
  {
    question: "Is the discovery call free, and is there any obligation to commit?",
    answer:
      "The 30-minute discovery call is completely free and consultative. We will review your current search footprint, surface two or three quick wins you can act on regardless of whether we work together, and only propose an engagement if there is a clear strategic fit. There is no obligation and no aggressive follow-up.",
  },
  {
    question: "How quickly can we start after deciding to work together?",
    answer:
      "Typical kickoff is 7 to 10 business days from the signed agreement. That covers contract execution, data-access provisioning (GA4, GSC, CMS), a kickoff workshop, and the first sprint plan. For standalone SEO audits we can sometimes start within 3 to 5 days if your data access is ready.",
  },
  {
    question: "What is the minimum engagement size for FintechPressHub?",
    answer:
      "Our minimum is the one-time SEO audit, delivered within 30 days. For ongoing retainers our minimum is $5,000 per month, which allows us to resource a senior strategist alongside a specialist fintech writer or outreach lead — the combination needed to move the needle in this highly competitive vertical.",
  },
  {
    question: "Do you sign NDAs before the discovery call?",
    answer:
      "Yes. If you need to discuss pre-launch products, regulatory positioning, or sensitive funnel data, send your NDA template with the form submission and we will have it countersigned before the call takes place.",
  },
  {
    question: "Can FintechPressHub work alongside our in-house SEO or content team?",
    answer:
      "Absolutely — approximately 40% of our retainers run in parallel with an in-house team. We slot in as the fintech-specialist layer covering expert writers, link builders, and technical SEO, reporting to your head of growth or content lead. We work comfortably within shared GSC access, shared editorial calendars, and joint sprint reviews.",
  },
  {
    question: "What fintech verticals does FintechPressHub specialise in?",
    answer:
      "FintechPressHub works across all major fintech sub-verticals: payments and payment orchestration, embedded finance and BaaS, open banking and PSD3, neobanking and digital banking, regtech and KYC/AML, wealthtech and robo-advisory, lending and credit underwriting, and insurtech. Our specialist writers and SEO strategists hold domain expertise in each vertical, which is why our content consistently meets Google's YMYL E-E-A-T quality bar — a standard that eliminates most generalist agencies from consideration.",
  },
  {
    question: "What makes FintechPressHub different from a generalist SEO agency?",
    answer:
      "Three things: vertical depth, YMYL compliance, and link quality. Generalist agencies apply SaaS-template content to financial pages — content that Google's Quality Raters consistently flag as lacking expertise on YMYL topics. FintechPressHub writers hold fintech domain credentials, our editorial process follows E-E-A-T guidelines explicitly, and our link-building programme targets tier-1 finance and technology publishers rather than generic high-DR sites. We have operated exclusively in the fintech vertical since 2021.",
  },
  {
    question: "Does FintechPressHub offer fintech SEO outside the US and UK?",
    answer:
      "Yes. We serve clients across five primary markets: the United States, United Kingdom, Singapore, Australia, and Canada. Retainers are priced in USD, GBP, SGD, and AUD on request. Our team spans multiple time zones, with UK clients receiving same-day replies before 11 am GMT. We also serve fintech companies in emerging markets — particularly in the UAE, Germany, and the Netherlands — on a project or retained basis.",
  },
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  service: z.string().max(80).optional(),
  budget: z.string().max(80).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(4000),
});

const MARKETS = [
  { label: "United States", code: "en-US", currency: "USD" },
  { label: "United Kingdom", code: "en-GB", currency: "GBP" },
  { label: "Singapore",     code: "en-SG", currency: "SGD" },
  { label: "Australia",     code: "en-AU", currency: "AUD" },
  { label: "Canada",        code: "en-CA", currency: "CAD" },
];

const TRUST_STATS = [
  { value: "≤ 24h",   label: "Response time",           sub: "Guaranteed" },
  { value: "$5k+",    label: "Minimum monthly retainer", sub: "Senior strategist included" },
  { value: "50,000+", label: "Monthly readers",          sub: "Organic, no paid traffic" },
];

const LOCATION_SLUGS = [
  { city: "New York",   slug: "new-york" },
  { city: "London",     slug: "london" },
  { city: "Singapore",  slug: "singapore" },
  { city: "Sydney",     slug: "sydney" },
  { city: "Toronto",    slug: "toronto" },
  { city: "Dubai",      slug: "dubai" },
  { city: "Amsterdam",  slug: "amsterdam" },
  { city: "Hong Kong",  slug: "hong-kong" },
  { city: "Frankfurt",  slug: "frankfurt" },
  { city: "Chicago",    slug: "chicago" },
];

const HOW_TO_STEPS = [
  {
    n: "01",
    icon: FileText,
    title: "Submit your brief",
    body: "Fill in the form with your challenges, goals, and budget. Takes under 2 minutes.",
    accent: "from-blue-500 to-indigo-600",
  },
  {
    n: "02",
    icon: UserCheck,
    title: "Strategist review",
    body: "A senior fintech SEO strategist reviews your submission and audits your search footprint within one business day.",
    accent: "from-indigo-500 to-violet-600",
  },
  {
    n: "03",
    icon: PhoneCall,
    title: "Free discovery call",
    body: "We share findings, surface quick wins, and assess strategic fit — 30 minutes, no obligation.",
    accent: "from-violet-500 to-purple-600",
  },
  {
    n: "04",
    icon: FileCheck2,
    title: "Tailored proposal",
    body: "If there's a fit, you receive a scoped proposal within 48 hours. No generic decks, no pressure.",
    accent: "from-purple-500 to-pink-600",
  },
];

export default function Contact() {
  const [formStatus, setFormStatus] = useState<string>("");

  const { data: testimonials } = useListTestimonials();

  const aggregateRating =
    Array.isArray(testimonials) && testimonials.length > 0
      ? {
          ratingValue: (
            testimonials.reduce((s, t) => s + (t.rating ?? 5), 0) / testimonials.length
          ).toFixed(1),
          ratingCount: testimonials.length,
          reviewCount: testimonials.length,
        }
      : undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      service: "",
      budget: "",
      message: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillMessage = params.get("message");
    const prefillSubject = params.get("subject");
    if (prefillMessage) {
      form.setValue("message", prefillMessage);
    }
    if (prefillSubject) {
      form.setValue("service", "link-building");
    }
  }, [form]);

  const submitContact = useSubmitContactForm();
  const [hpValue, setHpValue] = useState("");

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Honeypot: if the hidden field was filled by a bot, silently succeed without calling API
    if (hpValue) {
      toast.success("Message sent successfully!", {
        description: "One of our strategists will be in touch within 24 hours.",
      });
      form.reset();
      return;
    }
    submitContact.mutate(
      { data: { ...values, __hp: "" } as unknown as Parameters<typeof submitContact.mutate>[0]["data"] },
      {
        onSuccess: () => {
          toast.success("Message sent successfully!", {
            description: "One of our strategists will be in touch within 24 hours.",
          });
          setFormStatus("Message sent successfully. One of our strategists will be in touch within 24 hours.");
          form.reset();
        },
        onError: () => {
          toast.error("Failed to send message.", {
            description: "Please try again later or email us directly.",
          });
          setFormStatus("Failed to send your message. Please try again or email us directly at hello@fintechpresshub.com.");
        }
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        page="contact"
        faq={contactFaqs}
        qaPage
        contactPage
        aggregateRating={aggregateRating}
        webPage={{ datePublished: "2021-01-01", dateModified: "2026-05-15" }}
        faqDatePublished="2021-01-01"
        faqDateModified="2026-05-15"
        speakableSelectors={["h1", ".geo-answer-block"]}
        hreflang={[
          ...MARKETS.map((m) => ({ lang: m.code, href: `${SITE_URL}/contact` })),
          { lang: "en",        href: `${SITE_URL}/contact` },
          { lang: "x-default", href: `${SITE_URL}/contact` },
        ]}
        ogImage={`${SITE_URL}/api/og?title=${encodeURIComponent("Contact FintechPressHub")}&category=${encodeURIComponent("Contact")}`}
        itemList={{
          name: "FintechPressHub Fintech SEO Services",
          description: "Specialist SEO services for fintech companies — content, link building, technical SEO, and fully managed retainers.",
          items: [
            { name: "SEO Content Creation",   url: `${SITE_URL}/services`, description: "Expert fintech SEO content written by specialist fintech writers and optimised for YMYL quality standards." },
            { name: "High-DR Link Building",   url: `${SITE_URL}/services`, description: "Authority link acquisition from tier-1 finance and technology publishers for fintech brands." },
            { name: "Technical SEO Audit",     url: `${SITE_URL}/services`, description: "Comprehensive technical SEO audit covering Core Web Vitals, crawlability, schema, and site architecture." },
            { name: "Fully Managed Retainer",  url: `${SITE_URL}/services`, description: "End-to-end fintech SEO management — strategy, content, links, and monthly reporting in a single retainer." },
          ],
        }}
        howTo={{
          name: "How to Get a Free Fintech SEO Audit from FintechPressHub",
          description:
            "Submit a brief, receive a senior strategist review within one business day, join a free discovery call, and get a tailored fintech SEO proposal — all within 3 business days.",
          totalTime: "PT30M",
          datePublished: "2021-01-01",
          dateModified: "2026-05-15",
          steps: [
            {
              name: "Submit your brief via the contact form",
              text: "Complete the form with your company name, primary interest, monthly budget, and a description of your current SEO challenges and growth goals. Takes under 2 minutes.",
            },
            {
              name: "Senior strategist review within one business day",
              text: "A senior fintech SEO strategist reviews your submission and performs a preliminary audit of your organic search footprint, identifying your fastest opportunities.",
            },
            {
              name: "Free 30-minute discovery call",
              text: "We walk through our initial findings, surface two or three quick wins you can act on immediately, and assess strategic fit. The call is free with no obligation.",
            },
            {
              name: "Receive a tailored engagement proposal",
              text: "If there is a clear strategic fit, you receive a scoped proposal within 48 hours — specific to your fintech vertical, target keywords, and growth stage. No pressure.",
            },
          ],
        }}
      />

      <PageHero
        eyebrow="Free Fintech SEO Audit"
        title={<>Contact Our Fintech SEO Agency</>}
        description="Request a free fintech SEO audit or talk to our fintech SEO agency strategy team about building a defensible content and link-building moat for your brand."
      />

      {/* GEO + AEO: Direct-answer BLUF block */}
      <section className="border-b bg-muted/30 py-5">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="geo-answer-block text-sm leading-relaxed text-muted-foreground md:text-base">
            <strong>FintechPressHub</strong> is a specialist fintech SEO agency headquartered in{" "}
            {BRAND_NAP.addressLocality}, {BRAND_NAP.addressRegion}. Submit the form below to request
            a free SEO audit or strategy consultation — a senior strategist responds within one business
            day. We serve fintech companies across the{" "}
            {MARKETS.map((m, i) => (
              <span key={m.code}>
                {i > 0 && i < MARKETS.length - 1 ? ", " : i === MARKETS.length - 1 ? " and " : ""}
                {m.label}
              </span>
            ))}{" "}
            markets.{" "}
            Organic search drives 53% of all website traffic on average{" "}
            <a
              href="https://videos.brightedge.com/research-report/BrightEdge_ChannelReport2019_Oct.pdf"
              rel="nofollow noopener noreferrer"
              className="text-xs text-muted-foreground/70 underline underline-offset-1 hover:text-primary"
            >
              (BrightEdge Research)
            </a>
            {" "}— and Google classifies fintech pages as YMYL, applying its highest E-E-A-T standard.
            Specialist fintech SEO expertise is what separates ranked content from invisible content.
            Explore our{" "}
            <Link href="/services" className="text-primary underline underline-offset-2 hover:no-underline">
              fintech SEO services
            </Link>{" "}
            or{" "}
            <Link href="/pricing" className="text-primary underline underline-offset-2 hover:no-underline">
              transparent pricing
            </Link>{" "}
            before reaching out.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── Redesigned with gradient step badges + icons */}
      <section className="relative overflow-hidden border-b py-20">
        {/* Subtle gradient wash behind the section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white to-violet-50/40"
        />
        <div className="container relative mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              The Process
            </span>
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">
              How Our Fintech SEO Agency Works — Contact to Kickoff
            </h2>
            <p className="text-sm text-muted-foreground">
              A transparent, 4-step process with no automated funnels.
            </p>
          </div>

          <ol className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Desktop connecting line */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-blue-200 via-violet-200 to-pink-200 lg:block"
              style={{ marginLeft: "12.5%", marginRight: "12.5%" }}
            />

            {HOW_TO_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
                >
                  {/* Gradient accent top bar */}
                  <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${step.accent}`} />

                  {/* Step number badge + icon row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${step.accent} text-sm font-black text-white shadow-md`}
                    >
                      {step.n}
                    </span>
                    <span className="rounded-lg bg-muted/60 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <strong className="text-base font-semibold text-foreground">{step.title}</strong>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── TRUST STATS ── Redesigned with dark gradient background */}
      <section className="relative overflow-hidden py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1628] via-[#0d2045] to-[#0a1628]"
        />
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(0,82,255,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="container relative mx-auto max-w-6xl px-4">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5 px-6 text-center">
                <dt className="text-4xl font-black tracking-tight text-white md:text-5xl">{s.value}</dt>
                <dd className="text-sm font-semibold text-blue-200">{s.label}</dd>
                <dd className="text-xs text-white/40">{s.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── TESTIMONIAL ── Redesigned with stars + decorative quote mark */}
      <section className="border-b border-t bg-gradient-to-br from-slate-50 to-blue-50/40 py-14" aria-label="Client testimonial">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl">
            {/* Star rating */}
            <div className="mb-6 flex justify-center gap-1" aria-label="5 out of 5 stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <figure className="relative rounded-2xl border border-blue-100 bg-white px-8 py-10 shadow-md">
              {/* Decorative oversized quote mark */}
              <span
                aria-hidden
                className="absolute -top-4 left-8 select-none text-8xl font-black leading-none text-primary/10"
              >
                "
              </span>

              <blockquote className="relative mb-6 text-lg font-medium italic leading-relaxed text-slate-700 md:text-xl">
                "FintechPressHub turned our blog from a cost center into our top inbound channel.
                We went from page four to page one for our core keyword within seven months."
              </blockquote>

              <figcaption className="flex items-center gap-4">
                {/* Avatar initial */}
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow">
                  MW
                </span>
                <div className="text-left">
                  <strong className="block text-sm font-semibold text-slate-900">Marcus Whitfield</strong>
                  <cite className="not-italic text-xs text-muted-foreground">
                    Head of Growth · <span className="font-medium text-slate-700">Northwind Payments</span>
                  </cite>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Main contact section */}
      <section className="py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* Contact Info sidebar */}
            <div className="space-y-8 lg:col-span-4">
              <div>
                <h2 className="mb-4 text-2xl font-bold">
                  Get in Touch with Our Fintech SEO Team
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Fill out the form and a senior strategist will reply with a
                  customised plan based on your current search footprint and
                  growth targets.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <a
                      href={`mailto:${BRAND_NAP.email}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {BRAND_NAP.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Headquarters</h3>
                    <address className="not-italic text-muted-foreground">
                      {BRAND_NAP.streetAddress}<br />
                      {BRAND_NAP.addressLocality}, {BRAND_NAP.addressRegion} {BRAND_NAP.postalCode}<br />
                      {BRAND_NAP.addressCountry}
                    </address>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Hours</h3>
                    <p className="text-muted-foreground">
                      <time dateTime="Mo,Tu,We,Th,Fr 09:00-18:00">Mon – Fri, 9 am – 6 pm EST</time>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      UK clients: same day replies before{" "}
                      <time dateTime="11:00">11 am GMT</time>
                    </p>
                  </div>
                </div>

                {/* International SEO: visible markets served */}
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Markets Served</h3>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground text-sm">
                      {MARKETS.map((m) => (
                        <li key={m.code} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary/60" />
                          {m.label}{" "}
                          <span className="text-xs text-muted-foreground/60">({m.currency})</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Retainers priced in USD, GBP, SGD, AUD, and CAD on request.
                    </p>
                  </div>
                </div>
              </div>

              {/* Social links */}
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                  <Linkedin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Follow Us</h3>
                  <div className="mt-2 flex flex-col gap-1.5 text-sm">
                    <a
                      href="https://www.linkedin.com/company/fintechpresshub"
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                    <a
                      href="https://twitter.com/fintechpresshub"
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter / X
                    </a>
                    <a
                      href="https://www.crunchbase.com/organization/fintechpresshub"
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Crunchbase
                    </a>
                  </div>
                </div>
              </div>

              {/* Explore panel — improved styling */}
              <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-blue-50/60 p-5">
                <p className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Explore before you reach out
                </p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { label: "Our fintech SEO services", href: "/services" },
                    { label: "Transparent pricing & retainer tiers", href: "/pricing" },
                    { label: "Fintech SEO insights & playbooks", href: "/blog" },
                    { label: "Agency vs in-house fintech SEO", href: "/compare/agency-vs-in-house" },
                    { label: "Fintech SEO glossary", href: "/glossary" },
                    { label: "Our editorial guidelines", href: "/editorial-guidelines" },
                    { label: "Guest post on FintechPressHub", href: "/write-for-us" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group flex items-center gap-1.5 text-primary hover:underline underline-offset-2"
                      >
                        <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
                {/* Gradient form header */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2045] to-[#0a1628] px-8 py-6">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 60% 120% at 30% 50%, rgba(0,82,255,0.18) 0%, transparent 70%)",
                    }}
                  />
                  <h3 className="relative text-lg font-bold text-white">
                    Request Your Free Fintech SEO Consultation
                  </h3>
                  <p className="relative mt-1 text-sm text-blue-200">
                    A senior strategist reviews every submission — no automated sequences.
                  </p>
                </div>

                <div className="p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Jane Smith"
                                  autoComplete="name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="jane@company.com"
                                  autoComplete="email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Fintech"
                                  autoComplete="organization"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="+1 212 555 0100"
                                  autoComplete="tel"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="service"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Interest</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a service" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="seo-audit">SEO Audit</SelectItem>
                                  <SelectItem value="content-creation">Content Creation</SelectItem>
                                  <SelectItem value="link-building">Link Building</SelectItem>
                                  <SelectItem value="technical-seo">Technical SEO</SelectItem>
                                  <SelectItem value="full-retainer">Fully Managed Retainer</SelectItem>
                                  <SelectItem value="other">Other / Not Sure</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="budget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Budget</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a range" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="under-5k">Under $5,000 / mo</SelectItem>
                                  <SelectItem value="5k-10k">$5,000 – $10,000 / mo</SelectItem>
                                  <SelectItem value="10k-20k">$10,000 – $20,000 / mo</SelectItem>
                                  <SelectItem value="20k-plus">$20,000+ / mo</SelectItem>
                                  <SelectItem value="one-time">One-time project</SelectItem>
                                  <SelectItem value="not-sure">Not sure yet</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tell us about your SEO challenges</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your current search footprint, target keywords, and growth goals…"
                                className="min-h-[120px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
                        disabled={submitContact.isPending}
                      >
                        {submitContact.isPending ? "Sending…" : "Request Free Fintech SEO Consultation"}
                      </Button>

                      <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                      >
                        {formStatus}
                      </div>

                      <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        Your data is processed in accordance with our{" "}
                        <Link href="/privacy-policy" className="underline underline-offset-2 hover:no-underline">
                          Privacy Policy
                        </Link>
                        . Contact enquiry data is retained for 24 months, then securely deleted.
                        We will never sell or share your information with third parties.
                        You may request deletion at any time by emailing{" "}
                        <a
                          href={`mailto:${BRAND_NAP.email}`}
                          className="underline underline-offset-2 hover:no-underline"
                        >
                          {BRAND_NAP.email}
                        </a>
                        .
                      </p>

                      {/* Honeypot — hidden from real users, visible to bots */}
                      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
                        <label htmlFor="__hp_contact">Website</label>
                        <input
                          id="__hp_contact"
                          name="__hp"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={hpValue}
                          onChange={(e) => setHpValue(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                        <Timer className="h-5 w-5 shrink-0 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Guaranteed response within one business day.</strong>{" "}
                          Senior strategist review — no automated sequences, no junior SDRs.
                        </p>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Programmatic SEO: location pills */}
      <section className="border-t border-b bg-muted/20 py-10">
        <div className="container mx-auto max-w-6xl px-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Fintech SEO by Location
          </h3>
          <div className="flex flex-wrap gap-3">
            {LOCATION_SLUGS.map((loc) => (
              <Link
                key={loc.slug}
                href={`/locations/${loc.slug}`}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm"
              >
                Fintech SEO — {loc.city}
              </Link>
            ))}
            <Link
              href="/locations"
              className="rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/15 hover:-translate-y-0.5"
            >
              View all locations →
            </Link>
          </div>
        </div>
      </section>

      {/* GEO: expert quote + Programmatic SEO: vertical links */}
      <section className="border-t border-b bg-card py-14" aria-label="Agency insight and fintech verticals">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/70">
                Strategy Insight
              </p>
              <figure>
                <blockquote className="border-l-4 border-primary/40 pl-5 text-base italic leading-relaxed text-foreground">
                  "Fintech is Google's highest-scrutiny YMYL vertical. Every page you publish
                  is compared against established banks and licensed regulators — you need
                  specialist SEO that understands FCA and SEC constraints, not generalist
                  tactics recycled from SaaS playbooks."
                </blockquote>
                <figcaption className="mt-3 text-sm text-muted-foreground pl-5">
                  —{" "}
                  <strong className="text-foreground">FintechPressHub</strong>
                  , Head of Strategy
                </figcaption>
              </figure>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Fintech Verticals We Cover
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Payments",         slug: "payments" },
                  { label: "Embedded Finance", slug: "embedded-finance" },
                  { label: "Open Banking",     slug: "open-banking" },
                  { label: "Neobanking",       slug: "neobanking" },
                  { label: "Lending",          slug: "lending" },
                  { label: "Regtech",          slug: "regtech" },
                  { label: "Wealthtech",       slug: "wealthtech" },
                  { label: "Fintech SEO",      slug: "fintech-seo" },
                ].map((v) => (
                  <Link
                    key={v.slug}
                    href={`/blog/category/${v.slug}`}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:-translate-y-0.5"
                  >
                    {v.label}
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Active since 2021 · 5 markets · 8 fintech verticals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <FaqSection
        items={contactFaqs}
        heading="Frequently Asked Questions About Our Fintech SEO Agency"
        subtitle="The most common questions from fintech teams considering a first conversation with our strategists."
        valuePrefix="contact-faq"
        testId="section-contact-faq"
      />
    </div>
  );
}
