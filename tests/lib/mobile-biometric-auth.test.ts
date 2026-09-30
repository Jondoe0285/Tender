import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/server/data/prisma';
import { hashMobileRefreshToken, refreshMobileDeviceSession, registerBiometricDevice, revokeMobileDevice } from '../../src/server/auth/mobileDevice';
import { restorePlatformSetting } from './restore-platform-setting';
import { ForbiddenError, UnauthorizedError } from '../../src/server/auth/session';

test('mobile biometric policy defaults are optional and do not store secrets in settings', () => {
  const settings = readFileSync(path.join(process.cwd(), 'src/server/domain/platformSettings.ts'), 'utf8');
  assert.match(settings, /MOBILE_BIOMETRIC_LOGIN_POLICY: 'optional'/);
  assert.match(settings, /MOBILE_DEVICE_CREDENTIAL_FALLBACK: 'true'/);
  assert.match(settings, /MOBILE_STEP_UP_VALIDITY_SECONDS: '120'/);
  assert.match(settings, /tender-unlock/);
  assert.match(settings, /contact-release/);
});

test('mobile login maps MFA errors and does not issue tokens to Super Users', () => {
  const login = readFileSync(path.join(process.cwd(), 'src/app/api/mobile/auth/login/route.ts'), 'utf8');
  assert.match(login, /MFA_REQUIRED/);
  assert.match(login, /MFA_INVALID/);
  assert.match(login, /role !== 'USER'/);
  assert.match(readFileSync(path.join(process.cwd(), 'src/app/api/mobile/auth/refresh/route.ts'), 'utf8'), /refreshMobileDeviceSession/);
});

test('audit and device routes never log refresh tokens or biometric data', () => {
  const device = readFileSync(path.join(process.cwd(), 'src/server/auth/mobileDevice.ts'), 'utf8');
  assert.match(device, /MOBILE_BIOMETRIC_ENABLED/);
  assert.match(device, /MOBILE_TOKEN_REFRESH_REJECTED/);
  assert.doesNotMatch(device, /metadata:.*refreshToken/);
  assert.doesNotMatch(device, /fingerprint|faceImage|biometricTemplate/);
});

test('a biometric device can refresh until the session version changes or the device is revoked', async (context) => {
  const previousSecret = process.env.MOBILE_AUTH_SECRET;
  process.env.MOBILE_AUTH_SECRET = 'a'.repeat(32);
  const suffix = randomUUID();
  let userId: string | undefined;
  const originalPolicy = await prisma.platformSetting.findUnique({ where: { key: 'MOBILE_BIOMETRIC_LOGIN_POLICY' } });

  context.after(async () => {
    if (userId) {
      await prisma.mobileDevice.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await restorePlatformSetting('MOBILE_BIOMETRIC_LOGIN_POLICY', originalPolicy);
    process.env.MOBILE_AUTH_SECRET = previousSecret;
  });

  const user = await prisma.user.create({
    data: {
      email: `biometric-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'USER',
      contactName: 'Biometric User',
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;

  const registered = await registerBiometricDevice(user.id, 'ios');
  assert.equal(typeof registered.refreshToken, 'string');
  assert.notEqual(registered.refreshToken.length, 0);

  const first = await refreshMobileDeviceSession(registered.refreshToken);
  assert.equal(first.user.email, user.email);
  assert.equal(first.user.role, 'USER');
  assert.equal(typeof first.accessToken, 'string');
  assert.notEqual(first.refreshToken, registered.refreshToken);
  await assert.rejects(() => refreshMobileDeviceSession(registered.refreshToken), UnauthorizedError);

  const audits = await prisma.auditLog.findMany({ where: { targetId: registered.deviceId }, orderBy: { createdAt: 'asc' } });
  assert.ok(audits.some((row) => row.action === 'MOBILE_DEVICE_REGISTERED'));
  assert.ok(audits.some((row) => row.action === 'MOBILE_BIOMETRIC_LOGIN_SUCCEEDED'));
  assert.ok(audits.every((row) => !row.metadata || !row.metadata.includes(registered.refreshToken)));
  assert.ok(audits.every((row) => !row.metadata || !row.metadata.includes(first.refreshToken ?? 'no-token')));

  await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  await assert.rejects(() => refreshMobileDeviceSession(first.refreshToken!), UnauthorizedError);

  const second = await registerBiometricDevice(user.id, 'android');
  await revokeMobileDevice({ actorId: user.id, deviceId: second.deviceId, reason: 'disabled' });
  await assert.rejects(() => refreshMobileDeviceSession(second.refreshToken), UnauthorizedError);

  await prisma.platformSetting.upsert({
    where: { key: 'MOBILE_BIOMETRIC_LOGIN_POLICY' },
    update: { value: 'disabled' },
    create: { key: 'MOBILE_BIOMETRIC_LOGIN_POLICY', value: 'disabled' },
  });
  await assert.rejects(() => registerBiometricDevice(user.id, 'ios'), ForbiddenError);
});

test('refresh token hashes are not reversible from the stored value', () => {
  const token = 'example-refresh-token';
  const hashed = hashMobileRefreshToken(token);
  assert.equal(hashed, hashMobileRefreshToken(token));
  assert.notEqual(hashed, token);
  assert.match(hashed, /^[a-f0-9]{64}$/);
});
