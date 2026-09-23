import { prisma } from '@/server/data/prisma';
import { buildClientTradeTenderId } from '@/lib/identifiers';
import { coverageFieldsFromOperatingLocations, normaliseOperatingLocations } from '@/lib/geography';
import { issuedTenderSpecHash } from '@/lib/package-spec';
import { personNameFromAccount } from '@/lib/person-name';

const LEGACY_PURCHASE_ORDER = 'LEGACY';

export async function backfillMissingAwards(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0;
  const quotes = await prisma.quote.findMany({
    where: { status: 'ACCEPTED', award: null, tender: { clientId: { in: clientIds } } },
    select: {
      id: true,
      retailerId: true,
      packageSpecHash: true,
      tenderId: true,
      tender: { select: { projectId: true, clientId: true, packages: { select: { specHash: true } } } },
    },
  });
  for (const quote of quotes) {
    const specHash = quote.packageSpecHash || issuedTenderSpecHash(quote.tender.packages.map((pkg) => pkg.specHash).filter(Boolean));
    await prisma.award.upsert({
      where: { quoteId: quote.id },
      create: {
        projectId: quote.tender.projectId,
        tenderId: quote.tenderId,
        quoteId: quote.id,
        packageSpecHash: specHash,
        awardedById: quote.tender.clientId,
        purchaseOrderNumber: LEGACY_PURCHASE_ORDER,
      },
      update: {},
    });
  }
  return quotes.length;
}

export async function backfillMissingProjects(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0;
  const tenders = await prisma.tender.findMany({
    where: { clientId: { in: clientIds }, projectId: null },
    select: { id: true, clientId: true, location: true, subcategory: true },
  });
  let created = 0;
  for (const tender of tenders) {
    const membership = await prisma.clientCompanyMember.findUnique({
      where: { userId: tender.clientId },
      select: { companyId: true },
    });
    if (!membership) continue;
    const name = `${tender.subcategory} · ${tender.location}`.slice(0, 160);
    const project = await prisma.project.upsert({
      where: { companyId_name: { companyId: membership.companyId, name } },
      create: { companyId: membership.companyId, name, location: tender.location, createdById: tender.clientId },
      update: {},
    });
    await prisma.tender.update({ where: { id: tender.id }, data: { projectId: project.id } });
    await prisma.award.updateMany({ where: { tenderId: tender.id, projectId: null }, data: { projectId: project.id } });
    created += 1;
  }
  return created;
}

export async function persistNormalisedOperatingLocations(companyId: string, raw: string, userId?: string): Promise<string[]> {
  const current = raw.split(',').map((value) => value.trim()).filter(Boolean);
  const locations = normaliseOperatingLocations(current);
  if (locations.length === 0) return current;
  const coverage = coverageFieldsFromOperatingLocations(locations);
  if (coverage.operatingLocations === current.join(',')) return locations;
  await prisma.clientCompany.update({
    where: { id: companyId },
    data: { operatingLocations: coverage.operatingLocations },
  });
  if (userId) {
    await prisma.retailerProfile.updateMany({
      where: { userId },
      data: {
        coverageScope: coverage.coverageScope,
        counties: coverage.counties,
        regions: coverage.regions,
      },
    });
  }
  return locations;
}

export async function assignMissingTradeTenderId(companyId: string, current: string | null): Promise<string | null> {
  if (current) return current;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tradeTenderId = buildClientTradeTenderId();
    try {
      await prisma.clientCompany.update({ where: { id: companyId }, data: { tradeTenderId } });
      return tradeTenderId;
    } catch {
      continue;
    }
  }
  return null;
}

export async function repairSandboxContactNames(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      contactName: true,
      clientCompanyMembership: { select: { company: { select: { companyName: true } } } },
    },
  });
  let updated = 0;
  for (const user of users) {
    const names = personNameFromAccount({
      firstName: user.firstName,
      lastName: user.lastName,
      contactName: user.contactName,
      companyName: user.clientCompanyMembership?.company.companyName,
    });
    if (names.firstName === user.firstName && names.lastName === user.lastName) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: { firstName: names.firstName, lastName: names.lastName, contactName: `${names.firstName} ${names.lastName}` },
    });
    updated += 1;
  }
  return updated;
}

export async function extendOpenSandboxClosingDates(clientIds: string[], days = 21): Promise<number> {
  if (clientIds.length === 0) return 0;
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = await prisma.tender.updateMany({
    where: { clientId: { in: clientIds }, status: 'OPEN', closingDate: { lt: threshold } },
    data: { closingDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000) },
  });
  return result.count;
}

export async function hydrateEnterpriseRecords(clientIds: string[]): Promise<void> {
  await backfillMissingAwards(clientIds);
  await backfillMissingProjects(clientIds);
}
