# Trade Tender Action Tracker

This file is the canonical project action tracker for Trade Tender.

It is intentionally stored in the repository so it travels with the code across branches and environments, rather than living in a branch-local or environment-local document. Update this file in the same change set as the work it tracks, and keep it as the source of truth for open and in-progress actions. Completed items are removed from this file; historical change notes stay in [Implementation-Change-Register.md](Implementation-Change-Register.md) and [PRODUCTION-RELEASE-ACTION-LIST.md](PRODUCTION-RELEASE-ACTION-LIST.md).

## Outstanding Actions

Work top to bottom — production config first, then engineering debt. Items that state "implementation complete" remain open until their listed validation evidence is recorded.

The current release decision remains **BLOCKED**. Critical open engineering action is P0-C01 (PostgreSQL-backed payment/privacy webhook coverage). Live Stripe, Resend, Sentry, retention, and an approved staging deploy SHA remain Before Production items.

### Before Production

- [ ] Configure Stripe. Add live keys, register a production webhook at `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and chargeback handling.
- [ ] Verify Resend for production. Verify the sending domain, set `EMAIL_FROM`, and send an email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] Configure the retention job: set `RETENTION_JOB_URL` as a production GitHub Actions environment secret to the full production origin plus `/api/internal/retention`, and set the production GitHub `RETENTION_JOB_SECRET` to exactly the same random value configured as Render production `RETENTION_JOB_SECRET`. Then run the workflow manually and retain a successful run as evidence.
- [ ] Configure Sentry for production and confirm one test event. Set browser/server DSNs and verify a scrubbed error event arrives. Staging is already verified.
- [ ] Handle Stripe refunds and disputes. Implementation complete in `6377097`. Outstanding: apply the reversal migration in staging and complete provider-side verification.
- [ ] Make deployment gates govern Render, not Azure. Implementation and hook configuration complete in `e676e12`. Outstanding: run one approved staging deployment and verify that the recorded deployment matches the requested commit.
- [ ] Re-run release validation against the deployed staging SHA. The current health-check record predates the staging tip. Re-run CI, PostgreSQL migration replay, workflow checks, and staging verification for the exact deployed commit; require the recorded SHA as release evidence. This also covers verifying the already-completed Next.js 16 upgrade against the deployed staging environment.

### Production Readiness

- [ ] Complete load and recovery evidence for the 1,000-concurrent-user target with representative staging tests, documented capacity limits, and alerting evidence.

### Engineering Work

- [ ] Complete accessibility and real-device QA, including the mobile sidebar and first-time Client/Provider journeys.
- [ ] Establish production capacity and availability evidence. Free-tier Render services have no demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document connection/scaling limits, configure alerts, and pass representative load and recovery tests.

## Routine Checks

Run before opening a pull request or deploying:

```bash
# keep this section for release validation commands as they are added
npm run stress-test -- --base-url https://<staging-origin>
```
