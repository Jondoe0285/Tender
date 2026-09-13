import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { isSameOriginRequest } from '@/server/http/origin';
import { prisma } from '@/server/data/prisma';
import { z } from 'zod';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';
import { isVerificationEligible } from '@/lib/categories';
import { markUploadedDocumentsVerified, syncVerificationExpiry } from '@/server/domain/verificationDocumentService';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  companyNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  companyType: z.enum(['SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY', 'OTHER']),
  standardQuoteValidityDays: z.coerce.number().int().positive().max(365).optional(),
  coverageScope: z.enum(['COUNTY', 'REGION', 'UK']),
  counties: z.string(), // comma-separated
  regions: z.string(), // comma-separated
  categories: z.string(), // comma-separated
  masterUserId: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  // CSRF protection
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    // Verify retailer profile exists
    const profile = await prisma.retailerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    }

    // Update profile
    const categoriesChanged = parsed.categories !== profile.categories;
    const companyTypeChanged = parsed.companyType !== profile.companyType;
    const servicesChanged = categoriesChanged || companyTypeChanged;
    const isSoleTrader = parsed.companyType === 'SOLE_TRADER';

    const resetVerification = servicesChanged && (profile.verificationStatus === 'VERIFIED' || profile.verificationStatus === 'PENDING');
    const resetIndependent = servicesChanged && (profile.independentReviewStatus === 'APPROVED' || profile.independentReviewStatus === 'PURCHASED');

    const updated = await prisma.retailerProfile.update({
      where: { userId: user.id },
      data: {
        companyName: parsed.companyName,
        companyNumber: parsed.companyNumber || null,
        address: parsed.address || null,
        companyType: parsed.companyType,
        isSoleTrader,
        ...(resetVerification ? {
          verificationStatus: 'UNVERIFIED' as const,
          verificationDecidedAt: new Date(),
          verificationNote: companyTypeChanged ? 'Company type changed: verification must be completed again for the new company type.' : 'Service scope changed: verification reset due to modified service requirements.',
        } : {}),
        ...(resetIndependent ? {
          independentReviewStatus: 'NOT_PURCHASED' as const,
          independentReviewNote: 'Service scope changed: enhanced verification reset due to the addition of new legal and compliance requirements.',
        } : {}),
        standardQuoteValidityDays: parsed.standardQuoteValidityDays ?? profile.standardQuoteValidityDays,
        coverageScope: parsed.coverageScope,
        counties: parsed.counties,
        regions: parsed.regions,
        categories: parsed.categories,
        masterUserId: parsed.masterUserId || null,
      },
    });

    if (resetVerification) {
      await markUploadedDocumentsVerified(profile.id, parsed.categories, false, isSoleTrader);
    }

    // Categories/coverage may now qualify this Retailer for tenders that were already open —
    // matching otherwise only runs once, at tender creation time.
    await matchRetailerToOpenTenders(user.id);

    const { verificationReport: _verificationReport, verificationConfidencePercent: _verificationConfidencePercent, ...publicProfile } = updated;
    return NextResponse.json({ ...publicProfile, verificationEligible: isVerificationEligible(updated.categories) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating retailer profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'USER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await syncVerificationExpiry(user.id);
    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    // The AI assessment report and confidence score are Super User review material only.
    const { verificationReport: _verificationReport, verificationConfidencePercent: _verificationConfidencePercent, ...publicProfile } = profile;
    return NextResponse.json({ ...publicProfile, verificationEligible: isVerificationEligible(profile.categories) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching retailer profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
