import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('CLIENT');
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { tender: true, releasePayment: true },
    });
    if (!quote || quote.tender.clientId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!quote.releasePayment) return NextResponse.json({ status: 'NONE' });

    const payment = quote.releasePayment;
    return NextResponse.json({
      status: payment.status,
      paymentId: payment.id,
      checkoutUrl: payment.stripeCheckoutUrl,
      devMode: !payment.stripeCheckoutUrl,
      amountGbp: payment.amountGbp,
      vatGbp: payment.vatGbp,
      totalAmountGbp: payment.totalAmountGbp,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
