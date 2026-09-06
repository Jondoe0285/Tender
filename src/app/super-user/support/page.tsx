import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SupportRequestQueue } from '@/components/admin/SupportRequestQueue';
import { getCurrentUser } from '@/server/auth/session';
import { listSupportRequestsForSuperUser } from '@/server/domain/supportRequestService';

export default async function SuperUserSupportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER' || user.isAccountant) redirect('/login');
  const requests = await listSupportRequestsForSuperUser();
  return <AppShell role="super-user" title="Support requests"><SupportRequestQueue initialRequests={requests} isOwner={user.isOwner} /></AppShell>;
}