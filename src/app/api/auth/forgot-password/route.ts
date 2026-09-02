import { NextResponse } from 'next/server';
import { passwordResetRequestSchema } from '@/lib/schemas/passwordReset';
import { createPasswordResetToken, PASSWORD_RESET_EXPIRY_LABEL } from '@/server/auth/passwordReset';
import { appUrl, passwordResetTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';

const RESET_REQUEST_RESPONSE = { status: 'reset_link_requested' } as const;

export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'password-reset-request', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, suspended: true },
  });

  if (!user || user.suspended) {
    return NextResponse.json(RESET_REQUEST_RESPONSE, { status: 202 });
  }

  const token = await createPasswordResetToken(user.id);
  const result = await sendTransactionalEmail(
    user.email,
    passwordResetTemplate({
      resetLink: appUrl(`/reset-password?token=${encodeURIComponent(token)}`),
      expiresIn: PASSWORD_RESET_EXPIRY_LABEL,
    })
  );

  await recordAuditEvent({
    actorId: null,
    action: result.sent ? 'USER_PASSWORD_RESET_REQUESTED' : 'USER_PASSWORD_RESET_DELIVERY_FAILED',
    targetType: 'User',
    targetId: user.id,
    metadata: result.sent ? {} : { reason: result.reason },
  });

  return NextResponse.json(RESET_REQUEST_RESPONSE, { status: 202 });
}