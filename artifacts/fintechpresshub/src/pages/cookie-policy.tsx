import { useDocumentTitle } from "@/hooks/use-document-title";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "what-are-cookies",
    number: 1,
    title: "What Are Cookies",
    summary: "Small text files your browser stores so we can remember preferences, sign-ins, and how you use the site.",
  },
  {
    id: "cookies-we-use",
    number: 2,
    title: "Cookies We Use",
    summary: "Strictly necessary, functional, analytics, and marketing — grouped so you can decide what to allow.",
  },
  {
    id: "third-party-cookies",
    number: 3,
    title: "Third-Party Cookies",
    summary: "Tools like Google Analytics, HubSpot, and LinkedIn drop their own cookies under their own privacy policies.",
  },
  {
    id: "your-choices",
    number: 4,
    title: "Your Choices",
    summary: "Use our cookie banner, your browser settings, or industry opt-out tools to control what's stored.",
  },
  {
    id: "updates-contact",
    number: 5,
    title: "Updates & Contact",
    summary: "We'll update this page when our cookie use changes. Questions? Email privacy@fintechpresshub.com.",
  },
];

export default function CookiePolicy() {
  useDocumentTitle("Cookie Policy | FintechPressHub");

  return (
    <LegalPageLayout
      title={<>Cookie Policy</>}
      description="How and why FintechPressHub uses cookies and similar tracking technologies on our website."
      lastUpdated="April 24, 2026"
      sections={SECTIONS}
      testIdPrefix="cookies"
    >
      <h2 id="what-are-cookies">1. What Are Cookies</h2>
      <p>
        Cookies are small text files placed on your device by websites you visit. They're widely
        used to make sites work, or work more efficiently, and to provide information to the site
        owners. Some cookies are essential for our website to function, while others help us
        understand how visitors interact with our content so we can improve it.
      </p>
      <p>
        We also use related technologies — such as web beacons, pixels, and local storage — that
        function similarly to cookies. References to "cookies" in this policy include these related
        technologies.
      </p>

      <h2 id="cookies-we-use">2. Cookies We Use</h2>
      <p>We group the cookies on our site into four categories so you can choose what to allow:</p>
      <ul>
        <li>
          <strong>Strictly necessary cookies</strong> — Required for core site features such as
          page navigation, security, and remembering your cookie preferences. These cannot be
          turned off.
        </li>
        <li>
          <strong>Functional cookies</strong> — Remember choices you make (such as language or
          region) so we can deliver a more personalized experience.
        </li>
        <li>
          <strong>Analytics cookies</strong> — Help us understand how visitors use the site —
          which pages are popular, where users come from, and how they move between pages — so we
          can improve performance and content.
        </li>
        <li>
          <strong>Marketing cookies</strong> — Used by us and our partners to measure campaign
          performance and to show you relevant content on third-party platforms such as LinkedIn
          and Google.
        </li>
      </ul>

      <h2 id="third-party-cookies">3. Third-Party Cookies</h2>
      <p>
        Some cookies on our site are placed by trusted third parties that help us run analytics,
        marketing, and customer-relationship workflows. These vendors have their own privacy and
        cookie policies, which govern how they collect and use your data:
      </p>
      <ul>
        <li>
          <strong>Google Analytics</strong> — Aggregated traffic and audience analytics.
        </li>
        <li>
          <strong>HubSpot</strong> — Form submissions, marketing automation, and CRM tracking.
        </li>
        <li>
          <strong>LinkedIn Insight Tag</strong> — Conversion tracking and audience-building for
          paid campaigns.
        </li>
        <li>
          <strong>Meta Pixel</strong> — Conversion tracking for paid social campaigns where
          applicable.
        </li>
      </ul>
      <p>
        We do not control these third-party cookies and recommend reviewing the relevant vendor
        policies for full details.
      </p>

      <h2 id="your-choices">4. Your Choices</h2>
      <p>
        You can manage your preferences in several ways:
      </p>
      <ul>
        <li>
          Use the cookie banner shown on your first visit (and accessible at any time from the
          footer) to allow or reject non-essential cookies.
        </li>
        <li>
          Adjust your browser settings to block or delete cookies. Note that blocking strictly
          necessary cookies may break parts of the site.
        </li>
        <li>
          Use industry opt-out tools such as the{" "}
          <a
            href="https://optout.networkadvertising.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Network Advertising Initiative opt-out
          </a>{" "}
          or the{" "}
          <a
            href="https://www.youronlinechoices.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Your Online Choices
          </a>{" "}
          page (EU).
        </li>
      </ul>

      <h2 id="updates-contact">5. Updates &amp; Contact</h2>
      <p>
        We may update this Cookie Policy as our use of cookies evolves or as required by law. The
        "Last updated" date at the top of the page reflects the most recent version. For questions
        about our use of cookies or this policy, please email privacy@fintechpresshub.com.
      </p>
    </LegalPageLayout>
  );
}
