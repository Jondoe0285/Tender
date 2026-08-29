import { Resend } from 'resend';
import { tenderOpportunityTemplate, type EmailTemplate } from '@/server/notifications/emailTemplates';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'Trade Tender <notifications@example.com>';
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

  const result = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: template.subject,
    html: template.html,
  });

  if (result.error) return { sent: false, reason: result.error.message } as const;
  return { sent: true, id: result.data?.id ?? null } as const;
}

/** Sends only the approved pre-unlock summary; Client identity, precise site data and full specification stay private. */
export async function sendTenderOpportunityEmail(to: string, tender: TenderNotification) {
  return sendTransactionalEmail(to, tenderOpportunityTemplate(tender));
}
