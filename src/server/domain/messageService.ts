import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { enforceContentModeration } from '@/server/moderation/contentModeration';
import { getTenderReviewSnapshot } from '@/server/domain/tenderService';

const MAX_MESSAGE_LENGTH = 2000;

type MessageActor = { id: string };
export type MessageUnavailableReason = 'NO_RELEASE' | 'CLOSED';

async function resolveThread(tenderId: string, actor: MessageActor, quoteId?: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId }, select: { clientId: true, status: true, closingDate: true } });
  if (!tender) throw new ForbiddenError('Tender not found');
  const closed = tender.status === 'CLOSED' || tender.closingDate.getTime() <= Date.now();

  let retailerId: string;
  if (tender.clientId === actor.id) {
    let resolvedQuoteId = quoteId;
    if (!resolvedQuoteId) {
      const accepted = await prisma.quote.findFirst({ where: { tenderId, status: 'ACCEPTED' }, select: { id: true, retailerId: true } });
      resolvedQuoteId = accepted?.id;
    }
    if (!resolvedQuoteId) {
      return { unavailableReason: (closed ? 'CLOSED' : 'NO_RELEASE') as MessageUnavailableReason };
    }
    const quote = await prisma.quote.findUnique({ where: { id: resolvedQuoteId }, select: { retailerId: true, tenderId: true } });
    if (!quote || quote.tenderId !== tenderId) throw new ForbiddenError('Message thread not available');
    retailerId = quote.retailerId;
  } else {
    retailerId = actor.id;
  }

  const release = await prisma.contactRelease.findFirst({
    where: { tenderId, clientId: tender.clientId, retailerId },
    select: { id: true },
  });
  if (!release) {
    return { unavailableReason: (closed ? 'CLOSED' : 'NO_RELEASE') as MessageUnavailableReason };
  }
  return { clientId: tender.clientId, retailerId };
}

export async function listTenderMessages(tenderId: string, actor: MessageActor, quoteId?: string) {
  const thread = await resolveThread(tenderId, actor, quoteId);
  if ('unavailableReason' in thread) {
    return { messages: [] as const, unavailableReason: thread.unavailableReason };
  }
  const messages = await prisma.tenderMessage.findMany({
    where: { tenderId, retailerId: thread.retailerId },
    include: { sender: { select: { id: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderRole: message.sender.role,
      isOwn: message.senderId === actor.id,
    })),
  };
}

export async function sendTenderMessage(tenderId: string, actor: MessageActor, body: string, quoteId?: string) {
  const normalizedBody = body.trim();
  if (normalizedBody.length === 0 || normalizedBody.length > MAX_MESSAGE_LENGTH) {
    throw new ForbiddenError('Message must be between 1 and 2,000 characters');
  }
  const thread = await resolveThread(tenderId, actor, quoteId);
  if ('unavailableReason' in thread) {
    throw new ForbiddenError(thread.unavailableReason === 'CLOSED'
      ? 'This tender is closed. Questions are no longer available.'
      : 'Questions open after a quote is accepted and contact details are released.');
  }
  const tenderReviewSnapshot = await getTenderReviewSnapshot(tenderId);
  await enforceContentModeration(actor.id, 'TENDER_MESSAGE', [{ name: 'message', value: normalizedBody }], { type: 'TENDER_MESSAGE', tender: tenderReviewSnapshot, message: normalizedBody });
  return prisma.tenderMessage.create({
    data: { tenderId, retailerId: thread.retailerId, clientId: thread.clientId, senderId: actor.id, body: normalizedBody },
    select: { id: true, body: true, createdAt: true },
  });
}