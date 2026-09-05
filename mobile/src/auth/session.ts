import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mobile-session';

export type MobileSession = {
  accessToken: string;
  expiresAt: number;
  email: string;
  role: 'SUPER_USER' | 'USER';
};

export async function saveMobileSession(session: MobileSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadMobileSession(): Promise<MobileSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<MobileSession>;
    if (typeof session.accessToken !== 'string' || typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now() || typeof session.email !== 'string' || (session.role !== 'SUPER_USER' && session.role !== 'USER')) {
      await clearMobileSession();
      return null;
    }
    return session as MobileSession;
  } catch {
    await clearMobileSession();
    return null;
  }
}

export function clearMobileSession() {
  return SecureStore.deleteItemAsync(SESSION_KEY);
}