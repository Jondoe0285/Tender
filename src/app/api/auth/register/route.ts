import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { hashPassword } from '@/server/auth/password';
import { registerSchema } from '@/lib/schemas/register';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { verifyPassword } from '@/server/auth/password';
import { newRegistrationTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  }
  const input = parsed.data;

  if (input.role === 'RETAILER' && !input.companyName) {
    return NextResponse.json({ error: 'Company name is required for Retailer accounts' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roleMemberships: true },
  });
  if (existing) {
    const validPassword = await verifyPassword(input.password, existing.passwordHash);
    const hasRole = existing.roleMemberships.some((membership) => membership.role === input.role) || existing.role === input.role;
    if (!validPassword || hasRole || existing.suspended) {
      return NextResponse.json({ error: 'Unable to complete registration with those details' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.userRole.create({ data: { userId: existing.id, role: input.role } }),
      ...(input.role === 'RETAILER'
        ? [
            prisma.retailerProfile.create({
              data: {
                userId: existing.id,
                companyName: input.companyName ?? '',
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            }),
          ]
        : []),
    ]);
    await recordAuditEvent({
      actorId: existing.id,
      action: 'WORKSPACE_ADDED',
      targetType: 'User',
      targetId: existing.id,
      metadata: { role: input.role },
    });
    return NextResponse.json({ status: 'workspace_added' });
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      contactName: input.contactName,
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

  await recordAuditEvent({
    actorId: user.id,
    action: 'ACCOUNT_REGISTERED',
    targetType: 'User',
    targetId: user.id,
    metadata: { role: user.role },
  });

  const notificationRecipient = process.env.REGISTRATION_NOTIFICATION_EMAIL ?? 'info@sinclairsafetysolutions.co.uk';
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

  return NextResponse.json({ status: 'ok' });
}
