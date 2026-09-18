type MobileRegistration = {
  email: string;
  password: string;
  contactName: string;
  firstName: string;
  lastName: string;
  companyName: string;
  termsAccepted: boolean;
  branchIdentifier?: string;
};
import { mobileApiBaseUrl } from './config';

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