import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const [matchedCount, unlockedCount, submittedCount, acceptedCount] = await Promise.all([
    prisma.tenderMatch.count({ where: { retailerId: user.id } }),
    prisma.unlock.count({ where: { retailerId: user.id } }),
    prisma.quote.count({ where: { retailerId: user.id } }),
    prisma.quote.count({ where: { retailerId: user.id, status: 'ACCEPTED' } }),
  ]);

  const unlockRate = matchedCount > 0 ? Math.round((unlockedCount / matchedCount) * 100) : 0;
  const winRate = submittedCount > 0 ? Math.round((acceptedCount / submittedCount) * 100) : 0;

  const metrics = [
    { label: 'Matched tenders', value: matchedCount },
    { label: 'Unlock rate', value: `${unlockRate}%` },
    { label: 'Quotes submitted', value: submittedCount },
    { label: 'Quote win rate', value: `${winRate}%` },
  ];

  return (
    <AppShell role="retailer" title="Performance">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          How your matched demand is converting into unlocks, quotes, and awarded projects.
        </p>
        <div className="grid gap-5 sm:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-l-4 border-l-steel-blue">
              <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
              <p className="mt-2 text-sm font-medium text-concrete-grey">{metric.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
