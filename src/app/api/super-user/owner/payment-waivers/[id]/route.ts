import { NextResponse } from 'next/server';
import { requireOwner } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { revokePaymentWaiverSchema } from '@/lib/schemas/paymentWaiver';
import { revokePaymentWaiver } from '@/server/domain/paymentWaiverService';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  try {
    const owner = await requireOwner();
    const parsed = revokePaymentWaiverSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A valid revocation reason is required' }, { status: 400 });
    const { id } = await props.params;
    await revokePaymentWaiver(owner.id, id, parsed.data.reason);
    return NextResponse.json({ status: 'revoked' });
  } catch (error) {
    return toErrorResponse(error);
  }
}