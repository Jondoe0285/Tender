import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function UnlockedTendersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const unlocks = await prisma.unlock.findMany({
    where: { retailerId: user.id },
    orderBy: { unlockedAt: 'desc' },
    include: {
      tender: {
        select: { id: true, reference: true, category: true, subcategory: true, location: true, closingDate: true },
      },
    },
  });

  return (
    <AppShell role="retailer" title="Unlocked Tenders">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Tenders you&rsquo;ve unlocked, with full specification available to quote against.
        </p>
        {unlocks.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">
            No tenders have been unlocked for this account.
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {unlocks.map((unlock) => (
              <a key={unlock.id} href={`/retailer/tenders/${unlock.tender.id}`} className="block">
                <Card interactive className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-blue">
                      {unlock.tender.category} &middot; {unlock.tender.reference}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-foundation-navy">{unlock.tender.subcategory}</h3>
                    <p className="mt-1 text-sm text-concrete-grey">
                      {unlock.tender.location} &middot; Closes {unlock.tender.closingDate.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <StatusBadge status="approved">{`Unlocked (${unlock.method === 'CREDIT' ? 'credit' : 'paid'})`}</StatusBadge>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
