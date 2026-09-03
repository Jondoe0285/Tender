import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { rejectCrossOrigin } from '@/server/http/origin';
import { finalizeUnlockWithPayment, getUnlockedTenderForRetailer } from '@/server/domain/unlockService';

const bodySchema = z.object({ paymentId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('PROVIDER');
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    await finalizeUnlockWithPayment(user.id, params.id, parsed.data.paymentId);
    const tender = await getUnlockedTenderForRetailer(user.id, params.id);
    return NextResponse.json({ tender });
  } catch (error) {
    return toErrorResponse(error);
  }
}
