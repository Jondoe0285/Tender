# Trade Tender: Action List

Detailed product scope: [business plan](docs/TradeTender-Business-Plan.md). Technical and release
procedures: [docs](docs/).

## New Business Plan Implementation Plan

The 2026-09-03 baseline business plan resolved 10 open decisions (see the "Baseline Change Notes"
section of [the business plan](docs/TradeTender-Business-Plan.md)). Four of them require code
changes; this is their phased delivery plan. Work top to bottom — each phase should ship, be
verified in staging, and be reflected in the Implementation Change Register before the next phase
starts, since later phases depend on earlier ones.

### Phase 1: Contractor / Provider Terminology Rename

Pure rename per decision #1: `Contractor` = current `Client`, `Provider` = current `Retailer`. No
new roles, no permission-model change.

- [ ] **Rename user-facing labels and copy** across portals, emails, and policies from
  Client/Retailer to Contractor/Provider, without touching the `Role` enum or routes yet.
- [ ] **Add route aliases with redirects.** Introduce `/contractor` and `/provider` portal routes
  that render the existing `/client` and `/retailer` pages, then redirect the old paths so no
  existing link or bookmark breaks.
- [ ] **Rename the `Role` enum and database columns in a dedicated migration** (`CLIENT` →
  `CONTRACTOR`, `RETAILER` → `PROVIDER`), updating every `requireRole` check, seed data, and test
  fixture in the same change. Do this only after Phase steps above are verified in staging, since
  it is the highest-risk, hardest-to-roll-back step.
- [ ] **Update all documentation** (`docs/`, `.github/copilot-instructions.md`,
  `docs/Security-Requirements.md`, `docs/Product-Requirements.md`) to drop the "renamed from"
  transitional note once the rename is live everywhere.

### Phase 2: Active Partner Advertising

Approved per decision #5: move from static footer logos to a Super-User-managed system.

- [ ] **Add a `Partner` model and migration**: name, logo path, destination URL, display location,
  active status, and campaign source.
- [ ] **Build Super User CRUD screens** to create, edit, activate/deactivate, and reorder partners,
  audit-logged per change (matching the existing admin patterns in `/super-user`).
- [ ] **Replace the hardcoded partner block in `SiteFooter.tsx`** with a server-rendered list of
  active partners from the database, preserving the "clearly labelled as advertising" requirement
  and the separation from tender matching/quote ranking.
- [ ] **Migrate existing partners** (Sinclair Safety Solutions Ltd, Smart Works Civils Ltd, HSQE
  Consult Hub) into the new table as the initial seeded rows.

### Phase 3: Job / Tender-Package Data Model

Approved per decision #2 — the largest change: a job splits into multiple independently-matched
tender packages by category.

- [ ] **Design the schema**: a `TenderPackage` (or similar) model with a one-to-many relation from
  the job/tender, each package carrying its own category, subcategory, requirement detail, match
  set, unlock state, and quotes. Confirm with the Super User whether existing `Tender` becomes the
  "job" and packages are a new child entity, or whether naming changes further.
- [ ] **Write the migration and backfill**, converting every existing single-category `Tender` into
  a job with exactly one package, so no historical data is lost.
- [ ] **Rework the matching engine** to match Providers per package (category + capability +
  location) instead of per whole tender.
- [ ] **Update the Contractor job-creation form** to select multiple package types per job (per
  Section 4.1/10.2 of the business plan) instead of a single category/subcategory.
- [ ] **Update Provider-facing views, unlock, and quote submission** to operate per package rather
  than per tender, including pre-unlock summaries scoped to the relevant package only.
- [ ] **Update Super User analytics filters** to add package-level reporting alongside existing
  tender-level reporting.
- [ ] **Add regression tests** covering multi-package jobs, per-package matching, and per-package
  unlock/quote isolation (a Provider unlocking one package must not see another package's details).

### Phase 4: Subscription Tier Pricing Alignment

Confirmed per decision #10 — no activation yet, just keep the inactive feature ready with the
final agreed prices.

- [ ] **Update the inactive subscription tier constants/seed data** to Free £0, Starter £29, Growth
  £49, Pro £99, Enterprise £149–199, so the feature is correct whenever the Super User activates it.
  No other behavior change; `MEMBERSHIP_TIERS_ACTIVE` (or equivalent) stays off.

## Outstanding Actions

Work top to bottom — production config first, then engineering debt. Items that state
"implementation complete" remain open until their listed validation evidence is recorded.

### Before Production

- [ ] **Set production environment variables.** Configure all `sync: false` values in
  [render.yaml](render.yaml), including separate Stripe, Resend, Sentry, and retention secrets.
- [ ] **Configure Stripe.** Add live keys, register a production webhook at
  `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and
  chargeback handling.
- [ ] **Verify Resend for production.** Verify the sending domain, set `EMAIL_FROM`, and send an
  email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] **Set `RETENTION_JOB_SECRET` and schedule the retention job** against the production
  `/api/internal/retention` endpoint.
- [ ] **Configure Sentry for production and confirm one test event.** Set browser/server DSNs and
  verify a scrubbed error event arrives. Staging is already verified.
- [ ] **Repair Stripe webhook finalisation before production.** Implementation complete in
  `6377097`: retries of the same signed event resume idempotent entitlement finalisation and avoid
  duplicate payment/unlock audit records. Outstanding: add and run retry and partial-failure
  recovery tests against PostgreSQL.
- [ ] **Handle Stripe refunds and disputes.** Implementation complete in `6377097`: a migration-backed
  reversal ledger records signed Stripe refund/dispute events, marks the payment reversed, removes
  paid unlock/contact-release entitlements, audits the change, and notifies affected parties.
  Outstanding: apply the migration in staging and test refunds, chargebacks, duplicate events, and
  out-of-order delivery.
- [ ] **Block pre-release Client-Retailer messaging.** Implementation complete in `6377097`: message
  reads and sends now require a matching confirmed `ContactRelease` at the server boundary.
  Outstanding: add and run release-state and obfuscated-contact regression tests.
- [ ] **Prevent expired or closed tender activity.** Implementation complete in `6377097`: unlock
  requests, paid-unlock finalisation, and quote submission now recheck `OPEN` status and deadline
  server-side. Outstanding: add and run expiry and closure regression tests.
- [ ] **Make deployment gates govern Render, not Azure.** Implementation and hook configuration
  complete in `e676e12`: Render auto-deploy is disabled and protected staging/production workflows
  invoke separate Render deploy hooks for the approved SHA. Outstanding: run one approved staging
  deployment and verify that the recorded deployment matches the requested commit.
- [ ] **Re-run release validation against the deployed staging SHA.** The current health-check record
  predates the staging tip. Re-run CI, PostgreSQL migration replay, workflow checks, and staging
  verification for the exact deployed commit; require the recorded SHA as release evidence.

### Engineering Work

- [ ] **Revalidate session claims and shorten session lifetime.** Implementation complete in
  `5429973`: each server session lookup reloads suspension, active role membership, Owner, and
  Accountant state; JWT lifetime is capped at eight hours. Outstanding: add and run session
  revocation and multi-role regression tests.
- [ ] **Move rate limiting to shared storage and add per-account lockout.** The current in-process,
  IP-only limiter does not protect across Render instances or deployment restarts.
- [ ] **Plan a tested Next.js 16 upgrade.** Deferred: complete the dependency upgrade first in the
  development branch. The plan is recorded in
  [Implementation-Change-Register.md](docs/Implementation-Change-Register.md); retain its Node 20,
  migration replay, build, and staging verification requirements before deployment.
- [ ] **Add integration/E2E tests** for tender unlock, payment, webhook, contact release, and
  pre-payment privacy invariants. Initial PostgreSQL coverage is in
  `tests/lib/message-contact-release.integration.test.ts`: it verifies that a Retailer with a
  tender unlock cannot read or send messages until the Client release payment is confirmed and
  the matching contact-release record exists. Payment, webhook, reversal, and other workflow
  scenarios remain outstanding.
- [ ] **Complete accessibility and real-device QA**, including the mobile sidebar and first-time
  Client/Retailer journeys.
- [x] **Restrict matching to eligible geographic coverage.** Implemented: tender and tender-item
  matches now require exact Retailer category capability and raw tender-location coverage at
  creation and retroactive refresh. Unlock and quote server boundaries recheck those controls, so
  legacy out-of-area match rows cannot grant paid access or permit quote submission.
- [x] **Deliver authorised post-unlock attachment access.** Unlocked Retailer tender responses now
  include attachment metadata only, and a dynamic, no-store download endpoint rechecks the matched
  Retailer unlock before returning Postgres-backed bytes. Owning Clients may also retrieve their own
  attachments. Successful downloads are audited; focused PostgreSQL coverage verifies locked Retailers
  cannot obtain metadata or bytes and deleted attachments are no longer accessible.
- [x] **Harden tender attachment validation and request limits.** Tender creation now verifies strict
  base64 decoding, derives stored size from decoded bytes, limits each attachment to 10 MiB and each
  request to 10 attachments/25 MiB total, and permits only signature-verified PDF, PNG, and JPEG
  files whose MIME type and extension match. Active PDF markers, unsupported types, malformed base64,
  and MIME spoofing are rejected server-side.
- [x] **Add auditable legal holds to retention.** Migration-backed Tender, Quote, and TenderAttachment
  holds require a documented reason and full Super User authorisation. Create/release events are
  audited; active direct and tender-level holds exclude unaccepted quotes and attachments from the
  30-day purge.
- [x] **Gate inactive membership allowances.** Membership tender allowances now require the
  Super User `MEMBERSHIP_TIERS_ACTIVE` setting. Existing active tiers cannot bypass the current
  pay-per-unlock model while the feature is disabled; focused PostgreSQL coverage verifies the
  disabled-setting path creates a pending unlock payment without releasing tender details.
- [x] **Correct future membership payment pricing before activation.** Membership payments now
  resolve the active tier's monthly price at the server payment boundary, rather than accepting a
  caller-provided amount or using the Client release fee. Membership tiers remain disabled by
  default; focused PostgreSQL billing coverage verifies the disabled gate and tier net/VAT/gross
  payment values.
- [x] **Complete contact-release audit records.** Each release now creates a transaction-backed,
  immutable event recording the actor, both party IDs, tender/quote IDs, released-data category,
  release timestamp, authorising payment, and correlation ID. Event records contain no contact
  details; PostgreSQL rejects later update or deletion attempts.
- [ ] **Improve audit-log tamper resistance.** Deferred: complete this migration-backed work in
  the development branch before promotion. Use an append-only database boundary that permits
  application inserts but rejects unauthorised updates and deletes, with integration coverage.
- [x] **Expand Super User reporting filters and exports.** Full Super Users can filter aggregate
  analytics and CSV exports by Client, Retailer, tender/quote reference, category, geography,
  tender/quote status, date, quoted-value band, membership/subscription plan, and payment status.
  All query inputs are schema-validated server-side; exports retain aggregate-only data and exclude
  restricted Accountant sub-accounts.
- [ ] **Fix shared control colour tokens and contrast.** Tailwind maps Trade Blue and Sky Blue to
  misleading token names, producing non-compliant action hierarchy and insufficient text contrast.
  Introduce approved colour tokens, correct button foregrounds, and check all UI states against
  WCAG contrast requirements.
- [ ] **Make Retailer coverage selection keyboard accessible.** The multi-select trigger is a
  non-focusable `div` without roles, keyboard interaction, or popup state. Replace it with a native
  control or complete accessible listbox pattern and test keyboard and screen-reader use.
- [x] **Correct staged-privacy copy in tender creation.** Fixed: the upload guidance now states
  attachments and full specifications become available only after server-confirmed unlock, instead
  of implying Retailers can review them beforehand.
- [ ] **Separate sponsored content from quote comparison.** Sponsored Retailer quotes are displayed
  beside price and lead-time data immediately above the decision workflow, contrary to advertising
  governance. Move advertising to a clearly labelled partner-information surface outside ranking
  and supplier selection.
- [x] **Fix mobile navigation dialog behaviour.** Fixed: the mobile sidebar dialog now closes on
  Escape, traps Tab focus within the drawer while open, and restores focus to the opener/drawer on
  toggle.
- [x] **Keep quote comparison usable at tablet widths.** Fixed: the desktop comparison table now
  activates at `lg` instead of `md`, so tablet widths use the condensed card layout instead of
  forcing horizontal scroll.
- [x] **Protect initial administrator-created passwords.** Fixed: the Super User account creation
  form now uses the shared `PasswordInput` control with a deliberate reveal toggle instead of a
  plain-text field.
- [ ] **Make the shared combobox announce the active option.** It changes a private active index
  without `aria-activedescendant` or stable option IDs. Implement the ARIA combobox pattern or use
  a tested accessible primitive.
- [ ] **Make high-risk staging verification mandatory.** The deployment verifier can pass while
  payment/webhook reconciliation, audit access, email delivery, and error monitoring remain
  unverified. Require explicit staging attestations for each before promotion.
- [ ] **Establish production capacity and availability evidence.** Free-tier Render services have no
  demonstrated path to the required 1,000 concurrent users. Select an appropriate plan, document
  connection/scaling limits, configure alerts, and pass representative load and recovery tests.

## Completed

<details>
<summary>Do Now</summary>

- [x] **Verify staging after the database migration.** Reload `/super-user` on `Tender Staging` and
  confirm `Tender.supplyDate` no longer raises `P2022`. The database configured in local `.env` has
  been migrated; confirm the Render service uses that same Neon database.
- [x] **Confirm `Tender Staging` has successfully deployed the latest `staging` commit.** Inspect the
  Render build log. It must show `prisma migrate deploy` completing before the build. Trigger a
  manual deploy if no successful deploy has run.
- [x] **Confirm staging environment variables in Render.** Set `DATABASE_URL` (pooled Neon URL),
  `DATABASE_URL_UNPOOLED` (direct Neon URL), `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` to the exact
  staging public origin. A wrong `NEXTAUTH_URL` can redirect users to `localhost:10000`.
- [x] **Rotate the Neon database password.** The current credential has been used locally and must be
  treated as exposed. Update both database URL variables immediately after rotation.
- [x] **Separate staging and production databases.** Use distinct Neon projects or branches and
  distinct pooled/direct connection URLs. Do not permit staging to modify the production database.

</details>

<details>
<summary>Before Production</summary>

- [x] **Review and merge [PR #4](https://github.com/Jondoe0285/Tender/pull/4) into `main`.** It carries
  PostgreSQL-valid migrations, the Render redirect fix, and security fixes. `Trade Tender` deploys
  from `main`; `Tender Staging` deploys from `staging`. Merged 2026-08-31.
- [x] **Deploy `main` in Render and verify migrations.** The build log must list all outstanding
  Prisma migrations as applied. If the production database differs from staging, run
  `npx prisma migrate deploy` with its direct URL after taking a backup. Never run `prisma db push`
  against production.

</details>

<details>
<summary>Engineering Work</summary>

- [x] **Add durable object storage for attachments.** Not needed: `TenderAttachment.content` is
  already stored as `Bytes` directly in Postgres (see `tenderService.ts`), not on Render's ephemeral
  filesystem.
- [x] **Implement misuse and fraud monitoring** for repeated parties, unusual payment activity, and
  duplicate or near-duplicate tenders. Implemented in `complianceMonitoringService.ts`
  (confidentiality-bypass attempts, duplicate tenders, unlock-without-quote) and surfaced at
  `/super-user/compliance`.

</details>

## Routine Checks

Run before opening a pull request or deploying:

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run health:audit
npm run health:validate-workflows
```

`health:audit` writes its report to `docs/health-check/` and validates migrations against PostgreSQL.

## Reference

- [Render blueprint](render.yaml)
- [Environment template](.env.example)
- [Business plan](docs/TradeTender-Business-Plan.md)
- [Architecture](docs/Architecture.md)
- [Security requirements](docs/Security-Requirements.md)
- [Health-check and release workflow](docs/health-check/README.md)
