import { NextResponse } from 'next/server';
import { getCurrentMobileUser } from '@/server/auth/session';
import { MOBILE_SECURITY_EVENT_ACTIONS, recordMobileSecurityEvent, type MobileSecurityEventAction } from '@/server/auth/mobileDevice';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';

export async function POST(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-security-events', { maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const user = await getCurrentMobileUser();
    const body = await request.json().catch(() => null) as { action?: unknown; deviceId?: unknown } | null;
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!MOBILE_SECURITY_EVENT_ACTIONS.includes(action as MobileSecurityEventAction)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    await recordMobileSecurityEvent({
      actorId: user?.id,
      deviceId: typeof body?.deviceId === 'string' ? body.deviceId : undefined,
      action: action as MobileSecurityEventAction,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
