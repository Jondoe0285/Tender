import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('native package declares Android and iOS app identities with secure storage', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')) as { expo: { ios: { bundleIdentifier: string }; android: { package: string }; plugins: string[] } };

  assert.equal(app.expo.ios.bundleIdentifier, app.expo.android.package);
  assert.equal(app.expo.plugins.includes('expo-secure-store'), true);
});

test('native API clients use HTTPS and secure bearer sessions', () => {
  const client = readFileSync('src/api/client.ts', 'utf8');
  const auth = readFileSync('src/api/auth.ts', 'utf8');
  const config = readFileSync('src/api/config.ts', 'utf8');

  assert.match(config, /startsWith\('https:\/\/'\)/);
  assert.match(config, /10\\\.0\\\.2\\\.2/);
  assert.match(client, /Authorization: `Bearer \$\{session\.accessToken\}`/);
  assert.match(auth, /saveMobileSession/);
});