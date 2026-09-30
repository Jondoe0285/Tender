import { NextResponse } from 'next/server';
import { requireMobileUser } from '@/server/auth/session';
import { listMobileDevices, registerBiometricDevice } from '@/server/auth/mobileDevice';
import { toErrorResponse } from '@/server/http/errors';
import { createRateLimitResponse } from '@/server/http/rateLimit';

export async function GET() {
  try {
    const user = await requireMobileUser();
    return NextResponse.json({ devices: await listMobileDevices(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-device-register', { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const user = await requireMobileUser();
    const body = await request.json().catch(() => null) as { platform?: unknown } | null;
    return NextResponse.json(await registerBiometricDevice(user.id, body?.platform));
  } catch (error) {
    return toErrorResponse(error);
  }
}
