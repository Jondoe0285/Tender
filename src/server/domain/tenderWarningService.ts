import { prisma } from '@/server/data/prisma';
import { ForbiddenError, ValidationError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { getComplianceOverview } from '@/server/domain/complianceMonitoringService';
import { getSupportRecipientEmail } from '@/server/domain/platformSettings';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { accountUpdateTemplate, tenderWarningEscalationTemplate } from '@/server/notifications/emailTemplates';
import type { IssueTenderWarningInput } from '@/lib/schemas/tenderWarning';

const HIGH_RISK_TENDER = (flag: { severity: string; targetType: string; targetId: string }, tenderId: string) =>
  flag.severity === 'HIGH' && flag.targetType === 'Tender' && flag.targetId === tenderId;

export async function issueTenderWarning(issuerId: string, tenderId: string, input: IssueTenderWarningInput) {
  const highRisk = (await getComplianceOverview()).flags.some((flag) => HIGH_RISK_TENDER(flag, tenderId));
  if (!highRisk) throw new ForbiddenError('Tender is not eligible for a warning');

  const tender = await prisma.tender.findUnique({ where: { id: tenderId }, select: { id: true, clientId: true, reference: true, client: { select: { email: true } } } });
  if (!tender) throw new ValidationError('Tender not found');

  const warning = await prisma.$transaction(async (transaction) => {
    const created = await transaction.tenderWarning.create({ data: { tenderId: tender.id, recipientId: tender.clientId, issuedById: issuerId, reason: input.reason, note: input.note } });
    await recordAuditEvent({ actorId: issuerId, action: 'TENDER_WARNING_ISSUED', targetType: 'TenderWarning', targetId: created.id, metadata: { tenderId: tender.id, recipientId: tender.clientId, reason: input.reason } }, transaction);
    return created;
  });

  const recipientResult = await sendTransactionalEmail(tender.client.email, accountUpdateTemplate({ title: 'Tender warning issued', summary: 'A Trade Tender warning relating to one of your tenders is available in your authenticated profile.', accountPath: '/client/profile' })).catch(() => ({ sent: false as const, reason: 'Email delivery failed' }));
  await recordAuditEvent({ actorId: issuerId, action: recipientResult.sent ? 'TENDER_WARNING_RECIPIENT_NOTIFICATION_SENT' : 'TENDER_WARNING_RECIPIENT_NOTIFICATION_FAILED', targetType: 'TenderWarning', targetId: warning.id, metadata: { tenderId: tender.id } });

  const activeWarningCount = await prisma.tenderWarning.count({ where: { recipientId: tender.clientId, active: true } });
  if (activeWarningCount !== 3) return warning;

  const [owners, supportRecipient] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SUPER_USER', isOwner: true, suspended: false }, select: { id: true, email: true } }),
    getSupportRecipientEmail(),
  ]);
  const ownerEmails = new Set(owners.map((owner) => owner.email.toLowerCase()));
  const recipients = [
    ...owners.map((owner) => ({ email: owner.email, recipientId: owner.id, kind: 'OWNER' })),
    ...(supportRecipient && !ownerEmails.has(supportRecipient.toLowerCase()) ? [{ email: supportRecipient, recipientId: null, kind: 'SUPPORT_RECIPIENT' }] : []),
  ];
  await Promise.all(recipients.map(async (recipient) => {
    const result = await sendTransactionalEmail(recipient.email, tenderWarningEscalationTemplate({ activeWarningCount, reviewPath: `/super-user/users/${encodeURIComponent(tender.clientId)}` })).catch(() => ({ sent: false as const, reason: 'Email delivery failed' }));
    await recordAuditEvent({ actorId: issuerId, action: result.sent ? 'TENDER_WARNING_ESCALATION_NOTIFICATION_SENT' : 'TENDER_WARNING_ESCALATION_NOTIFICATION_FAILED', targetType: 'TenderWarning', targetId: warning.id, metadata: { tenderId: tender.id, activeWarningCount, recipientKind: recipient.kind, ...(recipient.recipientId ? { recipientId: recipient.recipientId } : {}) } });
  }));
  return warning;
}