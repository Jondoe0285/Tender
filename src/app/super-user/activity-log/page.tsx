import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityLogTable } from '@/components/admin/ActivityLogTable';
import { getCurrentUser } from '@/server/auth/session';
import { getActivityLog, parseActivityLogFilters } from '@/server/domain/activityLogService';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ActivityLogPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const filters = parseActivityLogFilters(searchParams ?? {});
  const entries = await getActivityLog(filters);

  return (
    <AppShell role="super-user" title="Activity Log">
      <ActivityLogTable entries={entries} filters={filters} />
    </AppShell>
  );
}
