import * as SecureStore from 'expo-secure-store';
import { loadBiometricMeta } from './biometricStore';

const SESSION_KEY = 'mobile-session';

export type MobileSession = {
  accessToken: string;
  expiresAt: number;
  email: string;
  role: 'SUPER_USER' | 'USER';
  mustChangePassword?: boolean;
};

let memorySession: MobileSession | null = null;

function validSession(session: Partial<MobileSession> | null | undefined): session is MobileSession {
  return Boolean(
    session
    && typeof session.accessToken === 'string'
    && typeof session.expiresAt === 'number'
    && session.expiresAt > Date.now()
    && typeof session.email === 'string'
    && (session.role === 'SUPER_USER' || session.role === 'USER'),
  );
}

export function getCachedMobileSession(): MobileSession | null {
  return validSession(memorySession) ? memorySession : null;
}

export async function saveMobileSession(session: MobileSession, options?: { persistAccessToken?: boolean }) {
  memorySession = session;
  const persistAccessToken = options?.persistAccessToken ?? !(await loadBiometricMeta())?.enabled;
  if (!persistAccessToken) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadMobileSession(): Promise<MobileSession | null> {
  if (validSession(memorySession)) return memorySession;
  if ((await loadBiometricMeta())?.enabled) return null;
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<MobileSession>;
    if (!validSession(session)) {
      await clearMobileSession();
      return null;
    }
    memorySession = {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      email: session.email,
      role: session.role,
      mustChangePassword: session.mustChangePassword === true,
    };
    return memorySession;
  } catch {
    await clearMobileSession();
    return null;
  }
}

export async function clearMobileSession() {
  memorySession = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
