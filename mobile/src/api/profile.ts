import { mobileApiFetch, readErrorMessage } from './client';

export type MobileProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string | null;
  companyType: string;
  branchIdentifier: string | null;
  services: string[];
  serviceProvisions: string[];
  operatingLocations: string[];
  releaseSpendCapGbp: number | null;
  tradeTenderId: string | null;
  isPrimaryUser: boolean;
  verificationStatus: string | null;
  additionalUsers: Array<{ id: string; duties: string; user: { firstName: string | null; lastName: string | null; contactName: string; email: string } }>;
  warnings: Array<{ id: string; reason: string; note: string; createdAt: string; tenderReference: string }>;
};

export async function loadMobileProfile(): Promise<MobileProfile> {
  const response = await mobileApiFetch('/api/client/profile');
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to load your profile.'));
  return response.json() as Promise<MobileProfile>;
}

export type MobileProfileUpdate = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  companyName?: string;
  branchIdentifier?: string;
  companyType?: string;
  services?: string[];
  serviceProvisions?: string[];
  operatingLocations?: string[];
  releaseSpendCapGbp?: number | null;
};

export async function updateMobileProfile(profile: MobileProfileUpdate): Promise<void> {
  const response = await mobileApiFetch('/api/client/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to update your profile.'));
}

export async function changeMobilePassword(currentPassword: string, newPassword: string) {
  const response = await mobileApiFetch('/api/client/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to update your password.'));
}

export async function addAdditionalUser(input: { firstName: string; lastName: string; email: string; password: string; orgRole?: string }) {
  const response = await mobileApiFetch('/api/client/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Unable to add the additional user.'));
}
