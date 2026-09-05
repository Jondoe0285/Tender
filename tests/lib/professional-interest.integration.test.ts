import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { ForbiddenError } from '../../src/server/auth/session';
import { prisma } from '../../src/server/data/prisma';
import { getProfessionalInterestContact, registerProfessionalInterest } from '../../src/server/domain/professionalInterestService';

test('Professional Services interest is free and releases the tender owner contact only after the deadline', async (context) => {
  const suffix = randomUUID();
  let tenderId: string | undefined;
  let ownerId: string | undefined;
  let professionalId: string | undefined;
  let companyId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.professionalInterest.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderItem.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (professionalId) await prisma.retailerProfile.deleteMany({ where: { userId: professionalId } });
    if (companyId) await prisma.clientCompany.deleteMany({ where: { id: companyId } });
    const userIds = [ownerId, professionalId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const [owner, professional] = await Promise.all([
    prisma.user.create({ data: { email: `professional-owner-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Tender Owner', contactPhone: '07123456789' } }),
    prisma.user.create({ data: { email: `professional-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Professional User' } }),
  ]);
  ownerId = owner.id;
  professionalId = professional.id;
  const company = await prisma.clientCompany.create({ data: { companyName: `Professional Test ${suffix}`, branchIdentifier: suffix, primaryUserId: professionalId, services: 'Professional Services', operatingLocations: 'United Kingdom', members: { create: { userId: professionalId } } } });
  companyId = company.id;
  await prisma.retailerProfile.create({ data: { userId: professionalId, companyName: company.companyName, categories: 'Professional Services', coverageAreas: '', coverageScope: 'UK', counties: '', regions: '' } });
  const tender = await prisma.tender.create({ data: { reference: `PRO-${suffix}`, clientId: ownerId, category: 'Professional Services', subcategory: 'Safety, Compliance & Consultancy', location: 'Leeds LS10 2AB', quantity: '5 days', urgency: 'standard', closingDate: new Date(Date.now() + 86_400_000), requirements: '', description: 'Professional services interest test', items: { create: { category: 'Professional Services', subcategory: 'Safety, Compliance & Consultancy', quantity: '5 days', description: 'Professional services requirement' } } } });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId: professionalId } });

  await registerProfessionalInterest(professionalId, tenderId);
  assert.equal(await prisma.payment.count({ where: { tenderId, userId: professionalId } }), 0);
  await assert.rejects(() => getProfessionalInterestContact(professionalId, tenderId), (error: unknown) => error instanceof ForbiddenError);

  await prisma.tender.update({ where: { id: tenderId }, data: { closingDate: new Date(Date.now() - 1_000) } });
  const contact = await getProfessionalInterestContact(professionalId, tenderId);
  assert.equal(contact.email, owner.email);
  assert.ok(await prisma.professionalInterest.findFirst({ where: { tenderId, retailerId: professionalId, releasedAt: { not: null } } }));
});