import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function PaymentMonitoringPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { contactName: true, email: true } } },
  });

  return (
    <AppShell role="super-user" title="Payment Monitoring">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Provider unlock fees and Contractor Accepted Quote Release Fees across the platform.
        </p>
        {payments.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No payment activity is recorded.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">
                    {payment.type === 'RETAILER_UNLOCK' ? 'Provider Unlock Fee' : 'Contractor Release Fee'}
                  </p>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">&pound;{payment.totalAmountGbp.toFixed(2)} inc. VAT</h3>
                  <p className="mt-1 text-sm text-concrete-grey">Fee: &pound;{payment.amountGbp.toFixed(2)} excl. VAT &middot; VAT: &pound;{payment.vatGbp.toFixed(2)} ({payment.vatPercentage}%)</p>
                  <p className="mt-1 text-sm text-concrete-grey">
                    {payment.user.contactName} ({payment.user.email}) &middot; {payment.createdAt.toLocaleDateString('en-GB')}
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
