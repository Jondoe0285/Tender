import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CLIENT') redirect('/login');

  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { contactName: true, email: true, contactPhone: true, createdAt: true },
  });

  return (
    <AppShell role="client" title="Profile">
      <div className="mx-auto max-w-2xl">
        <Card className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Full name</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">{record.contactName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Email</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">{record.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Phone</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">{record.contactPhone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Member since</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">
              {record.createdAt.toLocaleDateString('en-GB')}
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
