import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "general-policy",
    number: 1,
    title: "General Policy",
    summary: "Completed research, auditing, outreach, and writing are non-refundable due to the upfront labour involved.",
  },
  {
    id: "monthly-retainers",
    number: 2,
    title: "Monthly Retainers",
    summary: "Cancel with the notice period in your MSA (typically 30 days). Once a cycle starts, that month's fee is non-refundable.",
  },
  {
    id: "content-revisions",
    number: 3,
    title: "Content Revisions",
    summary: "Not refunds — revisions. We re-edit up to twice per piece if it falls outside the original brief.",
  },
  {
    id: "link-building-placements",
    number: 4,
    title: "Link Building Placements",
    summary: "Links removed within 180 days through no fault of the client are replaced on a same-or-better DR site at no cost.",
  },
  {
    id: "exceptions",
    number: 5,
    title: "Exceptions",
    summary: "Refunds only for duplicate billing errors or if we have not commenced work within 14 days of receiving payment.",
  },
  {
    id: "how-to-request",
    number: 6,
    title: "How to Request a Refund",
    summary: "Email billing@fintechpresshub.com with your invoice number, reason, and supporting information. We respond within 5 business days.",
  },
];

const FAQ = [
  {
    question: "Does FintechPressHub offer refunds?",
    answer:
      "FintechPressHub's standard policy is no refunds for completed work. Exceptions are considered only for duplicate billing errors or if we fail to commence any work within 14 days of payment without prior communication. Email billing@fintechpresshub.com to discuss exceptions.",
  },
  {
    question: "What is FintechPressHub's link replacement guarantee?",
    answer:
      "If a secured backlink is removed within 180 days of placement through no fault of the client — for example, if the publisher deletes the article — FintechPressHub will replace it with a link on an equal or higher Domain Rating site at no additional cost.",
  },
  {
    question: "How do content revisions work under the Refund Policy?",
    answer:
      "Instead of refunds on content, FintechPressHub provides up to two rounds of revisions per piece if it does not meet the guidelines in the original brief. Revision requests outside the original scope are treated as new work and quoted separately.",
  },
  {
    question: "How much notice is required to cancel a FintechPressHub retainer?",
    answer:
      "The required notice period is specified in your Master Services Agreement — typically 30 days written notice. Once a billing cycle has commenced and work has begun, the retainer fee for that month is non-refundable regardless of cancellation notice.",
  },
  {
    question: "What qualifies for a full refund at FintechPressHub?",
    answer:
      "Full refunds are considered in two circumstances only: a duplicate billing error on FintechPressHub's end, or if we have not commenced any work within 14 days of receiving an upfront payment without prior agreement or communication with you.",
  },
];

export default function RefundPolicy() {
  return (
    <>
      <PageMeta
        page="refundPolicy"
        webPage={{
          datePublished: "2023-10-01",
          dateModified: "2026-05-15",
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          license: "https://www.fintechpresshub.com/terms",
          usageInfo: "https://www.fintechpresshub.com/terms",
          copyrightNotice: "© 2026 FintechPressHub. All rights reserved.",
          about: [
            "Refund Policy",
            "Fintech SEO Cancellation Policy",
            "Link Building Guarantee",
            "Content Revision Policy",
            "SEO Retainer Cancellation",
          ],
          keywords: [
            "refund policy",
            "fintech SEO refund",
            "link replacement guarantee",
            "retainer cancellation",
            "content revision policy",
          ],
        }}
        faq={FAQ}
        faqDatePublished="2023-10-01"
        faqDateModified="2026-05-15"
        hreflang={[
          { lang: "en", href: "https://www.fintechpresshub.com/refund-policy" },
          { lang: "x-default", href: "https://www.fintechpresshub.com/refund-policy" },
        ]}
        speakableSelectors={["h1", ".geo-answer-block"]}
      />
      <LegalPageLayout
        title={<>Refund Policy</>}
        description="Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees."
        lastUpdated="May 15, 2026"
        sections={SECTIONS}
        testIdPrefix="refund"
      >
        <h2 id="general-policy">1. General Policy</h2>
        <p className="geo-answer-block">
          FintechPressHub does not offer refunds for completed work. Due to the upfront labour
          required to deliver fintech SEO and content services — including research, technical
          auditing, journalist outreach, expert writing, and link placement — fees for work that
          has been carried out cannot be returned. Exceptions exist only for duplicate billing
          errors or failure to commence work, as described in Section 5.
        </p>
        <p>
          Our policy is designed to be transparent from the outset. All deliverables, timelines,
          and payment schedules are agreed in a signed Statement of Work (SOW) or Master Services
          Agreement (MSA) before any work begins. For questions about payment terms, see our{" "}
          <a href="/terms">Terms and Conditions</a>.
        </p>

        <h2 id="monthly-retainers">2. Monthly Retainers</h2>
        <p>
          For clients on monthly SEO or content retainers, the following cancellation terms apply:
        </p>
        <ul>
          <li>
            <strong>Notice period</strong> — you may cancel your retainer by providing written
            notice in accordance with the period specified in your MSA, which is typically 30
            calendar days. Notice must be submitted in writing to your account manager or to{" "}
            <a href="mailto:billing@fintechpresshub.com">billing@fintechpresshub.com</a>.
          </li>
          <li>
            <strong>Billing cycle rule</strong> — once a billing cycle has commenced (i.e., the
            invoice has been issued and work for that month has begun), the retainer fee for that
            month is non-refundable. The notice period begins from the date of receipt of written
            cancellation, not from any retrospective date.
          </li>
          <li>
            <strong>Outstanding deliverables</strong> — upon cancellation, we will complete any
            deliverables already in progress during the notice period. We are not obligated to begin
            new work streams during the notice period if the timeline makes completion impractical.
          </li>
          <li>
            <strong>Early termination</strong> — if you terminate outside the agreed minimum term
            (where one exists in your MSA), an early termination fee equal to the remaining months
            of the minimum term may apply. This will be specified in your MSA if applicable.
          </li>
        </ul>

        <h2 id="content-revisions">3. Content Revisions</h2>
        <p>
          Our alternative to refunds on content deliverables is a structured revision process.
          Every piece of content we produce is subject to:
        </p>
        <ul>
          <li>
            <strong>Two rounds of revisions</strong> per deliverable, provided feedback is received
            within 14 days of delivery and is within the scope of the original brief and style
            guide provided at kick-off.
          </li>
          <li>
            <strong>Scope definition</strong> — revisions are amendments to an existing piece
            (tone, factual corrections, structure adjustments). A request to fundamentally change
            the topic, angle, or audience constitutes a new brief and will be quoted separately.
          </li>
          <li>
            <strong>Turnaround time</strong> — revised content is typically returned within 5
            business days of receipt of structured feedback. Complex restructuring requests may
            require a longer turnaround, which will be communicated in advance.
          </li>
        </ul>
        <p>
          If, after two rounds of revisions, a piece still does not meet the brief as originally
          agreed, please contact your account manager to discuss resolution options. We stand behind
          the quality of our work and will always seek a fair outcome.
        </p>

        <h2 id="link-building-placements">4. Link Building Placements</h2>
        <p>
          FintechPressHub operates a link replacement guarantee for all guest post and digital PR
          link placements:
        </p>
        <ul>
          <li>
            <strong>180-day replacement guarantee</strong> — if a secured backlink is removed
            within 180 days of the confirmed live date through no fault of the client, we will
            secure a replacement link on a website of equal or greater Domain Rating (DR) at no
            additional cost.
          </li>
          <li>
            <strong>What "no fault of the client" means</strong> — the guarantee applies when a
            link is removed due to publisher decisions (article deletion, site migration, or
            editorial policy change). It does not apply if the link was removed due to the client's
            own website changes (404 errors, domain migrations) or if the client's website was
            penalised by a search engine.
          </li>
          <li>
            <strong>Replacement timeline</strong> — replacement placements are typically secured
            within 60 days of a confirmed removal being reported. We will provide reporting on the
            replacement link (live URL, DR, and traffic metrics) upon completion.
          </li>
          <li>
            <strong>No cash refunds for removed links</strong> — we do not issue monetary refunds
            for links that are removed. The replacement guarantee is our commitment to deliver the
            agreed link equity, not a warranty for the indefinite existence of any individual
            placement.
          </li>
        </ul>
        <p>
          To report a removed link and trigger the replacement process, email{" "}
          <a href="mailto:billing@fintechpresshub.com">billing@fintechpresshub.com</a> with the
          original live URL and the date of removal (or confirmation that the URL now returns a
          404 or has been de-indexed).
        </p>

        <h2 id="exceptions">5. Exceptions</h2>
        <p>
          Full or partial refunds may be considered on a case-by-case basis exclusively under the
          following circumstances:
        </p>
        <ul>
          <li>
            <strong>Duplicate billing error</strong> — if you have been invoiced twice for the
            same service period or deliverable, we will issue a full refund of the duplicate charge
            within 10 business days of confirming the error.
          </li>
          <li>
            <strong>Failure to commence work</strong> — if FintechPressHub has received an upfront
            payment and has not commenced any billable work within 14 calendar days without prior
            written communication or agreement, a full refund of that upfront payment will be
            issued.
          </li>
        </ul>
        <p>
          Exceptions are evaluated individually and require written documentation. FintechPressHub
          reserves the right to decline exception requests that do not meet the above criteria.
        </p>

        <h2 id="how-to-request">6. How to Request a Refund</h2>
        <p>
          To request a refund under one of the exceptions above, or to report a billing discrepancy,
          follow these steps:
        </p>
        <ul>
          <li>
            <strong>Step 1:</strong> Email{" "}
            <a href="mailto:billing@fintechpresshub.com">billing@fintechpresshub.com</a> with the
            subject line "Refund Request — [your company name]".
          </li>
          <li>
            <strong>Step 2:</strong> Include your invoice number, the amount in question, the
            reason for your request, and any supporting documentation (for example, a screenshot of
            a duplicate charge or evidence of non-commencement).
          </li>
          <li>
            <strong>Step 3:</strong> Our billing team will acknowledge your request within 2
            business days and aim to provide a full response within 5 business days.
          </li>
          <li>
            <strong>Step 4:</strong> If approved, refunds are processed via the original payment
            method and typically appear within 7–14 business days depending on your bank or card
            issuer.
          </li>
        </ul>
        <p>
          If you have a dispute about the quality of work delivered rather than a billing matter,
          contact your account manager directly or email{" "}
          <a href="mailto:hello@fintechpresshub.com">hello@fintechpresshub.com</a>. For the full
          payment and cancellation framework, see our{" "}
          <a href="/terms">Terms and Conditions</a>.
        </p>
      </LegalPageLayout>
    </>
  );
}
