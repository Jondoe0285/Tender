import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { getIndependentReviewSharedSecret } from '@/server/domain/platformSettings';
import { resolveSigningSecret, verifyAndConsumeInvitationToken, verifyInvitationToken } from '@/server/domain/enhancedVerificationInvitationService';

const statusUpdateSchema = z.object({
  token: z.string().optional().nullable(),
  verificationToken: z.string().optional().nullable(),
  invitationToken: z.string().optional().nullable(),
  invitationId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  providerUserId: z.string().optional().nullable(),
  tenantId: z.string().optional().nullable(),
  email: z.string().trim().toLowerCase().optional().nullable(),
  recipientEmail: z.string().trim().toLowerCase().optional().nullable(),
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
  const activeSecret = configuredSecret || resolveSigningSecret();

  // 1. Check direct header secret (X-Shared-Secret or Bearer token)
  const sharedSecretHeader = request.headers.get('x-shared-secret')
    || request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];

  if (sharedSecretHeader && safeSecretMatch(sharedSecretHeader, activeSecret)) {
    return true;
  }

  // 2. Check HMAC signature header (X-Signature or X-Hub-Signature-256)
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
    const rawBodyText = await request.text();
    const authenticated = await authenticatePartnerRequest(request, rawBodyText);

    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing shared secret' }, { status: 401 });
    }

    const body = rawBodyText ? JSON.parse(rawBodyText) : null;
    const parsed = statusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status payload', issues: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const token = input.token || input.verificationToken || input.invitationToken;
    const invitationId = input.invitationId;
    const rawUserId = input.userId || input.providerUserId || input.tenantId;
    const rawEmail = input.email || input.recipientEmail;
    const paymentId = input.paymentId;
    const rawStatus = input.status;
    const nextStatus = (rawStatus === 'APPROVED' || rawStatus === 'PASSED') ? 'APPROVED' : 'DECLINED';
    const tier = nextStatus === 'APPROVED' ? (input.tier ?? 'BRONZE') : null;
    const note = input.note || input.comments || null;

    let targetUserId: string | null = null;
    let targetInvitationId: string | null = invitationId ?? null;

    // 1. Find user from token or invitation record
    if (token) {
      const payload = verifyInvitationToken(token);
      if (payload?.TenantId && typeof payload.TenantId === 'string') {
        targetUserId = payload.TenantId;
      }
      await verifyAndConsumeInvitationToken(token).catch(() => null);
    }

    if (!targetUserId && targetInvitationId) {
      const invitation = await prisma.enhancedVerificationInvitation.findUnique({
        where: { id: targetInvitationId },
      });
      if (invitation) {
        targetUserId = invitation.userId;
        await prisma.enhancedVerificationInvitation.update({
          where: { id: invitation.id },
          data: { status: 'USED', usedAt: new Date() },
        }).catch(() => null);
      }
    }

    // 2. Find user from direct identifier fields
    if (!targetUserId && rawUserId) {
      targetUserId = rawUserId;
    }

    if (!targetUserId && paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { userId: true },
      });
      if (payment) targetUserId = payment.userId;
    }

    if (!targetUserId && rawEmail) {
      const user = await prisma.user.findUnique({
        where: { email: rawEmail },
        select: { id: true },
      });
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Provider account not found for provided identifiers' }, { status: 404 });
    }

    // 3. Find retailer profile
    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: targetUserId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // 4. Update retailer profile verification status
    await prisma.retailerProfile.update({
      where: { id: profile.id },
      data: {
        independentReviewStatus: nextStatus,
        independentReviewTier: tier,
        independentReviewDecidedAt: new Date(),
        independentReviewNote: note,
      },
    });

    // 5. Audit log
    await recordAuditEvent({
      actorId: null,
      action: nextStatus === 'APPROVED' ? 'INDEPENDENT_REVIEW_APPROVED' : 'INDEPENDENT_REVIEW_DECLINED',
      targetType: 'User',
      targetId: profile.userId,
      metadata: {
        email: profile.user.email,
        note: note ?? undefined,
        tier: tier ?? undefined,
        source: 'PARTNER_CALLBACK',
      },
    });

    return NextResponse.json({
      status: 'SUCCESS',
      userId: profile.userId,
      independentReviewStatus: nextStatus,
      independentReviewTier: tier,
    }, { status: 200 });

  } catch (error) {
    return toErrorResponse(error);
  }
}
