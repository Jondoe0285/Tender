import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { isVerificationEligible } from '@/lib/categories';
import { evaluateProviderVerification, evaluateSoleTraderVerification, markUploadedDocumentsVerified } from '@/server/domain/verificationDocumentService';

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const user = await requireRole('USER');

    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });

    if (!isVerificationEligible(profile.categories)) {
      return NextResponse.json({ error: 'Verification is only available for Materials, Waste, Plant Hire, Contractor Services, or Professional Services providers' }, { status: 403 });
    }
    if (profile.verificationStatus === 'PENDING' || profile.verificationStatus === 'VERIFIED') {
      return NextResponse.json({ error: 'A verification request is already pending or approved for this account' }, { status: 409 });
    }

    const evaluation = profile.isSoleTrader
      ? await evaluateSoleTraderVerification(profile.id)
      : await evaluateProviderVerification(profile.id, profile.categories, profile.companyType, profile.isSoleTrader);
    if (!evaluation.canProceed) {
      return NextResponse.json({ error: profile.isSoleTrader ? evaluation.report : 'Upload every required document, with a future expiry date, before submitting' }, { status: 400 });
    }

    const now = new Date();
    if (evaluation.passed) {
      const updated = await prisma.retailerProfile.update({
        where: { userId: user.id },
        data: {
          verificationStatus: 'VERIFIED',
          verificationRequestedAt: now,
          verificationDecidedAt: now,
          verificationNote: 'Automatically approved by document assessment.',
          verificationConfidencePercent: evaluation.confidencePercent,
          verificationReport: evaluation.report,
        },
      });
      await markUploadedDocumentsVerified(profile.id, profile.categories, true, profile.isSoleTrader);
      await recordAuditEvent({ actorId: user.id, action: 'PROVIDER_VERIFICATION_AUTO_APPROVED', targetType: 'User', targetId: user.id, metadata: { confidencePercent: evaluation.confidencePercent } });
      return NextResponse.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt }, { status: 200 });
    }

    const updated = await prisma.retailerProfile.update({
      where: { userId: user.id },
      data: {
        verificationStatus: 'REJECTED',
        verificationRequestedAt: now,
        verificationDecidedAt: now,
        verificationNote: 'Automatically declined: automated assessment could not confirm the required documents.',
        verificationConfidencePercent: evaluation.confidencePercent,
        verificationReport: evaluation.report,
      },
    });
    await recordAuditEvent({ actorId: user.id, action: 'PROVIDER_VERIFICATION_AUTO_DECLINED', targetType: 'User', targetId: user.id, metadata: { confidencePercent: evaluation.confidencePercent } });
    return NextResponse.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
