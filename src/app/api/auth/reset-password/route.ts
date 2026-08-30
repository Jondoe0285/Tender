import { NextResponse } from 'next/server';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { passwordResetSchema } from '@/lib/schemas/passwordReset';
import { consumePasswordResetToken } from '@/server/auth/passwordReset';
import { hashPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';

export async function POST(request: Request) {
  const rateLimitError = createRateLimitResponse(request, 'password-reset', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const userId = await consumePasswordResetToken(parsed.data.token, passwordHash);
  if (!userId) {
    // Deliberately vague: never reveal whether a token exists, is expired, or was already used.
    return NextResponse.json({ error: 'That reset link is no longer valid. Request a new one.' }, { status: 400 });
  }

  await recordAuditEvent({ actorId: null, action: 'USER_PASSWORD_RESET_COMPLETED', targetType: 'User', targetId: userId });
  return NextResponse.json({ status: 'password_set' });
}
