import { clearMobileSession, loadMobileSession } from '../auth/session';
import { mobileApiBaseUrl } from './config';

export async function mobileApiFetch(path: string, init: RequestInit = {}) {
  const session = await loadMobileSession();
  if (!session) throw new Error('Sign in is required.');
  const response = await fetch(`${mobileApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` },
  });
  if (response.status === 401) {
    await clearMobileSession();
    throw new Error('Your session has expired. Sign in again.');
  }
  return response;
}

export async function revokeMobileSession() {
  try {
    await mobileApiFetch('/api/mobile/auth/logout', { method: 'POST' });
  } finally {
    await clearMobileSession();
  }
}