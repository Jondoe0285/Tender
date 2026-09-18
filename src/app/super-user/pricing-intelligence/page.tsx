import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PricingIntelligencePanel } from '@/components/analytics/PricingIntelligencePanel';
import { getCurrentUser } from '@/server/auth/session';
import { getPricingIntelligenceByCategory } from '@/server/domain/quoteEstimateService';
import { getQuoteEstimateMasterReductionPercentage } from '@/server/domain/platformSettings';

export const dynamic = 'force-dynamic';

export default async function PricingIntelligencePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const [rows, masterReductionPercent] = await Promise.all([
    getPricingIntelligenceByCategory(),
    getQuoteEstimateMasterReductionPercentage(),
  ]);

  return (
    <AppShell role="super-user" title="Pricing Intelligence">
      <PricingIntelligencePanel rows={rows} masterReductionPercent={masterReductionPercent} isOwner={user.isOwner} />
    </AppShell>
  );
}
