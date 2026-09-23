import { prisma } from '@/server/data/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createPayment } from '@/server/payments/paymentService';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { ForbiddenError, ValidationError } from '@/server/auth/session';
import { assertBuyerDuty, assertSecondApprover } from '@/server/domain/workspacePermissions';
import { getClientReleaseFeeGbp, getPlatformSetting } from '@/server/domain/platformSettings';
import { PERCENTAGE_RELEASE_SECOND_APPROVER_GBP } from '@/lib/launch-credits';
import { isQuoteExpired } from '@/server/domain/quoteService';
import { contactReleaseTemplate, quoteAcceptedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { getPurchasedRetentionDeadline } from '@/server/domain/retentionService';
import { consumePaymentWaiver } from '@/server/domain/paymentWaiverService';
import { syncVerificationExpiry } from '@/server/domain/verificationDocumentService';
import { userOwnsTender, retailerMatchedCategories } from '@/server/domain/tenderService';
import { issuedTenderSpecHash, STALE_QUOTE_REVISION_MESSAGE } from '@/lib/package-spec';
import { isValidPurchaseOrderNumber } from '@/lib/enterprise-controls';
import { assertReleaseSpendCap } from '@/server/domain/purchaseControl';
import { buyingTenderPath, supplyingTenderPath } from '@/lib/workspace-paths';
import { tenderUsesFixedServiceRelease } from '@/server/domain/platformSettings';

type AcceptOutcome = { status: 'PAYMENT_REQUIRED' | 'RELEASED_WITH_CREDIT'; paymentId: string; checkoutUrl: string | null; devMode: boolean; feeGbp: number; vatGbp: number; totalAmountGbp: number; creditsLeft?: number };

const authorisedReleaseWhere = {
  OR: [{ authorizingPaymentId: null }, { authorizingPayment: { status: 'CONFIRMED' as const } }],
};

function counterpartyContactSelect() {
  return { contactName: true, contactPhone: true, email: true } as const;
}

/** Accepting a quote enters a pending release-fee state — no contact data is exposed yet (SEC-035). */
export async function acceptQuote(clientId: string, quoteId: string, mobileReturnUrl?: string, declarationAccepted = false, secondApproverEmail?: string, purchaseOrderNumber?: string): Promise<AcceptOutcome> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { tender: { include: { packages: { select: { specHash: true } } } }, retailer: { select: { email: true } }, releasePayment: true, award: true } });
  if (!quote || !await userOwnsTender(clientId, quote.tenderId)) throw new ForbiddenError('Quote not found for this Client');
  await assertBuyerDuty(clientId, 'APPROVER');
  if (quote.status === 'SUBMITTED' || quote.status === 'ACCEPTED') {
    await syncVerificationExpiry(quote.retailerId);
    const retailerProfile = await prisma.retailerProfile.findUnique({ where: { userId: quote.retailerId }, select: { verificationStatus: true, independentReviewStatus: true } });
    const requiresDeclaration = retailerProfile?.verificationStatus === 'VERIFIED' || retailerProfile?.independentReviewStatus === 'APPROVED';
    if (requiresDeclaration && !quote.verificationDeclarationAcceptedAt && !declarationAccepted) {
      throw new ValidationError('You must accept the verification declaration before accepting a quote from a verified Provider');
    }
    if (declarationAccepted && !quote.verificationDeclarationAcceptedAt) {
      await prisma.quote.update({ where: { id: quote.id }, data: { verificationDeclarationAcceptedAt: new Date() } });
      await recordAuditEvent({ actorId: clientId, action: 'VERIFICATION_DECLARATION_ACCEPTED', targetType: 'Quote', targetId: quoteId, metadata: { tenderId: quote.tenderId, retailerId: quote.retailerId } });
    }
  }
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
  if (quote.status === 'SUBMITTED' && isQuoteExpired(quote.submittedAt, quote.validityDays)) {
    throw new ValidationError("This quote has exceeded the Provider's validity period and is no longer valid.");
  }

  const poNumber = purchaseOrderNumber?.trim() ?? quote.award?.purchaseOrderNumber ?? '';
  if (!quote.award?.purchaseOrderNumber && quote.status === 'SUBMITTED') {
    if (!isValidPurchaseOrderNumber(poNumber)) {
      throw new ValidationError('Enter a purchase order number (3-40 characters, letters, numbers, spaces, / or -).');
    }
  }

  const currentHash = issuedTenderSpecHash(quote.tender.packages.map((pkg) => pkg.specHash).filter(Boolean));
  if (quote.status === 'ACCEPTED' && !quote.award) {
    await prisma.award.upsert({
      where: { quoteId },
      create: {
        projectId: quote.tender.projectId,
        tenderId: quote.tenderId,
        quoteId,
        packageSpecHash: quote.packageSpecHash || currentHash,
        awardedById: clientId,
        purchaseOrderNumber: poNumber || 'LEGACY',
      },
      update: {},
    });
  }

  if (quote.status === 'SUBMITTED') {
    if (currentHash && quote.packageSpecHash && quote.packageSpecHash !== currentHash) {
      throw new ValidationError(STALE_QUOTE_REVISION_MESSAGE);
    }
    const retentionLockedUntil = getPurchasedRetentionDeadline();
    await prisma.$transaction([
      prisma.quote.update({ where: { id: quoteId }, data: { status: 'ACCEPTED', retentionLockedUntil } }),
      prisma.tenderAttachment.updateMany({ where: { tenderId: quote.tenderId }, data: { retentionLockedUntil } }),
      prisma.award.upsert({
        where: { quoteId },
        create: {
          projectId: quote.tender.projectId,
          tenderId: quote.tenderId,
          quoteId,
          packageSpecHash: quote.packageSpecHash || currentHash,
          awardedById: clientId,
          purchaseOrderNumber: poNumber,
        },
        update: { awardedById: clientId, purchaseOrderNumber: poNumber },
      }),
    ]);
    await recordAuditEvent({
      actorId: clientId,
      action: 'QUOTE_ACCEPTED',
      targetType: 'Quote',
      targetId: quoteId,
      metadata: { tenderId: quote.tenderId, projectId: quote.tender.projectId, specHash: quote.packageSpecHash || currentHash },
    });
    await recordAuditEvent({
      actorId: clientId,
      action: 'AWARD_RECORDED',
      targetType: 'Tender',
      targetId: quote.tenderId,
      metadata: { quoteId, projectId: quote.tender.projectId },
    });
  }

  const releaseFeeGbp = await getClientReleaseFeeGbp(quote.priceGbp);
  const releaseFeeMode = await getPlatformSetting('CLIENT_RELEASE_FEE_MODE');
  if (releaseFeeMode === 'PERCENTAGE' && releaseFeeGbp >= PERCENTAGE_RELEASE_SECOND_APPROVER_GBP) {
    const secondApproverId = await assertSecondApprover(clientId, secondApproverEmail);
    await recordAuditEvent({
      actorId: clientId,
      action: 'QUOTE_SECOND_APPROVER_CONFIRMED',
      targetType: 'Quote',
      targetId: quoteId,
      metadata: { tenderId: quote.tenderId, secondApproverId, feeGbp: releaseFeeGbp },
    });
  }
  const waiverUse = await consumePaymentWaiver({ userId: clientId, feeType: 'CLIENT_RELEASE', quoteId });
  if (waiverUse) {
    await finalizeContactRelease(clientId, quoteId, waiverUse.payment.id);
    return { status: 'RELEASED_WITH_CREDIT', paymentId: waiverUse.payment.id, checkoutUrl: null, devMode: false, feeGbp: 0, vatGbp: 0, totalAmountGbp: 0 };
  }

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

  if (releaseFeeGbp > 0) {
    await assertReleaseSpendCap(clientId, releaseFeeGbp);
  }

  let payment: AcceptOutcome;
  try {
    payment = { status: 'PAYMENT_REQUIRED', ...(await createPayment({ type: 'CLIENT_RELEASE', userId: clientId, quoteId, quotePriceGbp: quote.priceGbp, mobileReturnUrl })), feeGbp: releaseFeeGbp };
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
    quoteAcceptedTemplate({ quoteReference: quote.reference, tenderReference: quote.tender.reference, feeGbp: releaseFeeGbp, paymentPath: supplyingTenderPath(quote.tenderId) })
  ).catch(() => undefined);
  return payment;
}

/** Releases contact details to both parties only once the release fee payment is CONFIRMED (SEC-035/037). */
export async function finalizeContactRelease(clientId: string, quoteId: string, paymentId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { tender: true } });
  if (!quote || quote.tender.clientId !== clientId) throw new ForbiddenError('Quote not found for this Client');
  if (quote.status !== 'ACCEPTED') throw new ForbiddenError('Quote has not been accepted');
  await syncVerificationExpiry(quote.retailerId);
  const retailerProfile = await prisma.retailerProfile.findUnique({ where: { userId: quote.retailerId }, select: { verificationStatus: true, independentReviewStatus: true } });
  if ((retailerProfile?.verificationStatus === 'VERIFIED' || retailerProfile?.independentReviewStatus === 'APPROVED') && !quote.verificationDeclarationAcceptedAt) {
    throw new ValidationError('The verification declaration must be accepted before contact details can be released');
  }

  let release;
  try {
    const releasedAt = new Date();
    const correlationId = randomUUID();
    release = await prisma.$transaction(async (transaction) => {
      // Check payment state in the same serializable transaction that creates the release so a
      // concurrent refund/dispute cannot leave a release authorised by stale payment state.
      const payment = await transaction.payment.findFirst({
        where: { id: paymentId, userId: clientId, quoteId, type: 'CLIENT_RELEASE', status: 'CONFIRMED' },
        select: { id: true },
      });
      if (!payment) throw new ForbiddenError('Payment is not a confirmed release payment for this Client');

      const existing = await transaction.contactRelease.findFirst({
        where: { OR: [{ quoteId }, { tenderId: quote.tenderId, retailerId: quote.retailerId }] },
      });
      if (existing) {
        if (!existing.quoteId) {
          return transaction.contactRelease.update({ where: { id: existing.id }, data: { quoteId } });
        }
        return existing;
      }

      const createdRelease = await transaction.contactRelease.create({
        data: {
          tenderId: quote.tenderId,
          quoteId,
          clientId,
          retailerId: quote.retailerId,
          releasedAt,
          authorizingPaymentId: paymentId,
        },
      });
      await transaction.contactReleaseAuditEvent.create({
        data: {
          contactReleaseId: createdRelease.id,
          actorId: clientId,
          tenderId: quote.tenderId,
          quoteId,
          clientId,
          retailerId: quote.retailerId,
          releasedDataCategory: 'CONTACT_DETAILS',
          releasedAt,
          authorizingPaymentId: paymentId,
          correlationId,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: clientId,
          action: 'CONTACT_RELEASED',
          targetType: 'Quote',
          targetId: quoteId,
          metadata: JSON.stringify({
            tenderId: quote.tenderId,
            clientId,
            retailerId: quote.retailerId,
            releasedDataCategory: 'CONTACT_DETAILS',
            releasedAt: releasedAt.toISOString(),
            authorizingPaymentId: paymentId,
            correlationId,
          }),
        },
      });
      return createdRelease;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    // Unique constraints reject a concurrent duplicate finalisation; return the row it created.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.contactRelease.findFirst({
        where: { OR: [{ quoteId }, { tenderId: quote.tenderId, retailerId: quote.retailerId }] },
      });
      if (concurrent) return concurrent;
    }
    throw error;
  }

  const parties = await prisma.user.findMany({
    where: { id: { in: [clientId, quote.retailerId] } },
    select: { id: true, email: true },
  });
  await Promise.allSettled(
    parties.map(async (party) => {
      const recipientRole = party.id === clientId ? 'CONTRACTOR' : 'PROVIDER';
      const result = await sendTransactionalEmail(
        party.email,
        contactReleaseTemplate({
          quoteReference: quote.reference,
          tenderReference: quote.tender.reference,
          recipientRole,
          workspacePath: recipientRole === 'CONTRACTOR' ? buyingTenderPath(quote.tenderId) : supplyingTenderPath(quote.tenderId),
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
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { tenderId: true, retailerId: true, tender: { select: { clientId: true } } },
  });
  const release = await prisma.contactRelease.findFirst({
    where: {
      AND: [
        authorisedReleaseWhere,
        quote
          ? { OR: [{ quoteId }, { tenderId: quote.tenderId, retailerId: quote.retailerId }] }
          : { quoteId },
      ],
    },
  });
  if (!release || (release.clientId !== userId && release.retailerId !== userId)) {
    throw new ForbiddenError('Contact details have not been released to this user');
  }

  const counterpartyId = release.clientId === userId ? release.retailerId : release.clientId;
  return prisma.user.findUniqueOrThrow({
    where: { id: counterpartyId },
    select: counterpartyContactSelect(),
  });
}

export type ReleasedContact = { contactName: string; contactPhone: string | null; email: string };

/** After a contractor or professional pays the fixed unlock fee, both parties get contact details for a site visit and quote. */
export async function releaseSiteVisitContact(retailerId: string, tenderId: string, authorizingPaymentId: string | null) {
  const categories = await retailerMatchedCategories(retailerId, tenderId);
  if (!tenderUsesFixedServiceRelease(categories)) return null;

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, reference: true, clientId: true },
  });
  if (!tender) throw new ForbiddenError('Tender not found');

  if (authorizingPaymentId) {
    const payment = await prisma.payment.findFirst({
      where: { id: authorizingPaymentId, userId: retailerId, tenderId, type: 'RETAILER_UNLOCK', status: 'CONFIRMED' },
      select: { id: true },
    });
    if (!payment) throw new ForbiddenError('Payment is not a confirmed unlock payment for this Provider');
  }

  const existing = await prisma.contactRelease.findFirst({
    where: { tenderId, retailerId },
  });
  if (existing) return existing;

  let release;
  try {
    const releasedAt = new Date();
    const correlationId = randomUUID();
    release = await prisma.$transaction(async (transaction) => {
      if (authorizingPaymentId) {
        const payment = await transaction.payment.findFirst({
          where: { id: authorizingPaymentId, userId: retailerId, tenderId, type: 'RETAILER_UNLOCK', status: 'CONFIRMED' },
          select: { id: true },
        });
        if (!payment) throw new ForbiddenError('Payment is not a confirmed unlock payment for this Provider');
      }
      const duplicate = await transaction.contactRelease.findFirst({
        where: { tenderId, retailerId },
      });
      if (duplicate) return duplicate;
      const createdRelease = await transaction.contactRelease.create({
        data: {
          tenderId,
          clientId: tender.clientId,
          retailerId,
          releasedAt,
          authorizingPaymentId,
        },
      });
      await transaction.contactReleaseAuditEvent.create({
        data: {
          contactReleaseId: createdRelease.id,
          actorId: retailerId,
          tenderId,
          clientId: tender.clientId,
          retailerId,
          releasedDataCategory: 'CONTACT_DETAILS',
          releasedAt,
          authorizingPaymentId,
          correlationId,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: retailerId,
          action: 'CONTACT_RELEASED',
          targetType: 'Tender',
          targetId: tenderId,
          metadata: JSON.stringify({
            tenderId,
            clientId: tender.clientId,
            retailerId,
            releasedDataCategory: 'CONTACT_DETAILS',
            releasedAt: releasedAt.toISOString(),
            authorizingPaymentId,
            correlationId,
            reason: 'SITE_VISIT_UNLOCK',
          }),
        },
      });
      return createdRelease;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.contactRelease.findFirst({ where: { tenderId, retailerId } });
      if (concurrent) return concurrent;
    }
    throw error;
  }

  const parties = await prisma.user.findMany({
    where: { id: { in: [tender.clientId, retailerId] } },
    select: { id: true, email: true },
  });
  await Promise.allSettled(
    parties.map(async (party) => {
      const recipientRole = party.id === tender.clientId ? 'CONTRACTOR' : 'PROVIDER';
      const result = await sendTransactionalEmail(
        party.email,
        contactReleaseTemplate({
          tenderReference: tender.reference,
          recipientRole,
          workspacePath: recipientRole === 'CONTRACTOR' ? buyingTenderPath(tenderId) : supplyingTenderPath(tenderId),
          reason: 'SITE_VISIT',
        })
      ).catch(() => ({ sent: false as const }));
      await recordAuditEvent({
        actorId: null,
        action: result.sent ? 'CONTACT_RELEASE_NOTIFICATION_SENT' : 'CONTACT_RELEASE_NOTIFICATION_FAILED',
        targetType: 'Tender',
        targetId: tenderId,
        metadata: { recipientRole, reason: 'SITE_VISIT_UNLOCK' },
      });
    })
  );

  return release;
}

export async function getReleasedBuyerContact(retailerId: string, tenderId: string): Promise<ReleasedContact | null> {
  const release = await prisma.contactRelease.findFirst({
    where: { tenderId, retailerId, ...authorisedReleaseWhere },
  });
  if (!release) return null;
  return prisma.user.findUniqueOrThrow({
    where: { id: release.clientId },
    select: counterpartyContactSelect(),
  });
}

export async function listReleasedProviderContacts(viewerId: string, tenderId: string): Promise<Array<{ id: string; contact: ReleasedContact }>> {
  if (!await userOwnsTender(viewerId, tenderId)) return [];
  const releases = await prisma.contactRelease.findMany({
    where: { tenderId, ...authorisedReleaseWhere },
    select: { id: true, retailerId: true },
  });
  if (releases.length === 0) return [];
  const providers = await prisma.user.findMany({
    where: { id: { in: releases.map((release) => release.retailerId) } },
    select: { id: true, ...counterpartyContactSelect() },
  });
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  return releases.flatMap((release) => {
    const provider = byId.get(release.retailerId);
    if (!provider) return [];
    return [{ id: release.id, contact: { contactName: provider.contactName, contactPhone: provider.contactPhone, email: provider.email } }];
  });
}
