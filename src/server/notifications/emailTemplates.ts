import { appUrl as resolveAppUrl } from '@/server/config/appUrl';
import { supplyingTenderPath } from '@/lib/workspace-paths';

const NAVY = '#0D1B2A';
const TRADE_BLUE = '#1D6FB8';
const STEEL_BLUE = '#2F5D7C';
const CONCRETE_GREY = '#6B7280';
const LIGHT_GREY = '#F2F4F7';
const SAFETY_AMBER = '#F28C28';
const WHITE = '#FFFFFF';

export type EmailTemplate = { subject: string; html: string };

type EmailLayoutInput = {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  action?: { label: string; href: string };
};

function layout({ eyebrow, title, intro, body, action }: EmailLayoutInput): string {
  const actionMarkup = action
    ? `<p style="margin:28px 0 8px"><a href="${escapeAttribute(action.href)}" style="display:inline-block;background:${TRADE_BLUE};color:${WHITE};padding:13px 20px;text-decoration:none;font-family:'Source Sans 3',Arial,sans-serif;font-weight:600;font-size:14px">${escapeHtml(action.label)}</a></p>`
    : '';
  const logoSrc = escapeAttribute(appUrl('/images/brand/Trade_Tender_Candidate_Horizontal_Logo.png'));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;background:${LIGHT_GREY};font-family:'Source Sans 3',Arial,sans-serif;color:${NAVY}"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:${WHITE};border-top:4px solid ${TRADE_BLUE};box-shadow:0 1px 3px rgba(13,27,42,.08)"><div style="padding:24px 28px 16px;border-bottom:1px solid ${LIGHT_GREY}"><img src="${logoSrc}" alt="Trade Tender" width="196" height="81" style="display:block;width:196px;height:auto;border:0"><p style="margin:12px 0 0;font-family:'Source Sans 3',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${STEEL_BLUE}">Structured tenders for UK construction supply</p></div><div style="padding:28px"><p style="margin:0 0 10px;font-family:'Source Sans 3',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${CONCRETE_GREY}">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 16px;font-family:'Source Sans 3',Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:${NAVY}">${escapeHtml(title)}</h1><p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY}">${escapeHtml(intro)}</p>${body}${actionMarkup}</div></div><p style="margin:20px 8px 0;font-size:12px;line-height:1.5;color:${CONCRETE_GREY}">Structured tenders for UK construction supply. Trade Tender is a connection and tender-management platform. It is not the supplier, contractor, broker, guarantor, or responsible party for the final Contractor-Provider transaction.</p><p style="margin:10px 8px 0;font-size:11px;line-height:1.5;color:${CONCRETE_GREY}">This is an operational message from Trade Tender. Please do not reply with confidential project, payment, or contact information.</p></div></body></html>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table style="border-collapse:collapse;width:100%;margin:24px 0">${rows.map(([label, value]) => `<tr><td style="padding:9px 12px 9px 0;color:${CONCRETE_GREY};vertical-align:top;width:38%;font-size:14px">${escapeHtml(label)}</td><td style="padding:9px 0;font-weight:600;vertical-align:top;color:${NAVY};font-size:14px">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
}

function note(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${NAVY}">${text}</p>`;
}

export function appUrl(path: string): string {
  return resolveAppUrl(path);
}

export function retailerInvitationTemplate(input: { companyName: string; inviteLink: string }): EmailTemplate {
  return {
    subject: 'Your Trade Tender provider account invitation',
    html: layout({
      eyebrow: 'Provider account',
      title: 'You are invited to join Trade Tender',
      intro: 'Please complete your Provider setup so we can match your business to clearly specified construction demand.',
      body: detailRows([
        ['Business', input.companyName],
        ['What you will see', 'Matched tender summaries and quote opportunities in your registered services'],
        ['Next step', 'Create your password and confirm your company profile'],
      ]) + note('Thank you. Until you unlock a tender, Contractor identity, precise site details, and full specifications remain restricted.'),
      action: { label: 'Complete provider setup', href: input.inviteLink },
    }),
  };
}

export function tenderOpportunityTemplate(input: { id: string; reference: string; category: string; locationArea: string; closingDate: Date; requirementSummary: string }): EmailTemplate {
  return {
    subject: `New matched tender: ${input.reference}`,
    html: layout({
      eyebrow: 'New opportunity',
      title: 'A tender matches your registered services',
      intro: 'Please review this summary and decide whether to unlock the full specification before the quote deadline.',
      body: detailRows([
        ['Tender', input.reference],
        ['Category', input.category],
        ['Location area', input.locationArea],
        ['Requirement', input.requirementSummary],
        ['Quote deadline', input.closingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
      ]) + note('Contractor identity, precise site information, full specification, attachments, and direct communication details remain restricted until the required unlock stage.'),
      action: { label: 'Review opportunity', href: appUrl(supplyingTenderPath(encodeURIComponent(input.id))) },
    }),
  };
}

export function tenderUpdatedTemplate(input: { id: string; reference: string; category: string; locationArea: string; closingDate: Date }): EmailTemplate {
  return {
    subject: `Tender updated: ${input.reference}`,
    html: layout({
      eyebrow: 'Tender update',
      title: 'Please review the updated tender details',
      intro: 'The Contractor has changed this tender. Check the current specification, schedule, and quote deadline before you submit or revise a quote.',
      body: detailRows([
        ['Tender', input.reference],
        ['Category', input.category],
        ['Location area', input.locationArea],
        ['Quote deadline', input.closingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
      ]) + note('Your existing tender access remains available. Contractor identity and direct contact details remain restricted until the required release condition is met.'),
      action: { label: 'Review tender', href: appUrl(supplyingTenderPath(encodeURIComponent(input.id))) },
    }),
  };
}

/** Keeps risk details inside the authenticated platform review rather than email. */
export function tenderFlaggedForReviewTemplate(input: { reference: string }): EmailTemplate {
  return {
    subject: `Tender flagged for review: ${input.reference}`,
    html: layout({
      eyebrow: 'Tender review',
      title: 'Your tender is paused for a Trade Tender review',
      intro: `Tender ${input.reference} requires a Trade Tender review before further action may be taken.`,
      body: note('Thank you for your patience. No action is required from you at this time. We will contact you through your account if we need further information.'),
      action: { label: 'View your tender', href: appUrl('/user/tenders') },
    }),
  };
}

/** Deliberately excludes user, tender, and warning details from an Owner escalation email. */
export function tenderWarningEscalationTemplate(input: { activeWarningCount: number; reviewPath: string }): EmailTemplate {
  return {
    subject: 'Trade Tender warning threshold reached',
    html: layout({
      eyebrow: 'Account review',
      title: 'A warning threshold needs Owner review',
      intro: `Please review an account that now has ${input.activeWarningCount} active tender warnings.`,
      body: note('Open the authenticated Owner workspace for the protected warning and account information. Account suspension requires a separate Owner decision and has not been applied automatically.'),
      action: { label: 'Review warned account', href: appUrl(input.reviewPath) },
    }),
  };
}

export function quoteReceivedTemplate(input: { tenderReference: string; quoteReference: string; category: string; priceGbp: number; leadTimeDays: number; reviewPath: string }): EmailTemplate {
  return {
    subject: `Quote received for ${input.tenderReference}`,
    html: layout({
      eyebrow: 'Quote received',
      title: 'A formal quote is ready to compare',
      intro: 'A Provider has submitted a quote against your tender. Please review the price, lead time, and specification in your Contractor workspace.',
      body: detailRows([
        ['Tender', input.tenderReference],
        ['Quote', input.quoteReference],
        ['Category', input.category],
        ['Quoted price', `£${input.priceGbp} excl. VAT`],
        ['Lead time', `${input.leadTimeDays} days`],
      ]) + note('Provider contact details remain private until you accept a quote and the Accepted Quote Release Fee is confirmed.'),
      action: { label: 'Compare quote', href: appUrl(input.reviewPath) },
    }),
  };
}

export function quoteReminderTemplate(input: { quoteReference: string; tenderReference: string; deadline: Date; reviewPath: string }): EmailTemplate {
  return {
    subject: `Action required: quote deadline for ${input.tenderReference}`,
    html: layout({
      eyebrow: 'Action required',
      title: 'A quote deadline is approaching',
      intro: 'Please review the tender and submit or update your formal quote before the deadline.',
      body: detailRows([
        ['Tender', input.tenderReference],
        ['Quote reference', input.quoteReference],
        ['Deadline', input.deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
        ['Next step', 'Open the tender, check the specification, and submit your quote'],
      ]),
      action: { label: 'Open tender', href: appUrl(input.reviewPath) },
    }),
  };
}

export function paymentConfirmationTemplate(input: { paymentType: string; amountGbp: number; vatGbp: number; totalAmountGbp: number; reference: string; accountPath: string }): EmailTemplate {
  return {
    subject: `Payment confirmed: ${input.reference}`,
    html: layout({
      eyebrow: 'Payment complete',
      title: 'Thank you. Your payment is confirmed',
      intro: 'This Trade Tender payment has been confirmed. Access updates only after this trusted confirmation.',
      body: detailRows([
        ['Reference', input.reference],
        ['Payment type', input.paymentType],
        ['Fee', `£${input.amountGbp} excl. VAT`],
        ['VAT', `£${input.vatGbp}`],
        ['Total paid', `£${input.totalAmountGbp} incl. VAT`],
        ['Status', 'Confirmed'],
      ]) + note('Please keep this message for your records. If the expected access is not visible yet, refresh your workspace after a short interval.'),
      action: { label: 'View account activity', href: appUrl(input.accountPath) },
    }),
  };
}

export function quoteAcceptedTemplate(input: { quoteReference: string; tenderReference: string; feeGbp: number; paymentPath: string }): EmailTemplate {
  return {
    subject: `Quote accepted: action required for ${input.tenderReference}`,
    html: layout({
      eyebrow: 'Quote accepted',
      title: 'Your quote has been accepted',
      intro: 'The Contractor has selected your quote. Contact details will be released after the Accepted Quote Release Fee is confirmed.',
      body: detailRows([
        ['Tender', input.tenderReference],
        ['Quote', input.quoteReference],
        ['Release fee', `£${input.feeGbp} excl. VAT`],
        ['Next step', 'The Contractor will complete the release payment in their workspace'],
      ]) + note('Thank you. Please wait for the release confirmation before attempting direct contact. Trade Tender does not arrange the final transaction.'),
      action: { label: 'Continue in workspace', href: appUrl(input.paymentPath) },
    }),
  };
}

export function contactReleaseTemplate(input: { quoteReference: string; tenderReference: string; recipientRole: 'CONTRACTOR' | 'PROVIDER'; workspacePath: string }): EmailTemplate {
  return {
    subject: `Contact details released: ${input.tenderReference}`,
    html: layout({
      eyebrow: 'Contact release',
      title: 'Contact details are now available',
      intro: `The approved contact-release condition for ${input.tenderReference} has been confirmed. You can now view the authorised contact details in your workspace.`,
      body: detailRows([
        ['Tender', input.tenderReference],
        ['Quote', input.quoteReference],
        ['Recipient', input.recipientRole === 'CONTRACTOR' ? 'Contractor' : 'Provider'],
        ['Release status', 'Confirmed'],
      ]) + note('Trade Tender connects the parties. The final transaction, fulfilment, payment arrangements, and disputes are handled directly between Contractor and Provider.'),
      action: { label: 'View released details', href: appUrl(input.workspacePath) },
    }),
  };
}

export function accountUpdateTemplate(input: { title: string; summary: string; accountPath: string }): EmailTemplate {
  return {
    subject: `Trade Tender account update: ${input.title}`,
    html: layout({
      eyebrow: 'Account update',
      title: input.title,
      intro: input.summary,
      body: note('Please sign in to review the full details. If you did not expect this update, check your recent account activity and contact support through the platform.'),
      action: { label: 'Review account', href: appUrl(input.accountPath) },
    }),
  };
}

export function supportRequestInformationTemplate(input: { title: string; question: string; requestPath: string }): EmailTemplate {
  return {
    subject: `More information needed: ${input.title}`,
    html: layout({
      eyebrow: 'Support request',
      title: 'Please provide a little more information',
      intro: 'A Super User is reviewing your support request and needs additional information before deciding the next step.',
      body: detailRows([
        ['Question', input.question],
        ['Next step', 'Reply through your authenticated Support requests area with the requested information.'],
      ]) + note('Thank you. Please do not include card numbers, passwords, or other confidential payment details in your reply.'),
      action: { label: 'Open support requests', href: appUrl(input.requestPath) },
    }),
  };
}

export function contentHeldNotificationTemplate(input: { contentLabel: string; reasons: string[]; accountPath: string }): EmailTemplate {
  return {
    subject: `Trade Tender update: ${input.contentLabel} held for review`,
    html: layout({
      eyebrow: 'Content review',
      title: `${input.contentLabel} held for review`,
      intro: `Your ${input.contentLabel.toLowerCase()} could not be shared or submitted because it was flagged for confidential or restricted information.`,
      body: detailRows([
        ['Why it was held', input.reasons.join('; ') || 'Restricted information was detected'],
        ['Next step', 'A Super User will review the held content. Do not resend confidential information through email.'],
      ]) + note('If you believe this was a mistake, reply to this email and explain why the content should be reviewed again.'),
      action: { label: 'Review account activity', href: appUrl(input.accountPath) },
    }),
  };
}

export function contentReviewOutcomeTemplate(input: { contentLabel: string; releasedSafe: boolean; credits: number; creditType: string; reviewNote: string; accountPath: string }): EmailTemplate {
  return {
    subject: `Trade Tender review outcome: ${input.contentLabel}`,
    html: layout({
      eyebrow: 'Content review outcome',
      title: input.releasedSafe ? `${input.contentLabel} released as safe` : `${input.contentLabel} hold confirmed`,
      intro: input.releasedSafe
        ? `A Super User reviewed your held ${input.contentLabel.toLowerCase()} and marked it safe.`
        : `A Super User reviewed your held ${input.contentLabel.toLowerCase()} and confirmed the hold.`,
      body: detailRows([
        ['Outcome note', input.reviewNote],
        ...(input.releasedSafe ? [['Compensation', `${input.credits} ${input.creditType}`] as [string, string]] : []),
        ['Next step', input.releasedSafe ? 'The compensation credits are available for future use in your account.' : 'Please do not resend confidential information through the platform.'],
      ]) + (input.releasedSafe
        ? note('If you believe the review outcome is still incorrect, reply to this email and explain why.')
        : note('If you believe this outcome is incorrect, reply to this email and explain why.')),
      action: { label: 'Review account activity', href: appUrl(input.accountPath) },
    }),
  };
}

export function newRegistrationTemplate(input: { role: string; email: string; contactName: string; companyName?: string }): EmailTemplate {
  const roleLabel = input.role === 'SUPER_USER' ? 'Super User' : 'User';

  return {
    subject: `New Trade Tender account: ${input.email}`,
    html: layout({
      eyebrow: 'Account registration',
      title: 'A new account has been registered',
      intro: 'Please review this registration if onboarding or operational checks are required.',
      body: detailRows([
        ['Role', roleLabel],
        ['Contact name', input.contactName],
        ['Email', input.email],
        ...(input.companyName ? [['Company', input.companyName] as [string, string]] : []),
      ]) + note('No password or authentication secret is included in this notification.'),
      action: { label: 'Open administration', href: appUrl('/super-user') },
    }),
  };
}

export function emailVerificationTemplate(input: { verificationLink: string }): EmailTemplate {
  return {
    subject: 'Verify your Trade Tender email address',
    html: layout({
      eyebrow: 'Account verification',
      title: 'Please verify your email address',
      intro: 'Confirm this email address so we can activate your Trade Tender account and send operational updates.',
      body: note('This verification link expires in 24 hours. If you did not create this account, no action is required and you can ignore this message.'),
      action: { label: 'Verify email address', href: input.verificationLink },
    }),
  };
}

export function configurationTestTemplate(input: { environment: string; sentAt: Date }): EmailTemplate {
  return {
    subject: `Trade Tender email delivery test (${input.environment})`,
    html: layout({
      eyebrow: 'Delivery test',
      title: 'Email delivery is working',
      intro: 'This message confirms the Trade Tender email configuration for this environment.',
      body: detailRows([
        ['Environment', input.environment],
        ['Sent at', input.sentAt.toISOString()],
      ]) + note('No account, tender, quote, or contact information is included in this test.'),
    }),
  };
}

/** Deliberately excludes requester, message, tender, payment, and contact information. */
export function supportRequestNotificationTemplate(input: { type: string; submittedAt: Date }): EmailTemplate {
  return {
    subject: 'New Trade Tender support request',
    html: layout({
      eyebrow: 'Support request',
      title: 'A support request needs review',
      intro: 'A signed-in user has submitted a support request. Please review it in the authenticated Super User workspace.',
      body: detailRows([
        ['Request type', input.type],
        ['Submitted at', input.submittedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })],
      ]) + note('This email intentionally excludes requester and protected tender, contact, payment, and request-detail data.'),
      action: { label: 'Review support requests', href: appUrl('/super-user/support-requests') },
    }),
  };
}

/** Deliberately excludes the AI report body and evidence — those are reviewed only inside the authenticated Super User screen. */
export function providerVerificationReviewRequiredTemplate(input: { confidencePercent: number; reviewPath: string }): EmailTemplate {
  return {
    subject: 'Provider verification needs human review',
    html: layout({
      eyebrow: 'Provider verification',
      title: 'Please review a Provider verification request',
      intro: 'An automated document assessment could not confirm this account without a human reviewer.',
      body: detailRows([
        ['AI confidence score', `${input.confidencePercent}%`],
        ['Next step', 'Open the account review screen to see the assessment report and uploaded evidence, then approve or decline.'],
      ]) + note('The assessment report and evidence stay inside the authenticated workspace and are not attached to this email.'),
      action: { label: 'Review verification request', href: appUrl(input.reviewPath) },
    }),
  };
}

export function independentReviewPurchasedTemplate(input: { tier?: 'BRONZE' | 'SILVER' | 'GOLD' }): EmailTemplate {
  const tierLabel = input.tier === 'SILVER' ? 'Silver' : input.tier === 'GOLD' ? 'Gold' : input.tier === 'BRONZE' ? 'Bronze' : 'enhanced';
  return {
    subject: `Enhanced ${tierLabel} verification purchased`,
    html: layout({
      eyebrow: 'Bronze, Silver and Gold verification',
      title: `Thank you. Your ${tierLabel} verification purchase is confirmed`,
      intro: 'A professional Health & Safety verification has been purchased for your Provider account.',
      body: note('HSQE Consult Hub, an affiliated partner, will contact you to complete onboarding and the verification process. No further payment is required from you at this time.')
        + note('This purchase does not change tender matching, quote ranking, or Contractor decision-making on Trade Tender.'),
      action: { label: 'View your profile', href: appUrl('/retailer/profile') },
    }),
  };
}

export function enhancedVerificationInvitationTemplate(input: {
  recipientName?: string | null;
  inviteLink: string;
  expiresAt: Date;
}): EmailTemplate {
  const recipientName = input.recipientName?.trim();
  const greeting = recipientName ? `Hello ${recipientName}.` : 'Hello.';
  const expiryFormatted = input.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
  return {
    subject: 'Enhanced verification registration invitation',
    html: layout({
      eyebrow: 'Enhanced verification',
      title: 'You have been invited to complete enhanced verification',
      intro: `${greeting} A Trade Tender Provider has purchased enhanced verification, and you have been nominated to complete the registration.`,
      body: note('A secure invitation has been generated for you. Please use the button below when you are ready to begin.')
        + `<div style="margin:20px 0;padding:16px;background:${LIGHT_GREY};border-left:4px solid ${SAFETY_AMBER}">`
        + `<p style="margin:0 0 8px;font-family:'Source Sans 3',Arial,sans-serif;font-weight:700;font-size:13px;color:${NAVY}">Please note</p>`
        + `<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:${STEEL_BLUE}">`
        + '<li>This link is unique</li>'
        + '<li>It can only be used once</li>'
        + `<li>It expires on ${escapeHtml(expiryFormatted)}</li>`
        + '<li>It must not be shared</li>'
        + '</ul></div>'
        + note('If you were not expecting this invitation, you can ignore this email. No further action is required.'),
      action: { label: 'Begin enhanced verification', href: input.inviteLink },
    }),
  };
}

export function accountCreatedByAdminTemplate(input: { role: 'USER'; contactName: string; companyName?: string; resetLink: string; expiresIn: string }): EmailTemplate {
  return {
    subject: 'Your Trade Tender account is ready',
    html: layout({
      eyebrow: 'Account created',
      title: 'Please set a password to activate your account',
      intro: 'A Trade Tender account has been created for you by the Trade Tender team. Thank you for joining the platform.',
      body: detailRows([
        ['Account type', 'User'],
        ['Contact name', input.contactName],
        ...(input.companyName ? [['Business', input.companyName] as [string, string]] : []),
      ]) + `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${NAVY}">Use the button below to choose your own password. The link expires in ${escapeHtml(input.expiresIn)}. No password is included in this message.</p>`,
      action: { label: 'Set your password', href: input.resetLink },
    }),
  };
}

export function passwordResetTemplate(input: { resetLink: string; expiresIn: string }): EmailTemplate {
  return {
    subject: 'Reset your Trade Tender password',
    html: layout({
      eyebrow: 'Account security',
      title: 'Reset your password',
      intro: 'A password reset was requested for your Trade Tender account. Please use the button below if you made this request.',
      body: `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${NAVY}">This secure link expires in ${escapeHtml(input.expiresIn)}. If you did not request it, no action is required and your current password remains unchanged.</p>`,
      action: { label: 'Reset password', href: input.resetLink },
    }),
  };
}

export function failedPaymentTemplate(input: { paymentType: string; amountGbp: number; vatGbp: number; totalAmountGbp: number; reference: string; retryPath: string }): EmailTemplate {
  return {
    subject: `Payment action required: ${input.reference}`,
    html: layout({
      eyebrow: 'Action required',
      title: 'Your payment was not confirmed',
      intro: 'The payment required for this Trade Tender action was not confirmed. Please review the amount and try again when you are ready.',
      body: detailRows([
        ['Reference', input.reference],
        ['Payment type', input.paymentType],
        ['Fee', `£${input.amountGbp} excl. VAT`],
        ['VAT', `£${input.vatGbp}`],
        ['Total due', `£${input.totalAmountGbp} incl. VAT`],
        ['Status', 'Not confirmed'],
      ]) + note('Protected information and contact details remain unreleased until a trusted payment confirmation or approved waiver is recorded.'),
      action: { label: 'Review payment', href: appUrl(input.retryPath) },
    }),
  };
}

export function paymentReversedTemplate(input: { paymentType: string; reference: string; reversalType: 'REFUND' | 'DISPUTE'; accountPath: string }): EmailTemplate {
  const reason = input.reversalType === 'REFUND' ? 'refunded' : 'placed into dispute';
  return {
    subject: `Payment access update: ${input.reference}`,
    html: layout({
      eyebrow: 'Payment access update',
      title: 'Payment access has changed',
      intro: `A Trade Tender payment was ${reason}. Please review your account activity for the current access state.`,
      body: detailRows([
        ['Reference', input.reference],
        ['Payment type', input.paymentType],
        ['Status', input.reversalType === 'REFUND' ? 'Refunded' : 'Disputed'],
      ]) + note('Any platform access or contact release authorised by this payment has been removed while the payment reversal is processed.'),
      action: { label: 'Review account activity', href: appUrl(input.accountPath) },
    }),
  };
}

export function demoRequestTemplate(input: { name: string; email: string; organisation: string; role: string; message: string }): EmailTemplate {
  return {
    subject: `Demo request from ${input.organisation}`,
    html: layout({
      eyebrow: 'Demo request',
      title: 'A director has asked for a Trade Tender walkthrough',
      intro: 'A public demo request was submitted from the marketing site. Contact details below are supplied by the requester.',
      body: detailRows([
        ['Name', input.name],
        ['Email', input.email],
        ['Organisation', input.organisation],
        ['Role', input.role],
        ['Message', input.message],
      ]),
    }),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
