import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { requireRole } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { isPrimaryClientUser } from '@/lib/client-company';
import { toErrorResponse } from '@/server/http/errors';

const personalProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phoneNumber: z.string().trim().max(40).optional(),
});

const profileUpdateSchema = personalProfileSchema.extend({
  companyName: z.string().trim().min(2).max(160).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

const additionalUserSchema = personalProfileSchema.extend({
  password: z.string().min(10).max(200),
});

async function getClientCompanyMembership(userId: string) {
  return prisma.clientCompanyMember.findUnique({
    where: { userId },
    include: { company: true },
  });
}

export async function GET() {
  try {
    const user = await requireRole('CLIENT');
    const [account, membership] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { firstName: true, lastName: true, contactName: true, email: true, contactPhone: true },
      }),
      getClientCompanyMembership(user.id),
    ]);

    return NextResponse.json({
      firstName: account.firstName ?? account.contactName.split(' ')[0] ?? '',
      lastName: account.lastName ?? account.contactName.split(' ').slice(1).join(' '),
      email: account.email,
      phoneNumber: account.contactPhone ?? '',
      companyName: membership?.company.companyName ?? null,
      isPrimaryUser: membership ? isPrimaryClientUser(membership.company.primaryUserId, user.id) : false,
      additionalUsers: membership && isPrimaryClientUser(membership.company.primaryUserId, user.id)
        ? await prisma.clientCompanyMember.findMany({
            where: { companyId: membership.companyId, NOT: { userId: user.id } },
            select: { id: true, user: { select: { firstName: true, lastName: true, contactName: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          })
        : [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CLIENT');
    const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid profile details' }, { status: 400 });

    const membership = await getClientCompanyMembership(user.id);
    if (!membership) return NextResponse.json({ error: 'Client company membership is required' }, { status: 409 });
    const isPrimaryUser = isPrimaryClientUser(membership.company.primaryUserId, user.id);
    if (parsed.data.companyName !== undefined && !isPrimaryUser) {
      return NextResponse.json({ error: 'Only the primary user can update company details' }, { status: 403 });
    }

    const contactName = `${parsed.data.firstName} ${parsed.data.lastName}`;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          contactName,
          email: parsed.data.email,
          contactPhone: parsed.data.phoneNumber || null,
        },
      }),
      ...(parsed.data.companyName !== undefined
        ? [prisma.clientCompany.update({ where: { id: membership.companyId }, data: { companyName: parsed.data.companyName } })]
        : []),
    ]);
    await recordAuditEvent({ actorId: user.id, action: 'CLIENT_PROFILE_UPDATED', targetType: 'User', targetId: user.id });
    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CLIENT');
    const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid password details' }, { status: 400 });

    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!await verifyPassword(parsed.data.currentPassword, account.passwordHash)) {
      return NextResponse.json({ error: 'Unable to change password with those details' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
    await recordAuditEvent({ actorId: user.id, action: 'CLIENT_PASSWORD_CHANGED', targetType: 'User', targetId: user.id });
    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('CLIENT');
    const parsed = additionalUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid additional user details' }, { status: 400 });

    const membership = await getClientCompanyMembership(user.id);
    if (!membership || !isPrimaryClientUser(membership.company.primaryUserId, user.id)) {
      return NextResponse.json({ error: 'Only the primary user can add additional users' }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: 'Unable to add a user with those details' }, { status: 409 });

    const contactName = `${parsed.data.firstName} ${parsed.data.lastName}`;
    const additionalUser = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: 'CLIENT',
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        contactName,
        contactPhone: parsed.data.phoneNumber || null,
        termsAcceptedAt: new Date(),
        roleMemberships: { create: { role: 'CLIENT' } },
        clientCompanyMembership: { create: { companyId: membership.companyId } },
      },
      select: { id: true, email: true, firstName: true, lastName: true, contactName: true },
    });
    await recordAuditEvent({ actorId: user.id, action: 'CLIENT_ADDITIONAL_USER_ADDED', targetType: 'User', targetId: additionalUser.id });
    return NextResponse.json({ user: additionalUser }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}