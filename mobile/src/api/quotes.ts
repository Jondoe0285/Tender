import { mobileApiFetch, paymentReturnHeaders, readErrorMessage } from './client';

export type MobileQuoteSummary = {
  id: string;
  reference: string;
  status: string;
  priceGbp?: number;
  leadTimeDays?: number;
  deliveryInfo?: string;
  validityDays?: number;
  expired?: boolean;
  expiryMessage?: string;
  providerIsSoleTrader?: boolean;
  providerVerificationStatus?: string;
  independentlyVerified?: boolean;
  independentReviewTier?: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  releaseFeeGbp?: number;
  requiresSecondApprover?: boolean;
  lines?: Array<{
    tenderItemId: string;
    available: boolean;
    priceGbp?: number | null;
    unitRateGbp?: number | null;
    pricingKind?: string;
    tenderItem?: { category?: string; subcategory?: string; item?: string; quantity?: string };
  }>;
  charges?: Array<{ id: string; description: string; priceGbp: number }>;
  award?: { id: string; awardedAt: string } | null;
};

export type MobileQuoteSubmission = {
  lineItems: Array<
    | { tenderItemId: string; available: true; pricingKind?: 'UNIT' | 'LUMP' | 'DAYWORKS'; unitRateGbp?: number; priceGbp?: number }
    | { tenderItemId: string; available: false }
  >;
  charges: { description: string; priceGbp: number }[];
  leadTimeDays: number;
  deliveryDateConfirmed: boolean;
  deliveryInfo: string;
  validityDays?: number;
};

export async function loadTenderQuotes(tenderId: string): Promise<MobileQuoteSummary[]> {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/quotes`);
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load quotes.'));
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

export async function acceptMobileQuote(quoteId: string, input: {
  purchaseOrderNumber: string;
  declarationAccepted?: boolean;
  secondApproverEmail?: string;
}): Promise<MobileQuoteAcceptance> {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paymentReturnHeaders() },
    body: JSON.stringify(input),
  });
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

export async function finalizeQuoteRelease(quoteId: string, paymentId: string) {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to confirm contact release.'));
}

export type MobileReleasedContact = { contactName: string; email: string; contactPhone: string | null };

export async function loadReleasedContact(quoteId: string): Promise<MobileReleasedContact> {
  const response = await mobileApiFetch(`/api/quotes/${encodeURIComponent(quoteId)}/contact`);
  const body = await response.json().catch(() => null) as { contact?: MobileReleasedContact; error?: string } | null;
  if (!response.ok || !body?.contact) throw new Error(body?.error ?? 'Contact details are not available.');
  return body.contact;
}

export type MobileTenderMessage = { id: string; body: string; createdAt: string; senderRole?: string; isOwn?: boolean };

export async function loadTenderMessages(tenderId: string, quoteId?: string) {
  const suffix = quoteId ? `?quoteId=${encodeURIComponent(quoteId)}` : '';
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/messages${suffix}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load messages.'));
  return response.json() as Promise<{ messages: MobileTenderMessage[]; unavailableReason?: string }>;
}

export async function sendTenderMessage(tenderId: string, body: string, quoteId?: string) {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, quoteId }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to send the message.'));
}
