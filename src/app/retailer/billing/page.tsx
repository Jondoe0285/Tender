import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function RetailerBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const [payments, profile] = await Promise.all([
    prisma.payment.findMany({ where: { userId: user.id, type: 'RETAILER_UNLOCK' }, orderBy: { createdAt: 'desc' } }),
    prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { launchCreditsLeft: true } }),
  ]);

  return (
    <AppShell role="retailer" title="Billing">
      <div className="mx-auto max-w-3xl">
        <Card className="mb-6 border-l-4 border-l-steel-blue">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{profile?.launchCreditsLeft ?? 0}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">Launch credits remaining</p>
        </Card>
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">Tender unlock fees charged once your launch credits are used.</p>
        {payments.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No billing activity is recorded for this account.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="font-heading text-base font-bold text-foundation-navy">&pound;{payment.amountGbp}</p>
                  <p className="mt-1 text-sm text-concrete-grey">
                    Tender Unlock Fee &middot; {payment.createdAt.toLocaleDateString('en-GB')}
                  </p>
                </div>
                <StatusBadge
                  status={payment.status === 'CONFIRMED' ? 'approved' : payment.status === 'FAILED' ? 'attention' : 'pending'}
                >
                  {payment.status}
                </StatusBadge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
