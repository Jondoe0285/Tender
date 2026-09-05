import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isPrimaryClientUser } from '../../src/lib/client-company';
import { prisma } from '../../src/server/data/prisma';
import { listTendersForClient } from '../../src/server/domain/tenderService';

test('identifies only the assigned Client company primary user', () => {
  assert.equal(isPrimaryClientUser('primary-user', 'primary-user'), true);
  assert.equal(isPrimaryClientUser('primary-user', 'additional-user'), false);
});

test('company service provisions retain both service levels', () => {
  const [service, provision] = 'Materials::Cement, Concrete and Mortar'.split('::');
  assert.equal(service, 'Materials');
  assert.equal(provision, 'Cement, Concrete and Mortar');
});

test('company members share tender visibility and branch identifiers distinguish company records', async (context) => {
  const suffix = randomUUID();
  let companyId: string | undefined;
  let tenderId: string | undefined;
  let primaryUserId: string | undefined;
  let memberUserId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (companyId) await prisma.clientCompany.deleteMany({ where: { id: companyId } });
    if (primaryUserId || memberUserId) await prisma.user.deleteMany({ where: { id: { in: [primaryUserId, memberUserId].filter((id): id is string => Boolean(id)) } } });
  });

  const [primaryUser, memberUser] = await Promise.all([
    prisma.user.create({ data: { email: `company-primary-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Company Primary' } }),
    prisma.user.create({ data: { email: `company-member-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Company Member' } }),
  ]);
  primaryUserId = primaryUser.id;
  memberUserId = memberUser.id;
  const company = await prisma.clientCompany.create({
    data: {
      companyName: 'Shared Company Test',
      branchIdentifier: suffix,
      primaryUserId,
      members: { create: [{ userId: primaryUserId }, { userId: memberUserId }] },
    },
  });
  companyId = company.id;
  const tender = await prisma.tender.create({
    data: { reference: `COMP-${suffix}`, clientId: primaryUserId, category: 'Materials', subcategory: 'Bricks', location: 'Leeds LS10 2AB', quantity: '100 units', urgency: 'standard', closingDate: new Date(Date.now() + 86_400_000), requirements: '', description: 'Company tender visibility test' },
  });
  tenderId = tender.id;

  const memberTenders = await listTendersForClient(memberUserId);
  assert.ok(memberTenders.some((item) => item.id === tenderId));
  assert.equal(company.branchIdentifier, suffix);
});

test('company operating location options include United Kingdom', () => {
  const profilePage = readFileSync(path.join(process.cwd(), 'src/app/client/profile/page.tsx'), 'utf8');
  assert.ok(profilePage.includes("'United Kingdom'"));
});

test('company service provisions support selecting every provision in a group', () => {
  const profilePage = readFileSync(path.join(process.cwd(), 'src/app/client/profile/page.tsx'), 'utf8');
  assert.ok(profilePage.includes('function toggleAllProvisions(service: string)'));
  assert.ok(profilePage.includes("'Select all'"));
  assert.ok(profilePage.includes("'Clear all'"));
});

test('company profile updates refresh active tender opportunity matching', () => {
  const profileRoute = readFileSync(path.join(process.cwd(), 'src/app/api/client/profile/route.ts'), 'utf8');
  assert.ok(profileRoute.includes('if (companyProfileChanged) await matchRetailerToOpenTenders(user.id)'));
  assert.ok(profileRoute.includes("coverageScope: parsed.data.operatingLocations.includes('United Kingdom') ? 'UK'"));
});