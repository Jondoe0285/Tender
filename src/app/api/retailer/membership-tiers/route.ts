import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { listAvailableMembershipTiers, requestMembershipTierPurchase } from '@/server/domain/membershipService';

const purchaseSchema = z.object({ tierId: z.string().min(1) });

export async function GET() {
  try {
    const user = await requireRole('PROVIDER');
    return NextResponse.json(await listAvailableMembershipTiers(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('PROVIDER');
    const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid membership tier' }, { status: 400 });
    return NextResponse.json(await requestMembershipTierPurchase(user.id, parsed.data.tierId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
