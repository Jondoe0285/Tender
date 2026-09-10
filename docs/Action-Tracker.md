# Trade Tender Action Tracker

This file is the canonical project action tracker for Trade Tender.

It is intentionally stored in the repository so it travels with the code across branches and environments, rather than living in a branch-local or environment-local document. Update this file in the same change set as the work it tracks, and keep it as the source of truth for open, in-progress, and completed actions.

## Outstanding Actions

Work top to bottom — production config first, then engineering debt. Items that state "implementation complete" remain open until their listed validation evidence is recorded.

### 2026-09-05 Production Release Review

The detailed cross-functional review is recorded in [PRODUCTION-RELEASE-ACTION-LIST.md](PRODUCTION-RELEASE-ACTION-LIST.md). The current release decision remains **BLOCKED**: `npm run type-check`, `npm run lint`, `npm run build`, `npm test` (152 passing), `npm run health:validate-workflows`, and `npm audit --audit-level=high` now pass locally. Critical open actions remain payment/privacy-critical integration coverage and making deployment approval fail closed when required evidence is missing or unverified.

Progress recorded 2026-09-05: membership/unlock fixtures now satisfy the company capability and geographic eligibility contract; Next.js no longer ignores TypeScript build errors; staging and production verification jobs fail when verification fails while retaining records; password changes invalidate prior JWT sessions through migration `20260905050000_add_session_version`; existing-account registration responses no longer disclose account state; the approved light logo and neutral payment-return copy are in use; lint is clean; open-tender attachments are protected from premature retention purge; tender and quote reference allocation retries unique conflicts; approved colour tokens and CSP are configured; and local browser QA confirms the registration county selector is keyboard operable at mobile width. These changes still require repeatable browser/axe coverage, staging migration replay, deployed-SHA evidence, and provider-side verification before release.

The review also identifies unresolved Founder/product-owner decisions about the unified User versus Contractor/Provider model, fixed £10 pricing versus historical figures, sponsorship placement, launch-credit scope, Provider vetting, attachment visibility, and retention semantics. These decisions must be resolved before broad implementation or documentation realignment.

### Before Production

- [ ] Set production environment variables. Configure all `sync: false` values in [render.yaml](../render.yaml), including separate Stripe, Resend, Sentry, and retention secrets.
- [ ] Configure Stripe. Add live keys, register a production webhook at `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and chargeback handling.
- [ ] Verify Resend for production. Verify the sending domain, set `EMAIL_FROM`, and send an email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] Configure the retention job: set `RETENTION_JOB_URL` as a production GitHub Actions environment secret to the full production origin plus `/api/internal/retention`, and set the production GitHub `RETENTION_JOB_SECRET` to exactly the same random value configured as Render production `RETENTION_JOB_SECRET`. Then run the workflow manually and retain a successful run as evidence.
- [ ] Configure Sentry for production and confirm one test event. Set browser/server DSNs and verify a scrubbed error event arrives. Staging is already verified.
- [ ] Handle Stripe refunds and disputes. Implementation complete in `6377097`: a migration-backed reversal ledger records signed Stripe refund/dispute events, marks the payment reversed, removes paid unlock/contact-release entitlements, audits the change, and notifies affected parties. PostgreSQL regression coverage now proves paid-unlock revocation, duplicate refund-event idempotency, contact-release reversal, chargeback (`DISPUTE`-type) reversal, and out-of-order event delivery protection. Outstanding: apply the migration in staging and complete provider-side verification.
- [ ] Make deployment gates govern Render, not Azure. Implementation and hook configuration complete in `e676e12`: Render auto-deploy is disabled and protected staging/production workflows invoke separate Render deploy hooks for the approved SHA. Outstanding: run one approved staging deployment and verify that the recorded deployment matches the requested commit.
- [ ] Re-run release validation against the deployed staging SHA. The current health-check record predates the staging tip. Re-run CI, PostgreSQL migration replay, workflow checks, and staging verification for the exact deployed commit; require the recorded SHA as release evidence. This also covers verifying the already-completed Next.js 16 upgrade (`next` is now `^16.3.4` in `package.json`; local `type-check` and `build` pass) against the deployed staging environment.

### Engineering Work

- [ ] Add integration/E2E tests for tender unlock, payment, webhook, contact release, and pre-payment privacy invariants. PostgreSQL coverage now exists for pre-release messaging, tender expiry/closure rejection, payment reversal/contact-release revocation, chargeback and out-of-order webhook delivery, webhook partial-failure recovery, and pre-release privacy invariants (an unlocked tender view never exposes the Contractor's identity/contact details, a Contractor's quote list never exposes the Provider's identity/contact details, and every pre-release notification email template is structurally unable to accept the counterparty's email/phone as input, in `tests/lib/pre-release-privacy-invariants.integration.test.ts` and `tests/lib/pre-release-email-template-privacy.test.ts`). Attachment access is already covered by `tests/lib/tender-attachment-access.integration.test.ts` (only the owning Contractor may download; a matched, unlocked Provider is denied). Data-subject access/export requests are handled manually by an Owner with required resolution evidence (no automated export generator exists, by design). Outstanding: rendered-output (browser DOM) assertions and a broader sweep of operational logs beyond the audit-log cases already covered.
- [ ] Complete accessibility and real-device QA, including the mobile sidebar and first-time Contractor/Provider journeys.
- [ ] Complete WCAG contrast verification for all shared control states. Automated token-level coverage now exists in `tests/lib/wcag-contrast.test.ts` for button variants, the focus ring, and status badges. It confirms a real AA gap: the Pending (~2.97:1), Approved (~4.49:1), and Neutral (~4.27:1) status badge text colours fall below the 4.5:1 AA normal-text threshold against their own tinted background at any tint strength (the token itself is too light against white, not just the tint). Fixing this requires darkening an approved functional/status colour, which needs Brand Owner sign-off per [TradeTender-Brand-Rules.md](branding/TradeTender-Brand-Rules.md) before any change. Outstanding: Brand Owner decision on the corrected colour(s), then a full manual/axe UI-state audit covering disabled states and dark/light surfaces beyond the tokens already verified.
- [ ] Establish production capacity and availability evidence. Free-tier Render services have no demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document connection/scaling limits, configure alerts, and pass representative load and recovery tests.

## Routine Checks

Run before opening a pull request or deploying:

```bash
# keep this section for release validation commands as they are added
npm run stress-test -- --base-url https://<staging-origin>
```
