import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";

const SECTIONS: LegalSection[] = [
  {
    id: "what-are-cookies",
    number: 1,
    title: "What Are Cookies",
    summary: "Small text files your browser stores so we can remember preferences and understand how you use the site.",
  },
  {
    id: "cookies-we-use",
    number: 2,
    title: "Cookies We Use",
    summary: "Strictly necessary, functional, analytics, and marketing cookies — with durations and purposes explained.",
  },
  {
    id: "third-party-cookies",
    number: 3,
    title: "Third-Party Cookies",
    summary: "Tools like Google Analytics, HubSpot, LinkedIn, and Meta drop their own cookies under their privacy policies.",
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
    summary: "We update this page when our cookie use changes. Questions? Email privacy@fintechpresshub.com.",
  },
];

const FAQ = [
  {
    question: "What cookies does FintechPressHub use?",
    answer:
      "FintechPressHub uses four categories of cookies: strictly necessary (core site function), functional (preferences and personalisation), analytics (Google Analytics for traffic measurement), and marketing (LinkedIn Insight Tag and Meta Pixel for campaign attribution).",
  },
  {
    question: "Can I opt out of cookies on FintechPressHub?",
    answer:
      "Yes. Use the cookie preferences banner on your first visit, accessible at any time from the footer. You can also adjust your browser settings or use industry opt-out tools such as the Network Advertising Initiative opt-out page or Your Online Choices (EU).",
  },
  {
    question: "Does FintechPressHub use third-party cookies?",
    answer:
      "Yes. Third-party cookies are placed by Google Analytics (traffic analytics), HubSpot (form and CRM tracking), LinkedIn Insight Tag (campaign conversion tracking), and Meta Pixel (paid social attribution), each under their respective privacy policies.",
  },
  {
    question: "What is the difference between strictly necessary and functional cookies?",
    answer:
      "Strictly necessary cookies enable core features such as page navigation, security, and cookie preference storage — they cannot be turned off. Functional cookies remember your choices such as language or region to personalise your experience, and can be declined.",
  },
  {
    question: "How often does FintechPressHub update its Cookie Policy?",
    answer:
      "FintechPressHub reviews and updates the Cookie Policy whenever cookie usage changes or when required by law. The Last Updated date at the top of the page reflects the most recent revision.",
  },
];

export default function CookiePolicy() {
  return (
    <>
      <PageMeta
        page="cookiePolicy"
        webPage={{
          datePublished: "2023-10-01",
          dateModified: "2026-05-15",
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          accessibilityHazard: "none",
          license: "https://www.fintechpresshub.com/terms",
          usageInfo: "https://www.fintechpresshub.com/terms",
          copyrightNotice: "© 2026 FintechPressHub. All rights reserved.",
          about: [
            "Cookie Policy",
            "Web Cookies",
            "Analytics Cookies",
            "Marketing Cookies",
            "GDPR Cookie Consent",
          ],
          keywords: [
            "cookie policy",
            "FintechPressHub cookies",
            "analytics cookies",
            "marketing cookies",
            "cookie consent",
            "GDPR cookies",
          ],
        }}
        faq={FAQ}
        faqDatePublished="2023-10-01"
        faqDateModified="2026-05-15"
        hreflang={[
          { lang: "en", href: "https://www.fintechpresshub.com/cookie-policy" },
          { lang: "x-default", href: "https://www.fintechpresshub.com/cookie-policy" },
        ]}
        speakableSelectors={["h1", ".geo-answer-block"]}
      />
      <LegalPageLayout
        title={<>Cookie Policy</>}
        description="How and why FintechPressHub uses cookies and similar tracking technologies on our website."
        lastUpdated="May 15, 2026"
        sections={SECTIONS}
        testIdPrefix="cookies"
      >
        <h2 id="what-are-cookies">1. What Are Cookies</h2>
        <p className="geo-answer-block">
          FintechPressHub uses cookies — small text files placed on your device by our website —
          to enable core site features, remember your preferences, measure traffic, and attribute
          marketing conversions. We use four categories of cookies: strictly necessary, functional,
          analytics, and marketing. You can manage your preferences at any time using our cookie
          banner in the site footer.
        </p>
        <p>
          We also use related technologies — including web beacons, pixels, and local storage —
          that function similarly to cookies. References to "cookies" in this policy include these
          related technologies unless stated otherwise.
        </p>
        <p>
          This policy should be read alongside our{" "}
          <a href="/privacy-policy">Privacy Policy</a>, which explains how personal data
          collected via cookies is processed, retained, and protected.
        </p>

        <h2 id="cookies-we-use">2. Cookies We Use</h2>
        <p>
          We group the cookies on our site into four categories. The table below details each
          category, the purpose served, and the typical retention duration:
        </p>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
          >
            <thead>
              <tr style={{ background: "var(--color-surface-raised, #f3f4f6)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Category</th>
                <th style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Purpose</th>
                <th style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Can be declined?</th>
                <th style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Typical duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  <strong>Strictly necessary</strong>
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  Core site navigation, security, and cookie preference storage
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>No</td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Session – 12 months</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  <strong>Functional</strong>
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  Language preference, region selection, personalised layout
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Yes</td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Up to 12 months</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  <strong>Analytics</strong>
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  Traffic measurement, page performance, user-journey analysis (Google Analytics)
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Yes</td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Up to 26 months</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  <strong>Marketing</strong>
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  Campaign conversion tracking, audience building (LinkedIn Insight Tag, Meta Pixel)
                </td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Yes</td>
                <td style={{ padding: "10px 12px", border: "1px solid var(--color-border, #e5e7eb)" }}>Up to 90 days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: "1rem" }}>
          <strong>Strictly necessary cookies</strong> are essential for the website to function.
          They enable page navigation, protect against cross-site request forgery (CSRF), and store
          your cookie consent decision. Because they are essential, they are always active and
          cannot be turned off from the cookie banner.
        </p>
        <p>
          <strong>Functional cookies</strong> remember choices you make — such as language or
          region — to deliver a more personalised experience on return visits.
        </p>
        <p>
          <strong>Analytics cookies</strong> help us understand how visitors use the site —
          which pages attract the most engagement, where traffic originates, and how visitors move
          between pages — so we can improve content and site performance over time.
        </p>
        <p>
          <strong>Marketing cookies</strong> are used by us and our advertising partners to
          measure the performance of paid campaigns and to enable remarketing on platforms including
          LinkedIn and Meta. These cookies do not store identifiable personal data in isolation but
          may be combined with other data held by the platform operator.
        </p>

        <h2 id="third-party-cookies">3. Third-Party Cookies</h2>
        <p>
          Some cookies on our site are placed by trusted third parties that help us run analytics,
          marketing, and customer-relationship workflows. These vendors have their own privacy and
          cookie policies which govern how they collect and use your data:
        </p>
        <ul>
          <li>
            <strong>Google Analytics (Google LLC)</strong> — Aggregated traffic and audience
            analytics. Duration: up to 26 months.{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Privacy Policy
            </a>
          </li>
          <li>
            <strong>HubSpot, Inc.</strong> — Form submission tracking, marketing automation, and
            CRM contact management. Duration: up to 13 months.{" "}
            <a
              href="https://legal.hubspot.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              HubSpot Privacy Policy
            </a>
          </li>
          <li>
            <strong>LinkedIn Insight Tag (LinkedIn Ireland Unlimited Company)</strong> — Conversion
            tracking and audience-building for paid LinkedIn campaigns. Duration: up to 90 days.{" "}
            <a
              href="https://www.linkedin.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn Privacy Policy
            </a>
          </li>
          <li>
            <strong>Meta Pixel (Meta Platforms Ireland Ltd)</strong> — Conversion tracking for
            paid social advertising where applicable. Duration: up to 90 days.{" "}
            <a
              href="https://www.facebook.com/privacy/explanation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta Privacy Policy
            </a>
          </li>
        </ul>
        <p>
          We do not control these third-party cookies. We recommend reviewing each vendor's privacy
          policy for full details on how they handle your data.
        </p>

        <h2 id="your-choices">4. Your Choices</h2>
        <p>You can manage your cookie preferences in several ways:</p>
        <p>
          <CookiePreferencesButton
            className="underline underline-offset-2 font-medium"
            data-testid="link-cookie-policy-manage-cookies"
          >
            Open the cookie preferences banner
          </CookiePreferencesButton>
        </p>
        <ul>
          <li>
            <strong>Cookie banner</strong> — use the preferences panel shown on your first visit
            (and accessible at any time from the site footer) to allow or reject non-essential
            cookie categories individually.
          </li>
          <li>
            <strong>Browser settings</strong> — most browsers allow you to block or delete cookies
            through their settings (typically under Privacy &amp; Security). Note that blocking
            strictly necessary cookies may break parts of the site, including page navigation and
            form functionality.
          </li>
          <li>
            <strong>Industry opt-out tools</strong> — use the{" "}
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
            page (EU) to opt out of interest-based advertising from participating vendors.
          </li>
          <li>
            <strong>Google Analytics opt-out</strong> — install the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>{" "}
            to prevent your data from being used for analytics across all sites using Google
            Analytics.
          </li>
        </ul>
        <p>
          Withdrawing consent for non-essential cookies does not affect any consent given prior to
          withdrawal, and it does not affect the lawfulness of any processing carried out before
          you withdrew consent.
        </p>

        <h2 id="updates-contact">5. Updates &amp; Contact</h2>
        <p>
          We may update this Cookie Policy as our use of cookies evolves, when we add or remove
          third-party tools, or as required by applicable law. The "Last updated" date at the top of
          the page always reflects the most recent version. We encourage you to review this policy
          periodically to stay informed about how we use cookies.
        </p>
        <p>
          For questions about our use of cookies or this policy, please email{" "}
          <a href="mailto:privacy@fintechpresshub.com">privacy@fintechpresshub.com</a>. For general
          privacy enquiries, see our <a href="/privacy-policy">Privacy Policy</a>.
        </p>
      </LegalPageLayout>
    </>
  );
}
