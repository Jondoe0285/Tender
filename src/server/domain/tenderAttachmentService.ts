import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

type AttachmentActor = { id: string };

/** Returns attachment bytes for the owning Client company, or a Provider with a persisted unlock. */
export async function getTenderAttachmentForDownload(tenderId: string, attachmentId: string, actor: AttachmentActor): Promise<{ id: string; fileName: string; mimeType: string; content: Buffer }> {
  const companyMemberIds = await getCompanyMemberIds(actor.id);
  const attachment = await prisma.tenderAttachment.findFirst({
    where: {
      id: attachmentId,
      tenderId,
      OR: [
        { tender: { clientId: { in: companyMemberIds } } },
        { tender: { unlocks: { some: { retailerId: actor.id } } } },
      ],
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