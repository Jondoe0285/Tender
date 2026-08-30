/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Required for src/instrumentation.ts on Next.js 14; stable from Next.js 15.
  experimental: {
    instrumentationHook: true,
  },
  // Both run as their own gate in CI and in the Render build command. Repeating them
  // inside `next build` doubles the work and exhausts the type-check worker's memory.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Build-time secret, distinct from the DSN.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  telemetry: false,
  // Source map upload only makes sense with an auth token; skipping it keeps
  // token-less builds (local and CI) fast and light.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
});
