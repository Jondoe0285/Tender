import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { OwnerConsolePanel } from '@/components/admin/OwnerConsolePanel';
import { OwnerMarketingPanel } from '@/components/admin/OwnerMarketingPanel';
import { PaymentWaiverPanel } from '@/components/admin/PaymentWaiverPanel';
import { SuperUserSettingsPanel } from '@/components/admin/SuperUserSettingsPanel';
import { getAdminSettings } from '@/server/domain/platformSettings';
import { listMarketingCampaigns } from '@/server/domain/marketingCampaignService';
import { appUrl } from '@/server/config/appUrl';

function httpsUrlOrEmpty(value: string) {
  return value.startsWith('https:') ? value : '';
}

export default async function OwnerConsolePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');
  if (!user.isOwner) redirect('/super-user');
  if (!user.mfaEnabled) redirect('/account/security');

  const superUsers = await prisma.user.findMany({
    where: { role: 'SUPER_USER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, contactName: true, contactPhone: true, isOwner: true, suspended: true },
  });
  const [users, waivers, settings, campaigns] = await Promise.all([
    prisma.user.findMany({ where: { role: 'USER', suspended: false }, orderBy: { email: 'asc' }, select: { id: true, email: true, contactName: true } }),
    prisma.paymentWaiver.findMany({
      orderBy: { grantedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, contactName: true } },
        grantedBy: { select: { contactName: true } },
        revokedBy: { select: { contactName: true } },
        _count: { select: { payments: true } },
      },
    }),
    getAdminSettings(true),
    listMarketingCampaigns(),
  ]);

  return (
    <AppShell role="super-user" title="Owner Console">
      <div className="space-y-8">
        <OwnerConsolePanel initialSuperUsers={superUsers} currentUserId={user.id} />
        <OwnerMarketingPanel
          initialCampaigns={campaigns}
          marketplaceCtaUrl={httpsUrlOrEmpty(appUrl('/register'))}
          supplierCtaUrl={httpsUrlOrEmpty(appUrl('/register?intent=supplying'))}
        />
        <SuperUserSettingsPanel initialSettings={settings} isOwner currentUserId={user.id} />
        <PaymentWaiverPanel initialUsers={users} initialWaivers={waivers} />
      </div>
    </AppShell>
  );
}
