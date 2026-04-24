import { Helmet } from "react-helmet-async";
import { PAGE_META, type PageKey } from "@/lib/metaData";

type PageMetaProps =
  | { page: PageKey; title?: string; description?: string }
  | { page?: undefined; title: string; description?: string };

export function PageMeta(props: PageMetaProps) {
  const base = props.page ? PAGE_META[props.page] : undefined;
  const title = props.title ?? base?.title ?? "";
  const description = props.description ?? base?.description;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
    </Helmet>
  );
}
