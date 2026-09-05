import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

type AttachmentActor = { id: string };

/** Returns attachment bytes only for the owning Client or a matched Retailer with a persisted unlock. */
export async function getTenderAttachmentForDownload(tenderId: string, attachmentId: string, actor: AttachmentActor): Promise<{ id: string; fileName: string; mimeType: string; content: Buffer }> {
  const companyMemberIds = await getCompanyMemberIds(actor.id);
  const attachment = await prisma.tenderAttachment.findFirst({
    where: {
      id: attachmentId,
      tenderId,
      tender: { clientId: { in: companyMemberIds } },
    },
    select: { id: true, fileName: true, mimeType: true, content: true },
  });
  if (!attachment) throw new ForbiddenError('Attachment is not available');

  await recordAuditEvent({
    actorId: actor.id,
    action: 'TENDER_ATTACHMENT_DOWNLOADED',
    targetType: 'TenderAttachment',
    targetId: attachment.id,
    metadata: { tenderId },
  });

  // The query engine may return Bytes as a plain Uint8Array; normalize so .toString() decodes text.
  return { ...attachment, content: Buffer.from(attachment.content) };
}