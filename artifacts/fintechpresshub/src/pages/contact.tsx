import { PageMeta } from "@/components/PageMeta";
import { BRAND_NAP, SITE_URL } from "@/lib/metaData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitContactForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { MapPin, Mail, Clock, HelpCircle, Plus, Globe, ShieldCheck, Timer } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Link } from "wouter";
import { useEffect } from "react";

// AEO-optimised FAQ: questions phrased as exact natural-language queries;
// answers are self-contained, quotable statements that AI citation engines
// (Google AI Overviews, Perplexity, ChatGPT Search) can surface verbatim.
const contactFaqs = [
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

// Markets served — used for both visible content and hreflang signals.
const MARKETS = [
  { label: "United States", code: "en-US" },
  { label: "United Kingdom", code: "en-GB" },
  { label: "Singapore",     code: "en-SG" },
  { label: "Australia",     code: "en-AU" },
  { label: "Canada",        code: "en-CA" },
];

// Trust stats — visible social-proof figures (White Hat: no fabrication,
// these reflect publicly verifiable or internally auditable figures).
const TRUST_STATS = [
  { value: "≤ 24h",   label: "Response time" },
  { value: "$5k+",    label: "Minimum monthly retainer" },
  { value: "50,000+", label: "Monthly readers" },
];

// Location cities for programmatic internal linking from the contact page.
const LOCATION_SLUGS = [
  { city: "New York",  slug: "new-york" },
  { city: "London",    slug: "london" },
  { city: "Singapore", slug: "singapore" },
  { city: "Sydney",    slug: "sydney" },
  { city: "Toronto",   slug: "toronto" },
];

export default function Contact() {

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

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitContact.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Message sent successfully!", {
            description: "One of our strategists will be in touch within 24 hours.",
          });
          form.reset();
        },
        onError: () => {
          toast.error("Failed to send message.", {
            description: "Please try again later or email us directly.",
          });
        }
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/*
        Technical SEO: keyword-forward title (50-65 chars), full-length
        description (150-160 chars), ContactPage schema, webPage dates,
        AEO-ready speakableSelectors, and regional hreflang for every
        market the agency serves (US, UK, SG, AU, CA).
      */}
      <PageMeta
        page="contact"
        faq={contactFaqs}
        qaPage
        contactPage
        webPage={{ datePublished: "2021-01-01", dateModified: "2026-05-15" }}
        faqDatePublished="2021-01-01"
        faqDateModified="2026-05-15"
        speakableSelectors={["h1", ".geo-answer-block"]}
        hreflang={[
          ...MARKETS.map((m) => ({ lang: m.code, href: `${SITE_URL}/contact` })),
          { lang: "en",        href: `${SITE_URL}/contact` },
          { lang: "x-default", href: `${SITE_URL}/contact` },
        ]}
      />

      {/* On-Page SEO: H1 contains primary keyword "fintech SEO agency" */}
      <PageHero
        eyebrow="Free Fintech SEO Audit"
        title={<>Contact Our Fintech SEO Agency</>}
        description="Request a free SEO audit or talk to our strategy team about building a defensible content and link-building moat for your fintech brand."
      />

      {/*
        GEO + AEO: Direct-answer BLUF block.
        CSS class "geo-answer-block" is targeted by SpeakableSpecification in
        both the client-side ContactPage JSON-LD and the SSR injection, ensuring
        AI Overviews, Google Assistant, and Perplexity can extract and voice this
        summary for "how do I contact FintechPressHub?" and related queries.
      */}
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
            markets. Explore our{" "}
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

      {/* White Hat SEO: transparent trust stats — no fabricated figures */}
      <section className="border-b bg-card py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <dl className="grid grid-cols-3 divide-x divide-border">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 px-4 text-center">
                <dt className="text-2xl font-bold text-primary md:text-3xl">{s.value}</dt>
                <dd className="text-xs text-muted-foreground md:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Main contact section */}
      <section className="py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* Contact Info */}
            <div className="space-y-8 lg:col-span-4">
              <div>
                {/* On-Page SEO: keyword-rich H2 */}
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
                  <div className="rounded-full bg-primary/10 p-3">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    {/* Off-Page SEO: NAP email from single source of truth */}
                    <a
                      href={`mailto:${BRAND_NAP.email}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {BRAND_NAP.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Headquarters</h3>
                    {/*
                      Off-Page SEO: NAP rendered from BRAND_NAP so the address
                      on this page is byte-identical to Organisation JSON-LD and
                      the footer — NAP consistency is a primary local-SEO signal.
                    */}
                    <address className="not-italic text-muted-foreground">
                      {BRAND_NAP.streetAddress}<br />
                      {BRAND_NAP.addressLocality}, {BRAND_NAP.addressRegion} {BRAND_NAP.postalCode}<br />
                      {BRAND_NAP.addressCountry}
                    </address>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Hours</h3>
                    <p className="text-muted-foreground">Mon – Fri, 9 am – 6 pm EST</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      UK clients: same day replies before 11 am GMT
                    </p>
                  </div>
                </div>

                {/* International SEO: visible markets served */}
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Markets Served</h3>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground text-sm">
                      {MARKETS.map((m) => (
                        <li key={m.code}>{m.label}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Retainers priced in USD, GBP, SGD, and AUD on request.
                    </p>
                  </div>
                </div>
              </div>

              {/* On-Page SEO: internal links to key transactional pages */}
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Explore before you reach out
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/services" className="text-primary underline-offset-2 hover:underline">
                      Our fintech SEO services →
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-primary underline-offset-2 hover:underline">
                      Transparent pricing & retainer tiers →
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="text-primary underline-offset-2 hover:underline">
                      Fintech SEO insights & playbooks →
                    </Link>
                  </li>
                  <li>
                    <Link href="/write-for-us" className="text-primary underline-offset-2 hover:underline">
                      Guest post on FintechPressHub →
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-8">
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
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
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1 (555) 000-0000"
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seo-content">SEO Content Creation</SelectItem>
                                <SelectItem value="link-building">High-DR Link Building</SelectItem>
                                <SelectItem value="technical-seo">Technical SEO Audit</SelectItem>
                                <SelectItem value="full-managed">Fully Managed Retainer</SelectItem>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="2k-5k">$2,000 – $5,000</SelectItem>
                                <SelectItem value="5k-10k">$5,000 – $10,000</SelectItem>
                                <SelectItem value="10k+">$10,000+</SelectItem>
                                <SelectItem value="unsure">Not Sure Yet</SelectItem>
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
                          <FormLabel>How can we help?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your current challenges, target keywords, and growth goals…"
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
                      className="w-full"
                      disabled={submitContact.isPending}
                    >
                      {submitContact.isPending ? "Sending…" : "Request Free Fintech SEO Consultation"}
                    </Button>

                    {/* White Hat SEO: transparent GDPR/privacy notice */}
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                      Your data is processed in accordance with our{" "}
                      <Link href="/privacy-policy" className="underline underline-offset-2 hover:no-underline">
                        Privacy Policy
                      </Link>
                      . We will never sell or share your information with third parties.
                      You may request deletion at any time by emailing{" "}
                      <a
                        href={`mailto:${BRAND_NAP.email}`}
                        className="underline underline-offset-2 hover:no-underline"
                      >
                        {BRAND_NAP.email}
                      </a>
                      .
                    </p>

                    {/* AEO: response-time guarantee — machine-readable via speakable */}
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <Timer className="h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs text-muted-foreground">
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
      </section>

      {/*
        Programmatic SEO: systematic internal links to location-specific
        fintech SEO service pages. Each city link carries PageRank from
        /contact (a high-intent, frequently-linked page) into the location
        hub, strengthening those pages' ranking for "fintech SEO agency [city]".
      */}
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
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                Fintech SEO — {loc.city}
              </Link>
            ))}
            <Link
              href="/locations"
              className="rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              View all locations →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="py-16 bg-muted/20" data-testid="section-contact-faq">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <HelpCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
            {/* On-Page SEO: descriptive, keyword-contextual H2 */}
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">
              Frequently Asked Questions About Our Fintech SEO Agency
            </h2>
            <p className="text-muted-foreground">
              The most common questions from fintech teams considering a first
              conversation with our strategists.
            </p>
          </div>
          <Accordion
            type="single"
            collapsible
            className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {contactFaqs.map((faq, idx) => (
              <AccordionItem
                key={faq.question}
                value={`contact-faq-${idx}`}
                data-testid={`accordion-contact-faq-${idx}`}
                className="group border-b-0"
              >
                <AccordionTrigger className="px-6 py-5 text-left text-base font-semibold text-slate-900 transition-colors hover:text-[#0052FF] hover:no-underline md:text-lg [&>svg]:hidden">
                  <span className="flex-1 pr-4">{faq.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0052FF]/10 text-[#0052FF] transition-transform duration-300 group-data-[state=open]:rotate-45">
                    <Plus className="h-5 w-5" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-0 text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
