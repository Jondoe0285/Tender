import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OBJECT_KEY_PATTERN = /^[A-Za-z0-9/_-]+$/;

export function attachmentStoreRoot(): string {
  return process.env.ATTACHMENT_STORE_DIR?.trim() || path.join(process.cwd(), 'data', 'attachments');
}

export function verificationDocumentObjectKey(profileId: string, documentType: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(profileId) || !/^[A-Za-z0-9_-]+$/.test(documentType)) {
    throw new Error('Invalid attachment object key');
  }
  return `verification/${profileId}/${documentType}`;
}

export function tenderAttachmentObjectKey(tenderId: string, attachmentId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(tenderId) || !/^[A-Za-z0-9_-]+$/.test(attachmentId)) {
    throw new Error('Invalid attachment object key');
  }
  return `tenders/${tenderId}/${attachmentId}`;
}

function resolveStorePath(objectKey: string): string {
  if (!OBJECT_KEY_PATTERN.test(objectKey) || objectKey.includes('..')) {
    throw new Error('Invalid attachment object key');
  }
  const root = path.resolve(attachmentStoreRoot());
  const resolved = path.resolve(root, objectKey);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid attachment object key');
  }
  return resolved;
}

export async function putPrivateObject(objectKey: string, bytes: Buffer): Promise<void> {
  const filePath = resolveStorePath(objectKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

export async function getPrivateObject(objectKey: string): Promise<Buffer> {
  return readFile(resolveStorePath(objectKey));
}

export async function deletePrivateObject(objectKey: string): Promise<void> {
  try {
    await unlink(resolveStorePath(objectKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export async function readStoredObjectBytes(objectKey: string | null | undefined, content: Uint8Array | Buffer | null | undefined): Promise<Buffer | null> {
  if (objectKey) {
    try {
      return await getPrivateObject(objectKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (!content || content.length === 0) return null;
  return Buffer.from(content);
}
