import { prisma } from '@/server/data/prisma';
import { buildTenderReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { estimateValueBand } from '@/lib/valueBands';
import { sendTenderOpportunityEmail } from '@/server/notifications/resend';
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
      service: input.category,
      item: input.item ?? null,
      location: input.location,
      quantity: input.quantity,
      urgency: input.urgency,
      closingDate: input.closingDate,
      budget: input.budget ?? null,
      requirements: input.requirements.join(','),
      description: input.description,
      status: 'OPEN',
      items: {
        create: [
          { category: input.category, subcategory: input.subcategory, item: input.item ?? null, quantity: input.quantity, description: input.description },
          ...(input.items ?? []),
        ],
      },
      attachments: {
        create: (input.attachments ?? []).map((attachment) => ({
          fileName: attachment.name,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          content: Buffer.from(attachment.dataBase64, 'base64'),
        })),
      },
    },
  });

  await recordAuditEvent({
    actorId: clientId,
    action: 'TENDER_CREATED',
    targetType: 'Tender',
    targetId: tender.id,
    metadata: { reference: tender.reference, category: tender.category },
  });

  const tenderItems = await prisma.tenderItem.findMany({ where: { tenderId: tender.id }, orderBy: { createdAt: 'asc' } });
  const services = [...new Set(tenderItems.map((item) => item.category))];
  const matchedRetailers = await prisma.retailerProfile.findMany({
    where: { OR: services.map((service) => ({ categories: { contains: service } })) },
    include: { user: { select: { email: true } } },
  });

  if (matchedRetailers.length > 0) {
    const retailerByService = new Map<string, typeof matchedRetailers>();
    for (const service of services) {
      retailerByService.set(service, matchedRetailers.filter((retailer) => retailer.categories.split(',').map((value) => value.trim()).includes(service)));
    }
    const uniqueRetailerIds = [...new Set(matchedRetailers.map((retailer) => retailer.userId))];
    await prisma.tenderMatch.createMany({
      data: uniqueRetailerIds.map((retailerId) => ({ tenderId: tender.id, retailerId })),
    });
    const itemMatches = tenderItems.flatMap((item) =>
      (retailerByService.get(item.category) ?? []).map((retailer) => ({ tenderItemId: item.id, retailerId: retailer.userId }))
    );
    if (itemMatches.length > 0) await prisma.tenderItemMatch.createMany({ data: itemMatches });
    await recordAuditEvent({
      actorId: null,
      action: 'TENDER_MATCHED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { matchedRetailerCount: uniqueRetailerIds.length, matchedItemCount: itemMatches.length },
    });

    await Promise.allSettled(
      tenderItems.flatMap((item) => (retailerByService.get(item.category) ?? []).map(async (retailer) => {
        const result = await sendTenderOpportunityEmail(retailer.user.email, {
            id: tender.id,
            reference: tender.reference,
            category: `${item.category} / ${item.subcategory}`,
            locationArea: tender.location,
            closingDate: tender.closingDate,
            requirementSummary: [item.item, item.quantity].filter(Boolean).join(' · '),
            valueBand: estimateValueBand(tender.budget),
          });
        await recordAuditEvent({
          actorId: null,
          action: result.sent ? 'TENDER_NOTIFICATION_SENT' : 'TENDER_NOTIFICATION_SKIPPED',
          targetType: 'Tender',
          targetId: tender.id,
          metadata: { retailerId: retailer.userId, tenderItemId: item.id, reason: result.sent ? undefined : result.reason },
        });
      }))
    );
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
