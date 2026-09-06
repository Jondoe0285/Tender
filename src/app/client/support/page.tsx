import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SupportRequestPanel } from '@/components/support/SupportRequestPanel';
import { getCurrentUser } from '@/server/auth/session';
import { listSupportRequestsForRequester } from '@/server/domain/supportRequestService';

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');
  const requests = await listSupportRequestsForRequester(user.id);
  return <AppShell role="client" title="Support requests"><SupportRequestPanel initialRequests={requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString(), dueAt: request.dueAt?.toISOString() ?? null }))} /></AppShell>;
}