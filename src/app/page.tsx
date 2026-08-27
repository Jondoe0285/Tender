import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const portals = [
  {
    eyebrow: 'For Clients',
    title: 'One requirement in. Competing trade prices back.',
    description:
      'Raise a tender for materials, waste services, or plant hire, then compare formal quotes from matched Retailers in one place.',
  },
  {
    eyebrow: 'For Retailers',
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
      <main className="flex-1 px-6 sm:px-10">
        <section className="mx-auto max-w-3xl pt-20 pb-16 sm:pt-28">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-steel-blue">
            The tender platform for construction supply
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foundation-navy sm:text-6xl">
            Build materials. Better priced.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-concrete-grey">
            Trade Tender connects construction Clients with matched Retailers, running a
            competitive tender on every requirement &mdash; covering materials, waste services, and
            plant hire &mdash; to secure better pricing.
          </p>
          <LinkButton href="/login" size="lg" className="mt-8">
            Sign in to Trade Tender
          </LinkButton>
        </section>

        <section aria-label="Trade Tender workspaces" className="mx-auto grid max-w-5xl gap-5 pb-24 sm:grid-cols-3">
          {portals.map((portal) => (
            <Card key={portal.title} interactive className="flex min-h-[280px] flex-col">
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
      </main>
      <SiteFooter />
    </div>
  );
}
