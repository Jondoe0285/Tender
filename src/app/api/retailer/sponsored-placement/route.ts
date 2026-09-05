import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';
import { requestSponsoredPlacement, sponsoredPlacementEnabled } from '@/server/domain/sponsoredPlacementService';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';

export async function GET() {
  try {
    const user = await requireRole('PROVIDER');
    const [enabled, activePlacement, feeGbp] = await Promise.all([
      sponsoredPlacementEnabled(),
      prisma.retailerSponsoredPlacement.findFirst({ where: { retailerId: user.id, active: true } }),
      getPaymentFeeGbp('SPONSORED_PLACEMENT'),
    ]);
    return NextResponse.json({ enabled, active: Boolean(activePlacement), feeGbp });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('PROVIDER');
    const outcome = await requestSponsoredPlacement(user.id);
    return NextResponse.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
