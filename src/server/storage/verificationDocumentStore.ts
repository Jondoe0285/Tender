import { deletePrivateObject, putPrivateObject, readStoredObjectBytes, verificationDocumentObjectKey } from '@/server/storage/privateObjectStore';

export async function persistVerificationDocumentFile(profileId: string, documentType: string, bytes: Buffer): Promise<string> {
  const objectKey = verificationDocumentObjectKey(profileId, documentType);
  await putPrivateObject(objectKey, bytes);
  return objectKey;
}

export async function readVerificationDocumentBytes(
  document: { objectKey?: string | null; content?: Uint8Array | Buffer | null },
  profileId: string,
  documentType: string,
): Promise<Buffer | null> {
  return readStoredObjectBytes(document.objectKey || verificationDocumentObjectKey(profileId, documentType), document.content);
}

export async function deleteStoredVerificationDocument(profileId: string, documentType: string, objectKey?: string | null): Promise<void> {
  await deletePrivateObject(objectKey || verificationDocumentObjectKey(profileId, documentType));
}
