import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { isEmailConfigured, sendTransactionalEmail } from '@/server/notifications/resend';
import { configurationTestTemplate } from '@/server/notifications/emailTemplates';

/**
 * Verifies Resend delivery for the current environment. The recipient is always the
 * signed-in Super User's own address, so this can never be used to mail a third party.
 */
export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'test-email', { maxRequests: 3, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireRole('SUPER_USER');

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM for this environment.' },
        { status: 503 }
      );
    }

    const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'unknown';
    const result = await sendTransactionalEmail(admin.email, configurationTestTemplate({ environment, sentAt: new Date() }));

    await recordAuditEvent({
      actorId: admin.id,
      action: result.sent ? 'EMAIL_TEST_SENT' : 'EMAIL_TEST_FAILED',
      targetType: 'User',
      targetId: admin.id,
      metadata: { environment },
    });

    if (!result.sent) {
      return NextResponse.json({ error: `Resend rejected the message: ${result.reason}` }, { status: 502 });
    }

    return NextResponse.json({ status: 'sent', environment, recipient: admin.email, messageId: result.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
