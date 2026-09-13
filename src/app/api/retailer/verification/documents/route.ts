import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { uploadVerificationDocumentSchema } from '@/lib/schemas/verificationDocument';
import { getOwnRetailerProfileOrThrow, listVerificationDocuments, uploadVerificationDocument } from '@/server/domain/verificationDocumentService';
import { getApplicableVerificationDocuments, getRequiredVerificationDocumentTypes, isSoleTraderEvidenceSufficient, SOLE_TRADER_MODERATE_DOCUMENT_TYPES, SOLE_TRADER_STRONG_DOCUMENT_TYPES } from '@/lib/verification-documents';
import { isIncorporatedCompanyType } from '@/lib/companyTypes';
import { isHumanReviewActive } from '@/server/domain/platformSettings';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const profile = await getOwnRetailerProfileOrThrow(user.id);
    const [documents, humanReviewActive] = await Promise.all([
      listVerificationDocuments(profile.id),
      isHumanReviewActive(),
    ]);
    const applicableDocuments = getApplicableVerificationDocuments(profile.categories);
    const now = Date.now();
    const validUploadedTypes = documents.filter((document) => !document.expiryDate || new Date(document.expiryDate).getTime() > now).map((document) => document.documentType);
    return NextResponse.json({
      applicableDocumentTypes: applicableDocuments.map((doc) => doc.type),
      requiredDocumentTypes: getRequiredVerificationDocumentTypes(profile.categories, profile.companyType),
      documents,
      humanReviewActive,
      isSoleTrader: profile.isSoleTrader,
      isIncorporated: isIncorporatedCompanyType(profile.companyType),
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
