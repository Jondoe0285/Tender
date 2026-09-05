import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { buildQuoteReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError, ValidationError } from '@/server/auth/session';
import type { SubmitQuoteInput } from '@/lib/schemas/quote';
import { quoteReceivedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { enforceContentModeration } from '@/server/moderation/contentModeration';
import { sponsoredPlacementEnabled } from '@/server/domain/sponsoredPlacementService';
import { getClientReleaseFeeGbp } from '@/server/domain/platformSettings';
import { assertRetailerEligibleForTender, assertTenderOpenForActivity, getUserTenderServiceCategories, userOwnsTender } from '@/server/domain/tenderService';

export function isQuoteRetentionLocked(retentionLockedUntil: Date | null | undefined, now = new Date()): boolean {
  return retentionLockedUntil !== null && retentionLockedUntil !== undefined && retentionLockedUntil > now;
}

/** Deletes only quotes outside the mandatory retention window. Callers must authorize the actor. */
export async function deleteQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      retentionLockedUntil: true,
      legalHolds: { where: { releasedAt: null }, select: { id: true } },
      tender: { select: { legalHolds: { where: { releasedAt: null }, select: { id: true } } } },
    },
  });
  if (!quote) return null;
  if (quote.legalHolds.length > 0 || quote.tender.legalHolds.length > 0) {
    throw new ForbiddenError('An active legal hold prevents quote deletion');
  }
  if (isQuoteRetentionLocked(quote.retentionLockedUntil)) {
    throw new ForbiddenError('Accepted quotes are retained for five years and cannot be deleted');
  }
  return prisma.quote.delete({ where: { id: quoteId } });
}

/** A Retailer may only submit a quote for a tender they have legitimately unlocked (FR-040). */
export async function submitQuote(retailerId: string, tenderId: string, input: SubmitQuoteInput) {
  const unlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
  if (!unlock) throw new ForbiddenError('Tender has not been unlocked by this Retailer');
  await assertRetailerEligibleForTender(retailerId, tenderId);
  await assertTenderOpenForActivity(tenderId);

  await enforceContentModeration(retailerId, 'QUOTE_SUBMISSION', [
    { name: 'delivery information', value: input.deliveryInfo },
    ...input.charges.map((charge, index) => ({ name: `quote item ${index + 1} description`, value: charge.description })),
  ]);

  const serviceCategories = await getUserTenderServiceCategories(retailerId);
  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: { client: { select: { email: true } }, items: { where: { category: { in: serviceCategories } }, select: { id: true } } },
  });
  if (tender.supplyDate && !input.deliveryDateConfirmed) {
    throw new ValidationError('Confirm you can deliver on the requested supply date');
  }
  const submittedItemIds = input.lineItems.map((line) => line.tenderItemId);
  const expectedItemIds = new Set(tender.items.map((item) => item.id));
  if (
    submittedItemIds.length !== tender.items.length
    || new Set(submittedItemIds).size !== submittedItemIds.length
    || submittedItemIds.some((itemId) => !expectedItemIds.has(itemId))
  ) {
    throw new ValidationError('Provide a price or mark each tender item unavailable');
  }
  const priceGbp = input.lineItems.reduce((total, line) => total + (line.available ? line.priceGbp : 0), 0)
    + input.charges.reduce((total, charge) => total + charge.priceGbp, 0);
  const existingQuoteCount = await prisma.quote.count({ where: { tenderId } });
  const quoteData = {
      tenderId,
      retailerId,
      priceGbp,
      leadTimeDays: input.leadTimeDays,
      deliveryDateConfirmed: input.deliveryDateConfirmed,
      deliveryInfo: input.deliveryInfo,
      validityDays: input.validityDays,
      status: 'SUBMITTED' as const,
      lines: { create: input.lineItems },
      charges: { create: input.charges },
  };

  let quote;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      quote = await prisma.quote.create({
        data: { ...quoteData, reference: buildQuoteReference(tender.reference, existingQuoteCount + attempt + 1) },
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || attempt === 4) throw error;
    }
  }
  if (!quote) throw new Error('Unable to allocate a unique quote reference');

  await recordAuditEvent({
    actorId: retailerId,
    action: 'QUOTE_SUBMITTED',
    targetType: 'Quote',
    targetId: quote.id,
    metadata: { reference: quote.reference, tenderId },
  });

  const emailResult = await sendTransactionalEmail(
    tender.client.email,
    quoteReceivedTemplate({
      tenderReference: tender.reference,
      quoteReference: quote.reference,
      category: tender.category,
      priceGbp: quote.priceGbp,
      leadTimeDays: quote.leadTimeDays,
      reviewPath: `/client/tenders/${tender.id}`,
    })
  ).catch((error: unknown) => ({ sent: false as const, reason: error instanceof Error ? error.message : 'Email delivery failed' }));
  await recordAuditEvent({
    actorId: null,
    action: emailResult.sent ? 'QUOTE_NOTIFICATION_SENT' : 'QUOTE_NOTIFICATION_FAILED',
    targetType: 'Quote',
    targetId: quote.id,
    metadata: { recipientRole: 'USER', reason: emailResult.sent ? undefined : emailResult.reason },
  });

  return quote;
}

/** A Client may only view quotes for their own tenders. */
export async function listQuotesForClientTender(clientId: string, tenderId: string) {
  if (!await userOwnsTender(clientId, tenderId)) throw new ForbiddenError('Tender not found for this User');

  // Retailer contact details are never selected here — they are withheld until contact release.
  const quotes = await prisma.quote.findMany({
    where: { tenderId },
    select: {
      id: true,
      retailerId: true,
      reference: true,
      priceGbp: true,
      leadTimeDays: true,
      deliveryDateConfirmed: true,
      deliveryInfo: true,
      validityDays: true,
      lines: {
        select: {
          tenderItemId: true,
          priceGbp: true,
          available: true,
          tenderItem: { select: { category: true, subcategory: true, item: true, quantity: true } },
        },
      },
      charges: { select: { id: true, description: true, priceGbp: true } },
      status: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: 'asc' },
  });
  const sponsoredRetailerIds = await sponsoredPlacementEnabled()
    ? new Set((await prisma.retailerSponsoredPlacement.findMany({
        where: { active: true, retailerId: { in: quotes.map((quote) => quote.retailerId) } },
        select: { retailerId: true },
      })).map((placement) => placement.retailerId))
    : new Set<string>();
  return Promise.all(quotes.map(async ({ retailerId, ...quote }) => ({
    ...quote,
    sponsoredPlacementActive: sponsoredRetailerIds.has(retailerId),
    releaseFeeGbp: await getClientReleaseFeeGbp(quote.priceGbp),
  })));
}
