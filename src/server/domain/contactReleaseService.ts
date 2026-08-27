import { prisma } from '@/server/data/prisma';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { CLIENT_RELEASE_FEE_GBP } from '@/lib/categories';
import { ForbiddenError } from '@/server/auth/session';

type AcceptOutcome = { paymentId: string; checkoutUrl: string | null; devMode: boolean };

/** Accepting a quote enters a pending release-fee state — no contact data is exposed yet (SEC-035). */
export async function acceptQuote(clientId: string, quoteId: string): Promise<AcceptOutcome> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { tender: true, releasePayment: true } });
  if (!quote || quote.tender.clientId !== clientId) throw new ForbiddenError('Quote not found for this Client');
  if (quote.status === 'ACCEPTED' && quote.releasePayment) {
    return {
      paymentId: quote.releasePayment.id,
      checkoutUrl: quote.releasePayment.stripeCheckoutUrl,
      devMode: !quote.releasePayment.stripeCheckoutUrl,
    };
  }
  if (quote.status !== 'SUBMITTED' && quote.status !== 'ACCEPTED') throw new ForbiddenError('Quote is not in a state that can be accepted');

  if (quote.status === 'SUBMITTED') {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'ACCEPTED' } });
    await recordAuditEvent({
      actorId: clientId,
      action: 'QUOTE_ACCEPTED',
      targetType: 'Quote',
      targetId: quoteId,
      metadata: { tenderId: quote.tenderId },
    });
  }

  const payment = await createPayment({ type: 'CLIENT_RELEASE', amountGbp: CLIENT_RELEASE_FEE_GBP, userId: clientId, quoteId });
  return payment;
}

/** Releases contact details to both parties only once the release fee payment is CONFIRMED (SEC-035/037). */
export async function finalizeContactRelease(clientId: string, quoteId: string, paymentId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { tender: true } });
  if (!quote || quote.tender.clientId !== clientId) throw new ForbiddenError('Quote not found for this Client');
  if (quote.status !== 'ACCEPTED') throw new ForbiddenError('Quote has not been accepted');

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== clientId || payment.quoteId !== quoteId || payment.type !== 'CLIENT_RELEASE' || payment.status !== 'CONFIRMED') {
    throw new ForbiddenError('Payment is not a confirmed release payment for this Client');
  }

  const existing = await prisma.contactRelease.findFirst({ where: { quoteId } });
  if (existing) return existing;

  const release = await prisma.contactRelease.create({
    data: {
      tenderId: quote.tenderId,
      quoteId,
      clientId,
      retailerId: quote.retailerId,
      authorizingPaymentId: paymentId,
    },
  });

  await recordAuditEvent({
    actorId: clientId,
    action: 'CONTACT_RELEASED',
    targetType: 'Quote',
    targetId: quoteId,
    metadata: { tenderId: quote.tenderId, authorizingPaymentId: paymentId },
  });

  return release;
}

/** Returns the counterparty's contact details only if a release event authorises this requester. */
export async function getReleasedContact(userId: string, quoteId: string) {
  const release = await prisma.contactRelease.findFirst({ where: { quoteId } });
  if (!release || (release.clientId !== userId && release.retailerId !== userId)) {
    throw new ForbiddenError('Contact details have not been released to this user');
  }

  const counterpartyId = release.clientId === userId ? release.retailerId : release.clientId;
  const counterparty = await prisma.user.findUniqueOrThrow({
    where: { id: counterpartyId },
    select: { contactName: true, contactPhone: true, email: true },
  });

  return counterparty;
}
