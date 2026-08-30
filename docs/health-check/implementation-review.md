# Implementation review

Repository inspection performed before any file was created or modified, and the resulting
decisions. Every component below was reviewed in the existing repository first.

Classification: **Retained**, **Reused**, **Extended**, **Repaired**, **Replaced**,
**Removed as duplicate**, **Requires human review**, **Not applicable**.

## Matrix

| Capability | Existing implementation | Status | Gap | Action taken | Manual action required |
| --- | --- | --- | --- | --- | --- |
| Package manager | npm with `package-lock.json` | Retained | None | Preserved; all installs use `npm ci` | No |
| Workspace configuration | Single package, no monorepo tooling | Retained | None | No change | No |
| Package scripts | `dev`, `build`, `start`, `lint`, `type-check`, `test`, `db:*`, `retention:purge` | Extended | No health-check entry points | Added `health:audit`, `health:validate-workflows`, `health:verify-approval`, `health:email`. No existing script changed | No |
| Pull-request CI | `.github/workflows/ci.yml` (lint, type-check, test, build) | Extended | No job timeout | Added `timeout-minutes: 30`. Kept as the authoritative PR gate; the audit does not duplicate it | No |
| Scheduled maintenance workflow | `.github/workflows/scheduled-maintenance.yml` (added earlier in this session) | Removed as duplicate | Duplicated the weekly schedule, dependency audit, schema-drift check and full validation now owned by the health check | Deleted. Its `npm audit` and schema-drift checks are reproduced inside the audit's check discovery, so no capability was lost | No |
| Quote retention job | `.github/workflows/quote-retention.yml` | Extended | No timeout, no concurrency group | Added `timeout-minutes: 15`, `concurrency: quote-retention`, explicit `permissions: contents: read`. Schedule and behaviour unchanged | No |
| Production deployment | `.github/workflows/deploy-azure.yml`, deploys on push to `main` | Requires human review | Merging to `main` also deploys to production; job-level `if:` uses the unavailable `secrets` context | **Not modified.** Reported as audit findings `main-auto-deploys` (HIGH) and `deploy-job-if-uses-secrets-context` (MEDIUM). Validator treats this file as advisory-only | **Yes — decide the production gate** |
| Agentic workflows | None: no `.github/workflows/*.md`, no `.lock.yml`, no `gh aw` extension, no AI provider secret | Not applicable | Cannot verify entitlement or credential | Implemented equivalent controlled GitHub Actions workflows with the same security and approval boundaries. Difference documented in `README.md` → "AI authentication" | Optional |
| AI agent instructions | `.github/copilot-instructions.md`, `.github/agents/*.agent.md` | Retained | None | Left unchanged; no conflicting instructions added | No |
| Unit tests | `tests/lib/*.test.ts`, 68 tests via `tsx --test` | Retained | None | Kept as-is and discovered by the audit. No test replaced or weakened | No |
| Integration tests | None | Requires human review | Payment, unlock, contact-release and webhook paths have no integration coverage | Reported as `UNAVAILABLE` with recorded risk, plus HIGH findings per untested critical path | **Yes — add integration tests** |
| Regression tests | None as a distinct suite | Requires human review | Fixed defects could reappear | Reported as `UNAVAILABLE` with recorded risk | Yes |
| End-to-end tests | None; no Playwright or Cypress configuration | Requires human review | Role separation and payment-gated journeys unverified end to end | Reported as `UNAVAILABLE` with recorded risk | Yes |
| Coverage | No coverage runner or thresholds | Requires human review | Coverage reductions cannot be detected | Reported as `UNAVAILABLE`. **No threshold was invented or weakened** because none exists | Yes |
| Coverage exclusions | None | Not applicable | — | Nothing to review | No |
| Linting | `next lint` via `npm run lint` | Reused | None | Discovered and executed by the audit | No |
| Formatting | No formatter configured | Requires human review | Formatting drift unenforced | Reported as `UNAVAILABLE` | Optional |
| Type checking | `tsc --noEmit` via `npm run type-check` | Reused | None | Discovered and executed | No |
| Dependency scanning | None in CI | Extended | Vulnerable transitive dependencies undetected | Added `npm audit --audit-level=high` to audit discovery. First run found 8 high-severity postcss advisories | Yes — triage advisories |
| Secret scanning | None; `gitleaks` not installed | Repaired (partially) | No dedicated scanner | Built-in credential pattern scan added, and explicitly reported as **weaker** than a dedicated scanner so absence is never presented as clean | **Yes — enable GitHub secret scanning** |
| Static security analysis | None; `semgrep` not installed | Requires human review | Code-level weaknesses rely on review | Reported as `UNAVAILABLE` with corrective action | Yes — consider CodeQL |
| Database schema | `prisma/schema.prisma` + `prisma/schema.sqlserver.prisma` | Reused | None | `prisma validate` discovered and executed | No |
| Migrations | 36 migrations in `prisma/migrations` | Extended | No automated migration validation | Added migration replay into a disposable database followed by drift comparison. First implementation was defective (SQLite shadow database) and was **repaired** to use an absolute temp database path | No |
| Schema drift | `npm run db:sync-prod-schema` existed but was not verified in CI | Extended | Generated Azure SQL schema could drift silently | Added a drift check comparing the regenerated file against the committed one | No |
| ORM configuration | Prisma client generation via `db:generate` | Reused | None | Invoked in the audit workflow before checks | No |
| Authentication and permission tests | `tests/lib/admin-permissions.test.ts`, `origin.test.ts`, `rate-limit.test.ts`, `email-verification.test.ts` | Retained | Role-boundary integration coverage absent | Retained unchanged; gap reported | Yes |
| Stripe integration | `src/server/payments/`, `src/app/api/webhooks/stripe` | Requires human review | No webhook signature or idempotency test | Reported as a HIGH critical-path finding | Yes |
| Resend integration | `src/server/notifications/resend.ts` — single client | Extended | No health-report sender; no plain-text support | Added `sendHealthReportEmail` reusing the same client, and optional `text` on `EmailTemplate`. **No second Resend client created** | Yes — add `HEALTH_REPORT_*` secrets |
| Email templates | `src/server/notifications/emailTemplates.ts` | Extended | `EmailTemplate` was HTML-only | Added optional `text` field. Existing templates unaffected | No |
| Email error and retry handling | Per-call `.catch` with audit events in application code | Retained | Workflow-level delivery failure had no owner | Health emails fail their job loudly, preserve reports, and never print credentials | No |
| Azure deployment configuration | `deploy-azure.yml` | Requires human review | See production deployment row | Not modified | Yes |
| Staging workflow | None | Requires human review | No staging gate before production | Documented as a recommended future control | Yes |
| Rollback procedures | Not documented in-repo | Extended | No recorded rollback expectation | Merge workflow requires the PR body to record a rollback procedure; documented in `README.md` | No |
| Environment-variable validation | `.env.example` present; no runtime validation | Requires human review | Missing variables surface at runtime | Not in scope of this system; recorded here for visibility | Optional |
| CODEOWNERS | None | Replaced (created) | Code-owner review could not be required | Added `CODEOWNERS` covering workflows, Prisma, payments, auth, moderation, webhooks and health-check docs | **Yes — confirm owner handle/team** |
| Repository rules and branch protection | Not verifiable from inside the repository | Requires human review | Merge gate depends on settings | Required settings documented; merge workflow never bypasses them | **Yes — configure branch protection** |
| GitHub environments | `production` referenced by `deploy-azure.yml` | Extended | No approval-gated environments for fix/merge | `health-check-fix` and `health-check-merge` referenced by the new workflows | **Yes — create environments with reviewers** |
| Deployment approval gates | `environment: production` declared; reviewers unverified | Requires human review | Unknown whether approval is enforced | Documented; not changed | Yes |
| `repository_dispatch` handlers | None | Replaced (created) | No Super User audit trigger | Added `super-user-health-check` event type with a documented least-privilege token boundary | **Yes — issue and store the token** |
| Super User integrations | In-app Super User surfaces exist | Retained | None relevant | The application is never given repository write credentials | No |
| Health-check scripts and reports | None | Replaced (created) | No audit system existed | Added `scripts/health-check/**` and `docs/health-check/**` | No |
| Report history | None | Not applicable | Nothing to preserve | Archive directory created; immutability enforced in code | No |
| Technical documentation | `docs/Architecture.md`, `Product-Requirements.md`, `Security-Requirements.md`, `TradeTender-Business-Plan.md`, `PRODUCTION-READINESS-REVIEW.md` | Retained | No health-check documentation | Added `docs/health-check/README.md` and this review. No existing document contradicted | No |

## Conflicts identified and resolved

| Conflict | Resolution |
| --- | --- |
| `scheduled-maintenance.yml` and the new audit both scheduled weekly validation and dependency auditing | The audit is authoritative. The maintenance workflow was deleted and its checks folded into audit discovery, preserving `npm audit` and schema-drift coverage. `validate-workflows.mjs` now fails if a second scheduled audit reappears |
| Spec requires timezone-aware scheduling; GitHub cron is UTC only | Two seasonal cron entries plus a `TZ=Europe/London` guard job, so exactly one run occurs at 00:00 London year-round. BST behaviour documented explicitly rather than claiming UTC equals UK local time |
| Spec requires an agentic workflow; no entitlement, extension or provider credential is present | Equivalent controlled GitHub Actions workflows with identical security and approval boundaries. Difference documented rather than assumed |
| Spec requires the fix workflow to implement code; no autonomous code-writing provider is configured | The workflow verifies authorisation, prepares the scoped branch and enforces validation gates, then hands off to a human or assistant. This is stated plainly rather than implied to be automatic |
| Validator flagged `deploy-azure.yml` for a missing timeout, but the spec forbids silently changing production deployment | The file is advisory-only in the validator and the gap is reported as a finding requiring human action |

## Defects found in this system during its own validation

Both were found by running the system rather than by inspection, and both were repaired before delivery.

1. `CHECK_STATUS.NOT_APPLICABLE` was referenced but never defined, so the container check crashed
   the audit. Added the status and a guard that marks a command-less check `BLOCKED` rather than
   throwing.
2. Migration validation used a SQLite shadow database and failed with an engine error. Replaced
   with a migration replay into a disposable database at an absolute path, followed by a drift
   comparison. Verified to report "No difference detected".

## MANUAL ACTION REQUIRED

| # | Action | Why it could not be completed here | Who | How to verify | What remains blocked |
| --- | --- | --- | --- | --- | --- |
| 1 | Create secrets `HEALTH_REPORT_FROM` and `HEALTH_REPORT_TO`; confirm `RESEND_API_KEY` | Secrets cannot be created from inside the repository | Repository admin | Run the audit manually; the notify job succeeds | Email delivery |
| 2 | Create environments `health-check-fix` and `health-check-merge` with required reviewers | Environments are repository settings | Repository admin | Run the fix workflow; it pauses for approval | Approval gating on fix and merge |
| 3 | Configure branch protection on `main` (PR required, review required, stale dismissal, code-owner review, status checks, up-to-date branch, conversation resolution, no force push, no admin bypass) | Branch protection is a repository setting | Repository admin | Attempt a direct push to `main`; it must be rejected | The merge workflow's guarantee that protection is authoritative |
| 4 | Decide the production deployment gate for `deploy-azure.yml` | The spec forbids silently changing production deployment behaviour | Release owner | Merge a trivial PR and confirm deployment waits for approval | Separation of merge from deploy |
| 5 | Confirm the `CODEOWNERS` handle or replace it with a team | The correct reviewing team is a business decision | Repository admin | Open a PR and confirm the code owner is requested | Code-owner review requirement |
| 6 | Issue and store the Super User dispatch token with least privilege | Tokens must not be created or stored in the repository | Repository admin | `POST /dispatches` starts the audit and can do nothing else | Super User audit trigger |
| 7 | Enable GitHub secret scanning and consider CodeQL | Cannot be enabled from repository content | Repository admin | Audit reports the secret scan as available | Strong secret and SAST coverage |
| 8 | Triage the 8 high-severity `postcss` advisories reported by the first audit | The fix path is `next@16` (a breaking major upgrade) and needs human approval | Platform owner | `npm audit --audit-level=high` exits 0 | Clean dependency audit |
| 9 | Add integration, regression, end-to-end and coverage tooling | Adding these is substantial work outside this system's scope, and the spec forbids inventing commands | Engineering | The audit reports these as `PASSED` rather than `UNAVAILABLE` | Verification of the highest-risk workflows |
