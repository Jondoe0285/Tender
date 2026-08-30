const NAVY = '#0E1C2E';
const AMBER = '#F5A524';
const STEEL = '#1D3D5C';
const GREY = '#8A94A0';
const WHITE = '#F4F6F8';

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
    ? `<p style="margin:28px 0"><a href="${escapeAttribute(action.href)}" style="display:inline-block;background:${AMBER};color:${NAVY};padding:13px 20px;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:${WHITE};font-family:Arial,sans-serif;color:${NAVY}"><div style="max-width:620px;margin:0 auto;padding:32px 24px"><div style="border-top:5px solid ${AMBER};background:#ffffff;padding:28px;box-shadow:0 1px 3px rgba(14,28,46,.08)"><p style="margin:0 0 18px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${STEEL}">Trade Tender</p><p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${GREY}">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:${NAVY}">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.6">${escapeHtml(intro)}</p>${body}${actionMarkup}</div><p style="margin:22px 4px 0;font-size:12px;line-height:1.5;color:${GREY}">Trade Tender is a connection and tender-management platform. It is not the supplier, contractor, broker, guarantor, or responsible party for the final Client-Retailer transaction.</p><p style="margin:12px 4px 0;font-size:11px;color:${GREY}">This is an operational message from Trade Tender. Please do not reply with confidential project or payment information.</p></div></body></html>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table style="border-collapse:collapse;width:100%;margin:24px 0">${rows.map(([label, value]) => `<tr><td style="padding:9px 0;color:${GREY};vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;font-weight:700;vertical-align:top">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
}

export function appUrl(path: string): string {
  return `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}${path}`;
}

export function retailerInvitationTemplate(input: { companyName: string; inviteLink: string }): EmailTemplate {
  return {
    subject: 'Your Trade Tender retailer account invitation',
    html: layout({ eyebrow: 'Retailer account', title: 'Join the Trade Tender supply network', intro: `Your business has been invited to review qualified construction tender opportunities.`, body: detailRows([['Business', input.companyName], ['Access', 'Matched tender summaries and quote opportunities']]), action: { label: 'Complete retailer setup', href: input.inviteLink } }),
  };
}

export function tenderOpportunityTemplate(input: { id: string; reference: string; category: string; clientTradeTenderId: string; locationArea: string; closingDate: Date; requirementSummary: string }): EmailTemplate {
  return {
    subject: `New matched tender: ${input.reference}`,
      html: layout({ eyebrow: 'New opportunity', title: 'Review a matched tender opportunity', intro: 'A tender has been matched to your registered categories and operating area.', body: detailRows([['Tender ID', input.reference], ['Client Trade Tender ID', input.clientTradeTenderId], ['Category', input.category], ['Location area', input.locationArea], ['Requirement', input.requirementSummary], ['Quote deadline', input.closingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })]]) + `<p style="font-size:14px;line-height:1.6">Client identity, precise site information, full specification, attachments, and direct communication details remain restricted until the required unlock stage.</p>`, action: { label: 'Review opportunity', href: appUrl(`/retailer/tenders/${encodeURIComponent(input.id)}`) } }),
  };
}

export function quoteReceivedTemplate(input: { tenderReference: string; quoteReference: string; category: string; priceGbp: number; leadTimeDays: number; reviewPath: string }): EmailTemplate {
  return {
    subject: `Quote received for ${input.tenderReference}`,
    html: layout({ eyebrow: 'Quote received', title: 'A Retailer has submitted a quote', intro: 'A new formal quote is ready for review in your Client workspace.', body: detailRows([['Tender ID', input.tenderReference], ['Quote ID', input.quoteReference], ['Category', input.category], ['Quoted price', `£${input.priceGbp} excl. VAT`], ['Lead time', `${input.leadTimeDays} days`]]) + '<p style="font-size:14px;line-height:1.6">Retailer contact details remain private until you accept a quote and the Accepted Quote Release Fee is confirmed.</p>', action: { label: 'Compare quote', href: appUrl(input.reviewPath) } }),
  };
}

export function quoteReminderTemplate(input: { quoteReference: string; tenderReference: string; deadline: Date; reviewPath: string }): EmailTemplate {
  return {
    subject: `Action required: quote deadline for ${input.tenderReference}`,
    html: layout({ eyebrow: 'Quote reminder', title: 'A tender response deadline is approaching', intro: 'Please review the tender and submit or update your formal quote before the deadline.', body: detailRows([['Tender ID', input.tenderReference], ['Quote reference', input.quoteReference], ['Deadline', input.deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })]]), action: { label: 'Open tender', href: appUrl(input.reviewPath) } }),
  };
}

export function paymentConfirmationTemplate(input: { paymentType: string; amountGbp: number; vatGbp: number; totalAmountGbp: number; reference: string; accountPath: string }): EmailTemplate {
  return {
    subject: `Payment confirmed: ${input.reference}`,
    html: layout({ eyebrow: 'Payment confirmation', title: 'Payment confirmed', intro: 'Your Trade Tender payment has been confirmed.', body: detailRows([['Reference', input.reference], ['Payment type', input.paymentType], ['Fee', `£${input.amountGbp} excl. VAT`], ['VAT', `£${input.vatGbp}`], ['Total paid', `£${input.totalAmountGbp} incl. VAT`], ['Status', 'Confirmed']]) + '<p style="font-size:14px;line-height:1.6">Access is updated only after trusted payment confirmation. Keep this message for your records.</p>', action: { label: 'View account activity', href: appUrl(input.accountPath) } }),
  };
}

export function quoteAcceptedTemplate(input: { quoteReference: string; tenderReference: string; feeGbp: number; paymentPath: string }): EmailTemplate {
  return {
    subject: `Quote accepted: action required for ${input.tenderReference}`,
    html: layout({ eyebrow: 'Quote accepted', title: 'Your quote has been accepted', intro: 'The Client has selected your quote. Contact details will be released after the Accepted Quote Release Fee is confirmed.', body: detailRows([['Tender ID', input.tenderReference], ['Quote ID', input.quoteReference], ['Release fee', `£${input.feeGbp} excl. VAT`], ['Next step', 'The Client will complete the release payment in their workspace']]), action: { label: 'Continue in workspace', href: appUrl(input.paymentPath) } }),
  };
}

export function contactReleaseTemplate(input: { quoteReference: string; tenderReference: string; recipientRole: 'CLIENT' | 'RETAILER'; workspacePath: string }): EmailTemplate {
  return {
    subject: `Contact details released: ${input.tenderReference}`,
    html: layout({ eyebrow: 'Contact release', title: 'Contact details are now available', intro: `The approved contact-release condition for ${input.tenderReference} has been confirmed.`, body: detailRows([['Tender ID', input.tenderReference], ['Quote ID', input.quoteReference], ['Recipient', input.recipientRole === 'CLIENT' ? 'Client' : 'Retailer'], ['Release status', 'Confirmed']]) + '<p style="font-size:14px;line-height:1.6">Trade Tender connects the parties. The final transaction, fulfilment, payment arrangements, and disputes are handled directly between Client and Retailer.</p>', action: { label: 'View released details', href: appUrl(input.workspacePath) } }),
  };
}

export function accountUpdateTemplate(input: { title: string; summary: string; accountPath: string }): EmailTemplate {
  return {
    subject: `Trade Tender account update: ${input.title}`,
    html: layout({ eyebrow: 'Account update', title: input.title, intro: input.summary, body: '<p style="font-size:14px;line-height:1.6">If you did not expect this update, sign in and review your account activity.</p>', action: { label: 'Review account', href: appUrl(input.accountPath) } }),
  };
}

export function newRegistrationTemplate(input: { role: string; email: string; contactName: string; companyName?: string }): EmailTemplate {
  return {
    subject: `New Trade Tender account: ${input.email}`,
    html: layout({
      eyebrow: 'Account registration',
      title: 'New account registered',
      intro: 'A new user has registered on Trade Tender and may require onboarding or operational review.',
      body: detailRows([
        ['Role', input.role],
        ['Contact name', input.contactName],
        ['Email', input.email],
        ...(input.companyName ? [['Company', input.companyName] as [string, string]] : []),
      ]) + '<p style="font-size:14px;line-height:1.6">No password or authentication secret is included in this notification.</p>',
      action: { label: 'Open administration', href: appUrl('/super-user') },
    }),
  };
}

export function emailVerificationTemplate(input: { verificationLink: string }): EmailTemplate {
  return {
    subject: 'Verify your Trade Tender email address',
    html: layout({
      eyebrow: 'Account verification',
      title: 'Verify your email address',
      intro: 'Confirm your email address to activate your Trade Tender account.',
      body: '<p style="font-size:14px;line-height:1.6">This verification link expires in 24 hours. If you did not create this account, no action is required.</p>',
      action: { label: 'Verify email address', href: input.verificationLink },
    }),
  };
}

export function passwordResetTemplate(input: { resetLink: string; expiresIn: string }): EmailTemplate {
  return {
    subject: 'Reset your Trade Tender password',
    html: layout({ eyebrow: 'Account security', title: 'Reset your password', intro: 'A password reset was requested for your Trade Tender account.', body: `<p style="font-size:14px;line-height:1.6">This secure link expires in ${escapeHtml(input.expiresIn)}. If you did not request it, no action is required.</p>`, action: { label: 'Reset password', href: input.resetLink } }),
  };
}

export function failedPaymentTemplate(input: { paymentType: string; amountGbp: number; vatGbp: number; totalAmountGbp: number; reference: string; retryPath: string }): EmailTemplate {
  return {
    subject: `Payment action required: ${input.reference}`,
    html: layout({ eyebrow: 'Payment action required', title: 'Payment was not confirmed', intro: 'The payment required for this Trade Tender action was not confirmed.', body: detailRows([['Reference', input.reference], ['Payment type', input.paymentType], ['Fee', `£${input.amountGbp} excl. VAT`], ['VAT', `£${input.vatGbp}`], ['Total due', `£${input.totalAmountGbp} incl. VAT`], ['Status', 'Not confirmed']]) + '<p style="font-size:14px;line-height:1.6">Protected information and contact details remain unreleased until a trusted payment confirmation or approved waiver is recorded.</p>', action: { label: 'Review payment', href: appUrl(input.retryPath) } }),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
