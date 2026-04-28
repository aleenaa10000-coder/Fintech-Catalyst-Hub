import { PageMeta } from "@/components/PageMeta";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    number: 1,
    title: "Purpose & Scope",
    summary: "These guidelines apply to every contributor, commenter, and community participant on FintechPressHub.",
  },
  {
    id: "professional-conduct",
    number: 2,
    title: "Professional Conduct",
    summary: "Treat every participant with respect. Harassment, personal attacks, and discriminatory language are never tolerated.",
  },
  {
    id: "content-standards",
    number: 3,
    title: "Content Standards",
    summary: "All contributions must be accurate, original, properly sourced, and free from undisclosed conflicts of interest.",
  },
  {
    id: "prohibited-content",
    number: 4,
    title: "Prohibited Content",
    summary: "Spam, misleading financial claims, plagiarism, undisclosed AI-generated text, and promotional-only posts are all banned.",
  },
  {
    id: "intellectual-property",
    number: 5,
    title: "Intellectual Property",
    summary: "Only share content you own or have explicit rights to. Always credit the original source when quoting or adapting third-party material.",
  },
  {
    id: "enforcement",
    number: 6,
    title: "Enforcement & Appeals",
    summary: "Violations result in content removal, warnings, or account suspension depending on severity. You can appeal any moderation decision by email.",
  },
  {
    id: "updates-contact",
    number: 7,
    title: "Updates & Contact",
    summary: "We review these guidelines periodically. Questions or reports go to community@fintechpresshub.com.",
  },
];

const FAQ = [
  {
    question: "Can I include links to my own fintech product in a guest post?",
    answer:
      "Contextual links to your own product or service are allowed in guest posts only when directly relevant to the article topic and disclosed in your contributor bio. Promotional-only posts or posts that exist solely to link-build are removed.",
  },
  {
    question: "What happens if my content is flagged for review?",
    answer:
      "Our editorial team will contact you via the email address used to submit the piece. You will receive a specific reason and, where possible, an opportunity to revise before a final decision is made.",
  },
  {
    question: "Can I use AI writing tools when contributing content?",
    answer:
      "AI-assisted drafting is allowed, but every piece must be substantially written, reviewed, and fact-checked by the named human author. Fully AI-generated articles submitted without meaningful human editorial oversight will be rejected. Disclose any AI tool use in your pitch.",
  },
  {
    question: "How do I report a community guidelines violation?",
    answer:
      "Email community@fintechpresshub.com with the URL of the content in question and a brief description of the issue. We aim to respond within two business days.",
  },
];

export default function CommunityGuidelines() {
  return (
    <>
      <PageMeta
        page="communityGuidelines"
        webPage={{ datePublished: "2026-04-28", dateModified: "2026-04-28" }}
        faq={FAQ}
      />
      <LegalPageLayout
        title={<>Community Guidelines</>}
        description="Standards of conduct, content quality, and intellectual property expectations for everyone who contributes to or engages with FintechPressHub."
        lastUpdated="April 28, 2026"
        sections={SECTIONS}
        testIdPrefix="community-guidelines"
      >
        <h2 id="purpose">1. Purpose &amp; Scope</h2>
        <p>
          FintechPressHub is a specialist fintech content platform read by operators,
          investors, compliance professionals, and fintech founders. Because the topics
          we cover — payments infrastructure, lending regulation, digital assets,
          embedded finance — carry real-world financial and legal weight, the quality
          and integrity of every contribution matters.
        </p>
        <p>
          These Community Guidelines apply to guest contributors, newsletter subscribers
          who engage with our content, participants in events or webinars we host, and
          anyone who interacts with FintechPressHub through any channel. By contributing
          or engaging, you agree to follow these standards. They sit alongside our{" "}
          <a href="/terms">Terms and Conditions</a>,{" "}
          <a href="/privacy-policy">Privacy Policy</a>, and{" "}
          <a href="/editorial-guidelines">Editorial Guidelines</a> — all of which remain
          in full effect.
        </p>

        <h2 id="professional-conduct">2. Professional Conduct</h2>
        <p>
          The fintech industry is small and interconnected. We expect every participant
          to communicate with the professionalism they would bring to a senior industry
          forum or a client meeting.
        </p>
        <ul>
          <li>
            <strong>Respect disagreement.</strong> Critique ideas, methodologies, and
            data — not people. Technical debate is welcome; personal attacks, insults,
            and ad hominem responses are not.
          </li>
          <li>
            <strong>No harassment.</strong> Targeted harassment, intimidation, or
            sustained negative attention directed at any individual will result in
            immediate removal.
          </li>
          <li>
            <strong>No discrimination.</strong> Comments or content that demeans people
            on the basis of race, ethnicity, gender, sexuality, disability, religion, or
            any other protected characteristic are prohibited.
          </li>
          <li>
            <strong>Constructive tone.</strong> If you disagree with a published piece,
            engage with the argument. Provide counter-evidence, alternative data points,
            or a rebuttal — not dismissal.
          </li>
          <li>
            <strong>Disclose conflicts of interest.</strong> If you hold a financial
            position in a company you write about, or if you are employed by or a
            consultant to a company whose competitor you critique, say so. Readers
            deserve the full picture.
          </li>
        </ul>

        <h2 id="content-standards">3. Content Standards</h2>
        <p>
          We publish fintech content that practitioners rely on. That means accuracy is
          non-negotiable. All contributions — guest posts, op-eds, data analyses, or
          interview responses — must meet the following standards:
        </p>
        <ul>
          <li>
            <strong>Factual accuracy.</strong> Every claim must be verifiable. Link to
            primary sources — regulatory filings, peer-reviewed research, official
            company disclosures, or reputable industry reports — rather than secondary
            coverage.
          </li>
          <li>
            <strong>Originality.</strong> Submitted content must be original to
            FintechPressHub and not published elsewhere (including your own blog or
            LinkedIn newsletter) without prior agreement.
          </li>
          <li>
            <strong>Timeliness.</strong> Regulatory and market data changes quickly.
            Ensure statistics and regulatory references are current. If citing older
            data, state the date prominently.
          </li>
          <li>
            <strong>Balanced perspective.</strong> Opinion pieces may take a clear
            position, but must represent opposing views fairly before rebutting them.
            One-sided advocacy without engagement with counter-arguments does not meet
            our editorial threshold.
          </li>
          <li>
            <strong>No financial advice.</strong> Content must not constitute individual
            investment or financial advice under any applicable regulatory framework.
            Include appropriate disclaimers where content addresses regulated
            instruments, products, or strategies.
          </li>
        </ul>

        <h2 id="prohibited-content">4. Prohibited Content</h2>
        <p>The following will be removed without notice and may result in permanent exclusion:</p>
        <ul>
          <li>
            <strong>Spam and unsolicited promotion.</strong> Posts whose primary purpose
            is to drive traffic, leads, or backlinks to a commercial product or service
            without delivering substantive editorial value.
          </li>
          <li>
            <strong>Misleading or false financial claims.</strong> Any content that
            makes unsubstantiated performance claims, exaggerates returns, or
            misrepresents regulatory status of products or entities.
          </li>
          <li>
            <strong>Plagiarism.</strong> Copying, paraphrasing, or substantially
            reproducing third-party content without proper attribution and rights.
          </li>
          <li>
            <strong>Undisclosed AI-generated content.</strong> Submitting fully
            AI-generated text without meaningful human authorship, review, and
            fact-checking — and without disclosing AI tool use to the editorial team.
          </li>
          <li>
            <strong>Defamation.</strong> Publishing false statements of fact about
            identifiable individuals or companies.
          </li>
          <li>
            <strong>Illegal content.</strong> Any content that violates applicable law,
            including but not limited to insider trading disclosures, market
            manipulation, or content that facilitates financial fraud.
          </li>
        </ul>

        <h2 id="intellectual-property">5. Intellectual Property</h2>
        <p>
          By submitting content to FintechPressHub, you represent that you own or have
          the rights to all content you submit and that it does not infringe any
          third-party intellectual property rights.
        </p>
        <ul>
          <li>
            <strong>Your content.</strong> You retain ownership of your contributed
            work. By submitting, you grant FintechPressHub a non-exclusive,
            royalty-free licence to publish, distribute, and promote your content
            across our channels for as long as it remains published.
          </li>
          <li>
            <strong>Third-party material.</strong> If you quote, adapt, or reproduce
            third-party material, provide the original source and confirm you have
            permission to use it. Fair use quotation with full attribution is acceptable;
            substantial reproduction without permission is not.
          </li>
          <li>
            <strong>Images and media.</strong> Only submit images you own or have
            licensed. Include the licence or source for every image. We cannot publish
            watermarked or rights-managed images without documented authorisation.
          </li>
          <li>
            <strong>Data and charts.</strong> When reproducing data visualisations,
            tables, or charts produced by third parties, cite the originating dataset
            and publication and confirm the reproduction is permitted under the
            applicable data licence.
          </li>
        </ul>

        <h2 id="enforcement">6. Enforcement &amp; Appeals</h2>
        <p>
          Our editorial and moderation team reviews flagged content and reported
          behaviour. We apply graduated responses based on severity and intent:
        </p>
        <ul>
          <li>
            <strong>Content removal.</strong> Content that violates these guidelines
            will be unpublished. The contributor receives an email explanation.
          </li>
          <li>
            <strong>Warning.</strong> A first violation that appears unintentional or
            minor results in a written warning and an opportunity to revise.
          </li>
          <li>
            <strong>Suspension.</strong> Repeated or serious violations — including
            harassment, plagiarism, or deliberate deception — result in suspension of
            contributor access.
          </li>
          <li>
            <strong>Permanent exclusion.</strong> Violations involving illegal activity,
            targeted harassment, or systematic deception result in permanent removal
            with no right of appeal.
          </li>
        </ul>
        <p>
          <strong>Appeals.</strong> You may appeal any content-removal or suspension
          decision by emailing community@fintechpresshub.com within 14 days of the
          notification. Include the URL of the content and your reason for appeal. We
          will respond within five business days. Permanent-exclusion decisions are
          final.
        </p>
        <p>
          <strong>Reporting.</strong> To report content or behaviour that violates these
          guidelines, email community@fintechpresshub.com with the URL and a brief
          description. Reports are handled confidentially.
        </p>

        <h2 id="updates-contact">7. Updates &amp; Contact</h2>
        <p>
          We review these guidelines at least annually and whenever a significant
          platform change warrants an update. The "Last updated" date at the top of this
          page reflects the most recent revision. Continued participation after any
          update constitutes acceptance of the revised guidelines.
        </p>
        <p>
          For questions, moderation queries, or to report a violation, contact us at{" "}
          <a href="mailto:community@fintechpresshub.com">
            community@fintechpresshub.com
          </a>
          . For editorial feedback on published content, use the{" "}
          <a href="/contact">contact form</a>.
        </p>
      </LegalPageLayout>
    </>
  );
}
