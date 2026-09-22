
The staging stress-test harness is available as `npm run stress-test`. It produces performance, security, bottleneck, failure, recommendation, coverage, and launch-readiness reports under `stress-test-results/`; it must be run against a dedicated staging target with provider telemetry and synthetic credentials supplied separately.
# Production Release Outstanding Action List

**Review date:** 2026-09-05  
**Branch and commit reviewed:** `staging` at `dcd83cb`  
**Release decision:** **BLOCKED** pending the Critical and High actions below, the unresolved product decisions, and recorded staging evidence.

This document is the detailed release review behind the summary in [Action-Tracker.md](Action-Tracker.md). It consolidates the architecture, security, QA, and brand reviews with direct repository validation. `Can complete` means the coding agent can implement the change in this repository. `Requires input` means a Founder/product owner, release owner, or external provider must make a decision, grant access, or produce environment evidence.

## Current validation evidence

| Check | Result | Interpretation |
| --- | --- | --- |
| `npm run type-check` | PASS | No current TypeScript errors were reported by `tsc`. |
| `npm run lint` | PASS: 0 warnings | The internal navigation warning and obsolete Prisma ESLint disable are resolved. |
| `npm test` | PASS: 152 passed, 0 failed | Membership/unlock fixtures now provision the current company capability and geographic eligibility records. |
| `npm audit --audit-level=high` | PASS: 0 vulnerabilities | This supersedes the older health report's dependency-audit result for this checkout. |
| Production build | PASS | TypeScript build errors are enforced; Next.js reports only the existing middleware-to-proxy deprecation warning. |
| `npm run health:validate-workflows` | PASS | Nine workflow files validated; unrelated trailing-whitespace notes remain in `approved-fix.yml`. |
| Local browser QA | PASS with environment findings | Landing and registration pages were checked at 390px width; no horizontal overflow was observed, registration controls expose labels, and the county multi-select now opens from keyboard focus with `aria-expanded`. Local console still reports invalid Sentry DSN `test`; support resolves to `mailto:test`. |
| Staging/production provider verification | BLOCKED locally | No staging or production base URL is configured in the local environment, and no deploy origin is documented in the repository. Render, Stripe, Resend, Sentry, retention, backup, capacity, and live-cookie evidence require environment access. |

## Release blockers

### P0-C01: Add executable coverage for payment and privacy-critical workflows

- **Severity:** Critical
- **Status:** Closed 2026-09-22 for repository coverage. Signed webhook signature rejection, valid completion replay, paid-unlock refund revocation, duplicate reversal, contact-release reversal, chargeback, partial-finalisation recovery, out-of-order delivery, amount/VAT mismatch, Stripe event ledger uniqueness, and privacy assertions are covered by PostgreSQL-backed tests. Live Stripe test-mode evidence remains a Before Production operator step.
- **Evidence:** `src/app/api/webhooks/stripe/route.ts`, `src/server/payments/stripeEventLedger.ts`, `tests/lib/stripe-event-ledger.integration.test.ts`, `tests/lib/payment-reversal.integration.test.ts`, `tests/lib/payment-reversal-dispute-and-ordering.integration.test.ts`, `tests/lib/pre-release-privacy-invariants.integration.test.ts`.
- **Corrective action:** Completed in webhook handling, event ledger, and regression tests.
- **Can complete:** Yes for repository tests.
- **Requires input:** Stripe test-mode webhook delivery on staging.
- **Acceptance evidence:** Amount mismatch returns 400 and leaves the payment `PENDING`; duplicate Stripe event IDs insert once; reversal and privacy tests continue to fail if those controls are broken.

### P0-C02: Make deployment approval fail closed

- **Severity:** Critical
- **Status:** Closed 2026-09-18 for repository gates. Live staging/production attestation on a real deploy remains an operator step (Before Production).
- **Evidence:** `scripts/health-check/verify-deployment.mjs` no longer treats unprobeable checks as success. Staging requires `HIGH RISK STAGING CONTROLS VERIFIED`; production requires `PRODUCTION PROVIDER CONTROLS VERIFIED` on both approval and post-deploy verification. Unexpected HTTP statuses on protected probes are `FAIL`. Any `FAIL` or leftover `UNVERIFIED` exits non-zero. Production rollback POSTs the Render deploy hook for the previous SHA, then re-runs verification with the same attestation.
- **Corrective action:** Completed in verifier, `verify-deployment-approval.mjs`, `deploy-production.yml`, and workflow validation tests.
- **Can complete:** Yes for verifier and workflow logic.
- **Requires input:** Operator attestation phrases on the next approved staging and production workflow runs; a live rollback after a failed production verify is still the first real-world proof of the hook.
- **Acceptance evidence:** Missing attestation fails approval and verification; unexpected probe results fail closed; rollback is an owner-operated Render redeploy, not a report-only step.

## High-priority engineering actions

### P1-H01: Make Stripe event handling durable and out-of-order tolerant

- **Severity:** High
- **Status:** Closed 2026-09-22 for repository implementation. `StripeEvent` persists each provider event ID; webhook handling records the ledger row, rejects currency/amount mismatches, and applies monotonic payment transitions.
- **Evidence:** `prisma/schema.prisma` `StripeEvent`, `prisma/migrations/20260922000000_add_stripe_event_ledger/migration.sql`, `src/server/payments/stripeEventLedger.ts`, `src/app/api/webhooks/stripe/route.ts`, `tests/lib/stripe-event-ledger.integration.test.ts`.
- **Corrective action:** Completed with migration and integration tests.
- **Can complete:** Yes.
- **Requires input:** Stripe test-mode replay/refund/dispute evidence on staging.
- **Acceptance evidence:** Duplicate event IDs insert once; `CONFIRMED` cannot move to `FAILED`; a charged-total mismatch does not confirm the payment.

### P1-H02: Revoke existing sessions after password reset

- **Severity:** High
- **Status:** Closed 2026-09-22 for repository implementation and regression tests. Staging browser confirmation that password reset and MFA changes invalidate prior JWTs remains a Before Production operator step.
- **Evidence:** `src/server/auth/auth.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/mfa/route.ts`, `tests/lib/session-version-invalidation.integration.test.ts`, `tests/lib/mfa.test.ts`.
- **Corrective action:** Completed: `sessionVersion` is incremented on password reset and MFA enable/disable, and protected lookups reject a stale JWT.
- **Can complete:** Yes.
- **Requires input:** Staging confirmation of cookie/JWT invalidation.
- **Acceptance evidence:** Completing a password reset increments `sessionVersion`; MFA enablement source increments `sessionVersion`.

### P1-H03: Harden client-IP trust for rate limiting

- **Severity:** High
- **Status:** Closed 2026-09-22 for repository implementation. Production uses only `TRUSTED_CLIENT_IP_HEADER` (default `x-real-ip`) and ignores spoofed `X-Forwarded-For`. Route coverage exists for login, register, reset, `429`/`Retry-After`, and spoofed headers.
- **Evidence:** `src/server/http/rateLimit.ts`, `render.yaml`, `tests/lib/rate-limit-trusted-ip.test.ts`.
- **Corrective action:** Completed in rate limiter and tests.
- **Can complete:** Yes for code/tests.
- **Requires input:** Confirm Render continues to overwrite `x-real-ip` at the edge.
- **Acceptance evidence:** In production mode, a spoofed `X-Forwarded-For` does not share a rate-limit bucket with the trusted edge IP.

### P1-H04: Fix unlocked attachment authorization or revise the contract

- **Severity:** High availability/privacy workflow defect
- **Status:** Closed 2026-09-18. Founder decision: matched unlocked Providers may download tender attachments. Implementation grants download to the owning Client company or a Provider with a persisted `Unlock` row; matched Providers without an unlock remain denied. Unlocked tender views now list attachment metadata (not file bytes). Coverage is in `tests/lib/tender-attachment-access.integration.test.ts`.
- **Evidence:** `src/server/domain/tenderAttachmentService.ts`, `src/server/domain/unlockService.ts`, `tests/lib/tender-attachment-access.integration.test.ts`.
- **Corrective action:** Complete. Tender-wide attachments are permitted after unlock; attachments are not package-scoped in the schema.
- **Can complete:** Yes.
- **Requires input:** None remaining for this item.
- **Acceptance evidence:** The attachment test denies a matched locked Provider, allows the unlocking Provider and owning Client, and still withholds file bytes from the unlocked tender JSON payload.

### P1-H05: Add session, authorization, reversal, retention, and route-level rate-limit tests

- **Severity:** High
- **Status:** Closed 2026-09-22 for repository coverage. Suspension/role revalidation, password-reset `sessionVersion`, own-tender denial, quote IDOR, retention bearer auth, and trusted-IP rate limits are tested. Staging multi-user browser validation remains operational.
- **Evidence:** `tests/lib/session-revalidation.test.ts`, `tests/lib/authorization-idor.integration.test.ts`, `tests/lib/rate-limit-trusted-ip.test.ts`, `src/server/domain/tenderService.ts`.
- **Corrective action:** Completed in domain checks and regression tests.
- **Can complete:** Yes.
- **Requires input:** Staging browser validation for cookies, proxy behavior, and multi-user journeys.
- **Acceptance evidence:** Own-tender unlock throws `ForbiddenError`; a stranger cannot list quotes; retention rejects a missing or wrong bearer secret.

### P1-H06: Separate sponsored content from quote comparison

- **Severity:** High
- **Status:** Closed 2026-09-18 as a Year 1 product decision: keep sponsorship on the quote comparison screen. No code change in this pass. Reopen if neutrality review later requires a separate partner surface.
- **Evidence:** `src/components/quotes/QuoteComparison.tsx`, `src/components/retailer/SponsoredPlacementCard.tsx`; sponsored content appears in the comparison/decision surface by design for Year 1.
- **Corrective action:** None for Year 1 launch.
- **Can complete:** N/A.
- **Requires input:** None remaining for Year 1.

### P1-H07: Complete shared brand contrast verification

- **Severity:** High brand compliance
- **Status:** Closed 2026-09-22 for source pairings. Field placeholders use `concrete-grey`; focus rings use Trade Blue on site-white. Measured AA ratios for navy, grey, status, and primary-button pairings are asserted in `tests/lib/brand-contrast.test.ts`. Real-device visual QA remains in P2-M01.
- **Evidence:** `tailwind.config.ts`, `src/app/globals.css`, `src/components/ui/Field.tsx`, `tests/lib/brand-contrast.test.ts`.
- **Corrective action:** Completed for documented brand pairings.
- **Can complete:** Yes for implementation.
- **Requires input:** Brand owner approval for any new functional/status colours.
- **Acceptance evidence:** Contrast tests fail if navy/grey/status/button pairings drop below WCAG AA.

### P1-H10: Resolve the role, pricing, and hosting documentation contradictions

- **Severity:** High product/governance blocker
- **Status:** Closed 2026-09-22. Architecture, product, and security documents now record unified `USER`, Owner-set £10-default fees, flat launch credits, Year 1 sponsorship on comparison, self-serve matching, unlocked-Provider attachment download, 30-day quote retention, and Neon Lakebase Postgres.
- **Evidence:** `docs/Architecture.md`, `docs/Product-Requirements.md`, `docs/Security-Requirements.md`, `docs/Action-Tracker.md`.
- **Corrective action:** Completed documentation realignment. Marketplace Contractor/Provider labels remain in journeys and UI paths by design.
- **Can complete:** Yes.
- **Requires input:** None remaining for the listed product decisions.
- **Acceptance evidence:** Governing docs no longer list Render PostgreSQL as the production database and no longer treat Contractor/Provider as authentication roles.

## Medium-priority engineering and UX actions

### P2-M01: Add real browser, mobile, and accessibility release coverage

- **Severity:** Medium
- **Status:** Open; partial local QA completed, but no repeatable browser/axe suite is configured.
- **Corrective action:** Add deterministic browser journeys for registration, tender creation, matching, unlock, quote, acceptance, release, mobile navigation, keyboard coverage selection, focus management, loading/error states, and protected-data absence. Include desktop, tablet, and mobile viewports.
- **Can complete:** Test harness and deterministic fixtures can be added here.
- **Requires input:** Real device, staging cookie, email, Stripe, and deployment validation.

### P2-M03: Complete frontend accessibility and responsive polish

- **Severity:** Medium
- **Status:** Source polish complete 2026-09-18 and contracted in `tests/lib/a11y-source-contracts.test.ts`; real-device confirmation remains open.
- **Evidence:** Opportunity filters have labels, fieldset, and `aria-pressed`; quote comparison has `aria-sort` plus a polite live region; tender detail pages use `PageLoadState` with retry; partner/footer tiles no longer force `min-w-36` on the smallest screens; footer policy links use `min-h-11`.
- **Corrective action:** Remaining work is device/first-journey QA, not further source labels for the listed surfaces.
- **Can complete:** Device QA requires a physical or hosted browser pass.
- **Requires input:** Brand review only if new functional colours are introduced (none in this pass).

### P2-M04: Decide launch-credit scope and Provider vetting

- **Severity:** Medium
- **Status:** Closed 2026-09-18. Founder accepted the flat `launchCreditsLeft` model and self-serve matching with suspension-only moderation. No dated/scoped grants or Provider approval gate for Year 1.
- **Evidence:** `docs/Action-Tracker.md` 2026-09-18 decisions.
- **Corrective action:** None for Year 1.
- **Can complete:** N/A.
- **Requires input:** None remaining.

## Operational actions requiring owner/provider access

These cannot be proven from source code or completed by a local coding change:

1. Configure separate staging and production `DATABASE_URL`, Stripe, Resend, Sentry, retention, origin, and webhook settings; never reuse production resources in development.
2. Register and test the production Stripe webhook, including payment confirmation, duplicate delivery, refunds, disputes, and out-of-order events.
3. Verify the Resend production domain and send email-verification, quote, payment, release, and reversal messages.
4. Confirm Sentry receives a scrubbed production event and that alert ownership is assigned.
5. Configure and observe the retention job: `RETENTION_JOB_URL` must point to the full production `/api/internal/retention` endpoint, and the production GitHub Actions `RETENTION_JOB_SECRET` must exactly match Render production `RETENTION_JOB_SECRET`; record successful and failed-job evidence.
6. Verify protected GitHub environments, branch rules, CODEOWNERS, required checks, Render deploy hooks, and named release/rollback ownership.
7. Verify production backups, restore procedure, recovery objectives, connection limits, scaling plan, alerts, and representative load/recovery results. The current `render.yaml` uses the free plan and does not evidence readiness for the stated 1,000-concurrent-user target.
8. Run the complete deployed-SHA staging verification and record the exact commit, database migration result, payment/webhook evidence, audit evidence, email evidence, Sentry evidence, retention evidence, and privacy checks.
9. Obtain explicit approval for any destructive environment/configuration change and record it in [Implementation-Change-Register.md](Implementation-Change-Register.md) with resource names, recovery evidence, plan, validation, and owner, without secrets.
10. Obtain final product approval for the unified User versus Contractor/Provider model, fixed £10 pricing versus historical figures, sponsorship placement, launch-credit policy, Provider vetting, attachment visibility, and retention semantics.

## Recommended execution order

1. Resolve the remaining product decisions around the role model, pricing, sponsorship, launch credits, Provider vetting, attachment visibility, and retention semantics.
2. Add payment/privacy/webhook/reversal/session/rate-limit integration coverage.
3. Complete fail-closed staging attestations, Stripe event ordering, and proxy trust verification.
4. Complete WCAG contrast, browser, mobile, and accessibility verification.
5. Run build, lint, type-check, full tests, dependency/security checks, migration replay, and browser checks.
6. Complete staging provider/infrastructure evidence and only then request release approval.

**Release rule:** Do not promote to production while any Critical action is open, while required staging evidence is `UNVERIFIED`, while product decisions conflict in the governing documents, or while the full test suite fails.
