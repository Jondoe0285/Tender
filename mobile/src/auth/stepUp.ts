import { AppState, type AppStateStatus } from 'react-native';
import { promptDeviceAuthentication } from './biometrics';
import { loadBiometricMeta } from './biometricStore';
import type { MobileAuthPolicy } from '../api/auth';

type StepUpRecord = { action: string; at: number };

let lastStepUp: StepUpRecord | null = null;
let backgroundedAt: number | null = null;
let policyCache: MobileAuthPolicy | null = null;
let listening = false;

export function cacheMobileAuthPolicy(policy: MobileAuthPolicy | null) {
  policyCache = policy;
}

export function clearStepUp() {
  lastStepUp = null;
}

function expireStepUpIfNeeded(policy: MobileAuthPolicy | null) {
  if (!lastStepUp || !policy) return;
  if (Date.now() - lastStepUp.at > policy.stepUpValiditySeconds * 1000) lastStepUp = null;
}

export function noteAppState(status: AppStateStatus, policy: MobileAuthPolicy | null) {
  if (status === 'background' || status === 'inactive') {
    backgroundedAt = Date.now();
    return;
  }
  if (status === 'active' && backgroundedAt && policy) {
    const awayMs = Date.now() - backgroundedAt;
    if (awayMs > policy.stepUpValiditySeconds * 1000) lastStepUp = null;
  }
  backgroundedAt = null;
}

export function inactivityRequiresReauth(policy: MobileAuthPolicy | null) {
  if (!policy || policy.inactivityTimeoutSeconds <= 0 || !backgroundedAt) return false;
  return Date.now() - backgroundedAt >= policy.inactivityTimeoutSeconds * 1000;
}

export function startStepUpLifecycle(getPolicy: () => MobileAuthPolicy | null) {
  if (listening) return;
  listening = true;
  AppState.addEventListener('change', (status) => {
    noteAppState(status, getPolicy() ?? policyCache);
  });
}

export async function requireMobileStepUp(action: string, reason: string, policy?: MobileAuthPolicy | null) {
  const activePolicy = policy ?? policyCache;
  if (!activePolicy || !activePolicy.stepUpActions.includes(action)) return;
  expireStepUpIfNeeded(activePolicy);
  if (lastStepUp?.action === action) return;
  const meta = await loadBiometricMeta();
  if (!meta?.enabled && action !== 'biometric-setting') return;
  await reportSecurityEvent('STEP_UP_REQUESTED', meta?.deviceId);
  const result = await promptDeviceAuthentication(reason, { disableDeviceFallback: !activePolicy.deviceCredentialFallback });
  if (result.status !== 'success') {
    await reportSecurityEvent('STEP_UP_FAILED', meta?.deviceId);
    throw new Error(result.message);
  }
  lastStepUp = { action, at: Date.now() };
  await reportSecurityEvent('STEP_UP_SUCCEEDED', meta?.deviceId);
}

async function reportSecurityEvent(action: string, deviceId?: string) {
  try {
    const { reportMobileSecurityEvent } = await import('../api/auth');
    await reportMobileSecurityEvent(action, deviceId);
  } catch {
    return;
  }
}
