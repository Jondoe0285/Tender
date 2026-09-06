import type { SupportRequestStatus, SupportRequestType } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { getSupportRecipientEmail } from '@/server/domain/platformSettings';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { supportRequestNotificationTemplate } from '@/server/notifications/emailTemplates';

export async function createSupportRequest(requesterId: string, input: { type: SupportRequestType; title: string; description: string }) {
  const supportRequest = await prisma.$transaction(async (transaction) => {
    const request = await transaction.supportRequest.create({ data: { requesterId, ...input } });
    await recordAuditEvent({ actorId: requesterId, action: 'SUPPORT_REQUEST_SUBMITTED', targetType: 'SupportRequest', targetId: request.id, metadata: { type: request.type } }, transaction);
    return request;
  });

  const recipient = await getSupportRecipientEmail();
  let deliveryStatus: 'SENT' | 'FAILED' | 'SKIPPED' = 'SKIPPED';
  let messageId: string | null = null;
  if (recipient) {
    try {
      const result = await sendTransactionalEmail(recipient, supportRequestNotificationTemplate({ type: supportRequest.type, submittedAt: supportRequest.createdAt }));
      deliveryStatus = result.sent ? 'SENT' : 'FAILED';
      messageId = result.sent ? result.id : null;
    } catch {
      deliveryStatus = 'FAILED';
    }
  }
  await recordAuditEvent({ actorId: requesterId, action: `SUPPORT_REQUEST_NOTIFICATION_${deliveryStatus}`, targetType: 'SupportRequest', targetId: supportRequest.id, metadata: { type: supportRequest.type, ...(messageId ? { messageId } : {}) } });
  return supportRequest;
}

export function listSupportRequestsForRequester(requesterId: string) {
  return prisma.supportRequest.findMany({ where: { requesterId }, orderBy: { createdAt: 'desc' } });
}

export function listSupportRequestsForSuperUser() {
  return prisma.supportRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 250, include: { requester: { select: { contactName: true, email: true, role: true } }, reviewer: { select: { contactName: true } } } });
}

export async function reviewSupportRequest(reviewer: { id: string; isOwner: boolean }, requestId: string, action: 'triage' | 'approve' | 'reject' | 'resolve', note: string) {
  const request = await prisma.supportRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ForbiddenError('Support request not found');
  if ((action === 'approve' || action === 'reject') && (request.type !== 'CHANGE' || !reviewer.isOwner)) throw new ForbiddenError('Only an Owner can approve or reject a change request');
  if (action === 'resolve' && request.status === 'APPROVED') throw new ForbiddenError('Approved change requests require an implementation record');

  const status: SupportRequestStatus = action === 'triage' ? 'TRIAGED' : action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'RESOLVED';
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.supportRequest.update({ where: { id: requestId }, data: { status, reviewerId: reviewer.id, reviewNote: note, reviewedAt: new Date() } });
    await recordAuditEvent({ actorId: reviewer.id, action: `SUPPORT_REQUEST_${status}`, targetType: 'SupportRequest', targetId: requestId, metadata: { type: request.type } }, transaction);
    return updated;
  });
}