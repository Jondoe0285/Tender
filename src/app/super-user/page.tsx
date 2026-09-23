import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ExecutiveDashboard } from '@/components/analytics/ExecutiveDashboard';
import { OpsExceptionBoard } from '@/components/admin/OpsExceptionBoard';
import { getCurrentUser } from '@/server/auth/session';
import { getAnalytics, parseAnalyticsFilters } from '@/server/domain/analyticsService';
import { getOpsExceptions } from '@/server/domain/opsExceptions';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SuperUserPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const [data, exceptions] = await Promise.all([
    getAnalytics(parseAnalyticsFilters(searchParams ?? {})),
    getOpsExceptions(),
  ]);

  return (
    <AppShell role="super-user" title="Dashboard">
      <OpsExceptionBoard data={exceptions} />
      <ExecutiveDashboard data={data} />
    </AppShell>
  );
}
