import { mobileApiFetch } from './client';

export type MobileTenderCreation = {
  projectName: string;
  category: string;
  subcategory: string;
  item?: string;
  location: string;
  quantity: string;
  urgency: string;
  closingDate: string;
  supplyDate?: string;
  requirements?: string[];
  description: string;
};

export async function createMobileTender(input: MobileTenderCreation): Promise<{ id: string; reference: string }> {
  const response = await mobileApiFetch('/api/tenders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null) as { id?: string; reference?: string; error?: string } | null;
  if (!response.ok || !body?.id || !body.reference) throw new Error(body?.error ?? 'Unable to create tender.');
  return { id: body.id, reference: body.reference };
}