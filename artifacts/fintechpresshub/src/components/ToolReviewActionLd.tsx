import { Helmet } from "react-helmet-async";

interface Props {
  slug: string;
  name: string;
}

const BASE = "https://www.fintechpresshub.com/tools";

export function ToolReviewActionLd({ slug, name }: Props) {
  const url = `${BASE}/${slug}`;
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": url,
        name,
        potentialAction: {
          "@type": "ReviewAction",
          target: `${url}#rate`,
          resultReview: {
            "@type": "Review",
            reviewAspect: "Usability",
          },
        },
      })}</script>
    </Helmet>
  );
}
