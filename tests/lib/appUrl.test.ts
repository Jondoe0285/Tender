import test from 'node:test';
import assert from 'node:assert/strict';
import { additionalAllowedOrigins, appUrl, getAppUrl } from '../../src/server/config/appUrl';

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
