import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminSettings } from '@/server/domain/platformSettings';
import { SuperUserSettingsPanel } from '@/components/admin/SuperUserSettingsPanel';

export default async function SiteSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');
  const settings = await getAdminSettings();

  return (
    <AppShell role="super-user" title="Site Settings">
      <div className="mx-auto max-w-4xl"><SuperUserSettingsPanel initialSettings={settings} isOwner={user.isOwner} /></div>
    </AppShell>
  );
}
