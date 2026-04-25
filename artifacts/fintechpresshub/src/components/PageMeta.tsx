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
  section?: string;
  tags?: string[];
};

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
};

type Common = {
  title?: string;
  description?: string;
  canonical?: string;
  article?: ArticleSchema;
  person?: PersonSchema;
};

type PageMetaProps =
  | ({ page: PageKey } & Common)
  | ({ page?: undefined; title: string } & Common);

export function PageMeta(props: PageMetaProps) {
  const [location] = useLocation();
  const base = props.page ? PAGE_META[props.page] : undefined;
  const title = props.title ?? base?.title ?? "";
  const description = props.description ?? base?.description;

  const canonical =
    props.canonical ?? `${SITE_URL}${location === "/" ? "" : location}`;

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

  const personJsonLd = props.person
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: props.person.name,
          jobTitle: props.person.jobTitle,
          description: props.person.description,
          image: props.person.image,
          url: props.person.url ?? canonical,
          email: props.person.email,
          sameAs: props.person.sameAs?.filter(Boolean),
          knowsAbout: props.person.knowsAbout,
          worksFor: props.person.worksFor
            ? { "@type": "Organization", name: props.person.worksFor }
            : { "@type": "Organization", name: SITE_NAME },
        },
      }
    : null;

  const articleJsonLd = props.article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: props.article.title,
        description: props.article.description,
        image: props.article.image,
        datePublished: props.article.datePublished,
        dateModified:
          props.article.dateModified ?? props.article.datePublished,
        author: props.article.author
          ? { "@type": "Person", name: props.article.author }
          : undefined,
        publisher: {
          "@type": "Organization",
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
        articleSection: props.article.section,
        keywords: props.article.tags?.join(", "),
      }
    : null;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} Blog`}
        href={`${SITE_URL}/rss.xml`}
      />
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
    </Helmet>
  );
}
