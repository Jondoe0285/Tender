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

test('rejects a malformed referer instead of throwing', () => {
  const request = new Request('https://app.example/api/tenders', {
    headers: { referer: 'not a url' },
  });
  assert.equal(isSameOriginRequest(request), false);
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
  // Pinned so the assertion cannot be masked by an ambient NEXTAUTH_URL that is itself localhost.
  process.env.NEXTAUTH_URL = 'https://app.example';
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

test('accepts a configured additional origin such as a custom domain', () => {
  const previousAdditionalOrigins = process.env.ADDITIONAL_ALLOWED_ORIGINS;
  process.env.ADDITIONAL_ALLOWED_ORIGINS = 'https://custom.example';
  const request = new Request('https://app.example/api/tenders', {
    headers: { origin: 'https://custom.example' },
  });
  assert.equal(isSameOriginRequest(request), true);
  process.env.ADDITIONAL_ALLOWED_ORIGINS = previousAdditionalOrigins;
});

test('still rejects an unlisted origin when additional origins are configured', () => {
  const previousAdditionalOrigins = process.env.ADDITIONAL_ALLOWED_ORIGINS;
  process.env.ADDITIONAL_ALLOWED_ORIGINS = 'https://custom.example';
  const request = new Request('https://app.example/api/tenders', {
    headers: { origin: 'https://malicious.example' },
  });
  assert.equal(isSameOriginRequest(request), false);
  process.env.ADDITIONAL_ALLOWED_ORIGINS = previousAdditionalOrigins;
});

test('maps only approved roles to workspaces', () => {
  assert.equal(workspaceForRole('USER'), '/user');
  assert.equal(workspaceForRole('SUPER_USER'), '/super-user');
  assert.equal(workspaceForRole('UNKNOWN'), null);
});
