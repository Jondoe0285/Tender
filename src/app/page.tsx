import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LandingPartners } from '@/components/layout/LandingPartners';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const steps = [
  { title: 'Specify the job', body: 'Describe the requirement once: trade, quantity, location, and deadline. Suppliers see a comparable brief, not a phone call.' },
  { title: 'Compare formal quotes', body: 'Matched suppliers submit structured quotes. You compare price, lead time, and evidence in one place.' },
  { title: 'Award on the record', body: 'Accept a quote, pay the release fee, and exchange contact details. The decision is logged.' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">For buyers</p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight text-foundation-navy sm:text-5xl">
              Specify the job. Compare formal quotes. Award on the record.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-concrete-grey">
              Trade Tender is a workspace for construction buyers and suppliers. A Buyer raises a structured tender. A Supplier quotes against a clear specification. Contact details stay private until you accept.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/register" size="lg">Create an account</LinkButton>
              <LinkButton href="/demo" variant="secondary" size="lg">Request a demo</LinkButton>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <h2 className="font-heading text-2xl font-bold text-foundation-navy">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-concrete-grey">Three steps. No marketplace chat. No off-platform guessing about what was quoted.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Step {index + 1}</p>
                <h3 className="mt-3 font-heading text-lg font-bold text-foundation-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-concrete-grey">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-14 sm:px-10 md:grid-cols-2">
            <div id="buying">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Buyers</p>
                <h2 className="mt-3 font-heading text-xl font-bold text-foundation-navy">Raise a tender and compare quotes</h2>
                <p className="mt-3 text-sm leading-relaxed text-concrete-grey">
                  For contractors, site teams, and buyers who need materials, plant, waste, or professional services. One requirement in. Comparable trade prices back.
                </p>
                <Link href="/register?intent=buying" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                  Create a Buyer account
                </Link>
              </Card>
            </div>
            <div id="supplying">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Suppliers</p>
                <h2 className="mt-3 font-heading text-xl font-bold text-foundation-navy">Quote specified demand in your coverage</h2>
                <p className="mt-3 text-sm leading-relaxed text-concrete-grey">
                  For suppliers matched by trade and geography. See the brief, submit a formal quote, and wait for an auditable award — not a leaked phone number.
                </p>
                <Link href="/register?intent=supplying" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                  Create a Supplier account
                </Link>
              </Card>
            </div>
          </div>
        </section>

        <LandingPartners />
      </main>
      <SiteFooter />
    </div>
  );
}
