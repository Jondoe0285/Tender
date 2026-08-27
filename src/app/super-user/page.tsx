import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ExecutiveDashboard } from '@/components/analytics/ExecutiveDashboard';
import { getCurrentUser } from '@/server/auth/session';
import { getAnalytics, parseAnalyticsFilters } from '@/server/domain/analyticsService';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SuperUserPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  const data = await getAnalytics(parseAnalyticsFilters(searchParams ?? {}));

  return (
    <AppShell role="super-user" title="Dashboard">
      <ExecutiveDashboard data={data} />
    </AppShell>
  );
}
