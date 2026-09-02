export const MAX_TENDER_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TENDER_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024;

type VerifiedTenderAttachment = {
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  dataBase64: string;
};

// A flat character class (no repeated group) avoids V8 regex stack overflows on large decoded files.
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const PDF_ACTIVE_CONTENT_MARKERS = [
  '/AA',
  '/EmbeddedFile',
  '/JavaScript',
  '/JS',
  '/Launch',
  '/OpenAction',
  '/RichMedia',
  '/XFA',
];

function hasFileExtension(fileName: string, extensions: readonly string[]): boolean {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return extensions.includes(extension);
}

function detectMimeType(bytes: Buffer): VerifiedTenderAttachment['mimeType'] | null {
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

export function verifyTenderAttachment(input: { name: string; mimeType: string; dataBase64: string }): VerifiedTenderAttachment {
  if (input.dataBase64.length === 0 || input.dataBase64.length % 4 !== 0 || !BASE64_PATTERN.test(input.dataBase64)) {
    throw new Error('Attachment content must be valid base64');
  }

  const bytes = Buffer.from(input.dataBase64, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_TENDER_ATTACHMENT_BYTES) {
    throw new Error('Attachment exceeds the 10 MiB decoded file limit');
  }

  const detectedMimeType = detectMimeType(bytes);
  if (!detectedMimeType || input.mimeType.toLowerCase() !== detectedMimeType) {
    throw new Error('Attachment type does not match an allowed file signature');
  }

  const allowedExtensions = detectedMimeType === 'application/pdf'
    ? ['.pdf']
    : detectedMimeType === 'image/png'
      ? ['.png']
      : ['.jpg', '.jpeg'];
  if (!hasFileExtension(input.name, allowedExtensions)) {
    throw new Error('Attachment filename does not match its verified file type');
  }

  if (detectedMimeType === 'application/pdf' && PDF_ACTIVE_CONTENT_MARKERS.some((marker) => bytes.includes(Buffer.from(marker, 'ascii')))) {
    throw new Error('Active PDF content is not allowed');
  }

  return { mimeType: detectedMimeType, sizeBytes: bytes.length, dataBase64: bytes.toString('base64') };
}

export function buildSafeAttachmentName(input: string): string {
  const cleaned = input
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();

  return cleaned && cleaned.length > 0 ? cleaned : 'attachment';
}
