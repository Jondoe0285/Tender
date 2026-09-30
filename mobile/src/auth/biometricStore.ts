import * as SecureStore from 'expo-secure-store';

const META_KEY = 'mobile-biometric-meta';
const VAULT_KEY = 'mobile-biometric-vault';

export type BiometricMeta = {
  enabled: boolean;
  deviceId: string;
  email: string;
};

type BiometricVault = {
  refreshToken: string;
  deviceId: string;
};

const biometricProtect: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  requireAuthentication: true,
  authenticationPrompt: 'Unlock Trade Tender',
};

function parseMeta(stored: string | null): BiometricMeta | null {
  if (!stored) return null;
  try {
    const meta = JSON.parse(stored) as Partial<BiometricMeta>;
    if (meta.enabled !== true || typeof meta.deviceId !== 'string' || typeof meta.email !== 'string') return null;
    return { enabled: true, deviceId: meta.deviceId, email: meta.email };
  } catch {
    return null;
  }
}

export async function loadBiometricMeta(): Promise<BiometricMeta | null> {
  return parseMeta(await SecureStore.getItemAsync(META_KEY));
}

export async function saveBiometricVault(input: { email: string; deviceId: string; refreshToken: string }) {
  if (!SecureStore.canUseBiometricAuthentication()) {
    throw new Error('This device cannot protect biometric login credentials.');
  }
  await SecureStore.setItemAsync(VAULT_KEY, JSON.stringify({ refreshToken: input.refreshToken, deviceId: input.deviceId } satisfies BiometricVault), biometricProtect);
  await SecureStore.setItemAsync(META_KEY, JSON.stringify({ enabled: true, deviceId: input.deviceId, email: input.email } satisfies BiometricMeta), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readBiometricVault(): Promise<BiometricVault | null> {
  try {
    const stored = await SecureStore.getItemAsync(VAULT_KEY, biometricProtect);
    if (!stored) return null;
    const vault = JSON.parse(stored) as Partial<BiometricVault>;
    if (typeof vault.refreshToken !== 'string' || typeof vault.deviceId !== 'string') return null;
    return { refreshToken: vault.refreshToken, deviceId: vault.deviceId };
  } catch {
    throw Object.assign(new Error('Biometric settings changed or the secure credential is unavailable. Sign in with email and password.'), { code: 'reenrol' });
  }
}

export async function replaceBiometricRefreshToken(refreshToken: string, deviceId: string, email: string) {
  await saveBiometricVault({ refreshToken, deviceId, email });
}

export async function clearBiometricLogin() {
  await Promise.all([
    SecureStore.deleteItemAsync(VAULT_KEY),
    SecureStore.deleteItemAsync(META_KEY),
  ]);
}
