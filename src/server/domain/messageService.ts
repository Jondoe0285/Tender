import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { enforceContentModeration } from '@/server/moderation/contentModeration';

const MAX_MESSAGE_LENGTH = 2000;

type MessageActor = { id: string };

async function resolveThread(tenderId: string, actor: MessageActor, quoteId?: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId }, select: { clientId: true } });
  if (!tender) throw new ForbiddenError('Tender not found');

  let retailerId: string;
  if (tender.clientId === actor.id) {
    if (tender.clientId !== actor.id || !quoteId) throw new ForbiddenError('Message thread not available');
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { retailerId: true, tenderId: true } });
    if (!quote || quote.tenderId !== tenderId) throw new ForbiddenError('Message thread not available');
    retailerId = quote.retailerId;
  } else {
    retailerId = actor.id;
  }

  const release = await prisma.contactRelease.findFirst({
    where: { tenderId, clientId: tender.clientId, retailerId },
    select: { id: true },
  });
  if (!release) throw new ForbiddenError('Contact details must be released before messaging');
  return { clientId: tender.clientId, retailerId };
}

export async function listTenderMessages(tenderId: string, actor: MessageActor, quoteId?: string) {
  const thread = await resolveThread(tenderId, actor, quoteId);
  const messages = await prisma.tenderMessage.findMany({
    where: { tenderId, retailerId: thread.retailerId },
    include: { sender: { select: { id: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    senderRole: message.sender.role,
    isOwn: message.senderId === actor.id,
  }));
}

export async function sendTenderMessage(tenderId: string, actor: MessageActor, body: string, quoteId?: string) {
  const normalizedBody = body.trim();
  if (normalizedBody.length === 0 || normalizedBody.length > MAX_MESSAGE_LENGTH) {
    throw new ForbiddenError('Message must be between 1 and 2,000 characters');
  }
  const thread = await resolveThread(tenderId, actor, quoteId);
  await enforceContentModeration(actor.id, 'TENDER_MESSAGE', [{ name: 'message', value: normalizedBody }]);
  return prisma.tenderMessage.create({
    data: { tenderId, retailerId: thread.retailerId, clientId: thread.clientId, senderId: actor.id, body: normalizedBody },
    select: { id: true, body: true, createdAt: true },
  });
}