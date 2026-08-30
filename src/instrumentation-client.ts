import * as Sentry from '@sentry/nextjs';

// No hardcoded DSN: when the variable is absent the SDK initialises as a no-op.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // `dataCollection` is deliberately omitted. Passing it — even as `{}` — opts every
  // unset category into its permissive default, which would send user data and HTTP
  // bodies containing Client and Retailer contact details.
});

// Next.js only invokes this from 15.3 onwards; harmless and required by the SDK on 14.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
