# Trade Tender Action Tracker

This file is the canonical project action tracker for Trade Tender.

It is intentionally stored in the repository so it travels with the code across branches and environments, rather than living in a branch-local or environment-local document. Update this file in the same change set as the work it tracks, and keep it as the source of truth for open and in-progress actions. Completed items are removed from this file; historical change notes stay in [Implementation-Change-Register.md](Implementation-Change-Register.md) and [PRODUCTION-RELEASE-ACTION-LIST.md](PRODUCTION-RELEASE-ACTION-LIST.md).

## Outstanding Actions

Work top to bottom — production config first, then remaining operational evidence. Items that state "implementation complete" remain open until their listed validation evidence is recorded.

The current release decision remains **BLOCKED**. Repository engineering for payment ledger, privileged MFA, trusted client IP, own-tender IDOR, governing-document canon, and source accessibility/contrast is complete. Live Stripe, Resend, Sentry, retention, an approved staging deploy SHA, real-device QA, and paid-plan capacity evidence remain Before Production items.

Actions below include the 2026-09-22 enterprise due-diligence recommendations. Existing tracker items were kept; due-diligence items that already appeared here or were closed as Year 1 product decisions were not duplicated.

### Before Production

- [ ] Configure Stripe. Add live keys, register a production webhook at `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and chargeback handling.
- [ ] Verify Resend for production. Verify the sending domain, set `EMAIL_FROM`, and send an email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] Configure the retention job: set `RETENTION_JOB_URL` as a production GitHub Actions environment secret to the full production origin plus `/api/internal/retention`, and set the production GitHub `RETENTION_JOB_SECRET` to exactly the same random value configured as Render production `RETENTION_JOB_SECRET`. Then run the workflow manually and retain a successful run as evidence.
- [ ] Configure Sentry for production and confirm one test event. Set browser/server DSNs and verify a scrubbed error event arrives. Staging is already verified.
- [ ] Handle Stripe refunds and disputes. Implementation complete in `6377097`. Outstanding: apply the reversal migration in staging and complete provider-side verification.
- [ ] Make deployment gates govern Render, not Azure. Implementation and hook configuration complete in `e676e12`. Outstanding: run one approved staging deployment and verify that the recorded deployment matches the requested commit.
- [ ] Re-run release validation against the deployed staging SHA. The current health-check record predates the staging tip. Re-run CI, PostgreSQL migration replay, workflow checks, and staging verification for the exact deployed commit; require the recorded SHA as release evidence. This also covers verifying the already-completed Next.js 16 upgrade against the deployed staging environment.
- [ ] Confirm on staging that password reset and MFA enrollment or disablement invalidate prior JWT sessions (`sessionVersion`).

### Production Readiness

- [ ] Complete load and recovery evidence for the 1,000-concurrent-user target with representative staging tests, documented capacity limits, and alerting evidence.
- [ ] Do not market a national launch or Cyber Essentials / ISO 27001 claims until the evidence pack exists. Keep any live use as a closed regional pilot.

### Security and Compliance

- [ ] Store tender attachments in private object storage with authorised expiring downloads and malware scanning. Stop persisting user file bytes in Postgres (`TenderAttachment.content`).
- [ ] Commission an independent web penetration test after live Stripe is proven; close Critical and High findings before wider access.
- [ ] Execute processor DPAs (Render, Neon, Stripe, Resend, Sentry, Consulthub), a DPIA, and a DSAR/erasure runbook that covers database, files, backups, email, and observability stores.
- [ ] Name deputies for deploy, Stripe, and incidents so production operations are not a single-person dependency.

### Engineering Work

- [ ] Complete accessibility, real-device, and first-journey QA, including the mobile sidebar, Client/Provider journeys, and a repeatable browser/axe pass (P2-M01 / P2-M03).
- [ ] Establish production capacity and availability evidence. Free-tier Render services have no demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document connection/scaling limits, configure alerts, and pass representative load and recovery tests.

### Data, Product, and Marketplace

- [ ] Add Project and Award entities so a job/site can own multiple tenders and an accepted quote has a tracked outcome after contact release.
- [ ] Add Client organisation RBAC (buyer, QS/estimator, read-only auditor) beyond today’s two-profile `USER` model.
- [ ] Define an opportunity search strategy that will not rely on unindexed table scans as Provider and tender volume grows.
- [ ] Run a closed regional beachhead (one geography, limited trades, invited demand) and instrument match → unlock → quote → accept → release before any national acquisition spend.
- [ ] Before enterprise sales, move sponsored placements off the quote-comparison surface. Year 1 launch keeps sponsorship on comparison (founder decision 2026-09-18); this is not a Year 1 reopen.

### Operations and Recovery

- [ ] Run and time a production backup restore. Publish RTO/RPO, name an incident owner, and keep a written incident/severity runbook.
- [ ] Verify protected GitHub environments, branch rules, required checks, Render deploy hooks, and named release/rollback ownership.

### Later (not launch blockers)

- [ ] Public versioned API for integrations.
- [ ] SSO/SAML for larger Client organisations.
- [ ] Generative AI tender authoring only after DPIA, contractual “no training on customer jobs,” and human-in-the-loop controls.
- [ ] Activate Provider subscriptions only after paid-unlock conversion is evidenced.

## Routine Checks

Run before opening a pull request or deploying:

```bash
# keep this section for release validation commands as they are added
npm run stress-test -- --base-url https://<staging-origin>
```
