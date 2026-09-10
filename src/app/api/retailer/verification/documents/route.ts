import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { uploadVerificationDocumentSchema } from '@/lib/schemas/verificationDocument';
import { getOwnRetailerProfileOrThrow, listVerificationDocuments, uploadVerificationDocument } from '@/server/domain/verificationDocumentService';
import { getApplicableVerificationDocuments } from '@/lib/verification-documents';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const profile = await getOwnRetailerProfileOrThrow(user.id);
    const documents = await listVerificationDocuments(profile.id);
    return NextResponse.json({
      applicableDocumentTypes: getApplicableVerificationDocuments(profile.categories).map((doc) => doc.type),
      documents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const parsed = uploadVerificationDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid document upload', issues: parsed.error.flatten() }, { status: 400 });
    }
    const document = await uploadVerificationDocument(user.id, parsed.data);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
