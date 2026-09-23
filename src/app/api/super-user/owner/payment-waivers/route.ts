import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { grantPaymentWaiverSchema } from '@/lib/schemas/paymentWaiver';
import { listPaymentWaivers } from '@/server/domain/paymentWaiverService';
import { listPendingControlChanges, proposeWaiverGrant } from '@/server/domain/controlChangeService';

export async function GET() {
  try {
    await requireOwner();
    const [waivers, pending] = await Promise.all([listPaymentWaivers(), listPendingControlChanges()]);
    return NextResponse.json({ waivers, pending: pending.filter((change) => change.kind === 'WAIVER_GRANT' || change.kind === 'WAIVER_REVOKE') });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  try {
    const owner = await requireOwner();
    const parsed = grantPaymentWaiverSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment waiver details' }, { status: 400 });
    const change = await proposeWaiverGrant(owner.id, parsed.data);
    return NextResponse.json({ status: 'pending', changeId: change.id }, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}