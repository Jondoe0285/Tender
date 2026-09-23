import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';

const controls = [
  { title: 'Staged anonymity', body: 'Buyers and suppliers do not exchange names, numbers, or emails until a quote is accepted and the release fee is confirmed. Direct contact and professional interest stay off unless the buyer opts in on that tender.' },
  { title: 'Privileged MFA and session control', body: 'Owner and Super User sessions require TOTP. Session versioning invalidates stolen cookies after a password or privilege change.' },
  { title: 'Trusted client IP in production', body: 'Rate limits use a configured edge header, not spoofable X-Forwarded-For. Production rejects unknown forwarded chains.' },
  { title: 'Payments on the record', body: 'Unlock and release charges go through Stripe checkout and a signed webhook ledger. Contact is not released on a browser confirmation alone.' },
  { title: 'Need-to-know operations', body: 'Accountants cannot reach account management. Super User file access follows authorised tender workflows. Harvest caps stop unlock-without-quote scraping.' },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Public security</p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight text-foundation-navy">Confidential until award. Payments on the record.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-concrete-grey">
              Trade Tender is a connection platform for UK construction buying and supplying. Contact stays private until a Buyer accepts a formal quote. We are not the contracting party.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/demo" size="lg">Request a demo</LinkButton>
              <LinkButton href="/policies" variant="secondary" size="lg">Read policies</LinkButton>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <div className="grid gap-4 md:grid-cols-2">
            {controls.map((control) => (
              <Card key={control.title}>
                <h2 className="font-heading text-lg font-bold text-foundation-navy">{control.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-concrete-grey">{control.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
