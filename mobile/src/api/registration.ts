import type { CategoryCatalog, CompanyType } from '../constants';
import { publicApiFetch } from './client';
import { mobileApiBaseUrl } from './config';

export type WorkspaceIntent = 'buying' | 'supplying' | 'both';

export type MobileRegistration = {
  email: string;
  password: string;
  contactName: string;
  firstName: string;
  lastName: string;
  contactPhone?: string;
  companyName: string;
  companyType: CompanyType;
  branchIdentifier: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  categories?: string[];
  serviceProvisions?: string[];
  coverageScope?: 'COUNTY' | 'REGION' | 'UK';
  counties?: string[];
  regions?: string[];
};

export async function loadPublishedCatalog(): Promise<CategoryCatalog> {
  const response = await publicApiFetch('/api/categories');
  if (!response.ok) throw new Error('Unable to load the service catalogue.');
  const body = await response.json() as { catalog?: CategoryCatalog };
  if (!body.catalog || typeof body.catalog !== 'object') throw new Error('Unable to load the service catalogue.');
  return body.catalog;
}

export async function registerMobileAccount(input: MobileRegistration) {
  const response = await fetch(`${mobileApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, role: 'USER' }),
  });
  const body = await response.json().catch(() => null) as { status?: string; error?: string } | null;
  if (!response.ok || !body?.status) throw new Error(body?.error ?? 'Unable to create account.');
  return body.status;
}
