import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legal/documentVersions';

type PolicySummary = {
  id: string;
  title: string;
  summary: string;
  version?: string;
};

const policies: PolicySummary[] = [
  { id: 'platform-terms', title: 'Platform Terms and Conditions', summary: 'These terms govern access to the Trade Tender platform, the roles and responsibilities of users, and the limits of the platform’s role in the wider construction transaction.', version: CURRENT_TERMS_VERSION },
  { id: 'client-terms', title: 'Contractor Terms of Use', summary: 'Contractors are responsible for the accuracy of tender information, the choice of quotes they compare, and the legal and commercial decisions they make once a quote is accepted.' },
  { id: 'retailer-terms', title: 'Provider Terms of Use', summary: 'Providers are responsible for the accuracy, availability, pricing, delivery terms, and commercial integrity of every quote and tender response submitted through the platform.' },
  { id: 'marketplace-disclaimer', title: 'Marketplace Disclaimer and Platform Role Statement', summary: 'Trade Tender is a connection and tender-management platform only. It is not a supplier, contractor, broker, guarantor, or party responsible for the final transaction or outcome.' },
  { id: 'verification-policy', title: 'Provider Verification Policy', summary: 'Verification is an evidence-based assessment aid. It does not certify performance, assure value for money, or replace a Contractor’s own due diligence.' },
  { id: 'privacy', title: 'Privacy Policy', summary: 'This policy explains what data Trade Tender processes, why it is processed, how it is protected, and how users can request access, correction, or review.', version: CURRENT_PRIVACY_VERSION },
  { id: 'cookies', title: 'Cookie Policy', summary: 'Trade Tender uses only the cookies required to keep the platform secure and operational. No optional advertising or analytics tracking is active without explicit approval.' },
  { id: 'quote-retention', title: 'Quote Retention Policy', summary: 'Formal quotes and payment-related records are retained for clearly defined periods so the platform can support comparison, dispute resolution, and audit obligations.' },
  { id: 'payments', title: 'Payment and Refund Policy', summary: 'Payments are processed only through the approved platform workflow. A payment is not considered complete until the platform verifies the result and updates the relevant entitlement or release state.' },
  { id: 'contact-release', title: 'Contact-Release Policy', summary: 'Contact details remain private until the required condition is met and the platform server verifies that the release is authorised and recorded.' },
  { id: 'acceptable-use', title: 'Acceptable Use Policy', summary: 'This policy sets the standards for lawful, safe, and authorised use of the platform and prohibits abuse, bypass, misrepresentation, or interference with platform controls.' },
  { id: 'partners', title: 'Affiliated Partner Links Policy', summary: 'Affiliated partner information is clearly labelled and must remain separate from tender matching, quote ranking, supplier selection, and Contractor decision-making.' },
  { id: 'support', title: 'Complaints, Support, and Dispute Policy', summary: 'The platform provides a structured support and escalation process for access, account, payment, privacy, moderation, and operational issues.' },
  { id: 'accessibility', title: 'Accessibility Statement', summary: 'Trade Tender aims to provide an accessible, understandable, and keyboard-operable platform that supports users with differing needs and assistive technologies.' },
];

export default function PoliciesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 py-14 sm:px-10">
        <section className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Trade Tender policies</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-foundation-navy sm:text-4xl">Policy documents and operating rules</h1>
            <p className="mt-4 text-sm leading-relaxed text-concrete-grey">
              These policies explain how the platform operates, how user data is handled, how payments are processed, how contract release is controlled, and how reviews and disputes are managed.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {policies.map((policy) => (
              <article key={policy.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">
                  {policy.id === 'privacy' || policy.id === 'platform-terms' ? 'Required reading' : 'Operational policy'}
                </p>
                <h2 className="mt-3 font-heading text-xl font-bold text-foundation-navy">{policy.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-concrete-grey">{policy.summary}</p>
                {policy.version && <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-concrete-grey">Version {policy.version}</p>}
                <Link href={`/policies/${policy.id}`} className="mt-4 inline-flex text-sm font-semibold text-steel-blue underline underline-offset-4 hover:text-foundation-navy">
                  Read policy
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
