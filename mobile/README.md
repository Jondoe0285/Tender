# Trade Tender Mobile

Native Android and iOS client built with Expo and React Native. It is not a web wrapper. Identifiers are `Trade Tender` / `com.tradetender.app`.

## Local development

Use Node 22.13 or later, then run `npm install` and `npm run android` from this directory.

## Packaged builds

- `npm run build:android` / `npm run build:ios` create internal-distribution builds against Tender Staging.
- `npm run build:android:store` produces a Play Store Android App Bundle against production (`https://trade-tender.onrender.com`).
- `npm run build:ios:store` produces an App Store iOS build against production.

Do not place credentials, database URLs, payment keys, or `MOBILE_AUTH_SECRET` in mobile environment files. Production must hold `MOBILE_AUTH_SECRET` on the server.

Store upload (`eas submit`) is not wired to run from these scripts. Add `mobile/google-service-account.json` (gitignored) and the App Store Connect app record before the first submit.

Listing copy lives in `store.config.json` (App Store) and `store/play-en-GB.json` (Play Console). Data-safety answers are in `store/play-data-safety.json`.

## Security boundary

The app signs in through `POST /api/mobile/auth/login`, stores the bearer session in Expo SecureStore, and reloads current authorization on the server for every protected request. Do not reuse browser cookies or weaken payment, audit, or contact-release controls.
