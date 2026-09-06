# Staging Stress Testing

Trade Tender provides a manual `npm run stress-test` command and a manually dispatched `Staging Stress Test` workflow.

## Safe usage

The runner is intended for a dedicated staging environment. It refuses production-looking hosts unless `STRESS_TEST_ALLOW_PRODUCTION=true` is explicitly set. Do not run mutation-enabled scenarios against production or a shared customer-data database.

```powershell
$env:STRESS_TEST_BASE_URL = 'https://your-staging-host'
$env:STRESS_TEST_LEVELS = '100,500,1000'
$env:STRESS_TEST_SUSTAINABLE_SECONDS = '20'
npm run stress-test
```

The command performs public health and authentication-boundary load probes, unsigned-webhook rejection, a maximum sustainable-load run, local runner resource measurements, and optional isolated PostgreSQL temporary-table checks. Use a dedicated database by setting `STRESS_TEST_DATABASE=true` and `STRESS_TEST_DATABASE_URL`.

## Reports

Each run writes `stress-test-results/` containing:

- `stress-test-report.json`
- `performance-report.md`
- `security-report.md`
- `failing-tests.md`
- `recommendations.md`
- `bottlenecks.md`
- `launch-readiness.md`
- `launch-readiness.json`

The assessment is `PASS`, `PASS WITH RISKS`, or `FAIL`, with Critical, High, Medium, and Low findings. The runner deliberately reports credentialed workflows, real payment scenarios, notification delivery, remote CPU/memory, database pool usage, queue processing, failure injection, and provider-side telemetry as `UNVERIFIED` unless dedicated staging fixtures and instrumentation are supplied. An unverified result is not release approval.

## Release evidence still required

A release owner must attach Render/Neon resource metrics, Stripe test-mode event evidence, Resend delivery evidence, Sentry evidence, queue/worker metrics, database connection usage, backup/recovery results, and authenticated Contractor/Provider workflow results. Use synthetic accounts and records with an agreed cleanup plan.
