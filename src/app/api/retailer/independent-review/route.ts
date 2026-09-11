import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { isVerificationEligible } from '@/lib/categories';
import { getIndependentReviewRenewalFeeGbp, getPaymentFeeGbp, isIndependentReviewActive, isIndependentReviewRenewalActive } from '@/server/domain/platformSettings';
import { createPayment } from '@/server/payments/paymentService';
import { getIndependentReviewExpiryDate, getIndependentReviewRenewalOpenDate, independentReviewExpired, independentReviewRenewalAvailable } from '@/server/domain/independentReviewService';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { categories: true, independentReviewStatus: true, independentReviewTier: true, independentReviewPurchasedAt: true, independentReviewDecidedAt: true, independentReviewNote: true } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });

    const [active, renewalActive, feeGbp, renewalFeeGbp] = await Promise.all([isIndependentReviewActive(), isIndependentReviewRenewalActive(), getPaymentFeeGbp('INDEPENDENT_REVIEW'), getIndependentReviewRenewalFeeGbp()]);
    const expiresAt = getIndependentReviewExpiryDate(profile.independentReviewDecidedAt);
    const renewalOpenAt = getIndependentReviewRenewalOpenDate(profile.independentReviewDecidedAt);
    const renewalAvailable = renewalActive && independentReviewRenewalAvailable(profile.independentReviewStatus, profile.independentReviewDecidedAt);
    const expired = independentReviewExpired(profile.independentReviewStatus, profile.independentReviewDecidedAt);
    return NextResponse.json({
      active,
      feeGbp,
      renewalActive,
      renewalFeeGbp,
      renewalAvailable,
      renewalOpenAt,
      expiresAt,
      expired,
      eligible: isVerificationEligible(profile.categories),
      status: profile.independentReviewStatus,
      tier: profile.independentReviewTier,
      purchasedAt: profile.independentReviewPurchasedAt,
      decidedAt: profile.independentReviewDecidedAt,
      note: profile.independentReviewNote,
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
    const body = await request.json().catch(() => null);

    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { categories: true, independentReviewStatus: true, independentReviewDecidedAt: true } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    if (!await isIndependentReviewActive()) return NextResponse.json({ error: 'Independent review purchases are not currently available' }, { status: 403 });
    if (!isVerificationEligible(profile.categories)) return NextResponse.json({ error: 'Independent review is only available for Materials, Waste, Plant Hire, Contractor Services, or Professional Services providers' }, { status: 403 });
    const renewalRequested = body?.mode === 'RENEWAL';
    const renewalAvailable = await isIndependentReviewRenewalActive() && independentReviewRenewalAvailable(profile.independentReviewStatus, profile.independentReviewDecidedAt);
    const expired = independentReviewExpired(profile.independentReviewStatus, profile.independentReviewDecidedAt);
    if (profile.independentReviewStatus === 'PURCHASED' || (profile.independentReviewStatus === 'APPROVED' && !renewalAvailable && !expired)) {
      return NextResponse.json({ error: 'An independent review has already been purchased or approved for this account' }, { status: 409 });
    }
    if (renewalRequested && !renewalAvailable) return NextResponse.json({ error: 'Renewal is only available from 11 months after approval until the independent verification expires' }, { status: 403 });

    const mobileReturnUrl = typeof body?.mobileReturnUrl === 'string' ? body.mobileReturnUrl : undefined;
    const feeOverrideGbp = renewalRequested ? await getIndependentReviewRenewalFeeGbp() : undefined;
    const result = await createPayment({ type: 'INDEPENDENT_REVIEW', userId: user.id, mobileReturnUrl, feeOverrideGbp });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
