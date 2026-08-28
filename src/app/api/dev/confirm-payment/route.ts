import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireRole } from '@/server/auth/session';
import { confirmPayment, devPaymentConfirmationAllowed } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { rejectCrossOrigin } from '@/server/http/origin';
import { finalizeSponsoredPlacementWithPayment } from '@/server/domain/sponsoredPlacementService';
import { finalizeMembershipTierWithPayment } from '@/server/domain/membershipService';

const bodySchema = z.object({ paymentId: z.string().min(1) });

/**
 * Dev-only stand-in for the Stripe webhook so payment flows can be tested locally without keys.
 * Refuses to run once Stripe is configured or in production — real deployments must go through
 * the signature-verified webhook only.
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!devPaymentConfirmationAllowed()) {
    return NextResponse.json({ error: 'Dev payment confirmation is disabled' }, { status: 403 });
  }

  const user = await requireRole().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (payment.status !== 'PENDING') {
    return NextResponse.json({ error: 'Payment is not pending' }, { status: 409 });
  }

  await confirmPayment(payment.id);
  if (payment.type === 'SPONSORED_PLACEMENT') await finalizeSponsoredPlacementWithPayment(user.id, payment.id);
  if (payment.type === 'MEMBERSHIP_TIER' && payment.tierId) await finalizeMembershipTierWithPayment(user.id, payment.tierId, payment.id);
  await recordAuditEvent({
    actorId: user.id,
    action: 'PAYMENT_CONFIRMED_DEV',
    targetType: 'Payment',
    targetId: payment.id,
    metadata: { type: payment.type },
  });

  return NextResponse.json({ status: 'CONFIRMED' });
}
