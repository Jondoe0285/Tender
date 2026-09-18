import { Prisma } from '@prisma/client';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { assertRetailerEligibleForTender, assertTenderOpenForActivity, userOwnsTender } from '@/server/domain/tenderService';
import { getPaymentFeeGbp, isDirectContactActive } from '@/server/domain/platformSettings';
import { createPayment } from '@/server/payments/paymentService';

const DIRECT_CONTACT_CATEGORIES = new Set(['Contractor Services', 'Professional Services']);

export async function directContactAvailableForTender(tenderId: string): Promise<boolean> {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { category: true, items: { select: { category: true } }, packages: { select: { category: true } } },
  });
  if (!tender) return false;
  return [tender.category, ...tender.items.map((item) => item.category), ...tender.packages.map((pkg) => pkg.category)].some((category) => DIRECT_CONTACT_CATEGORIES.has(category));
}

export async function getDirectContactStatus(userId: string, tenderId: string) {
  const [active, available, feeGbp, request] = await Promise.all([
    isDirectContactActive(),
    directContactAvailableForTender(tenderId),
    getPaymentFeeGbp('DIRECT_CONTACT'),
    prisma.directContactRequest.findUnique({ where: { tenderId_requesterId: { tenderId, requesterId: userId } }, include: { payment: true } }),
  ]);
  return { active, available, feeGbp, request };
}

export async function requestDirectContact(userId: string, tenderId: string) {
  if (!await isDirectContactActive()) throw new ForbiddenError('Direct contact requests are not active');
  if (!await directContactAvailableForTender(tenderId)) throw new ForbiddenError('Direct contact is only available for Contractor Services and Professional Services tenders');
  await assertRetailerEligibleForTender(userId, tenderId);
  await assertTenderOpenForActivity(tenderId);

  const existing = await prisma.directContactRequest.findUnique({ where: { tenderId_requesterId: { tenderId, requesterId: userId } }, include: { payment: true } });
  if (existing?.releasedAt) return { status: 'RELEASED' as const };
  if (existing?.payment?.status === 'PENDING') return { status: 'PAYMENT_REQUIRED' as const, paymentId: existing.payment.id, checkoutUrl: existing.payment.stripeCheckoutUrl, devMode: !existing.payment.stripeCheckoutUrl, feeGbp: existing.payment.amountGbp, vatGbp: existing.payment.vatGbp, totalAmountGbp: existing.payment.totalAmountGbp };

  const payment = await createPayment({ type: 'DIRECT_CONTACT', userId, tenderId });
  try {
    await prisma.directContactRequest.upsert({
      where: { tenderId_requesterId: { tenderId, requesterId: userId } },
      update: { paymentId: payment.paymentId },
      create: { tenderId, requesterId: userId, paymentId: payment.paymentId },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
  await recordAuditEvent({ actorId: userId, action: 'DIRECT_CONTACT_REQUESTED', targetType: 'Tender', targetId: tenderId, metadata: { paymentId: payment.paymentId } });
  return { status: 'PAYMENT_REQUIRED' as const, ...payment, feeGbp: payment.amountGbp };
}

export async function finalizeDirectContactWithPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== userId || payment.type !== 'DIRECT_CONTACT' || payment.status !== 'CONFIRMED' || !payment.tenderId) {
    throw new ForbiddenError('Payment is not a confirmed direct-contact payment');
  }
  const request = await prisma.directContactRequest.update({
    where: { paymentId },
    data: { releasedAt: new Date() },
  });
  await recordAuditEvent({ actorId: userId, action: 'DIRECT_CONTACT_RELEASED', targetType: 'Tender', targetId: payment.tenderId, metadata: { paymentId, requesterId: request.requesterId } });
  return request;
}

export async function listDirectContactRequestsForTender(userId: string, tenderId: string) {
  if (!await userOwnsTender(userId, tenderId)) throw new ForbiddenError('Tender not found for this User');
  return prisma.directContactRequest.findMany({
    where: { tenderId, releasedAt: { not: null } },
    orderBy: { releasedAt: 'desc' },
    include: { requester: { select: { contactName: true, contactPhone: true, email: true, retailerProfile: { select: { companyName: true, categories: true } } } } },
  });
}