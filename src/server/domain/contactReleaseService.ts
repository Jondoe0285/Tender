import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError } from '@/server/auth/session';
import { getClientReleaseFeeGbp } from '@/server/domain/platformSettings';
import { contactReleaseTemplate, quoteAcceptedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { getPurchasedRetentionDeadline } from '@/server/domain/retentionService';

type AcceptOutcome = { status: 'PAYMENT_REQUIRED' | 'RELEASED_WITH_CREDIT'; paymentId: string; checkoutUrl: string | null; devMode: boolean; feeGbp: number; vatGbp: number; totalAmountGbp: number; creditsLeft?: number };

/** Accepting a quote enters a pending release-fee state — no contact data is exposed yet (SEC-035). */
export async function acceptQuote(clientId: string, quoteId: string): Promise<AcceptOutcome> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { tender: true, retailer: { select: { email: true } }, releasePayment: true } });
  if (!quote || quote.tender.clientId !== clientId) throw new ForbiddenError('Quote not found for this Client');
  if (quote.status === 'ACCEPTED' && quote.releasePayment) {
    return {
      status: 'PAYMENT_REQUIRED',
      paymentId: quote.releasePayment.id,
      checkoutUrl: quote.releasePayment.stripeCheckoutUrl,
      devMode: !quote.releasePayment.stripeCheckoutUrl,
      feeGbp: quote.releasePayment.amountGbp,
      vatGbp: quote.releasePayment.vatGbp,
      totalAmountGbp: quote.releasePayment.totalAmountGbp,
    };
  }
  if (quote.status !== 'SUBMITTED' && quote.status !== 'ACCEPTED') throw new ForbiddenError('Quote is not in a state that can be accepted');

  if (quote.status === 'SUBMITTED') {
    const retentionLockedUntil = getPurchasedRetentionDeadline();
    await prisma.$transaction([
      prisma.quote.update({ where: { id: quoteId }, data: { status: 'ACCEPTED', retentionLockedUntil } }),
      prisma.tenderAttachment.updateMany({ where: { tenderId: quote.tenderId }, data: { retentionLockedUntil } }),
    ]);
    await recordAuditEvent({
      actorId: clientId,
      action: 'QUOTE_ACCEPTED',
      targetType: 'Quote',
      targetId: quoteId,
      metadata: { tenderId: quote.tenderId },
    });
  }

  const releaseFeeGbp = await getClientReleaseFeeGbp(quote.priceGbp);
  const clientCompanyMembership = await prisma.clientCompanyMember.findUnique({
    where: { userId: clientId },
    select: { company: { select: { id: true, releaseCreditsLeft: true } } },
  });
  if ((clientCompanyMembership?.company.releaseCreditsLeft ?? 0) > 0) {
    const spent = await prisma.clientCompany.updateMany({
      where: { id: clientCompanyMembership?.company.id, releaseCreditsLeft: { gt: 0 } },
      data: { releaseCreditsLeft: { decrement: 1 } },
    });
    if (spent.count > 0) {
      const creditPayment = await prisma.payment.create({
        data: {
          type: 'CLIENT_RELEASE',
          amountGbp: 0,
          status: 'CONFIRMED',
          userId: clientId,
          quoteId,
          confirmedAt: new Date(),
        },
      });
      await recordAuditEvent({
        actorId: clientId,
        action: 'CLIENT_RELEASE_CREDIT_USED',
        targetType: 'Quote',
        targetId: quoteId,
        metadata: { tenderId: quote.tenderId, paymentId: creditPayment.id, waivedFeeGbp: releaseFeeGbp },
      });
      await finalizeContactRelease(clientId, quoteId, creditPayment.id);
      return { status: 'RELEASED_WITH_CREDIT', paymentId: creditPayment.id, checkoutUrl: null, devMode: false, feeGbp: 0, vatGbp: 0, totalAmountGbp: 0, creditsLeft: clientCompanyMembership!.company.releaseCreditsLeft - 1 };
    }
  }

  let payment: AcceptOutcome;
  try {
    payment = { status: 'PAYMENT_REQUIRED', ...(await createPayment({ type: 'CLIENT_RELEASE', amountGbp: releaseFeeGbp, userId: clientId, quoteId, quotePriceGbp: quote.priceGbp })), feeGbp: releaseFeeGbp };
  } catch (error) {
    // A concurrent accept already created the release payment (Payment.quoteId is unique) — return it instead of failing.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.payment.findUnique({ where: { quoteId } });
      if (concurrent) return { status: 'PAYMENT_REQUIRED', paymentId: concurrent.id, checkoutUrl: concurrent.stripeCheckoutUrl, devMode: !concurrent.stripeCheckoutUrl, feeGbp: concurrent.amountGbp, vatGbp: concurrent.vatGbp, totalAmountGbp: concurrent.totalAmountGbp };
    }
    throw error;
  }
  await sendTransactionalEmail(
    quote.retailer.email,
    quoteAcceptedTemplate({ quoteReference: quote.reference, tenderReference: quote.tender.reference, feeGbp: releaseFeeGbp, paymentPath: `/retailer/tenders/${quote.tenderId}` })
  ).catch(() => undefined);
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

  const existing = await prisma.contactRelease.findUnique({ where: { quoteId } });
  if (existing) return existing;

  let release;
  try {
    release = await prisma.contactRelease.create({
      data: {
        tenderId: quote.tenderId,
        quoteId,
        clientId,
        retailerId: quote.retailerId,
        authorizingPaymentId: paymentId,
      },
    });
  } catch (error) {
    // The quoteId unique constraint rejects a concurrent duplicate finalisation; return the row it created.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.contactRelease.findUnique({ where: { quoteId } });
      if (concurrent) return concurrent;
    }
    throw error;
  }

  await recordAuditEvent({
    actorId: clientId,
    action: 'CONTACT_RELEASED',
    targetType: 'Quote',
    targetId: quoteId,
    metadata: { tenderId: quote.tenderId, authorizingPaymentId: paymentId },
  });

  const parties = await prisma.user.findMany({
    where: { id: { in: [clientId, quote.retailerId] } },
    select: { id: true, email: true },
  });
  await Promise.allSettled(
    parties.map(async (party) => {
      const recipientRole = party.id === clientId ? 'CLIENT' : 'RETAILER';
      const result = await sendTransactionalEmail(
        party.email,
        contactReleaseTemplate({
          quoteReference: quote.reference,
          tenderReference: quote.tender.reference,
          recipientRole,
          workspacePath: recipientRole === 'CLIENT' ? `/client/tenders/${quote.tenderId}` : `/retailer/tenders/${quote.tenderId}`,
        })
      ).catch(() => ({ sent: false as const }));
      await recordAuditEvent({
        actorId: null,
        action: result.sent ? 'CONTACT_RELEASE_NOTIFICATION_SENT' : 'CONTACT_RELEASE_NOTIFICATION_FAILED',
        targetType: 'Quote',
        targetId: quoteId,
        metadata: { recipientRole },
      });
    })
  );

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
