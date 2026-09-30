import { saveMobileSession, type MobileSession } from '../auth/session';
import { replaceBiometricRefreshToken } from '../auth/biometricStore';
import { mobileApiBaseUrl } from './config';

type LoginResponse = {
  accessToken: string;
  expiresIn: number;
  mustChangePassword?: boolean;
  user: { email: string; role: 'SUPER_USER' | 'USER' };
  refreshToken?: string;
  deviceId?: string;
};

function sessionFromLogin(body: LoginResponse): MobileSession {
  return {
    accessToken: body.accessToken,
    expiresAt: Date.now() + body.expiresIn * 1000,
    email: body.user.email,
    role: body.user.role,
    mustChangePassword: body.mustChangePassword === true,
  };
}

export async function refreshWithRefreshToken(refreshToken: string): Promise<MobileSession> {
  const response = await fetch(`${mobileApiBaseUrl()}/api/mobile/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await response.json().catch(() => null) as LoginResponse | { error?: string } | null;
  if (!response.ok || !body || !('accessToken' in body) || !('expiresIn' in body) || !('user' in body)) {
    throw new Error(body && 'error' in body && typeof body.error === 'string' ? body.error : 'Your session has expired. Sign in again.');
  }
  const session = sessionFromLogin(body);
  await saveMobileSession(session, { persistAccessToken: false });
  if (typeof body.refreshToken === 'string' && typeof body.deviceId === 'string') {
    await replaceBiometricRefreshToken(body.refreshToken, body.deviceId, session.email);
  }
  return session;
}
