import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { toErrorResponse } from '@/server/http/errors';
import { getSupportRecipientEmail } from '@/server/domain/platformSettings';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { contentReviewOutcomeTemplate } from '@/server/notifications/emailTemplates';

const reviewSchema = z.object({ note: z.string().trim().min(3).max(500), outcome: z.enum(['RELEASED_SAFE', 'HOLD_CONFIRMED']) });

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const admin = await requireFullSuperUser();
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A review note and outcome are required' }, { status: 400 });

    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id }, include: { actor: { select: { email: true, retailerProfile: { select: { userId: true } }, clientCompanyMembership: { select: { companyId: true } } } } } });
    if (!event) return NextResponse.json({ error: 'Moderation event not found' }, { status: 404 });
    if (event.reviewedAt) return NextResponse.json({ error: 'This moderation event has already been reviewed' }, { status: 409 });

    const compensation = parsed.data.outcome === 'RELEASED_SAFE' ? 5 : 0;
    const compensationType = event.actor.retailerProfile ? 'Provider tender-unlock credits' : 'Contractor accepted-quote release credits';
    const reviewed = await prisma.$transaction(async (transaction) => {
      if (parsed.data.outcome === 'RELEASED_SAFE') {
        if (event.actor.retailerProfile) {
          await transaction.retailerProfile.update({ where: { userId: event.actor.retailerProfile.userId }, data: { launchCreditsLeft: { increment: compensation } } });
        } else if (event.actor.clientCompanyMembership) {
          await transaction.clientCompany.update({ where: { id: event.actor.clientCompanyMembership.companyId }, data: { releaseCreditsLeft: { increment: compensation } } });
        } else {
          throw new Error('The reviewed account has no eligible compensation credit balance');
        }
      }
      const updated = await transaction.moderationEvent.update({
        where: { id: params.id },
        data: { reviewedAt: new Date(), reviewedById: admin.id, reviewNote: parsed.data.note, reviewOutcome: parsed.data.outcome, compensationAwardedAt: compensation > 0 ? new Date() : null, compensationCredits: compensation, compensationType: compensation > 0 ? compensationType : null },
      });
      await recordAuditEvent({ actorId: admin.id, action: parsed.data.outcome === 'RELEASED_SAFE' ? 'MODERATION_CONTENT_RELEASED_SAFE' : 'MODERATION_HOLD_CONFIRMED', targetType: 'ModerationEvent', targetId: updated.id, metadata: { decision: updated.decision, contentType: updated.contentType, subjectId: updated.actorId, compensationCredits: compensation, compensationType: compensation > 0 ? compensationType : null } }, transaction);
      return updated;
    });

    const contentLabel = event.contentType === 'TENDER_SUBMISSION' ? 'Tender' : event.contentType === 'QUOTE_SUBMISSION' ? 'Quote' : 'Comment';
    const accountPath = event.actor.retailerProfile ? '/retailer/profile' : '/client/profile';
    const replyTo = await getSupportRecipientEmail();
    await sendTransactionalEmail(event.actor.email, contentReviewOutcomeTemplate({ contentLabel, releasedSafe: parsed.data.outcome === 'RELEASED_SAFE', credits: compensation, creditType: compensationType, reviewNote: parsed.data.note, accountPath }), { ...(replyTo ? { replyTo } : {}) }).catch(() => undefined);

    return NextResponse.json({ status: 'reviewed', outcome: reviewed.reviewOutcome, compensationCredits: reviewed.compensationCredits });
  } catch (error) {
    return toErrorResponse(error);
  }
}
