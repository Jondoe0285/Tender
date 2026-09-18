import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { UserAnalyticsProfileView } from '@/components/admin/UserAnalyticsProfileView';
import { getCurrentUser } from '@/server/auth/session';
import { getUserAnalyticsProfile } from '@/server/domain/userProfileService';
import type { ActivityPeriod } from '@/server/domain/userProfileService';

const activityPeriods = new Set<ActivityPeriod>(['1d', '7d', '30d', '90d', 'all']);

export default async function UserProfilePage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ activity?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const activityPeriod = activityPeriods.has(searchParams.activity as ActivityPeriod) ? searchParams.activity as ActivityPeriod : '1d';
  const profile = await getUserAnalyticsProfile(params.id, activityPeriod);
  if (!profile) notFound();

  return (
    <AppShell role="super-user" title="Account Profile">
      <UserAnalyticsProfileView profile={profile} />
    </AppShell>
  );
}
