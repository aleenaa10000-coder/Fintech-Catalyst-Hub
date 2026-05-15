import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import {
  BREADCRUMB_LABELS,
  ORGANIZATION_SCHEMA,
  PAGE_META,
  SITE_NAME,
  SITE_URL,
  type PageKey,
} from "@/lib/metaData";

function buildBreadcrumbs(
  pathname: string,
  leafTitle: string,
): { name: string; item: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: { name: string; item: string }[] = [
    { name: "Home", item: SITE_URL },
  ];

  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLeaf = i === segments.length - 1;
    const known = BREADCRUMB_LABELS[seg];
    const fallback = seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    const name = isLeaf ? leafTitle || known || fallback : known || fallback;
    crumbs.push({ name, item: `${SITE_URL}${acc}` });
  });

  return crumbs;
}

export type ArticleSchema = {
  title: string;
  description?: string;
  /**
   * Short plain-text summary of the article (typically the post excerpt).
   * Emitted as `abstract` on BlogPosting JSON-LD — the field AI citation
   * engines (Perplexity, ChatGPT Search, Claude) read when generating
   * summaries. 160-320 chars is optimal.
   */
  abstract?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  /** Canonical URL of the author's profile page — surfaces author entity to Google. */
  authorUrl?: string;
  /** Author job title — strengthens E-E-A-T signal in BlogPosting schema. */
  authorJobTitle?: string;
  section?: string;
  /**
   * A concise secondary headline (≤110 chars). Emitted as `alternativeHeadline`
   * on BlogPosting JSON-LD — used by AI citation engines as a shorter display
   * title. Falls back to a 110-char truncation of `description` when omitted.
   * Mirrors the SSR BlogPosting `alternativeHeadline` field added in ssrMeta.ts.
   */
  alternativeHeadline?: string;
  tags?: string[];
  about?: string[];
  mentions?: string[];
  /** Plain-text word count for the article body. Emitted on BlogPosting JSON-LD. */
  wordCount?: number;
  /** Reading time as an ISO 8601 duration (e.g. "PT8M") for `timeRequired`. */
  timeRequired?: string;
  /** BCP-47 language tag — defaults to "en" when omitted. */
  inLanguage?: string;
  /** Twitter/X handle of the article author, e.g. "@marcuswebbseo". Emits twitter:creator. */
  twitterCreator?: string;
  /**
   * External sources cited by this article. Each entry becomes a `citation`
   * node on BlogPosting JSON-LD — boosts E-E-A-T by surfacing sourcing
   * behaviour to Google's quality raters. Pass page titles or full URLs.
   */
  citation?: string[];
  /**
   * Plain-text copyright notice emitted on BlogPosting JSON-LD.
   * AI citation engines (Google AIO, Perplexity, ChatGPT Search) parse this
   * to confirm attribution requirements before quoting content.
   * Example: "© 2026 FintechPressHub. All rights reserved."
   */
  copyrightNotice?: string;
  /**
   * Country of editorial origin as a plain-text country name.
   * Emitted as `countryOfOrigin: { "@type": "Country", name: "…" }` on
   * BlogPosting JSON-LD. AI ranking engines use this alongside contentLocation
   * to distinguish "content about UK fintech" from "content produced by a
   * UK editorial team" — both signals are needed for full GEO/E-E-A-T scoring.
   * Example: "United Kingdom"
   */
  countryOfOrigin?: string;
  /**
   * Article section names extracted from H2 headings.
   * Emitted as `hasPart` `WebPageElement` entities on BlogPosting JSON-LD,
   * enabling Google Knowledge Graph and Perplexity to cite individual sections
   * directly and improving long-tail ranking for section-level queries.
   */
  hasPart?: string[];
  /**
   * CSS selectors for `SpeakableSpecification` on the BlogPosting entity.
   * Google News Audio Overviews require speakable on the article entity itself
   * (not just the WebPage companion). Defaults to `["h1", "h2"]` when omitted.
   */
  speakableSelectors?: string[];
  /**
   * Machine-readable access model URI. Use `"https://schema.org/OnlineAccess"`
   * to declare the article is freely readable without registration or paywall.
   * AI citation engines (Google AIO, Perplexity) prefer free-access content.
   */
  conditionsOfAccess?: string;
  /**
   * URL of the page where content usage / licensing terms are explained.
   * Lets AI citation engines verify syndication permissions without guessing.
   * Example: `"https://www.fintechpresshub.com/terms"`
   */
  usageInfo?: string;
  /**
   * Accessibility hazard declaration. Use `"none"` to explicitly state that
   * the article presents no known accessibility hazards (no flashing, motion,
   * or audio triggers). Required for WCAG-aligned E-E-A-T on YMYL content.
   */
  accessibilityHazard?: string;
};

export type FaqItem = { question: string; answer: string };

export type PersonSchema = {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  email?: string;
  sameAs?: string[];
  knowsAbout?: string[];
  worksFor?: string;
  award?: string[];
  addressLocality?: string;
  addressCountry?: string;
  /**
   * ISO 8601 date the author profile page was first published.
   * Emitted on ProfilePage JSON-LD for freshness/E-E-A-T signals.
   */
  datePublished?: string;
  /**
   * ISO 8601 date the author profile was last materially updated.
   * Emitted on ProfilePage JSON-LD and as `dateModified` in the WebPage entity.
   */
  dateModified?: string;
};

export type ServiceSchema = {
  name: string;
  description: string;
  serviceType?: string;
  category?: string;
  areaServed?: string;
  url?: string;
  deliverables?: string[];
  /**
   * Override the JSON-LD `@type`. Defaults to "Service".
   * Use "FinancialService" for fintech/financial services so LLMs and
   * Google's Knowledge Graph classify the service more precisely.
   * Use "ProfessionalService" for consultancy/agency offerings.
   * Use "FinancialService+ProfessionalService" to emit the dual-type array
   * `["FinancialService","ProfessionalService"]` — matching the SSR schema.
   */
  schemaType?: "Service" | "FinancialService" | "ProfessionalService" | "FinancialService+ProfessionalService";
  /**
   * Fintech sub-verticals and topic areas this service covers.
   * Emitted as `knowsAbout` on the FinancialService JSON-LD so that AI
   * citation engines and Google's Knowledge Graph can slot each offering
   * into the correct domain (e.g. "Open Banking", "Embedded Finance").
   */
  knowsAbout?: string[];
};

export type EmployeePerson = {
  name: string;
  jobTitle?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  knowsAbout?: string[];
};

export type AboutPageSchema = {
  description: string;
  slogan?: string;
  knowsAbout?: string[];
  employees?: EmployeePerson[];
};

export type WebPageSchema = {
  dateModified: string;
  datePublished?: string;
};

export type HowToStep = {
  name: string;
  text?: string;
  imageUrl?: string;
};

export type HowToSchema = {
  name: string;
  description?: string;
  steps: HowToStep[];
  totalTime?: string;
};

export type SoftwareAppSchema = {
  name: string;
  operatingSystem?: string;
  applicationCategory?: string;
  url?: string;
  description?: string;
  offers?: { price: string; priceCurrency?: string };
  ratingValue?: number;
  ratingCount?: number;
  /** Whether the tool is free — emitted as isAccessibleForFree on SoftwareApplication JSON-LD. */
  isAccessibleForFree?: boolean;
  /** List of features the tool offers — emitted as featureList on SoftwareApplication JSON-LD. */
  featureList?: string[];
  /** Language of the tool content — emitted as inLanguage on SoftwareApplication JSON-LD. */
  inLanguage?: string;
  /** ISO 8601 date the tool was first published — emitted as datePublished on SoftwareApplication JSON-LD. */
  datePublished?: string;
  /** ISO 8601 date the tool was last modified — emitted as dateModified on SoftwareApplication JSON-LD. */
  dateModified?: string;
  /** Provider organization entity reference — use { "@id": `${SITE_URL}#organization` }. */
  provider?: { "@id": string };
  /** Potential action — e.g. { "@type": "UseAction", target: canonicalUrl }. */
  potentialAction?: { "@type": string; target: string };
};

/**
 * VideoObject structured data (D3).
 * Pass this prop to any page that contains or embeds a video to unlock
 * Google's Video rich result and Video carousel placement.
 */
export type VideoObjectSchema = {
  /** Video title — appears in Google's video rich result. */
  name: string;
  /** Short description of the video content. */
  description: string;
  /** URL of the video thumbnail image (min 1280×720 px recommended). */
  thumbnailUrl: string;
  /** ISO 8601 date of first upload, e.g. "2026-05-09". */
  uploadDate: string;
  /** ISO 8601 duration, e.g. "PT4M30S" for 4 min 30 sec. Optional. */
  duration?: string;
  /** Direct URL to the video file (MP4, etc.). Optional. */
  contentUrl?: string;
  /** Embed URL (e.g. https://www.youtube.com/embed/VIDEO_ID). Optional. */
  embedUrl?: string;
  /** Total view count. Optional. */
  interactionCount?: number;
};

export type RssFeedLink = {
  href: string;
  title: string;
};

export type DefinedTermSetSchema = {
  name: string;
  description?: string;
  terms: Array<{ name: string; description: string; url?: string }>;
};

export type ItemListSchema = {
  name: string;
  description?: string;
  items: Array<{ name: string; url: string; description?: string; image?: string }>;
};

export type PricingOfferSchema = {
  name: string;
  description?: string;
  price: string | number;
  priceCurrency?: string;
  url?: string;
};

export type LocalBusinessSchema = {
  /** Business name, e.g. "FintechPressHub — London Fintech SEO" */
  name: string;
  description?: string;
  /** City / locality */
  addressLocality: string;
  /** Region / state (optional) */
  addressRegion?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "GB" */
  addressCountry: string;
  /** Country name for areaServed */
  areaServedName?: string;
  /** Additional sameAs URLs (LinkedIn, Crunchbase, etc.) */
  sameAs?: string[];
  /**
   * Geographic coordinates for Google Maps Knowledge Panel placement.
   * Mirrors the GeoCoordinates emitted by the SSR location handler from DB data.
   * Pass when the location API exposes latitude/longitude fields.
   */
  geo?: { latitude: number; longitude: number };
  /**
   * Price range indicator, e.g. "$$$$" — signals commercial tier to Google Maps
   * and Knowledge Panel. Mirrors the priceRange on the SSR FinancialService entity.
   */
  priceRange?: string;
};

/**
 * Pre-computed aggregate rating for the site — emitted as ProfessionalService +
 * AggregateRating JSON-LD on the home page so Google can display star ratings
 * for commercial-intent queries like "fintech SEO agency reviews".
 * Compute from live testimonial data and pass only when data is available.
 */
export type AggregateRatingSchema = {
  /** Computed average rating, e.g. 4.9 */
  ratingValue: number | string;
  /** Total number of ratings used to compute the average */
  ratingCount: number;
  /** Total number of written reviews (defaults to ratingCount) */
  reviewCount?: number;
  /** Highest possible rating — defaults to "5" */
  bestRating?: string;
  /** Lowest possible rating — defaults to "1" */
  worstRating?: string;
};

type Common = {
  title?: string;
  description?: string;
  canonical?: string;
  /**
   * Override the default OG/social share image. When omitted, non-article pages
   * fall back to `${SITE_URL}/opengraph.jpg`. Pass the dynamic `/api/og?…` URL
   * for tool pages so React Helmet serves the correct social card on hydration
   * (i.e. when the user navigates to the page via SPA routing without a reload).
   */
  ogImage?: string;
  article?: ArticleSchema;
  person?: PersonSchema;
  service?: ServiceSchema;
  aboutPage?: AboutPageSchema;
  webPage?: WebPageSchema;
  faq?: FaqItem[];
  /**
   * Extra `<link rel="alternate" type="application/rss+xml">` tags emitted in
   * addition to the sitewide blog feed. Used by author-profile pages to
   * advertise their per-author RSS feed for autodiscovery in feed readers.
   */
  rssFeeds?: RssFeedLink[];
  /**
   * When true, emits QAPage JSON-LD instead of FAQPage for the `faq` entries.
   * Use on Q&A-style contact/support pages (A4). FAQPage is the default.
   */
  qaPage?: boolean;
  /**
   * When true, emits `<meta name="robots" content="noindex,nofollow">` to
   * exclude the page from search engines. Used by per-post noIndex toggles
   * and by admin-only pages (e.g. /admin/login).
   */
  noindex?: boolean;
  /**
   * ISO 8601 date the FAQ content was first published. When set, emitted on
   * FAQPage JSON-LD for freshness signals — preferred over inheriting from
   * webPage.datePublished when the FAQ section has its own editorial date.
   */
  faqDatePublished?: string;
  /**
   * ISO 8601 date the FAQ content was last materially updated.
   * Emitted on FAQPage JSON-LD as dateModified. Takes priority over
   * webPage.dateModified for the FAQ schema block.
   */
  faqDateModified?: string;
  /** HowTo structured data. Emits HowTo JSON-LD. */
  howTo?: HowToSchema;
  /** SoftwareApplication structured data (A5). */
  softwareApp?: SoftwareAppSchema;
  /**
   * VideoObject structured data (D3).
   * Enables Google's Video rich result for pages that contain a video.
   */
  video?: VideoObjectSchema;
  /**
   * hreflang alternate links for international SEO (I1/I2).
   * Each entry emits a `<link rel="alternate" hreflang="…">` tag.
   * Include an `x-default` entry for the default locale fallback.
   */
  hreflang?: Array<{ lang: string; href: string }>;
  /**
   * CSS selectors for SpeakableSpecification JSON-LD (G3).
   * Defaults to ["h1", ".speakable-summary"] when `article` is set and this
   * prop is omitted — pass an empty array to suppress the schema entirely.
   */
  speakableSelectors?: string[];
  /** DefinedTermSet JSON-LD for glossary-style pages (H1). */
  definedTermSet?: DefinedTermSetSchema;
  /** ItemList JSON-LD for hub pages (blog index, tools hub) (H2). */
  itemList?: ItemListSchema;
  /** Product/Offer JSON-LD for pricing pages (Q6). */
  pricingOffers?: PricingOfferSchema[];
  /**
   * LocalBusiness JSON-LD for geo-targeted location pages.
   * Signals the agency's local presence to Google Maps and Knowledge Graph
   * for queries like "fintech SEO agency London".
   */
  localBusiness?: LocalBusinessSchema;
  /**
   * CollectionPage + CreateAction JSON-LD for contributor / guest-post pages
   * (O3). Signals to Google that the page accepts external author submissions
   * and is a link-earning asset.
   */
  writeAction?: {
    name: string;
    description?: string;
    targetUrl?: string;
  };
  /**
   * ProfessionalService + AggregateRating JSON-LD (Q7).
   * Pass when testimonial data is available so Google can display star ratings
   * in SERPs for commercial-intent queries. Compute the values from live data
   * in the page component — do not hardcode them.
   */
  aggregateRating?: AggregateRatingSchema;
  /**
   * ContactPage JSON-LD for the /contact page (C1).
   * When true, emits a fully-specified ContactPage entity that mirrors the SSR
   * injection in ssrMeta.ts — ensuring both rendering paths (Googlebot HTML-first
   * and JS-rendered) expose an identical ContactPage entity in the knowledge graph.
   * Pair with `webPage` to propagate datePublished/dateModified and with
   * `speakableSelectors` to target the geo-answer-block for AI voice extraction.
   */
  contactPage?: boolean;
};

type PageMetaProps =
  | ({ page: PageKey } & Common)
  | ({ page?: undefined; title: string } & Common);

export function PageMeta(props: PageMetaProps) {
  const [location] = useLocation();
  const base = props.page ? PAGE_META[props.page] : undefined;
  const title = props.title ?? base?.title ?? "";
  const description = props.description ?? base?.description;

  // Keep the trailing slash on the root URL to match index.html + sitemap.
  const canonical =
    props.canonical ?? `${SITE_URL}${location === "/" ? "/" : location}`;

  const leafTitle = (props.title ?? base?.title ?? "")
    .split("|")[0]
    .trim();
  const breadcrumbs = buildBreadcrumbs(location, leafTitle);
  const breadcrumbJsonLd =
    breadcrumbs.length > 1
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: c.item,
          })),
        }
      : null;

  const faqJsonLd =
    props.faq && props.faq.length > 0
      ? props.qaPage
        ? {
            "@context": "https://schema.org",
            "@type": "QAPage",
            "@id": `${canonical}#qa`,
            url: canonical,
            inLanguage: "en",
            publisher: { "@type": "Organization", "@id": `${SITE_URL}#organization`, name: SITE_NAME },
            mainEntity: props.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              answerCount: 1,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer.replace(/<[^>]*>/g, "").trim(),
                inLanguage: "en",
              },
            })),
          }
        : {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            name: leafTitle
              ? `${leafTitle} — Frequently Asked Questions`
              : "Frequently Asked Questions",
            url: canonical,
            inLanguage: "en",
            isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}#website` },
            publisher: { "@type": "Organization", "@id": `${SITE_URL}#organization`, name: SITE_NAME },
            ...(props.faqDatePublished ?? props.webPage?.datePublished
              ? { datePublished: props.faqDatePublished ?? props.webPage?.datePublished }
              : {}),
            ...(props.faqDateModified ?? props.webPage?.dateModified
              ? { dateModified: props.faqDateModified ?? props.webPage?.dateModified }
              : {}),
            mainEntity: props.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              answerCount: 1,
              acceptedAnswer: {
                "@type": "Answer",
                // Strip any residual HTML tags so Google always receives plain text.
                text: item.answer.replace(/<[^>]*>/g, "").trim(),
                // inLanguage on acceptedAnswer is an AEO/GEO signal — AI citation
                // engines (Perplexity, Google AI Overviews) prefer answers that
                // explicitly declare their language for multi-lingual corpora ranking.
                inLanguage: "en",
              },
            })),
          }
      : null;

  const personJsonLd = props.person
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: props.person.jobTitle
          ? `${props.person.name} — ${props.person.jobTitle}`
          : props.person.name,
        inLanguage: "en",
        ...(props.person.datePublished ? { datePublished: props.person.datePublished } : {}),
        ...(props.person.dateModified ? { dateModified: props.person.dateModified } : {}),
        isPartOf: {
          "@type": "WebSite",
          "@id": `${SITE_URL}#website`,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
        },
        mainEntity: {
          "@type": "Person",
          "@id": `${props.person.url ?? canonical}#person`,
          name: props.person.name,
          jobTitle: props.person.jobTitle,
          description: props.person.description,
          image: props.person.image,
          url: props.person.url ?? canonical,
          email: props.person.email,
          sameAs: props.person.sameAs?.filter(Boolean),
          knowsAbout: props.person.knowsAbout,
          ...(props.person.award && props.person.award.length > 0
            ? { award: props.person.award }
            : {}),
          ...(props.person.addressLocality || props.person.addressCountry
            ? {
                address: {
                  "@type": "PostalAddress",
                  ...(props.person.addressLocality
                    ? { addressLocality: props.person.addressLocality }
                    : {}),
                  ...(props.person.addressCountry
                    ? { addressCountry: props.person.addressCountry }
                    : {}),
                },
              }
            : {}),
          worksFor: props.person.worksFor
            ? { "@type": "Organization", name: props.person.worksFor }
            : {
                "@type": "Organization",
                "@id": `${SITE_URL}#organization`,
                name: SITE_NAME,
                url: SITE_URL,
              },
        },
      }
    : null;

  const serviceJsonLd = props.service
    ? {
        "@context": "https://schema.org",
        "@type": props.service.schemaType === "FinancialService+ProfessionalService"
          ? ["FinancialService", "ProfessionalService"]
          : (props.service.schemaType ?? "Service"),
        // @id matches the SSR schema (bare canonical, no fragment) so Google's
        // Knowledge Graph resolves the same service entity in both rendering modes.
        "@id": props.service.url ?? canonical,
        name: props.service.name,
        description: props.service.description,
        inLanguage: "en",
        serviceType: props.service.serviceType ?? props.service.name,
        category: props.service.category,
        areaServed: props.service.areaServed ?? "Worldwide",
        url: props.service.url ?? canonical,
        ...(props.service.knowsAbout && props.service.knowsAbout.length > 0
          ? {
              knowsAbout: props.service.knowsAbout.map((topic) => ({
                "@type": "Thing",
                name: topic,
              })),
            }
          : {}),
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            "@id": `${SITE_URL}#logo`,
            url: `${SITE_URL}/icon-512.png`,
            width: 512,
            height: 512,
          },
        },
        ...(props.service.deliverables && props.service.deliverables.length > 0
          ? {
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: `${props.service.name} — what's included`,
                itemListElement: props.service.deliverables.map((d) => ({
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: d,
                  },
                })),
              },
            }
          : {}),
      }
    : null;

  const aboutPageJsonLd = props.aboutPage
    ? {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        url: canonical,
        inLanguage: "en",
        name: title || `About ${SITE_NAME}`,
        description: props.aboutPage.description,
        mainEntity: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            "@id": `${SITE_URL}#logo`,
            url: `${SITE_URL}/icon-512.png`,
            width: 512,
            height: 512,
          },
          description: props.aboutPage.description,
          ...(props.aboutPage.slogan ? { slogan: props.aboutPage.slogan } : {}),
          ...(props.aboutPage.knowsAbout && props.aboutPage.knowsAbout.length > 0
            ? { knowsAbout: props.aboutPage.knowsAbout }
            : {}),
          ...(props.aboutPage.employees && props.aboutPage.employees.length > 0
            ? {
                numberOfEmployees: {
                  "@type": "QuantitativeValue",
                  value: props.aboutPage.employees.length,
                },
                employee: props.aboutPage.employees.map((e) => ({
                  "@type": "Person",
                  name: e.name,
                  jobTitle: e.jobTitle,
                  url: e.url,
                  image: e.image,
                  knowsAbout: e.knowsAbout,
                  sameAs: e.sameAs?.filter(Boolean),
                  worksFor: { "@type": "Organization", name: SITE_NAME },
                })),
              }
            : {}),
        },
      }
    : null;

  const webPageJsonLd = props.webPage
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        inLanguage: "en",
        name: title || undefined,
        description: description || undefined,
        dateModified: props.webPage.dateModified,
        ...(props.webPage.datePublished
          ? { datePublished: props.webPage.datePublished }
          : {}),
        isPartOf: {
          "@type": "WebSite",
          "@id": `${SITE_URL}#website`,
          url: SITE_URL,
          name: SITE_NAME,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
        },
        // ReadAction declares primary read intent on every WebPage entity —
        // mirrors the potentialAction emitted by ssrMeta.ts on all page types
        // so both rendering paths (SSR and SPA hydration) produce identical signals.
        potentialAction: { "@type": "ReadAction", target: canonical },
        // breadcrumb @id cross-reference links this WebPage to its BreadcrumbList
        // entity for Knowledge Graph hierarchy resolution. Omitted on the homepage
        // (no breadcrumb at root) — matches the SSR rule applied in ssrMeta.ts.
        ...(canonical !== SITE_URL && canonical !== `${SITE_URL}/`
          ? { breadcrumb: { "@id": `${canonical}#breadcrumb` } }
          : {}),
        // Speakable fallback — when no speakableSelectors prop and no article is
        // provided, speakableJsonLd is not emitted. Adding a minimal h1 selector
        // here ensures voice assistants can always extract the page headline,
        // matching the h1-only SpeakableSpecification SSR adds to policy/hub pages.
        ...(props.speakableSelectors === undefined && !props.article
          ? {
              speakable: {
                "@type": "SpeakableSpecification",
                cssSelector: ["h1"],
              },
            }
          : {}),
      }
    : null;

  const howToJsonLd = props.howTo
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        // @id aligns with the SSR HowTo schema so both rendering paths resolve
        // the same entity — critical for Google's Knowledge Graph consistency.
        "@id": `${canonical}#howto`,
        name: props.howTo.name,
        ...(props.howTo.description
          ? { description: props.howTo.description }
          : {}),
        ...(props.howTo.totalTime
          ? { totalTime: props.howTo.totalTime }
          : {}),
        step: props.howTo.steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          ...(s.text ? { text: s.text } : {}),
          ...(s.imageUrl
            ? { image: { "@type": "ImageObject", url: s.imageUrl } }
            : {}),
        })),
      }
    : null;

  const softwareAppJsonLd = props.softwareApp
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        // @id matches the SSR schema (bare canonical, no fragment) so Google's
        // Knowledge Graph resolves the same entity whether the page is
        // server-rendered or hydrated client-side.
        "@id": props.softwareApp.url ?? canonical,
        name: props.softwareApp.name,
        ...(props.softwareApp.operatingSystem
          ? { operatingSystem: props.softwareApp.operatingSystem }
          : {}),
        applicationCategory:
          props.softwareApp.applicationCategory ?? "WebApplication",
        url: props.softwareApp.url ?? canonical,
        ...(props.softwareApp.description
          ? { description: props.softwareApp.description }
          : {}),
        ...(props.softwareApp.offers
          ? {
              offers: {
                "@type": "Offer",
                price: props.softwareApp.offers.price,
                priceCurrency:
                  props.softwareApp.offers.priceCurrency ?? "USD",
              },
            }
          : {}),
        ...(props.softwareApp.ratingValue !== undefined
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: props.softwareApp.ratingValue,
                ratingCount: props.softwareApp.ratingCount ?? 1,
              },
            }
          : {}),
        ...(props.softwareApp.isAccessibleForFree !== undefined
          ? { isAccessibleForFree: props.softwareApp.isAccessibleForFree }
          : {}),
        ...(props.softwareApp.featureList && props.softwareApp.featureList.length > 0
          ? { featureList: props.softwareApp.featureList }
          : {}),
        ...(props.softwareApp.inLanguage ? { inLanguage: props.softwareApp.inLanguage } : {}),
        ...(props.softwareApp.datePublished ? { datePublished: props.softwareApp.datePublished } : {}),
        ...(props.softwareApp.dateModified ? { dateModified: props.softwareApp.dateModified } : {}),
        ...(props.softwareApp.provider ? { provider: props.softwareApp.provider } : {}),
        ...(props.softwareApp.potentialAction ? { potentialAction: props.softwareApp.potentialAction } : {}),
      }
    : null;

  const speakableSelectors =
    props.speakableSelectors !== undefined
      ? props.speakableSelectors
      : props.article
        // "h2" added in Pass 3 to match ssrMeta.ts BlogPosting speakable
        // — voice assistants and AEO citation engines extract section headlines
        // as secondary answer candidates when the summary selector is absent.
        ? ["h1", ".speakable-summary", "h2"]
        : null;

  const speakableJsonLd =
    speakableSelectors && speakableSelectors.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "WebPage",
          // No @id here — the canonical @id for this WebPage entity is already
          // declared by webPageJsonLd (or by the SSR middleware). Emitting a
          // second @id: canonical block for the same entity causes duplicate-node
          // warnings in Google's Rich Results Test and schema.org validators.
          url: canonical,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: speakableSelectors,
          },
        }
      : null;

  const videoObjectJsonLd = props.video
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: props.video.name,
        description: props.video.description,
        thumbnailUrl: props.video.thumbnailUrl,
        uploadDate: props.video.uploadDate,
        ...(props.video.duration ? { duration: props.video.duration } : {}),
        ...(props.video.contentUrl ? { contentUrl: props.video.contentUrl } : {}),
        ...(props.video.embedUrl ? { embedUrl: props.video.embedUrl } : {}),
        ...(props.video.interactionCount !== undefined
          ? {
              interactionStatistic: {
                "@type": "InteractionCounter",
                interactionType: { "@type": "WatchAction" },
                userInteractionCount: props.video.interactionCount,
              },
            }
          : {}),
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
        },
      }
    : null;

  const ogImage = props.ogImage ?? props.article?.image ?? `${SITE_URL}/opengraph.jpg`;

  const definedTermSetJsonLd =
    props.definedTermSet && props.definedTermSet.terms.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          "@id": `${canonical}#definedtermset`,
          name: props.definedTermSet.name,
          ...(props.definedTermSet.description
            ? { description: props.definedTermSet.description }
            : {}),
          isPartOf: {
            "@type": "WebSite",
            "@id": `${SITE_URL}#website`,
          },
          publisher: {
            "@type": "Organization",
            "@id": `${SITE_URL}#organization`,
            name: SITE_NAME,
          },
          hasDefinedTerm: props.definedTermSet.terms.map((t) => ({
            "@type": "DefinedTerm",
            name: t.name,
            description: t.description,
            url:
              t.url ??
              `${canonical}#${encodeURIComponent(
                t.name.toLowerCase().replace(/\s+/g, "-"),
              )}`,
            inDefinedTermSet: { "@id": `${canonical}#definedtermset` },
          })),
        }
      : null;

  const itemListJsonLd =
    props.itemList && props.itemList.items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: props.itemList.name,
          ...(props.itemList.description
            ? { description: props.itemList.description }
            : {}),
          numberOfItems: props.itemList.items.length,
          itemListElement: props.itemList.items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            url: item.url,
            ...(item.description ? { description: item.description } : {}),
            ...(item.image ? { image: item.image } : {}),
          })),
        }
      : null;

  const writeActionJsonLd = props.writeAction
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": canonical,
        url: canonical,
        name: title || undefined,
        description: description || undefined,
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
        },
        potentialAction: {
          // WriteAction is the semantically precise schema.org type for
          // "submit an article" actions — matches ssrMeta.ts SSR output.
          "@type": "WriteAction",
          name: props.writeAction.name,
          ...(props.writeAction.description
            ? { description: props.writeAction.description }
            : {}),
          target: {
            "@type": "EntryPoint",
            urlTemplate: props.writeAction.targetUrl ?? canonical,
            actionPlatform: "https://schema.org/DesktopWebPlatform",
          },
        },
      }
    : null;

  const pricingOffersJsonLd =
    props.pricingOffers && props.pricingOffers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Fintech SEO Services",
          description:
            "Specialist fintech SEO and content marketing retainers for ambitious fintech companies.",
          brand: {
            "@type": "Brand",
            "@id": `${SITE_URL}#organization`,
            name: SITE_NAME,
          },
          offers: props.pricingOffers.map((o) => ({
            "@type": "Offer",
            name: o.name,
            ...(o.description ? { description: o.description } : {}),
            price: String(o.price),
            priceCurrency: o.priceCurrency ?? "USD",
            url: o.url ?? canonical,
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              "@id": `${SITE_URL}#organization`,
              name: SITE_NAME,
            },
          })),
        }
      : null;

  const localBusinessJsonLd = props.localBusiness
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${canonical}#localbusiness`,
        name: props.localBusiness.name,
        ...(props.localBusiness.description
          ? { description: props.localBusiness.description }
          : {}),
        url: canonical,
        inLanguage: "en",
        address: {
          "@type": "PostalAddress",
          addressLocality: props.localBusiness.addressLocality,
          ...(props.localBusiness.addressRegion
            ? { addressRegion: props.localBusiness.addressRegion }
            : {}),
          addressCountry: props.localBusiness.addressCountry,
        },
        ...(props.localBusiness.areaServedName
          ? {
              areaServed: {
                "@type": "Place",
                name: props.localBusiness.areaServedName,
              },
            }
          : {}),
        ...(props.localBusiness.sameAs && props.localBusiness.sameAs.length > 0
          ? { sameAs: props.localBusiness.sameAs }
          : {}),
        // GeoCoordinates enables Google Maps Knowledge Panel placement for
        // geo-targeted location pages — mirrors the geo block emitted by the
        // SSR location handler when lat/lng data is present in the DB.
        ...(props.localBusiness.geo
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: props.localBusiness.geo.latitude,
                longitude: props.localBusiness.geo.longitude,
              },
            }
          : {}),
        // priceRange signals commercial tier to Google Maps and Knowledge Panel
        // for "fintech SEO agency [city]" queries — mirrors the SSR FinancialService
        // priceRange used on service detail pages for consistent entity signals.
        ...(props.localBusiness.priceRange
          ? { priceRange: props.localBusiness.priceRange }
          : {}),
      }
    : null;

  const aggregateRatingJsonLd = props.aggregateRating
    ? {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}#service`,
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
        provider: { "@id": `${SITE_URL}#organization` },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: props.aggregateRating.ratingValue,
          bestRating: props.aggregateRating.bestRating ?? "5",
          worstRating: props.aggregateRating.worstRating ?? "1",
          ratingCount: props.aggregateRating.ratingCount,
          reviewCount:
            props.aggregateRating.reviewCount ??
            props.aggregateRating.ratingCount,
        },
      }
    : null;

  // ── ContactPage JSON-LD (C1) ─────────────────────────────────────────────
  // Mirrors the SSR ContactPage schema in ssrMeta.ts so Google's knowledge
  // graph resolves the same ContactPage entity regardless of rendering path
  // (Googlebot HTML-first vs JS-rendered). speakable targets the geo-answer-block
  // for AI voice extraction (AEO/GEO). about[] provides topical entity signals
  // so AI citation engines associate /contact with fintech SEO queries.
  const contactPageJsonLd = props.contactPage
    ? {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "@id": canonical,
        url: canonical,
        name: title,
        description: description,
        inLanguage: "en",
        datePublished: props.webPage?.datePublished ?? "2021-01-01",
        dateModified: props.webPage?.dateModified ?? "2026-05-15",
        isPartOf: { "@id": `${SITE_URL}#website` },
        publisher: { "@id": `${SITE_URL}#organization` },
        isAccessibleForFree: true,
        accessMode: ["textual", "visual"],
        accessibilityFeature: ["readingOrder", "structuralNavigation"],
        license: `${SITE_URL}/terms`,
        audience: {
          "@type": "Audience",
          audienceType: "Fintech companies, founders, CMOs, and marketing leaders",
        },
        about: [
          { "@type": "Thing", name: "Fintech SEO" },
          { "@type": "Thing", name: "Content Marketing for Fintech" },
          { "@type": "Thing", name: "Link Building for Financial Services" },
          { "@type": "Thing", name: "Digital PR for Fintech" },
          { "@type": "Thing", name: "SEO Strategy Consultation" },
        ],
        mentions: [
          { "@type": "Thing", name: "Embedded Finance" },
          { "@type": "Thing", name: "Open Banking" },
          { "@type": "Thing", name: "Payments Infrastructure" },
          { "@type": "Thing", name: "Neobanking" },
          { "@type": "Thing", name: "Regtech" },
          { "@type": "Thing", name: "Wealthtech" },
        ],
        // speakable targets h1 + the .geo-answer-block so AI voice extractors
        // (Google Assistant, AI Overviews) surface the direct-answer summary
        // as well as the page headline for "how do I contact FintechPressHub?".
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector:
            props.speakableSelectors && props.speakableSelectors.length > 0
              ? props.speakableSelectors
              : ["h1", ".geo-answer-block"],
        },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        potentialAction: { "@type": "ReadAction", target: canonical },
        mainEntity: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          email: "hello@fintechpresshub.com",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: canonical,
            email: "hello@fintechpresshub.com",
            availableLanguage: {
              "@type": "Language",
              name: "English",
              alternateName: "en",
            },
          },
        },
      }
    : null;

  const articleJsonLd = props.article
    ? {
        "@context": "https://schema.org",
        // Dual @type gives BlogPosting rich-result eligibility AND NewsArticle
        // eligibility (Google News + article carousels). Both types share the
        // same required properties so no extra fields are needed.
        // Mirrors the ["BlogPosting","NewsArticle"] type emitted by ssrMeta.ts
        // so crawlers see an identical entity graph regardless of rendering path.
        "@type": ["BlogPosting", "NewsArticle"],
        "@id": `${canonical}#article`,
        headline: props.article.title,
        description: props.article.description,
        // Image as an array allows multiple aspect ratios — Google picks the
        // best one for the SERP placement (1:1, 4:3, 16:9 are all valid).
        image: props.article.image ? [props.article.image] : undefined,
        datePublished: props.article.datePublished,
        dateModified:
          props.article.dateModified ?? props.article.datePublished,
        author: props.article.author
          ? {
              "@type": "Person",
              "@id": props.article.authorUrl
                ? `${props.article.authorUrl}#person`
                : undefined,
              name: props.article.author,
              ...(props.article.authorUrl
                ? { url: props.article.authorUrl }
                : {}),
              ...(props.article.authorJobTitle
                ? { jobTitle: props.article.authorJobTitle }
                : {}),
            }
          : undefined,
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: SITE_NAME,
          logo: {
            "@type": "ImageObject",
            "@id": `${SITE_URL}#logo`,
            url: `${SITE_URL}/icon-512.png`,
            width: 512,
            height: 512,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonical,
        },
        isPartOf: {
          "@type": "Blog",
          "@id": `${SITE_URL}/blog#blog`,
          name: `${SITE_NAME} Blog`,
          url: `${SITE_URL}/blog`,
        },
        creativeWorkStatus: "Published",
        // alternativeHeadline — concise secondary title used by AI citation engines
        // as a shorter display label. Mirrors the SSR BlogPosting field so both
        // rendering paths (Googlebot HTML-first and JS-rendered) emit the same entity.
        ...(props.article.alternativeHeadline
          ? { alternativeHeadline: props.article.alternativeHeadline.slice(0, 110) }
          : props.article.description
            ? { alternativeHeadline: props.article.description.slice(0, 110) }
            : {}),
        // publishingPrinciples, audience, educationalLevel — static YMYL E-E-A-T
        // signals. Identical values are emitted by ssrMeta.ts on every BlogPosting.
        // Hardcoding here keeps both rendering paths in sync without extra props.
        publishingPrinciples: `${SITE_URL}/editorial-guidelines`,
        audience: {
          "@type":       "Audience",
          audienceType:  "Fintech professionals, founders, and investors",
        },
        educationalLevel: "Professional",
        ...(props.article.abstract
          ? { abstract: props.article.abstract.slice(0, 500) }
          : {}),
        articleSection: props.article.section,
        keywords: props.article.tags?.join(", "),
        inLanguage: props.article.inLanguage ?? "en",
        ...(typeof props.article.wordCount === "number"
          ? { wordCount: props.article.wordCount }
          : {}),
        ...(props.article.timeRequired
          ? { timeRequired: props.article.timeRequired }
          : {}),
        ...(props.article.about && props.article.about.length > 0
          ? {
              about: props.article.about.map((name) => ({
                "@type": "Thing",
                name,
              })),
            }
          : {}),
        ...(props.article.mentions && props.article.mentions.length > 0
          ? {
              mentions: props.article.mentions.map((name) => ({
                "@type": "Thing",
                name,
              })),
            }
          : {}),
        ...(props.article.citation && props.article.citation.length > 0
          ? {
              citation: props.article.citation.map((src) => ({
                "@type": src.startsWith("http") ? "WebPage" : "CreativeWork",
                ...(src.startsWith("http") ? { url: src } : { name: src }),
              })),
            }
          : {}),
        // copyrightNotice: machine-readable rights statement consumed by AI
        // citation engines (Google AIO, Perplexity, ChatGPT Search) to confirm
        // attribution requirements before quoting this content (OP-1 / WH-1 fix).
        ...(props.article.copyrightNotice
          ? { copyrightNotice: props.article.copyrightNotice }
          : {}),
        // countryOfOrigin: editorial production jurisdiction (GEO-1 fix).
        // Distinct from contentLocation (what the article is about) — AI rankers
        // use both signals together for full geo-quality scoring on YMYL content.
        ...(props.article.countryOfOrigin
          ? { countryOfOrigin: { "@type": "Country", name: props.article.countryOfOrigin } }
          : {}),
        // hasPart: H2 section names as WebPageElement entities (AEO-2 fix).
        // Enables Google Knowledge Graph and Perplexity to reference individual
        // sections directly and improves long-tail section-query rankings.
        ...(props.article.hasPart && props.article.hasPart.length > 0
          ? {
              hasPart: props.article.hasPart.map((name, i) => ({
                "@type": "WebPageElement",
                position: i + 1,
                name,
              })),
            }
          : {}),
        // speakable on BlogPosting entity: required for Google News Audio Overviews
        // and Google Assistant voice extraction. The WebPage-level speakable is
        // insufficient for News-tab voice extraction — Google requires speakable on
        // the Article/BlogPosting entity as well (GEO/AEO gap fix).
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector:
            props.article.speakableSelectors &&
            props.article.speakableSelectors.length > 0
              ? props.article.speakableSelectors
              : ["h1", "h2"],
        },
        // conditionsOfAccess: machine-readable access model for AI extractors.
        // Google AIO and Perplexity prefer freely accessible articles when ranking
        // citation candidates for spoken-answer results.
        ...(props.article.conditionsOfAccess
          ? { conditionsOfAccess: props.article.conditionsOfAccess }
          : { conditionsOfAccess: "https://schema.org/OnlineAccess" }),
        // usageInfo: links to the licensing/rights page so AI citation engines
        // can determine syndication and quotation permissions.
        ...(props.article.usageInfo
          ? { usageInfo: props.article.usageInfo }
          : { usageInfo: `${SITE_URL}/terms` }),
        // accessibilityHazard: explicit declaration for WCAG-aligned E-E-A-T.
        // AI Overviews prefer citation candidates with a declared hazard level.
        accessibilityHazard: props.article.accessibilityHazard ?? "none",
      }
    : null;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {props.noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : null}
      <meta property="og:locale" content="en_US" />
      {/* Always declare alternate locales — this agency serves US, UK, SG, AU, CA fintech markets. */}
      <meta property="og:locale:alternate" content="en_GB" />
      <meta property="og:locale:alternate" content="en_SG" />
      <meta property="og:locale:alternate" content="en_AU" />
      <meta property="og:locale:alternate" content="en_CA" />
      <link rel="canonical" href={canonical} />
      {/*
        hreflang self-referential annotations — tells Google the language/locale
        of every page. When no explicit hreflang entries are passed we emit the
        minimum correct set for a monolingual English site: "en" + "x-default"
        both pointing to the canonical URL. Callers may override with explicit
        regional variants (e.g. en-US / en-GB split-tests) by passing the
        hreflang prop.
      */}
      {(props.hreflang && props.hreflang.length > 0
        ? props.hreflang
        : [
            { lang: "en", href: canonical },
            { lang: "x-default", href: canonical },
          ]
      ).map((h) => (
        <link
          key={`hreflang-${h.lang}`}
          rel="alternate"
          hrefLang={h.lang}
          href={h.href}
        />
      ))}
      {props.article?.authorUrl ? (
        <link rel="author" href={props.article.authorUrl} />
      ) : null}
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} Blog`}
        href={`${SITE_URL}/rss.xml`}
      />
      {props.rssFeeds?.map((feed) => (
        <link
          key={`rss-${feed.href}`}
          rel="alternate"
          type="application/rss+xml"
          title={feed.title}
          href={feed.href}
        />
      ))}
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      <meta property="og:url" content={canonical} />
      <meta
        property="og:type"
        content={articleJsonLd ? "article" : "website"}
      />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta
        property="og:image:type"
        content={
          /\.png(\?|#|$)/i.test(ogImage)
            ? "image/png"
            : /\.webp(\?|#|$)/i.test(ogImage)
              ? "image/webp"
              : "image/jpeg"
        }
      />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={
          props.article?.title ?? title ?? "FintechPressHub - Fintech SEO Agency"
        }
      />
      {props.article?.author ? (
        <meta name="author" content={props.article.author} />
      ) : null}
      {/* Article-specific OG tags help LinkedIn/Facebook show "Published by" + author byline. */}
      {props.article?.datePublished ? (
        <meta
          property="article:published_time"
          content={props.article.datePublished}
        />
      ) : null}
      {props.article?.dateModified ?? props.article?.datePublished ? (
        <meta
          property="article:modified_time"
          content={
            props.article?.dateModified ?? props.article?.datePublished ?? ""
          }
        />
      ) : null}
      {props.article?.author ? (
        <meta
          property="article:author"
          content={props.article.authorUrl ?? props.article.author}
        />
      ) : null}
      {props.article?.section ? (
        <meta property="article:section" content={props.article.section} />
      ) : null}
      {props.article?.tags?.map((tag) => (
        <meta key={`og-tag-${tag}`} property="article:tag" content={tag} />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
      {/* twitter:site declared explicitly here so React Helmet manages it
          and it survives across all route transitions. Without this, the tag
          exists only in the static index.html shell and may be duplicated or
          absent after Helmet reconciles the head on client navigation. */}
      <meta name="twitter:site" content="@fintechpresshub" />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      <meta name="twitter:image" content={ogImage} />
      <meta
        name="twitter:image:alt"
        content={
          props.article?.title ?? title ?? "FintechPressHub - Fintech SEO Agency"
        }
      />
      {props.article?.twitterCreator ? (
        <meta name="twitter:creator" content={props.article.twitterCreator} />
      ) : null}
      <script type="application/ld+json">
        {JSON.stringify(ORGANIZATION_SCHEMA)}
      </script>
      {breadcrumbJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      ) : null}
      {articleJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
      ) : null}
      {personJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(personJsonLd)}
        </script>
      ) : null}
      {serviceJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(serviceJsonLd)}
        </script>
      ) : null}
      {aboutPageJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(aboutPageJsonLd)}
        </script>
      ) : null}
      {webPageJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(webPageJsonLd)}
        </script>
      ) : null}
      {faqJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      ) : null}
      {howToJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(howToJsonLd)}
        </script>
      ) : null}
      {softwareAppJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(softwareAppJsonLd)}
        </script>
      ) : null}
      {speakableJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(speakableJsonLd)}
        </script>
      ) : null}
      {videoObjectJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(videoObjectJsonLd)}
        </script>
      ) : null}
      {definedTermSetJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(definedTermSetJsonLd)}
        </script>
      ) : null}
      {itemListJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(itemListJsonLd)}
        </script>
      ) : null}
      {pricingOffersJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(pricingOffersJsonLd)}
        </script>
      ) : null}
      {writeActionJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(writeActionJsonLd)}
        </script>
      ) : null}
      {localBusinessJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(localBusinessJsonLd)}
        </script>
      ) : null}
      {aggregateRatingJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(aggregateRatingJsonLd)}
        </script>
      ) : null}
      {contactPageJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(contactPageJsonLd)}
        </script>
      ) : null}
    </Helmet>
  );
}
