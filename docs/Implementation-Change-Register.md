# Implementation Change Register

This is the operational source of truth for adapting repository changes to the deployed app environments.
Update it in the same change set as every applicable implementation. Do not record secrets.

## Update Format

- Date and commit or pending change reference
- What changed and why
- Affected app, database, configuration, workflow, and user-facing surfaces
- Required environment adaptation or operator action
- Validation completed and validation still outstanding

## Current Changes

### 2026-09-03 - Phased Implementation Plan For New Business Plan

- Changed: added a "New Business Plan Implementation Plan" section to [README.md](../README.md), breaking the 4 code-affecting baseline decisions into four sequential phases: (1) Contractor/Provider terminology rename (labels/routes first, `Role` enum migration last, as the highest-risk step), (2) active Super-User-managed partner advertising, (3) job/tender-package data model and matching engine rework, (4) subscription tier price alignment (still inactive).
- Affects: [README.md](../README.md) only. No application code, schema, or environment configuration changed.
- Status: planning only; no phase has started.
- Environment: no operator action.
- Validation: none yet; documentation only.

### 2026-09-03 - Baseline Business Plan Decisions Resolved

- Changed: the Super User resolved all 10 open conflicts raised against the 2026-09-03 baseline business plan. Resolved: (1) Client→Contractor/Retailer→Provider is a pure rename, no new roles; (2) job-package tender splitting is approved as specified and requires a new data model/matching engine; (3) no fee changes — current £10/£10 fees and existing fee-setting controls stay; (4) current tender/quote identifier format stays, the `JOB-YYYYMMDD` scheme is not adopted; (5) active Super-User-managed partner advertising is approved; (6) no Provider confirmation step — quote lifecycle stays a single Contractor action; (7) Retailer/Provider accounts stay self-serve, no approval gate; (8) current approved brand palette stays, the proposed Construction Navy/Safety Orange palette is not adopted; (9) the plan's Azure hosting reference is a legacy artifact — Render/Neon stays; (10) the Free £0/Starter £29/Growth £49/Pro £99/Enterprise £149–199 subscription tiers are confirmed as the future pricing model for whenever Provider subscriptions are activated (feature stays built-but-inactive until then).
- Affects: [docs/TradeTender-Business-Plan.md](TradeTender-Business-Plan.md) (Baseline Change Notes section), [.github/copilot-instructions.md](../.github/copilot-instructions.md) (Roles section updated to Contractor/Provider terminology, rename not yet applied to code). No application code, schema, or environment configuration changed yet.
- Status: still a planning-stage change. The role rename (item 1) and job-package data model (item 2) are large, separate implementation phases not yet started.
- Environment: no operator action.
- Validation: none yet; documentation only.

### 2026-09-03 - New Baseline Business Plan (Contractor/Provider Model)

- Changed: replaced [docs/TradeTender-Business-Plan.md](TradeTender-Business-Plan.md) with a new baseline business plan supplied by the Super User, covering a Contractor/Provider/Super User model, job-based tenders split into per-category "tender packages," a £5 Provider quote participation fee, a percentage-based (or, per an internal inconsistency in the source, fixed £10) Contractor Accepted Quote Release Fee, active Super-User-managed partner advertising, a new job/package/quote identifier scheme, and a proposed new brand colour palette.
- Affects: no application code, schema, or environment configuration yet. Documentation only.
- Status: **not implemented**. This is a scope-defining document only. Ten open conflicts/decisions are recorded in the "Baseline Change Notes" section at the end of the business plan and must be resolved with the Super User before implementation begins, including the role-rename scope, the tender-package data model, the fee inconsistency, and the brand-palette conflict with the existing approved Brand Guide.
- Environment: no operator action.
- Validation: none yet; this is a planning document change, not a code change.

### 2026-09-02 - Environment And Branch Resource Preservation Requirement

- Changed: added a permanent governance rule distinguishing local development/feature resources from protected staging and production/main environment resources. Development and feature branches must use only local databases and local-only sandbox credentials/settings. Staging and production/main branches each have explicit, dedicated environment resources and branch-specific security permissions (databases, Stripe, Resend, Sentry, Cloudflare/DNS/WAF, authentication providers, analytics/telemetry, storage, monitoring, webhooks, API credentials, service URLs, access policies, role assignments, deployment configuration, and future integrations) that must never be reset, reseeded, overwritten, repointed, rotated, disabled, downgraded, deleted, replaced, or weakened without recorded Founder/product-owner/release-owner approval, resource identification, backup/rollback evidence, a change plan, post-change validation evidence, and a named release/rollback owner.
- Affects (governance sources updated, not application code): [.github/copilot-instructions.md](../.github/copilot-instructions.md) (new "Environment Resource Preservation" section), [docs/Security-Requirements.md](Security-Requirements.md) (new SEC-118 to SEC-122 and a new Security Release Gate bullet), [docs/Architecture.md](Architecture.md) (Deployment Architecture section), [docs/health-check/README.md](health-check/README.md) (new "Protected environment resources" section in the deployment runbook), and a new [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) checklist item confirming whether environment resources or security permissions are affected.
- Environment: no operator action. No live staging or production/main environment setting, credential, or integration was changed as part of this update; this is a documentation/governance change only. No secret values were printed or committed.
- Validation: `node scripts/health-check/validate-workflows.mjs` passes (no workflow files were changed by this entry). Reviewed the edited Markdown files for formatting; `git diff --check` shows no whitespace errors. Rollback: revert this commit; no migration or environment change accompanies it.

### 2026-09-02 - Permanent Development Branch And Staging Reconciliation

- Changed: created a permanent `development` branch (from the current `staging` tip) as the integration branch for day-to-day feature work, which flows into `staging` and then `main`. Added an approval-gated workflow, `.github/workflows/reconcile-staging-to-development.yml`, that opens a draft pull request merging `staging` back into `development` so the branches do not diverge when `staging` moves independently (e.g. hotfixes promoted from `main`, staging record commits). Added `development` to the CI trigger list in `.github/workflows/ci.yml`.
- Affects: GitHub branch topology and CI/CD workflows only. No application code, database, or environment configuration changed.
- Environment: no operator action required for this change. If branch protection rules are configured for `main`/`staging`, an operator should add equivalent protection for `development` if desired; this was not done automatically since it requires GitHub repository settings access outside this change set.
- Validation: `node scripts/health-check/validate-workflows.mjs` passes for all workflow files including the new one. `development` was pushed to `origin` and tracks `origin/development`.

### 2026-09-02 - Pending Super User Reporting Filters And Aggregate Export

- Changed: Super User analytics and CSV export now accept schema-validated Client, Retailer, tender/quote reference, category, geography, tender/quote status, date range, quoted-value band, membership/subscription plan, and payment-status filters. All filters are translated into typed Prisma relationship predicates at the server boundary; the CSV remains aggregate-only and includes the applied filter values for auditability.
- Affects: Super User dashboard and analytics route, `/api/super-user/analytics/export`, and reporting data access. No database migration or new environment configuration is required.
- Environment: no operator action. Membership and subscription filters only return matching historic records while those inactive Year 1 features remain disabled.
- Validation: focused parser/predicate unit coverage added. Run `npm ci`, `npm run type-check`, `npm test`, and `npm run build`; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - General Audit-Log Immutability

- Status: deferred until the development branch completes the migration-backed implementation.
- Required scope: enforce append-only `AuditLog` records at the database boundary while retaining authorised application inserts, and add integration coverage for rejected updates and deletes.

### 2026-09-02 - Pending Immutable Contact-Release Audit Events

- Changed: added `ContactReleaseAuditEvent` records that transactionally accompany every newly finalised contact release. Each event stores only actor and party IDs, tender/quote IDs, the `CONTACT_DETAILS` category, the exact release timestamp, authorising payment ID, and a generated correlation ID; it does not store email addresses, names, phones, or released contact data. The existing general `CONTACT_RELEASED` audit event now carries the same minimal correlation metadata.
- Affects: PostgreSQL migration `20260902140000_add_contact_release_audit_events`, contact-release finalisation, audit retention, and Super User operational review. A database trigger makes the dedicated event table append-only by rejecting update and delete operations; payment reversal can remove a release entitlement without removing its audit evidence.
- Environment: apply the migration through `prisma migrate deploy` before deploying application code. No new environment variables or secrets are required.
- Validation: focused PostgreSQL integration coverage verifies the event fields, data minimisation, shared release timestamp, generated correlation ID, and database rejection of update/delete attempts. Run `npm run db:generate`, `npm run type-check`, `npm test`, and `npm run build` after applying migrations; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Membership Payment Pricing Correction

- Changed: membership payment creation now reloads the requested active MembershipTier and uses its `monthlyPriceGbp` as the net charge. Callers no longer provide payment amounts, preventing client-originated or stale caller values from affecting membership payment, VAT, Stripe checkout, or persisted payment totals.
- Affects: future Retailer membership purchase payments only. No database migration or new environment configuration is required.
- Environment: no operator action. Keep `MEMBERSHIP_TIERS_ACTIVE` set to `false` for the approved Year 1 pay-per-unlock model; enabling it permits only active tiers to be purchased at their database-configured monthly price.
- Validation: focused PostgreSQL billing coverage verifies the disabled feature creates no payment, then verifies an enabled active £49 tier creates a £49 net, £9.80 VAT, £58.80 total pending payment. Run `npm run type-check`, `npm test`, and `npm run build` after dependencies and the test database are available; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Membership Allowance Feature Gate

- Changed: tender unlock processing now evaluates active membership allowances only when the Super User `MEMBERSHIP_TIERS_ACTIVE` platform setting is enabled. Existing active RetailerMembership records cannot grant a free tender unlock while the membership feature is inactive.
- Affects: Retailer tender unlocks and the membership feature setting. No database migration or new environment configuration is required.
- Environment: no operator action. Keep `MEMBERSHIP_TIERS_ACTIVE` set to `false` for the approved Year 1 pay-per-unlock model; enabling it activates existing eligible membership allowances.
- Validation: focused PostgreSQL coverage seeds an active tier and membership while the default setting is disabled, then verifies the server creates a pending Retailer unlock payment instead of an unlock. Run `npm run type-check`, `npm test`, and `npm run build` after dependencies and the test database are available; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Auditable Legal Holds

- Changed: added migration-backed LegalHold records scoped to Tender, Quote, or TenderAttachment. Full Super Users create and release holds through origin-protected, server-validated API endpoints; each lifecycle operation writes an audit event in the same database transaction. A database check constrains each hold to its declared scope and a partial unique index prevents duplicate active holds for the same target.
- Affects: PostgreSQL migration `20260902130000_add_legal_holds`, retention purge behavior, direct quote deletion, Super User administration APIs, and audit logs. Active tender holds protect related unaccepted quotes and attachments; direct holds protect their own target. Released holds preserve lifecycle metadata and no longer prevent scheduled deletion.
- Environment: apply the migration through `prisma migrate deploy` before deploying application code. No new environment variables or secrets are required. Legal hold management is limited to authenticated non-Accountant Super Users and should be operated only with a documented retention reason.
- Validation: focused unit coverage asserts active direct/tender hold purge exclusions; PostgreSQL integration coverage creates, audits, releases, and purges held records. Run `npm run db:generate`, `npm run type-check`, `npm test`, and `npm run build` after installing dependencies and applying migrations; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Tender Attachment Validation And Limits

- Changed: tender attachment validation now performs strict base64 decoding, records byte size from decoded content instead of client metadata, caps individual files at 10 MiB and an attachment request at 10 files/25 MiB decoded content. The server permits only signature-verified PDF, PNG, and JPEG files when their declared MIME type and filename extension also match. Unsupported types, malformed content, MIME spoofing, and PDFs containing active-content markers are rejected before persistence.
- Affects: Client tender submission validation and Postgres-backed TenderAttachment metadata. No schema migration or environment configuration change is required.
- Environment: no operator action. Existing stored attachments remain available under the authorised download controls; the new checks apply to new tender submissions.
- Validation: focused unit coverage verifies decoded-byte size derivation, MIME spoofing rejection, active PDF rejection, and aggregate limits. Run `npm run type-check` and `npm test` after dependencies are installed; editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Authorised Tender Attachment Access

- Changed: unlocked Retailer tender responses now include attachment metadata, and a dynamic `private, no-store` attachment download endpoint reads Postgres-backed bytes only after server-side authenticated role, Client ownership or Retailer match, and persisted Retailer unlock checks. Successful downloads create an audit event without recording file content or personal data.
- Affects: Retailer tender detail display/download links, Client attachment retrieval, tender visibility, and audit logs. No schema migration or environment configuration change is required.
- Environment: no operator action. Existing attachment content remains in PostgreSQL and is served directly without a public object URL.
- Validation: focused PostgreSQL access test covers locked Retailer denial, unlocked metadata/byte access, Client ownership access, and audit records; run with `npm test` after migrations and test database setup. Editor diagnostics and `git diff --check` remain required.

### 2026-09-02 - Pending Geographic Tender Matching Enforcement

- Changed: TenderMatch and TenderItemMatch creation now requires an exact configured Retailer category and raw tender-location coverage. Unlock and quote submission recheck the same server-side eligibility rule, denying legacy out-of-area match records.
- Affects: tender creation, Retailer coverage/category refresh, unlock payment initiation/finalisation, and quote submission. No schema migration or environment configuration change is required because coverage remains profile data.
- Environment: no operator action. Existing out-of-area match rows may be cleaned up separately, but cannot be used to unlock or quote.
- Validation: editor diagnostics and `git diff --check` passed. Focused unit coverage covers eligible, out-of-area, unsupported-category, and partial-category cases, but could not run locally because `tsx` is unavailable; run it after `npm ci`.

### 2026-09-02 - Pending PostgreSQL Message Contact-Release Integration Test

- Changed: added a `node:test`/`tsx` Prisma integration test for the Retailer message privacy boundary.
- Affects: CI PostgreSQL test database and the message/contact-release workflow; no application, schema, or environment configuration changes.
- Environment: CI must continue to apply Prisma migrations before `npm test`; the test uses unique fictional records and deletes them after each run.
- Validation: editor diagnostics and `git diff --check` passed. Local `npm run type-check` and the focused `tsx --test` command are blocked because dependencies are not installed (`tsc` and `tsx` are unavailable). CI runs `npm ci`, migrations, and `npm test`; the test verifies that a paid tender unlock does not permit messaging before a confirmed Client release payment and `ContactRelease`, then verifies read/send access after release.

### 2026-09-02 - Next.js 16 Upgrade Plan

- Changed: documented the required upgrade sequence; no framework dependency has been changed.
- Status: deferred until the development branch completes the upgrade work.
- Scope: upgrade `next`, `eslint-config-next`, and the Node runtime to the Next.js 16-supported release line in a dedicated branch. Assess NextAuth 4 compatibility before upgrading React or NextAuth.
- Required checks: use Node 20, regenerate Prisma client, run lint/type-check/tests/build, replay migrations, then validate login/logout, protected routes, role changes, Stripe webhooks, payment flows, file access, and middleware on staging.
- Environment: deploy to staging through the approved Render gate only. Keep a production rollback commit available until post-deployment verification completes.
- Audit note: `npm audit` on 2026-09-02 reports a high-severity direct Next.js advisory for versions below 15.5.10 and a separate Prisma/deepmerge transitive advisory; track the Prisma upgrade separately.

### 2026-09-02 - `97674dd` Shared Rate Limiting And Account Lockout

- Changed: PostgreSQL-backed, hashed-client rate limits; five failed password attempts lock an existing account for 15 minutes.
- Affects: database migration `20260902120000_add_shared_rate_limiting_and_login_lockout`, authentication, registration, password-reset, admin email-test, and page-view APIs.
- Environment: apply the migration. Set `RATE_LIMIT_HASH_SECRET` to a unique secret, or rate-limit identifiers fall back to `NEXTAUTH_SECRET`.
- Validation: editor diagnostics and whitespace checks passed. Run migration replay, type check, and rate-limit tests under Node 20.

### 2026-09-02 - `5429973` Active Session Claim Revalidation

- Changed: server session access reloads suspension, role membership, Owner, and Accountant flags; JWT lifetime is eight hours.
- Affects: all protected server pages and APIs using `getCurrentUser` or `requireRole`.
- Environment: no new configuration or migration.
- Validation: add and run suspension, role-revocation, and multi-role session tests.

### 2026-09-02 - `e676e12` Render-Gated Deployment Path

- Changed: Render auto-deploy disabled; protected GitHub workflows deploy approved SHAs through Render hooks.
- Affects: `render.yaml`, staging/production deployment workflows, release operations.
- Environment: `RENDER_STAGING_DEPLOY_HOOK` and `RENDER_PRODUCTION_DEPLOY_HOOK` are configured as protected GitHub environment secrets. Apply the blueprint and run an approved staging deployment.
- Validation: record a successful staging deployment and exact deployed SHA.

### 2026-09-02 - `6377097` Payment And Tender Workflow Controls

- Changed: recoverable Stripe webhook finalisation, payment reversal ledger and revocation, contact-release message gate, and tender expiry enforcement.
- Affects: database migration `20260902000000_add_payment_reversals`, Stripe webhook, payments, unlocks, releases, messaging, and quoting.
- Environment: apply the migration; enable Stripe refund and dispute webhook events.
- Validation: run PostgreSQL integration tests for retries, reversals, release gating, and closed/expired tenders.

### 2026-09-02 - `45c0dfd` Retailer Matching And Delivery District

- Changed: retailer match ranking uses raw server-side location; pre-unlock views show only broad area plus postcode district; full postcode remains restricted until unlock.
- Affects: retailer opportunity/dashboard/detail views and tender summary API.
- Environment: no migration; existing tender locations are formatted dynamically.
- Validation: run geography and retailer opportunity tests under Node 20.