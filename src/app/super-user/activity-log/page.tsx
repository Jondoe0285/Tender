import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityLogTable } from '@/components/admin/ActivityLogTable';
import { SuperUserActivitySummary } from '@/components/admin/SuperUserActivitySummary';
import { getCurrentUser } from '@/server/auth/session';
import { getActivityLog, getSuperUserActivitySummary, parseActivityLogFilters } from '@/server/domain/activityLogService';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ActivityLogPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const filters = parseActivityLogFilters(searchParams ?? {});
  const [entries, superUserSummary] = await Promise.all([
    getActivityLog(filters),
    user.isOwner ? getSuperUserActivitySummary(filters) : Promise.resolve([]),
  ]);

  return (
    <AppShell role="super-user" title="Activity Log">
      {user.isOwner && <SuperUserActivitySummary rows={superUserSummary} />}
      <ActivityLogTable entries={entries} filters={filters} />
    </AppShell>
  );
}
