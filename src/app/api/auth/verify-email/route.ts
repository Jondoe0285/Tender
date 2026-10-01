import { recordAuditEvent } from '@/server/audit/auditLog';
import { verifyEmailVerificationToken } from '@/server/auth/emailVerification';
import { inAppRedirect } from '@/server/http/inAppRedirect';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length > 200) {
    return inAppRedirect('/login?verification=invalid');
  }

  const userId = await verifyEmailVerificationToken(token);
  if (!userId) return inAppRedirect('/login?verification=invalid');

  await recordAuditEvent({ actorId: userId, action: 'EMAIL_VERIFIED', targetType: 'User', targetId: userId });
  return inAppRedirect('/login?verification=verified');
}
