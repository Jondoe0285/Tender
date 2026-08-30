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

test('accepts a request through a trusted proxy', () => {
  const request = new Request('https://preview.example/api/tenders', {
    headers: {
      origin: 'https://preview.example',
      'x-forwarded-host': 'preview.example',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(isSameOriginRequest(request), true);
});

test('accepts the direct local origin when a development proxy adds forwarded headers', () => {
  const request = new Request('http://localhost:3000/api/tenders', {
    headers: {
      origin: 'http://localhost:3000',
      'x-forwarded-host': 'preview.example',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(isSameOriginRequest(request), true);
});

test('rejects a local origin through a proxy in production', () => {
  const previousNodeEnvironment = process.env.NODE_ENV;
  const previousApplicationUrl = process.env.NEXTAUTH_URL;
  process.env.NODE_ENV = 'production';
  delete process.env.NEXTAUTH_URL;
  try {
    const request = new Request('https://preview.example/api/tenders', {
      headers: {
        origin: 'http://localhost:3000',
        'x-forwarded-host': 'preview.example',
        'x-forwarded-proto': 'https',
      },
    });
    assert.equal(isSameOriginRequest(request), false);
  } finally {
    process.env.NODE_ENV = previousNodeEnvironment;
    if (previousApplicationUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = previousApplicationUrl;
    }
  }
});

test('accepts the configured application origin through a development proxy', () => {
  const previousApplicationUrl = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = 'https://preview.example';
  const request = new Request('http://localhost:3000/api/tenders', {
    headers: { origin: 'https://preview.example' },
  });
  assert.equal(isSameOriginRequest(request), true);
  process.env.NEXTAUTH_URL = previousApplicationUrl;
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
