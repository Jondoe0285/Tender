#!/usr/bin/env -S npx tsx
import type { EmailTemplate } from '@/server/notifications/emailTemplates';
import {
  accountCreatedByAdminTemplate,
  accountUpdateTemplate,
  configurationTestTemplate,
  contactReleaseTemplate,
  emailVerificationTemplate,
  failedPaymentTemplate,
  newRegistrationTemplate,
  passwordResetTemplate,
  paymentConfirmationTemplate,
  quoteAcceptedTemplate,
  quoteReceivedTemplate,
  quoteReminderTemplate,
  retailerInvitationTemplate,
  tenderOpportunityTemplate,
} from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

const recipient = process.argv[2]?.trim().toLowerCase();
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error('Usage: tsx --env-file=.env scripts/send-email-template-previews.ts <recipient-email>');
  process.exit(1);
}

const previewLink = 'https://preview.trade-tender.example/test-link';
const previewDate = new Date('2026-08-31T09:00:00.000Z');
const tenderReference = 'TND-TEST-000001';
const quoteReference = `${tenderReference}-Q01`;

const templates: Array<[string, EmailTemplate]> = [
  ['retailer invitation', retailerInvitationTemplate({ companyName: 'Preview Builders Ltd', inviteLink: previewLink })],
  ['tender opportunity', tenderOpportunityTemplate({ id: 'preview-tender', reference: tenderReference, category: 'Construction materials', clientTradeTenderId: 'CLI-TEST-000001', locationArea: 'Leeds', closingDate: previewDate, requirementSummary: 'Synthetic delivery preview only.' })],
  ['quote received', quoteReceivedTemplate({ tenderReference, quoteReference, category: 'Construction materials', priceGbp: 1250, leadTimeDays: 5, reviewPath: '/client/tenders/preview-tender' })],
  ['quote reminder', quoteReminderTemplate({ tenderReference, quoteReference, deadline: previewDate, reviewPath: '/retailer/tenders/preview-tender' })],
  ['payment confirmation', paymentConfirmationTemplate({ paymentType: 'Retailer tender unlock', amountGbp: 10, vatGbp: 2, totalAmountGbp: 12, reference: tenderReference, accountPath: '/retailer/payments' })],
  ['quote accepted', quoteAcceptedTemplate({ tenderReference, quoteReference, feeGbp: 10, paymentPath: '/client/quotes/preview-quote' })],
  ['contact release', contactReleaseTemplate({ tenderReference, quoteReference, recipientRole: 'CLIENT', workspacePath: '/client/quotes/preview-quote' })],
  ['account update', accountUpdateTemplate({ title: 'Preview account update', summary: 'This is a synthetic email template preview.', accountPath: '/client/profile' })],
  ['new registration', newRegistrationTemplate({ role: 'CLIENT', email: 'preview@example.test', contactName: 'Preview User', companyName: 'Preview Construction Ltd' })],
  ['email verification', emailVerificationTemplate({ verificationLink: previewLink })],
  ['configuration test', configurationTestTemplate({ environment: 'email-template-preview', sentAt: previewDate })],
  ['admin-created account', accountCreatedByAdminTemplate({ role: 'RETAILER', contactName: 'Preview User', companyName: 'Preview Builders Ltd', resetLink: previewLink, expiresIn: '24 hours' })],
  ['password reset', passwordResetTemplate({ resetLink: previewLink, expiresIn: '24 hours' })],
  ['failed payment', failedPaymentTemplate({ paymentType: 'Client Accepted Quote Release Fee', amountGbp: 10, vatGbp: 2, totalAmountGbp: 12, reference: quoteReference, retryPath: '/payment/preview' })],
];

async function sendPreviews() {
  const deliveries: string[] = [];
  for (const [name, template] of templates) {
    const result = await sendTransactionalEmail(recipient, template);
    if (!result.sent) throw new Error(`${name}: ${result.reason}`);
    const delivery = `${name}: ${result.id ?? 'accepted'}`;
    deliveries.push(delivery);
    console.log(delivery);
  }
  console.log(`Delivered ${deliveries.length} email template previews to ${recipient}.`);
}

void sendPreviews().catch((error: unknown) => {
  console.error(`EMAIL TEMPLATE PREVIEW DELIVERY FAILED: ${error instanceof Error ? error.message : 'Unknown Resend error'}`);
  process.exit(1);
});