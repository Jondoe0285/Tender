import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import { assertRetailerEligibleForTender, assertTenderOpenForActivity, getUserTenderServiceCategories } from '@/server/domain/tenderService';
import { membershipTiersEnabled } from '@/server/domain/membershipService';
import { getTenderUnlockFeeGbp } from '@/server/domain/platformSettings';
import { consumePaymentWaiver } from '@/server/domain/paymentWaiverService';

type UnlockOutcome =
  | { status: 'ALREADY_UNLOCKED' }
  | { status: 'UNLOCKED_WITH_CREDIT' }
  | { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' }
  | { status: 'PAYMENT_REQUIRED'; paymentId: string; checkoutUrl: string | null; devMode: boolean };

/** Sole entry point for changing tender visibility for a Retailer (SEC-032/033). */
export async function requestUnlock(retailerId: string, tenderId: string, mobileReturnUrl?: string): Promise<UnlockOutcome> {
  await assertRetailerEligibleForTender(retailerId, tenderId);
  await assertTenderOpenForActivity(tenderId);

  const existing = await prisma.unlock.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (existing) return { status: 'ALREADY_UNLOCKED' };

  const unlockFeeGbp = await getTenderUnlockFeeGbp(tenderId);
  if (unlockFeeGbp <= 0) {
    await prisma.unlock.create({ data: { tenderId, retailerId, method: 'WAIVED' } });
    await recordAuditEvent({
      actorId: retailerId,
      action: 'TENDER_UNLOCKED',
      targetType: 'Tender',
      targetId: tenderId,
      metadata: { method: 'WAIVED', feeGbp: 0 },
    });
    return { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' };
  }

  const waiverUse = await consumePaymentWaiver({ userId: retailerId, feeType: 'RETAILER_UNLOCK', tenderId });
  if (waiverUse) {
    try {
      await prisma.unlock.create({ data: { tenderId, retailerId, method: 'WAIVED', paymentId: waiverUse.payment.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { status: 'ALREADY_UNLOCKED' };
      }
      throw error;
    }
    await recordAuditEvent({
      actorId: retailerId,
      action: 'TENDER_UNLOCKED',
      targetType: 'Tender',
      targetId: tenderId,
      metadata: { method: 'WAIVED', paymentId: waiverUse.payment.id, paymentWaiverId: waiverUse.waiver.id },
    });
    return { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' };
  }

  const profile = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });
  if (profile && profile.launchCreditsLeft > 0) {
    // Conditional update guards against two concurrent requests spending the same last credit.
    const spent = await prisma.retailerProfile.updateMany({
      where: { userId: retailerId, launchCreditsLeft: { gt: 0 } },
      data: { launchCreditsLeft: { decrement: 1 } },
    });
    if (spent.count > 0) {
      await prisma.unlock.create({ data: { tenderId, retailerId, method: 'CREDIT' } });
      await recordAuditEvent({
        actorId: retailerId,
        action: 'TENDER_UNLOCKED',
        targetType: 'Tender',
        targetId: tenderId,
        metadata: { method: 'CREDIT' },
      });
      return { status: 'UNLOCKED_WITH_CREDIT' };
    }
  }

  if (await membershipTiersEnabled()) {
    const currentMonthStart = new Date();
    currentMonthStart.setUTCDate(1);
    currentMonthStart.setUTCHours(0, 0, 0, 0);
    const membership = await prisma.retailerMembership.findFirst({
      where: { retailerId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], tier: { active: true } },
      include: { tier: true },
      orderBy: { assignedAt: 'desc' },
    });
    if (membership) {
      const monthlyUnlockCount = await prisma.unlock.count({ where: { retailerId, unlockedAt: { gte: currentMonthStart } } });
      if (monthlyUnlockCount < membership.tier.freeTenderOpportunitiesPerMonth) {
        await prisma.unlock.create({ data: { tenderId, retailerId, method: 'CREDIT' } });
        await recordAuditEvent({ actorId: retailerId, action: 'TENDER_UNLOCKED', targetType: 'Tender', targetId: tenderId, metadata: { method: 'MEMBERSHIP', tierId: membership.tierId, monthlyAllowance: membership.tier.freeTenderOpportunitiesPerMonth } });
        return { status: 'UNLOCKED_WITH_CREDIT' };
      }
      const payment = await createPayment({ type: 'RETAILER_UNLOCK', userId: retailerId, tenderId, mobileReturnUrl, discountPercentage: membership.tier.additionalCreditDiscountPercentage });
      return { status: 'PAYMENT_REQUIRED', ...payment };
    }
  }

  const payment = await createPayment({ type: 'RETAILER_UNLOCK', userId: retailerId, tenderId, mobileReturnUrl });
  return { status: 'PAYMENT_REQUIRED', ...payment };
}

/** Called only after the payment is CONFIRMED (via webhook or the dev-only confirm route). */
export async function finalizeUnlockWithPayment(retailerId: string, tenderId: string, paymentId: string) {
  await assertRetailerEligibleForTender(retailerId, tenderId);
  await assertTenderOpenForActivity(tenderId);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== retailerId || payment.tenderId !== tenderId || payment.type !== 'RETAILER_UNLOCK' || payment.status !== 'CONFIRMED') {
    throw new ForbiddenError('Payment is not a confirmed unlock payment for this Retailer');
  }

  const existingUnlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
  if (existingUnlock) return existingUnlock;

  let unlock;
  try {
    unlock = await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID', paymentId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrentUnlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
      if (concurrentUnlock) return concurrentUnlock;
    }
    throw error;
  }

  await recordAuditEvent({
    actorId: retailerId,
    action: 'TENDER_UNLOCKED',
    targetType: 'Tender',
    targetId: tenderId,
    metadata: { method: 'PAID', paymentId },
  });

  return unlock;
}

/** Full tender detail is only returned once an Unlock row exists for this Retailer (SEC-034/038). */
export async function getUnlockedTenderForRetailer(retailerId: string, tenderId: string) {
  const unlock = await prisma.unlock.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (!unlock) throw new ForbiddenError('Tender has not been unlocked by this Retailer');
  const serviceCategories = await getUserTenderServiceCategories(retailerId);
  if (serviceCategories.length === 0) throw new ForbiddenError('No active company services are configured');

  // Client identity (clientId) is withheld even after unlock — anonymity holds until contact release (SEC-034).
  return prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    select: {
      id: true,
      reference: true,
      category: true,
      subcategory: true,
      location: true,
      quantity: true,
      urgency: true,
      closingDate: true,
      supplyDate: true,
      requirements: true,
      description: true,
      status: true,
      createdAt: true,
      attachments: {
        where: { id: { in: [] } },
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
      },
      items: {
        where: { category: { in: serviceCategories } },
        select: { id: true, category: true, subcategory: true, item: true, quantity: true, description: true },
        orderBy: { createdAt: 'asc' },
      },
      packages: {
        where: { category: { in: serviceCategories } },
        select: {
          id: true,
          reference: true,
          category: true,
          subcategory: true,
          service: true,
          item: true,
          quantity: true,
          description: true,
          urgency: true,
          closingDate: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
