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

### 2026-09-04 - Staging Deployment Branch Alignment

- Changed: aligned the approved staging deployment gate with the direct-to-`staging` workflow. It now requires the approved SHA to be the exact current `origin/staging` head rather than the `main` head, while retaining the protected staging environment, exact approval statement, clean PostgreSQL migration replay, production build, Render deploy hook, and post-deployment verification requirements.
- Affects: staging deployment authorization workflow only. No Render service, staging environment variable, deploy hook, database, credential, or application runtime configuration was changed.
- Environment: an authorized Render operator must add the missing `RENDER_STAGING_DEPLOY_HOOK` secret to the GitHub `staging` environment before deployment. The hook value is not recorded in this repository. Run the approved staging workflow only with the current staging SHA and its required approval statement.
- Validation: `npm run health:validate-workflows` and focused deployment-authorization tests pass.

### 2026-09-04 - Owner Password Verification Utility

- Changed: added `npm run db:verify-owner-password`, which prompts for an owner password without echoing it and compares it against the configured `PLATFORM_OWNER_EMAIL` account's existing hash. It reports only match or mismatch and never changes the user row, session state, or audit log.
- Affects: local development diagnostic workflow only. No account password, staging or production environment resource, integration setting, credential, or deployment configuration is changed.
- Environment: run the command in a terminal connected to the intended database. It is a non-destructive diagnostic and does not reset credentials.
- Validation: `npm run type-check` passes. The utility prompts without echoing the supplied password and reports only whether it matches; no account state is modified.

### 2026-09-04 - Preserve Existing Owner Passwords During Seeding

- Changed: stopped `prisma/seed.ts` from rewriting an existing `PLATFORM_OWNER_EMAIL` account's password hash. The seed retains role and account-status normalization, but only uses `PLATFORM_OWNER_PASSWORD` when creating a missing owner account. This prevents a routine seed against an existing development database from silently replacing an operator's known password.
- Affects: local development seed behavior and future owner password preservation only. No account password, database schema, migration, staging or production environment resource, integration setting, or deployment configuration was changed.
- Environment: existing owner passwords are intentionally preserved. Create a new local database or use the normal authenticated reset flow to establish a different password; do not use routine seeding as a password-reset mechanism.
- Validation: focused `npx tsx --test tests/lib/seed-owner-password.test.ts` and `npm run type-check` pass.

### 2026-09-03 - High-Severity Dependency Remediation

- Changed: upgraded Next.js and its matching ESLint/React toolchain from the vulnerable Next 14 release line to Next 16.3.4, React 19.2.8, ESLint 9, and the corresponding React type packages. Replaced the removed `next lint` command and legacy ESLint configuration with the supported flat configuration. Added a root dependency override for Prisma 6's vulnerable `deepmerge-ts` 7.1.5 transitive dependency, resolving it to 8.0.0 without downgrading the final Prisma 6 release.
- Changed: completed the required Next 16 compatibility migration. Dynamic API and Super User routes now await promise-based `params`. The login page is again a Server Component and delegates its interactive form to a dedicated Client Component, preventing the database-backed async footer from being bundled into the browser and restoring the sign-in page.
- Changed: made the shared footer client-safe for all interactive pages. It now obtains a minimal list of active footer partners from a public display-only endpoint rather than importing Prisma. This prevents Prisma from being bundled into the browser on registration, password-reset, and authenticated portal pages while retaining database-managed partner placement.
- Affects: application build/lint toolchain and dependency lockfile only. No application workflow, database schema, migration, payment, contact-release, or staging/production environment resource changes.
- Environment: Render already uses Node 20, which satisfies the Next 16 and Prisma runtime requirements. Local validation must use Node 20, 22, or 24; the current local Node 24 is supported by Prisma but not the repository's declared Node 20 release policy.
- Validation: `npm audit --audit-level=high` reports zero vulnerabilities. `npm run lint` passes with two pre-existing non-blocking warnings; `npm run type-check`, `npm test` (134 passing), and `npm run build` pass. Browser checks confirm login, registration, and password-reset pages render without async Client Component errors. The configured owner credentials complete the local NextAuth callback and redirect to `/super-user`. The build reports the existing `middleware`-to-`proxy` deprecation, which requires separate route-boundary regression testing before migration.

### 2026-09-03 - Staging Deployment Verification URL Repair

- Changed: corrected the staging deployment workflow so its verification job reads `STAGING_BASE_URL` directly within the protected staging environment. GitHub masks that environment value and omits it when it is exposed as a cross-job output, which previously passed an empty base URL to the non-destructive verifier after Render accepted the deployment hook.
- Affects: `.github/workflows/deploy-staging.yml` release verification only. No Render service, staging environment variable, credential, deploy hook, database, or application runtime configuration was changed.
- Environment: no operator action or environment-resource change is required. The next approved staging deployment continues to require its existing protected-environment approval and will use the already configured `STAGING_BASE_URL` value.
- Validation: `npm run health:validate-workflows` passes. The repair is based on failed approved staging deployment run `33648207019`, whose verifier exited before issuing any live probe because `--base-url` was empty.

### 2026-09-03 - Contractor Services And Operating Locations

- Changed: added company-level Contractor services and operating locations. The Contractor profile now lets the primary company user select approved tender catalogue service groups and UK counties or regions. The API validates every value server-side before storing the company-level lists; additional company users can view, but cannot change, shared company details.
- Affects: Prisma `ClientCompany`, migration `20260903040000_add_client_company_services_and_operating_locations`, Contractor profile API and UI. No matching eligibility, tender visibility, payment, contact-release, or external environment configuration changes.
- Environment: apply the new migration only through `prisma migrate deploy` after the required environment approval, backup/rollback evidence, and change-register release record. Existing Contractor companies receive empty lists.
- Validation: `npx prisma validate`, `npm run db:generate`, `npm run type-check`, and local `npm run db:deploy` pass.

### 2026-09-03 - Contractor And Professional Service Catalogue

- Changed: added the supplied initial construction service provisions to the tender catalogue. `Contractor Services` contains fourteen selectable categories covering civil engineering through workforce supply; `Professional Services` contains surveying/design/engineering and safety/compliance/consultancy. Each category starts with its supplied provision description and can be edited or deactivated through the existing Super User category editor, with active database overrides included in Contractor tender creation and server validation.
- Affects: Contractor tender and package selection, Provider capability matching categories, Super User category administration, and tender input validation. No schema migration, pricing, payment, contact-release, or environment configuration changes.
- Environment: no operator action required. Super Users may refine initial provisions through the existing categories administration surface.
- Validation: focused `npx tsx --test tests/lib/tender-schema.test.ts` passes (28 tests); `npm run type-check` passes.

### 2026-09-03 - Progressive Contractor Release-Fee Third Band

- Changed: extended the inactive percentage-based Contractor accepted-quote release fee with a third progressive band. The server now calculates 1% for the first £10,000, 0.5% for the next £90,000, and 0.25% for any remaining quote value, rounding the aggregate fee to whole pence. The Owner settings panel separately configures each rate. Fixed £10 release-fee mode remains the default approved active revenue model.
- Affects: platform fee settings, Owner configuration UI, release-payment fee calculation, and focused calculation coverage. No schema migration, payment integration, payment state, contact-release entitlement, or external environment configuration changes.
- Environment: no operator action is required while fixed fee mode remains active. An Owner must explicitly select percentage mode before new release payments use the progressive rates.
- Validation: focused `npx tsx --test tests/lib/tender-schema.test.ts` passes (27 tests); `npm run type-check` passes.

### 2026-09-03 - Phase 3 Job / Tender-Package Schema Foundation And Creation Flow

- Changed: introduced the initial `TenderPackage` data model as the schema foundation for the job/tender-package rework. Each package belongs to a parent `Tender` job, has its own package reference and package-scoped fields, and is stored with the same status and lifecycle semantics as the current tender record. Existing single-package tenders remain valid; migration backfill creates one package per existing tender so no historical data is lost. The contractor tender creation path now stores a package row for the primary tender item and one row per additional package item, ensuring the job record and package rows are created together instead of leaving the schema foundation unused.
- Affects: Prisma schema, generated client, migration `20260903030000_add_tender_packages`, `createTender` job creation, and package-first regression coverage. Matching engine, Provider unlock flow, quote flow, analytics filters, and production configuration remain pending Phase 3 work.
- Environment: migration applies only through Prisma migration deployment. Existing tender records are preserved and backfilled into package rows in the same deploy.
- Validation: `npx prisma validate`, `npx prisma generate`, the focused package-model regression test, `npm run type-check`, and `git diff --check` pass.

### 2026-09-03 - Phase 3 Package-Aware Matching And Provider Visibility

- Changed: completed the package-aware lifecycle update beyond the schema foundation. Matching eligibility now combines the parent job's package categories with line-item categories so a Provider is evaluated against the actual package mix rather than a single tender-level category bucket. The Provider opportunity summaries include package metadata (`packageCount`, `packageCategories`) so multi-package jobs are visible and ranked correctly. Unlocked tender detail and metadata now return package rows so a Provider sees the package makeup in the unlocked view instead of a legacy single-item tender description. The contractor creation flow already writes package rows for the main and additional line items during a single job submission, and the provider-side summaries now also reflect the package mix.
- Affects: `tenderService`, `listMatchedSummariesForRetailer`, job/tender detail API responses, retailer opportunity/detail UI, and tender creation package rows. Phase 3 is treated as complete for the implemented package-model lifecycle and matching visibility work; further package-level quote and analytics refinement remains a future enhancement if the product scope expands beyond the current branch.
- Environment: no new migration or external config changes required; this is application-layer rework only.
- Validation: `npm run type-check` and the focused package regression test pass. The last verification run reported `3` passing tests and `0` failures.

### 2026-09-03 - Phase 4 Subscription Tier Pricing Alignment

- Changed: finalised the inactive default membership tier catalog so the feature is ready for later activation without changing the live revenue model. The default list now includes `Free`, `Starter`, `Growth`, `Pro`, and `Enterprise` with the approved pricing structure (`£0`, `£29`, `£49`, `£99`, and `£199` for the enterprise default). The catalog is seeded in both the runtime app and the local Prisma seed, and any missing tier row is corrected back to the approved inactive state so the feature remains off until the Super User toggles it on.
- Affects: membership tier defaults, local seed data, and admin settings reads. No activation flag or revenue behavior is changed; `MEMBERSHIP_TIERS_ACTIVE` stays off unless explicitly toggled by the Owner.
- Environment: no production or staging config change required. Local seed and runtime seeding remain development-only defaults, with activation still controlled by the Owner platform setting.
- Validation: the focused membership pricing regression and the existing membership purchase gate test pass under the project test runner.

### 2026-09-03 - Phase 2 Initial Partner Records

- Changed: moved the approved HSQE Consult Hub logo into `public/images/HSQE_ConsultHub_Stacked_Light.png`, added migration `20260903020000_allow_partners_without_destination_url`, and seeded the three approved active footer partners idempotently: Sinclair Safety Solutions Ltd, Smart Works Civils Ltd, and HSQE Consult Hub. HSQE has no destination URL and is rendered as a non-clickable logo until one is approved; supplied partner links remain HTTPS-only.
- Affects: local Partner schema, approved public asset, local seed data, Partner administration validation, and footer rendering. No advertising cookies, payments, tracking, tender matching, quote ranking, or supplier-selection behavior changed.
- Environment: the nullable-destination migration and partner seed ran only against the configured local development database. Apply to staging or production only with the required approval, backup/rollback evidence, and recorded release validation.
- Validation: `npx prisma validate`, `npm run db:generate`, `npm run db:deploy`, and `npm run db:seed` pass. Local database verification confirms all three active `FOOTER` records in sort order, with `null` only for HSQE's destination URL. Focused Partner/footer tests, `npm run type-check`, `npm run lint`, editor diagnostics, and `git diff --check` pass.

### 2026-09-03 - Phase 2 Server-Rendered Footer Partners

- Changed: replaced the hardcoded footer partner links with a server-rendered query of active `Partner` records scoped to the `FOOTER` display location and ordered by configured sort order then name. The footer displays the section only when active partners exist, labels it "Partner advertising", and keeps the required statement that advertising is separate from tender matching, quote ranking, supplier selection, and Contractor decisions.
- Affects: public footer rendering and Partner database reads only. No partner records were created, no advertising settings/cookies/payments were activated, and no tender matching, quote ranking, or supplier-selection behavior changed.
- Environment: no operator action.
- Validation: `npm run type-check`, focused `npx tsx --test tests/lib/site-footer-partners.test.ts`, `npm run lint`, editor diagnostics, and `git diff --check` pass. `npm run build` remains blocked by the previously recorded unrelated missing `pdf-lib` files in `node_modules`.

### 2026-09-03 - Phase 2 Partner Administration

- Changed: added full Super User-only partner management at `/super-user/partners` and `/api/super-user/partners`. The server validates each strict create, update, activation, and reorder request, rejects cross-origin mutations, validates a complete current location ordering before changing it, and writes transaction-backed minimal audit events for every change.
- Affects: Partner administration UI and API plus `AuditLog` records. No partner rendering, advertising placement or activation, cookies, tender matching, quote ranking, supplier selection, payments, database migration, seed data, or environment configuration changed.
- Environment: no operator action.
- Validation: focused `npx tsx --test tests/lib/partner-schema.test.ts`, `npm run type-check`, `npm run lint`, and `git diff --check` pass.

### 2026-09-03 - Phase 2 Partner Model And Migration

- Changed: added the inactive-by-default `Partner` model and PostgreSQL migration `20260903010000_add_partners`. Each partner has a unique name, approved logo path, destination URL, display location, optional campaign source, stable sort order, active status, and timestamps. The location/active/order index supports the later server-rendered placement query and Super User reorder control.
- Affects: local database schema and generated Prisma client only. No partner records, advertising placement, Super User UI, payment behavior, cookies, or environment configuration were activated or changed.
- Environment: migration applied only to the configured local development database through `npm run db:deploy`. Apply to staging or production only with the required approval, rollback evidence, and recorded release validation.
- Validation: `npx prisma validate`, `npm run db:generate`, and local `npm run db:deploy` pass with no schema diagnostics.

### 2026-09-03 - Phase 1 Documentation Alignment

- Changed: aligned active documentation and repository instructions with the completed Contractor/Provider role terminology. Updated the Phase 1 README checklist and active product, security, architecture, readiness, brand, and advertising documentation. No application code, Prisma schema or migrations, environment resource, or historical change-register entry was changed.
- Affects: active documentation and contributor instructions only, including current outstanding-action terminology. Technical lowercase routes, model/field identifiers, and earlier historical records remain unchanged where they are implementation or audit references.
- Environment: no operator action.
- Validation: active-document terminology scans confirm that any remaining Client/Retailer matches are only generic technical usage, preserved legacy route/model references, or earlier historical records. `git diff --check` passes.

### 2026-09-03 - Phase 1 Persisted Role Enum Rename

- Changed: renamed PostgreSQL `Role` values `CLIENT` to `CONTRACTOR` and `RETAILER` to `PROVIDER` using in-place `ALTER TYPE ... RENAME VALUE` statements in `prisma/migrations/20260903000000_rename_role_enum_values/migration.sql`. Updated `prisma/schema.prisma`, executable TypeScript role checks/types, authentication session handling, registration payload validation, administration permissions, email recipient roles, local seed data, and test fixtures. `SUPER_USER` remains unchanged. Legacy database relation/model/column names, `/api/client` and `/api/retailer` endpoints, and `/client` and `/retailer` redirect paths remain unchanged by design.
- Affects: `User.role`, `UserRole.role`, authenticated workspace authorization, registration, role-scoped APIs, email notifications, local seed data, and tests. The enum-label rename preserves existing role-column data.
- Environment: apply only through Prisma migration deployment, never `db push`. For local development, use the direct local-only `DATABASE_URL_UNPOOLED` connection. Do not apply this migration to staging or production without the separately required approval, backup/rollback evidence, and recorded release validation.
- Validation: the migration applied successfully through `npm run db:deploy` to the configured local development database. `npm run db:generate`, `npm run type-check`, `npm run lint`, and `git diff --check` pass. The focused workspace/admin tests pass. The full suite has 120 passing tests; five unrelated existing integration-test failures remain because immutable `AuditLog` cleanup is rejected and placeholder local Stripe/Resend credentials cannot process external payment/email calls. No old role enum literals remain in source, local seed data, or tests.

### 2026-09-03 - Phase 1 Contractor And Provider Route Aliases

- Changed: added protected `/contractor` and `/provider` canonical portal aliases. Middleware applies the existing `CLIENT`/`RETAILER` role checks to both legacy and canonical prefixes, redirects authenticated legacy `/client` and `/retailer` requests to their canonical equivalents, and rewrites authorised canonical requests to the existing portal route trees. Shared navigation and role workspaces now target the canonical paths, and validated page-view tracking accepts both canonical and legacy prefixes.
- Affects: protected portal routing, navigation, and analytics path validation. No role enum, database schema, API contract, authorization policy, payment/release control, or environment configuration changed.
- Environment: no operator action.
- Validation: `npm run type-check` passes. A local development server compiled the middleware; unauthenticated requests to `/contractor`, `/provider`, `/client`, and `/retailer` all returned an authentication redirect with the expected callback path. `npm run build` remains blocked by pre-existing missing `pdf-lib/es/core/objects/PDF*` files in `node_modules`, unrelated to this change.

### 2026-09-03 - Phase 1 User-Facing Role Terminology

- Changed: renamed user-facing Client/Retailer labels and copy to Contractor/Provider across public pages, rendered policies, shared portal navigation and workspaces, registration, Super User administration and reporting, membership UI, tender messaging, and operational email templates. Legacy `CLIENT`/`RETAILER` role values, database columns, API/query names, and `/client`/`/retailer` routes are intentionally unchanged until their dedicated later Phase 1 checklist actions.
- Affects: user-visible application copy and outgoing notification copy only. No authorization logic, schema, API contract, environment configuration, or payment/release control changed.
- Environment: no operator action.
- Validation: `npm run type-check` passes after each implementation batch; `npm run lint` passes with no warnings or errors; `git diff --check` passes.

### 2026-09-03 - Four Quick-Win Outstanding Actions Completed

- Changed: fixed 4 small, self-contained items from the README Outstanding Actions list. Corrected the tender-creation upload copy so it no longer implies Retailers can preview attachments before unlock ([src/app/client/tenders/new/page.tsx](../src/app/client/tenders/new/page.tsx)). Replaced the plain-text initial password field on the Super User creation form with the shared `PasswordInput` reveal control ([src/components/admin/OwnerConsolePanel.tsx](../src/components/admin/OwnerConsolePanel.tsx)). Moved the quote comparison table/card breakpoint from `md` to `lg` so tablet widths use the condensed card layout instead of forcing horizontal scroll ([src/components/quotes/QuoteComparison.tsx](../src/components/quotes/QuoteComparison.tsx)). Added Escape-to-close and Tab focus trapping to the mobile navigation dialog ([src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx)).
- Affects: UI copy and layout only. No schema, API, or environment changes.
- Environment: no operator action.
- Validation: `npm run type-check` and `npm run lint` pass. No behavioral/schema change, so no new automated test was required; manual keyboard/tablet verification recommended before the next staging deploy.

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

### 2026-09-02 - Add HSQE Consult Hub As Third Named Partner

- Changed: added HSQE Consult Hub as a third clearly labelled partner alongside Sinclair Safety Solutions Ltd and Smart Works Civils Ltd. HSQE Consult Hub does not yet have a website, so its logo is displayed without an outbound link (no `<a>` wrapper) until one is provided.
- Affects: [src/components/layout/SiteFooter.tsx](../src/components/layout/SiteFooter.tsx) (new logo tile), `public/images/HSQE Consult Hub Logo.png` (copied from the supplied `docs/branding/HSQE_ConsultHub_Stacked_Light.png`), [docs/TradeTender-Business-Plan.md](TradeTender-Business-Plan.md), [docs/branding/TradeTender-Brand-Rules.md](branding/TradeTender-Brand-Rules.md), [docs/Product-Requirements.md](Product-Requirements.md) (FR-090), and [docs/PRODUCTION-READINESS-REVIEW.md](PRODUCTION-READINESS-REVIEW.md).
- Environment: no operator action; no environment resource, credential, or database change. Static UI/content change only.
- Validation: `npm run type-check` and `npm run lint` pass. Add a website link once HSQE Consult Hub provides one.

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