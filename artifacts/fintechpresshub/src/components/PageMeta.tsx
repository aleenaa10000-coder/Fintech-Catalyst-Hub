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

export type RssFeedLink = {
  href: string;
  title: string;
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
   * When true, emits `<meta name="robots" content="noindex,nofollow">` to
   * exclude the page from search engines. Used by per-post noIndex toggles
   * and by admin-only pages (e.g. /admin/login).
   */
  noindex?: boolean;
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
      ? {
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
        "@type": "Service",
        name: props.service.name,
        description: props.service.description,
        serviceType: props.service.serviceType ?? props.service.name,
        category: props.service.category,
        areaServed: props.service.areaServed ?? "Worldwide",
        url: props.service.url ?? canonical,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/favicon.svg`,
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
          logo: `${SITE_URL}/favicon.svg`,
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
            url: `${SITE_URL}/favicon.svg`,
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
      }
    : null;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {props.noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : null}
      <link rel="canonical" href={canonical} />
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
      <meta
        property="og:image"
        content={props.article?.image ?? `${SITE_URL}/opengraph.jpg`}
      />
      <meta property="og:image:alt" content="FintechPressHub - Fintech SEO Agency" />
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
      <meta
        name="twitter:image"
        content={props.article?.image ?? `${SITE_URL}/opengraph.jpg`}
      />
      <meta name="twitter:image:alt" content="FintechPressHub - Fintech SEO Agency" />
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
    </Helmet>
  );
}
