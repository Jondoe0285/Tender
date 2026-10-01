import { NextResponse } from 'next/server';
import { refreshMobileDeviceSession } from '@/server/auth/mobileDevice';
import { ForbiddenError } from '@/server/auth/session';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';

export async function POST(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-refresh', { maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const body = await request.json().catch(() => null) as { refreshToken?: unknown } | null;
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
    if (!refreshToken) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    return NextResponse.json(await refreshMobileDeviceSession(refreshToken));
  } catch (error) {
    if (error instanceof ForbiddenError && error.message === 'LOGIN_DISABLED') {
      return NextResponse.json({ error: 'Sign in is currently closed.' }, { status: 403 });
    }
    return toErrorResponse(error);
  }
}
