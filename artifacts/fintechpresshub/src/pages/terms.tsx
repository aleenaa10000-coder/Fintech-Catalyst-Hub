import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHero } from "@/components/PageHero";

export default function Terms() {
  useDocumentTitle("Terms of Service | FintechPressHub");

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="Legal"
        title={<>Terms of Service</>}
        description="The agreement that governs your use of FintechPressHub's website, services, and engagements."
      />
      <div className="container mx-auto px-4 max-w-3xl py-20">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">Last updated: October 1, 2023</p>
          
          <h2>1. Agreement to Terms</h2>
          <p>By accessing or using FintechPressHub's website and services, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.</p>
          
          <h2>2. Services Provided</h2>
          <p>FintechPressHub provides digital marketing, search engine optimization (SEO), content creation, and digital PR services specifically tailored for the financial technology industry. The specific deliverables, timelines, and costs will be outlined in a separate Statement of Work (SOW) or Master Services Agreement (MSA) for clients.</p>

          <h2>3. Client Responsibilities</h2>
          <p>To ensure successful delivery of services, clients agree to:</p>
          <ul>
            <li>Provide timely access to necessary platforms (CMS, Google Analytics, Search Console, etc.).</li>
            <li>Designate a primary point of contact for approvals and feedback.</li>
            <li>Provide accurate information regarding products, compliance requirements, and brand guidelines.</li>
          </ul>

          <h2>4. Intellectual Property</h2>
          <p>Upon full payment of applicable fees, FintechPressHub grants the client full rights to all content created specifically for them. FintechPressHub retains the right to use non-confidential campaign results as case studies unless a strict NDA is in place.</p>

          <h2>5. Limitation of Liability</h2>
          <p>FintechPressHub employs industry-standard best practices for SEO. However, due to the unpredictable nature of search engine algorithms, we do not guarantee specific rankings or traffic volumes. We are not liable for algorithm updates or actions taken by third-party platforms that negatively impact your website.</p>

          <h2>6. Governing Law</h2>
          <p>These terms and conditions are governed by and construed in accordance with the laws of the State of New York, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
        </div>
      </div>
    </div>
  );
}
