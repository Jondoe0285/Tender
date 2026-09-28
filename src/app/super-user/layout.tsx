import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { isPlatformMfaActive, superUserMfaSatisfied } from '@/server/auth/platformMfa';

export default async function SuperUserLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (!superUserMfaSatisfied(user, await isPlatformMfaActive())) redirect('/account/security');
  return children;
}
