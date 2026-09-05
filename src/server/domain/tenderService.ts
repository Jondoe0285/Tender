import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { buildTenderReference } from '@/lib/identifiers';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { sendTenderOpportunityEmail, sendTenderUpdatedEmail } from '@/server/notifications/resend';
import type { CreateTenderInput, UpdateTenderInput } from '@/lib/schemas/tender';
import { enforceContentModeration } from '@/server/moderation/contentModeration';
import { retailerCoversTenderLocation, getBroadLocation, getPostcodeDistrict, UK_COUNTIES, UK_REGIONS } from '@/lib/geography';
import { ForbiddenError } from '@/server/auth/session';

type RetailerTenderEligibilityProfile = {
  coverageScope: string;
  counties: string;
  regions: string;
  categories: string;
};

export async function getCompanyMemberIds(userId: string): Promise<string[]> {
  const membership = await prisma.clientCompanyMember.findUnique({ where: { userId }, select: { companyId: true } });
  if (!membership) return [userId];
  const members = await prisma.clientCompanyMember.findMany({ where: { companyId: membership.companyId }, select: { userId: true } });
  return members.map((member) => member.userId);
}

/** Returns the active tender categories a company is permitted to receive. */
export async function getUserTenderServiceCategories(userId: string): Promise<string[]> {
  const membership = await prisma.clientCompanyMember.findUnique({
    where: { userId },
    select: { company: { select: { services: true } } },
  });
  return membership?.company.services.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
}

export async function userOwnsTender(userId: string, tenderId: string): Promise<boolean> {
  const memberIds = await getCompanyMemberIds(userId);
  return Boolean(await prisma.tender.findFirst({ where: { id: tenderId, clientId: { in: memberIds } }, select: { id: true } }));
}

export function retailerCanMatchTender(
  retailer: RetailerTenderEligibilityProfile,
  tenderLocation: string,
  tenderCategories: readonly string[]
): boolean {
  const retailerCategories = retailer.categories.split(',').map((value) => value.trim()).filter(Boolean);
  return retailerCoversTenderLocation(retailer, tenderLocation)
    && tenderCategories.some((category) => retailerCategories.includes(category));
}

export function getTenderPackageCategories<T extends { category: string }>(packages: readonly T[] | null | undefined): string[] {
  return (packages ?? []).map((pkg) => pkg.category);
}

function companyEligibility(profile: RetailerTenderEligibilityProfile, company: { services: string; operatingLocations: string }): RetailerTenderEligibilityProfile {
  const locations = company.operatingLocations.split(',').map((value) => value.trim()).filter(Boolean);
  return {
    ...profile,
    categories: company.services,
    coverageScope: locations.includes('United Kingdom') ? 'UK' : locations.some((location) => UK_REGIONS.includes(location as typeof UK_REGIONS[number])) ? 'REGION' : 'COUNTY',
    counties: locations.filter((location) => UK_COUNTIES.includes(location as typeof UK_COUNTIES[number])).join(','),
    regions: locations.filter((location) => UK_REGIONS.includes(location as typeof UK_REGIONS[number])).join(','),
  };
}

/** Rechecks the mutable retailer capability and coverage controls before paid tender activity. */
export async function assertRetailerEligibleForTender(retailerId: string, tenderId: string): Promise<void> {
  const [match, profile, membership] = await Promise.all([
    prisma.tenderMatch.findUnique({
      where: { tenderId_retailerId: { tenderId, retailerId } },
      include: { tender: { select: { location: true, items: { select: { category: true } }, packages: { select: { category: true } } } } },
    }),
    prisma.retailerProfile.findUnique({
      where: { userId: retailerId },
      select: { coverageScope: true, counties: true, regions: true, categories: true },
    }),
    prisma.clientCompanyMember.findUnique({ where: { userId: retailerId }, select: { company: { select: { services: true, operatingLocations: true } } } }),
  ]);
  const tenderCategories = [...new Set([
    ...getTenderPackageCategories(match?.tender.packages),
    ...match?.tender.items.map((item) => item.category) ?? [],
  ])];
  if (!match || !profile || !membership || !retailerCanMatchTender(companyEligibility(profile, membership.company), match.tender.location, tenderCategories)) {
    throw new ForbiddenError('Tender is not eligible for this Retailer');
  }
}

/** Rejects new tender activity once the tender is closed or its response deadline has passed. */
export async function assertTenderOpenForActivity(tenderId: string): Promise<void> {
  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, status: 'OPEN', closingDate: { gt: new Date() } },
    select: { id: true },
  });
  if (!tender) throw new ForbiddenError('Tender is no longer open for new activity');
}

/** Creates a tender, assigns its reference, and matches it to eligible Retailers. Ownership is the caller's job. */
export async function createTender(clientId: string, input: CreateTenderInput) {
  await enforceContentModeration(clientId, 'TENDER_SUBMISSION', [
    { name: 'project name', value: input.projectName },
    { name: 'category', value: input.category },
    { name: 'subcategory', value: input.subcategory },
    { name: 'item', value: input.item },
    { name: 'location', value: input.location },
    { name: 'quantity', value: input.quantity },
    { name: 'item specification', value: input.itemDescription ?? '' },
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
  const tenderData = {
      clientId,
      category: input.category,
      subcategory: input.subcategory,
      service: input.category,
      item: input.item ?? null,
      location: input.location,
      quantity: input.quantity,
      urgency: input.urgency,
      closingDate: input.closingDate,
      supplyDate: input.supplyDate ?? null,
      requirements: input.requirements.join(','),
      description: input.description,
      status: 'OPEN' as const,
      items: {
        create: [
          { category: input.category, subcategory: input.subcategory, item: input.item ?? null, quantity: input.quantity, description: input.itemDescription ?? '' },
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
  };

  let tender;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      tender = await prisma.tender.create({
        data: { ...tenderData, reference: buildTenderReference(new Date(), tendersToday + attempt + 1) },
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || attempt === 4) throw error;
    }
  }
  if (!tender) throw new Error('Unable to allocate a unique tender reference');

  const packages = [
    {
      category: input.category,
      subcategory: input.subcategory,
      service: input.category,
      item: input.item ?? null,
      location: input.location,
      quantity: input.quantity,
      urgency: input.urgency,
      closingDate: input.closingDate,
      supplyDate: input.supplyDate ?? null,
      requirements: input.requirements.join(','),
      description: input.itemDescription ?? '',
    },
    ...(input.items ?? []).map((item) => ({
      category: item.category,
      subcategory: item.subcategory,
      service: item.category,
      item: item.item ?? null,
      location: input.location,
      quantity: item.quantity,
      urgency: input.urgency,
      closingDate: input.closingDate,
      supplyDate: input.supplyDate ?? null,
      requirements: input.requirements.join(','),
      description: item.description,
    })),
  ];

  await prisma.tenderPackage.createMany({
    data: packages.map((pkg, index) => ({
      tenderId: tender.id,
      reference: `${tender.reference}-PK${index + 1}`,
      category: pkg.category,
      subcategory: pkg.subcategory,
      service: pkg.service,
      item: pkg.item,
      location: pkg.location,
      quantity: pkg.quantity,
      urgency: pkg.urgency,
      closingDate: pkg.closingDate,
      supplyDate: pkg.supplyDate,
      requirements: pkg.requirements,
      description: pkg.description,
      status: 'OPEN',
    })),
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
  const candidateRetailers = await prisma.retailerProfile.findMany({
    where: { OR: services.map((service) => ({ categories: { contains: service } })) },
    include: { user: { select: { email: true, clientCompanyMembership: { select: { company: { select: { services: true, operatingLocations: true } } } } } } },
  });
  const matchedRetailers = candidateRetailers.filter((retailer) => retailer.userId !== clientId && retailer.user.clientCompanyMembership && retailerCanMatchTender(companyEligibility(retailer, retailer.user.clientCompanyMembership.company), tender.location, services));

  if (matchedRetailers.length > 0) {
    const clientCompany = await prisma.clientCompanyMember.findUnique({ where: { userId: clientId }, select: { company: { select: { tradeTenderId: true } } } });
    const clientTradeTenderId = clientCompany?.company.tradeTenderId ?? 'Pending assignment';
    const retailerByService = new Map<string, typeof matchedRetailers>();
    for (const service of services) {
      retailerByService.set(service, matchedRetailers.filter((retailer) => retailer.user.clientCompanyMembership?.company.services.split(',').map((value) => value.trim()).includes(service)));
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

    const notifyByService = new Map<string, typeof matchedRetailers>();
    for (const service of services) {
      notifyByService.set(service, matchedRetailers.filter((retailer) => retailer.user.clientCompanyMembership?.company.services.split(',').map((value) => value.trim()).includes(service)));
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

/** Updates a Contractor-owned tender in place, preserving its reference, matches, and unlock entitlement records. */
export async function updateTender(clientId: string, tenderId: string, input: UpdateTenderInput) {
  const companyMemberIds = await getCompanyMemberIds(clientId);
  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: { in: companyMemberIds } },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      packages: { orderBy: { createdAt: 'asc' } },
      matches: true,
    },
  });
  if (!tender) throw new ForbiddenError('Tender not found for this Contractor');
  if (tender.status !== 'OPEN') throw new ForbiddenError('Only open tenders can be edited');

  const existingItemIds = new Set(tender.items.map((item) => item.id));
  if (input.items.length !== tender.items.length || input.items.some((item) => !existingItemIds.has(item.id))) {
    throw new ForbiddenError('Tender packages cannot be added or removed after submission');
  }

  await enforceContentModeration(clientId, 'TENDER_UPDATE', [
    { name: 'location', value: input.location },
    { name: 'requirements', value: input.requirements.join(', ') },
    { name: 'description', value: input.description },
    ...input.items.flatMap((item, index) => [
      { name: `item ${index + 1} quantity`, value: item.quantity },
      { name: `item ${index + 1} description`, value: item.description },
    ]),
  ]);

  const itemsById = new Map(input.items.map((item) => [item.id, item]));
  const updatedTender = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.tender.update({
      where: { id: tender.id },
      data: {
        location: input.location,
        urgency: input.urgency,
        closingDate: input.closingDate,
        supplyDate: input.supplyDate ?? null,
        requirements: input.requirements.join(','),
        description: input.description,
      },
    });

    await Promise.all(tender.items.map((item) => {
      const update = itemsById.get(item.id)!;
      return transaction.tenderItem.update({ where: { id: item.id }, data: { quantity: update.quantity, description: update.description } });
    }));
    await transaction.tenderPackage.updateMany({
      where: { tenderId: tender.id },
      data: {
        location: input.location,
        urgency: input.urgency,
        closingDate: input.closingDate,
        supplyDate: input.supplyDate ?? null,
        requirements: input.requirements.join(','),
      },
    });
    await Promise.all(tender.packages.map((pkg, index) => {
      const item = itemsById.get(tender.items[index]?.id ?? '');
      return item
        ? transaction.tenderPackage.update({ where: { id: pkg.id }, data: { quantity: item.quantity, description: item.description } })
        : Promise.resolve();
    }));
    await recordAuditEvent({
      actorId: clientId,
      action: 'TENDER_UPDATED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { reference: tender.reference, matchedRetailerCount: tender.matches.length },
    }, transaction);
    return updated;
  });

  const matchedRetailers = await prisma.user.findMany({
    where: { id: { in: tender.matches.map((match) => match.retailerId) }, role: 'USER' },
    select: { id: true, email: true },
  });
  await Promise.allSettled(matchedRetailers.map(async (retailer) => {
    const result = await sendTenderUpdatedEmail(retailer.email, {
      id: tender.id,
      reference: tender.reference,
      category: tender.category,
      locationArea: formatRetailerSummaryLocation(input.location),
      closingDate: input.closingDate,
    });
    await recordAuditEvent({
      actorId: clientId,
      action: result.sent ? 'TENDER_UPDATE_NOTIFICATION_SENT' : 'TENDER_UPDATE_NOTIFICATION_SKIPPED',
      targetType: 'Tender',
      targetId: tender.id,
      metadata: { retailerId: retailer.id, reason: result.sent ? undefined : result.reason },
    });
  }));

  return updatedTender;
}

/**
 * Retroactively matches a Retailer to already-open tenders that now qualify under their current
 * categories. Matching normally only runs once, at tender creation time, so this must be called
 * after a Retailer registers or changes their categories/coverage — otherwise they would never
 * see open opportunities that existed before they configured their profile. Category capability
 * and geographic coverage are both required for visibility and notification.
 */
export async function matchRetailerToOpenTenders(retailerId: string) {
  const [profile, membership] = await Promise.all([
    prisma.retailerProfile.findUnique({ where: { userId: retailerId } }),
    prisma.clientCompanyMember.findUnique({ where: { userId: retailerId }, select: { company: { select: { services: true, operatingLocations: true } } } }),
  ]);
  if (!profile || !membership) return;

  const categories = membership.company.services.split(',').map((value) => value.trim()).filter(Boolean);
  if (categories.length === 0) return;

  const candidateTenders = await prisma.tender.findMany({
    where: {
      status: 'OPEN',
      closingDate: { gt: new Date() },
      OR: [
        { items: { some: { category: { in: categories } } } },
        { packages: { some: { category: { in: categories } } } },
      ],
      matches: { none: { retailerId } },
    },
    include: {
      items: true,
      packages: true,
      client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
    },
  });
  if (candidateTenders.length === 0) return;

  const retailer = await prisma.user.findUnique({ where: { id: retailerId }, select: { email: true } });

  for (const tender of candidateTenders) {
    if (tender.clientId === retailerId) continue;
    const packageCategories = getTenderPackageCategories(tender.packages);
    const tenderCategories = [...new Set([...packageCategories, ...tender.items.map((item) => item.category)])];
    if (!retailerCanMatchTender(companyEligibility(profile, membership.company), tender.location, tenderCategories)) continue;
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

    if (!retailer?.email) continue;
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
  return getCompanyMemberIds(clientId).then((memberIds) => prisma.tender.findMany({ where: { clientId: { in: memberIds } }, orderBy: { createdAt: 'desc' } }));
}

export function buildRetailerTenderSummary(requirements: string | null | undefined): string[] {
  if (!requirements || requirements.trim().length === 0) return ['No specific requirements listed'];
  return ['Unlock required to view detailed requirements'];
}

/** Approved non-sensitive summary fields only (SEC-030/031) — the full free-text description
 *  remains hidden until unlock. */
export async function listMatchedSummariesForRetailer(retailerId: string) {
  const serviceCategories = await getUserTenderServiceCategories(retailerId);
  if (serviceCategories.length === 0) return [];
  const [matches, retailer, membership] = await Promise.all([
    prisma.tenderMatch.findMany({
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
            requirements: true,
            packages: { select: { category: true } },
            client: { select: { clientCompanyMembership: { select: { company: { select: { tradeTenderId: true } } } } } },
          },
        },
      },
      orderBy: { notifiedAt: 'desc' },
    }),
    prisma.retailerProfile.findUnique({
      where: { userId: retailerId },
      select: { coverageScope: true, counties: true, regions: true },
    }),
    prisma.clientCompanyMember.findUnique({ where: { userId: retailerId }, select: { company: { select: { services: true, operatingLocations: true } } } }),
  ]);

  return matches.filter((match) => {
    const visiblePackages = match.tender.packages.filter((pkg) => serviceCategories.includes(pkg.category));
    const tenderCategories = [...new Set(visiblePackages.map((pkg) => pkg.category))];
    return match.tender.status === 'OPEN'
      && match.tender.closingDate > new Date()
      && Boolean(retailer && membership && retailerCanMatchTender(companyEligibility({ ...retailer, categories: '' }, membership.company), match.tender.location, tenderCategories));
  }).map((match) => {
    const packageCategories = [...new Set(match.tender.packages.filter((pkg) => serviceCategories.includes(pkg.category)).map((pkg) => pkg.category))];
    return {
      id: match.id,
      notifiedAt: match.notifiedAt,
      viewedAt: match.viewedAt,
      tender: {
        id: match.tender.id,
        reference: match.tender.reference,
        category: packageCategories[0] ?? match.tender.category,
        packageCategories,
        packageCount: packageCategories.length,
        location: formatRetailerSummaryLocation(match.tender.location),
        urgency: match.tender.urgency,
        closingDate: match.tender.closingDate,
        status: match.tender.status,
        clientTradeTenderId: match.tender.client.clientCompanyMembership?.company.tradeTenderId ?? null,
        requirements: buildRetailerTenderSummary(match.tender.requirements),
        categoryMatch: true,
        locationMatch: retailer ? retailerCoversTenderLocation(retailer, match.tender.location) : false,
      },
    };
  });
}

/** Pre-unlock location retains only a broad area plus the approved outward postcode district. */
export function formatRetailerSummaryLocation(location: string): string {
  const broadLocation = getBroadLocation(location);
  const postcodeDistrict = getPostcodeDistrict(location);
  return postcodeDistrict ? `${broadLocation} (${postcodeDistrict})` : broadLocation;
}

/** Marks a matched tender as viewed by this Retailer — drives the "New" / unread indicator. */
export async function markMatchViewed(retailerId: string, tenderId: string) {
  await prisma.tenderMatch.updateMany({
    where: { tenderId, retailerId, viewedAt: null },
    data: { viewedAt: new Date() },
  });
}
