import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('native package declares Android and iOS app identities with secure storage', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')) as { expo: { ios: { bundleIdentifier: string }; android: { package: string }; plugins: Array<string | [string, unknown]> } };
  const pluginNames = app.expo.plugins.map((plugin) => typeof plugin === 'string' ? plugin : plugin[0]);

  assert.equal(app.expo.ios.bundleIdentifier, app.expo.android.package);
  assert.equal(pluginNames.includes('expo-secure-store'), true);
});

test('native API clients use HTTPS and secure bearer sessions', () => {
  const client = readFileSync('src/api/client.ts', 'utf8');
  const auth = readFileSync('src/api/auth.ts', 'utf8');
  const config = readFileSync('src/api/config.ts', 'utf8');

  assert.match(config, /startsWith\('https:\/\/'\)/);
  assert.match(config, /10\\\.0\\\.2\\\.2/);
  assert.match(client, /Authorization',\s*`Bearer \$\{session\.accessToken\}`/);
  assert.match(auth, /saveMobileSession/);
});

test('store profiles ship an AAB and App Store binary against production, not the staging APK', () => {
  const eas = JSON.parse(readFileSync('eas.json', 'utf8')) as {
    cli: { appVersionSource: string; metadataPath: string };
    build: {
      preview: { android: { buildType: string }; env: { EXPO_PUBLIC_API_URL: string } };
      production: { distribution: string; android: { buildType: string }; env: { EXPO_PUBLIC_API_URL: string } };
    };
    submit: { production: { android: { track: string; releaseStatus: string; serviceAccountKeyPath: string } } };
  };
  const app = JSON.parse(readFileSync('app.json', 'utf8')) as {
    expo: {
      updates?: { enabled?: boolean };
      ios: { config?: { usesNonExemptEncryption?: boolean } };
      extra?: { privacyPolicyUrl?: string };
    };
  };
  const store = JSON.parse(readFileSync('store.config.json', 'utf8')) as {
    apple: { info: { 'en-GB': { title: string; keywords: string; privacyPolicyUrl: string } } };
  };
  const play = JSON.parse(readFileSync('store/play-en-GB.json', 'utf8')) as { title: string; privacyPolicyUrl: string };
  const ignore = readFileSync('.gitignore', 'utf8');
  const keywords = store.apple.info['en-GB'].keywords;

  assert.equal(eas.cli.appVersionSource, 'remote');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_API_URL, 'https://tender-m0xw.onrender.com');
  assert.equal(eas.build.production.distribution, 'store');
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_API_URL, 'https://trade-tender.onrender.com');
  assert.equal(eas.submit.production.android.track, 'internal');
  assert.equal(eas.submit.production.android.releaseStatus, 'draft');
  assert.equal(eas.submit.production.android.serviceAccountKeyPath, './google-service-account.json');
  assert.equal(app.expo.updates?.enabled, false);
  assert.equal(app.expo.ios.config?.usesNonExemptEncryption, false);
  assert.equal(app.expo.extra?.privacyPolicyUrl, 'https://trade-tender.onrender.com/policies/privacy');
  assert.equal(store.apple.info['en-GB'].title, 'Trade Tender');
  assert.equal(store.apple.info['en-GB'].privacyPolicyUrl, play.privacyPolicyUrl);
  assert.equal(keywords.includes(' '), false);
  assert.ok(keywords.length <= 100);
  assert.match(ignore, /google-service-account\.json/);
});