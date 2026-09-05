import { Prisma } from '@prisma/client';
import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { assertRetailerEligibleForTender, getUserTenderServiceCategories, userOwnsTender } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';

async function assertProfessionalTender(userId: string, tenderId: string) {
  if (!await getUserTenderServiceCategories(userId).then((services) => services.includes('Professional Services'))) {
    throw new ForbiddenError('Professional Services are not active for this company');
  }
  await assertRetailerEligibleForTender(userId, tenderId);
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, status: 'OPEN', closingDate: { gt: new Date() }, items: { some: { category: 'Professional Services' } } }, select: { id: true } });
  if (!tender) throw new ForbiddenError('Professional interest is not available for this tender');
}

export async function registerProfessionalInterest(userId: string, tenderId: string) {
  await assertProfessionalTender(userId, tenderId);
  try {
    const interest = await prisma.professionalInterest.create({ data: { tenderId, retailerId: userId } });
    await recordAuditEvent({ actorId: userId, action: 'PROFESSIONAL_INTEREST_REGISTERED', targetType: 'Tender', targetId: tenderId });
    return interest;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return prisma.professionalInterest.findUniqueOrThrow({ where: { tenderId_retailerId: { tenderId, retailerId: userId } } });
    throw error;
  }
}

export async function getProfessionalInterestContact(userId: string, tenderId: string) {
  const interest = await prisma.professionalInterest.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId: userId } }, include: { tender: { select: { clientId: true, closingDate: true } } } });
  if (!interest || interest.tender.closingDate > new Date()) throw new ForbiddenError('Contact details are not available yet');
  if (!interest.releasedAt) {
    await prisma.professionalInterest.update({ where: { id: interest.id }, data: { releasedAt: new Date() } });
    await recordAuditEvent({ actorId: null, action: 'PROFESSIONAL_INTEREST_CONTACT_RELEASED', targetType: 'Tender', targetId: tenderId, metadata: { retailerId: userId } });
  }
  return prisma.user.findUniqueOrThrow({ where: { id: interest.tender.clientId }, select: { contactName: true, contactPhone: true, email: true } });
}

export async function listProfessionalInterestContacts(userId: string, tenderId: string) {
  if (!await userOwnsTender(userId, tenderId)) throw new ForbiddenError('Tender not found for this User');
  const tender = await prisma.tender.findUniqueOrThrow({ where: { id: tenderId }, select: { closingDate: true } });
  if (tender.closingDate > new Date()) return [];
  const interests = await prisma.professionalInterest.findMany({ where: { tenderId }, include: { retailer: { select: { contactName: true, contactPhone: true, email: true } } } });
  return interests.map((interest) => ({ id: interest.id, contact: interest.retailer }));
}