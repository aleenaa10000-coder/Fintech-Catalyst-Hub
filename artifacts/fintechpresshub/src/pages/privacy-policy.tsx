import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    summary: "We respect your privacy and explain in plain terms what we do with your data.",
  },
  {
    id: "data-we-collect",
    number: 2,
    title: "Data We Collect",
    summary: "Just the basics: your name, contact info, technical details (IP, browser), and how you use our site.",
  },
  {
    id: "how-we-use-data",
    number: 3,
    title: "How We Use Your Data",
    summary: "Only when allowed by law — to deliver our contract with you, run our business, or meet legal duties.",
  },
  {
    id: "data-security",
    number: 4,
    title: "Data Security",
    summary: "We use industry-standard safeguards and limit access to people who actually need it.",
  },
  {
    id: "contact-us",
    number: 5,
    title: "Contact Us",
    summary: "Questions? Email privacy@fintechpresshub.com and we'll get back to you.",
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <PageMeta page="privacyPolicy" />
      <LegalPageLayout
      title={<>Privacy Policy</>}
      description="How FintechPressHub collects, uses, and protects the personal data of visitors, prospects, and clients."
      lastUpdated="April 28, 2026"
      sections={SECTIONS}
      testIdPrefix="privacy"
    >
      <h2 id="introduction">1. Introduction</h2>
      <p>
        FintechPressHub ("we", "our", or "us") respects your privacy and is committed to protecting
        your personal data. This privacy policy will inform you as to how we look after your
        personal data when you visit our website (regardless of where you visit it from) and tell
        you about your privacy rights and how the law protects you.
      </p>

      <h2 id="data-we-collect">2. The Data We Collect About You</h2>
      <p>
        Personal data, or personal information, means any information about an individual from
        which that person can be identified. We may collect, use, store and transfer different
        kinds of personal data about you which we have grouped together as follows:
      </p>
      <ul>
        <li>
          <strong>Identity Data</strong> includes first name, last name, username or similar
          identifier.
        </li>
        <li>
          <strong>Contact Data</strong> includes email address and telephone numbers.
        </li>
        <li>
          <strong>Technical Data</strong> includes internet protocol (IP) address, your login data,
          browser type and version, time zone setting and location.
        </li>
        <li>
          <strong>Usage Data</strong> includes information about how you use our website, products
          and services.
        </li>
      </ul>

      <h2 id="how-we-use-data">3. How We Use Your Personal Data</h2>
      <p>
        We will only use your personal data when the law allows us to. Most commonly, we will use
        your personal data in the following circumstances:
      </p>
      <ul>
        <li>
          Where we need to perform the contract we are about to enter into or have entered into
          with you.
        </li>
        <li>
          Where it is necessary for our legitimate interests (or those of a third party) and your
          interests and fundamental rights do not override those interests.
        </li>
        <li>Where we need to comply with a legal obligation.</li>
      </ul>

      <h2 id="data-security">4. Data Security</h2>
      <p>
        We have put in place appropriate security measures to prevent your personal data from being
        accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In
        addition, we limit access to your personal data to those employees, agents, contractors and
        other third parties who have a business need to know.
      </p>

      <h2 id="contact-us">5. Contact Us</h2>
      <p>
        If you have any questions about this privacy policy or our privacy practices, please
        contact us at privacy@fintechpresshub.com.
      </p>
      </LegalPageLayout>
    </>
  );
}
