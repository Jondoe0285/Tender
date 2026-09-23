import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LandingPartners } from '@/components/layout/LandingPartners';
import { LinkButton } from '@/components/ui/Button';

const steps = [
  { title: 'Set out the job', body: 'Enter the trade, quantity, location, and deadline. Matched Suppliers see the same written brief, so they are all pricing the same job — not a phone call.' },
  { title: 'Compare quotes', body: 'Matched Suppliers submit quotes. You compare price, lead time, and documents in one table. For contractor and professional jobs, a Supplier can pay a fixed fee first to get your details and visit the site before quoting.' },
  { title: 'Award the work', body: 'Accept the quote you want. For materials, waste, and plant, you then see the Supplier\'s contact details.' },
];

export function MarketplaceLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="flex min-h-[calc(100svh-4.75rem)] items-center border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center sm:px-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">UK construction</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foundation-navy sm:text-4xl">
              Set out the job.
              <br />
              Compare quotes. Award the work.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-concrete-grey">
              Trade Tender is for Buyers and Suppliers. Publish a clear tender. Matched companies quote the same brief. Names and phone numbers stay private until a site visit is booked or you accept a quote.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <LinkButton href="/login" size="lg">Sign in</LinkButton>
              <LinkButton href="/register" variant="secondary" size="lg">Create an account</LinkButton>
              <LinkButton href="/demo" variant="secondary" size="lg">Request a demo</LinkButton>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Private contact', 'Names, emails, and phone numbers stay hidden until a site visit is paid for, or until you accept a quote.'],
                ['A clear tender', 'Each job lists the trade, quantity, location, and deadline so quotes can be compared fairly.'],
                ['Side-by-side quotes', 'Compare price, lead time, and documents in one table — not across emails and phone notes.'],
                ['A full record', 'The job record keeps matching, quotes, awards, and shared contact details.'],
              ].map(([label, body]) => (
                <div key={label}>
                  <dt className="text-sm font-semibold text-foundation-navy">{label}</dt>
                  <dd className="mt-1 text-xs leading-5 text-concrete-grey">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
          <h2 className="text-xl font-semibold tracking-tight text-foundation-navy">How it works</h2>
          <p className="mt-1 max-w-2xl text-sm text-foundation-navy">Three steps from tender to award. Everyone quotes the same job.</p>
          <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {steps.map((step, index) => (
              <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[7rem_1fr] sm:items-baseline">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Step {index + 1}</p>
                <div>
                  <h3 className="text-base font-semibold text-foundation-navy">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-foundation-navy">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:px-10 md:grid-cols-2">
            <div id="buying">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Buyers</p>
              <h2 className="mt-2 text-lg font-semibold text-foundation-navy">Raise a tender and compare quotes</h2>
              <p className="mt-2 text-sm leading-6 text-concrete-grey">
                For site teams and buying teams that need materials, plant, waste, contractor work, or professional services. Set out one job and receive comparable quotes.
              </p>
              <Link href="/register?intent=buying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                Create a Buyer account
              </Link>
            </div>
            <div id="supplying">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Suppliers</p>
              <h2 className="mt-2 text-lg font-semibold text-foundation-navy">Quote jobs in your trade and area</h2>
              <p className="mt-2 text-sm leading-6 text-concrete-grey">
                You only see tenders that match your services and location. Read the brief, then quote. For contractor and professional jobs, you can pay a fixed fee to contact the Buyer for a site visit first. Buyers do not get your phone number until contact details are shared.
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
