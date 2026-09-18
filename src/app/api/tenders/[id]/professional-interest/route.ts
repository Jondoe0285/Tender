import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';
import { getProfessionalInterestContact, getProfessionalInterestStatus, listProfessionalInterestContacts, registerProfessionalInterest } from '@/server/domain/professionalInterestService';
import { userOwnsTender } from '@/server/domain/tenderService';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const user = await requireRole('USER');
    const { id } = await props.params;
    const result = await registerProfessionalInterest(user.id, id);
    return NextResponse.json(result, { status: result.status === 'REGISTERED' ? 200 : 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('USER');
    const { id } = await props.params;
    if (await userOwnsTender(user.id, id)) {
      return NextResponse.json({ interests: await listProfessionalInterestContacts(user.id, id) });
    }
    const status = await getProfessionalInterestStatus(user.id, id);
    const registered = status.interest?.payment?.status === 'CONFIRMED';
    let contact = null;
    if (registered) {
      try {
        contact = await getProfessionalInterestContact(user.id, id);
      } catch {
        contact = null;
      }
    }
    return NextResponse.json({
      feeGbp: status.feeGbp,
      registered,
      paymentId: status.interest?.payment?.status === 'PENDING' ? status.interest.paymentId : null,
      checkoutUrl: status.interest?.payment?.status === 'PENDING' ? status.interest.payment.stripeCheckoutUrl : null,
      paymentStatus: status.interest?.payment?.status ?? null,
      contact,
    });
  } catch (error) { return toErrorResponse(error); }
}
