import { prisma } from '@/server/data/prisma';
import { isAttachmentKind } from '@/lib/attachment-kinds';
import { deletePrivateObject, putPrivateObject, readStoredObjectBytes, tenderAttachmentObjectKey } from '@/server/storage/privateObjectStore';

export async function persistNewTenderAttachments(
  tenderId: string,
  attachments: Array<{ name: string; mimeType: string; sizeBytes: number; dataBase64: string; kind?: string }>,
): Promise<void> {
  for (const attachment of attachments) {
    const bytes = Buffer.from(attachment.dataBase64, 'base64');
    const created = await prisma.tenderAttachment.create({
      data: {
        tenderId,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        content: Buffer.alloc(0),
        kind: attachment.kind && isAttachmentKind(attachment.kind) ? attachment.kind : 'OTHER',
        version: 1,
      },
    });
    const objectKey = tenderAttachmentObjectKey(tenderId, created.id);
    try {
      await putPrivateObject(objectKey, bytes);
      await prisma.tenderAttachment.update({ where: { id: created.id }, data: { objectKey } });
    } catch (error) {
      await prisma.tenderAttachment.delete({ where: { id: created.id } }).catch(() => null);
      throw error;
    }
  }
}

export async function readTenderAttachmentBytes(attachment: { objectKey: string | null; content: Uint8Array | Buffer | null }): Promise<Buffer | null> {
  return readStoredObjectBytes(attachment.objectKey, attachment.content);
}

export async function deleteStoredTenderAttachment(objectKey: string | null): Promise<void> {
  if (!objectKey) return;
  await deletePrivateObject(objectKey);
}
