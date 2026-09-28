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

const reasons = [
  { title: 'Why sign up', body: 'Trade Tender is the place to put a construction job in writing, collect comparable quotes, and award the work without handing out phone numbers to every caller. Sign up if you buy or supply materials, plant, waste, contractor work, or professional services in the UK.' },
  { title: 'Cost control', body: 'One written brief replaces repeating the job on the phone. You compare price and lead time in one table instead of chasing attachments. That cuts the time buying teams spend qualifying quotes, and it cuts the time Suppliers spend pricing the wrong version of the job.' },
  { title: 'Ease of use', body: 'Set out the trade, quantity, location, and deadline. Matched companies quote that brief. You award from the same record. You do not need a separate portal for each trade, and you do not need to rebuild the tender in email.' },
  { title: 'Multiple quotes on the same job', body: 'Matched Suppliers price the same specification. You are not comparing a phone note against a PDF against a verbal figure. Side-by-side quotes make the award decision a documented choice, not a guess.' },
  { title: 'Reach you did not already have', body: 'Buyers see Suppliers they have not previously used. Suppliers see tenders in their trade and area from Buyers they have not previously reached. Contact stays private until a site visit is paid for, or until a quote is accepted.' },
  { title: 'New trading opportunities', body: 'A published tender is a live request for work. Suppliers only see jobs that match their services and location. That is new demand without buying a lead list, and new supply without relying only on who already has the site number.' },
  { title: 'A complete buying and supplying path', body: 'Materials, plant, waste, contractor work, and professional services sit on one platform: tender, quote, award, and contact release. It is not a materials catalogue and it is not a phone directory. It is the record of the job from brief to award.' },
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

        <section id="why-sign-up" className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
          <h2 className="text-xl font-semibold tracking-tight text-foundation-navy">Why create an account</h2>
          <p className="mt-1 max-w-2xl text-sm text-foundation-navy">
            Sign up to run tenders and quotes in one place — including companies you have not previously traded with.
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {reasons.map((reason) => (
              <li key={reason.title} className={`border border-slate-200 bg-white p-5${reason.title.startsWith('A complete') ? ' sm:col-span-2' : ''}`}>
                <h3 className="text-base font-semibold text-foundation-navy">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-concrete-grey">{reason.body}</p>
              </li>
            ))}
          </ul>
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
                For site teams and buying teams that need materials, plant, waste, contractor work, or professional services. Set out one job and receive comparable quotes from matched Suppliers — including firms you have not previously reached — then award from the same table.
              </p>
              <Link href="/register?intent=buying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                Create a Buyer account
              </Link>
            </div>
            <div id="supplying">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel-blue">Suppliers</p>
              <h2 className="mt-2 text-lg font-semibold text-foundation-navy">Quote jobs in your trade and area</h2>
              <p className="mt-2 text-sm leading-6 text-concrete-grey">
                You only see tenders that match your services and location. Read the brief, then quote. That is new demand from Buyers you have not previously traded with. For contractor and professional jobs, you can pay a fixed fee to contact the Buyer for a site visit first. Buyers do not get your phone number until contact details are shared.
              </p>
              <Link href="/register?intent=supplying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
                Create a Supplier account
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-foundation-navy">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-6 py-12 sm:px-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-site-white">Create an account and run the next job on the platform</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-site-white/80">Buyers publish a brief. Suppliers quote it. You award the work with a full record — not a trail of calls and forwarded PDFs.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <LinkButton href="/register" size="lg">Create an account</LinkButton>
              <LinkButton href="/demo" variant="secondary" size="lg">Request a demo</LinkButton>
            </div>
          </div>
        </section>

        <LandingPartners />
      </main>
      <SiteFooter />
    </div>
  );
}
