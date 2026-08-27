import { prisma } from '@/server/data/prisma';
import { buildQuoteReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import type { SubmitQuoteInput } from '@/lib/schemas/quote';

/** A Retailer may only submit a quote for a tender they have legitimately unlocked (FR-040). */
export async function submitQuote(retailerId: string, tenderId: string, input: SubmitQuoteInput) {
  const unlock = await prisma.unlock.findUnique({ where: { tenderId_retailerId: { tenderId, retailerId } } });
  if (!unlock) throw new ForbiddenError('Tender has not been unlocked by this Retailer');

  const tender = await prisma.tender.findUniqueOrThrow({ where: { id: tenderId } });
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

  return quote;
}

/** A Client may only view quotes for their own tenders. */
export async function listQuotesForClientTender(clientId: string, tenderId: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender || tender.clientId !== clientId) throw new ForbiddenError('Tender not found for this Client');

  // Retailer contact details are never selected here — they are withheld until contact release.
  return prisma.quote.findMany({
    where: { tenderId },
    select: {
      id: true,
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
}
