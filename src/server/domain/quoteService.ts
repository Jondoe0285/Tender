import { prisma } from '@/server/data/prisma';
import { buildQuoteReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import type { SubmitQuoteInput } from '@/lib/schemas/quote';
import { quoteReceivedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { enforceContentModeration } from '@/server/moderation/contentModeration';
import { sponsoredPlacementEnabled } from '@/server/domain/sponsoredPlacementService';
import { getClientReleaseFeeGbp } from '@/server/domain/platformSettings';

export function isQuoteRetentionLocked(retentionLockedUntil: Date | null | undefined, now = new Date()): boolean {
  return retentionLockedUntil !== null && retentionLockedUntil !== undefined && retentionLockedUntil > now;
}

/** Deletes only quotes outside the mandatory retention window. Callers must authorize the actor. */
export async function deleteQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { retentionLockedUntil: true } });
  if (!quote) return null;
  if (isQuoteRetentionLocked(quote.retentionLockedUntil)) {
    throw new ForbiddenError('Accepted quotes are retained for five years and cannot be deleted');
  }
  return prisma.quote.delete({ where: { id: quoteId } });
}

/** A Retailer may only submit a quote for a tender they have legitimately unlocked (FR-040). */
export async function submitQuote(retailerId: string, tenderId: string, input: SubmitQuoteInput) {
  const unlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
  if (!unlock) throw new ForbiddenError('Tender has not been unlocked by this Retailer');

  await enforceContentModeration(retailerId, 'QUOTE_SUBMISSION', [
    { name: 'delivery information', value: input.deliveryInfo },
    { name: 'accreditations', value: input.accreditations },
    { name: 'supporting document name', value: input.supportingDocumentName },
    { name: 'notes', value: input.notes },
  ]);

  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: { client: { select: { email: true } } },
  });
  const existingQuoteCount = await prisma.quote.count({ where: { tenderId } });
  const reference = buildQuoteReference(tender.reference, existingQuoteCount + 1);

  const quote = await prisma.quote.create({
    data: {
      reference,
      tenderId,
      retailerId,
      priceGbp: input.priceGbp,
      leadTimeDays: input.leadTimeDays,
      deliveryInfo: input.deliveryInfo,
      accreditations: input.accreditations,
      supportingDocumentName: input.supportingDocumentName ?? null,
      validityDays: input.validityDays,
      notes: input.notes,
      status: 'SUBMITTED',
    },
  });

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
    metadata: { recipientRole: 'CLIENT', reason: emailResult.sent ? undefined : emailResult.reason },
  });

  return quote;
}

/** A Client may only view quotes for their own tenders. */
export async function listQuotesForClientTender(clientId: string, tenderId: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender || tender.clientId !== clientId) throw new ForbiddenError('Tender not found for this Client');

  // Retailer contact details are never selected here — they are withheld until contact release.
  const quotes = await prisma.quote.findMany({
    where: { tenderId },
    select: {
      id: true,
      retailerId: true,
      reference: true,
      priceGbp: true,
      leadTimeDays: true,
      deliveryInfo: true,
      accreditations: true,
      supportingDocumentName: true,
      validityDays: true,
      notes: true,
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
