import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import {
  ORGANIZATION_SCHEMA,
  PAGE_META,
  SITE_NAME,
  SITE_URL,
  type PageKey,
} from "@/lib/metaData";

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

type Common = {
  title?: string;
  description?: string;
  canonical?: string;
  article?: ArticleSchema;
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
      {props.article?.image ? (
        <meta property="og:image" content={props.article.image} />
      ) : null}
      <meta name="twitter:card" content="summary_large_image" />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      {props.article?.image ? (
        <meta name="twitter:image" content={props.article.image} />
      ) : null}
      <script type="application/ld+json">
        {JSON.stringify(ORGANIZATION_SCHEMA)}
      </script>
      {articleJsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
      ) : null}
    </Helmet>
  );
}
