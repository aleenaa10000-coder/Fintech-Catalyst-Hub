import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "general-policy",
    number: 1,
    title: "General Policy",
    summary: "Work that's already done — research, audits, outreach, writing — is non-refundable.",
  },
  {
    id: "monthly-retainers",
    number: 2,
    title: "Monthly Retainers",
    summary: "Cancel with the notice in your MSA (usually 30 days). Once the month starts, that month's fee stays.",
  },
  {
    id: "content-revisions",
    number: 3,
    title: "Content Revisions",
    summary: "Not refunds — revisions. We re-edit up to twice per piece if it misses the brief.",
  },
  {
    id: "link-building-placements",
    number: 4,
    title: "Link Building Placements",
    summary: "If a link drops within 180 days through no fault of yours, we replace it on a same-or-better DR site for free.",
  },
  {
    id: "exceptions",
    number: 5,
    title: "Exceptions",
    summary: "Real refunds only for duplicate billing or if we never started the work — email billing@fintechpresshub.com.",
  },
];

export default function RefundPolicy() {
  return (
    <>
      <PageMeta page="refundPolicy" />
      <LegalPageLayout
      title={<>Refund Policy</>}
      description="Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees."
      lastUpdated="October 1, 2023"
      sections={SECTIONS}
      testIdPrefix="refund"
    >
      <h2 id="general-policy">1. General Policy</h2>
      <p>
        At FintechPressHub, we pride ourselves on delivering high-quality SEO and content services.
        Due to the nature of digital marketing and the upfront labor required (research, auditing,
        outreach, and writing), our standard policy is that we do not offer refunds for work that
        has already been completed or hours that have been logged.
      </p>

      <h2 id="monthly-retainers">2. Monthly Retainers</h2>
      <p>
        For clients on monthly retainers, you may cancel your services according to the notice
        period specified in your Master Services Agreement (typically 30 days). Once a billing
        cycle has started and work has commenced for that month, the retainer fee for that month is
        non-refundable.
      </p>

      <h2 id="content-revisions">3. Content Revisions</h2>
      <p>
        Instead of refunds on content, we operate on a revision model. If a piece of content does
        not meet the guidelines established in the initial brief, we provide up to two (2) rounds
        of revisions to ensure it meets your standards, provided the feedback is within the scope
        of the original brief.
      </p>

      <h2 id="link-building-placements">4. Link Building Placements</h2>
      <p>
        If a secured link is removed within 180 days of placement through no fault of the client
        (e.g., the publisher deletes the post), FintechPressHub will secure a replacement link of
        equal or greater Domain Rating at no additional cost. We do not offer cash refunds for
        removed links.
      </p>

      <h2 id="exceptions">5. Exceptions</h2>
      <p>Refunds may be considered on a case-by-case basis under the following extreme circumstances:</p>
      <ul>
        <li>Duplicate billing errors on our end.</li>
        <li>
          Failure to commence any work within 14 days of an upfront payment without communication
          or agreement from the client.
        </li>
      </ul>

      <p>
        To discuss billing or request an exception, please contact billing@fintechpresshub.com.
      </p>
      </LegalPageLayout>
    </>
  );
}
