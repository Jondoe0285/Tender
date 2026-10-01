import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { additionalAllowedOrigins, appUrl, getAppUrl, publicOriginFromHeaders, requestAppUrl } from '../../src/server/config/appUrl';
import { inAppRedirect } from '../../src/server/http/inAppRedirect';

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('resolves the application origin from configuration', () => {
  withEnvironment({ NEXTAUTH_URL: 'https://app.example' }, () => {
    assert.equal(getAppUrl(), 'https://app.example');
  });
});

test('refuses to guess an origin when configuration is missing', () => {
  withEnvironment({ NEXTAUTH_URL: undefined }, () => {
    assert.throws(() => getAppUrl(), /NEXTAUTH_URL is not configured/);
  });
});

test('rejects an application origin that is not an absolute http url', () => {
  withEnvironment({ NEXTAUTH_URL: 'app.example' }, () => {
    assert.throws(() => getAppUrl(), /absolute http\(s\) URL/);
  });
});

test('builds absolute links against the configured origin', () => {
  withEnvironment({ NEXTAUTH_URL: 'https://app.example' }, () => {
    assert.equal(appUrl('/super-user'), 'https://app.example/super-user');
    assert.equal(appUrl('/api/auth/verify-email?token=abc'), 'https://app.example/api/auth/verify-email?token=abc');
  });
});

test('refuses a path that would redirect off the configured origin', () => {
  withEnvironment({ NEXTAUTH_URL: 'https://app.example' }, () => {
    assert.throws(() => appUrl('//malicious.example'), /root-relative path/);
    assert.throws(() => appUrl('https://malicious.example'), /root-relative path/);
  });
});

test('reads additional allowed origins as a comma-separated list', () => {
  withEnvironment({ ADDITIONAL_ALLOWED_ORIGINS: 'https://one.example, https://two.example' }, () => {
    assert.deepEqual(additionalAllowedOrigins(), ['https://one.example', 'https://two.example']);
  });
});

test('ignores unparseable additional origins', () => {
  withEnvironment({ ADDITIONAL_ALLOWED_ORIGINS: 'not-a-url,https://ok.example' }, () => {
    assert.deepEqual(additionalAllowedOrigins(), ['https://ok.example']);
  });
});

test('treats missing additional origins as an empty list', () => {
  withEnvironment({ ADDITIONAL_ALLOWED_ORIGINS: undefined }, () => {
    assert.deepEqual(additionalAllowedOrigins(), []);
  });
});

test('in-app redirects stay on the current host instead of NEXTAUTH_URL', () => {
  const response = inAppRedirect('/account/security');
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), '/account/security');
  assert.throws(() => inAppRedirect('https://old.example/account/security'), /root-relative path/);
});

test('owner marketing links follow the request host when that origin is allowed', () => {
  withEnvironment({
    NEXTAUTH_URL: 'https://old.example',
    ADDITIONAL_ALLOWED_ORIGINS: 'https://new.example',
  }, () => {
    const headers = new Headers({
      'x-forwarded-host': 'new.example',
      'x-forwarded-proto': 'https',
    });
    assert.equal(publicOriginFromHeaders(headers), 'https://new.example');
    assert.equal(requestAppUrl(headers, '/register'), 'https://new.example/register');
  });
});

test('uses the request host in development when it is localhost', () => {
  withEnvironment({ NEXTAUTH_URL: 'http://localhost:3000', NODE_ENV: 'development' }, () => {
    const headers = new Headers({ host: 'localhost:3010' });
    assert.equal(publicOriginFromHeaders(headers), 'http://localhost:3010');
    assert.equal(requestAppUrl(headers, '/api/auth/verify-email?token=abc'), 'http://localhost:3010/api/auth/verify-email?token=abc');
  });
});

test('falls back to NEXTAUTH_URL when the request host is not an allowed origin', () => {
  withEnvironment({
    NEXTAUTH_URL: 'https://old.example',
    ADDITIONAL_ALLOWED_ORIGINS: undefined,
  }, () => {
    const headers = new Headers({
      'x-forwarded-host': 'unlisted.example',
      'x-forwarded-proto': 'https',
    });
    assert.equal(publicOriginFromHeaders(headers), 'https://old.example');
  });
});

test('proxy and workspace redirects do not send Owners to NEXTAUTH_URL', () => {
  const proxy = readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');
  const workspace = readFileSync(path.join(process.cwd(), 'src/app/api/auth/workspace/route.ts'), 'utf8');
  const owner = readFileSync(path.join(process.cwd(), 'src/app/super-user/owner/page.tsx'), 'utf8');
  assert.match(proxy, /inAppRedirect\('\/account\/security'\)/);
  assert.doesNotMatch(proxy, /redirect\(appUrl/);
  assert.match(workspace, /inAppRedirect\(workspace\)/);
  assert.doesNotMatch(workspace, /appUrl\(/);
  assert.match(owner, /requestAppUrl\(requestHeaders, '\/register'\)/);
});
