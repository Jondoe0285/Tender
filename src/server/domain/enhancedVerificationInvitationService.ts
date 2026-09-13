import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { appUrl, enhancedVerificationInvitationTemplate } from '@/server/notifications/emailTemplates';

const INVITATION_EXPIRY_DAYS = 30;

function signingSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SECRET_KEY || process.env.MOBILE_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Server secret is required for signing invitation tokens');
    }
    return 'dev-enhanced-verification-secret-key-32chars-min';
  }
  return secret;
}

export function signInvitationPayload(payload: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(jsonStr).toString('base64url');
  const signature = createHmac('sha256', signingSecret()).update(payloadBase64).digest('hex');
  return `${payloadBase64}.${signature}`;
}

export function verifyInvitationToken(signedToken: string): Record<string, unknown> | null {
  try {
    const parts = signedToken.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    const [payloadBase64, providedSignature] = parts;
    const expectedSignature = createHmac('sha256', signingSecret()).update(payloadBase64).digest('hex');
    if (providedSignature !== expectedSignature) return null;

    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
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
  ipAddress?: string | null;
};

export type InvitationResult = {
  status: 'SUCCESS';
  Status: 'SUCCESS';
  invitationId: string;
  InvitationId: string;
  expiryUtc: string;
  ExpiryUtc: string;
  emailSent: boolean;
  EmailSent: boolean;
  registrationLink: string;
  signedToken: string;
};

export async function createEnhancedVerificationInvitation(input: CreateInvitationInput): Promise<InvitationResult> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error('A valid recipient email address is required');
  }

  // 1. Verify user account & tenant status
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, suspended: true },
  });

  if (!user || user.suspended) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  // 2. Verify payment record & status
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

  if (!isConfirmed || !isTypeMatch || !belongsToUser || !isNotRefunded || !hasNoActiveReversal) {
    throw new Error('Enhanced Verification has not been purchased or payment is incomplete.');
  }

  // 3. Generate Invitation details
  const invitationId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const nonce = randomBytes(32).toString('base64url');

  const payload = {
    InvitationId: invitationId,
    TenantId: input.userId,
    Email: recipientEmail,
    Module: 'VERIFICATION',
    Product: 'ENHANCED_VERIFICATION',
    IssuedAt: now.toISOString(),
    ExpiresAt: expiresAt.toISOString(),
    Nonce: nonce,
    Version: '1',
  };

  const signedToken = signInvitationPayload(payload);
  const tokenHash = hashInvitationToken(signedToken);

  // 4. Save Invitation Record in database (storing tokenHash only)
  await prisma.enhancedVerificationInvitation.create({
    data: {
      id: invitationId,
      userId: input.userId,
      paymentId: input.paymentId,
      recipientEmail,
      recipientName: input.recipientName?.trim() || null,
      moduleCode: 'VERIFICATION',
      productCode: 'ENHANCED_VERIFICATION',
      tokenHash,
      status: 'PENDING',
      expiresAt,
    },
  });

  // 5. Construct Registration Link
  const registrationLink = appUrl(`/register?verificationToken=${encodeURIComponent(signedToken)}`);

  // 6. Send Email
  const template = enhancedVerificationInvitationTemplate({
    recipientName: input.recipientName,
    inviteLink: registrationLink,
    expiresAt,
  });

  const emailResult = await sendTransactionalEmail(recipientEmail, template).catch((error: unknown) => ({
    sent: false as const,
    reason: error instanceof Error ? error.message : 'Email delivery failed',
  }));

  // 7. Audit Logging
  await recordAuditEvent({
    actorId: input.userId,
    action: emailResult.sent ? 'ENHANCED_VERIFICATION_INVITATION_CREATED' : 'ENHANCED_VERIFICATION_INVITATION_EMAIL_FAILED',
    targetType: 'EnhancedVerificationInvitation',
    targetId: invitationId,
    metadata: {
      paymentId: input.paymentId,
      recipientEmail,
      recipientName: input.recipientName,
      expiresAt: expiresAt.toISOString(),
      emailSent: emailResult.sent,
      ipAddress: input.ipAddress ?? undefined,
    },
  });

  return {
    status: 'SUCCESS',
    Status: 'SUCCESS',
    invitationId,
    InvitationId: invitationId,
    expiryUtc: expiresAt.toISOString(),
    ExpiryUtc: expiresAt.toISOString(),
    emailSent: emailResult.sent,
    EmailSent: emailResult.sent,
    registrationLink,
    signedToken,
  };
}

export async function verifyAndConsumeInvitationToken(signedToken: string, consumerUserId?: string) {
  const payload = verifyInvitationToken(signedToken);
  if (!payload) return null;

  const tokenHash = hashInvitationToken(signedToken);
  const record = await prisma.enhancedVerificationInvitation.findUnique({
    where: { tokenHash },
  });

  if (!record || record.status !== 'PENDING' || record.expiresAt <= new Date()) {
    return null;
  }

  const now = new Date();
  const updated = await prisma.enhancedVerificationInvitation.update({
    where: { id: record.id },
    data: {
      status: 'USED',
      usedAt: now,
    },
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
