import { getCurrentUser } from '@/server/auth/session';
import { isPlatformMfaActive, superUserMfaSatisfied } from '@/server/auth/platformMfa';
import { inAppRedirect } from '@/server/http/inAppRedirect';
import { workspaceForRole } from '@/lib/navigation';

export async function GET() {
  const user = await getCurrentUser();
  const workspace = workspaceForRole(user?.role);

  if (!workspace) {
    return inAppRedirect('/login?error=workspace');
  }

  if (user?.mustChangePassword) {
    return inAppRedirect('/change-password');
  }

  if (user && !superUserMfaSatisfied(user, await isPlatformMfaActive())) {
    return inAppRedirect('/account/security');
  }

  return inAppRedirect(workspace);
}
