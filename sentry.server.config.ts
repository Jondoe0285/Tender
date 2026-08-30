import * as Sentry from '@sentry/nextjs';

// No hardcoded DSN: when the variable is absent the SDK initialises as a no-op.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Server frames hold password hashes, verification tokens, Stripe payloads, and
  // released contact details, so local variables must never be attached.
  includeLocalVariables: false,

  // `dataCollection` is deliberately omitted; see instrumentation-client.ts.
});
