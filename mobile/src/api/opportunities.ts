import { mobileApiFetch } from './client';

export type MobileOpportunitySummary = { id: string; reference: string; category: string; location: string; urgency: string; closingDate: string; requirements: string; isNew: boolean; unlockFeeGbp: number };

export async function loadOpportunities(): Promise<MobileOpportunitySummary[]> {
  const response = await mobileApiFetch('/api/mobile/opportunities');
  if (!response.ok) throw new Error('Unable to load opportunities.');
  const body = await response.json() as { opportunities?: MobileOpportunitySummary[] };
  return Array.isArray(body.opportunities) ? body.opportunities : [];
}