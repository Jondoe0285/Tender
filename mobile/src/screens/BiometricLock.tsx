import { useEffect, useState } from 'react';
import { Body, Notice, PrimaryButton, SecondaryButton, Title } from '../ui';
import { BIOMETRIC_PRIVACY_COPY, biometricMethodLabel, inspectBiometricAvailability, promptDeviceAuthentication } from '../auth/biometrics';
import { loadBiometricMeta, readBiometricVault, clearBiometricLogin } from '../auth/biometricStore';
import { refreshWithRefreshToken } from '../api/sessionRefresh';
import { reportMobileSecurityEvent } from '../api/auth';
import type { MobileSession } from '../auth/session';

export function BiometricLock({
  onUnlocked,
  onUsePassword,
}: {
  onUnlocked: (session: MobileSession) => void;
  onUsePassword: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('Device authentication');

  useEffect(() => {
    void inspectBiometricAvailability().then((availability) => setMethod(biometricMethodLabel(availability.types)));
  }, []);

  async function unlock() {
    setBusy(true);
    setMessage(null);
    const meta = await loadBiometricMeta();
    await reportMobileSecurityEvent('BIOMETRIC_LOGIN_ATTEMPTED', meta?.deviceId);
    try {
      const availability = await inspectBiometricAvailability();
      setMethod(biometricMethodLabel(availability.types));
      if (!availability.canProtectSecrets) {
        await reportMobileSecurityEvent('BIOMETRIC_CREDENTIAL_UNAVAILABLE', meta?.deviceId);
        setMessage('Biometric login is unavailable on this device. Sign in with email and password.');
        return;
      }
      const prompt = await promptDeviceAuthentication(`Unlock Trade Tender with ${biometricMethodLabel(availability.types)}`);
      if (prompt.status !== 'success') {
        if (prompt.status === 'cancel') await reportMobileSecurityEvent('BIOMETRIC_LOGIN_CANCELLED', meta?.deviceId);
        else if (prompt.status === 'lockout') await reportMobileSecurityEvent('BIOMETRIC_LOCKOUT', meta?.deviceId);
        else await reportMobileSecurityEvent('BIOMETRIC_LOGIN_FAILED', meta?.deviceId);
        setMessage(prompt.message);
        return;
      }
      const vault = await readBiometricVault();
      if (!vault) {
        await clearBiometricLogin();
        await reportMobileSecurityEvent('FULL_REAUTHENTICATION_REQUIRED', meta?.deviceId);
        setMessage('Secure credential unavailable. Sign in with email and password to use biometric login again.');
        return;
      }
      onUnlocked(await refreshWithRefreshToken(vault.refreshToken));
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : 'Unable to unlock with biometrics.';
      if (text.includes('re-enrol') || text.includes('unavailable')) {
        await clearBiometricLogin();
        await reportMobileSecurityEvent('FULL_REAUTHENTICATION_REQUIRED', meta?.deviceId);
      } else {
        await reportMobileSecurityEvent('BIOMETRIC_LOGIN_FAILED', meta?.deviceId);
      }
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Title>Unlock with {method}</Title>
      <Body>Trade Tender will ask this device to confirm it is you. The server then checks that your account is still allowed to use the app.</Body>
      <Body>{BIOMETRIC_PRIVACY_COPY}</Body>
      <Notice>{message}</Notice>
      <PrimaryButton label={`Continue with ${method}`} loading={busy} onPress={() => { void unlock(); }} />
      <SecondaryButton label="Sign in with email and password" onPress={onUsePassword} />
    </>
  );
}
