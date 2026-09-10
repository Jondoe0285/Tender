import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { isVerificationEligible } from '@/lib/categories';
import { evaluateProviderVerification, markUploadedDocumentsVerified } from '@/server/domain/verificationDocumentService';
import { isHumanReviewActive } from '@/server/domain/platformSettings';
import { providerVerificationReviewRequiredTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const user = await requireRole('USER');

    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });

    if (!isVerificationEligible(profile.categories)) {
      return NextResponse.json({ error: 'Verification is only available for Waste, Plant Hire, Contractor Services, or Professional Services providers' }, { status: 403 });
    }
    if (profile.verificationStatus === 'PENDING' || profile.verificationStatus === 'VERIFIED') {
      return NextResponse.json({ error: 'A verification request is already pending or approved for this account' }, { status: 409 });
    }

    const evaluation = await evaluateProviderVerification(profile.id, profile.categories);
    if (!evaluation.canProceed) {
      return NextResponse.json({ error: 'Upload every required document, with a future expiry date, before submitting for review' }, { status: 400 });
    }

    const now = new Date();
    if (!evaluation.requiresHumanReview) {
      const updated = await prisma.retailerProfile.update({
        where: { userId: user.id },
        data: {
          verificationStatus: 'VERIFIED',
          verificationRequestedAt: now,
          verificationDecidedAt: now,
          verificationNote: 'Automatically approved by AI document assessment.',
          verificationConfidencePercent: evaluation.confidencePercent,
          verificationReport: evaluation.report,
        },
      });
      await markUploadedDocumentsVerified(profile.id, profile.categories, true);
      await recordAuditEvent({ actorId: user.id, action: 'PROVIDER_VERIFICATION_AUTO_APPROVED', targetType: 'User', targetId: user.id, metadata: { confidencePercent: evaluation.confidencePercent } });
      return NextResponse.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt }, { status: 200 });
    }

    if (!await isHumanReviewActive()) {
      const updated = await prisma.retailerProfile.update({
        where: { userId: user.id },
        data: {
          verificationStatus: 'REJECTED',
          verificationRequestedAt: now,
          verificationDecidedAt: now,
          verificationNote: 'Automatically declined: the document compliance score did not reach 90% and human review is not currently available.',
          verificationConfidencePercent: evaluation.confidencePercent,
          verificationReport: evaluation.report,
        },
      });
      await recordAuditEvent({ actorId: user.id, action: 'PROVIDER_VERIFICATION_AUTO_DECLINED', targetType: 'User', targetId: user.id, metadata: { confidencePercent: evaluation.confidencePercent } });
      return NextResponse.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt }, { status: 200 });
    }

    const updated = await prisma.retailerProfile.update({
      where: { userId: user.id },
      data: {
        verificationStatus: 'PENDING',
        verificationRequestedAt: now,
        verificationDecidedAt: null,
        verificationNote: null,
        verificationConfidencePercent: evaluation.confidencePercent,
        verificationReport: evaluation.report,
      },
    });
    await recordAuditEvent({ actorId: user.id, action: 'PROVIDER_VERIFICATION_REQUESTED', targetType: 'User', targetId: user.id, metadata: { confidencePercent: evaluation.confidencePercent } });

    const superUsers = await prisma.user.findMany({ where: { role: 'SUPER_USER', isAccountant: false, suspended: false }, select: { email: true } });
    await Promise.all(superUsers.map((superUser) => sendTransactionalEmail(
      superUser.email,
      providerVerificationReviewRequiredTemplate({ confidencePercent: evaluation.confidencePercent, reviewPath: `/super-user/users/${user.id}` })
    ).catch(() => undefined)));

    return NextResponse.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}


