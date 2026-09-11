import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

const policies = [
  {
    id: 'platform-terms',
    title: 'Platform Terms and Conditions',
    summary: 'These terms govern access to the Trade Tender platform, the roles and responsibilities of users, and the limits of the platform’s role in the wider construction transaction.',
    sections: [
      {
        heading: 'Purpose and scope',
        content: 'Trade Tender is a tender-management and connection platform. It does not act as the supplier, contractor, broker, guarantor, or responsible party for the final commercial arrangement between a Contractor and a Provider. These terms apply to any person who registers, uses, or accesses the platform, including Contractors, Providers, Super Users, and support contacts.',
      },
      {
        heading: 'User responsibilities',
        content: 'Users must provide accurate information, comply with the approved workflow, and use the platform only for bona fide tendering or quotation activity. Users must not misrepresent their business, impersonate another party, or attempt to bypass the authorised payment, contact-release, or access-control steps.',
      },
      {
        heading: 'Process and approvals',
        content: 'Access to tender information, quote detail, communication, payment, and contact release is subject to the rules built into the platform. Any action affecting a payment, release of contact details, non-standard waiver, or legal hold must be supported by authorised workflow logic and audit records. A decision is not confirmed solely by the presence of a link, browser redirect, or user confirmation message.',
      },
      {
        heading: 'Limitations and risk allocation',
        content: 'Trade Tender does not verify final project delivery, contractor performance, product quality, workmanship, insurance, payment collection, or dispute outcomes. Where a user chooses to proceed with a party outside the platform or outside the recorded release state, that decision remains the user’s responsibility. Trade Tender may suspend, restrict, or terminate access where there is a material breach, abuse, legal hold, or operational risk.',
      },
      {
        heading: 'Record keeping and review',
        content: 'Trade Tender maintains records of payments, releases, warnings, support requests, and platform controls to support internal review, dispute handling, operational risk management, and regulatory inquiries. Continued use of the platform indicates acceptance of these conditions and any materially updated version that is re-accepted by a user when required by the platform.',
      },
    ],
  },
  {
    id: 'contractor-terms',
    title: 'Contractor Terms of Use',
    summary: 'Contractors are responsible for the accuracy of tender information, the choice of quotes they compare, and the legal and commercial decisions they make once a quote is accepted.',
    sections: [
      {
        heading: 'Your obligations',
        content: 'Contractors must provide accurate tender requirements, project obligations, and timings where known. They must not provide misleading material, omit material requirements, or request sensitive information in a way that bypasses the approved payment and release controls.',
      },
      {
        heading: 'Quote comparison and decision-making',
        content: 'A Contractor may compare quotes, request clarifications, or reject quotes without prejudice to the platform’s rules. However, the Contractor remains responsible for the validity, suitability, and commercial terms of any accepted quote and for any resulting agreement or delivery arrangement with the Provider.',
      },
      {
        heading: 'Contact release process',
        content: 'A Contractor may release contact details only after the required payment and release conditions are met, and only for the relevant quote or tender workflow. The release is time-limited to the specific business event and is recorded in an audit log. The platform does not release contact details before the approved trigger condition is satisfied.',
      },
      {
        heading: 'Disputes and moderation',
        content: 'Contractors must raise disputes, complaints, or support issues with the relevant reference information so that the operation team can investigate. Where a dispute relates to payment, misuse, non-compliance, or contract conduct, the platform may verify the relevant records and apply restrictions or support interventions in line with the platform’s security and moderation controls.',
      },
    ],
  },
  {
    id: 'provider-terms',
    title: 'Provider Terms of Use',
    summary: 'Providers are responsible for the accuracy, availability, pricing, delivery terms, and commercial integrity of every quote and tender response submitted through the platform.',
    sections: [
      {
        heading: 'Quotes and submissions',
        content: 'Providers must submit honest, current, and commercially deliverable quotes. All submitted price, lead time, delivery, assumptions, and exclusions must be accurate at the time of submission. Providers must not use the platform to obtain information that they are not entitled to access or to contact a party outside the approved workflow.',
      },
      {
        heading: 'Tender unlock and access',
        content: 'A Provider may unlock a tender only if the relevant payment or waiver workflow is valid and the platform permits the action. Access to a tender is limited to the approved platform workflow and protected by server-side authorization.',
      },
      {
        heading: 'Verification and representation',
        content: 'Providers may be required to provide verification or compliance evidence depending on the service or business category. Verification status is an assessment aid only and does not guarantee performance, suitability, or legal compliance for a specific project.',
      },
      {
        heading: 'Commercial responsibility',
        content: 'Once a quote is submitted, a Provider remains responsible for the correctness of the quote and for fulfilling the terms it has offered to the Contractor if the quote is accepted. Trade Tender is not the contracting party and does not take responsibility for delivery, workmanship, payment, or dispute resolution between the parties.',
      },
    ],
  },
  {
    id: 'marketplace-disclaimer',
    title: 'Marketplace Disclaimer and Platform Role Statement',
    summary: 'Trade Tender is a connection and tender-management platform only. It is not a supplier, contractor, broker, guarantor, or party responsible for the final transaction or outcome.',
    sections: [
      {
        heading: 'Role of the platform',
        content: 'Trade Tender provides infrastructure for matching, tendering, quotation, payment, auditing, and operational communication. It does not procure, supply, inspect, supervise, guarantee, or otherwise take responsibility for the goods, works, or services delivered under a contract between a Contractor and a Provider.',
      },
      {
        heading: 'No endorsement',
        content: 'Listings, verification results, quote rankings, or partner content are not endorsements or guarantees of suitability, capability, quality, legality, or performance. Users remain responsible for independent checks and due diligence before entering into a contract or committing to work.',
      },
      {
        heading: 'Dispute handling',
        content: 'Any dispute relating to performance, quality, price, delivery, or fulfilment remains a matter between the Contractor and the Provider. Trade Tender may provide supporting records, access logs, and audit events where necessary, but it does not adjudicate final disputes or assume liability for them.',
      },
    ],
  },
  {
    id: 'verification-policy',
    title: 'Provider Verification Policy',
    summary: 'Verification is an evidence-based assessment aid. It does not certify performance, assure value for money, or replace a Contractor’s own due diligence.',
    sections: [
      {
        heading: 'What verification does and does not do',
        content: 'Verification reviews submitted evidence for service eligibility, legal entity information, document completeness, and service-specific requirements. Bronze, Silver, and Gold review outcomes describe the evidence reviewed and the review status; they are not guarantees of workmanship, legal compliance, insurance coverage, or final transaction outcomes.',
      },
      {
        heading: 'Evidence and review process',
        content: 'Providers submit evidence, which is checked against the declared category and service scope. Validation may include document checks, policy compliance checks, and service-eligibility review. Trade Tender may reject, request more information, or suspend a profile where evidence is incomplete, inconsistent, or materially misleading.',
      },
      {
        heading: 'User due diligence',
        content: 'Contractors and other clients must complete their own checks before committing to a provider or acting on any recommendation derived from a verification status. Verification status may be considered to inform decision-making, but it is not a substitute for formal credit, insurance, competence, or contract review.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    summary: 'This policy explains what data Trade Tender processes, why it is processed, how it is protected, and how users can request access, correction, or review.',
    sections: [
      {
        heading: 'Data we process',
        content: 'Trade Tender processes account data, profile information, tender and quote data, payment and audit records, contact-release records, support request content, and operational metadata needed to run the platform securely and lawfully.',
      },
      {
        heading: 'Purposes of processing',
        content: 'Data is processed to create and manage user accounts, match tenders to relevant Providers, support quote comparison and payment workflows, maintain audit records, enforce access and retention policies, provide support, and protect the platform from fraud or abuse.',
      },
      {
        heading: 'Protection and controls',
        content: 'The platform applies authorization checks, encryption for sensitive credentials where required, server-side enforcement for contact-release actions, retention rules, support-review procedures, and audit logging for material changes. Access to sensitive data is limited to the people or systems that need it to perform approved work.',
      },
      {
        heading: 'User rights and requests',
        content: 'Users may request access to their information, correction of inaccurate data, restriction of processing, or review of a decision affecting their account or a support issue. Requests are submitted through the Support requests workflow and are reviewed by the appropriate internal role, with Owner approval used where the request requires a legal, operational, or privacy decision.',
      },
      {
        heading: 'Third parties',
        content: 'Trade Tender may use approved service providers to process payments, send transactional emails, provide monitoring or error reporting, and support hosting, infrastructure, or operational services. These providers are subject to approved contractual and technical controls. The platform does not sell personal data or use advertising data for targeted marketing unless a separate, explicit consent process is introduced and approved.',
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    summary: 'Trade Tender uses only the cookies required to keep the platform secure and operational. No optional advertising or analytics tracking is active without explicit approval.',
    sections: [
      {
        heading: 'Essential cookies',
        content: 'The platform uses session, security, and technical cookies required for authentication, routing, and platform integrity. These cookies support secure access, session lifecycle management, and operational stability.',
      },
      {
        heading: 'Optional tracking',
        content: 'Optional analytics, advertising, personalisation, or cross-site tracking technologies are not active at present. Any future use of optional tracking will require a separate review, user consent mechanism, and an updated privacy and cookie notice before activation.',
      },
      {
        heading: 'User controls',
        content: 'Users can manage browser settings and session activity in line with their browser or device controls. Where the platform introduces a consent mechanism for optional cookies, consent will be recorded and renewed as required by policy and applicable law.',
      },
    ],
  },
  {
    id: 'quote-retention',
    title: 'Quote Retention Policy',
    summary: 'Formal quotes and payment-related records are retained for clearly defined periods so the platform can support comparison, dispute resolution, and audit obligations.',
    sections: [
      {
        heading: 'Normal retention periods',
        content: 'Formal quotes are retained for 30 days from submission unless a legal hold, dispute, or investigation requires a longer period. Accepted quotes, associated tender identifiers, payment records, contact-release events, and core audit records are retained for five years unless a different legal or regulatory requirement applies.',
      },
      {
        heading: 'Legal holds and investigations',
        content: 'Where there is an active legal hold, compliance issue, regulatory request, or formal dispute, retention may be extended until the hold is resolved or released. Retention exceptions are recorded with a reason, scope, and owner approval.',
      },
      {
        heading: 'Deletion and review process',
        content: 'The platform deletes or archives records only through approved retention logic. The system must not delete records that are needed for an active tender, accepted contract event, payment obligation, legal hold, or user dispute. Deletion is a controlled operational action and is logged.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payment and Refund Policy',
    summary: 'Payments are processed only through the approved platform workflow. A payment is not considered complete until the platform verifies the result and updates the relevant entitlement or release state.',
    sections: [
      {
        heading: 'Fees and VAT',
        content: 'The platform fee model is established by the approved business configuration and may vary by service, workflow, or platform setting. Any fee that applies to a particular workflow is stated at the point of checkout and must be confirmed by the platform before access is granted. VAT is applied in accordance with the prevailing rate and the payment record must show the fee, VAT amount, and total charged.',
      },
      {
        heading: 'Confirmation and access',
        content: 'A payment or waiver is only treated as confirmed when the platform verifies the server-side outcome and applies the entitlement update. Browser redirects, success pages, or a user confirmation message alone do not prove payment completion. Access to tender details or contact information depends on the confirmed state.',
      },
      {
        heading: 'Refunds, disputes, and reversals',
        content: 'Refunds, chargebacks, or disputed payments are reviewed under the approved payment reversal workflow. When a reversal is confirmed, access entitlements and contact-release access are revoked as required and the event is recorded in immutable audit records. A payment reversal may also trigger support review or additional owner approval.',
      },
    ],
  },
  {
    id: 'contact-release',
    title: 'Contact-Release Policy',
    summary: 'Contact details remain private until the required condition is met and the platform server verifies that the release is authorised and recorded.',
    sections: [
      {
        heading: 'Default privacy state',
        content: 'Contractor and Provider identities and contact details remain private until the allowed release condition is satisfied. The default position is no disclosure.',
      },
      {
        heading: 'Approved trigger conditions',
        content: 'A contact release may occur only after the relevant payment or waiver condition is verified and the associated quote or tender workflow is in the authorized state. Where the Owner activates direct contact requests, a Contractor Services or Professional Services Provider may pay the approved direct-contact fee to share only their own Provider contact details with the purchasing Client. This does not release the Client contact details to the Provider. The platform enforces every release server-side and prevents browser-controlled release attempts.',
      },
      {
        heading: 'Audit and revocation',
        content: 'Every contact-release event is logged together with the relevant tender, quote, and payment evidence. If a payment is reversed or an entitlement is later invalidated, the platform must revoke access and ensure contact details are no longer visible to the affected party.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use Policy',
    summary: 'This policy sets the standards for lawful, safe, and authorised use of the platform and prohibits abuse, bypass, misrepresentation, or interference with platform controls.',
    sections: [
      {
        heading: 'Lawful use',
        content: 'Users must use Trade Tender only for lawful tendering, quotation, business matching, and support activities. Users must not submit false, misleading, threatening, discriminatory, or fraudulent information or use the platform to facilitate unlawful activity.',
      },
      {
        heading: 'Operational integrity',
        content: 'Users must not attempt to bypass access controls, tamper with platform logic, scrape or export sensitive data outside the approved workflow, interfere with service operations, or misuse the platform to gain access to information to which they are not entitled.',
      },
      {
        heading: 'Investigation and enforcement',
        content: 'Trade Tender may investigate suspicious activity, impose restrictions, suspend accounts, or escalate issues to the appropriate owner, support, or legal process when a material breach is suspected. Decisions are supported by audit records and relevant evidence where available.',
      },
    ],
  },
  {
    id: 'partners',
    title: 'Affiliated Partner Links Policy',
    summary: 'Affiliated partner information is clearly labelled and must remain separate from tender matching, quote ranking, supplier selection, and Contractor decision-making.',
    sections: [
      {
        heading: 'Separation from core business operations',
        content: 'Affiliated partner links are managed separately from tender matching, quote comparison, ranking, and procurement decisions. Partner content must not influence who is selected, which quote is evaluated, or which decision a Contractor is allowed to make.',
      },
      {
        heading: 'Approval and governance',
        content: 'Partner entries, active status, destination URLs, and display position must be controlled by an authorised Super User or approved operational owner. Public and internal affiliated-partner records must be auditable, and links must be reviewed for accuracy and suitability.',
      },
      {
        heading: 'Labeling and disclosure',
        content: 'Partner content must be clearly identified as commercial or sponsored. It must not be presented as a recommendation or endorsement of a supplier, price, or tender outcome. If a user is unsure whether a listing is content or an operational recommendation, the platform must use clear labelling and support documentation to avoid confusion.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Complaints, Support, and Dispute Policy',
    summary: 'The platform provides a structured support and escalation process for access, account, payment, privacy, moderation, and operational issues.',
    sections: [
      {
        heading: 'How to contact support',
        content: 'Users should raise support requests with the appropriate context, including the relevant tender, quote, payment, or account reference where available. Requests are reviewed in the platform support workflow and triaged based on risk, urgency, and required approval levels.',
      },
      {
        heading: 'Escalation and review',
        content: 'Some requests require Owner review, especially where the issue involves privacy, account access, legal holds, payment reversal, or a material platform decision. Support teams are expected to not resolve or disclose sensitive data outside the permitted workflow.',
      },
      {
        heading: 'Disputes and claims',
        content: 'Disputes about the quality, performance, delivery, or legality of a transaction between a Contractor and a Provider remain between those parties unless the platform’s own controls or records are directly relevant. Trade Tender may provide evidence, audit records, and operational assistance but does not adjudicate the final commercial dispute.',
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility Statement',
    summary: 'Trade Tender aims to provide an accessible, understandable, and keyboard-operable platform that supports users with differing needs and assistive technologies.',
    sections: [
      {
        heading: 'Standards and principles',
        content: 'Trade Tender aims to align with WCAG 2.1 AA expectations for core user journeys, including forms, navigation, status feedback, focus states, labels, and responsive layouts. The platform must provide meaningful labels, visible focus, adequate colour contrast, and accessible page structure.',
      },
      {
        heading: 'Operational expectation',
        content: 'Accessibility is part of the product quality bar, not a post-launch afterthought. Teams must test keyboard interaction, focus order, status messaging, and responsive behaviour when making changes to forms, dashboards, navigation, and workflow state.',
      },
      {
        heading: 'Support and reporting',
        content: 'Where a user encounters a barrier, the support workflow should be used to report it. The platform must record the issue, triage it, and apply a fix where it materially affects access or the use of a required workflow.',
      },
    ],
  },
];

export async function generateStaticParams() {
  return policies.map((policy) => ({ slug: policy.id }));
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies.find((item) => item.id === slug);
  if (!policy) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 py-14 sm:px-10">
        <section className="mx-auto max-w-4xl">
          <Link href="/policies" className="inline-flex items-center text-sm font-semibold text-steel-blue underline underline-offset-4 hover:text-foundation-navy">
            ← Back to policy index
          </Link>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Trade Tender policy</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-foundation-navy sm:text-4xl">{policy.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-concrete-grey">{policy.summary}</p>
          </div>

          <div className="mt-8 space-y-5">
            {policy.sections.map((section) => (
              <section key={`${policy.id}-${section.heading}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
                <h2 className="font-heading text-lg font-bold text-foundation-navy">{section.heading}</h2>
                <p className="mt-3 text-sm leading-relaxed text-concrete-grey">{section.content}</p>
              </section>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
