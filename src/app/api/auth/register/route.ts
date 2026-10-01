import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { hashPassword } from '@/server/auth/password';
import { createRegisterSchemaForCatalog } from '@/lib/schemas/register';
import { getCategoryCatalog } from '@/server/domain/categoryService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { verifyPassword } from '@/server/auth/password';
import { emailVerificationTemplate, newRegistrationTemplate } from '@/server/notifications/emailTemplates';
import { isEmailConfigured, sendTransactionalEmail } from '@/server/notifications/resend';
import { requestAppUrl } from '@/server/config/appUrl';
import { createEmailVerificationToken } from '@/server/auth/emailVerification';
import { buildClientTradeTenderId } from '@/lib/identifiers';
import { createRateLimitResponse } from '@/server/http/rateLimit';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legal/documentVersions';
import { getPlatformSetting } from '@/server/domain/platformSettings';
import { serialiseServiceProvisions } from '@/lib/service-provisions';
import { operatingLocationsFromCoverage } from '@/lib/geography';
import { defaultLaunchCreditExpiry } from '@/lib/launch-credits';

async function sendVerificationEmail(userId: string, email: string, headers: Headers) {
  const token = await createEmailVerificationToken(userId);
  let verificationLink: string;
  try {
    verificationLink = requestAppUrl(headers, `/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  } catch (error) {
    return { sent: false as const, reason: error instanceof Error ? error.message : 'Application URL is not configured' };
  }
  try {
    return await sendTransactionalEmail(email, emailVerificationTemplate({ verificationLink }));
  } catch (error) {
    return { sent: false as const, reason: error instanceof Error ? error.message : 'Email delivery failed' };
  }
}

function verificationDeliveryError() {
  if (!isEmailConfigured()) {
    return 'Email delivery is not configured. Set RESEND_API_KEY and a verified EMAIL_FROM for this environment.';
  }
  return 'Unable to send verification email. Please contact support.';
}

async function completeVerificationDelivery(
  userId: string,
  emailResult: { sent: boolean; reason?: string },
  successStatus: 201 | 202,
) {
  if (emailResult.sent) {
    await recordAuditEvent({ actorId: null, action: 'EMAIL_VERIFICATION_SENT', targetType: 'User', targetId: userId });
    return NextResponse.json({ status: 'verification_sent' }, { status: successStatus });
  }

  await recordAuditEvent({
    actorId: null,
    action: 'EMAIL_VERIFICATION_DELIVERY_FAILED',
    targetType: 'User',
    targetId: userId,
    metadata: { reason: emailResult.reason ?? 'unknown' },
  });

  if (process.env.NODE_ENV !== 'production' && !isEmailConfigured()) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    await recordAuditEvent({ actorId: null, action: 'EMAIL_VERIFICATION_LOCAL_FALLBACK', targetType: 'User', targetId: userId });
    return NextResponse.json({ status: 'verified' }, { status: successStatus });
  }

  return NextResponse.json({ error: verificationDeliveryError() }, { status: 503 });
}

export async function POST(request: Request) {
  const rateLimitError = await createRateLimitResponse(request, 'register', { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const body = await request.json().catch(() => null);
  const parsed = createRegisterSchemaForCatalog(await getCategoryCatalog()).safeParse(body);
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
    if (existing.role === 'SUPER_USER') {
      return NextResponse.json({ status: 'verification_pending' }, { status: 202 });
    }
    const validPassword = await verifyPassword(input.password, existing.passwordHash);
    const hasRole = existing.roleMemberships.some((membership) => membership.role === input.role) || existing.role === input.role;
    if (!validPassword || existing.suspended) {
      return NextResponse.json({ status: 'verification_pending' }, { status: 202 });
    }

    if (hasRole && !existing.emailVerifiedAt) {
      const emailResult = await sendVerificationEmail(existing.id, existing.email, request.headers);
      return completeVerificationDelivery(existing.id, emailResult, 202);
    }
    if (hasRole) return NextResponse.json({ status: 'verification_pending' }, { status: 202 });

    await prisma.$transaction(async (transaction) => {
      await transaction.userRole.create({ data: { userId: existing.id, role: input.role } });
      if (input.role === 'USER') {
        await transaction.retailerProfile.create({
              data: {
                userId: existing.id,
                companyName: input.companyName ?? '',
                companyType: input.companyType ?? 'LIMITED_COMPANY',
                isSoleTrader: input.companyType === 'SOLE_TRADER',
                categories: (input.categories ?? []).join(','),
                coverageAreas: '',
                coverageScope: input.coverageScope ?? 'COUNTY',
                counties: (input.counties ?? []).join(','),
                regions: (input.regions ?? []).join(','),
              },
            });
      }
      if (input.role === 'USER') {
        const company = await transaction.clientCompany.create({ data: { tradeTenderId: buildClientTradeTenderId(), companyName, branchIdentifier: input.branchIdentifier ?? 'Head Office', companyType: input.companyType ?? 'LIMITED_COMPANY', services: (input.categories ?? []).join(','), serviceProvisions: serialiseServiceProvisions(input.serviceProvisions ?? []), operatingLocations: operatingLocationsFromCoverage({ coverageScope: input.coverageScope, counties: input.counties, regions: input.regions }), primaryUserId: existing.id } });
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
    if (input.role === 'USER') await matchRetailerToOpenTenders(existing.id);
    return NextResponse.json({ status: 'verification_pending' }, { status: 202 });
  }

  const passwordHash = await hashPassword(input.password);
  const acceptedAt = new Date();
  const defaultLaunchCredits = Math.max(0, Number(await getPlatformSetting('RETAILER_LAUNCH_CREDITS_DEFAULT')) || 0);

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
      termsAcceptedAt: acceptedAt,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyAcceptedAt: acceptedAt,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      roleMemberships: { create: { role: input.role } },
      ...(input.role === 'USER'
        ? {
            retailerProfile: {
              create: {
                companyName: input.companyName ?? '',
                companyType: input.companyType ?? 'LIMITED_COMPANY',
                isSoleTrader: input.companyType === 'SOLE_TRADER',
                categories: (input.categories ?? []).join(','),
                coverageAreas: '',
                coverageScope: input.coverageScope ?? 'COUNTY',
                counties: (input.counties ?? []).join(','),
                regions: (input.regions ?? []).join(','),
                launchCreditsLeft: defaultLaunchCredits,
                launchCreditsExpireAt: defaultLaunchCredits > 0 ? defaultLaunchCreditExpiry() : null,
                launchCreditsReason: defaultLaunchCredits > 0 ? 'Registration default' : null,
              },
            },
          }
        : {}),
      },
    });
    await recordAuditEvent({
      actorId: createdUser.id,
      action: 'LEGAL_DOCUMENTS_ACCEPTED',
      targetType: 'User',
      targetId: createdUser.id,
      metadata: { termsVersion: CURRENT_TERMS_VERSION, privacyVersion: CURRENT_PRIVACY_VERSION, acceptedAt: acceptedAt.toISOString() },
    }, transaction);
    if (input.role === 'USER') {
      const company = await transaction.clientCompany.create({ data: { tradeTenderId: buildClientTradeTenderId(), companyName, branchIdentifier: input.branchIdentifier ?? 'Head Office', companyType: input.companyType ?? 'LIMITED_COMPANY', services: (input.categories ?? []).join(','), serviceProvisions: serialiseServiceProvisions(input.serviceProvisions ?? []), operatingLocations: operatingLocationsFromCoverage({ coverageScope: input.coverageScope, counties: input.counties, regions: input.regions }), primaryUserId: createdUser.id } });
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
  if (user.role === 'USER') await matchRetailerToOpenTenders(user.id);

  const verificationResult = await sendVerificationEmail(user.id, user.email, request.headers);
  const verificationResponse = await completeVerificationDelivery(user.id, verificationResult, 201);
  if (!verificationResponse.ok) return verificationResponse;

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

  return verificationResponse;
}
