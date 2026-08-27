import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { verifyEmailVerificationToken } from '@/server/auth/emailVerification';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length > 200) {
    return NextResponse.redirect(new URL('/login?verification=invalid', request.url));
  }

  const userId = await verifyEmailVerificationToken(token);
  if (!userId) return NextResponse.redirect(new URL('/login?verification=invalid', request.url));

  await recordAuditEvent({ actorId: userId, action: 'EMAIL_VERIFIED', targetType: 'User', targetId: userId });
  return NextResponse.redirect(new URL('/login?verification=verified', request.url));
}