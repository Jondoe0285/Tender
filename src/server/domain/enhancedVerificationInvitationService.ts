import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { appUrl, enhancedVerificationInvitationTemplate } from '@/server/notifications/emailTemplates';
import { getIndependentReviewPartnerUrl, getIndependentReviewSharedSecret } from '@/server/domain/platformSettings';
import { enhancedVerificationProductCode, isIndependentReviewTier, type IndependentReviewTier } from '@/lib/independentReviewTiers';

const INVITATION_EXPIRY_DAYS = 30;
const DEV_SIGNING_SECRET = 'dev-enhanced-verification-secret-key-32chars-min';

export function resolveSigningSecret(providedSecret?: string | null): string {
  const secret = providedSecret?.trim()
    || process.env.VERIFICATION_REGISTRATION_TOKEN_SECRET
    || process.env.VERIFICATION_INTEGRATION_SECRET_TRADE_TENDER_VERIFICATION
    || process.env.VERIFICATION_OUTBOUND_SECRET_TRADE_TENDER_VERIFICATION
    || process.env.ENHANCED_VERIFICATION_SHARED_SECRET
    || process.env.INDEPENDENT_REVIEW_SHARED_SECRET
    || '';
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Enhanced verification signing secret is required');
    }
    return DEV_SIGNING_SECRET;
  }
  return secret;
}

export function signInvitationPayload(payload: Record<string, unknown>, secret?: string | null): string {
  const jsonStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(jsonStr).toString('base64url');
  const signature = createHmac('sha256', resolveSigningSecret(secret)).update(payloadBase64).digest('hex');
  return `${payloadBase64}.${signature}`;
}

export function verifyInvitationToken(signedToken: string, secret?: string | null): Record<string, unknown> | null {
  try {
    const parts = signedToken.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    const [payloadBase64, providedSignature] = parts;
    const expectedSignature = createHmac('sha256', resolveSigningSecret(secret)).update(payloadBase64).digest('hex');
    const providedBuffer = Buffer.from(providedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;

    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.ExpiresAt && typeof parsed.ExpiresAt === 'string') {
      const expiresAtDate = new Date(parsed.ExpiresAt);
      if (!isNaN(expiresAtDate.getTime()) && expiresAtDate <= new Date()) {
        return null;
      }
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type CreateInvitationInput = {
  userId: string;
  paymentId: string;
  recipientEmail: string;
  recipientName?: string | null;
  purchasedTier: IndependentReviewTier;
};

export type InvitationResult = {
  status: 'SUCCESS';
  invitationId: string;
  expiryUtc: string;
  emailSent: boolean;
  registrationLink: string;
  signedToken: string;
  purchasedTier: IndependentReviewTier;
};

export async function createEnhancedVerificationInvitation(input: CreateInvitationInput): Promise<InvitationResult> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error('A valid recipient email address is required');
  }
  if (!isIndependentReviewTier(input.purchasedTier)) {
    throw new Error('A Bronze, Silver, or Gold product is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, suspended: true },
  });

  if (!user || user.suspended) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { reversals: true },
  });

  if (!payment) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  const isConfirmed = payment.status === 'CONFIRMED';
  const isTypeMatch = payment.type === 'INDEPENDENT_REVIEW';
  const belongsToUser = payment.userId === input.userId;
  const isNotRefunded = payment.status !== 'REFUNDED' && payment.status !== 'REVERSED';
  const hasNoActiveReversal = payment.reversals.length === 0;
  const paymentTier = isIndependentReviewTier(payment.independentReviewTier) ? payment.independentReviewTier : input.purchasedTier;
  if (payment.independentReviewTier && payment.independentReviewTier !== input.purchasedTier) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  if (!isConfirmed || !isTypeMatch || !belongsToUser || !isNotRefunded || !hasNoActiveReversal) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  const outboundSent = await prisma.auditLog.findFirst({
    where: { action: 'ENHANCED_VERIFICATION_OUTBOUND_SENT', targetType: 'Payment', targetId: input.paymentId },
    select: { id: true },
  });
  const existing = await prisma.enhancedVerificationInvitation.findFirst({
    where: { paymentId: input.paymentId },
    orderBy: { createdAt: 'desc' },
  });
  if (existing && outboundSent) {
    return {
      status: 'SUCCESS',
      invitationId: existing.id,
      expiryUtc: existing.expiresAt.toISOString(),
      emailSent: true,
      registrationLink: '',
      signedToken: '',
      purchasedTier: paymentTier,
    };
  }
  if (existing) {
    await prisma.enhancedVerificationInvitation.update({
      where: { id: existing.id },
      data: { status: 'REVOKED' },
    });
  }

  const invitationId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const nonce = randomBytes(32).toString('base64url');
  const productCode = enhancedVerificationProductCode(input.purchasedTier);

  const payload = {
    InvitationId: invitationId,
    TenantId: input.userId,
    Email: recipientEmail,
    Module: 'VERIFICATION',
    Product: productCode,
    PurchasedTier: input.purchasedTier,
    PaymentId: input.paymentId,
    IssuedAt: now.toISOString(),
    ExpiresAt: expiresAt.toISOString(),
    Nonce: nonce,
    Version: '1',
  };

  const sharedSecret = await getIndependentReviewSharedSecret();
  const signedToken = signInvitationPayload(payload, sharedSecret);
  const tokenHash = hashInvitationToken(signedToken);

  await prisma.enhancedVerificationInvitation.create({
    data: {
      id: invitationId,
      userId: input.userId,
      paymentId: input.paymentId,
      recipientEmail,
      recipientName: input.recipientName?.trim() || null,
      moduleCode: 'VERIFICATION',
      productCode,
      tokenHash,
      status: 'PENDING',
      expiresAt,
    },
  });

  const registrationLink = buildRegistrationLink(await getIndependentReviewPartnerUrl(), signedToken);

  const template = enhancedVerificationInvitationTemplate({
    recipientName: input.recipientName,
    inviteLink: registrationLink,
    expiresAt,
  });

  const emailResult = await sendTransactionalEmail(recipientEmail, template).catch((error: unknown) => ({
    sent: false as const,
    reason: error instanceof Error ? error.message : 'Email delivery failed',
  }));

  await recordAuditEvent({
    actorId: input.userId,
    action: emailResult.sent ? 'ENHANCED_VERIFICATION_INVITATION_CREATED' : 'ENHANCED_VERIFICATION_INVITATION_EMAIL_FAILED',
    targetType: 'EnhancedVerificationInvitation',
    targetId: invitationId,
    metadata: {
      paymentId: input.paymentId,
      recipientEmail,
      recipientName: input.recipientName,
      purchasedTier: input.purchasedTier,
      expiresAt: expiresAt.toISOString(),
      emailSent: emailResult.sent,
    },
  });

  return {
    status: 'SUCCESS',
    invitationId,
    expiryUtc: expiresAt.toISOString(),
    emailSent: emailResult.sent,
    registrationLink,
    signedToken,
    purchasedTier: input.purchasedTier,
  };
}

function buildRegistrationLink(configuredPartnerUrl: string, signedToken: string): string {
  const targetUrl = configuredPartnerUrl.trim();
  if (targetUrl) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    return `${targetUrl}${separator}token=${encodeURIComponent(signedToken)}&verificationToken=${encodeURIComponent(signedToken)}`;
  }
  return appUrl(`/register?token=${encodeURIComponent(signedToken)}&verificationToken=${encodeURIComponent(signedToken)}`);
}

export async function notifyConsulthubOfPurchase(input: {
  invitation: InvitationResult;
  userId: string;
  paymentId: string;
  purchasedTier: IndependentReviewTier;
  companyName: string;
  recipientEmail: string;
}) {
  const alreadySent = await prisma.auditLog.findFirst({
    where: { action: 'ENHANCED_VERIFICATION_OUTBOUND_SENT', targetType: 'Payment', targetId: input.paymentId },
    select: { id: true },
  });
  if (alreadySent) return { sent: true, skipped: true };

  const outboundUrl = (await getIndependentReviewPartnerUrl()).trim();
  const secret = await getIndependentReviewSharedSecret();
  if (!outboundUrl || !secret) {
    const message = 'Enhanced verification outbound URL or signing secret is not configured';
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    await recordAuditEvent({
      actorId: input.userId,
      action: 'ENHANCED_VERIFICATION_OUTBOUND_SKIPPED',
      targetType: 'Payment',
      targetId: input.paymentId,
      metadata: { reason: message, purchasedTier: input.purchasedTier },
    });
    return { sent: false, skipped: true };
  }

  const body = JSON.stringify({
    invitationId: input.invitation.invitationId,
    tenantId: input.userId,
    userId: input.userId,
    email: input.recipientEmail,
    companyName: input.companyName,
    purchasedTier: input.purchasedTier,
    paymentId: input.paymentId,
    issuedAt: new Date().toISOString(),
    expiresAt: input.invitation.expiryUtc,
    callbackUrl: appUrl('/api/partner/enhanced-verification/status'),
    token: input.invitation.signedToken,
  });
  const signature = createHmac('sha256', resolveSigningSecret(secret)).update(body).digest('hex');

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(outboundUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'Idempotency-Key': input.paymentId,
        },
        body,
      });
      if (!response.ok) {
        throw new Error(`Consulthub onboarding returned ${response.status}`);
      }
      await recordAuditEvent({
        actorId: input.userId,
        action: 'ENHANCED_VERIFICATION_OUTBOUND_SENT',
        targetType: 'Payment',
        targetId: input.paymentId,
        metadata: { invitationId: input.invitation.invitationId, purchasedTier: input.purchasedTier, attempt },
      });
      return { sent: true, skipped: false };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Outbound onboarding failed');
    }
  }

  throw lastError ?? new Error('Outbound onboarding failed');
}

export async function verifyAndConsumeInvitationToken(signedToken: string, consumerUserId?: string) {
  const sharedSecret = await getIndependentReviewSharedSecret();
  const payload = verifyInvitationToken(signedToken, sharedSecret);
  if (!payload) return null;

  const tokenHash = hashInvitationToken(signedToken);
  const record = await prisma.enhancedVerificationInvitation.findUnique({
    where: { tokenHash },
  });

  if (!record || record.status !== 'PENDING' || record.expiresAt <= new Date()) {
    return null;
  }

  const now = new Date();
  const updatedCount = await prisma.enhancedVerificationInvitation.updateMany({
    where: {
      id: record.id,
      status: 'PENDING',
      expiresAt: { gt: now },
    },
    data: {
      status: 'USED',
      usedAt: now,
    },
  });

  if (updatedCount.count === 0) return null;

  const updated = await prisma.enhancedVerificationInvitation.findUnique({
    where: { id: record.id },
  });

  await recordAuditEvent({
    actorId: consumerUserId ?? record.userId,
    action: 'ENHANCED_VERIFICATION_INVITATION_CONSUMED',
    targetType: 'EnhancedVerificationInvitation',
    targetId: record.id,
    metadata: {
      recipientEmail: record.recipientEmail,
      consumedAt: now.toISOString(),
    },
  });

  return updated;
}
