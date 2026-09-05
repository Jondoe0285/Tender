import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { requireRole } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { isPrimaryClientUser } from '@/lib/client-company';
import { toErrorResponse } from '@/server/http/errors';
import { SERVICE_CATALOG, SERVICE_NAMES } from '@/lib/categories';
import { UK_COUNTIES, UK_REGIONS } from '@/lib/geography';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';

const COMPANY_OPERATING_LOCATIONS = ['United Kingdom', ...UK_COUNTIES, ...UK_REGIONS] as const;

const personalProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phoneNumber: z.string().trim().max(40).optional(),
});

const profileUpdateSchema = personalProfileSchema.extend({
  companyName: z.string().trim().min(2).max(160).optional(),
  branchIdentifier: z.string().trim().min(2).max(120).optional(),
  services: z.array(z.enum(SERVICE_NAMES)).max(SERVICE_NAMES.length).optional(),
  serviceProvisions: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  operatingLocations: z.array(z.enum(COMPANY_OPERATING_LOCATIONS)).max(COMPANY_OPERATING_LOCATIONS.length).optional(),
}).superRefine((value, context) => {
  if (value.serviceProvisions === undefined) return;
  const selectedServices = new Set(value.services ?? []);
  value.serviceProvisions.forEach((entry, index) => {
    const [service, provision] = entry.split('::');
    const categories = SERVICE_CATALOG[service as keyof typeof SERVICE_CATALOG];
    if (!service || !provision || !selectedServices.has(service as typeof SERVICE_NAMES[number]) || !categories || !(provision in categories)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProvisions', index], message: 'Select valid provisions for the services offered by your company' });
    }
  });
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
    const user = await requireRole('USER');
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
      branchIdentifier: membership?.company.branchIdentifier ?? null,
      services: membership?.company.services ? membership.company.services.split(',').filter(Boolean) : [],
      serviceProvisions: membership?.company.serviceProvisions ? membership.company.serviceProvisions.split(',').filter(Boolean) : [],
      operatingLocations: membership?.company.operatingLocations ? membership.company.operatingLocations.split(',').filter(Boolean) : [],
      tradeTenderId: membership?.company.tradeTenderId ?? null,
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
    const user = await requireRole('USER');
    const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid profile details' }, { status: 400 });

    const membership = await getClientCompanyMembership(user.id);
    if (!membership) return NextResponse.json({ error: 'Client company membership is required' }, { status: 409 });
    const isPrimaryUser = isPrimaryClientUser(membership.company.primaryUserId, user.id);
    const companyProfileChanged = parsed.data.services !== undefined || parsed.data.operatingLocations !== undefined;
    if ((parsed.data.companyName !== undefined || parsed.data.branchIdentifier !== undefined || parsed.data.services !== undefined || parsed.data.serviceProvisions !== undefined || parsed.data.operatingLocations !== undefined) && !isPrimaryUser) {
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
      ...(parsed.data.companyName !== undefined || parsed.data.branchIdentifier !== undefined || parsed.data.services !== undefined || parsed.data.serviceProvisions !== undefined || parsed.data.operatingLocations !== undefined
        ? [prisma.clientCompany.update({ where: { id: membership.companyId }, data: { ...(parsed.data.companyName !== undefined ? { companyName: parsed.data.companyName } : {}), ...(parsed.data.branchIdentifier !== undefined ? { branchIdentifier: parsed.data.branchIdentifier } : {}), ...(parsed.data.services !== undefined ? { services: parsed.data.services.join(',') } : {}), ...(parsed.data.serviceProvisions !== undefined ? { serviceProvisions: parsed.data.serviceProvisions.join(',') } : {}), ...(parsed.data.operatingLocations !== undefined ? { operatingLocations: parsed.data.operatingLocations.join(',') } : {}) } })]
        : []),
      ...(parsed.data.services !== undefined
        ? [prisma.retailerProfile.updateMany({ where: { userId: user.id }, data: { categories: parsed.data.services.join(',') } })]
        : []),
      ...(parsed.data.operatingLocations !== undefined
        ? [prisma.retailerProfile.updateMany({
            where: { userId: user.id },
            data: {
              coverageScope: parsed.data.operatingLocations.includes('United Kingdom') ? 'UK' : parsed.data.operatingLocations.some((location) => UK_REGIONS.includes(location as typeof UK_REGIONS[number])) ? 'REGION' : 'COUNTY',
              counties: parsed.data.operatingLocations.filter((location) => UK_COUNTIES.includes(location as typeof UK_COUNTIES[number])).join(','),
              regions: parsed.data.operatingLocations.filter((location) => UK_REGIONS.includes(location as typeof UK_REGIONS[number])).join(','),
            },
          })]
        : []),
    ]);
    if (companyProfileChanged) await matchRetailerToOpenTenders(user.id);
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
    const user = await requireRole('USER');
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
    const user = await requireRole('USER');
    const parsed = additionalUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid additional user details' }, { status: 400 });

    const membership = await getClientCompanyMembership(user.id);
    if (!membership || !isPrimaryClientUser(membership.company.primaryUserId, user.id)) {
      return NextResponse.json({ error: 'Only the primary user can add additional users' }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: 'Unable to add a user with those details' }, { status: 409 });

    const opportunityProfile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
      select: { companyName: true, companyNumber: true, address: true, coverageScope: true, counties: true, regions: true, categories: true, coverageAreas: true, accreditations: true },
    });

    const contactName = `${parsed.data.firstName} ${parsed.data.lastName}`;
    const additionalUser = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: 'USER',
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        contactName,
        contactPhone: parsed.data.phoneNumber || null,
        termsAcceptedAt: new Date(),
        roleMemberships: { create: { role: 'USER' } },
        clientCompanyMembership: { create: { companyId: membership.companyId } },
        ...(opportunityProfile ? { retailerProfile: { create: opportunityProfile } } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, contactName: true },
    });
    await recordAuditEvent({ actorId: user.id, action: 'CLIENT_ADDITIONAL_USER_ADDED', targetType: 'User', targetId: additionalUser.id });
    if (opportunityProfile) await matchRetailerToOpenTenders(additionalUser.id);
    return NextResponse.json({ user: additionalUser }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}