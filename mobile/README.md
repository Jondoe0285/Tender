# Trade Tender Mobile

Native Android and iOS client built with Expo and React Native. It is not a web wrapper. The current name and identifiers are for internal development only; do not register them, configure release signing, or publish them until the final name is approved.

## Local development

Use Node 22.13 or later, then run `npm install` and `npm run android` from this directory.

## Packaged builds

- `npm run build:android` creates an installable Android APK for internal testing through EAS.
- `npm run build:ios` creates an iOS internal-distribution build through EAS; final iOS signing and App Store distribution require an Apple Developer account.

Set `EXPO_PUBLIC_API_URL` to the HTTPS mobile API origin. Do not place credentials, database URLs, payment keys, or any other secret in mobile environment files.

## Security boundary

The existing server currently authenticates browser sessions with NextAuth cookies. Before protected workflows are enabled in this client, implement a dedicated mobile-token endpoint, server-side bearer-token validation that reloads current authorization state, secure token storage, and mobile-specific integration tests.