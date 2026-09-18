import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { finalizeDirectContactWithPayment, getDirectContactStatus, listDirectContactRequestsForTender, requestDirectContact } from '@/server/domain/directContactService';
import { userOwnsTender } from '@/server/domain/tenderService';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('USER');
    const { id } = await props.params;
    if (await userOwnsTender(user.id, id)) {
      const requests = await listDirectContactRequestsForTender(user.id, id);
      return NextResponse.json({ contacts: requests.map((request) => ({ id: request.id, releasedAt: request.releasedAt, contact: { contactName: request.requester.contactName, contactPhone: request.requester.contactPhone, email: request.requester.email, companyName: request.requester.retailerProfile?.companyName ?? request.requester.contactName, categories: request.requester.retailerProfile?.categories ?? '' } })) });
    }
    const status = await getDirectContactStatus(user.id, id);
    return NextResponse.json({ active: status.active, available: status.available, feeGbp: status.feeGbp, released: Boolean(status.request?.releasedAt), paymentId: status.request?.paymentId ?? null, checkoutUrl: status.request?.payment?.stripeCheckoutUrl ?? null, paymentStatus: status.request?.payment?.status ?? null });
  } catch (error) { return toErrorResponse(error); }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const { id } = await props.params;
    const result = await requestDirectContact(user.id, id);
    return NextResponse.json(result, { status: result.status === 'RELEASED' ? 200 : 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const { id } = await props.params;
    const { paymentId } = await request.json().catch(() => ({ paymentId: null })) as { paymentId?: string | null };
    if (!paymentId) return NextResponse.json({ error: 'Payment id is required' }, { status: 400 });
    await finalizeDirectContactWithPayment(user.id, paymentId);
    return NextResponse.json({ status: 'released', tenderId: id });
  } catch (error) { return toErrorResponse(error); }
}