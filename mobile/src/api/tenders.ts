import { mobileApiFetch } from './client';

export type MobileTenderSummary = { id: string; reference: string; status: string; closingDate: string; location: string };

export type MobileTenderDetail = {
  tender: Record<string, unknown>;
  unlocked: boolean;
};

export async function loadMyTenders(): Promise<MobileTenderSummary[]> {
  const response = await mobileApiFetch('/api/tenders');
  if (!response.ok) throw new Error('Unable to load tenders.');
  const body = await response.json() as { tenders?: MobileTenderSummary[] };
  return Array.isArray(body.tenders) ? body.tenders : [];
}

export async function loadTenderDetail(tenderId: string): Promise<MobileTenderDetail> {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}`);
  if (!response.ok) throw new Error('Unable to load tender details.');
  const body = await response.json() as Partial<MobileTenderDetail>;
  if (!body.tender || typeof body.unlocked !== 'boolean') throw new Error('Invalid tender response.');
  return { tender: body.tender, unlocked: body.unlocked };
}