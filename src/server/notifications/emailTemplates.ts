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

export function contactReleaseTemplate(input: { quoteReference?: string; tenderReference: string; recipientRole: 'CONTRACTOR' | 'PROVIDER'; workspacePath: string; reason?: 'SITE_VISIT' }): EmailTemplate {
  const siteVisit = input.reason === 'SITE_VISIT';
  return {
    subject: `Contact details released: ${input.tenderReference}`,
    html: layout({
      eyebrow: 'Contact release',
      title: siteVisit ? 'Contact details are available for a site visit' : 'Contact details are now available',
      intro: siteVisit
        ? `The fixed release fee for ${input.tenderReference} has been confirmed. Use the authorised contact details in your workspace to arrange a site visit and prepare a quote.`
        : `The approved contact-release condition for ${input.tenderReference} has been confirmed. You can now view the authorised contact details in your workspace.`,
      body: detailRows([
        ['Tender', input.tenderReference],
        ...(input.quoteReference ? [['Quote', input.quoteReference] as [string, string]] : []),
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

export function providerAutomatedVerificationTemplate(input: { passed: boolean; confidencePercent: number }): EmailTemplate {
  if (input.passed) {
    return {
      subject: 'Automated verification passed',
      html: layout({
        eyebrow: 'Provider verification',
        title: 'Your automated verification has passed',
        intro: 'A PDF text check confirmed the required documents for your Provider account.',
        body: detailRows([
          ['Outcome', 'Verified'],
          ['Text-check score', `${input.confidencePercent}%`],
        ]) + note('This is a PDF text check for company identity, document type, and expiry. It is not a Companies House, HMRC, or insurer lookup, and it does not confirm insurance cover, competence, or identity. Clients still complete their own due diligence.'),
        action: { label: 'View verification', href: appUrl('/retailer/verification') },
      }),
    };
  }
  return {
    subject: 'Automated verification did not pass',
    html: layout({
      eyebrow: 'Provider verification',
      title: 'Automated verification could not confirm your documents',
      intro: 'A PDF text check could not confirm the required documents, so this account is not verified.',
      body: detailRows([
        ['Outcome', 'Not approved'],
        ['Text-check score', `${input.confidencePercent}%`],
      ]) + note('Use a text PDF from Companies House or your insurer, under 2 MB. Photographs and large scans cannot be read. There is no human review of this upload path. You can upload again and submit.')
        + note('The assessment report stays inside your signed-in workspace and is not attached to this email.'),
      action: { label: 'Upload documents', href: appUrl('/retailer/verification') },
    }),
  };
}

export function independentReviewDecisionTemplate(input: { approved: boolean; tier?: 'BRONZE' | 'SILVER' | 'GOLD' | null }): EmailTemplate {
  const tierLabel = input.tier === 'SILVER' ? 'Silver' : input.tier === 'GOLD' ? 'Gold' : input.tier === 'BRONZE' ? 'Bronze' : null;
  if (input.approved && tierLabel) {
    return {
      subject: `Enhanced ${tierLabel} verification awarded`,
      html: layout({
        eyebrow: 'Bronze, Silver and Gold verification',
        title: `Your ${tierLabel} verification has been awarded`,
        intro: 'A professional Health & Safety review has been recorded against your Provider account.',
        body: detailRows([
          ['Outcome', `Enhanced Verified · ${tierLabel}`],
          ['Valid for', '12 months from the decision date'],
        ]) + note('This badge means a paid professional review was recorded at this tier. It does not replace a client’s own insurance, competence, or contract checks.')
          + note('The review comments stay inside the signed-in workspace and are not attached to this email.'),
        action: { label: 'View your profile', href: appUrl('/retailer/profile') },
      }),
    };
  }
  return {
    subject: 'Enhanced verification was not approved',
    html: layout({
      eyebrow: 'Bronze, Silver and Gold verification',
      title: 'Enhanced verification was not approved',
      intro: 'The professional Health & Safety review for this purchase was not approved.',
      body: note('You can purchase a Bronze, Silver, or Gold verification again from your profile. Review comments stay inside the signed-in workspace and are not attached to this email.'),
      action: { label: 'View enhanced verification', href: appUrl('/retailer/independent-review') },
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
    subject: 'Complete enhanced verification with HSQE Consult Hub',
    html: layout({
      eyebrow: 'Enhanced verification',
      title: 'Continue enhanced verification onboarding',
      intro: `${greeting} Your Trade Tender Provider account has a confirmed enhanced verification purchase. Use the secure link below to continue registration with HSQE Consult Hub.`,
      body: note('This link opens the affiliated partner onboarding page. It is not a Trade Tender login or register page.')
        + `<div style="margin:20px 0;padding:16px;background:${LIGHT_GREY};border-left:4px solid ${SAFETY_AMBER}">`
        + `<p style="margin:0 0 8px;font-family:'Source Sans 3',Arial,sans-serif;font-weight:700;font-size:13px;color:${NAVY}">Please note</p>`
        + `<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:${STEEL_BLUE}">`
        + '<li>This link is unique</li>'
        + '<li>It can only be used once</li>'
        + `<li>It expires on ${escapeHtml(expiryFormatted)}</li>`
        + '<li>It must not be shared</li>'
        + '</ul></div>'
        + note('If you were not expecting this message, you can ignore it. HSQE Consult Hub may also contact you directly.'),
      action: { label: 'Continue with HSQE Consult Hub', href: input.inviteLink },
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

const MARKETING_STEPS: Array<{ title: string; body: string; image: string; alt: string; label: string }> = [
  {
    label: 'Step 1',
    title: 'Set out the job once',
    body: 'Put the trade, quantity, location, and deadline in writing. Matched Suppliers price that brief — not a different conversation each time someone picks up the phone.',
    image: '/images/prelaunch/specify.png',
    alt: 'Construction drawings and a tender pack on a site desk',
  },
  {
    label: 'Step 2',
    title: 'Compare every quote on the same brief',
    body: 'Price, lead time, and documents sit in one table. For contractor and professional jobs, a Supplier can pay a fixed fee to visit the site before quoting. You award from evidence, not from whoever called last.',
    image: '/images/prelaunch/compare.png',
    alt: 'A site office table used to compare quotes',
  },
  {
    label: 'Step 3',
    title: 'Award, then share contact',
    body: 'Accept the quote you want. Names, emails, and phone numbers stay private until a site visit is paid for, or until you accept. The job record keeps matching, quotes, and the award together.',
    image: '/images/prelaunch/supply.png',
    alt: 'A UK materials yard and plant at dusk',
  },
];

const MARKETING_WINS: Array<[string, string]> = [
  ['Stop repeating the job on the phone', 'One written brief replaces chasing attachments and re-explaining the quantity. Buying teams spend less time qualifying quotes. Suppliers spend less time pricing the wrong version of the job.'],
  ['See multiple quotes on the same specification', 'Matched Suppliers price the same trade, quantity, location, and deadline. Side-by-side quotes make the award a documented choice, not a guess between a phone note and a PDF.'],
  ['Reach firms you have not already got on speed dial', 'Buyers see Suppliers they have not previously used. Suppliers see live tenders in their trade and area from Buyers they have not previously reached — without buying a lead list.'],
  ['Run buying and supplying on one path', 'Materials, plant, waste, contractor work, and professional services sit on one platform: tender, quote, award, and contact release. It is the record of the job from brief to award, not a catalogue and not a phone directory.'],
];

export const MARKETING_TEMPLATE_KEYS = ['MARKETPLACE', 'SUPPLIERS'] as const;
export type MarketingTemplateKey = (typeof MARKETING_TEMPLATE_KEYS)[number];

const SUPPLIER_MARKETING_STEPS: Array<{ title: string; body: string; image: string; alt: string; label: string }> = [
  {
    label: 'Step 1',
    title: 'See matched tenders in your trade',
    body: 'Plant hire companies, waste handlers, materials suppliers, and contractors only see jobs that match their services and location. You are not wading through every tender on the platform.',
    image: '/images/prelaunch/hero.png',
    alt: 'A UK construction frame and cranes at dusk',
  },
  {
    label: 'Step 2',
    title: 'Read the scope before you quote',
    body: 'The brief already has the location, quantity, and requirements. You decide whether the job interests you before you commit time to a quote.',
    image: '/images/prelaunch/specify.png',
    alt: 'Construction drawings and a tender pack on a site desk',
  },
  {
    label: 'Step 3',
    title: 'Quote the work that fits, and generate revenue',
    body: 'Provide a quote when the job is worth your time. That is live demand from Buyers you have not previously traded with, not a purchased lead list.',
    image: '/images/prelaunch/supply.png',
    alt: 'A UK materials yard and plant at dusk',
  },
];

const SUPPLIER_MARKETING_WINS: Array<[string, string]> = [
  ['Genuine opportunities to generate revenue', 'Buyers are putting live construction jobs out now: plant, waste, materials, and site work. You quote against a written brief. That is paid work from companies you have not previously reached.'],
  ['Only tender for what interests you', 'You set your services and area. Matched tenders arrive. Skip the rest. You are not quoting every enquiry that lands in a shared inbox.'],
  ['Scope, location, and requirements before you commit', 'Trade, quantity, location, and deadline sit on the tender. You read them before you start a quote. You are not pricing a phone note or a forwarded PDF with missing details.'],
  ['You choose when to engage', 'Names and phone numbers stay private until contact is released. For contractor and professional jobs, a fixed fee unlocks a site visit before you quote. Buyers do not get your number until that step.'],
];

function marketingButton(href: string, label: string): string {
  return `<a href="${escapeAttribute(href)}" style="display:inline-block;min-height:44px;line-height:44px;background:${TRADE_BLUE};color:${WHITE};padding:0 20px;text-decoration:none;font-family:'Source Sans 3',Arial,sans-serif;font-weight:600;font-size:14px">${escapeHtml(label)}</a>`;
}

function marketingPhoto(path: string, alt: string, width = 620): string {
  return `<img src="${escapeAttribute(appUrl(path))}" alt="${escapeHtml(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0">`;
}

function marketingStepRows(steps: Array<{ title: string; body: string; image: string; alt: string; label: string }>): string {
  return steps.map((step) => (
    `<tr><td style="padding:0 0 24px;background:${WHITE}">${marketingPhoto(step.image, step.alt)}<div style="padding:18px 24px 8px"><p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${STEEL_BLUE}">${escapeHtml(step.label)}</p><p style="margin:0 0 8px;font-size:18px;line-height:1.3;font-weight:700;color:${NAVY}">${escapeHtml(step.title)}</p><p style="margin:0;font-size:14px;line-height:1.65;color:${NAVY}">${escapeHtml(step.body)}</p></div></td></tr>`
  )).join('');
}

function marketingWinRows(wins: Array<[string, string]>): string {
  return wins.map(([title, body]) => (
    `<tr><td style="padding:0 0 12px"><div style="border:1px solid #e2e8f0;background:${WHITE};padding:18px 20px"><p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${NAVY}">${escapeHtml(title)}</p><p style="margin:0;font-size:14px;line-height:1.65;color:${CONCRETE_GREY}">${escapeHtml(body)}</p></div></td></tr>`
  )).join('');
}

function marketingCampaignDocument(input: {
  unsubscribeUrl: string;
  heroPath: string;
  heroAlt: string;
  kicker: string;
  headlineLines: string[];
  intro: string;
  primaryHref: string;
  primaryLabel: string;
  bodyTables: string;
  closingTitle: string;
  closingBody: string;
  closingHref: string;
  closingLabel: string;
  closingSecondaryHref?: string;
  closingSecondaryLabel?: string;
}): string {
  const unsubscribeUrl = escapeAttribute(input.unsubscribeUrl);
  const logoSrc = escapeAttribute(appUrl('/images/brand/Trade_Tender_Candidate_Horizontal_Logo.png'));
  const headline = input.headlineLines.map((line) => escapeHtml(line)).join('<br>');
  const secondary = input.closingSecondaryHref && input.closingSecondaryLabel
    ? `&nbsp;&nbsp;<a href="${escapeAttribute(input.closingSecondaryHref)}" style="display:inline-block;min-height:44px;line-height:44px;color:${WHITE};padding:0 12px;text-decoration:underline;font-family:'Source Sans 3',Arial,sans-serif;font-weight:600;font-size:14px">${escapeHtml(input.closingSecondaryLabel)}</a>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;background:${LIGHT_GREY};font-family:'Source Sans 3',Arial,sans-serif;color:${NAVY}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${LIGHT_GREY}"><tr><td style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${NAVY}">
  <tr><td style="padding:22px 24px 18px;background:${WHITE}"><img src="${logoSrc}" alt="Trade Tender" width="196" style="display:block;width:196px;height:auto;border:0"></td></tr>
  <tr><td style="padding:0">${marketingPhoto(input.heroPath, input.heroAlt)}</td></tr>
  <tr><td style="padding:28px 24px 32px;background:${NAVY}">
    <div style="height:4px;width:64px;background:${SAFETY_AMBER};margin:0 0 16px"></div>
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${WHITE}">${escapeHtml(input.kicker)}</p>
    <h1 style="margin:0 0 14px;font-family:'Source Sans 3',Arial,sans-serif;font-size:28px;line-height:1.15;font-weight:700;color:${WHITE}">${headline}</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:${WHITE}">${escapeHtml(input.intro)}</p>
    ${marketingButton(input.primaryHref, input.primaryLabel)}
  </td></tr>
</table>
${input.bodyTables}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${NAVY}">
  <tr><td style="padding:32px 24px">
    <p style="margin:0 0 10px;font-size:20px;line-height:1.3;font-weight:700;color:${WHITE}">${escapeHtml(input.closingTitle)}</p>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:${WHITE}">${escapeHtml(input.closingBody)}</p>
    ${marketingButton(input.closingHref, input.closingLabel)}${secondary}
  </td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto">
  <tr><td style="padding:20px 8px 8px;font-size:12px;line-height:1.5;color:${CONCRETE_GREY}">Tenders and quotes for UK construction. Trade Tender connects Buyers and Suppliers. It is not a party to the final contract.</td></tr>
  <tr><td style="padding:0 8px 28px;font-size:11px;line-height:1.5;color:${CONCRETE_GREY}"><a href="${unsubscribeUrl}" style="color:${TRADE_BLUE}">Unsubscribe</a> from future Trade Tender marketing. Account messages about tenders, quotes, and payments are not affected. Do not reply with confidential project information.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Owner campaign mailshot for Trade Tender. Photography and navy/amber treatment follow the public landing. */
export function tradeTenderMarketingTemplate(input: { unsubscribeUrl: string; ctaUrl?: string | null }): EmailTemplate {
  const primaryHref = input.ctaUrl?.trim() || appUrl('/register');
  const registerHref = appUrl('/register');
  const demoHref = appUrl('/demo');
  const buyerHref = appUrl('/register?intent=buying');
  const supplierHref = appUrl('/register?intent=supplying');
  return {
    subject: 'Take the hassle out of sourcing for your next job',
    html: marketingCampaignDocument({
      unsubscribeUrl: input.unsubscribeUrl,
      heroPath: '/images/prelaunch/hero.png',
      heroAlt: 'A UK construction frame and cranes at dusk',
      kicker: 'UK construction marketplace',
      headlineLines: ['Set out the job.', 'Compare quotes.', 'Award the work.'],
      intro: 'You already pay for every extra call that creates another version of the brief. Trade Tender is the marketplace where Buyers publish one job, matched Suppliers quote that job, and you award with names still private until you choose to share them.',
      primaryHref,
      primaryLabel: 'Create an account',
      bodyTables: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${WHITE}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${STEEL_BLUE}">How it operates</p>
    <p style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;color:${NAVY}">Everyone quotes the same job</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:${NAVY}">Three steps from tender to award. You are not comparing different versions of the brief, and you are not handing out phone numbers to every caller.</p>
  </td></tr>
  ${marketingStepRows(MARKETING_STEPS)}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${LIGHT_GREY}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${STEEL_BLUE}">Why create an account</p>
    <p style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;color:${NAVY}">Win the next job on a written record</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:${NAVY}">Sign up to run tenders and quotes in one place — including companies you have not previously traded with.</p>
  </td></tr>
  <tr><td style="padding:0 24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${marketingWinRows(MARKETING_WINS)}</table></td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${WHITE}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${STEEL_BLUE}">Buyers</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:${NAVY}">Raise a tender and collect comparable quotes</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${CONCRETE_GREY}">For site teams and buying teams that need materials, plant, waste, contractor work, or professional services. Publish one job and receive quotes from matched Suppliers — including firms you have not previously reached — then award from the same table.</p>
    <p style="margin:0 0 28px">${marketingButton(buyerHref, 'Create a Buyer account')}</p>
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${STEEL_BLUE}">Suppliers</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:${NAVY}">Quote live jobs in your trade and area</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${CONCRETE_GREY}">You only see tenders that match your services and location. Read the brief, then quote. That is new demand from Buyers you have not previously traded with. For contractor and professional jobs, pay a fixed fee to contact the Buyer for a site visit first.</p>
    <p style="margin:0 0 12px">${marketingButton(supplierHref, 'Create a Supplier account')}</p>
  </td></tr>
</table>`,
      closingTitle: 'Create an account and run the next job on the platform',
      closingBody: 'Buyers publish a brief. Suppliers quote it. You award the work with a full record — not a trail of calls and forwarded PDFs.',
      closingHref: registerHref,
      closingLabel: 'Create an account',
      closingSecondaryHref: demoHref,
      closingSecondaryLabel: 'Request a demo',
    }),
  };
}

/** Owner campaign mailshot for plant hire, waste, materials, and contractor Suppliers. */
export function tradeTenderSupplierMarketingTemplate(input: { unsubscribeUrl: string; ctaUrl?: string | null }): EmailTemplate {
  const primaryHref = input.ctaUrl?.trim() || appUrl('/register?intent=supplying');
  return {
    subject: 'Quote live jobs that already have a written brief',
    html: marketingCampaignDocument({
      unsubscribeUrl: input.unsubscribeUrl,
      heroPath: '/images/prelaunch/supply.png',
      heroAlt: 'A UK materials yard and plant at dusk',
      kicker: 'For UK Suppliers · plant, waste, materials, and site work',
      headlineLines: ['See the brief first.', 'Quote only the jobs that fit.'],
      intro: 'Trade Tender puts genuine construction demand in front of plant hire companies, waste handlers, materials suppliers, and contractors. You see the scope, location, and requirements first. You only quote the jobs that interest you. That is revenue from Buyers you have not previously reached — not a purchased lead list.',
      primaryHref,
      primaryLabel: 'Create a Supplier account',
      bodyTables: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${WHITE}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${STEEL_BLUE}">How it works for Suppliers</p>
    <p style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;color:${NAVY}">Read the job. Then decide whether to quote.</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:${NAVY}">You are not committing a quote until you have seen the written brief. Skip anything that does not fit your plant, yard, or trade.</p>
  </td></tr>
  ${marketingStepRows(SUPPLIER_MARKETING_STEPS)}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${LIGHT_GREY}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${STEEL_BLUE}">Why Suppliers create an account</p>
    <p style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;color:${NAVY}">Live demand, without quoting every enquiry</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:${NAVY}">Sign up to receive matched tenders. Quote the work that generates revenue for your business.</p>
  </td></tr>
  <tr><td style="padding:0 24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${marketingWinRows(SUPPLIER_MARKETING_WINS)}</table></td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;margin:0 auto;background:${WHITE}">
  <tr><td style="padding:28px 24px 8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${STEEL_BLUE}">Built for your trade</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:${NAVY}">Plant hire, waste, materials, and contractors</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${CONCRETE_GREY}">Set the services you supply and the area you cover. Matched Buyers publish a brief with scope, location, and requirements. You tender for the jobs that interest you. Contact stays private until you engage.</p>
    <p style="margin:0 0 12px">${marketingButton(primaryHref, 'Create a Supplier account')}</p>
  </td></tr>
</table>`,
      closingTitle: 'Start quoting jobs that already have a written brief',
      closingBody: 'Create a Supplier account, set your trade and area, and only tender for the work that fits.',
      closingHref: primaryHref,
      closingLabel: 'Create a Supplier account',
      closingSecondaryHref: appUrl('/demo'),
      closingSecondaryLabel: 'Request a demo',
    }),
  };
}

export function marketingTemplateForKey(
  key: string,
  input: { unsubscribeUrl: string; ctaUrl?: string | null },
): EmailTemplate {
  if (key === MARKETING_TEMPLATE_KEYS[1]) return tradeTenderSupplierMarketingTemplate(input);
  return tradeTenderMarketingTemplate(input);
}

export function marketingTemplateLabel(key: string): string {
  if (key === 'SUPPLIERS') return 'Suppliers';
  return 'Buyers and mixed lists';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
