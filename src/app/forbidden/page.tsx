import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';

export default async function ForbiddenPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell role={user.role === 'SUPER_USER' ? 'super-user' : 'client'} title="Access denied">
      <div className="mx-auto max-w-xl rounded-md border border-slate-200 bg-white px-6 py-10">
        <h1 className="text-xl font-semibold text-foundation-navy">You do not have access to this workspace</h1>
        <p className="mt-3 text-sm leading-6 text-concrete-grey">
          This area is limited to platform operators. Return to your buying and supplying workspace to continue.
        </p>
        <Link href="/user" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-trade-blue hover:text-foundation-navy">
          Go to workspace
        </Link>
      </div>
    </AppShell>
  );
}
