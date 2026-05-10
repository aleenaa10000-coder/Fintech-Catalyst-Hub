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
   */
  schemaType?: "Service" | "FinancialService";
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
};

type Common = {
  title?: string;
  description?: string;
  canonical?: string;
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
            mainEntity: props.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              answerCount: 1,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer.replace(/<[^>]*>/g, "").trim(),
              },
            })),
          }
        : {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            url: canonical,
            mainEntity: props.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                // Strip any residual HTML tags so Google always receives plain text.
                text: item.answer.replace(/<[^>]*>/g, "").trim(),
              },
            })),
          }
      : null;

  const personJsonLd = props.person
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
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
        "@type": props.service.schemaType ?? "Service",
        name: props.service.name,
        description: props.service.description,
        serviceType: props.service.serviceType ?? props.service.name,
        category: props.service.category,
        areaServed: props.service.areaServed ?? "Worldwide",
        url: props.service.url ?? canonical,
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
        "@id": canonical,
        url: canonical,
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
      }
    : null;

  const howToJsonLd = props.howTo
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
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
      }
    : null;

  const speakableSelectors =
    props.speakableSelectors !== undefined
      ? props.speakableSelectors
      : props.article
        ? ["h1", ".speakable-summary"]
        : null;

  const speakableJsonLd =
    speakableSelectors && speakableSelectors.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": canonical,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: speakableSelectors,
          },
          url: canonical,
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

  const ogImage = props.article?.image ?? `${SITE_URL}/opengraph.jpg`;

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
          "@type": "CreateAction",
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
      }
    : null;

  const articleJsonLd = props.article
    ? {
        "@context": "https://schema.org",
        // BlogPosting is a more specific subtype of Article — it tells Google
        // this is editorial blog content (vs. news, scholarly, etc.) and is
        // the recommended type for the Article rich result for blog posts.
        "@type": "BlogPosting",
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
      {props.hreflang?.some((h) => h.lang === "en-GB") ? (
        <meta property="og:locale:alternate" content="en_GB" />
      ) : null}
      {props.hreflang?.some((h) => h.lang === "en-SG") ? (
        <meta property="og:locale:alternate" content="en_SG" />
      ) : null}
      <link rel="canonical" href={canonical} />
      {props.hreflang?.map((h) => (
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
        content={ogImage.includes(".png") ? "image/png" : "image/jpeg"}
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
        <meta property="article:author" content={props.article.author} />
      ) : null}
      {props.article?.section ? (
        <meta property="article:section" content={props.article.section} />
      ) : null}
      {props.article?.tags?.map((tag) => (
        <meta key={`og-tag-${tag}`} property="article:tag" content={tag} />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
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
    </Helmet>
  );
}
