import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { toErrorResponse } from '@/server/http/errors';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { createEnhancedVerificationInvitation } from '@/server/domain/enhancedVerificationInvitationService';
import { isIndependentReviewTier } from '@/lib/independentReviewTiers';
import { prisma } from '@/server/data/prisma';

const inviteSchema = z.object({
  paymentId: z.string().min(1, 'Payment transaction ID is required'),
});

export async function POST(request: Request) {
  try {
    const rateLimitError = await createRateLimitResponse(request, 'enhanced-verification-invite', { maxRequests: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const admin = await requireRole('SUPER_USER');
    const body = await request.json().catch(() => null);
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invitation details', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parsed.data.paymentId },
      include: { user: { select: { id: true, email: true, contactName: true } } },
    });
    if (!payment || payment.type !== 'INDEPENDENT_REVIEW' || !isIndependentReviewTier(payment.independentReviewTier)) {
      return NextResponse.json({ error: 'Enhanced Verification has not been purchased or payment is incomplete.' }, { status: 400 });
    }

    const result = await createEnhancedVerificationInvitation({
      userId: payment.user.id,
      paymentId: payment.id,
      recipientEmail: payment.user.email,
      recipientName: payment.user.contactName,
      purchasedTier: payment.independentReviewTier,
    });

    await recordAuditEvent({
      actorId: admin.id,
      action: 'ENHANCED_VERIFICATION_INVITATION_RESENT',
      targetType: 'EnhancedVerificationInvitation',
      targetId: result.invitationId,
      metadata: { paymentId: payment.id },
    });

    return NextResponse.json({
      status: result.status,
      invitationId: result.invitationId,
      expiryUtc: result.expiryUtc,
      emailSent: result.emailSent,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Enhanced Verification has not been purchased')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
