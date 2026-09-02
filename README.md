# Trade Tender: Action List

Detailed product scope: [business plan](docs/TradeTender-Business-Plan.md). Technical and release
procedures: [docs](docs/).

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
- [ ] **Plan a tested Next.js 16 upgrade.** `npm audit` still reports high-severity advisories that
  cannot be fixed on the currently installed Next.js 14 line.
- [ ] **Add integration/E2E tests** for tender unlock, payment, webhook, contact release, and
  pre-payment privacy invariants.
- [ ] **Complete accessibility and real-device QA**, including the mobile sidebar and first-time
  Client/Retailer journeys.
- [ ] **Restrict matching to eligible geographic coverage.** Tender matches are currently created
  by category only; location restricts notification emails but not visibility, payment, or quoting.
  Apply coverage rules when creating and refreshing matches, and test that out-of-area Retailers
  cannot view, unlock, or quote a tender.
- [ ] **Deliver authorised post-unlock attachment access.** Tender attachments are stored but are
  absent from the unlocked tender response and have no protected download path. Add a no-store,
  audited download endpoint that requires the matched Retailer unlock, with retention-aware access
  tests.
- [ ] **Harden tender attachment validation and request limits.** Validate decoded byte length rather
  than client-supplied metadata, impose aggregate request limits, and accept only a small
  server-verified file-type/signature allowlist. Test size mismatches, MIME spoofing, active
  content, and aggregate limits.
- [ ] **Add auditable legal holds to retention.** The 30-day purge deletes unaccepted quotes and
  unlocked attachments without a dispute, investigation, or legal-hold exclusion. Add migration-
  backed hold metadata and events, exclude held data from purge queries, and test hold lifecycle
  and retention decisions.
- [ ] **Gate inactive membership allowances.** Existing active membership tiers can grant free
  tender unlocks even while membership functionality is disabled, conflicting with the active
  pay-per-unlock pricing model. Remove or feature-gate membership entitlement calculation until
  formally approved; test existing-tier behaviour while disabled.
- [ ] **Correct future membership payment pricing before activation.** Membership payment creation
  currently disregards the tier amount and uses the Client release fee. Keep memberships inactive
  and, before activation, calculate the validated server-side tier price with explicit payment
  support and billing tests.
- [ ] **Complete contact-release audit records.** Record both party IDs, released-data category,
  release timestamp, authorising payment, and correlation ID; minimise avoidable personal data and
  test the immutable event contents.
- [ ] **Improve audit-log tamper resistance.** Audit events are normal application writes with no
  database-level immutability boundary. Restrict writes to a dedicated role and add database
  protections or a ledger-style mechanism appropriate to the retention requirement.
- [ ] **Expand Super User reporting filters and exports.** Required Client, Retailer, tender/quote
  identifier, status, payment status, value-band, and subscription-plan filters are missing.
  Extend the authorised query, dashboard, and export paths with integration coverage.
- [ ] **Fix shared control colour tokens and contrast.** Tailwind maps Trade Blue and Sky Blue to
  misleading token names, producing non-compliant action hierarchy and insufficient text contrast.
  Introduce approved colour tokens, correct button foregrounds, and check all UI states against
  WCAG contrast requirements.
- [ ] **Make Retailer coverage selection keyboard accessible.** The multi-select trigger is a
  non-focusable `div` without roles, keyboard interaction, or popup state. Replace it with a native
  control or complete accessible listbox pattern and test keyboard and screen-reader use.
- [ ] **Correct staged-privacy copy in tender creation.** The upload guidance says Retailers can
  review drawings and site photos before unlock, contradicting platform policy. State clearly that
  attachments and full specifications become available only after server-confirmed unlock.
- [ ] **Separate sponsored content from quote comparison.** Sponsored Retailer quotes are displayed
  beside price and lead-time data immediately above the decision workflow, contrary to advertising
  governance. Move advertising to a clearly labelled partner-information surface outside ranking
  and supplier selection.
- [ ] **Fix mobile navigation dialog behaviour.** Add Escape dismissal, focus trapping, and opener
  focus restoration; test keyboard navigation in the mobile sidebar.
- [ ] **Keep quote comparison usable at tablet widths.** The desktop table activates at `md` with a
  900px minimum width, forcing horizontal scrolling alongside the sidebar. Use a
  container-appropriate breakpoint or condensed comparison layout.
- [ ] **Protect initial administrator-created passwords.** The Super User account form renders the
  password in plain text. Use a password field with a deliberate reveal control or an invitation
  flow so administrators do not handle credentials unnecessarily.
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
