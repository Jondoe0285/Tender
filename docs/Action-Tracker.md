# Trade Tender Action Tracker

This file is the canonical project action tracker for Trade Tender.

It is intentionally stored in the repository so it travels with the code across branches and environments, rather than living in a branch-local or environment-local document. Update this file in the same change set as the work it tracks, and keep it as the source of truth for open, in-progress, and completed actions.

## Outstanding Actions

Work top to bottom — production config first, then engineering debt. Items that state "implementation complete" remain open until their listed validation evidence is recorded.

### 2026-09-05 Production Release Review

The detailed cross-functional review is recorded in [PRODUCTION-RELEASE-ACTION-LIST.md](PRODUCTION-RELEASE-ACTION-LIST.md). The current release decision remains **BLOCKED**: `npm run type-check`, `npm run lint`, `npm run build`, `npm test` (152 passing), `npm run health:validate-workflows`, and `npm audit --audit-level=high` now pass locally. Critical open action is P0-C01 (PostgreSQL-backed payment/privacy webhook coverage). P0-C02 repository gates now fail closed: unprobeable checks require staging `HIGH RISK STAGING CONTROLS VERIFIED` or production `PRODUCTION PROVIDER CONTROLS VERIFIED`, and production rollback redeploys the previous SHA through Render. Live Stripe/Resend/Sentry/retention evidence and an approved staging deploy SHA remain external Before Production items.

Progress recorded 2026-09-05: membership/unlock fixtures now satisfy the company capability and geographic eligibility contract; Next.js no longer ignores TypeScript build errors; staging and production verification jobs fail when verification fails while retaining records; password changes invalidate prior JWT sessions through migration `20260905050000_add_session_version`; existing-account registration responses no longer disclose account state; the approved light logo and neutral payment-return copy are in use; lint is clean; open-tender attachments are protected from premature retention purge; tender and quote reference allocation retries unique conflicts; approved colour tokens and CSP are configured; and local browser QA confirms the registration county selector is keyboard operable at mobile width. These changes still require repeatable browser/axe coverage, staging migration replay, deployed-SHA evidence, and provider-side verification before release.

The review also recorded Founder decisions on 2026-09-18: unified User model, Owner-set £10-default fees, Year 1 sponsorship on quote comparison, flat launch credits, self-serve matching, unlocked-Provider attachment download, and 30-day quote retention. Remaining open work is implementation and evidence.

### Before Production

- [x] Set production environment variables. Configure all `sync: false` values in [render.yaml](../render.yaml), including separate Stripe, Resend, Sentry, and retention secrets. Evidence 2026-09-18 (Owner, dashboard confirmation; no secrets in git): production origin `https://trade-tender.onrender.com`; `NEXT_PUBLIC_SUPPORT_EMAIL` `info@Tradetender.com`; `EMAIL_FROM` `Noreply@send.tradetender.com`; `REGISTRATION_NOTIFICATION_EMAIL` `info@tradetender.com`; remaining `sync: false` secrets confirmed set on Render service Trade Tender (production).
- [ ] Configure Stripe. Add live keys, register a production webhook at `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and chargeback handling.
- [ ] Verify Resend for production. Verify the sending domain, set `EMAIL_FROM`, and send an email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] Configure the retention job: set `RETENTION_JOB_URL` as a production GitHub Actions environment secret to the full production origin plus `/api/internal/retention`, and set the production GitHub `RETENTION_JOB_SECRET` to exactly the same random value configured as Render production `RETENTION_JOB_SECRET`. Then run the workflow manually and retain a successful run as evidence.
- [ ] Configure Sentry for production and confirm one test event. Set browser/server DSNs and verify a scrubbed error event arrives. Staging is already verified.
- [ ] Handle Stripe refunds and disputes. Implementation complete in `6377097`: a migration-backed reversal ledger records signed Stripe refund/dispute events, marks the payment reversed, removes paid unlock/contact-release entitlements, audits the change, and notifies affected parties. PostgreSQL regression coverage now proves paid-unlock revocation, duplicate refund-event idempotency, contact-release reversal, chargeback (`DISPUTE`-type) reversal, and out-of-order event delivery protection. Outstanding: apply the migration in staging and complete provider-side verification.
- [ ] Make deployment gates govern Render, not Azure. Implementation and hook configuration complete in `e676e12`: Render auto-deploy is disabled and protected staging/production workflows invoke separate Render deploy hooks for the approved SHA. Outstanding: run one approved staging deployment and verify that the recorded deployment matches the requested commit.
- [ ] Re-run release validation against the deployed staging SHA. The current health-check record predates the staging tip. Re-run CI, PostgreSQL migration replay, workflow checks, and staging verification for the exact deployed commit; require the recorded SHA as release evidence. This also covers verifying the already-completed Next.js 16 upgrade (`next` is now `^16.3.4` in `package.json`; local `type-check` and `build` pass) against the deployed staging environment.

### 2026-09-11 Production Readiness Review Findings

The latest architecture and release review added the following repo- and product-level items that must be tracked explicitly before the platform is considered production ready:

- [x] Resolve the remaining product-governance decisions and business-plan alignment issues: unified User vs Contractor/Provider model, fixed £10 pricing vs historical figures, sponsorship placement, launch-credit scope, Provider vetting, attachment visibility, and retention semantics. Recorded 2026-09-18 (Founder): keep unified `USER` with Client/Provider profiles; Owner-set fees with a £10 fixed default (percentage mode optional); keep sponsorship on quote comparison for Year 1; keep flat `launchCreditsLeft`; matching stays self-serve without an Owner approval gate; matched unlocked Providers may download tender attachments; keep the 30-day automated quote retention job.
- [x] Add misuse/fraud monitoring for repeated parties, duplicate or near-duplicate tenders, unusual payment behaviour, and other launch-risk patterns called out in the business plan. Implemented 2026-09-18 on `/super-user/compliance`: near-duplicate tenders, unlock-without-quote, repeated Client/Provider pairings, failed/reversed payments, repeated tender closures and quote rejections, and excessive sign-in failures. Coverage in `tests/lib/compliance-monitoring.test.ts`.
- [x] Decide whether a formal Provider approval/vetting gate is required before matching/notification begins, and implement it if required. Decision 2026-09-18: not required for Year 1; matching remains self-serve. Optional Bronze/Silver/Gold verification is unchanged.
- [x] Confirm whether the optional Provider confirmation step is required for Year 1 launch and implement it if it is. Decision 2026-09-18: not required. Year 1 stays match → unlock → quote.
- [ ] Complete load and recovery evidence for the 1,000-concurrent-user target with representative staging tests, documented capacity limits, and alerting evidence.
- [x] Confirm the 90-day launch-credit window model and whether category/region-scoped overrides are required before launch. Decision 2026-09-18: keep a flat credit count; no 90-day window or category/region grants before launch.

### Engineering Work

- [x] Add integration/E2E tests for tender unlock, payment, webhook, contact release, and pre-payment privacy invariants. PostgreSQL coverage exists for pre-release messaging, tender expiry/closure rejection, payment reversal/contact-release revocation, chargeback and out-of-order webhook delivery, webhook partial-failure recovery, and pre-release privacy invariants (`tests/lib/pre-release-privacy-invariants.integration.test.ts`, `tests/lib/pre-release-email-template-privacy.test.ts`). Attachment access is covered by `tests/lib/tender-attachment-access.integration.test.ts`. Rendered quote-comparison HTML is covered by `tests/lib/pre-release-rendered-privacy.test.ts` (Provider contact is absent until an authorised release payload is supplied). Operational logs are covered by `tests/lib/pre-release-operational-log-privacy.test.ts` (audit metadata and API/server console output must not store or print email/phone). Data-subject access/export remains a manual Owner process. Repeatable browser/device journeys remain on the accessibility item below.
- [ ] Complete accessibility and real-device QA, including the mobile sidebar and first-time Client/Provider journeys. Progress 2026-09-18: source a11y polish added associated labels and filter fieldset on opportunities, sort live region on quote comparison, branded loading/retry shells on Client and Provider tender detail, larger footer policy hit targets, and partner tiles that no longer force a 9rem minimum width on narrow screens. Remaining: real-device and first-journey QA.
- [ ] Establish production capacity and availability evidence. Free-tier Render services have no demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document connection/scaling limits, configure alerts, and pass representative load and recovery tests.

## Routine Checks

Run before opening a pull request or deploying:

```bash
# keep this section for release validation commands as they are added
npm run stress-test -- --base-url https://<staging-origin>
```
