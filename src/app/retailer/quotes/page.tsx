import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function SubmittedQuotesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'PROVIDER') redirect('/login');

  const quotes = await prisma.quote.findMany({
    where: { retailerId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: { tender: { select: { id: true, reference: true, subcategory: true } } },
  });

  return (
    <AppShell role="retailer" title="Submitted Quotes">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">Every quote you&rsquo;ve submitted, and its current status.</p>
        {quotes.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No quotes have been submitted for this account.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {quotes.map((quote) => (
              <a key={quote.id} href={`/retailer/tenders/${quote.tender.id}`} className="block">
                <Card interactive className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-blue">
                      {quote.reference} &middot; {quote.tender.subcategory}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-foundation-navy">&pound;{quote.priceGbp} excl. VAT</h3>
                    <p className="mt-1 text-sm text-concrete-grey">Valid for {quote.validityDays} days</p>
                  </div>
                  <StatusBadge status={quote.status === 'ACCEPTED' ? 'approved' : 'neutral'}>{quote.status}</StatusBadge>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
