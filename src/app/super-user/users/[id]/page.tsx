import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { UserAnalyticsProfileView } from '@/components/admin/UserAnalyticsProfileView';
import { getCurrentUser } from '@/server/auth/session';
import { getUserAnalyticsProfile } from '@/server/domain/userProfileService';

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const profile = await getUserAnalyticsProfile(params.id);
  if (!profile) notFound();

  return (
    <AppShell role="super-user" title="Account Profile">
      <UserAnalyticsProfileView profile={profile} />
    </AppShell>
  );
}
