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
- **Status:** Open; confirmed missing coverage.
- **Evidence:** `src/app/api/webhooks/stripe/route.ts`, `src/server/payments/paymentService.ts`, `src/server/payments/paymentReversalService.ts`, `src/server/domain/unlockService.ts`, `src/server/domain/contactReleaseService.ts`; existing tests do not exercise the real webhook and finalisation paths end to end.
- **Corrective action:** Add PostgreSQL-backed tests for Stripe signature rejection, duplicate and replayed events, retry after partial finalisation failure, out-of-order success/failure, amount and VAT mismatch, refund/dispute reversal, unlock entitlement, contact-release finalisation, and post-reversal access denial. Add privacy assertions across API responses, emails, exports, rendered output, attachments, logs, and browser state.
- **Can complete:** Yes, including test fixtures and mocked Stripe test events.
- **Requires input:** Stripe test-mode webhook delivery and release-owner approval for staging execution.
- **Acceptance evidence:** The tests fail when signature, amount, idempotency, release, or privacy controls are deliberately broken and pass on the release commit.

### P0-C02: Make deployment approval fail closed

- **Severity:** Critical
- **Status:** Open; confirmed in workflow and verifier logic.
- **Evidence:** `scripts/health-check/verify-deployment.mjs` can record `UNVERIFIED` checks while reporting success. The staging and production workflows now fail when the verifier exits non-zero, retain diagnostic records, and still require explicit attestation handling. Production rollback currently records a report but does not itself restore the previous deployment.
- **Corrective action:** Treat required `UNVERIFIED` results as blocking, remove `continue-on-error` from mandatory verification, require explicit evidence for authentication, payment/webhooks, reversal, contact-release privacy, audit, email, Sentry, and retention, and implement or document an owner-operated rollback procedure that cannot be reported as automatic rollback unless it actually redeploys.
- **Can complete:** Yes for verifier and workflow logic.
- **Requires input:** Render/GitHub deployment credentials, protected-environment policy, and named release/rollback owner for live verification and rollback.
- **Acceptance evidence:** A missing required attestation fails the workflow; a failed post-deploy check prevents promotion; a tested rollback or approved manual rollback runbook is recorded.

## High-priority engineering actions

### P1-H01: Make Stripe event handling durable and out-of-order tolerant

- **Severity:** High
- **Status:** Open; security review identified a state-machine risk.
- **Evidence:** `src/app/api/webhooks/stripe/route.ts` and `src/server/payments/paymentReversalService.ts` track a payment's event state but do not provide a complete event ledger and explicit ordering policy for distinct valid events.
- **Corrective action:** Persist every provider event under a unique event ID, bind events to the expected Stripe payment object, validate currency and charged total, and implement explicit monotonic/idempotent transitions for success, failure, refund, and dispute events.
- **Can complete:** Yes, with migration and integration tests.
- **Requires input:** Stripe test-mode replay/refund/dispute evidence.

### P1-H02: Revoke existing sessions after password reset

- **Severity:** High
- **Status:** Implementation complete in this change; regression coverage and staging confirmation remain open.
- **Evidence:** `src/server/auth/auth.ts`, `src/app/api/auth/reset-password/route.ts`; the eight-hour JWT lifetime does not by itself revoke already issued tokens after a password reset.
- **Corrective action:** Add a password/session generation value checked on every protected session lookup, or use revocable database sessions. Add tests proving reset invalidates prior sessions while preserving the new login path.
- **Can complete:** Yes.
- **Requires input:** None for implementation; browser/staging confirmation is still required.

### P1-H03: Harden client-IP trust for rate limiting

- **Severity:** High
- **Status:** Open; implementation relies on forwarding headers and requires deployment verification.
- **Evidence:** `src/server/http/rateLimit.ts` reads `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip`; route-level and proxy-spoofing tests are incomplete.
- **Corrective action:** Use a trusted Render/CDN edge source, configure the proxy to overwrite forwarding headers, and add route tests for login, registration, reset, concurrent requests, `429`, `Retry-After`, and spoofed headers.
- **Can complete:** Yes for code/tests.
- **Requires input:** Render/Cloudflare proxy configuration and evidence.

### P1-H04: Fix unlocked attachment authorization or revise the contract

- **Severity:** High availability/privacy workflow defect
- **Status:** Open; conflicting behavior is covered by an existing test.
- **Evidence:** `src/server/domain/tenderAttachmentService.ts`, `src/server/domain/unlockService.ts`, `tests/lib/tender-attachment-access.integration.test.ts`. The workflow says matched unlocked Providers may access permitted attachments, while the current test expects a matched unlocked user to be denied.
- **Corrective action:** Scope attachment access to a persisted unlock and eligible package/category, or formally revise the product/security requirement and UI so attachment access is not promised.
- **Can complete:** Yes after the contract is decided.
- **Requires input:** Product owner decision on tender-wide versus package-scoped attachment visibility.

### P1-H05: Add session, authorization, reversal, retention, and route-level rate-limit tests

- **Severity:** High
- **Status:** Open; confirmed coverage gap.
- **Corrective action:** Cover suspension and role changes before JWT expiry, logout/expiry/reset, own-tender denial, IDOR attempts, wrong payment/tender/quote combinations, concurrent acceptance and release, refund/dispute access removal, retention authentication, and route-level rate limits.
- **Can complete:** Yes.
- **Requires input:** Staging browser validation for cookies, proxy behavior, and multi-user journeys.

### P1-H06: Separate sponsored content from quote comparison

- **Severity:** High
- **Status:** Open; confirmed in source and action tracker.
- **Evidence:** `src/components/quotes/QuoteComparison.tsx`, `src/components/retailer/SponsoredPlacementCard.tsx`; sponsored content appears in the comparison/decision surface.
- **Corrective action:** Remove sponsored placement from ranking, comparison, and acceptance flow. Put it on a separate, clearly labelled partner-information surface with explicit neutrality language and no influence on selection.
- **Can complete:** Yes for implementation.
- **Requires input:** Product owner must confirm whether sponsorship is permitted in the current release or must remain disabled.

### P1-H07: Complete shared brand contrast verification

- **Severity:** High brand compliance
- **Status:** Token correction complete in this change; full UI-state contrast verification remains open.
- **Evidence:** `tailwind.config.ts` and `src/app/globals.css` now use the approved Trade Blue, Sky Blue, Steel Grey, and focus tokens.
- **Corrective action:** Complete a WCAG contrast audit across buttons, fields, status states, focus states, disabled states, and dark/light surfaces.
- **Can complete:** Yes for implementation.
- **Requires input:** Brand owner approval for any new functional/status colours.

### P1-H10: Resolve the role, pricing, and hosting documentation contradictions

- **Severity:** High product/governance blocker
- **Status:** Open; confirmed.
- **Evidence:** `docs/TradeTender-Business-Plan.md`, `docs/Product-Requirements.md`, `docs/Architecture.md`, `docs/Security-Requirements.md`, and `docs/Action-Tracker.md` mix the retired Contractor/Provider model with the newer unified User model; historical £5/percentage fees remain beside the resolved £10 model; Render PostgreSQL remains in target architecture while `render.yaml` uses Neon Lakebase Postgres.
- **Corrective action:** Approve one role model, fee model, and database/hosting description. Then update routes, labels, tests, security requirements, architecture, tracker, and release materials consistently.
- **Can complete:** Documentation and implementation cleanup can follow the decision.
- **Requires input:** Founder/product owner decision is mandatory before broad terminology or workflow changes.

## Medium-priority engineering and UX actions

### P2-M01: Add real browser, mobile, and accessibility release coverage

- **Severity:** Medium
- **Status:** Open; partial local QA completed, but no repeatable browser/axe suite is configured.
- **Corrective action:** Add deterministic browser journeys for registration, tender creation, matching, unlock, quote, acceptance, release, mobile navigation, keyboard coverage selection, focus management, loading/error states, and protected-data absence. Include desktop, tablet, and mobile viewports.
- **Can complete:** Test harness and deterministic fixtures can be added here.
- **Requires input:** Real device, staging cookie, email, Stripe, and deployment validation.

### P2-M03: Complete frontend accessibility and responsive polish

- **Severity:** Medium
- **Evidence:** `src/components/retailer/OpportunitiesExplorer.tsx` contains controls needing labels/state semantics; `src/components/quotes/QuoteComparison.tsx` needs sortable-column announcements; `src/components/layout/LandingPartners.tsx` and `src/components/layout/SiteFooter.tsx` use narrow-screen minimum widths; detail pages have weak loading/error states.
- **Corrective action:** Add associated labels, `aria-pressed`/`aria-sort` semantics, stable loading shells, retry and permission-denied states, branded error handling, and narrow viewport layout checks.
- **Can complete:** Yes.
- **Requires input:** Brand review for any functional colour changes.

### P2-M04: Decide launch-credit scope and Provider vetting

- **Severity:** Medium
- **Evidence:** The business plan describes a time/category/region/provider-group launch-credit policy, while the schema uses a flat `launchCreditsLeft`; the business plan also discusses Provider approval while the current flow appears self-service.
- **Corrective action:** Decide whether the flat launch credit and suspension-only moderation are accepted launch simplifications. Implement dated/scoped grants and approval state if not.
- **Can complete:** Implementation can follow the decision.
- **Requires input:** Founder/product owner decision.

## Operational actions requiring owner/provider access

These cannot be proven from source code or completed by a local coding change:

1. Configure separate staging and production `DATABASE_URL`, Stripe, Resend, Sentry, retention, origin, and webhook settings; never reuse production resources in development.
2. Register and test the production Stripe webhook, including payment confirmation, duplicate delivery, refunds, disputes, and out-of-order events.
3. Verify the Resend production domain and send email-verification, quote, payment, release, and reversal messages.
4. Confirm Sentry receives a scrubbed production event and that alert ownership is assigned.
5. Schedule and observe the retention job with `RETENTION_JOB_SECRET`; record successful and failed-job evidence.
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
