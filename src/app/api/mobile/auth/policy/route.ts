import { NextResponse } from 'next/server';
import { getMobileAuthPolicy, publicMobileAuthPolicy } from '@/server/auth/mobileAuthPolicy';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';

export async function GET(request: Request) {
  const limited = await createRateLimitResponse(request, 'mobile-auth-policy', { maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    return NextResponse.json(publicMobileAuthPolicy(await getMobileAuthPolicy()));
  } catch (error) {
    return toErrorResponse(error);
  }
}
