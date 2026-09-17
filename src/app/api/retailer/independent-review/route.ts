import { NextResponse } from 'next/server';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { isVerificationEligible } from '@/lib/categories';
import { INDEPENDENT_REVIEW_TIERS, isIndependentReviewTier, type IndependentReviewTier } from '@/lib/independentReviewTiers';
import { getIndependentReviewFeesGbp, getIndependentReviewFeeGbp, isIndependentReviewActive } from '@/server/domain/platformSettings';
import { createPayment } from '@/server/payments/paymentService';
import { canPurchaseIndependentReviewTier, getIndependentReviewExpiryDate, independentReviewExpired } from '@/server/domain/independentReviewService';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
      select: {
        categories: true,
        independentReviewStatus: true,
        independentReviewTier: true,
        independentReviewPurchasedTier: true,
        independentReviewPurchasedAt: true,
        independentReviewDecidedAt: true,
        independentReviewNote: true,
      },
    });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });

    const [active, fees] = await Promise.all([isIndependentReviewActive(), getIndependentReviewFeesGbp()]);
    const expiresAt = getIndependentReviewExpiryDate(profile.independentReviewDecidedAt);
    const expired = independentReviewExpired(profile.independentReviewStatus, profile.independentReviewDecidedAt);
    const purchaseState = {
      status: profile.independentReviewStatus,
      awardedTier: profile.independentReviewTier,
      purchasedAt: profile.independentReviewPurchasedAt,
      decidedAt: profile.independentReviewDecidedAt,
    };
    const purchasableTiers = INDEPENDENT_REVIEW_TIERS.filter((tier) => canPurchaseIndependentReviewTier(purchaseState, tier).allowed);
    return NextResponse.json({
      active,
      fees,
      eligible: isVerificationEligible(profile.categories),
      status: profile.independentReviewStatus,
      tier: profile.independentReviewTier,
      purchasedTier: profile.independentReviewPurchasedTier,
      purchasedAt: profile.independentReviewPurchasedAt,
      decidedAt: profile.independentReviewDecidedAt,
      note: profile.independentReviewNote,
      expiresAt,
      expired,
      purchasableTiers,
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
    const tier = isIndependentReviewTier(body?.tier) ? body.tier as IndependentReviewTier : null;
    if (!tier) return NextResponse.json({ error: 'Select Bronze, Silver, or Gold verification' }, { status: 400 });

    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
      select: {
        categories: true,
        independentReviewStatus: true,
        independentReviewTier: true,
        independentReviewPurchasedAt: true,
        independentReviewDecidedAt: true,
      },
    });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    if (!await isIndependentReviewActive()) return NextResponse.json({ error: 'Enhanced review purchases are not currently available' }, { status: 403 });
    if (!isVerificationEligible(profile.categories)) return NextResponse.json({ error: 'Enhanced review is only available for Materials, Waste, Plant Hire, Contractor Services, or Professional Services providers' }, { status: 403 });

    const decision = canPurchaseIndependentReviewTier({
      status: profile.independentReviewStatus,
      awardedTier: profile.independentReviewTier,
      purchasedAt: profile.independentReviewPurchasedAt,
      decidedAt: profile.independentReviewDecidedAt,
    }, tier);
    if (!decision.allowed) {
      if (decision.reason === 'in_flight') {
        return NextResponse.json({ error: 'An enhanced review has already been purchased and is awaiting a decision' }, { status: 409 });
      }
      return NextResponse.json({ error: 'You can only purchase a higher verification tier than your current award' }, { status: 403 });
    }

    const mobileReturnUrl = typeof body?.mobileReturnUrl === 'string' ? body.mobileReturnUrl : undefined;
    const result = await createPayment({ type: 'INDEPENDENT_REVIEW', userId: user.id, mobileReturnUrl, independentReviewTier: tier });
    return NextResponse.json({ ...result, feeGbp: await getIndependentReviewFeeGbp(tier) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
