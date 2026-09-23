import { NextResponse } from 'next/server';
import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';
import { additionalUserSchema, createProfileUpdateSchemaForCatalog } from '@/lib/schemas/profile';
import { prisma } from '@/server/data/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { requireRole } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { isPrimaryClientUser } from '@/lib/client-company';
import { toErrorResponse } from '@/server/http/errors';
import { coverageFieldsFromOperatingLocations, normaliseOperatingLocations } from '@/lib/geography';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';
import { parseServiceProvisions, serialiseServiceProvisions } from '@/lib/service-provisions';
import { markUploadedDocumentsVerified } from '@/server/domain/verificationDocumentService';
import { INDEPENDENT_REVIEW_RESET_DATA } from '@/server/domain/independentReviewService';
import { Prisma } from '@prisma/client';
import { getCategoryCatalog } from '@/server/domain/categoryService';
import { ADDITIONAL_BUYER_DUTIES, serialiseBuyerDuties } from '@/lib/workspace-duties';
import { personNameFromAccount } from '@/lib/person-name';
import { assignMissingTradeTenderId, persistNormalisedOperatingLocations } from '@/server/domain/enterpriseRecordRepair';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
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
    const catalog = await getCategoryCatalog();
    const [account, membership, retailerProfile, warnings] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { firstName: true, lastName: true, contactName: true, email: true, contactPhone: true },
      }),
      getClientCompanyMembership(user.id),
        prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { verificationStatus: true } }),
      prisma.tenderWarning.findMany({
        where: { recipientId: user.id, active: true },
        select: { id: true, reason: true, note: true, createdAt: true, tender: { select: { reference: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const names = personNameFromAccount({
      firstName: account.firstName,
      lastName: account.lastName,
      contactName: account.contactName,
      companyName: membership?.company.companyName,
    });
    const operatingLocations = membership
      ? await persistNormalisedOperatingLocations(membership.companyId, membership.company.operatingLocations, user.id)
      : [];
    const tradeTenderId = membership
      ? await assignMissingTradeTenderId(membership.companyId, membership.company.tradeTenderId)
      : null;

    return NextResponse.json({
      firstName: names.firstName,
      lastName: names.lastName,
      email: account.email,
      phoneNumber: account.contactPhone ?? '',
      companyName: membership?.company.companyName ?? null,
      companyType: membership?.company.companyType ?? 'LIMITED_COMPANY',
      branchIdentifier: membership?.company.branchIdentifier ?? null,
      services: membership?.company.services ? membership.company.services.split(',').filter(Boolean) : [],
      serviceProvisions: parseServiceProvisions(membership?.company.serviceProvisions, membership?.company.services.split(',').filter(Boolean) ?? [], catalog),
      operatingLocations,
      releaseSpendCapGbp: membership?.company.releaseSpendCapGbp ?? null,
      tradeTenderId,
      isPrimaryUser: membership ? isPrimaryClientUser(membership.company.primaryUserId, user.id) : false,
        verificationStatus: retailerProfile?.verificationStatus ?? null,
      additionalUsers: membership && isPrimaryClientUser(membership.company.primaryUserId, user.id)
        ? await prisma.clientCompanyMember.findMany({
            where: { companyId: membership.companyId, NOT: { userId: user.id } },
            select: { id: true, duties: true, user: { select: { firstName: true, lastName: true, contactName: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          })
        : [],
        warnings: warnings.map((warning) => ({ id: warning.id, reason: warning.reason, note: warning.note, createdAt: warning.createdAt, tenderReference: warning.tender.reference })),
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
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (body && Array.isArray(body.operatingLocations)) {
      body.operatingLocations = normaliseOperatingLocations(body.operatingLocations.map((value) => String(value)));
    }
    const parsed = createProfileUpdateSchemaForCatalog(await getCategoryCatalog()).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile details', issues: parsed.error.flatten() }, { status: 400 });
    }

    const membership = await getClientCompanyMembership(user.id);
    if (!membership) return NextResponse.json({ error: 'Client company membership is required' }, { status: 409 });
    const isPrimaryUser = isPrimaryClientUser(membership.company.primaryUserId, user.id);
    const companyProfileChanged = parsed.data.services !== undefined || parsed.data.operatingLocations !== undefined || parsed.data.serviceProvisions !== undefined;
    if ((parsed.data.companyName !== undefined || parsed.data.branchIdentifier !== undefined || parsed.data.companyType !== undefined || parsed.data.services !== undefined || parsed.data.serviceProvisions !== undefined || parsed.data.operatingLocations !== undefined || parsed.data.releaseSpendCapGbp !== undefined) && !isPrimaryUser) {
      return NextResponse.json({ error: 'Only the primary user can update company details' }, { status: 403 });
    }

    const contactName = `${parsed.data.firstName} ${parsed.data.lastName}`;
    const retailerProfile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
    const newCategories = parsed.data.services !== undefined ? parsed.data.services.join(',') : retailerProfile?.categories;
    const newCompanyType = parsed.data.companyType !== undefined ? parsed.data.companyType : retailerProfile?.companyType;
    const servicesChanged = retailerProfile && (newCategories !== retailerProfile.categories || newCompanyType !== retailerProfile.companyType);

    if (servicesChanged && retailerProfile) {
      const resetVerification = retailerProfile.verificationStatus === 'VERIFIED' || retailerProfile.verificationStatus === 'PENDING';
      const resetIndependent = retailerProfile.independentReviewStatus === 'APPROVED' || retailerProfile.independentReviewStatus === 'PURCHASED';

      if (resetVerification || resetIndependent) {
        await prisma.retailerProfile.update({
          where: { id: retailerProfile.id },
          data: {
            ...(resetVerification ? {
              verificationStatus: 'UNVERIFIED',
              verificationDecidedAt: new Date(),
              verificationNote: 'Service scope changed: verification reset due to modified service requirements.',
            } : {}),
            ...(resetIndependent ? INDEPENDENT_REVIEW_RESET_DATA : {}),
          },
        });
        if (resetVerification && newCategories) {
          await markUploadedDocumentsVerified(retailerProfile.id, newCategories, false, retailerProfile.isSoleTrader);
        }
      }
    }

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
      ...(parsed.data.companyName !== undefined || parsed.data.branchIdentifier !== undefined || parsed.data.companyType !== undefined || parsed.data.services !== undefined || parsed.data.serviceProvisions !== undefined || parsed.data.operatingLocations !== undefined || parsed.data.releaseSpendCapGbp !== undefined
        ? [prisma.clientCompany.update({ where: { id: membership.companyId }, data: { ...(parsed.data.companyName !== undefined ? { companyName: parsed.data.companyName } : {}), ...(parsed.data.branchIdentifier !== undefined ? { branchIdentifier: parsed.data.branchIdentifier } : {}), ...(parsed.data.companyType !== undefined ? { companyType: parsed.data.companyType } : {}), ...(parsed.data.services !== undefined ? { services: parsed.data.services.join(',') } : {}), ...(parsed.data.serviceProvisions !== undefined ? { serviceProvisions: serialiseServiceProvisions(parsed.data.serviceProvisions) } : {}), ...(parsed.data.operatingLocations !== undefined ? { operatingLocations: parsed.data.operatingLocations.join(',') } : {}), ...(parsed.data.releaseSpendCapGbp !== undefined ? { releaseSpendCapGbp: parsed.data.releaseSpendCapGbp } : {}) } })]
        : []),
      ...(parsed.data.services !== undefined
        ? [prisma.retailerProfile.updateMany({ where: { userId: user.id }, data: { categories: parsed.data.services.join(',') } })]
        : []),
      ...(parsed.data.operatingLocations !== undefined
        ? [prisma.retailerProfile.updateMany({
            where: { userId: user.id },
            data: (() => {
              const coverage = coverageFieldsFromOperatingLocations(parsed.data.operatingLocations ?? []);
              return {
                coverageScope: coverage.coverageScope,
                counties: coverage.counties,
                regions: coverage.regions,
              };
            })(),
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
    const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid password details' }, { status: 400 });

    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!await verifyPassword(parsed.data.currentPassword, account.passwordHash)) {
      return NextResponse.json({ error: 'Unable to change password with those details' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword), sessionVersion: { increment: 1 } } });
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
    if (!parsed.success) return NextResponse.json({ error: 'Invalid additional user details', issues: parsed.error.flatten() }, { status: 400 });

    const membership = await getClientCompanyMembership(user.id);
    if (!membership || !isPrimaryClientUser(membership.company.primaryUserId, user.id)) {
      return NextResponse.json({ error: 'Only the primary user can add additional users' }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: 'A User with that email address already exists' }, { status: 409 });

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
        clientCompanyMembership: { create: { companyId: membership.companyId, duties: serialiseBuyerDuties(parsed.data.duties ?? ADDITIONAL_BUYER_DUTIES.split(',')) } },
        ...(opportunityProfile ? { retailerProfile: { create: opportunityProfile } } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, contactName: true },
    });
    await recordAuditEvent({ actorId: user.id, action: 'CLIENT_ADDITIONAL_USER_ADDED', targetType: 'User', targetId: additionalUser.id });
    if (opportunityProfile) await matchRetailerToOpenTenders(additionalUser.id);
    return NextResponse.json({ user: additionalUser }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A User with those details already exists' }, { status: 409 });
    }
    return toErrorResponse(error);
  }
}