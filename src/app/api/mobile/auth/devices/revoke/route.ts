import { NextResponse } from 'next/server';
import { getCurrentMobileUser } from '@/server/auth/session';
import { revokeMobileDevice } from '@/server/auth/mobileDevice';
import { toErrorResponse } from '@/server/http/errors';
import { createRateLimitResponse } from '@/server/http/rateLimit';

export async function POST(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-device-revoke', { maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const user = await getCurrentMobileUser();
    const body = await request.json().catch(() => null) as { deviceId?: unknown; refreshToken?: unknown } | null;
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : undefined;
    if (!refreshToken && !deviceId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if (!user && !refreshToken) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    await revokeMobileDevice({ actorId: user?.id, deviceId, refreshToken, reason: 'disabled' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
