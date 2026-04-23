import { useDocumentTitle } from "@/hooks/use-document-title";

export default function RefundPolicy() {
  useDocumentTitle("Refund Policy | FintechPressHub");

  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>
          
          <h2>1. General Policy</h2>
          <p>At FintechPressHub, we pride ourselves on delivering high-quality SEO and content services. Due to the nature of digital marketing and the upfront labor required (research, auditing, outreach, and writing), our standard policy is that we do not offer refunds for work that has already been completed or hours that have been logged.</p>
          
          <h2>2. Monthly Retainers</h2>
          <p>For clients on monthly retainers, you may cancel your services according to the notice period specified in your Master Services Agreement (typically 30 days). Once a billing cycle has started and work has commenced for that month, the retainer fee for that month is non-refundable.</p>

          <h2>3. Content Revisions</h2>
          <p>Instead of refunds on content, we operate on a revision model. If a piece of content does not meet the guidelines established in the initial brief, we provide up to two (2) rounds of revisions to ensure it meets your standards, provided the feedback is within the scope of the original brief.</p>

          <h2>4. Link Building Placements</h2>
          <p>If a secured link is removed within 180 days of placement through no fault of the client (e.g., the publisher deletes the post), FintechPressHub will secure a replacement link of equal or greater Domain Rating at no additional cost. We do not offer cash refunds for removed links.</p>

          <h2>5. Exceptions</h2>
          <p>Refunds may be considered on a case-by-case basis under the following extreme circumstances:</p>
          <ul>
            <li>Duplicate billing errors on our end.</li>
            <li>Failure to commence any work within 14 days of an upfront payment without communication or agreement from the client.</li>
          </ul>

          <p>To discuss billing or request an exception, please contact billing@fintechpresshub.com.</p>
        </div>
      </div>
    </div>
  );
}
