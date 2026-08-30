import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { workspaceForRole } from '@/lib/navigation';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const workspace = workspaceForRole(user?.role);

  if (!workspace) {
    return NextResponse.redirect(new URL('/login?error=workspace', request.url));
  }

  return NextResponse.redirect(new URL(workspace, request.url));
}
