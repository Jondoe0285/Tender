import { getPlatformSetting } from '@/server/domain/platformSettings';
import { DEFAULT_MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS } from '@/server/auth/mobileToken';

export const MOBILE_BIOMETRIC_POLICIES = ['disabled', 'optional', 'recommended', 'required'] as const;
export type MobileBiometricLoginPolicy = (typeof MOBILE_BIOMETRIC_POLICIES)[number];

export const DEFAULT_MOBILE_STEP_UP_ACTIONS = [
  'profile-update',
  'password-change',
  'biometric-setting',
  'additional-user',
  'tender-unlock',
  'quote-accept',
  'contact-release',
  'direct-contact',
  'professional-interest',
  'data-export',
] as const;

export type MobileAuthPolicy = {
  biometricLoginPolicy: MobileBiometricLoginPolicy;
  deviceCredentialFallback: boolean;
  stepUpValiditySeconds: number;
  deviceMaxAgeDays: number;
  refreshTokenLifetimeSeconds: number;
  accessTokenLifetimeSeconds: number;
  inactivityTimeoutSeconds: number;
  stepUpActions: string[];
};

function integerSetting(value: string | null, fallback: number, minimum = 0) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

function parseStepUpActions(value: string | null) {
  if (!value) return [...DEFAULT_MOBILE_STEP_UP_ACTIONS];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string' || !item.trim())) {
      return [...DEFAULT_MOBILE_STEP_UP_ACTIONS];
    }
    return parsed.map((item) => item.trim());
  } catch {
    return [...DEFAULT_MOBILE_STEP_UP_ACTIONS];
  }
}

export async function getMobileAuthPolicy(): Promise<MobileAuthPolicy> {
  const [
    biometricLoginPolicy,
    deviceCredentialFallback,
    stepUpValiditySeconds,
    deviceMaxAgeDays,
    refreshTokenLifetimeSeconds,
    accessTokenLifetimeSeconds,
    inactivityTimeoutSeconds,
    stepUpActions,
  ] = await Promise.all([
    getPlatformSetting('MOBILE_BIOMETRIC_LOGIN_POLICY'),
    getPlatformSetting('MOBILE_DEVICE_CREDENTIAL_FALLBACK'),
    getPlatformSetting('MOBILE_STEP_UP_VALIDITY_SECONDS'),
    getPlatformSetting('MOBILE_DEVICE_MAX_AGE_DAYS'),
    getPlatformSetting('MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS'),
    getPlatformSetting('MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS'),
    getPlatformSetting('MOBILE_INACTIVITY_TIMEOUT_SECONDS'),
    getPlatformSetting('MOBILE_STEP_UP_ACTIONS'),
  ]);

  const policy = MOBILE_BIOMETRIC_POLICIES.includes(biometricLoginPolicy as MobileBiometricLoginPolicy)
    ? biometricLoginPolicy as MobileBiometricLoginPolicy
    : 'optional';

  return {
    biometricLoginPolicy: policy,
    deviceCredentialFallback: deviceCredentialFallback !== 'false',
    stepUpValiditySeconds: integerSetting(stepUpValiditySeconds, 120, 1),
    deviceMaxAgeDays: integerSetting(deviceMaxAgeDays, 90, 1),
    refreshTokenLifetimeSeconds: integerSetting(refreshTokenLifetimeSeconds, 7_776_000, 60),
    accessTokenLifetimeSeconds: integerSetting(accessTokenLifetimeSeconds, DEFAULT_MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS, 60),
    inactivityTimeoutSeconds: integerSetting(inactivityTimeoutSeconds, 0, 0),
    stepUpActions: parseStepUpActions(stepUpActions),
  };
}

export function publicMobileAuthPolicy(policy: MobileAuthPolicy) {
  return {
    biometricLoginPolicy: policy.biometricLoginPolicy,
    deviceCredentialFallback: policy.deviceCredentialFallback,
    stepUpValiditySeconds: policy.stepUpValiditySeconds,
    inactivityTimeoutSeconds: policy.inactivityTimeoutSeconds,
    accessTokenLifetimeSeconds: policy.accessTokenLifetimeSeconds,
    stepUpActions: policy.stepUpActions,
  };
}
