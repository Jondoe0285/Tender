import { NextResponse } from 'next/server';
import { requireFullSuperUser } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getVerificationDocumentForDownload } from '@/server/domain/verificationDocumentService';
import { VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentType } from '@/lib/verification-documents';

function safeDownloadFileName(fileName: string) {
  return fileName.replace(/[\\r\\n"]/g, '_').slice(0, 255) || 'document';
}

function safeMimeType(mimeType: string) {
  return /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mimeType) ? mimeType : 'application/octet-stream';
}

function parseDocumentType(value: string): VerificationDocumentType | null {
  return VERIFICATION_DOCUMENT_TYPES.some((doc) => doc.type === value) ? (value as VerificationDocumentType) : null;
}

export async function GET(_request: Request, props: { params: Promise<{ id: string; documentType: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireFullSuperUser();
    const documentType = parseDocumentType(params.documentType);
    if (!documentType) return NextResponse.json({ error: 'Unknown document type' }, { status: 404 });

    const document = await getVerificationDocumentForDownload(params.id, documentType, { id: admin.id, role: 'SUPER_USER' });
    return new NextResponse(new Uint8Array(document.content), {
      headers: {
        'Content-Type': safeMimeType(document.mimeType),
        'Content-Disposition': `attachment; filename="${safeDownloadFileName(document.fileName)}"`,
        'Cache-Control': 'private, no-store',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
