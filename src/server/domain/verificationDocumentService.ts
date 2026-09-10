import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { getRequiredVerificationDocumentTypes, isVerificationDocumentApplicable, VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentType } from '@/lib/verification-documents';
import type { UploadVerificationDocumentInput } from '@/lib/schemas/verificationDocument';
import { assessVerificationDocument } from '@/server/domain/verificationAiAssessment';

export async function getOwnRetailerProfileOrThrow(userId: string) {
  const profile = await prisma.retailerProfile.findUnique({ where: { userId } });
  if (!profile) throw new ForbiddenError('Retailer profile not found');
  return profile;
}

/** Provider-facing document list — never includes the AI assessment fields, which are Super User only. */
export async function listVerificationDocuments(retailerProfileId: string) {
  return prisma.verificationDocument.findMany({
    where: { retailerProfileId },
    select: { documentType: true, fileName: true, mimeType: true, sizeBytes: true, expiryDate: true, uploadedAt: true },
    orderBy: { documentType: 'asc' },
  });
}

/** Super User review list — includes the AI assessment report fields withheld from the Provider. */
export async function listVerificationDocumentsForReview(retailerProfileId: string) {
  return prisma.verificationDocument.findMany({
    where: { retailerProfileId },
    select: { documentType: true, fileName: true, mimeType: true, sizeBytes: true, expiryDate: true, uploadedAt: true, aiConfidencePercent: true, aiSummary: true, aiRequiresHumanReview: true, verified: true },
    orderBy: { documentType: 'asc' },
  });
}

/** A Provider may upload one file per document slot; re-uploading replaces the prior file and re-runs the AI assessment. */
export async function uploadVerificationDocument(userId: string, input: UploadVerificationDocumentInput) {
  const profile = await getOwnRetailerProfileOrThrow(userId);
  if (profile.verificationStatus === 'VERIFIED') {
    throw new ForbiddenError('This account is already verified');
  }
  if (!isVerificationDocumentApplicable(input.documentType as VerificationDocumentType, profile.categories)) {
    throw new ForbiddenError('This document is not applicable to the services offered by this account');
  }

  const content = Buffer.from(input.dataBase64, 'base64');
  const assessment = assessVerificationDocument({
    documentType: input.documentType as VerificationDocumentType,
    mimeType: input.mimeType,
    content,
    expiryDate: input.expiryDate,
    companyName: profile.companyName,
    address: profile.address,
  });

  const data = {
    fileName: input.name,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    content,
    expiryDate: input.expiryDate,
    aiConfidencePercent: assessment.confidencePercent,
    aiSummary: assessment.summary,
    aiRequiresHumanReview: assessment.requiresHumanReview,
    aiAssessedAt: new Date(),
    verified: false,
  };

  const document = await prisma.verificationDocument.upsert({
    where: { retailerProfileId_documentType: { retailerProfileId: profile.id, documentType: input.documentType as VerificationDocumentType } },
    update: data,
    create: { retailerProfileId: profile.id, documentType: input.documentType as VerificationDocumentType, ...data },
    select: { documentType: true, fileName: true, mimeType: true, sizeBytes: true, expiryDate: true, uploadedAt: true },
  });
  await recordAuditEvent({ actorId: userId, action: 'PROVIDER_VERIFICATION_DOCUMENT_UPLOADED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { documentType: input.documentType } });
  return document;
}

export async function deleteVerificationDocument(userId: string, documentType: VerificationDocumentType) {
  const profile = await getOwnRetailerProfileOrThrow(userId);
  await prisma.verificationDocument.deleteMany({ where: { retailerProfileId: profile.id, documentType } });
  await recordAuditEvent({ actorId: userId, action: 'PROVIDER_VERIFICATION_DOCUMENT_DELETED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { documentType } });
}

type DocumentActor = { id: string; role: 'USER' | 'SUPER_USER' };

/** Returns document bytes only to the owning Provider or a Super User reviewing the account. */
export async function getVerificationDocumentForDownload(retailerUserId: string, documentType: VerificationDocumentType, actor: DocumentActor) {
  if (actor.id !== retailerUserId && actor.role !== 'SUPER_USER') {
    throw new ForbiddenError('Document is not available');
  }
  const profile = await prisma.retailerProfile.findUnique({ where: { userId: retailerUserId }, select: { id: true } });
  if (!profile) throw new ForbiddenError('Document is not available');

  const document = await prisma.verificationDocument.findUnique({
    where: { retailerProfileId_documentType: { retailerProfileId: profile.id, documentType } },
    select: { id: true, fileName: true, mimeType: true, content: true },
  });
  if (!document) throw new ForbiddenError('Document is not available');

  await recordAuditEvent({ actorId: actor.id, action: 'PROVIDER_VERIFICATION_DOCUMENT_DOWNLOADED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { documentType } });
  return { ...document, content: Buffer.from(document.content) };
}

export type VerificationEvaluation = {
  canProceed: boolean;
  requiresHumanReview: boolean;
  confidencePercent: number;
  report: string;
  missingOrExpiredRequiredTypes: VerificationDocumentType[];
};

/** Aggregates the per-document AI assessments into one decision: auto-approve, or send for human review. */
export async function evaluateProviderVerification(retailerProfileId: string, categories: string): Promise<VerificationEvaluation> {
  const requiredTypes = getRequiredVerificationDocumentTypes(categories);
  const documents = await prisma.verificationDocument.findMany({ where: { retailerProfileId } });
  const documentsByType = new Map(documents.map((document) => [document.documentType, document] as const));
  const now = new Date();

  const missingOrExpiredRequiredTypes = requiredTypes.filter((type) => {
    const document = documentsByType.get(type);
    return !document || document.expiryDate <= now;
  });

  if (missingOrExpiredRequiredTypes.length > 0) {
    return {
      canProceed: false,
      requiresHumanReview: true,
      confidencePercent: 0,
      report: `Required documents missing or expired: ${missingOrExpiredRequiredTypes.join(', ')}.`,
      missingOrExpiredRequiredTypes,
    };
  }

  const requiredDocuments = requiredTypes.map((type) => documentsByType.get(type)!);
  const confidencePercent = requiredDocuments.length > 0
    ? Math.min(...requiredDocuments.map((document) => document.aiConfidencePercent ?? 0))
    : 0;
  const requiresHumanReview = confidencePercent < 90 || requiredDocuments.some((document) => document.aiRequiresHumanReview);

  const report = [
    `Overall AI confidence score: ${confidencePercent}%.`,
    `Human review required: ${requiresHumanReview ? 'yes' : 'no'}.`,
    ...requiredDocuments.map((document) => `- ${document.documentType}: ${document.aiSummary ?? 'No assessment recorded.'}`),
  ].join('\n');

  return { canProceed: true, requiresHumanReview, confidencePercent, report, missingOrExpiredRequiredTypes: [] };
}

/** Marks every currently-uploaded applicable document as verified evidence, shown to Contractors as the "what was checked" list. */
export async function markUploadedDocumentsVerified(retailerProfileId: string, categories: string, verified: boolean) {
  const applicableTypes = VERIFICATION_DOCUMENT_TYPES.filter((doc) => isVerificationDocumentApplicable(doc.type, categories)).map((doc) => doc.type);
  await prisma.verificationDocument.updateMany({ where: { retailerProfileId, documentType: { in: applicableTypes } }, data: { verified } });
}

/** A VERIFIED Provider loses that status the moment a required document's expiry date passes, until it is renewed and re-reviewed. */
export async function syncVerificationExpiryForUserIds(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const profiles = await prisma.retailerProfile.findMany({
    where: { userId: { in: userIds }, verificationStatus: 'VERIFIED' },
    select: { id: true, userId: true, categories: true },
  });
  if (profiles.length === 0) return;
  const now = new Date();

  for (const profile of profiles) {
    const requiredTypes = getRequiredVerificationDocumentTypes(profile.categories);
    const expired = await prisma.verificationDocument.findFirst({
      where: { retailerProfileId: profile.id, documentType: { in: requiredTypes }, expiryDate: { lte: now } },
      select: { documentType: true },
    });
    if (!expired) continue;

    await prisma.retailerProfile.update({ where: { id: profile.id }, data: { verificationStatus: 'EXPIRED' } });
    await markUploadedDocumentsVerified(profile.id, profile.categories, false);
    await recordAuditEvent({ actorId: null, action: 'PROVIDER_VERIFICATION_EXPIRED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { documentType: expired.documentType } });
  }
}

export async function syncVerificationExpiry(userId: string): Promise<void> {
  await syncVerificationExpiryForUserIds([userId]);
}
