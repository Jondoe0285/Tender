import { Resend } from 'resend';
import { tenderOpportunityTemplate, tenderUpdatedTemplate, type EmailTemplate } from '@/server/notifications/emailTemplates';

const PLACEHOLDER_SECRET_VALUES = new Set(['test', 'placeholder', 'changeme', 'example']);

let resendClient: Resend | null = null;

function hasUsableSecret(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && !PLACEHOLDER_SECRET_VALUES.has(trimmed.toLowerCase()));
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!hasUsableSecret(apiKey)) return null;
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

/** No fallback: an unroutable default would silently send from an invalid domain. */
function getFromAddress(): string | null {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return null;
  return PLACEHOLDER_SECRET_VALUES.has(from.toLowerCase()) ? null : from;
}

/** True once both the key and sender are configured for this environment. */
export function isEmailConfigured(): boolean {
  return Boolean(hasUsableSecret(process.env.RESEND_API_KEY) && getFromAddress());
}

export type TenderNotification = {
  id: string;
  reference: string;
  category: string;
  clientTradeTenderId: string;
  locationArea: string;
  closingDate: Date;
  requirementSummary: string;
};

export async function sendTransactionalEmail(to: string, template: EmailTemplate) {
  const resend = getResendClient();
  if (!resend) return { sent: false, reason: 'RESEND_API_KEY is not configured' } as const;

  const from = getFromAddress();
  if (!from) return { sent: false, reason: 'EMAIL_FROM is not configured' } as const;

  const result = await resend.emails.send({
    from,
    to,
    subject: template.subject,
    html: template.html,
  });

  if (result.error) return { sent: false, reason: result.error.message } as const;
  return { sent: true, id: result.data?.id ?? null } as const;
}

export type HealthReportEmail = { subject: string; html: string; text?: string };
export type HealthReportAttachment = { filename: string; content: string };

/**
 * Repository health reports reuse the single Resend client but have their own sender and
 * recipient so operational reporting never borrows the customer notification identity.
 */
export async function sendHealthReportEmail(template: HealthReportEmail, attachments: HealthReportAttachment[] = []) {
  const resend = getResendClient();
  if (!resend) return { sent: false, reason: 'RESEND_API_KEY is not configured' } as const;

  const from = process.env.HEALTH_REPORT_FROM;
  const to = process.env.HEALTH_REPORT_TO;
  if (!from) return { sent: false, reason: 'HEALTH_REPORT_FROM is not configured' } as const;
  if (!to) return { sent: false, reason: 'HEALTH_REPORT_TO is not configured' } as const;

  const result = await resend.emails.send({
    from,
    to: to.split(',').map((address) => address.trim()).filter(Boolean),
    subject: template.subject,
    html: template.html,
    ...(template.text ? { text: template.text } : {}),
    ...(attachments.length > 0 ? { attachments: attachments.map((attachment) => ({ filename: attachment.filename, content: attachment.content })) } : {}),
    tags: [{ name: 'category', value: 'repository-health-check' }],
  });

  if (result.error) return { sent: false, reason: result.error.message } as const;
  return { sent: true, id: result.data?.id ?? null } as const;
}

/** Sends only the approved pre-unlock summary; Client identity, precise site data and full specification stay private. */
export async function sendTenderOpportunityEmail(to: string, tender: TenderNotification) {
  return sendTransactionalEmail(to, tenderOpportunityTemplate(tender));
}

/** Sends a non-sensitive update notice without altering the Provider's existing access entitlement. */
export async function sendTenderUpdatedEmail(to: string, tender: Pick<TenderNotification, 'id' | 'reference' | 'category' | 'locationArea' | 'closingDate'>) {
  return sendTransactionalEmail(to, tenderUpdatedTemplate(tender));
}
