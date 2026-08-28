import { prisma } from '@/server/data/prisma';

export const UNPURCHASED_QUOTE_RETENTION_DAYS = 30;
export const PURCHASED_DOCUMENT_RETENTION_YEARS = 5;

export function getUnpurchasedQuoteCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - UNPURCHASED_QUOTE_RETENTION_DAYS);
  return cutoff;
}

export function getPurchasedRetentionDeadline(now = new Date()): Date {
  const deadline = new Date(now);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + PURCHASED_DOCUMENT_RETENTION_YEARS);
  return deadline;
}

export async function purgeExpiredUnpurchasedQuotes(now = new Date()): Promise<{ quotesDeleted: number; documentsDeleted: number }> {
  const cutoff = getUnpurchasedQuoteCutoff(now);
  const quotes = await prisma.quote.findMany({
    where: {
      submittedAt: { lt: cutoff },
      status: { not: 'ACCEPTED' },
      releases: { none: {} },
    },
    select: { id: true, reference: true, tenderId: true, submittedAt: true },
  });

  const attachments = await prisma.tenderAttachment.findMany({
    where: { uploadedAt: { lt: cutoff }, retentionLockedUntil: null },
    select: { id: true, fileName: true, tenderId: true, uploadedAt: true },
  });

  if (quotes.length === 0 && attachments.length === 0) return { quotesDeleted: 0, documentsDeleted: 0 };

  await prisma.$transaction(async (transaction) => {
    for (const quote of quotes) {
      await transaction.quote.delete({ where: { id: quote.id } });
      await transaction.auditLog.create({
        data: {
          actorId: null,
          action: 'QUOTE_DELETED_RETENTION',
          targetType: 'Quote',
          targetId: quote.id,
          metadata: JSON.stringify({ reference: quote.reference, tenderId: quote.tenderId, submittedAt: quote.submittedAt.toISOString(), cutoff: cutoff.toISOString() }),
        },
      });
    }
    for (const attachment of attachments) {
      await transaction.tenderAttachment.delete({ where: { id: attachment.id } });
      await transaction.auditLog.create({
        data: {
          actorId: null,
          action: 'DOCUMENT_DELETED_RETENTION',
          targetType: 'TenderAttachment',
          targetId: attachment.id,
          metadata: JSON.stringify({ fileName: attachment.fileName, tenderId: attachment.tenderId, uploadedAt: attachment.uploadedAt.toISOString(), cutoff: cutoff.toISOString() }),
        },
      });
    }
  });

  return { quotesDeleted: quotes.length, documentsDeleted: attachments.length };
}
