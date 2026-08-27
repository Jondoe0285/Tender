import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function RetailerProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      contactName: true,
      email: true,
      contactPhone: true,
      retailerProfile: { select: { companyName: true, categories: true, coverageAreas: true } },
    },
  });

  return (
    <AppShell role="retailer" title="Profile">
      <div className="mx-auto max-w-2xl">
        <Card className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Company name</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">
              {record.retailerProfile?.companyName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Contact name</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Categories supplied</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">
              {record.retailerProfile?.categories ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Coverage areas</p>
            <p className="mt-1 font-heading text-base font-bold text-foundation-navy">
              {record.retailerProfile?.coverageAreas ?? '—'}
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
