import { prisma } from '@/server/data/prisma';
import { buildTenderReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { estimateValueBand } from '@/lib/valueBands';
import type { CreateTenderInput } from '@/lib/schemas/tender';

/** Creates a tender, assigns its reference, and matches it to eligible Retailers. Ownership is the caller's job. */
export async function createTender(clientId: string, input: CreateTenderInput) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const tendersToday = await prisma.tender.count({ where: { createdAt: { gte: startOfDay } } });
  const reference = buildTenderReference(new Date(), tendersToday + 1);

  const tender = await prisma.tender.create({
    data: {
      reference,
      clientId,
      category: input.category,
      subcategory: input.subcategory,
      location: input.location,
      quantity: input.quantity,
      urgency: input.urgency,
      closingDate: input.closingDate,
      budget: input.budget ?? null,
      requirements: input.requirements.join(','),
      description: input.description,
      status: 'OPEN',
      items: input.items?.length
        ? { create: input.items }
        : { create: [{ category: input.category, subcategory: input.subcategory, quantity: input.quantity, description: input.description }] },
    },
  });

  await recordAuditEvent({
    actorId: clientId,
    action: 'TENDER_CREATED',
    targetType: 'Tender',
    targetId: tender.id,
    metadata: { reference: tender.reference, category: tender.category },
  });

  const matchedRetailers = await prisma.retailerProfile.findMany({
    where: { categories: { contains: input.category } },
  });

  if (matchedRetailers.length > 0) {
    // The tender was just created, so no TenderMatch rows can already exist for it.
    await prisma.tenderMatch.createMany({
      data: matchedRetailers.map((retailer) => ({ tenderId: tender.id, retailerId: retailer.userId })),
    });
    await recordAuditEvent({
      actorId: null,
      action: 'TENDER_MATCHED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { matchedRetailerCount: matchedRetailers.length },
    });
  }

  return tender;
}

/** Own tenders only — the repository call itself enforces ownership via the where clause. */
export function listTendersForClient(clientId: string) {
  return prisma.tender.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
}

/** Approved non-sensitive summary fields only (SEC-030/031) — the full free-text description
 *  and precise budget figure remain hidden until unlock; only a coarse value band is exposed. */
export async function listMatchedSummariesForRetailer(retailerId: string) {
  const matches = await prisma.tenderMatch.findMany({
    where: { retailerId },
    include: {
      tender: {
        select: {
          id: true,
          reference: true,
          category: true,
          location: true,
          urgency: true,
          closingDate: true,
          status: true,
          budget: true,
          requirements: true,
        },
      },
    },
    orderBy: { notifiedAt: 'desc' },
  });

  return matches.map((match) => ({
    id: match.id,
    notifiedAt: match.notifiedAt,
    viewedAt: match.viewedAt,
    tender: {
      id: match.tender.id,
      reference: match.tender.reference,
      category: match.tender.category,
      location: match.tender.location,
      urgency: match.tender.urgency,
      closingDate: match.tender.closingDate,
      status: match.tender.status,
      valueBand: estimateValueBand(match.tender.budget),
      requirements: match.tender.requirements ? match.tender.requirements.split(',').filter(Boolean) : [],
    },
  }));
}

/** Marks a matched tender as viewed by this Retailer — drives the "New" / unread indicator. */
export async function markMatchViewed(retailerId: string, tenderId: string) {
  await prisma.tenderMatch.updateMany({
    where: { tenderId, retailerId, viewedAt: null },
    data: { viewedAt: new Date() },
  });
}
