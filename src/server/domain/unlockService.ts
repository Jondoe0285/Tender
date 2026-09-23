import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import { assertRetailerEligibleForTender, assertTenderOpenForActivity, getUserTenderServiceProvisions, retailerMatchedCategories, tenderProvisionPackageWhere } from '@/server/domain/tenderService';
import { membershipTiersEnabled } from '@/server/domain/membershipService';
import { getTenderUnlockFeeGbp } from '@/server/domain/platformSettings';
import { consumePaymentWaiver } from '@/server/domain/paymentWaiverService';
import { HARVEST_CAP_MESSAGE, UNLOCK_HARVEST_CAP, UNLOCK_HARVEST_WINDOW_DAYS, harvestUnlockCount } from '@/lib/harvest';
import { effectiveLaunchCredits } from '@/lib/launch-credits';
import { credentialsMessage, missingCredentials } from '@/lib/package-credentials';
import { releaseSiteVisitContact } from '@/server/domain/contactReleaseService';

type UnlockOutcome =
  | { status: 'ALREADY_UNLOCKED' }
  | { status: 'UNLOCKED_WITH_CREDIT' }
  | { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' }
  | { status: 'PAYMENT_REQUIRED'; paymentId: string; checkoutUrl: string | null; devMode: boolean };

export async function assertPackageUnlockCredentials(retailerId: string, tenderId: string) {
  const [tender, profile] = await Promise.all([
    prisma.tender.findUnique({
      where: { id: tenderId },
      select: { items: { select: { category: true, subcategory: true, specJson: true } }, packages: { select: { category: true, subcategory: true, specJson: true } } },
    }),
    prisma.retailerProfile.findUnique({
      where: { userId: retailerId },
      select: { verificationDocuments: { select: { documentType: true, expiryDate: true, verified: true } } },
    }),
  ]);
  const packages = (tender?.packages.length ? tender.packages : tender?.items) ?? [];
  const missing = missingCredentials(packages, profile?.verificationDocuments ?? [], 'unlock');
  if (missing.length > 0) {
    throw new ForbiddenError(credentialsMessage(missing) || 'Required credentials are missing for this package.');
  }
}

export async function assertUnlockHarvestCap(retailerId: string) {
  const since = new Date(Date.now() - UNLOCK_HARVEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const unlocks = await prisma.unlock.findMany({
    where: { retailerId, unlockedAt: { gte: since } },
    select: { tenderId: true },
  });
  const quotes = unlocks.length === 0
    ? []
    : await prisma.quote.findMany({
      where: { retailerId, tenderId: { in: unlocks.map((unlock) => unlock.tenderId) } },
      select: { tenderId: true },
    });
  if (harvestUnlockCount(unlocks, quotes) >= UNLOCK_HARVEST_CAP) {
    throw new ForbiddenError(HARVEST_CAP_MESSAGE);
  }
}

async function releaseSiteVisitContactAfterUnlock(retailerId: string, tenderId: string, paymentId?: string | null) {
  await releaseSiteVisitContact(retailerId, tenderId, paymentId ?? null).catch(() => undefined);
}

/** Sole entry point for changing tender visibility for a Retailer (SEC-032/033). */
export async function requestUnlock(retailerId: string, tenderId: string, mobileReturnUrl?: string): Promise<UnlockOutcome> {
  await assertRetailerEligibleForTender(retailerId, tenderId);
  await assertTenderOpenForActivity(tenderId);
  await assertPackageUnlockCredentials(retailerId, tenderId);
  await assertUnlockHarvestCap(retailerId);

  const existing = await prisma.unlock.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (existing) {
    await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, existing.paymentId);
    return { status: 'ALREADY_UNLOCKED' };
  }

  const matchingCategories = await retailerMatchedCategories(retailerId, tenderId);
  const unlockFeeGbp = await getTenderUnlockFeeGbp(tenderId, matchingCategories);
  if (unlockFeeGbp <= 0) {
    await prisma.unlock.create({ data: { tenderId, retailerId, method: 'WAIVED' } });
    await recordAuditEvent({
      actorId: retailerId,
      action: 'TENDER_UNLOCKED',
      targetType: 'Tender',
      targetId: tenderId,
      metadata: { method: 'WAIVED', feeGbp: 0 },
    });
    await releaseSiteVisitContactAfterUnlock(retailerId, tenderId);
    return { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' };
  }

  const waiverUse = await consumePaymentWaiver({ userId: retailerId, feeType: 'RETAILER_UNLOCK', tenderId });
  if (waiverUse) {
    try {
      await prisma.unlock.create({ data: { tenderId, retailerId, method: 'WAIVED', paymentId: waiverUse.payment.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, waiverUse.payment.id);
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
    await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, waiverUse.payment.id);
    return { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' };
  }

  const profile = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });
  const remainingCredits = effectiveLaunchCredits(profile?.launchCreditsLeft ?? 0, profile?.launchCreditsExpireAt);
  if (profile && profile.launchCreditsLeft > 0 && remainingCredits === 0) {
    await prisma.retailerProfile.update({ where: { userId: retailerId }, data: { launchCreditsLeft: 0 } });
  }
  if (profile && remainingCredits > 0) {
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
      await releaseSiteVisitContactAfterUnlock(retailerId, tenderId);
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
        await releaseSiteVisitContactAfterUnlock(retailerId, tenderId);
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
  if (existingUnlock) {
    await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, paymentId);
    return existingUnlock;
  }

  let unlock;
  try {
    unlock = await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID', paymentId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrentUnlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
      if (concurrentUnlock) {
        await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, paymentId);
        return concurrentUnlock;
      }
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
  await releaseSiteVisitContactAfterUnlock(retailerId, tenderId, paymentId);

  return unlock;
}

/** Full tender detail is only returned once an Unlock row exists for this Retailer (SEC-034/038). */
export async function getUnlockedTenderForRetailer(retailerId: string, tenderId: string) {
  const unlock = await prisma.unlock.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (!unlock) throw new ForbiddenError('Tender has not been unlocked by this Retailer');
  const provisions = await getUserTenderServiceProvisions(retailerId);
  if (provisions.length === 0) throw new ForbiddenError('No active company services are configured');
  const provisionWhere = tenderProvisionPackageWhere(provisions);

  // Client identity is withheld on this object. Site-visit contact is a separate authorised payload (SEC-034).
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
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true, kind: true, version: true },
      },
      items: {
        where: provisionWhere,
        select: { id: true, category: true, subcategory: true, item: true, quantity: true, description: true, specJson: true },
        orderBy: { createdAt: 'asc' },
      },
      packages: {
        where: provisionWhere,
        select: {
          id: true,
          reference: true,
          category: true,
          subcategory: true,
          service: true,
          item: true,
          quantity: true,
          description: true,
          specJson: true,
          revision: true,
          specHash: true,
          issuedAt: true,
          packageIndex: true,
          urgency: true,
          closingDate: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
