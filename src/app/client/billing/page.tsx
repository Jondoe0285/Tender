import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const payments = await prisma.payment.findMany({
    where: { userId: user.id, type: 'CLIENT_RELEASE' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AppShell role="client" title="Billing">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Accepted Quote Release Fees charged when you accept a Retailer&rsquo;s quote.
        </p>
        {payments.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No billing activity is recorded for this account.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="font-heading text-base font-bold text-foundation-navy">&pound;{payment.totalAmountGbp.toFixed(2)} inc. VAT</p>
                  <p className="mt-1 text-sm text-concrete-grey">Fee: &pound;{payment.amountGbp.toFixed(2)} excl. VAT &middot; VAT: &pound;{payment.vatGbp.toFixed(2)} ({payment.vatPercentage}%)</p>
                  <p className="mt-1 text-sm text-concrete-grey">
                    Accepted Quote Release Fee &middot; {payment.createdAt.toLocaleDateString('en-GB')}
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
