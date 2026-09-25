import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { getIndependentReviewSharedSecret } from '@/server/domain/platformSettings';
import { resolveSigningSecret, verifyInvitationToken } from '@/server/domain/enhancedVerificationInvitationService';
import { independentReviewTierAtMost, isIndependentReviewTier, type IndependentReviewTier } from '@/lib/independentReviewTiers';
import { notifyIndependentReviewDecision } from '@/server/domain/independentReviewService';

const statusUpdateSchema = z.object({
  token: z.string().optional().nullable(),
  verificationToken: z.string().optional().nullable(),
  invitationToken: z.string().optional().nullable(),
  invitationId: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  status: z.enum(['APPROVED', 'DECLINED', 'PASSED', 'FAILED']),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  comments: z.string().trim().max(500).optional().nullable(),
});

function safeSecretMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function authenticatePartnerRequest(request: Request, rawBodyText: string): Promise<boolean> {
  const configuredSecret = await getIndependentReviewSharedSecret();
  if (!configuredSecret) return false;
  const activeSecret = resolveSigningSecret(configuredSecret);

  const sharedSecretHeader = request.headers.get('x-shared-secret')
    || request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];

  if (sharedSecretHeader && safeSecretMatch(sharedSecretHeader, activeSecret)) {
    return true;
  }

  const signatureHeader = request.headers.get('x-signature')
    || request.headers.get('x-hub-signature-256')?.replace(/^sha256=/i, '');

  if (signatureHeader && rawBodyText) {
    const expectedSignature = createHmac('sha256', activeSecret).update(rawBodyText).digest('hex');
    if (safeSecretMatch(signatureHeader, expectedSignature)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const rateLimitError = await createRateLimitResponse(request, 'enhanced-verification-callback', { maxRequests: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const rawBodyText = await request.text();
    const authenticated = await authenticatePartnerRequest(request, rawBodyText);

    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing shared secret' }, { status: 401 });
    }

    let body: unknown = null;
    try {
      body = rawBodyText ? JSON.parse(rawBodyText) : null;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status payload', issues: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const token = input.token || input.verificationToken || input.invitationToken;
    const invitationId = input.invitationId;
    const paymentId = input.paymentId;
    const rawStatus = input.status;
    const nextStatus = (rawStatus === 'APPROVED' || rawStatus === 'PASSED') ? 'APPROVED' : 'DECLINED';
    const note = input.note || input.comments || null;

    let invitation = invitationId
      ? await prisma.enhancedVerificationInvitation.findUnique({ where: { id: invitationId } })
      : null;

    if (!invitation && token) {
      const payload = verifyInvitationToken(token);
      const tokenInvitationId = typeof payload?.InvitationId === 'string' ? payload.InvitationId : null;
      if (tokenInvitationId) {
        invitation = await prisma.enhancedVerificationInvitation.findUnique({ where: { id: tokenInvitationId } });
      }
    }

    if (!invitation && paymentId) {
      invitation = await prisma.enhancedVerificationInvitation.findFirst({
        where: { paymentId, status: { in: ['PENDING', 'USED'] } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!invitation) {
      return NextResponse.json({ error: 'Provider account not found for provided identifiers' }, { status: 404 });
    }

    const confirmedPayment = await prisma.payment.findFirst({
      where: {
        id: invitation.paymentId,
        userId: invitation.userId,
        type: 'INDEPENDENT_REVIEW',
        status: 'CONFIRMED',
        reversals: { none: {} },
      },
      select: { id: true, independentReviewTier: true, userId: true },
    });

    if (!confirmedPayment) {
      return NextResponse.json({ error: 'Enhanced Verification has not been purchased or payment is incomplete for this provider' }, { status: 400 });
    }

    const purchasedTier: IndependentReviewTier | null = isIndependentReviewTier(confirmedPayment.independentReviewTier)
      ? confirmedPayment.independentReviewTier
      : null;
    if (!purchasedTier) {
      return NextResponse.json({ error: 'Purchased verification tier is missing for this payment' }, { status: 400 });
    }

    let awardedTier: IndependentReviewTier | null = null;
    if (nextStatus === 'APPROVED') {
      if (!isIndependentReviewTier(input.tier)) {
        return NextResponse.json({ error: 'An awarded Bronze, Silver, or Gold tier is required' }, { status: 400 });
      }
      if (!independentReviewTierAtMost(input.tier, purchasedTier)) {
        return NextResponse.json({ error: 'Awarded tier cannot exceed the purchased verification product' }, { status: 400 });
      }
      awardedTier = input.tier;
    }

    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: invitation.userId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    await prisma.retailerProfile.update({
      where: { id: profile.id },
      data: {
        independentReviewStatus: nextStatus,
        independentReviewTier: awardedTier,
        independentReviewPurchasedTier: purchasedTier,
        independentReviewPurchasedPaymentId: confirmedPayment.id,
        independentReviewDecidedAt: new Date(),
        independentReviewNote: note,
      },
    });

    if (invitation.status === 'PENDING') {
      await prisma.enhancedVerificationInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'USED', usedAt: new Date() },
      });
    }

    await recordAuditEvent({
      actorId: null,
      action: nextStatus === 'APPROVED' ? 'INDEPENDENT_REVIEW_APPROVED' : 'INDEPENDENT_REVIEW_DECLINED',
      targetType: 'User',
      targetId: profile.userId,
      metadata: {
        email: profile.user.email,
        note: note ?? undefined,
        tier: awardedTier ?? undefined,
        purchasedTier,
        source: 'PARTNER_CALLBACK',
        invitationId: invitation.id,
        paymentId: confirmedPayment.id,
      },
    });

    await notifyIndependentReviewDecision(profile.user.email, { approved: nextStatus === 'APPROVED', tier: awardedTier });

    return NextResponse.json({
      status: 'SUCCESS',
      userId: profile.userId,
      independentReviewStatus: nextStatus,
      independentReviewTier: awardedTier,
    }, { status: 200 });

  } catch (error) {
    return toErrorResponse(error);
  }
}
