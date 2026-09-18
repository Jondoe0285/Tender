import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('tender warning issuance is restricted to a currently high-risk tender and uses append-only audit events', () => {
  const service = readFileSync('src/server/domain/tenderWarningService.ts', 'utf8');
  const route = readFileSync('src/app/api/super-user/tenders/[id]/warning/route.ts', 'utf8');
  assert.match(service, /getComplianceOverview\(\)/);
  assert.match(service, /flag\.severity === 'HIGH' && flag\.targetType === 'Tender'/);
  assert.match(service, /tenderWarning\.create/);
  assert.match(service, /TENDER_WARNING_ISSUED/);
  assert.match(route, /rejectCrossOrigin/);
  assert.match(route, /requireFullSuperUser/);
});

test('the third active warning notifies every active Owner and never suspends automatically', () => {
  const service = readFileSync('src/server/domain/tenderWarningService.ts', 'utf8');
  assert.match(service, /activeWarningCount !== 3/);
  assert.match(service, /role: 'SUPER_USER', isOwner: true, suspended: false/);
  assert.match(service, /SUPPORT_RECIPIENT/);
  assert.match(service, /reviewPath: `\/super-user\/users\/\$\{encodeURIComponent\(tender\.clientId\)\}`/);
  assert.doesNotMatch(service, /suspended:\s*true/);
});

test('review rendering rechecks high-risk eligibility and profiles scope warnings to the signed-in recipient', () => {
  const review = readFileSync('src/app/super-user/tenders/[id]/page.tsx', 'utf8');
  const profileApi = readFileSync('src/app/api/client/profile/route.ts', 'utf8');
  assert.match(review, /flag\.severity === 'HIGH' && flag\.targetType === 'Tender' && flag\.targetId === id/);
  assert.match(review, /if \(!highRisk\) notFound\(\)/);
  assert.doesNotMatch(review, /attachments:|messages:|payments:|releases:/);
  assert.match(profileApi, /where: \{ recipientId: user\.id, active: true \}/);
});