import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { isSameOriginRequest } from '@/server/http/origin';
import { prisma } from '@/server/data/prisma';
import { z } from 'zod';
import { matchRetailerToOpenTenders } from '@/server/domain/tenderService';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  companyNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
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
    const updated = await prisma.retailerProfile.update({
      where: { userId: user.id },
      data: {
        companyName: parsed.companyName,
        companyNumber: parsed.companyNumber || null,
        address: parsed.address || null,
        coverageScope: parsed.coverageScope,
        counties: parsed.counties,
        regions: parsed.regions,
        categories: parsed.categories,
        masterUserId: parsed.masterUserId || null,
      },
    });

    // Categories/coverage may now qualify this Retailer for tenders that were already open —
    // matching otherwise only runs once, at tender creation time.
    await matchRetailerToOpenTenders(user.id);

    return NextResponse.json(updated, { status: 200 });
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

    const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'Retailer profile not found' }, { status: 404 });
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error('Error fetching retailer profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
