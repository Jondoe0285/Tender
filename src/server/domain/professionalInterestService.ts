import { Prisma } from '@prisma/client';
import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { assertRetailerEligibleForTender, getUserTenderServiceCategories, userOwnsTender } from '@/server/domain/tenderService';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { confirmPayment, createPayment } from '@/server/payments/paymentService';
import { prisma } from '@/server/data/prisma';

function isPaidInterest(payment: { status: string } | null | undefined) {
  return payment?.status === 'CONFIRMED';
}

async function assertProfessionalTender(userId: string, tenderId: string) {
  if (!await getUserTenderServiceCategories(userId).then((services) => services.includes('Professional Services'))) {
    throw new ForbiddenError('Professional Services are not active for this company');
  }
  await assertRetailerEligibleForTender(userId, tenderId);
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, status: 'OPEN', closingDate: { gt: new Date() }, items: { some: { category: 'Professional Services' } } }, select: { id: true } });
  if (!tender) throw new ForbiddenError('Professional interest is not available for this tender');
}

export async function getProfessionalInterestStatus(userId: string, tenderId: string) {
  const [feeGbp, interest] = await Promise.all([
    getPaymentFeeGbp('PROFESSIONAL_INTEREST'),
    prisma.professionalInterest.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId: userId } }, include: { payment: true } }),
  ]);
  return { feeGbp, interest };
}

export async function registerProfessionalInterest(userId: string, tenderId: string) {
  await assertProfessionalTender(userId, tenderId);

  const existing = await prisma.professionalInterest.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId: userId } },
    include: { payment: true },
  });
  if (isPaidInterest(existing?.payment)) return { status: 'REGISTERED' as const };
  if (existing?.payment?.status === 'PENDING') {
    return {
      status: 'PAYMENT_REQUIRED' as const,
      paymentId: existing.payment.id,
      checkoutUrl: existing.payment.stripeCheckoutUrl,
      devMode: !existing.payment.stripeCheckoutUrl,
      feeGbp: existing.payment.amountGbp,
      vatGbp: existing.payment.vatGbp,
      totalAmountGbp: existing.payment.totalAmountGbp,
    };
  }

  const payment = await createPayment({ type: 'PROFESSIONAL_INTEREST', userId, tenderId });
  try {
    await prisma.professionalInterest.upsert({
      where: { tenderId_retailerId: { tenderId, retailerId: userId } },
      update: { paymentId: payment.paymentId },
      create: { tenderId, retailerId: userId, paymentId: payment.paymentId },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
  await recordAuditEvent({ actorId: userId, action: 'PROFESSIONAL_INTEREST_PAYMENT_CREATED', targetType: 'Tender', targetId: tenderId, metadata: { paymentId: payment.paymentId } });

  if (payment.amountGbp <= 0) {
    await confirmPayment(payment.paymentId);
    await finalizeProfessionalInterestWithPayment(userId, payment.paymentId);
    return { status: 'REGISTERED' as const, paymentId: payment.paymentId, checkoutUrl: null, devMode: false, feeGbp: 0, vatGbp: 0, totalAmountGbp: 0 };
  }

  return { status: 'PAYMENT_REQUIRED' as const, ...payment, feeGbp: payment.amountGbp };
}

export async function finalizeProfessionalInterestWithPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== userId || payment.type !== 'PROFESSIONAL_INTEREST' || payment.status !== 'CONFIRMED' || !payment.tenderId) {
    throw new ForbiddenError('Payment is not a confirmed professional interest payment');
  }
  const interest = await prisma.professionalInterest.update({
    where: { paymentId },
    data: { interestedAt: payment.confirmedAt ?? new Date() },
  });
  await recordAuditEvent({ actorId: userId, action: 'PROFESSIONAL_INTEREST_REGISTERED', targetType: 'Tender', targetId: payment.tenderId, metadata: { paymentId, retailerId: interest.retailerId } });
  return interest;
}

export async function getProfessionalInterestContact(userId: string, tenderId: string) {
  const interest = await prisma.professionalInterest.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId: userId } },
    include: { tender: { select: { clientId: true, closingDate: true } }, payment: { select: { status: true } } },
  });
  if (!interest || !isPaidInterest(interest.payment) || interest.tender.closingDate > new Date()) {
    throw new ForbiddenError('Contact details are not available yet');
  }
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
  const interests = await prisma.professionalInterest.findMany({
    where: { tenderId, payment: { status: 'CONFIRMED' } },
    include: { retailer: { select: { contactName: true, contactPhone: true, email: true } } },
  });
  return interests.map((interest) => ({ id: interest.id, contact: interest.retailer }));
}
