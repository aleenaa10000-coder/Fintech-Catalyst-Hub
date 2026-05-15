import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    summary: "We respect your privacy and explain in plain terms what we collect, why, and how long we keep it.",
  },
  {
    id: "data-we-collect",
    number: 2,
    title: "Data We Collect",
    summary: "Identity, contact, technical, and usage data — only what we need to operate and improve our services.",
  },
  {
    id: "legal-basis",
    number: 3,
    title: "Legal Basis for Processing",
    summary: "We process your data under GDPR lawful bases: contract, legitimate interest, legal obligation, or consent.",
  },
  {
    id: "how-we-use-data",
    number: 4,
    title: "How We Use Your Data",
    summary: "To deliver services, run our business, comply with law, and — where consented — send marketing.",
  },
  {
    id: "data-retention",
    number: 5,
    title: "Data Retention",
    summary: "Prospect data kept 24 months; client records 6 years; analytics data 26 months.",
  },
  {
    id: "international-transfers",
    number: 6,
    title: "International Data Transfers",
    summary: "Transfers to non-EEA countries are protected by Standard Contractual Clauses or an adequacy decision.",
  },
  {
    id: "your-rights",
    number: 7,
    title: "Your Rights",
    summary: "Access, correct, erase, port, object to, or restrict processing of your data. Contact us to exercise any right.",
  },
  {
    id: "data-security",
    number: 8,
    title: "Data Security",
    summary: "HTTPS encryption, access controls, and reputable processors with ISO 27001 or SOC 2 certification.",
  },
  {
    id: "cookies",
    number: 9,
    title: "Cookies & Related Technologies",
    summary: "We use cookies for analytics and marketing. See our Cookie Policy for full details and opt-out options.",
  },
  {
    id: "contact-us",
    number: 10,
    title: "Contact Us",
    summary: "Questions about this policy or your personal data? Email privacy@fintechpresshub.com.",
  },
];

const FAQ = [
  {
    question: "Does FintechPressHub sell my personal data?",
    answer:
      "No. FintechPressHub never sells your personal data to third parties. We share it only with service providers who help us operate the site — hosting, analytics, and email platforms — each bound by strict data processing agreements.",
  },
  {
    question: "What personal data does FintechPressHub collect?",
    answer:
      "We collect identity data (name, email address), technical data (IP address, browser type, time zone), usage data (pages visited, time on site), and contact data submitted through our forms or email enquiries.",
  },
  {
    question: "How long does FintechPressHub keep my personal data?",
    answer:
      "Contact enquiries and prospect data are retained for 24 months. Client records are kept for 6 years to meet accounting and legal obligations. Analytics data is retained for 26 months in line with Google Analytics defaults.",
  },
  {
    question: "What are my rights under GDPR?",
    answer:
      "If you are in the EU or UK, you have the right to access, correct, erase, and port your data, plus the right to object to processing and to withdraw consent at any time. Email privacy@fintechpresshub.com to exercise any right.",
  },
  {
    question: "How does FintechPressHub protect my personal data?",
    answer:
      "We use HTTPS encryption across the entire site, restrict data access to authorised personnel only, and work exclusively with reputable third-party processors — including Google and HubSpot — that maintain ISO 27001 or SOC 2 certification.",
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <PageMeta
        page="privacyPolicy"
        webPage={{
          datePublished: "2023-10-01",
          dateModified: "2026-05-15",
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          license: "https://www.fintechpresshub.com/terms",
          usageInfo: "https://www.fintechpresshub.com/terms",
          copyrightNotice: "© 2026 FintechPressHub. All rights reserved.",
          about: ["Privacy Policy", "Data Protection", "GDPR", "CCPA", "Personal Data Rights"],
          keywords: [
            "privacy policy",
            "data protection",
            "GDPR rights",
            "CCPA",
            "FintechPressHub privacy",
            "personal data",
          ],
        }}
        faq={FAQ}
        faqDatePublished="2023-10-01"
        faqDateModified="2026-05-15"
        hreflang={[
          { lang: "en", href: "https://www.fintechpresshub.com/privacy-policy" },
          { lang: "x-default", href: "https://www.fintechpresshub.com/privacy-policy" },
        ]}
        speakableSelectors={["h1", ".geo-answer-block"]}
      />
      <LegalPageLayout
        title={<>Privacy Policy</>}
        description="How FintechPressHub collects, uses, and protects the personal data of visitors, prospects, and clients."
        lastUpdated="May 15, 2026"
        sections={SECTIONS}
        testIdPrefix="privacy"
      >
        <h2 id="introduction">1. Introduction</h2>
        <p className="geo-answer-block">
          FintechPressHub is a specialist fintech SEO and content marketing agency. This Privacy
          Policy explains what personal data we collect, why we collect it, how long we retain it,
          and the rights you hold under the UK GDPR, EU GDPR, and California Consumer Privacy Act
          (CCPA). It applies to all visitors, newsletter subscribers, prospects, and clients who
          interact with our website at fintechpresshub.com.
        </p>
        <p>
          We are the data controller for personal data collected through this website. If you are a
          client, your Master Services Agreement (MSA) or Statement of Work (SOW) may include
          additional data processing terms that supplement this policy.
        </p>
        <p>
          We keep this policy under regular review. The "Last updated" date at the top of this page
          reflects the most recent revision. We encourage you to read it alongside our{" "}
          <a href="/cookie-policy">Cookie Policy</a> and{" "}
          <a href="/terms">Terms and Conditions</a>.
        </p>

        <h2 id="data-we-collect">2. The Data We Collect About You</h2>
        <p>
          Personal data means any information about an individual from which that person can be
          identified. We collect and process the following categories:
        </p>
        <ul>
          <li>
            <strong>Identity Data</strong> — first name, last name, job title, and company name
            provided when you contact us or request a proposal.
          </li>
          <li>
            <strong>Contact Data</strong> — email address and telephone number submitted through
            our contact form, email, or event registration.
          </li>
          <li>
            <strong>Technical Data</strong> — IP address, browser type and version, time zone
            setting, operating system, and device type collected automatically when you visit the
            site.
          </li>
          <li>
            <strong>Usage Data</strong> — pages visited, time on site, referral source, click-path,
            and scroll depth collected by analytics tools to help us improve content and performance.
          </li>
          <li>
            <strong>Communications Data</strong> — the content of emails, enquiry form submissions,
            or other messages you send us, retained for reference and legal compliance.
          </li>
          <li>
            <strong>Marketing Preferences</strong> — whether you have opted in to receive our
            newsletter, industry analysis, or marketing communications, and any opt-out instructions
            you provide.
          </li>
        </ul>
        <p>
          We do not collect any special-category data (health data, biometric data, or data
          revealing racial or ethnic origin) through this website.
        </p>

        <h2 id="legal-basis">3. Legal Basis for Processing</h2>
        <p>
          Under the UK GDPR and EU GDPR, we must have a lawful basis to process your personal data.
          The bases we rely on are:
        </p>
        <ul>
          <li>
            <strong>Contract</strong> — where processing is necessary to perform an agreement with
            you or to take pre-contractual steps at your request (for example, preparing a proposal
            or onboarding you as a client).
          </li>
          <li>
            <strong>Legitimate Interests</strong> — where processing is necessary for our
            legitimate business interests, provided those interests are not overridden by your rights
            and interests. Examples include fraud prevention, network security, and direct marketing
            to existing contacts in a B2B context.
          </li>
          <li>
            <strong>Legal Obligation</strong> — where processing is required to comply with
            applicable law, such as retaining financial records under UK Companies Act requirements.
          </li>
          <li>
            <strong>Consent</strong> — where you have given explicit consent for a specific
            processing activity, such as subscribing to our newsletter or accepting analytics
            cookies. You may withdraw consent at any time by contacting{" "}
            <a href="mailto:privacy@fintechpresshub.com">privacy@fintechpresshub.com</a> or using
            the unsubscribe link in any marketing email.
          </li>
        </ul>

        <h2 id="how-we-use-data">4. How We Use Your Personal Data</h2>
        <p>We use your personal data for the following purposes:</p>
        <ul>
          <li>
            <strong>Service delivery</strong> — to provide the SEO, content, and digital PR
            services described in your signed SOW or MSA.
          </li>
          <li>
            <strong>Client communication</strong> — to respond to enquiries, send progress
            reports, and coordinate approvals during active engagements.
          </li>
          <li>
            <strong>Marketing</strong> — to send newsletters, industry reports, and service updates
            to contacts who have opted in or who are existing clients where legitimate interest
            applies. Every marketing communication includes an easy unsubscribe option.
          </li>
          <li>
            <strong>Analytics and improvement</strong> — to understand how visitors use our site,
            identify high-performing content, and improve user experience.
          </li>
          <li>
            <strong>Legal and financial compliance</strong> — to maintain invoicing records, comply
            with tax obligations, and respond to lawful requests from regulatory authorities.
          </li>
          <li>
            <strong>Security</strong> — to detect and prevent fraud, spam, and other malicious
            activity, and to protect the integrity of our systems and site.
          </li>
        </ul>

        <h2 id="data-retention">5. Data Retention</h2>
        <p>
          We retain personal data only for as long as necessary to fulfil the purposes for which it
          was collected or as required by law. Our standard retention periods are:
        </p>
        <ul>
          <li>
            <strong>Prospect and lead data</strong> — 24 months from last engagement. If no
            business relationship commences within this period, data is deleted unless you have
            opted in to ongoing marketing.
          </li>
          <li>
            <strong>Client records (contracts, SOWs, invoices)</strong> — 6 years from the end of
            the engagement, in line with the Limitation Act 1980 (UK) and equivalent international
            requirements.
          </li>
          <li>
            <strong>Website analytics data</strong> — 26 months, consistent with Google Analytics
            default retention settings, after which aggregated data may be retained indefinitely in
            anonymised form.
          </li>
          <li>
            <strong>Email marketing data</strong> — retained until you unsubscribe or withdraw
            consent, after which your email is suppressed (not deleted) to prevent re-subscription
            in error.
          </li>
          <li>
            <strong>Legal hold</strong> — in the event of litigation or a regulatory investigation,
            relevant data may be retained beyond standard periods until the matter is resolved.
          </li>
        </ul>

        <h2 id="international-transfers">6. International Data Transfers</h2>
        <p>
          FintechPressHub works with third-party service providers — including Google (Analytics,
          Workspace), HubSpot, and Cloudflare — that may process your data outside the UK or
          European Economic Area (EEA). Where such transfers occur, we ensure an appropriate
          safeguard is in place:
        </p>
        <ul>
          <li>
            <strong>Adequacy decisions</strong> — where the destination country has been found by
            the European Commission or the UK Information Commissioner's Office (ICO) to provide an
            adequate level of data protection (for example, transfers to the United States under the
            EU-US Data Privacy Framework).
          </li>
          <li>
            <strong>Standard Contractual Clauses (SCCs)</strong> — where no adequacy decision
            exists, we use the EU Commission-approved SCCs or the UK International Data Transfer
            Agreement (IDTA) to provide contractual protections equivalent to those in the EEA.
          </li>
        </ul>
        <p>
          You may request a copy of the specific safeguards in place for any transfer by emailing{" "}
          <a href="mailto:privacy@fintechpresshub.com">privacy@fintechpresshub.com</a>.
        </p>

        <h2 id="your-rights">7. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you have the following rights over your personal data.
          To exercise any right, email{" "}
          <a href="mailto:privacy@fintechpresshub.com">privacy@fintechpresshub.com</a>. We will
          respond within 30 days (UK/EU GDPR) or 45 days (CCPA).
        </p>
        <ul>
          <li>
            <strong>Right of access</strong> — request a copy of the personal data we hold about
            you.
          </li>
          <li>
            <strong>Right to rectification</strong> — ask us to correct inaccurate or incomplete
            data.
          </li>
          <li>
            <strong>Right to erasure ("right to be forgotten")</strong> — ask us to delete your
            data where there is no compelling reason to continue processing it.
          </li>
          <li>
            <strong>Right to restriction</strong> — ask us to suspend processing of your data in
            certain circumstances (for example, while you contest its accuracy).
          </li>
          <li>
            <strong>Right to data portability</strong> — receive your data in a structured,
            machine-readable format and transfer it to another controller.
          </li>
          <li>
            <strong>Right to object</strong> — object to processing based on legitimate interests
            or direct marketing. We will stop unless we can demonstrate compelling legitimate grounds
            that override your interests.
          </li>
          <li>
            <strong>Right to withdraw consent</strong> — where processing is based on consent,
            withdraw it at any time without affecting the lawfulness of prior processing.
          </li>
          <li>
            <strong>CCPA rights (California residents)</strong> — the right to know, the right to
            delete, the right to opt-out of sale (we do not sell data), and the right to
            non-discrimination.
          </li>
        </ul>
        <p>
          If you are dissatisfied with our response, you have the right to lodge a complaint with
          your supervisory authority — for example, the UK ICO (ico.org.uk) or your EU data
          protection authority.
        </p>

        <h2 id="data-security">8. Data Security</h2>
        <p>
          We implement industry-standard technical and organisational measures to protect your
          personal data from accidental loss, unauthorised access, alteration, or disclosure.
          These measures include:
        </p>
        <ul>
          <li>
            <strong>HTTPS encryption</strong> across the entire website, enforced via TLS 1.2+.
          </li>
          <li>
            <strong>Access controls</strong> — personal data is accessible only to authorised
            personnel with a documented business need, under the principle of least privilege.
          </li>
          <li>
            <strong>Vetted processors</strong> — we use only reputable third-party data processors
            (Google, HubSpot, Cloudflare) that maintain ISO 27001 or SOC 2 Type II certification
            and are bound by data processing agreements.
          </li>
          <li>
            <strong>Breach response</strong> — we maintain an internal data breach response
            procedure. Where a breach is likely to result in high risk to your rights and freedoms,
            we will notify you and the relevant supervisory authority within the timeframes required
            by applicable law (72 hours under UK/EU GDPR).
          </li>
        </ul>
        <p>
          No method of electronic transmission or storage is 100% secure. While we strive to use
          commercially acceptable means to protect your data, we cannot guarantee absolute security.
        </p>

        <h2 id="cookies">9. Cookies &amp; Related Technologies</h2>
        <p>
          We use cookies, web beacons, and similar tracking technologies on our website to analyse
          traffic, remember preferences, and measure the performance of our marketing campaigns. Our{" "}
          <a href="/cookie-policy">Cookie Policy</a> sets out in full which cookies we use, who sets
          them, how long they last, and how you can manage your preferences. By continuing to use
          our site without changing your browser settings, you consent to our use of cookies as
          described in that policy.
        </p>

        <h2 id="contact-us">10. Contact Us</h2>
        <p>
          For any questions about this Privacy Policy, to exercise your rights, or to report a
          data protection concern, please contact:
        </p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:privacy@fintechpresshub.com">privacy@fintechpresshub.com</a>
          </li>
          <li>
            <strong>Subject line:</strong> "Privacy enquiry — [your name]"
          </li>
        </ul>
        <p>
          We aim to respond to all privacy enquiries within 5 business days and to fulfil any
          subject access request within the statutory deadline. See also our{" "}
          <a href="/terms">Terms and Conditions</a> and{" "}
          <a href="/community-guidelines">Community Guidelines</a>.
        </p>
      </LegalPageLayout>
    </>
  );
}
