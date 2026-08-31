# Trade Tender: Action List

Detailed product scope: [business plan](docs/TradeTender-Business-Plan.md). Technical and release
procedures: [docs](docs/).

## Do Now

- [ ] **Verify staging after the database migration.** Reload `/super-user` on `Tender Staging` and
  confirm `Tender.supplyDate` no longer raises `P2022`. The database configured in local `.env` has
  been migrated; confirm the Render service uses that same Neon database.
- [ ] **Confirm `Tender Staging` has successfully deployed the latest `staging` commit.** Inspect the
  Render build log. It must show `prisma migrate deploy` completing before the build. Trigger a
  manual deploy if no successful deploy has run.
- [ ] **Confirm staging environment variables in Render.** Set `DATABASE_URL` (pooled Neon URL),
  `DATABASE_URL_UNPOOLED` (direct Neon URL), `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` to the exact
  staging public origin. A wrong `NEXTAUTH_URL` can redirect users to `localhost:10000`.
- [ ] **Rotate the Neon database password.** The current credential has been used locally and must be
  treated as exposed. Update both database URL variables immediately after rotation.
- [ ] **Separate staging and production databases.** Use distinct Neon projects or branches and
  distinct pooled/direct connection URLs. Do not permit staging to modify the production database.

## Before Production

- [ ] **Review and merge [PR #4](https://github.com/Jondoe0285/Tender/pull/4) into `main`.** It carries
  PostgreSQL-valid migrations, the Render redirect fix, and security fixes. `Trade Tender` deploys
  from `main`; `Tender Staging` deploys from `staging`.
- [ ] **Deploy `main` in Render and verify migrations.** The build log must list all outstanding
  Prisma migrations as applied. If the production database differs from staging, run
  `npx prisma migrate deploy` with its direct URL after taking a backup. Never run `prisma db push`
  against production.
- [ ] **Set production environment variables.** Configure all `sync: false` values in
  [render.yaml](render.yaml), including separate Stripe, Resend, Sentry, and retention secrets.
- [ ] **Configure Stripe.** Add live keys, register a production webhook at
  `/api/webhooks/stripe`, store its signing secret, then test payment confirmation, refund, and
  chargeback handling.
- [ ] **Verify Resend.** Verify the sending domain, set `EMAIL_FROM`, and send an email-verification
  and contact-release test from each environment.
- [ ] **Set `RETENTION_JOB_SECRET` and schedule the retention job** against the production
  `/api/internal/retention` endpoint.
- [ ] **Configure Sentry and confirm one test event.** Set browser/server DSNs and verify that the
  production environment receives a scrubbed error event.

## Engineering Work

- [ ] **Add durable object storage for attachments.** Render's filesystem is ephemeral, which breaks
  30-day quote retention and five-year accepted-quote retention.
- [ ] **Revalidate session claims and shorten session lifetime.** Suspended accounts and revoked Owner
  flags currently remain effective in a JWT until the default NextAuth expiry.
- [ ] **Move rate limiting to shared storage and add per-account lockout.** The current in-process,
  IP-only limiter does not protect across Render instances or deployment restarts.
- [ ] **Plan a tested Next.js 16 upgrade.** `npm audit` still reports high-severity advisories that
  cannot be fixed on the currently installed Next.js 14 line.
- [ ] **Implement misuse and fraud monitoring** for repeated parties, unusual payment activity, and
  duplicate or near-duplicate tenders.
- [ ] **Add integration/E2E tests** for tender unlock, payment, webhook, contact release, and
  pre-payment privacy invariants.
- [ ] **Complete accessibility and real-device QA**, including the mobile sidebar and first-time
  Client/Retailer journeys.

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
