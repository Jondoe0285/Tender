# Trade Tender Action Tracker

This file is the canonical project action tracker for Trade Tender.

It is intentionally stored in the repository so it travels with the code across branches and environments, rather than living in a branch-local or environment-local document. Update this file in the same change set as the work it tracks, and keep it as the source of truth for open, in-progress, and completed actions.

## Outstanding Actions

Work top to bottom — production config first, then engineering debt. Items that state "implementation complete" remain open until their listed validation evidence is recorded.

### 2026-09-05 Production Release Review

The detailed cross-functional review is recorded in [PRODUCTION-RELEASE-ACTION-LIST.md](PRODUCTION-RELEASE-ACTION-LIST.md). The current release decision remains **BLOCKED**: `npm run type-check`, `npm run lint`, `npm run build`, `npm test` (152 passing), `npm run health:validate-workflows`, and `npm audit --audit-level=high` now pass locally. Critical open actions remain payment/privacy-critical integration coverage; deployment approval now fails closed when required evidence is missing or unverified in the repository workflow and verifier, while provider-side staging evidence and deployment approval policy remain external requirements.

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

### 2026-09-11 Production Readiness Review Findings

The latest architecture and release review added the following repo- and product-level items that must be tracked explicitly before the platform is considered production ready:

- [ ] Resolve the remaining product-governance decisions and business-plan alignment issues: unified User vs Contractor/Provider model, fixed £10 pricing vs historical figures, sponsorship placement, launch-credit scope, Provider vetting, attachment visibility, and retention semantics.
	- Progress 2026-09-11: Owner settings now support fixed or dynamic staged Provider tender-unlock pricing. Dynamic tender-unlock pricing uses the internal quote estimate and the same first-£10,000 / £10,000.01-£100,000 / over-£100,000 percentage progression as Contractor accepted-quote release pricing.
	- Progress 2026-09-11: Internal quote-estimate baselines now use the bottom third of observed quote and quote-line prices from live quotation data already available in the Trade Tender platform instead of a straight average when prices conflict. Migration `20260911120000_add_quote_estimate_baselines`, `npm run pricing:refresh-estimates`, and the weekly pricing-estimate refresh workflow have been added; production scheduling still requires approved migration deployment and the production GitHub Actions `DATABASE_URL` secret.
	- Progress 2026-09-11: Detailed pricing intelligence now lives on its own Super User page and is grouped by service/product category/item rather than tender. Every potential purchase from the platform catalogue is listed with a standard estimate unit and estimated unit price. Weekly live-data refresh uses all available quote-line history, converts quantities into the relevant standard unit, reports whether actual values are materially higher or lower than the estimate, and updates automatic item offsets. Owners can manually override item offsets, and the Owner master reduction adjusts only the dynamic tender release fee basis after item-level offsets.
	- Progress 2026-09-11: Every service/category type now has an explicit internal starting unit-price estimate based on publicly available UK construction-market pricing patterns. The platform uses those category estimates until enough live quotation data exists, then item-level offsets and owner overrides bring estimates into line with observed values.
	- Progress 2026-09-11: Contractor Services and Professional Services tender releases now bypass estimate-based pricing and use separate fixed Owner-controlled fees. Dynamic estimate-based pricing continues for other service categories.
- [ ] Add misuse/fraud monitoring for repeated parties, duplicate or near-duplicate tenders, unusual payment behaviour, and other launch-risk patterns called out in the business plan.
- [ ] Extend Super User analytics filters to support status, value band, payment status, subscription plan, and Contractor/Provider or tender/quote identifier search.
- [ ] Move affiliated partner information from static hardcoded footer content to a Super User-managed partner source with active-status and position controls.
- [ ] Decide whether a formal Provider approval/vetting gate is required before matching/notification begins, and implement it if required.
- [ ] Confirm whether the optional Provider confirmation step is required for Year 1 launch and implement it if it is.
- [ ] Complete load and recovery evidence for the 1,000-concurrent-user target with representative staging tests, documented capacity limits, and alerting evidence.
- [ ] Confirm the 90-day launch-credit window model and whether category/region-scoped overrides are required before launch.

### Engineering Work

- [ ] Add integration/E2E tests for tender unlock, payment, webhook, contact release, and pre-payment privacy invariants. PostgreSQL coverage now exists for pre-release messaging, tender expiry/closure rejection, payment reversal/contact-release revocation, chargeback and out-of-order webhook delivery, webhook partial-failure recovery, and pre-release privacy invariants (an unlocked tender view never exposes the Contractor's identity/contact details, a Contractor's quote list never exposes the Provider's identity/contact details, and every pre-release notification email template is structurally unable to accept the counterparty's email/phone as input, in `tests/lib/pre-release-privacy-invariants.integration.test.ts` and `tests/lib/pre-release-email-template-privacy.test.ts`). Attachment access is already covered by `tests/lib/tender-attachment-access.integration.test.ts` (only the owning Contractor may download; a matched, unlocked Provider is denied). Data-subject access/export requests are handled manually by an Owner with required resolution evidence (no automated export generator exists, by design). Outstanding: rendered-output (browser DOM) assertions and a broader sweep of operational logs beyond the audit-log cases already covered.
	- Progress 2026-09-11: Provider standard quote validity is now profile-controlled and applied server-side to new quotes. Expired unaccepted quotes are masked from the purchasing Client in the comparison UI/PDF and cannot be accepted server-side; focused quote-schema and quote-validity coverage exists, with browser-rendered expiry assertions still outstanding.
	- Progress 2026-09-11: Tender creation now requires detailed package specifications and captures service-specific quoting data. Owner-controlled paid direct contact requests are implemented for Contractor Services and Professional Services only, with Provider contact details shared one-way to the purchasing Client after confirmed payment; focused static and schema coverage exists, with end-to-end Stripe/browser assertions still outstanding.
	- Progress 2026-09-11: Professional Services tender capture now uses a stronger consultant/service provision catalogue and no longer asks for the service type twice. Selecting `Other` requires further details, and validation now checks the visible service-period controls instead of hidden quantity/unit fields.
	- Progress 2026-09-11: Contractor Services, Professional Services, and Plant Hire packages now capture size/scope, working-hours restrictions, access constraints, site constraints, deliverables, minimum requirements, and expanded plant support requirements. Continue-blocking validation now shows an explicit page-level message plus field-level errors.
	- Progress 2026-09-11: Provider profiles now support a sole-trader declaration. Sole traders cannot be AI verified, the verification route blocks submission, quotes show a Sole Trader status flag with explanatory hover text, and the verification policy documents the due-diligence implications.
	- Progress 2026-09-11: Independent verification now has an Owner-controlled renewal model. Renewals open after 11 months, expire after 12 months, can use a lower Owner-set renewal fee, and expired independent reviews no longer show as independently verified on quotes.
	- Progress 2026-09-11: Independent verification now has a documented Bronze/Silver/Gold tier guide across Provider review screens, Contractor quote badge hover text, and the public verification policy.
- [ ] Complete accessibility and real-device QA, including the mobile sidebar and first-time Contractor/Provider journeys. Progress 2026-09-11: screen-reader accessible sort semantics and filter toggle pressed states are now implemented and covered by `tests/lib/quote-comparison-advertising.test.ts`; remaining mobile and first-journey QA is still outstanding.
- [ ] Establish production capacity and availability evidence. Free-tier Render services have no demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document connection/scaling limits, configure alerts, and pass representative load and recovery tests.

## Routine Checks

Run before opening a pull request or deploying:

```bash
# keep this section for release validation commands as they are added
npm run stress-test -- --base-url https://<staging-origin>
```
