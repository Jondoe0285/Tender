import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { hashPassword } from '@/server/auth/password';
import { registerSchema } from '@/lib/schemas/register';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { verifyPassword } from '@/server/auth/password';
import { newRegistrationTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { appUrl, emailVerificationTemplate } from '@/server/notifications/emailTemplates';
import { createEmailVerificationToken } from '@/server/auth/emailVerification';
import { buildClientTradeTenderId } from '@/lib/identifiers';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';

async function sendVerificationEmail(userId: string, email: string) {
  const token = await createEmailVerificationToken(userId);
  return sendTransactionalEmail(email, emailVerificationTemplate({
    verificationLink: appUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
  }));
}

export async function POST(request: Request) {
  const rateLimitError = createRateLimitResponse(request, 'register', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  }
  const input = parsed.data;

  if (!input.companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }
  const companyName = input.companyName;

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roleMemberships: true },
  });
  if (existing) {
    const validPassword = await verifyPassword(input.password, existing.passwordHash);
    const hasRole = existing.roleMemberships.some((membership) => membership.role === input.role) || existing.role === input.role;
    if (!validPassword || existing.suspended) {
      return NextResponse.json({ error: 'Unable to complete registration with those details' }, { status: 400 });
    }

    if (hasRole && !existing.emailVerifiedAt) {
      const emailResult = await sendVerificationEmail(existing.id, existing.email);
      if (!emailResult.sent) return NextResponse.json({ error: 'Unable to send verification email. Please contact support.' }, { status: 503 });
      return NextResponse.json({ status: 'verification_sent' }, { status: 202 });
    }
    if (hasRole) return NextResponse.json({ error: 'Unable to complete registration with those details' }, { status: 400 });

    await prisma.$transaction(async (transaction) => {
      await transaction.userRole.create({ data: { userId: existing.id, role: input.role } });
      if (input.role === 'RETAILER') {
        await transaction.retailerProfile.create({
              data: {
                userId: existing.id,
                companyName: input.companyName ?? '',
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            });
      }
      if (input.role === 'CLIENT') {
        const company = await transaction.clientCompany.create({ data: { tradeTenderId: buildClientTradeTenderId(), companyName, primaryUserId: existing.id } });
        await transaction.clientCompanyMember.create({ data: { companyId: company.id, userId: existing.id } });
      }
    });
    await recordAuditEvent({
      actorId: existing.id,
      action: 'WORKSPACE_ADDED',
      targetType: 'User',
      targetId: existing.id,
      metadata: { role: input.role },
    });
    if (input.role === 'RETAILER') await matchRetailerToOpenTenders(existing.id);
    return NextResponse.json({ status: 'workspace_added' });
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
      email: input.email,
      passwordHash,
      role: input.role,
      contactName: input.contactName,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      contactPhone: input.contactPhone ?? null,
      termsAcceptedAt: new Date(),
      roleMemberships: { create: { role: input.role } },
      ...(input.role === 'RETAILER'
        ? {
            retailerProfile: {
              create: {
                companyName: input.companyName ?? '',
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            },
          }
        : {}),
      },
    });
    if (input.role === 'CLIENT') {
      const company = await transaction.clientCompany.create({ data: { tradeTenderId: buildClientTradeTenderId(), companyName, primaryUserId: createdUser.id } });
      await transaction.clientCompanyMember.create({ data: { companyId: company.id, userId: createdUser.id } });
    }
    return createdUser;
  });

  await recordAuditEvent({
    actorId: user.id,
    action: 'ACCOUNT_REGISTERED',
    targetType: 'User',
    targetId: user.id,
    metadata: { role: user.role },
  });
  if (user.role === 'RETAILER') await matchRetailerToOpenTenders(user.id);

  const verificationResult = await sendVerificationEmail(user.id, user.email);
  if (!verificationResult.sent) {
    await recordAuditEvent({ actorId: null, action: 'EMAIL_VERIFICATION_DELIVERY_FAILED', targetType: 'User', targetId: user.id });
    return NextResponse.json({ error: 'Unable to send verification email. Please contact support.' }, { status: 503 });
  }
  await recordAuditEvent({ actorId: null, action: 'EMAIL_VERIFICATION_SENT', targetType: 'User', targetId: user.id });

  const notificationRecipient = process.env.REGISTRATION_NOTIFICATION_EMAIL;
  if (notificationRecipient) {
    const emailResult = await sendTransactionalEmail(
      notificationRecipient,
      newRegistrationTemplate({
        role: user.role,
        email: user.email,
        contactName: user.contactName,
        companyName: input.companyName,
      })
    ).catch((error: unknown) => ({ sent: false as const, reason: error instanceof Error ? error.message : 'Email delivery failed' }));
    await recordAuditEvent({
      actorId: null,
      action: emailResult.sent ? 'REGISTRATION_NOTIFICATION_SENT' : 'REGISTRATION_NOTIFICATION_FAILED',
      targetType: 'User',
      targetId: user.id,
      metadata: { recipient: notificationRecipient, reason: emailResult.sent ? undefined : emailResult.reason },
    });
  }

  return NextResponse.json({ status: 'verification_sent' }, { status: 201 });
}
