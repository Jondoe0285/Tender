import Image from 'next/image';
import Link from 'next/link';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { PreLaunchCountdown } from '@/components/layout/PreLaunchCountdown';
import { LinkButton } from '@/components/ui/Button';

const steps = [
  {
    title: 'Set out the job',
    body: 'Enter the trade, quantity, location, and deadline. Matched Suppliers see the same written brief, so they are all pricing the same job — not a phone call.',
    image: '/images/prelaunch/specify.png',
    alt: 'Construction drawings and a tender pack on a site desk',
  },
  {
    title: 'Compare quotes',
    body: 'Those companies submit quotes. You compare price, lead time, and documents in one table. For contractor and professional jobs, a Supplier can pay a fixed fee first to visit the site before quoting.',
    image: '/images/prelaunch/compare.png',
    alt: 'A site office table used to compare quotes',
  },
  {
    title: 'Award the work',
    body: 'Accept the quote you want. For materials, waste, and plant, you then see the Supplier\'s contact details. Contact stays private until a site visit is paid for, or until you accept a quote.',
    image: '/images/prelaunch/supply.png',
    alt: 'A UK materials yard and plant at dusk',
  },
];

export function PreLaunchLanding({ launchAtIso }: { launchAtIso: string }) {
  return (
    <div className="min-h-screen bg-foundation-navy text-site-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-foundation-navy/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-10">
          <Link href="/" className="flex items-center" aria-label="Trade Tender home">
            <TradeTenderLogo variant="dark" />
          </Link>
          <LinkButton href="/register" size="lg">Register now</LinkButton>
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden">
          <Image
            src="/images/prelaunch/hero.png"
            alt="A UK construction frame and cranes at dusk"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_78%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foundation-navy via-foundation-navy/70 to-foundation-navy/25" />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
          <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-end px-6 pb-16 pt-24 sm:px-10 sm:pb-20">
            <div className="h-1 w-16 bg-safety-amber" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-site-white">UK construction · launching soon</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-site-white sm:text-6xl">
              Set out the job.
              <br />
              Compare quotes.
              <br />
              Award the work.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-site-white sm:text-lg">
              Trade Tender is for Buyers and Suppliers. Publish a clear tender. Matched companies quote the same brief. Names and phone numbers stay private until a site visit is booked or you accept a quote.
            </p>
            <PreLaunchCountdown launchAtIso={launchAtIso} />
            <div className="mt-8">
              <LinkButton href="/register" size="lg">Register now</LinkButton>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-foundation-navy">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-site-white">How it operates</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-site-white sm:text-3xl">Everyone quotes the same job</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-site-white/80">
              Three steps from tender to award. You are not comparing different versions of the brief, and you are not handing out phone numbers to every caller.
            </p>
            <ol className="mt-10 grid gap-6 lg:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="overflow-hidden border border-white/10 bg-foundation-navy">
                  <div className="relative h-48">
                    <Image src={step.image} alt={step.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foundation-navy via-foundation-navy/20 to-transparent" />
                    <p className="absolute left-4 top-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-site-white">Step {index + 1}</p>
                  </div>
                  <div className="px-5 py-5">
                    <h3 className="text-lg font-semibold text-site-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-site-white/80">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-site-white">Buyers</p>
              <h2 className="mt-2 text-2xl font-semibold text-site-white">Raise a tender and compare quotes</h2>
              <p className="mt-3 text-sm leading-6 text-site-white/80">
                For site teams and buying teams that need materials, plant, waste, contractor work, or professional services. Set out one job and receive comparable quotes.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-site-white">Suppliers</p>
              <h2 className="mt-2 text-2xl font-semibold text-site-white">Quote jobs in your trade and area</h2>
              <p className="mt-3 text-sm leading-6 text-site-white/80">
                You only see tenders that match your services and location. Read the brief, then quote. For contractor and professional jobs, you can pay a fixed fee to contact the Buyer for a site visit first.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 sm:px-10">
        <p className="mx-auto max-w-6xl text-xs leading-relaxed text-site-white/70">
          Tenders and quotes for UK construction. Trade Tender connects Buyers and Suppliers. It is not a party to the final contract. © 2026 Trade Tender.
        </p>
      </footer>
    </div>
  );
}
