import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function AwardedProjectsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CONTRACTOR') redirect('/login');

  const awardedQuotes = await prisma.quote.findMany({
    where: { tender: { clientId: user.id }, status: 'ACCEPTED' },
    orderBy: { submittedAt: 'desc' },
    include: { tender: { select: { id: true, reference: true, subcategory: true, category: true, location: true } } },
  });

  return (
    <AppShell role="client" title="Awarded Projects">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Projects where you&rsquo;ve accepted a Retailer&rsquo;s quote.
        </p>
        {awardedQuotes.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No awarded projects are recorded for this account.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {awardedQuotes.map((quote) => (
              <a key={quote.id} href={`/client/tenders/${quote.tender.id}`} className="block">
                <Card interactive className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-blue">
                      {quote.tender.category} &middot; {quote.tender.reference}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-foundation-navy">{quote.tender.subcategory}</h3>
                    <p className="mt-1 text-sm text-concrete-grey">
                      {quote.tender.location} &middot; Awarded at &pound;{quote.priceGbp} excl. VAT
                    </p>
                  </div>
                  <StatusBadge status="approved">Awarded</StatusBadge>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
