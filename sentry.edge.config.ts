import * as Sentry from '@sentry/nextjs';

// No hardcoded DSN: when the variable is absent the SDK initialises as a no-op.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // `dataCollection` is deliberately omitted; see instrumentation-client.ts.
});
