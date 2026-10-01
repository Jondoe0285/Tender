import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAvailability = {
  hardware: boolean;
  enrolled: boolean;
  canProtectSecrets: boolean;
  enrolledLevel: LocalAuthentication.SecurityLevel;
  types: LocalAuthentication.AuthenticationType[];
  deviceCredentialFallbackAllowed: boolean;
};

export type BiometricPromptResult =
  | { status: 'success' }
  | { status: 'cancel' | 'failed' | 'lockout' | 'unavailable' | 'not-enrolled' | 'changed'; message: string };

export const BIOMETRIC_PRIVACY_COPY = 'The application does not collect, store or process your fingerprint, facial image or biometric template. Biometric verification is performed by your device’s operating system. The application receives only the authentication result required to provide the biometric-login feature.';

export const BIOMETRIC_ENROLMENT_COPY = [
  'Biometric login lets you unlock Trade Tender on this device after you have signed in with your account.',
  'Verification is performed by this device. Trade Tender never receives or stores fingerprint, face, or other biometric data.',
  'You can turn this off in Profile. Email and password sign-in stays available.',
].join(' ');

export function biometricMethodLabel(types: LocalAuthentication.AuthenticationType[], platform: typeof Platform.OS = Platform.OS) {
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const fingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (platform === 'ios') {
    if (face) return 'Face ID';
    if (fingerprint) return 'Touch ID';
    return 'Device authentication';
  }
  if (fingerprint && face) return 'Fingerprint or face authentication';
  if (face) return 'Face authentication';
  if (fingerprint) return 'Fingerprint';
  return 'Device authentication';
}

export function settingStatusLabel(status: 'available' | 'unavailable' | 'enabled' | 'disabled' | 'locked' | 'reenrol') {
  switch (status) {
    case 'available':
      return 'Available';
    case 'unavailable':
      return 'Unavailable';
    case 'enabled':
      return 'Enabled';
    case 'disabled':
      return 'Disabled';
    case 'locked':
      return 'Temporarily locked';
    case 'reenrol':
      return 'Requiring re-enrolment';
  }
}

export function messageForLocalAuthError(error?: string) {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return { status: 'cancel' as const, message: 'Authentication was cancelled. You can use email and password.' };
    case 'lockout':
      return { status: 'lockout' as const, message: 'Biometric authentication is temporarily locked. Use email and password, or try again later.' };
    case 'not_enrolled':
      return { status: 'not-enrolled' as const, message: 'No biometrics are enrolled on this device. Enrol Face ID, Touch ID, fingerprint, or a device passcode in system settings.' };
    case 'not_available':
    case 'passcode_not_set':
      return { status: 'unavailable' as const, message: 'This device does not support biometric login.' };
    case 'user_fallback':
      return { status: 'failed' as const, message: 'Device authentication was not completed. You can use email and password.' };
    case 'authentication_failed':
      return { status: 'failed' as const, message: 'Authentication did not match. Try again, or sign in with email and password.' };
    default:
      return { status: 'failed' as const, message: 'Unable to verify this device. Sign in with email and password.' };
  }
}

export async function inspectBiometricAvailability(): Promise<BiometricAvailability> {
  const [hardware, enrolled, types, enrolledLevel] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  return {
    hardware,
    enrolled,
    canProtectSecrets: hardware && enrolled,
    enrolledLevel,
    types,
    deviceCredentialFallbackAllowed: enrolledLevel >= LocalAuthentication.SecurityLevel.SECRET,
  };
}

export async function promptDeviceAuthentication(promptMessage: string, options?: { disableDeviceFallback?: boolean }): Promise<BiometricPromptResult> {
  const availability = await inspectBiometricAvailability();
  if (!availability.hardware) return { status: 'unavailable', message: 'This device does not support biometric login.' };
  if (!availability.enrolled && !availability.deviceCredentialFallbackAllowed) {
    return { status: 'not-enrolled', message: 'No biometrics are enrolled on this device. Enrol Face ID, Touch ID, fingerprint, or a device passcode in system settings.' };
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptDescription: BIOMETRIC_PRIVACY_COPY,
    cancelLabel: 'Use password',
    fallbackLabel: 'Use device passcode',
    disableDeviceFallback: options?.disableDeviceFallback === true,
    biometricsSecurityLevel: 'strong',
    requireConfirmation: false,
  });
  if (result.success) return { status: 'success' };
  return messageForLocalAuthError(result.error);
}
