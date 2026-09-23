import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  datetimeLocalToIso,
  formatLaunchDate,
  isPreLaunchActive,
  remainingParts,
  toDatetimeLocalInput,
} from '../../src/lib/public-launch';

test('pre-launch is only active before a valid future launch instant', () => {
  const now = Date.parse('2026-09-23T18:00:00.000Z');
  assert.equal(isPreLaunchActive(null, now), false);
  assert.equal(isPreLaunchActive('', now), false);
  assert.equal(isPreLaunchActive('not-a-date', now), false);
  assert.equal(isPreLaunchActive('2026-09-23T17:59:59.000Z', now), false);
  assert.equal(isPreLaunchActive('2026-09-23T18:00:00.000Z', now), false);
  assert.equal(isPreLaunchActive('2026-09-23T18:00:01.000Z', now), true);
});

test('countdown remaining parts reach zero at launch', () => {
  const launch = Date.parse('2026-09-24T00:00:00.000Z');
  assert.deepEqual(remainingParts(launch, Date.parse('2026-09-23T00:00:00.000Z')), {
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    done: false,
  });
  assert.equal(remainingParts(launch, launch).done, true);
  assert.equal(remainingParts(launch, launch + 1_000).done, true);
});

test('datetime-local values round-trip to the same instant', () => {
  const iso = '2026-10-01T08:00:00.000Z';
  const local = toDatetimeLocalInput(iso);
  assert.ok(local);
  assert.equal(Date.parse(datetimeLocalToIso(local)!), Date.parse(iso));
  assert.equal(datetimeLocalToIso(''), null);
});

test('launch copy uses UK time', () => {
  assert.match(formatLaunchDate('2026-10-01T08:00:00.000Z'), /1 October 2026/);
  assert.match(formatLaunchDate('2026-10-01T08:00:00.000Z'), /09:00/);
});

test('Owner sets launch time and the home page switches on that instant', () => {
  const settings = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const route = readFileSync('src/app/api/super-user/settings/route.ts', 'utf8');
  const ownerPanel = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');
  const home = readFileSync('src/app/page.tsx', 'utf8');
  const prelaunch = readFileSync('src/components/layout/PreLaunchLanding.tsx', 'utf8');
  const live = readFileSync('src/components/layout/MarketplaceLanding.tsx', 'utf8');

  assert.match(settings, /PUBLIC_LAUNCH_AT: ''/);
  assert.match(settings, /export async function getPublicLaunchAt/);
  assert.match(route, /'public-launch'/);
  assert.match(route, /PUBLIC_LAUNCH_AT/);
  assert.match(ownerPanel, /Public launch/);
  assert.match(ownerPanel, /datetime-local/);
  assert.match(ownerPanel, /Go live now/);
  assert.match(ownerPanel, /action: 'public-launch'/);
  assert.match(home, /isPreLaunchActive/);
  assert.match(home, /PreLaunchLanding/);
  assert.match(home, /MarketplaceLanding/);
  assert.match(home, /force-dynamic/);
  assert.match(prelaunch, /Register now/);
  assert.doesNotMatch(prelaunch, /\/login/);
  assert.doesNotMatch(prelaunch, /\/demo/);
  assert.doesNotMatch(prelaunch, /Sign in/);
  assert.match(live, /href="\/login"/);
  assert.match(live, /Sign in/);
});
