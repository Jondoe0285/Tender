import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { MfaSettings } from '@/components/auth/MfaSettings';
import { getCurrentUser } from '@/server/auth/session';

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'SUPER_USER') redirect('/user/profile');
  return <AppShell role="super-user" title="Security"><div className="mx-auto max-w-3xl"><MfaSettings /></div></AppShell>;
}