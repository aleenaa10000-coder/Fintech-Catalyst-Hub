import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const FALLBACK_LAST_UPDATED_ISO = "2026-05-15";

function resolveLastUpdated(): { display: string; iso: string } {
  const raw = __TERMS_LAST_UPDATED_ISO__ || FALLBACK_LAST_UPDATED_ISO;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { display: "May 15, 2026", iso: FALLBACK_LAST_UPDATED_ISO };
  }
  const display = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return { display, iso: d.toISOString().slice(0, 10) };
}

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
    id: "payment-terms",
    number: 4,
    title: "Payment Terms",
    summary: "Invoices are due within 14 days. Overdue balances accrue interest. Upfront fees are non-refundable once work commences.",
  },
  {
    id: "intellectual-property",
    number: 5,
    title: "Intellectual Property",
    summary: "Once you pay in full, the content is yours. We can mention non-confidential results in case studies unless an NDA says otherwise.",
  },
  {
    id: "limitation-of-liability",
    number: 6,
    title: "Limitation of Liability",
    summary: "We follow best practices but can't promise specific Google rankings, and we're not liable when third-party platforms change the rules.",
  },
  {
    id: "dispute-resolution",
    number: 7,
    title: "Dispute Resolution",
    summary: "Disputes go through good-faith negotiation first, then mediation before any litigation — saving both parties time and cost.",
  },
  {
    id: "governing-law",
    number: 8,
    title: "Governing Law",
    summary: "Any disputes are handled under New York State law in New York courts.",
  },
];

const FAQ = [
  {
    question: "What services does FintechPressHub provide under these Terms?",
    answer:
      "FintechPressHub provides fintech SEO, editorial content creation, digital PR, link building, and topical authority services. Specific deliverables and timelines are defined in a signed Statement of Work (SOW) or Master Services Agreement (MSA) for each client engagement.",
  },
  {
    question: "Who owns the content FintechPressHub creates?",
    answer:
      "Upon full payment of applicable fees, the client owns all content created specifically for them. FintechPressHub retains the right to reference non-confidential campaign results as case studies unless a strict NDA is in place.",
  },
  {
    question: "What law governs the FintechPressHub Terms and Conditions?",
    answer:
      "These Terms and Conditions are governed by the laws of the State of New York. Any disputes that proceed to litigation are subject to the exclusive jurisdiction of the courts in New York State.",
  },
  {
    question: "Does FintechPressHub guarantee search engine rankings?",
    answer:
      "No. FintechPressHub applies industry-standard best practices for SEO but cannot guarantee specific rankings or traffic volumes due to the unpredictable nature of search engine algorithms and third-party platform changes beyond our control.",
  },
  {
    question: "How do I cancel a FintechPressHub retainer?",
    answer:
      "Cancellations follow the notice period specified in your Master Services Agreement, typically 30 days written notice. Once a billing cycle has started and work has commenced, the retainer fee for that month is non-refundable. See our Refund Policy for full details.",
  },
];

export default function Terms() {
  const { display, iso } = resolveLastUpdated();
  return (
    <>
      <PageMeta
        page="terms"
        webPage={{
          datePublished: "2023-10-01",
          dateModified: iso,
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          license: "https://www.fintechpresshub.com/terms",
          usageInfo: "https://www.fintechpresshub.com/terms",
          copyrightNotice: "© 2026 FintechPressHub. All rights reserved.",
          about: [
            "Terms and Conditions",
            "Fintech SEO Services Agreement",
            "Content Marketing Contract",
            "Intellectual Property",
            "Governing Law",
          ],
          keywords: [
            "terms and conditions",
            "fintech SEO services agreement",
            "client responsibilities",
            "intellectual property",
            "New York governing law",
          ],
        }}
        faq={FAQ}
        faqDatePublished="2023-10-01"
        faqDateModified={iso}
        hreflang={[
          { lang: "en", href: "https://www.fintechpresshub.com/terms" },
          { lang: "x-default", href: "https://www.fintechpresshub.com/terms" },
        ]}
        speakableSelectors={["h1", ".geo-answer-block"]}
      />
      <LegalPageLayout
        title={<>Terms and Conditions</>}
        description="The agreement that governs your use of FintechPressHub's website, services, and engagements."
        lastUpdated={display}
        sections={SECTIONS}
        testIdPrefix="terms"
      >
        <h2 id="agreement-to-terms">1. Agreement to Terms</h2>
        <p className="geo-answer-block">
          FintechPressHub's Terms and Conditions govern the use of our website and all fintech
          SEO, content marketing, digital PR, and link-building services we provide. By accessing
          our website or engaging our services, you confirm that you have read, understood, and
          agreed to be bound by these terms. If you disagree with any part of these terms, you may
          not access the website or use our services.
        </p>
        <p>
          These Terms apply alongside any signed Master Services Agreement (MSA) or Statement of
          Work (SOW). In the event of a conflict, the MSA or SOW takes precedence over these
          general Terms. For questions about our data practices, see our{" "}
          <a href="/privacy-policy">Privacy Policy</a> and{" "}
          <a href="/cookie-policy">Cookie Policy</a>.
        </p>

        <h2 id="services-provided">2. Services Provided</h2>
        <p>
          FintechPressHub provides specialist digital marketing services for the financial
          technology sector, including:
        </p>
        <ul>
          <li>
            <strong>Fintech SEO</strong> — on-page optimisation, technical SEO audits, keyword
            strategy, topical authority building, and rank-tracking reporting.
          </li>
          <li>
            <strong>Content marketing</strong> — long-form editorial articles, pillar pages,
            category hub content, product landing pages, and newsletter copy written by
            subject-matter experts.
          </li>
          <li>
            <strong>Digital PR and link building</strong> — data-led campaign ideation, journalist
            outreach, guest post placement on tier-1 fintech and finance publications, and
            Domain-Rating-qualified link acquisition.
          </li>
          <li>
            <strong>Topical authority strategy</strong> — content cluster architecture, internal
            linking strategy, and entity-building for AI search visibility.
          </li>
        </ul>
        <p>
          The specific deliverables, timelines, quality benchmarks, and pricing for each engagement
          are defined in a Statement of Work (SOW) or Master Services Agreement (MSA) signed by
          both parties before work commences. Deliverables not listed in the SOW or MSA are
          outside scope and may be quoted separately.
        </p>

        <h2 id="client-responsibilities">3. Client Responsibilities</h2>
        <p>
          Successful delivery of SEO and content services depends on timely, accurate input from
          the client. You agree to:
        </p>
        <ul>
          <li>
            <strong>Access and credentials</strong> — provide timely access to required platforms
            within 5 business days of project kick-off, including Google Search Console, Google
            Analytics, your CMS, and any third-party tools identified in the SOW.
          </li>
          <li>
            <strong>Point of contact</strong> — designate a primary contact with authority to
            approve content, provide feedback, and make decisions. Delayed approvals that push
            deliverables past agreed dates do not constitute grounds for refund claims.
          </li>
          <li>
            <strong>Accurate information</strong> — provide accurate details about your product,
            regulatory environment, brand guidelines, target audience, and any compliance
            restrictions that affect content. We are not liable for errors arising from inaccurate
            client-supplied information.
          </li>
          <li>
            <strong>Legal compliance</strong> — ensure that all content strategies, products, and
            services you ask us to promote are lawful in the target jurisdictions and compliant with
            applicable financial regulations.
          </li>
        </ul>

        <h2 id="payment-terms">4. Payment Terms</h2>
        <p>
          Unless otherwise specified in your SOW or MSA, the following payment terms apply to all
          FintechPressHub engagements:
        </p>
        <ul>
          <li>
            <strong>Invoice schedule</strong> — retainer invoices are issued on the first business
            day of each calendar month. Project-based invoices are issued upon milestone completion
            as defined in the SOW.
          </li>
          <li>
            <strong>Payment deadline</strong> — all invoices are due within 14 days of the invoice
            date. Overdue balances accrue interest at 1.5% per month (or the maximum rate permitted
            by applicable law, whichever is lower).
          </li>
          <li>
            <strong>Upfront fees</strong> — where an upfront or set-up fee is agreed, it is
            non-refundable once work has commenced. This fee covers initial research, audit work,
            and strategy development, which cannot be un-delivered.
          </li>
          <li>
            <strong>Suspension for non-payment</strong> — if payment is more than 30 days overdue
            without agreed deferral in writing, FintechPressHub reserves the right to suspend
            active work until the outstanding balance is settled.
          </li>
          <li>
            <strong>Currency</strong> — all fees are invoiced in USD unless otherwise agreed in
            writing. Clients in other jurisdictions are responsible for any bank transfer fees or
            currency conversion costs.
          </li>
        </ul>
        <p>
          For information about refunds and cancellations, see our{" "}
          <a href="/refund-policy">Refund Policy</a>.
        </p>

        <h2 id="intellectual-property">5. Intellectual Property</h2>
        <p>
          Upon full payment of all applicable fees for a given deliverable, FintechPressHub assigns
          to the client all intellectual property rights in the content created specifically for
          that engagement, including written articles, page copy, and data analysis.
        </p>
        <ul>
          <li>
            <strong>IP assignment</strong> — the assignment of rights is contingent on full
            payment. Where invoices remain outstanding, FintechPressHub retains all IP in the
            affected deliverables until payment is received.
          </li>
          <li>
            <strong>Case studies</strong> — FintechPressHub retains the right to reference
            non-confidential campaign results, metrics, and strategies in case studies, portfolio
            materials, and marketing content, unless a strict NDA explicitly prohibits such
            disclosure.
          </li>
          <li>
            <strong>Pre-existing IP</strong> — methodologies, frameworks, templates, and
            proprietary processes used during an engagement remain the exclusive IP of
            FintechPressHub and are not transferred to the client.
          </li>
          <li>
            <strong>Third-party content</strong> — we may incorporate licensed third-party
            material (stock imagery, data sources, tools) into deliverables. The client is
            responsible for maintaining any required licences for ongoing use of such material after
            the engagement ends.
          </li>
        </ul>

        <h2 id="limitation-of-liability">6. Limitation of Liability</h2>
        <p>
          FintechPressHub employs industry-standard SEO best practices, proprietary link-vetting
          processes, and experienced editorial oversight. However, certain outcomes are outside our
          control:
        </p>
        <ul>
          <li>
            <strong>No ranking guarantees</strong> — search engine algorithms are updated
            continuously by Google and other search platforms. We do not guarantee specific keyword
            rankings, organic traffic volumes, or revenue outcomes. Historical results in case
            studies are not guarantees of future performance.
          </li>
          <li>
            <strong>Third-party platform changes</strong> — we are not liable for negative impacts
            caused by algorithm updates, publisher policy changes, de-indexation by third-party
            platforms, or social media algorithm shifts beyond our control.
          </li>
          <li>
            <strong>Cap on liability</strong> — to the maximum extent permitted by law,
            FintechPressHub's total cumulative liability to any client arising out of or relating
            to these Terms shall not exceed the total fees paid by that client in the three months
            immediately preceding the event giving rise to the claim.
          </li>
          <li>
            <strong>Exclusion of consequential loss</strong> — we are not liable for any indirect,
            consequential, special, or punitive damages, including loss of profits, loss of revenue,
            or loss of data, even if advised of the possibility of such damages.
          </li>
        </ul>

        <h2 id="dispute-resolution">7. Dispute Resolution</h2>
        <p>
          We aim to resolve all disputes quickly and cost-effectively. The following process applies
          before any litigation is commenced:
        </p>
        <ul>
          <li>
            <strong>Good-faith negotiation</strong> — either party may raise a dispute in writing.
            Both parties agree to engage in good-faith discussions for a minimum of 30 days from
            the date of the written notice before escalating further.
          </li>
          <li>
            <strong>Mediation</strong> — if negotiation fails, either party may request non-binding
            mediation administered by a mutually agreed mediator in New York. Each party bears its
            own costs for mediation.
          </li>
          <li>
            <strong>Litigation</strong> — if mediation does not resolve the dispute, the parties
            may pursue litigation subject to the governing law and jurisdiction provisions in
            Section 8 below.
          </li>
        </ul>

        <h2 id="governing-law">8. Governing Law</h2>
        <p>
          These Terms and Conditions are governed by and construed in accordance with the laws of
          the State of New York, without regard to its conflict of law provisions. You irrevocably
          submit to the exclusive jurisdiction of the state and federal courts located in New York
          County, New York, for the resolution of any dispute arising out of or relating to these
          Terms.
        </p>
        <p>
          If any provision of these Terms is found to be unenforceable or invalid under applicable
          law, that provision will be limited or eliminated to the minimum extent necessary, and the
          remaining provisions will continue in full force and effect. These Terms constitute the
          entire agreement between you and FintechPressHub with respect to the subject matter
          herein, and supersede all prior agreements, representations, and understandings.
        </p>
        <p>
          See also our <a href="/editorial-guidelines">Editorial Guidelines</a> and{" "}
          <a href="/community-guidelines">Community Guidelines</a>, which form part of the
          framework governing content engagements.
        </p>
      </LegalPageLayout>
    </>
  );
}
