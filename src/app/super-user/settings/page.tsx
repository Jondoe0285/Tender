import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';

export default async function SiteSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');
  redirect(user.isOwner ? '/super-user/owner' : '/super-user');
}
