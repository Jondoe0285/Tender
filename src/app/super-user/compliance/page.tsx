import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ComplianceMonitoringPanel } from '@/components/admin/ComplianceMonitoringPanel';
import { getCurrentUser } from '@/server/auth/session';
import { getComplianceOverview } from '@/server/domain/complianceMonitoringService';

export const dynamic = 'force-dynamic';

export default async function ComplianceMonitoringPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const overview = await getComplianceOverview();

  return (
    <AppShell role="super-user" title="Tender Monitoring">
      <ComplianceMonitoringPanel overview={overview} />
    </AppShell>
  );
}
