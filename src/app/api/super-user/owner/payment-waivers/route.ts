import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { grantPaymentWaiverSchema } from '@/lib/schemas/paymentWaiver';
import { grantPaymentWaiver, listPaymentWaivers } from '@/server/domain/paymentWaiverService';

export async function GET() {
  try {
    await requireOwner();
    return NextResponse.json({ waivers: await listPaymentWaivers() });
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
    const waiver = await grantPaymentWaiver(owner.id, parsed.data);
    return NextResponse.json({ waiver }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}