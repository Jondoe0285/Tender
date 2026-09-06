import { mobileApiFetch } from './client';

export type MobileQuoteSummary = { id: string; reference: string; status: string };

export type MobileQuoteSubmission = {
  lineItems: { tenderItemId: string; available: boolean; priceGbp?: number }[];
  charges: { description: string; priceGbp: number }[];
  leadTimeDays: number;
  deliveryDateConfirmed: boolean;
  deliveryInfo: string;
  validityDays: number;
};

export async function loadTenderQuotes(tenderId: string): Promise<MobileQuoteSummary[]> {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/quotes`);
  if (!response.ok) throw new Error('Unable to load quotes.');
  const body = await response.json() as { quotes?: MobileQuoteSummary[] };
  return Array.isArray(body.quotes) ? body.quotes : [];
}

export async function submitMobileQuote(tenderId: string, input: MobileQuoteSubmission): Promise<{ id: string; reference: string }> {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null) as { id?: string; reference?: string; error?: string } | null;
  if (!response.ok || !body?.id || !body.reference) throw new Error(body?.error ?? 'Unable to submit quote.');
  return { id: body.id, reference: body.reference };
}

export type MobileQuoteAcceptance = {
  status: string;
  paymentId?: string;
  checkoutUrl?: string | null;
};

export async function acceptMobileQuote(quoteId: string): Promise<MobileQuoteAcceptance> {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/accept`, { method: 'POST', headers: { 'X-Mobile-Payment-Return': 'tradetender://payment/return' } });
  const body = await response.json().catch(() => null) as MobileQuoteAcceptance & { error?: string } | null;
  if (!response.ok || !body?.status) throw new Error(body?.error ?? 'Unable to accept quote.');
  return body;
}

export type MobileReleaseStatus = { status: string; paymentId?: string; checkoutUrl?: string | null; totalAmountGbp?: number };

export async function loadMobileReleaseStatus(quoteId: string): Promise<MobileReleaseStatus> {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/release/status`);
  const body = await response.json().catch(() => null) as MobileReleaseStatus & { error?: string } | null;
  if (!response.ok || !body?.status) throw new Error(body?.error ?? 'Unable to load release status.');
  return body;
}

export type MobileReleasedContact = { contactName: string; email: string; contactPhone: string | null };

export async function loadReleasedContact(quoteId: string): Promise<MobileReleasedContact> {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/contact`);
  const body = await response.json().catch(() => null) as { contact?: MobileReleasedContact; error?: string } | null;
  if (!response.ok || !body?.contact) throw new Error(body?.error ?? 'Contact details are not available.');
  return body.contact;
}