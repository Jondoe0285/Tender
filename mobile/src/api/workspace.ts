import { mobileApiFetch, readErrorMessage } from './client';

export type BuyerCapabilities = {
  orgRole: string;
  canRaiseTender: boolean;
  canEstimate: boolean;
  canAward: boolean;
};

export type WorkQueueItem = {
  tenderId: string;
  reference: string;
  title: string;
  due: string;
  action: string;
  status: 'attention' | 'pending' | 'neutral';
};

export type DashboardPayload = {
  capabilities: BuyerCapabilities;
  metrics: { openTenders: number; quotesToReview: number; awardedCount: number; quotesReceivedCount: number };
  buyingQueue: WorkQueueItem[];
  supplyingQueue: WorkQueueItem[];
};

export async function loadDashboard(): Promise<DashboardPayload> {
  const response = await mobileApiFetch('/api/user/dashboard');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load the dashboard.'));
  return response.json() as Promise<DashboardPayload>;
}

export async function loadCapabilities(): Promise<BuyerCapabilities> {
  const response = await mobileApiFetch('/api/user/capabilities');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load workspace permissions.'));
  return response.json() as Promise<BuyerCapabilities>;
}

export type AwardRow = {
  id: string;
  awardedAt: string;
  purchaseOrderNumber: string;
  project?: { name: string } | null;
  quote: { id: string; reference: string; priceGbp: number };
  tender: { id: string; reference: string; subcategory: string; category: string; location: string };
};

export async function loadAwards(): Promise<AwardRow[]> {
  const response = await mobileApiFetch('/api/user/awards');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load awards.'));
  const body = await response.json() as { awards?: AwardRow[] };
  return Array.isArray(body.awards) ? body.awards : [];
}

export type SubmittedQuoteRow = {
  id: string;
  reference: string;
  status: string;
  priceGbp: number;
  validityDays: number;
  tender: { id: string; reference: string; subcategory: string };
};

export async function loadSubmittedQuotes(): Promise<SubmittedQuoteRow[]> {
  const response = await mobileApiFetch('/api/user/quotes');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load submitted quotes.'));
  const body = await response.json() as { quotes?: SubmittedQuoteRow[] };
  return Array.isArray(body.quotes) ? body.quotes : [];
}

export type PaymentsPayload = {
  period: string;
  metrics: { unlocks: number; quotesProvided: number; quotesAccepted: number };
  payments: Array<{
    id: string;
    createdAt: string;
    type: string;
    amountGbp: number;
    vatGbp: number;
    vatPercentage: number;
    totalAmountGbp: number;
    status: string;
  }>;
};

export async function loadPayments(period: string): Promise<PaymentsPayload> {
  const response = await mobileApiFetch(`/api/user/payments?period=${encodeURIComponent(period)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load activity and payments.'));
  return response.json() as Promise<PaymentsPayload>;
}

export type SupportRequest = { id: string; type: string; title: string; status: string; createdAt: string };

export async function loadSupportRequests(): Promise<SupportRequest[]> {
  const response = await mobileApiFetch('/api/support-requests');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load support requests.'));
  const body = await response.json() as { requests?: SupportRequest[] };
  return Array.isArray(body.requests) ? body.requests : [];
}

export async function createSupportRequest(input: { type: string; title: string; description: string; dataSubjectRight?: string }) {
  const response = await mobileApiFetch('/api/support-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to submit the support request.'));
}
