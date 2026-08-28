import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { CategoryEditor } from '@/components/admin/CategoryEditor';

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  return (
    <AppShell role="super-user" title="Categories">
      <div className="mx-auto max-w-5xl"><CategoryEditor /></div>
    </AppShell>
  );
}
