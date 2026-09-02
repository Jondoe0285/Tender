import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { ForbiddenError } from '../../src/server/auth/session';
import { prisma } from '../../src/server/data/prisma';
import { getTenderAttachmentForDownload } from '../../src/server/domain/tenderAttachmentService';
import { getUnlockedTenderForRetailer } from '../../src/server/domain/unlockService';

test('only the owning Client or a matched unlocked Retailer can retrieve a tender attachment', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let lockedRetailerId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) {
      await prisma.auditLog.deleteMany({ where: { targetType: 'TenderAttachment', metadata: { contains: tenderId } } });
    }
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    const userIds = [clientId, retailerId, lockedRetailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const [client, retailer, lockedRetailer] = await Promise.all([
    prisma.user.create({ data: { email: `attachment-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'CLIENT', contactName: 'Attachment Client' } }),
    prisma.user.create({ data: { email: `attachment-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'RETAILER', contactName: 'Attachment Retailer' } }),
    prisma.user.create({ data: { email: `attachment-locked-${suffix}@example.test`, passwordHash: 'not-used', role: 'RETAILER', contactName: 'Locked Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;
  lockedRetailerId = lockedRetailer.id;

  const tender = await prisma.tender.create({
    data: {
      reference: `ATT-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional attachment access test tender',
      attachments: { create: { fileName: 'site-plan.pdf', mimeType: 'application/pdf', sizeBytes: 4, content: Buffer.from('test') } },
    },
    include: { attachments: true },
  });
  tenderId = tender.id;
  const attachmentId = tender.attachments[0]!.id;
  await prisma.tenderMatch.createMany({ data: [{ tenderId, retailerId }, { tenderId, retailerId: lockedRetailerId }] });

  await assert.rejects(
    () => getTenderAttachmentForDownload(tenderId!, attachmentId, { id: lockedRetailerId!, role: 'RETAILER' }),
    (error: unknown) => error instanceof ForbiddenError
  );
  await assert.rejects(
    () => getUnlockedTenderForRetailer(retailerId!, tenderId!),
    (error: unknown) => error instanceof ForbiddenError
  );

  await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID' } });

  const unlockedTender = await getUnlockedTenderForRetailer(retailerId, tenderId);
  assert.deepEqual(unlockedTender.attachments, [{ id: attachmentId, fileName: 'site-plan.pdf', mimeType: 'application/pdf', sizeBytes: 4 }]);

  const retailerAttachment = await getTenderAttachmentForDownload(tenderId, attachmentId, { id: retailerId, role: 'RETAILER' });
  assert.equal(retailerAttachment.content.toString(), 'test');
  const clientAttachment = await getTenderAttachmentForDownload(tenderId, attachmentId, { id: clientId, role: 'CLIENT' });
  assert.equal(clientAttachment.content.toString(), 'test');

  const auditEvents = await prisma.auditLog.findMany({ where: { targetId: attachmentId, action: 'TENDER_ATTACHMENT_DOWNLOADED' } });
  assert.equal(auditEvents.length, 2);
  assert.deepEqual(auditEvents.map((event) => event.actorId).sort(), [clientId, retailerId].sort());

  await prisma.tenderAttachment.delete({ where: { id: attachmentId } });
  await assert.rejects(
    () => getTenderAttachmentForDownload(tenderId, attachmentId, { id: retailerId, role: 'RETAILER' }),
    (error: unknown) => error instanceof ForbiddenError
  );
});