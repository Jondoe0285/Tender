import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { isManagedAccountRole } from '@/lib/admin-permissions';
import { hashPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { registerSchema } from '@/lib/schemas/register';
import { createPasswordResetToken, PASSWORD_RESET_EXPIRY_LABEL } from '@/server/auth/passwordReset';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { accountCreatedByAdminTemplate, appUrl } from '@/server/notifications/emailTemplates';

/**
 * Invites the account holder to set their own password. Delivery failure must not roll back
 * the account, so the outcome is recorded in the audit log and returned to the Super User.
 */
async function sendAccountInvitation(user: { id: string; email: string; contactName: string }, role: 'CONTRACTOR' | 'PROVIDER', companyName: string | undefined, actorId: string) {
  const token = await createPasswordResetToken(user.id);
  const result = await sendTransactionalEmail(
    user.email,
    accountCreatedByAdminTemplate({
      role,
      contactName: user.contactName,
      companyName,
      resetLink: appUrl(`/reset-password?token=${encodeURIComponent(token)}`),
      expiresIn: PASSWORD_RESET_EXPIRY_LABEL,
    })
  ).catch((error: unknown) => ({ sent: false as const, reason: error instanceof Error ? error.message : 'Email delivery failed' }));

  await recordAuditEvent({
    actorId,
    action: result.sent ? 'USER_INVITATION_SENT' : 'USER_INVITATION_FAILED',
    targetType: 'User',
    targetId: user.id,
    metadata: { email: user.email, role },
  });

  return result.sent;
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  // Accountant sub-accounts are Super Users but must never create accounts.
  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 });
  }

  const input = parsed.data;
  if (!isManagedAccountRole(input.role)) {
    return NextResponse.json({ error: 'Only Client and Retailer accounts can be created by the Super User' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roleMemberships: true },
  });

  if (existing) {
    const hasRole = existing.roleMemberships.some((membership) => membership.role === input.role) || existing.role === input.role;
    if (hasRole || existing.suspended) {
      return NextResponse.json({ error: 'That account already has this role or is suspended' }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.userRole.create({ data: { userId: existing.id, role: input.role } }),
      ...(input.role === 'PROVIDER'
        ? [
            prisma.retailerProfile.upsert({
              where: { userId: existing.id },
              update: {
                companyName: input.companyName ?? existing.contactName,
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
              create: {
                userId: existing.id,
                companyName: input.companyName ?? existing.contactName,
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            }),
          ]
        : []),
    ]);

    await recordAuditEvent({
      actorId: admin.id,
      action: 'USER_ROLE_ADDED',
      targetType: 'User',
      targetId: existing.id,
      metadata: { role: input.role, email: input.email },
    });

    const roleInvitationSent = await sendAccountInvitation(existing, input.role, input.companyName, admin.id);

    return NextResponse.json({ status: 'role_added', accountId: existing.id, invitationSent: roleInvitationSent }, { status: 200 });
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
      ...(input.role === 'PROVIDER'
        ? {
            retailerProfile: {
              create: {
                companyName: input.companyName ?? input.contactName,
                categories: (input.categories ?? []).join(','),
                coverageAreas: input.coverageAreas ?? '',
              },
            },
          }
        : {}),
    },
  });

  await recordAuditEvent({
    actorId: admin.id,
    action: 'USER_ACCOUNT_CREATED',
    targetType: 'User',
    targetId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  const invitationSent = await sendAccountInvitation(user, input.role, input.companyName, admin.id);

  return NextResponse.json({ status: 'created', accountId: user.id, invitationSent }, { status: 201 });
}
