import { prisma } from '@/server/data/prisma';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { RETAILER_UNLOCK_FEE_GBP } from '@/lib/categories';
import { ForbiddenError } from '@/server/auth/session';

async function assertMatched(tenderId: string, retailerId: string) {
  const match = await prisma.tenderMatch.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (!match) throw new ForbiddenError('Tender is not matched to this Retailer');
}

type UnlockOutcome =
  | { status: 'ALREADY_UNLOCKED' }
  | { status: 'UNLOCKED_WITH_CREDIT' }
  | { status: 'PAYMENT_REQUIRED'; paymentId: string; checkoutUrl: string | null; devMode: boolean };

/** Sole entry point for changing tender visibility for a Retailer (SEC-032/033). */
export async function requestUnlock(retailerId: string, tenderId: string): Promise<UnlockOutcome> {
  await assertMatched(tenderId, retailerId);

  const existing = await prisma.unlock.findUnique({
    where: { tenderId_retailerId: { tenderId, retailerId } },
  });
  if (existing) return { status: 'ALREADY_UNLOCKED' };

  const profile = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });
  if (profile && profile.launchCreditsLeft > 0) {
    await prisma.$transaction([
      prisma.retailerProfile.update({
        where: { userId: retailerId },
        data: { launchCreditsLeft: { decrement: 1 } },
      }),
      prisma.unlock.create({
        data: { tenderId, retailerId, method: 'CREDIT' },
      }),
    ]);
    await recordAuditEvent({
      actorId: retailerId,
      action: 'TENDER_UNLOCKED',
      targetType: 'Tender',
      targetId: tenderId,
      metadata: { method: 'CREDIT' },
    });
    return { status: 'UNLOCKED_WITH_CREDIT' };
  }

  const payment = await createPayment({ type: 'RETAILER_UNLOCK', amountGbp: RETAILER_UNLOCK_FEE_GBP, userId: retailerId });
  return { status: 'PAYMENT_REQUIRED', ...payment };
}

/** Called only after the payment is CONFIRMED (via webhook or the dev-only confirm route). */
export async function finalizeUnlockWithPayment(retailerId: string, tenderId: string, paymentId: string) {
  await assertMatched(tenderId, retailerId);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== retailerId || payment.type !== 'RETAILER_UNLOCK' || payment.status !== 'CONFIRMED') {
    throw new ForbiddenError('Payment is not a confirmed unlock payment for this Retailer');
  }

  const unlock = await prisma.unlock.upsert({
    where: { tenderId_retailerId: { tenderId, retailerId } },
    create: { tenderId, retailerId, method: 'PAID', paymentId },
    update: {},
  });

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
      budget: true,
      requirements: true,
      description: true,
      status: true,
      createdAt: true,
      items: {
        select: { id: true, category: true, subcategory: true, item: true, quantity: true, description: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
