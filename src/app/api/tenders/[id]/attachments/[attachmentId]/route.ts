import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { getTenderAttachmentForDownload } from '@/server/domain/tenderAttachmentService';

export const dynamic = 'force-dynamic';

function safeDownloadFileName(fileName: string) {
  return fileName.replace(/[\\r\\n"]/g, '_').slice(0, 255) || 'attachment';
}

function safeMimeType(mimeType: string) {
  return /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mimeType)
    ? mimeType
    : 'application/octet-stream';
}

export async function GET(_request: Request, { params }: { params: { id: string; attachmentId: string } }) {
  try {
    const user = await requireRole('CLIENT', 'RETAILER');
    const attachment = await getTenderAttachmentForDownload(params.id, params.attachmentId, user);
    const fileName = safeDownloadFileName(attachment.fileName);

    return new NextResponse(attachment.content, {
      headers: {
        'Content-Type': safeMimeType(attachment.mimeType),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}