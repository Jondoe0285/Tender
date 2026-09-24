import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { uploadVerificationDocumentSchema } from '@/lib/schemas/verificationDocument';
import { MAX_VERIFICATION_DOCUMENT_BASE64_CHARS } from '@/lib/attachment-utils';
import { getOwnRetailerProfileOrThrow, listVerificationDocuments, uploadVerificationDocument } from '@/server/domain/verificationDocumentService';
import { getApplicableVerificationDocuments, getRequiredVerificationDocumentTypes, isSoleTraderEvidenceSufficient, isUploadedVerificationDocumentCurrent, SOLE_TRADER_MODERATE_DOCUMENT_TYPES, SOLE_TRADER_STRONG_DOCUMENT_TYPES } from '@/lib/verification-documents';
import { isIncorporatedCompanyType } from '@/lib/companyTypes';
import { getVerificationDocumentRequirements } from '@/server/domain/platformSettings';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const profile = await getOwnRetailerProfileOrThrow(user.id);
    const [documents, requirements] = await Promise.all([
      listVerificationDocuments(profile.id),
      getVerificationDocumentRequirements(),
    ]);
    const applicableDocuments = getApplicableVerificationDocuments(profile.categories);
    const now = Date.now();
    const validUploadedTypes = documents.filter((document) => isUploadedVerificationDocumentCurrent(document.expiryDate, now)).map((document) => document.documentType);
    return NextResponse.json({
      applicableDocumentTypes: applicableDocuments.map((doc) => doc.type),
      requiredDocumentTypes: getRequiredVerificationDocumentTypes(profile.categories, profile.companyType, requirements, profile.isSoleTrader),
      documents,
      isSoleTrader: profile.isSoleTrader,
      isIncorporated: !profile.isSoleTrader && isIncorporatedCompanyType(profile.companyType),
      soleTraderEvidence: profile.isSoleTrader ? {
        strongTypes: SOLE_TRADER_STRONG_DOCUMENT_TYPES,
        moderateTypes: SOLE_TRADER_MODERATE_DOCUMENT_TYPES,
        eligible: isSoleTraderEvidenceSufficient(validUploadedTypes),
      } : null,
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
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_VERIFICATION_DOCUMENT_BASE64_CHARS + 16 * 1024) {
      return NextResponse.json({ error: 'Verification PDF exceeds the 2 MB decoded file limit. Export a text PDF from Companies House or your insurer.' }, { status: 413 });
    }
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
