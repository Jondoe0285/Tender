import { saveMobileSession, type MobileSession } from '../auth/session';
import { mobileApiBaseUrl } from './config';

type LoginResponse = {
  accessToken: string;
  expiresIn: number;
  user: { email: string; role: 'SUPER_USER' | 'USER' };
};

export async function signInWithPassword(email: string, password: string): Promise<MobileSession> {
  const response = await fetch(`${mobileApiBaseUrl()}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null) as LoginResponse | { error?: string } | null;
  if (!response.ok || !body || !('accessToken' in body) || !('expiresIn' in body) || !('user' in body)) {
    throw new Error(body && 'error' in body && typeof body.error === 'string' ? body.error : 'Unable to sign in.');
  }
  const session: MobileSession = {
    accessToken: body.accessToken,
    expiresAt: Date.now() + body.expiresIn * 1000,
    email: body.user.email,
    role: body.user.role,
  };
  await saveMobileSession(session);
  return session;
}