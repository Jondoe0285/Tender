import Image from 'next/image';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LandingPartners } from '@/components/layout/LandingPartners';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const portals = [
  {
    eyebrow: 'For Contractors',
    title: 'One requirement in. Competing trade prices back.',
    description:
      'Raise a tender for materials, waste services, or plant hire, then compare formal quotes from matched Providers in one place.',
  },
  {
    eyebrow: 'For Providers',
    title: 'Qualified demand, clearly specified.',
    description:
      'Review matched tender opportunities by category and coverage area, unlock full details, and submit a formal quote.',
  },
  {
    eyebrow: 'For Super Users',
    title: 'Keep the marketplace running smoothly.',
    description: 'Manage users, categories, pricing, and platform activity from one view.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate min-h-[600px] overflow-hidden border-b-4 border-safety-amber bg-foundation-navy">
          <Image src="/images/construction-site.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-foundation-navy/85" />
          <div className="mx-auto flex min-h-[600px] max-w-6xl items-center px-6 py-20 sm:px-10">
            <div className="max-w-2xl border-l-4 border-safety-amber pl-6 sm:pl-8">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-hi-viz-tint">The tender platform for construction supply</p>
              <h1 className="font-heading text-4xl font-bold leading-tight text-site-white sm:text-6xl">Trade Tender</h1>
              <p className="mt-4 font-heading text-2xl font-semibold text-safety-amber sm:text-3xl">Connect. Compare. Construct.</p>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-site-white/80">
                Run a competitive tender for every construction requirement, from materials and plant hire to waste services, then compare clear formal quotes in one place.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/login" size="lg">Sign in to Trade Tender</LinkButton>
                <LinkButton href="/register" variant="secondary" size="lg">Register now</LinkButton>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Trade Tender workspaces" className="mx-auto grid max-w-6xl gap-4 px-6 py-14 sm:grid-cols-3 sm:px-10">
          {portals.map((portal) => (
            <Card key={portal.title} interactive className="flex min-h-[250px] flex-col border-t-4 border-t-steel-blue">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-steel-blue">
                {portal.eyebrow}
              </p>
              <h2 className="font-heading text-xl font-bold leading-snug text-foundation-navy">{portal.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-concrete-grey">
                {portal.description}
              </p>
            </Card>
          ))}
        </section>
        <LandingPartners />
      </main>
      <SiteFooter />
    </div>
  );
}
