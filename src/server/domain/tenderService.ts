import { prisma } from '@/server/data/prisma';
import { buildTenderReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { sendTenderOpportunityEmail } from '@/server/notifications/resend';
import type { CreateTenderInput } from '@/lib/schemas/tender';
import { enforceContentModeration } from '@/server/moderation/contentModeration';
import { retailerCoversTenderLocation, getBroadLocation } from '@/lib/geography';

/** Creates a tender, assigns its reference, and matches it to eligible Retailers. Ownership is the caller's job. */
export async function createTender(clientId: string, input: CreateTenderInput) {
  await enforceContentModeration(clientId, 'TENDER_SUBMISSION', [
    { name: 'project name', value: input.projectName },
    { name: 'category', value: input.category },
    { name: 'subcategory', value: input.subcategory },
    { name: 'item', value: input.item },
    { name: 'location', value: input.location },
    { name: 'quantity', value: input.quantity },
    { name: 'requirements', value: input.requirements.join(', ') },
    { name: 'description', value: input.description },
    ...(input.items ?? []).flatMap((item, index) => [
      { name: `item ${index + 1} category`, value: item.category },
      { name: `item ${index + 1} subcategory`, value: item.subcategory },
      { name: `item ${index + 1} item`, value: item.item },
      { name: `item ${index + 1} description`, value: item.description },
      { name: `item ${index + 1} quantity`, value: item.quantity },
    ]),
    ...(input.attachments ?? []).map((attachment, index) => ({ name: `attachment ${index + 1} filename`, value: attachment.name })),
  ]);
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
  // Visibility and unlock eligibility are category-only, regardless of location — location only
  // determines who is proactively emailed below.
  const matchedRetailers = await prisma.retailerProfile.findMany({
    where: { OR: services.map((service) => ({ categories: { contains: service } })) },
    include: { user: { select: { email: true } } },
  });

  if (matchedRetailers.length > 0) {
    const clientCompany = await prisma.clientCompanyMember.findUnique({ where: { userId: clientId }, select: { company: { select: { tradeTenderId: true } } } });
    const clientTradeTenderId = clientCompany?.company.tradeTenderId ?? 'Pending assignment';
    const retailerByService = new Map<string, typeof matchedRetailers>();
    for (const service of services) {
      retailerByService.set(service, matchedRetailers.filter((retailer) => retailer.categories.split(',').map((value) => value.trim()).includes(service)));
    }
    const uniqueRetailerIds = [...new Set(matchedRetailers.map((retailer) => retailer.userId))];
    const itemMatches = tenderItems.flatMap((item) =>
      (retailerByService.get(item.category) ?? []).map((retailer) => ({ tenderItemId: item.id, retailerId: retailer.userId }))
    );
    await prisma.$transaction([
      prisma.tenderMatch.createMany({ data: uniqueRetailerIds.map((retailerId) => ({ tenderId: tender.id, retailerId })) }),
      ...(itemMatches.length > 0 ? [prisma.tenderItemMatch.createMany({ data: itemMatches })] : []),
    ]);
    await recordAuditEvent({
      actorId: null,
      action: 'TENDER_MATCHED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { matchedRetailerCount: uniqueRetailerIds.length, matchedItemCount: itemMatches.length },
    });

    // Email notification stays location-scoped — only Retailers whose coverage includes this
    // tender's postcode are proactively emailed; others can still find and unlock it themselves.
    const retailersToNotify = matchedRetailers.filter((retailer) => retailerCoversTenderLocation(retailer, tender.location));
    const notifyByService = new Map<string, typeof matchedRetailers>();
    for (const service of services) {
      notifyByService.set(service, retailersToNotify.filter((retailer) => retailer.categories.split(',').map((value) => value.trim()).includes(service)));
    }

    await Promise.allSettled(
      tenderItems.flatMap((item) => (notifyByService.get(item.category) ?? []).map(async (retailer) => {
        const result = await sendTenderOpportunityEmail(retailer.user.email, {
            id: tender.id,
            reference: tender.reference,
            clientTradeTenderId,
            category: `${item.category} / ${item.subcategory}`,
            locationArea: tender.location,
            closingDate: tender.closingDate,
            requirementSummary: [item.item, item.quantity].filter(Boolean).join(' · '),
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

/**
 * Retroactively matches a Retailer to already-open tenders that now qualify under their current
 * categories. Matching normally only runs once, at tender creation time, so this must be called
 * after a Retailer registers or changes their categories/coverage — otherwise they would never
 * see open opportunities that existed before they configured their profile. Visibility is
 * category-only; the Retailer's coverage only determines whether they are also emailed.
 */
export async function matchRetailerToOpenTenders(retailerId: string) {
  const profile = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });
  if (!profile) return;

  const categories = profile.categories.split(',').map((value) => value.trim()).filter(Boolean);
  if (categories.length === 0) return;

  const candidateTenders = await prisma.tender.findMany({
    where: {
      status: 'OPEN',
      closingDate: { gt: new Date() },
      items: { some: { category: { in: categories } } },
      matches: { none: { retailerId } },
    },
    include: {
      items: true,
      client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
    },
  });
  if (candidateTenders.length === 0) return;

  const retailer = await prisma.user.findUnique({ where: { id: retailerId }, select: { email: true } });

  for (const tender of candidateTenders) {
    const matchingItems = tender.items.filter((item) => categories.includes(item.category));

    await prisma.$transaction([
      prisma.tenderMatch.create({ data: { tenderId: tender.id, retailerId } }),
      ...(matchingItems.length > 0
        ? [prisma.tenderItemMatch.createMany({ data: matchingItems.map((item) => ({ tenderItemId: item.id, retailerId })) })]
        : []),
    ]);
    await recordAuditEvent({
      actorId: retailerId,
      action: 'TENDER_MATCHED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { matchedRetailerCount: 1, matchedItemCount: matchingItems.length, reason: 'RETROACTIVE_COVERAGE_UPDATE' },
    });

    if (!retailer?.email || !retailerCoversTenderLocation(profile, tender.location)) continue;
    const clientTradeTenderId = tender.client.clientCompanyMembership?.company.tradeTenderId ?? 'Pending assignment';
    for (const item of matchingItems) {
      const result = await sendTenderOpportunityEmail(retailer.email, {
        id: tender.id,
        reference: tender.reference,
        clientTradeTenderId,
        category: `${item.category} / ${item.subcategory}`,
        locationArea: tender.location,
        closingDate: tender.closingDate,
        requirementSummary: [item.item, item.quantity].filter(Boolean).join(' · '),
      });
      await recordAuditEvent({
        actorId: null,
        action: result.sent ? 'TENDER_NOTIFICATION_SENT' : 'TENDER_NOTIFICATION_SKIPPED',
        targetType: 'Tender',
        targetId: tender.id,
        metadata: { retailerId, tenderItemId: item.id, reason: result.sent ? undefined : result.reason },
      });
    }
  }
}

/** Own tenders only — the repository call itself enforces ownership via the where clause. */
export function listTendersForClient(clientId: string) {
  return prisma.tender.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
}

export function buildRetailerTenderSummary(requirements: string | null | undefined): string[] {
  if (!requirements || requirements.trim().length === 0) return ['No specific requirements listed'];
  return ['Unlock required to view detailed requirements'];
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
          client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
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
      location: getBroadLocation(match.tender.location),
      urgency: match.tender.urgency,
      closingDate: match.tender.closingDate,
      status: match.tender.status,
      clientTradeTenderId: match.tender.client.clientCompanyMembership?.company.tradeTenderId ?? null,
      requirements: buildRetailerTenderSummary(match.tender.requirements),
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
