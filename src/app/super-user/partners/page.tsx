import { redirect } from 'next/navigation';
import { PartnerManagementPanel } from '@/components/admin/PartnerManagementPanel';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';

export default async function PartnersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  return <AppShell role="super-user" title="Partner Management"><div className="mx-auto max-w-5xl"><PartnerManagementPanel /></div></AppShell>;
}