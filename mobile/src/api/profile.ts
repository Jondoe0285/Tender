import { mobileApiFetch } from './client';

export type MobileProfile = { firstName: string; lastName: string; email: string; companyName: string | null; tradeTenderId: string | null };

export async function loadMobileProfile(): Promise<MobileProfile> {
  const response = await mobileApiFetch('/api/client/profile');
  if (!response.ok) throw new Error('Unable to load your profile.');
  return response.json() as Promise<MobileProfile>;
}

export type MobileProfileUpdate = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
};

export async function updateMobileProfile(profile: MobileProfileUpdate): Promise<void> {
  const response = await mobileApiFetch('/api/client/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error('Unable to update your profile.');
}