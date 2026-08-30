import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { supportEmail } from '@/lib/contact';

const policies = [
  {
    id: 'platform-terms',
    title: 'Platform Terms and Conditions',
    text: 'These terms govern use of Trade Tender as a construction tender-management platform. Trade Tender connects Clients and Retailers but is not the supplier, contractor, broker, guarantor, or party responsible for the final transaction.',
  },
  {
    id: 'client-terms',
    title: 'Client Terms of Use',
    text: 'Clients are responsible for accurate tender information, their quote decisions, and agreements made with Retailers after authorised contact release.',
  },
  {
    id: 'retailer-terms',
    title: 'Retailer Terms of Use',
    text: 'Retailers are responsible for the accuracy, availability, price, lead time, and terms of every quote submitted through the platform.',
  },
  {
    id: 'marketplace-disclaimer',
    title: 'Marketplace Disclaimer and Platform Role Statement',
    text: 'Trade Tender provides tender-management and connection tools. It does not endorse, guarantee, inspect, supply, contract for, or resolve disputes relating to Client-Retailer transactions.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    text: 'We use account, tender, quote, payment, and contact-release data only to operate, secure, audit, and improve the platform in accordance with applicable data-protection requirements.',
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    text: 'Essential cookies are used to provide secure sessions and reliable operation. Any optional analytics or marketing technologies require appropriate notice and consent before use.',
  },
  {
    id: 'quote-retention',
    title: 'Quote Retention Policy',
    text: 'Formal quotes are retained for 30 days. Accepted quotes, associated tender identifiers, payments, contact-release events, and audit records are retained for five years unless a valid legal hold or investigation requires longer retention.',
  },
  {
    id: 'payments',
    title: 'Payment and Refund Policy',
    text: 'Current fees are a £10 Retailer tender unlock fee and a £10 Client Accepted Quote Release Fee. Access and contact release depend on server-confirmed payment or an approved waiver; redirects alone do not confirm payment.',
  },
  {
    id: 'contact-release',
    title: 'Contact-Release Policy',
    text: 'Client and Retailer identities remain private until the Client accepts a quote and the required release condition is confirmed. Each release is authorised server-side and audited.',
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use Policy',
    text: 'Users must provide lawful, accurate information and must not misuse the platform, attempt unauthorised access, interfere with service operation, or use tender data outside the authorised workflow.',
  },
  {
    id: 'partners',
    title: 'Advertising and Partner Links Policy',
    text: 'Partner information and advertising are clearly labelled and are separate from tender matching, quote ranking, supplier selection, Client decisions, and payment outcomes.',
  },
  {
    id: 'support',
    title: 'Complaints and Support Policy',
    text: 'For account, access, payment, or platform support, contact the support team with the relevant tender, quote, or payment reference where applicable. Transaction and delivery disputes remain a matter for the Client and Retailer.',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Statement',
    text: 'Trade Tender aims to provide an accessible, keyboard-operable platform with clear labels, visible focus states, meaningful status feedback, and responsive layouts. Report accessibility barriers to support.',
  },
];

export default function PoliciesPage() {
  const support = supportEmail();
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 py-14 sm:px-10">
        <section className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Trade Tender</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foundation-navy sm:text-4xl">Policies and support</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-concrete-grey">Key platform documents, marketplace responsibilities, and support information.</p>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {policies.map((policy) => (
              <article key={policy.id} id={policy.id} className="scroll-mt-8 px-1 py-7 sm:px-4">
                <h2 className="font-heading text-xl font-bold text-foundation-navy">{policy.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-concrete-grey">{policy.text}</p>
                {policy.id === 'support' && support && <a href={`mailto:${support}`} className="mt-4 inline-block font-semibold text-steel-blue underline underline-offset-4 hover:text-foundation-navy">{support}</a>}
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}