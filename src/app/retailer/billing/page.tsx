import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { SponsoredPlacementCard } from '@/components/retailer/SponsoredPlacementCard';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { sponsoredPlacementEnabled } from '@/server/domain/sponsoredPlacementService';
import { listAvailableMembershipTiers } from '@/server/domain/membershipService';
import { MembershipPackages } from '@/components/retailer/MembershipPackages';

export default async function RetailerBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const [payments, profile, placementEnabled, activePlacement, placementFeeGbp, membershipPackages] = await Promise.all([
    prisma.payment.findMany({ where: { userId: user.id, type: { in: ['RETAILER_UNLOCK', 'SPONSORED_PLACEMENT', 'MEMBERSHIP_TIER'] } }, orderBy: { createdAt: 'desc' } }),
    prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { launchCreditsLeft: true } }),
    sponsoredPlacementEnabled(),
    prisma.retailerSponsoredPlacement.findFirst({ where: { retailerId: user.id, active: true } }),
    getPaymentFeeGbp('SPONSORED_PLACEMENT'),
    listAvailableMembershipTiers(user.id),
  ]);

  return (
    <AppShell role="retailer" title="Billing">
      <div className="mx-auto max-w-3xl">
        <Card className="mb-6 border-l-4 border-l-steel-blue">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{profile?.launchCreditsLeft ?? 0}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">Launch credits remaining</p>
        </Card>
        <MembershipPackages enabled={membershipPackages.enabled} tiers={membershipPackages.tiers} />
        <SponsoredPlacementCard enabled={placementEnabled} active={Boolean(activePlacement)} feeGbp={placementFeeGbp} />
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
                    {payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored Placement Fee' : payment.type === 'MEMBERSHIP_TIER' ? 'Membership Package' : 'Tender Unlock Fee'} &middot; {payment.createdAt.toLocaleDateString('en-GB')}
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
