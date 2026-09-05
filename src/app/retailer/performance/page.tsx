import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RetailerAnalyticsDashboard } from '@/components/analytics/RetailerAnalyticsDashboard';
import { getCurrentUser } from '@/server/auth/session';
import { getRetailerAnalytics } from '@/server/domain/retailerAnalyticsService';
import { getRetailerAnalyticsSectionSettings } from '@/server/domain/platformSettings';

export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const [data, sections] = await Promise.all([
    getRetailerAnalytics(user.id),
    getRetailerAnalyticsSectionSettings(),
  ]);

  return (
    <AppShell role="retailer" title="Performance">
      <p className="mx-auto mb-6 max-w-2xl text-sm text-concrete-grey">
        How your matched demand is converting into unlocks, quotes, and awarded projects.
      </p>
      <RetailerAnalyticsDashboard data={data} sections={sections} />
    </AppShell>
  );
}

