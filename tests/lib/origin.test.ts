import assert from 'node:assert/strict';
import test from 'node:test';
import { isSameOriginRequest } from '../../src/server/http/origin';
import { workspaceForRole } from '../../src/lib/navigation';

test('accepts a same-origin browser request', () => {
  const request = new Request('https://app.example/api/tenders', {
    headers: { origin: 'https://app.example' },
  });
  assert.equal(isSameOriginRequest(request), true);
});

test('rejects a cross-origin browser request', () => {
  const request = new Request('https://app.example/api/tenders', {
    headers: { origin: 'https://malicious.example' },
  });
  assert.equal(isSameOriginRequest(request), false);
});

test('maps only approved roles to workspaces', () => {
  assert.equal(workspaceForRole('CLIENT'), '/client');
  assert.equal(workspaceForRole('RETAILER'), '/retailer');
  assert.equal(workspaceForRole('SUPER_USER'), '/super-user');
  assert.equal(workspaceForRole('UNKNOWN'), null);
});
