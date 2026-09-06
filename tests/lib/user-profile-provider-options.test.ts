import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('provider options are managed in protected Super User account profiles, not Site Settings', () => {
  const profile = readFileSync('src/components/admin/UserAnalyticsProfileView.tsx', 'utf8');
  const settings = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');

  assert.match(profile, /Provider options/);
  assert.match(profile, /\/api\/super-user\/retailers\/\$\{profile\.id\}\/entitlements/);
  assert.doesNotMatch(settings, /Apply options to Providers/);
});