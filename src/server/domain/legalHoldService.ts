import { prisma } from '@/server/data/prisma';
import { ValidationError } from '@/server/auth/session';
import type { CreateLegalHoldInput } from '@/lib/schemas/legalHold';

export async function createLegalHold(actorId: string, input: CreateLegalHoldInput) {
  return prisma.$transaction(async (transaction) => {
    const existingHold = await transaction.legalHold.findFirst({
      where: { scope: input.scope, targetId: input.targetId, releasedAt: null },
      select: { id: true },
    });
    if (existingHold) throw new ValidationError('An active legal hold already exists for this record');

    if (input.scope === 'TENDER') {
      const tender = await transaction.tender.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!tender) throw new ValidationError('Tender not found');
    } else if (input.scope === 'QUOTE') {
      const quote = await transaction.quote.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!quote) throw new ValidationError('Quote not found');
    } else {
      const attachment = await transaction.tenderAttachment.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!attachment) throw new ValidationError('Tender attachment not found');
    }

    const hold = await transaction.legalHold.create({
      data: {
        scope: input.scope,
        targetId: input.targetId,
        reason: input.reason,
        createdById: actorId,
        ...(input.scope === 'TENDER' ? { tenderId: input.targetId } : {}),
        ...(input.scope === 'QUOTE' ? { quoteId: input.targetId } : {}),
        ...(input.scope === 'TENDER_ATTACHMENT' ? { attachmentId: input.targetId } : {}),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: 'LEGAL_HOLD_CREATED',
        targetType: input.scope,
        targetId: input.targetId,
        metadata: JSON.stringify({ legalHoldId: hold.id, reason: input.reason }),
      },
    });
    return hold;
  });
}

export async function releaseLegalHold(actorId: string, legalHoldId: string, reason: string) {
  return prisma.$transaction(async (transaction) => {
    const hold = await transaction.legalHold.findUnique({ where: { id: legalHoldId } });
    if (!hold) throw new ValidationError('Legal hold not found');
    if (hold.releasedAt) throw new ValidationError('Legal hold has already been released');

    const releasedAt = new Date();
    const releasedHold = await transaction.legalHold.update({
      where: { id: hold.id },
      data: { releasedById: actorId, releasedAt, releaseReason: reason },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: 'LEGAL_HOLD_RELEASED',
        targetType: hold.scope,
        targetId: hold.targetId,
        metadata: JSON.stringify({ legalHoldId: hold.id, reason }),
      },
    });
    return releasedHold;
  });
}