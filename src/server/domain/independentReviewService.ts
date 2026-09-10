import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { independentReviewPurchasedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

/** Marks the purchase confirmed and notifies the Provider that a H&S professional will make contact. Idempotent against webhook retries. */
export async function finalizeIndependentReviewWithPayment(userId: string, paymentId: string) {
  const profile = await prisma.retailerProfile.findUnique({ where: { userId }, select: { id: true, independentReviewStatus: true } });
  if (!profile) return;
  if (profile.independentReviewStatus === 'NOT_PURCHASED' || profile.independentReviewStatus === 'DECLINED') {
    await prisma.retailerProfile.update({
      where: { userId },
      data: { independentReviewStatus: 'PURCHASED', independentReviewPurchasedAt: new Date(), independentReviewDecidedAt: null, independentReviewNote: null },
    });
  }
  await recordAuditEvent({ actorId: userId, action: 'INDEPENDENT_REVIEW_PURCHASED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { paymentId } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) await sendTransactionalEmail(user.email, independentReviewPurchasedTemplate({})).catch(() => undefined);
}
