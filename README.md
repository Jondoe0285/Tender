# Trade Tender: Action List

Detailed product scope: [business plan](docs/TradeTender-Business-Plan.md). Technical and release
procedures: [docs](docs/).

## Outstanding Actions

Nothing here is done yet. Work top to bottom — production config first, then engineering debt.

### Before Production

- [ ] **Set production environment variables.** Configure all `sync: false` values in
  [render.yaml](render.yaml), including separate Stripe, Resend, Sentry, and retention secrets.
  This requires authorized access to the Render dashboard; do not commit or share secret values in chat.
- [ ] **Configure Stripe.** Add live keys, register a production webhook at
  `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and
  chargeback handling.
- [ ] **Verify Resend for production.** Verify the sending domain, set `EMAIL_FROM`, and send an
  email-verification and contact-release test. Staging is already verified (2026-08-31).
- [ ] **Set `RETENTION_JOB_SECRET` and schedule the retention job** against the production
  `/api/internal/retention` endpoint.
- [ ] **Configure Sentry for production and confirm one test event.** Set browser/server DSNs and
  verify a scrubbed error event arrives. Staging is already verified.

### Engineering Work

- [ ] **Plan a tested Next.js 16 upgrade.** `npm audit` still reports high-severity advisories that
  cannot be fixed on the currently installed Next.js 14 line.
- [ ] **Add integration/E2E tests** for tender unlock, payment, webhook, contact release, and
  pre-payment privacy invariants.
- [ ] **Complete accessibility and real-device QA**, including the mobile sidebar and first-time
  Client/Retailer journeys.

## Completed

<details>
<summary>Security</summary>

- [x] **Revalidate session claims.** Protected server-side authorization now reloads the account's
  suspension, role membership, Owner, and Accountant flags from the database on every request.
- [x] **Add shared rate limiting and account lockout.** Rate-limit counters are stored in PostgreSQL
  using fixed windows and hashed request identities. Failed account sign-ins are locked for fifteen
  minutes after ten failures; successful sign-ins clear the lockout state.

</details>

<details>
<summary>PWA</summary>

- [x] **Make Trade Tender installable as a PWA.** Added the web app manifest, branded maskable
  icons, iOS web-app metadata, service-worker registration, and an offline fallback. The service
  worker caches only static assets and never caches API, payment, or authenticated page responses.

</details>

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
