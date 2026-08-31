import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { appUrl } from '@/server/config/appUrl';
import { workspaceForRole } from '@/lib/navigation';

// Behind Render's proxy the request host is the internal listener (localhost:10000), so absolute
// redirects must resolve against the configured public origin instead.
export async function GET() {
  const user = await getCurrentUser();
  const workspace = workspaceForRole(user?.role);

  if (!workspace) {
    return NextResponse.redirect(appUrl('/login?error=workspace'));
  }

  return NextResponse.redirect(appUrl(workspace));
}
