import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "agreement-to-terms",
    number: 1,
    title: "Agreement to Terms",
    summary: "Use the site or our services and you agree to these rules. Don't agree? Don't use them.",
  },
  {
    id: "services-provided",
    number: 2,
    title: "Services Provided",
    summary: "We do SEO, content, and PR for fintech. The exact scope and price live in your signed SOW or MSA.",
  },
  {
    id: "client-responsibilities",
    number: 3,
    title: "Client Responsibilities",
    summary: "Give us access, a point of contact, and accurate info — otherwise we can't deliver results.",
  },
  {
    id: "intellectual-property",
    number: 4,
    title: "Intellectual Property",
    summary: "Once you pay in full, the content is yours. We can mention non-confidential results in case studies unless an NDA says otherwise.",
  },
  {
    id: "limitation-of-liability",
    number: 5,
    title: "Limitation of Liability",
    summary: "We follow best practices but can't promise specific Google rankings, and we're not liable when third-party platforms change the rules.",
  },
  {
    id: "governing-law",
    number: 6,
    title: "Governing Law",
    summary: "Any disputes are handled under New York State law in New York courts.",
  },
];

export default function Terms() {
  return (
    <>
      <PageMeta page="terms" webPage={{ datePublished: "2023-10-01", dateModified: "2026-04-28" }} />
      <LegalPageLayout
      title={<>Terms of Service</>}
      description="The agreement that governs your use of FintechPressHub's website, services, and engagements."
      lastUpdated="April 28, 2026"
      sections={SECTIONS}
      testIdPrefix="terms"
    >
      <h2 id="agreement-to-terms">1. Agreement to Terms</h2>
      <p>
        By accessing or using FintechPressHub's website and services, you agree to be bound by
        these Terms of Service. If you disagree with any part of the terms, then you may not access
        the service.
      </p>

      <h2 id="services-provided">2. Services Provided</h2>
      <p>
        FintechPressHub provides digital marketing, search engine optimization (SEO), content
        creation, and digital PR services specifically tailored for the financial technology
        industry. The specific deliverables, timelines, and costs will be outlined in a separate
        Statement of Work (SOW) or Master Services Agreement (MSA) for clients.
      </p>

      <h2 id="client-responsibilities">3. Client Responsibilities</h2>
      <p>To ensure successful delivery of services, clients agree to:</p>
      <ul>
        <li>
          Provide timely access to necessary platforms (CMS, Google Analytics, Search Console,
          etc.).
        </li>
        <li>Designate a primary point of contact for approvals and feedback.</li>
        <li>
          Provide accurate information regarding products, compliance requirements, and brand
          guidelines.
        </li>
      </ul>

      <h2 id="intellectual-property">4. Intellectual Property</h2>
      <p>
        Upon full payment of applicable fees, FintechPressHub grants the client full rights to all
        content created specifically for them. FintechPressHub retains the right to use
        non-confidential campaign results as case studies unless a strict NDA is in place.
      </p>

      <h2 id="limitation-of-liability">5. Limitation of Liability</h2>
      <p>
        FintechPressHub employs industry-standard best practices for SEO. However, due to the
        unpredictable nature of search engine algorithms, we do not guarantee specific rankings or
        traffic volumes. We are not liable for algorithm updates or actions taken by third-party
        platforms that negatively impact your website.
      </p>

      <h2 id="governing-law">6. Governing Law</h2>
      <p>
        These terms and conditions are governed by and construed in accordance with the laws of the
        State of New York, and you irrevocably submit to the exclusive jurisdiction of the courts
        in that State or location.
      </p>
      </LegalPageLayout>
    </>
  );
}
