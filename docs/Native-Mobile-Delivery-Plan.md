# Native Mobile Delivery Plan

This plan delivers a packaged Android and iOS client that reproduces the approved source application's protected workflows without using a web wrapper.

## Release Constraints

- Use React Native with Expo only. Product name is Trade Tender. Package identifiers are `com.tradetender.app`. Store listing copy and production EAS profiles live in `mobile/`; do not submit or auto-publish until Apple Developer, Play Console, production `MOBILE_AUTH_SECRET`, and reviewer demo accounts are in place.
- Preserve server-side authentication, authorization, payment, audit, and contact-release controls.
- Do not enable a protected mobile workflow until its server API and native integration tests are complete.

## Delivery Sequence

1. Maintain the TypeScript Expo package and EAS build configuration using the approved working name for internal development.
2. Add dedicated mobile authentication tokens, server-side bearer-token validation, rate limits, revocation behavior, and secure device storage.
3. Port account setup, profile, tender creation, tender opportunities, tender unlock, quote comparison, quote acceptance, and contact-release workflows as native screens.
4. Add password-change token revocation, bearer-only mobile logout, explicit terms acceptance, interactive Provider opportunities, and verified payment return handling using the existing server-side payment controls and audited webhook flow.
5. Add native UI/integration, accessibility, Android, and iOS device tests for every protected workflow, and include mobile checks in CI.
6. Store identity is Trade Tender / `com.tradetender.app`. App icons, splash, privacy URLs, Play/App Store copy, and production EAS profiles are in `mobile/`. Outstanding before submit: Apple Developer Program, Play Console app, Play service account JSON, App Store Connect record, 1024x500 Play feature graphic, device screenshots, and reviewer demo accounts.
7. Produce internal Android and iOS builds, validate staging against the approved source behavior, then complete store review and production release approval. Production store binaries must use `EXPO_PUBLIC_API_URL=https://trade-tender.onrender.com`.

## Completion Criteria

- Android and iOS packages install through their approved distribution channels.
- Every approved source workflow has a native equivalent with the same server-enforced security controls.
- No sensitive tender, quote, payment, account, or contact-release data is stored insecurely on a device.
- Real-device verification and store-submission evidence are recorded in the Implementation Change Register.

## Android Internal-Test Build

The `preview` EAS profile produces an Android APK for internal testing. Before creating it, configure a public HTTPS test API origin and a non-secret `EXPO_PUBLIC_API_URL` in the EAS build environment. The server must separately hold `MOBILE_AUTH_SECRET`; never include it in the APK.

Run `npm run build:android` from `mobile/` while signed in to the approved Expo account for an internal staging APK. Store binaries use `npm run build:android:store` and `npm run build:ios:store`. Do not run `eas submit` until the Play service account and App Store Connect app exist. Never include `MOBILE_AUTH_SECRET` in the binary.

## Mobile Stress-Test Gate

Run `npm run mobile-stress-test` from the repository root. It creates `mobile-stress-test-results/` with crash, performance, battery, security, network-resilience, recommendations, and launch-readiness reports. The command fails when critical evidence is missing or a protected staging endpoint is unsafe.

For a staging/production release gate, configure these protected environment values without committing their values:

- `ANDROID_STAGING_BASE_URL` and `IOS_STAGING_BASE_URL`: approved HTTPS staging origins.
- `MOBILE_STRESS_DEVICE_EVIDENCE`: JSON evidence with `android` and `ios` entries, each recording `deviceClasses` (small, standard, and large phones; tablet where supported), `soakHours` (at least 8), and `criticalFindings` (0).

The device evidence must be produced from real devices or a managed device farm and cover authentication, lifecycle, network handover/offline recovery, notifications, storage, security assessment, failure simulation, performance, battery, and continuous 1/4/8-hour usage. The production workflow uploads the generated reports and refuses deployment when the command reports critical findings.