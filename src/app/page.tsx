import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LandingPartners } from '@/components/layout/LandingPartners';
import { LinkButton } from '@/components/ui/Button';

const steps = [
  { title: 'Specify', body: 'Trade, quantity, location, and deadline in one issued package. Suppliers see a comparable brief, not a phone call.' },
  { title: 'Compare', body: 'Matched suppliers submit structured quotes. You compare unit rates, lead time, and evidence in one table.' },
  { title: 'Award', body: 'Accept a quote against the frozen revision. Contact release follows the award on the record.' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">UK construction procurement</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foundation-navy sm:text-4xl">
                Specify the job. Compare formal quotes. Award on the record.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-concrete-grey">
                A workspace for buyers and suppliers. Raise a structured tender. Quote against a frozen specification. Contact stays private until you award.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/register">Create an account</LinkButton>
                <LinkButton href="/demo" variant="secondary">Request a demo</LinkButton>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Anonymous until award', 'Identity is withheld until contact release.'],
                ['Specified packages', 'Item, quantity, unit, and classed documents.'],
                ['Comparable quotes', 'Unit rate times quantity on the issued hash.'],
                ['Audit trail', 'Match, quote, award, and release are logged.'],
              ].map(([label, body]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <dt className="text-sm font-semibold text-foundation-navy">{label}</dt>
                  <dd className="mt-1 text-xs leading-5 text-concrete-grey">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
          <h2 className="text-xl font-semibold tracking-tight text-foundation-navy">How it works</h2>
          <p className="mt-1 max-w-2xl text-sm text-concrete-grey">Three steps. No marketplace chat. No guessing what was quoted.</p>
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-md border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Step {index + 1}</p>
                <h3 className="mt-2 text-base font-semibold text-foundation-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-concrete-grey">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-3 px-6 py-12 sm:px-10 md:grid-cols-2">
            <div id="buying" className="rounded-md border border-slate-200 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Buyers</p>
              <h2 className="mt-2 text-lg font-semibold text-foundation-navy">Raise a tender and compare quotes</h2>
              <p className="mt-2 text-sm leading-6 text-concrete-grey">
                For contractors, site teams, and buyers who need materials, plant, waste, or professional services. One requirement in. Comparable trade prices back.
              </p>
              <Link href="/register?intent=buying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                Create a Buyer account
              </Link>
            </div>
            <div id="supplying" className="rounded-md border border-slate-200 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Suppliers</p>
              <h2 className="mt-2 text-lg font-semibold text-foundation-navy">Quote specified demand in your coverage</h2>
              <p className="mt-2 text-sm leading-6 text-concrete-grey">
                For suppliers matched by trade and geography. See the brief, submit a formal quote, and wait for an auditable award — not a leaked phone number.
              </p>
              <Link href="/register?intent=supplying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                Create a Supplier account
              </Link>
            </div>
          </div>
        </section>

        <LandingPartners />
      </main>
      <SiteFooter />
    </div>
  );
}
