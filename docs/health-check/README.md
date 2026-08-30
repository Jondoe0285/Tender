# Repository health-check, fix and release-gating system

A human-controlled system that audits this repository weekly, produces evidence for a person to
decide on, implements only explicitly approved fixes, requests merges through the protected
pull-request process, and deploys only through explicit staging and production approval gates.

The audit, fix and merge workflows never deploy. Deployment approvals are workflow inputs, not
chat messages, and every approval is verified against repository evidence before any deployment
step can run.

## Architecture

Seven workflows, each with a single responsibility and its own permission boundary.

| Workflow | File | Trigger | May write? | May merge? | May deploy? |
| --- | --- | --- | --- | --- | --- |
| Weekly Repository Health Check | `.github/workflows/health-check.yml` | Schedule, manual, `repository_dispatch` | Report branch and PR only | No | No |
| Approved Fix Implementation | `.github/workflows/approved-fix.yml` | Manual only | Fix branch and draft PR only | No | No |
| Approved Merge to Main | `.github/workflows/approved-merge.yml` | Manual only | Merge request only | Yes, through branch protection | No |
| Approved Promote to Staging Branch | `.github/workflows/promote-staging-branch.yml` | Manual only | Moves `staging` branch only | No | No |
| Approved Deploy to Staging | `.github/workflows/deploy-staging.yml` | Manual only | Staging record branch only | No | Staging only |
| Approved Deploy to Production | `.github/workflows/deploy-production.yml` | Manual only | Deployment record artifact only | No | Production only |
| Break-glass Azure Deployment | `.github/workflows/deploy-azure.yml` | Manual only | No repository writes | No | Production only |

Supporting code lives in `scripts/health-check/`:

| File | Purpose |
| --- | --- |
| `lib/checks.mjs` | Discovers checks from `package.json` and the repository layout, runs them, sanitises output |
| `lib/findings.mjs` | Produces findings, allocates stable IDs, deduplicates against archived reports |
| `lib/report.mjs` | Renders Markdown and JSON reports including authorisation blocks |
| `run-audit.mjs` | Audit entry point |
| `verify-approval.mjs` | Verifies a fix or merge request against an immutable archived report |
| `verify-deployment-approval.mjs` | Verifies staging and production deployment approvals against repository evidence |
| `verify-deployment.mjs` | Runs non-destructive staging and production post-deployment probes |
| `validate-workflows.mjs` | Enforces workflow security invariants |
| `send-report-email.ts` | Sends the health report through the existing Resend integration |
| `send-workflow-email.ts` | Sends short fix, merge and deployment notices |

### Existing components reused

- **Resend.** `src/server/notifications/resend.ts` already held the only Resend client. It was
  extended with `sendHealthReportEmail`, which reuses that client but uses its own sender and
  recipient. No second Resend client or parallel delivery path was created.
- **CI.** `.github/workflows/ci.yml` was retained as the pull-request gate and only hardened with
  a job timeout. The audit does not duplicate it; it runs the same discovered commands on a
  schedule and adds analysis on top.
- **Package scripts.** Checks are discovered from `package.json`. No command is invented.
- **npm and `package-lock.json`.** Preserved. All installs use `npm ci`.

## Schedule and timezone behaviour

The audit runs **every Saturday at 00:00 Europe/London**.

GitHub Actions cron is **UTC only**. Europe/London is UTC in winter (GMT) and UTC+1 in summer
(BST), so **UTC midnight does not always equal UK local midnight**. Two cron entries are declared:

```yaml
- cron: '0 23 * * 5'   # 23:00 UTC Friday  = 00:00 Saturday London during BST
- cron: '0 0 * * 6'    # 00:00 UTC Saturday = 00:00 Saturday London during GMT
```

A `schedule-guard` job evaluates `TZ=Europe/London date` and allows the run to continue only when
local time is Saturday 00:00. Exactly one audit therefore runs per week all year, and the other
seasonal entry exits immediately without consuming further minutes.

GitHub may also delay scheduled runs during periods of high load. Treat the schedule as
"shortly after 00:00 London", not as a guaranteed instant.

## Running an audit manually

From the Actions tab, run **Weekly Repository Health Check** and choose a scope:

| Scope | Runs |
| --- | --- |
| `full` | Every discovered check (default) |
| `fast` | Build, type check, lint, unit tests, schema validation |
| `security` | Security and database checks only |

Locally:

```bash
npm run health:audit                 # full audit, writes reports
AUDIT_SCOPE=fast npm run health:audit
npm run health:validate-workflows    # workflow invariants only
```

A local run writes to `docs/health-check/` exactly as CI does. It does not send email unless you
supply Resend credentials.

## Super User repository_dispatch integration

An authorised Super User control may request an audit without holding repository write access:

```http
POST https://api.github.com/repos/<owner>/<repo>/dispatches
Authorization: Bearer <fine-grained token>
Accept: application/vnd.github+json

{ "event_type": "super-user-health-check", "client_payload": { "scope": "full" } }
```

**Security boundary.** The token must be a fine-grained personal access token or GitHub App
installation token whose only permission is `contents: write` scoped to dispatch — or preferably a
GitHub App with the minimum `actions: write` permission. It requests the workflow run and nothing
else. The production application must **never** hold a token that can push code, merge, or read
other secrets. Store the token in the application's own secret store, not in this repository.

This integration is **not configured by default**. See "Manual actions still required".

## Reports

| Path | Purpose |
| --- | --- |
| `docs/health-check/latest.md` | Human-readable latest report (overwritten each run) |
| `docs/health-check/latest.json` | Machine-readable latest report (overwritten each run) |
| `docs/health-check/archive/health-check-YYYY-MM-DD-HHMM-UTC.md` | Immutable archive |
| `docs/health-check/archive/health-check-YYYY-MM-DD-HHMM-UTC.json` | Immutable archive metadata |
| `docs/health-check/run-summary.json` | Small summary consumed by the email step |

Archive immutability is enforced in code: `run-audit.mjs` creates archive files with the `wx` flag,
so a run that would overwrite an existing archive fails instead.

Reports are committed to a `health-report/YYYY-MM-DD-HHMM` branch and raised as a **report-only**
pull request titled `[Health Check] YYYY-MM-DD - [STATUS]`. That pull request is never merged
automatically and is not an approval to release.

If branch or pull-request creation fails, reports remain available as workflow artifacts for
90 days, the failure is recorded, email delivery is still attempted, and the publish job fails.

### Statuses

| Overall status | Meaning |
| --- | --- |
| `PASS` | No failures and no actionable findings |
| `PASS WITH WARNINGS` | Non-critical failures or actionable findings exist |
| `FAIL` | A critical check failed or a confirmed Critical finding exists |
| `INCOMPLETE` | An essential check could not run |

| Release recommendation | Meaning |
| --- | --- |
| `ELIGIBLE FOR FIX REVIEW` | Findings may be approved for fixing |
| `RELEASE BLOCKED` | Do not release until resolved |
| `NO RELEASE REQUIRED` | Nothing actionable |

The audit never approves its own release.

### Findings

Findings use permanent identifiers in the form `HC-YYYYMMDD-NNN`. Identifiers are allocated once
against a stable internal key and reused, so a continuing finding is never renumbered. Lifecycle
states are `New`, `Continuing`, `Resolved`, `Reopened`, `Deferred` and `Risk accepted`.

## Approving and implementing a fix

1. Open the archived report and find the finding.
2. Copy the **AUTHORISATION REQUEST** block beneath it.
3. Run **Approved Fix Implementation** with:
   - `health_check_run_id` — the run ID from the report
   - `approved_finding_ids` — for example `HC-20260830-001`
   - `approved_scope` — copied from the block
   - `approval_statement` — exactly `IMPLEMENT APPROVED FINDINGS`

The workflow refuses to continue unless the statement matches exactly, the run ID matches an
archived report, every finding ID exists, no finding is already resolved, the scope is non-empty,
and no open pull request already covers the findings. The authorising actor is recorded.

It creates `health-fix/YYYY-MM-DD-<finding-ids>`, runs the full validation set, and opens a
**draft** pull request. It never merges and never deploys.

> **Implementation hand-off.** This repository has no configured autonomous code-writing provider.
> The fix workflow verifies authorisation, prepares the branch, records the approved scope in
> `docs/health-check/current-fix-brief.md`, and enforces the validation gates. The code change
> itself is made by a human or an assistant working within that recorded scope. See
> "AI authentication" below.

## Approving a merge

Run **Approved Merge to Main** with:

- `pull_request_number`
- `approved_commit_sha` — the exact reviewed head commit
- `merge_approval_statement` — exactly `MERGE APPROVED FIXES TO MAIN`

Every condition in the verification job must pass, including: the PR targets `main`, originates
from `health-fix/*`, references approved finding IDs and an archived report, records a rollback
procedure, has an approving review, has no failed checks, is current with `main`, adds a test,
deletes no tests, does not modify deployment configuration, and leaves no confirmed Critical
finding open.

If any condition fails the run is marked **RELEASE BLOCKED**, every failed condition is recorded,
a blocked-release email is sent, and fresh approval is required after further changes.

Merging uses `gh pr merge` **without** `--admin`. Branch protection is authoritative and is never
bypassed. There is no force-push path.

## Staging branch promotion

Actions -> **Approved Promote to Staging Branch** -> Run workflow.

| Input | Value |
| --- | --- |
| `commit_sha` | Exact 40-character commit SHA on `main` |
| `promotion_approval_statement` | `PROMOTE APPROVED COMMIT TO STAGING BRANCH` |

The promotion workflow verifies the approval statement, confirms the commit exists on `main`,
confirms `main` has not advanced beyond that commit, and then moves the permanent `staging`
branch to that exact commit. It does not deploy.

## Deployment workflows

**Merging to main is not permission to deploy.** `deploy-azure.yml` no longer runs on push to
`main`; it is retained as a manual break-glass workflow only. Routine releases must use the
staging and production deployment workflows below.

Deployment approvals are workflow inputs, not chat messages. Every condition is verified against
the repository, so an unfilled placeholder or an unprovable claim stops the release.

### Approved Deploy to Staging

Actions -> **Approved Deploy to Staging** -> Run workflow.

| Input | Value |
| --- | --- |
| `commit_sha` | Exact 40-character commit SHA on `main` |
| `staging_approval_statement` | `DEPLOY APPROVED COMMIT TO STAGING` |

Verified before anything is deployed: the statement is exact, the SHA is real and present on
`main`, `main` has not advanced past it, and no confirmed Critical finding is open. It then
applies migrations to a clean database, builds, deploys to the staging slot, runs the
non-destructive verification and writes a staging record.

The staging record is uploaded as an artifact and, when verification succeeds, pushed to a
`staging-record/<record-id>` branch. Merge that record before requesting production deployment so
the production workflow can verify the exact staging evidence.

### Approved Deploy to Production

Actions -> **Approved Deploy to Production** -> Run workflow.

| Input | Value |
| --- | --- |
| `commit_sha` | Exact 40-character SHA that passed staging |
| `staging_report` | Staging record identifier, e.g. `deploy-staging-2026-08-30-09-00-UTC` |
| `production_approval_statement` | `DEPLOY APPROVED COMMIT TO PRODUCTION` |

Adds to the staging checks: the staging record must exist, be successful, contain no failing
check and reference the identical commit; all check runs on the commit must have succeeded; the
commit must have arrived through a merged pull request; migrations must be backward compatible;
and point-in-time restore retention must be at least seven days. Production secrets are exposed
only to the `production` environment job.

If post-deployment verification fails, the rollback job redeploys the previous production commit
and re-verifies. The outcome is always emailed and never concealed.

### What verification does and does not prove

The post-deployment checks are read-only. No tender, quote, payment or account is created. Health
and database connectivity are read from `/api/health`; every portal and business endpoint is
probed unauthenticated and must refuse. Resend delivery, audit logging and error rates are
reported as `UNVERIFIED` because they cannot be proven by an external probe.

## Required secrets

Configure as repository secrets. Values are never printed or committed.

| Secret | Used by | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | notify jobs | Existing Resend key |
| `HEALTH_REPORT_FROM` | notify jobs | Verified sender for health reports |
| `HEALTH_REPORT_TO` | notify jobs | Recipient(s), comma-separated |
| `AZURE_STAGING_WEBAPP_NAME` | `deploy-staging.yml` | Azure App Service staging target |
| `AZURE_STAGING_CREDENTIALS` | `deploy-staging.yml` | Azure credentials scoped to staging only |
| `STAGING_BASE_URL` | `deploy-staging.yml` | Base URL for non-destructive staging verification |
| `AZURE_WEBAPP_NAME` | `deploy-production.yml`, `deploy-azure.yml` | Azure App Service production target |
| `AZURE_CREDENTIALS` | `deploy-production.yml`, `deploy-azure.yml` | Azure credentials scoped to production deployment |
| `PRODUCTION_BASE_URL` | `deploy-production.yml` | Base URL for non-destructive production verification |
| `AZURE_SQL_SERVER_NAME` | `deploy-production.yml` | Azure SQL server used for backup verification |
| `AZURE_RESOURCE_GROUP` | `deploy-production.yml` | Resource group used for backup verification |
| `AZURE_SQL_DATABASE_NAME` | `deploy-production.yml` | Azure SQL database used for backup verification |
| `GITHUB_TOKEN` | publish, fix, merge, staging record, deployment metadata | Provided automatically by GitHub |

The audit job runs with **no** production credentials. Its database, auth and Stripe values are
non-functional placeholders and its `RESEND_API_KEY` is empty. Staging must use non-production
credentials and synthetic data only.

## Required GitHub environments

| Environment | Used by | Recommended protection |
| --- | --- | --- |
| `health-check-fix` | `approved-fix.yml` implement job | Required reviewers |
| `health-check-merge` | `approved-merge.yml` merge job | Required reviewers |
| `staging` | `promote-staging-branch.yml` promote job and `deploy-staging.yml` deploy job | Required reviewers |
| `production` | `deploy-production.yml`, `deploy-azure.yml` deploy and rollback jobs | Required reviewers |

## Required branch rules for `main`

- Require a pull request before merging
- Require at least one approving review
- Dismiss stale approvals when new commits are pushed
- Require review from Code Owners (`CODEOWNERS` is included)
- Require status checks to pass, including the CI `validate` job
- Require branches to be up to date before merging
- Require conversation resolution
- Block force pushes and deletions
- **Do not** enable an administrator bypass

## Resend configuration

The single Resend client in `src/server/notifications/resend.ts` is shared. Health reports use
`HEALTH_REPORT_FROM` and `HEALTH_REPORT_TO` so operational mail never borrows the customer
notification identity. Messages are tagged `category: repository-health-check`. Both plain-text
and HTML bodies are sent, and the dated Markdown report is attached when present.

If delivery fails, the reason is printed without credentials, the reports are preserved, the job
fails, and the workflow summary shows `EMAIL DELIVERY FAILED` prominently. A delivery failure never
erases valid test results.

## Local validation

```bash
npm ci
npm run health:validate-workflows
npm run health:audit
npm run type-check && npm run lint && npm test && npm run build
```

## Failure recovery

| Failure | Effect | Recovery |
| --- | --- | --- |
| A check fails | Recorded as `FAILED`, finding raised | Fix through the approval workflow |
| A check times out | Recorded as `TIMED OUT`, never as success | Re-run, or raise the check timeout |
| Report branch push fails | Reports preserved as artifacts, job fails | Download artifacts, retry |
| Email fails | Reports preserved, job fails, summary shows failure | Check Resend secrets |
| Archive collision | Run fails rather than overwriting history | Investigate duplicate run |

## Cost controls

- One audit per week, guarded so only one seasonal cron entry proceeds
- `concurrency: repository-health-check` prevents overlapping audits
- Workflow-level and job-level timeouts (45 minutes audit, 35 minutes for the audit step)
- `fast` and `security` scopes for cheaper manual runs
- Artifact retention capped at 90 days

## AI authentication

GitHub Agentic Workflows are **not** in use. This repository has no agentic workflow sources,
no compiled `.lock.yml` workflows, no installed `gh aw` extension and no configured AI provider
credential. Rather than assume an entitlement, this system is implemented as equivalent controlled
GitHub Actions workflows that:

- run the same discovery, checks and analysis deterministically,
- keep analysis read-only and separate from every write operation,
- treat repository content, logs and test output as untrusted data that is never executed as
  instructions,
- preserve the same approval statements, scope verification and release gates.

To adopt Agentic Workflows later, add the Markdown workflow source, compile it to a lock workflow,
supply the provider credential as a secret, and keep the analysis job read-only. The security
boundaries documented here must be preserved.

## Workflow maintenance

- `npm run health:validate-workflows` enforces the invariants and runs inside the audit
- The audit and fix workflows additionally parse every workflow with a real YAML parser, because
  the Node validator is a heuristic and cannot fully replace one. Both gates run together
- Exactly one authoritative scheduled audit is permitted; the validator fails if a second appears
- `promote-staging-branch.yml` must update only `refs/heads/staging` and must not deploy
- Deployment workflows must be manually dispatched, must not deploy on push to `main`, and must
  keep production secrets inside protected deployment jobs
- `deploy-staging.yml` and `deploy-production.yml` must retain exact approval statements,
  deployment-approval verification and post-deployment verification

## Safe disablement

1. Disable **Weekly Repository Health Check** in the Actions tab (preserves history), or
2. Remove the `schedule:` block to keep manual runs only, or
3. Disable individual fix, merge or deployment workflows from the Actions tab if that control is
  being replaced by an equal or stronger process.

Disabling the audit does not affect CI, retention or deployment.

## Rollback

Revert the setup pull request. The system adds workflows, scripts, documentation and additive
exports in `src/server/notifications/resend.ts`. It changes no application behaviour, so reverting
has no runtime effect beyond removing the health-report sender and release-gating workflows.

## Manual actions still required

See `docs/health-check/implementation-review.md` for the full matrix. The outstanding items are:

1. **Create repository secrets** `HEALTH_REPORT_FROM` and `HEALTH_REPORT_TO`, and confirm
   `RESEND_API_KEY` exists. Without them the audit still runs and reports, but email fails.
2. **Create GitHub environments** `health-check-fix`, `health-check-merge`, `staging` and
   `production` with required reviewers.
3. **Configure branch protection on `main`** as listed above, with no administrator bypass.
4. **Provision staging.** Create an Azure staging App Service target and a staging database with
   synthetic data only, then configure `AZURE_STAGING_WEBAPP_NAME`, `AZURE_STAGING_CREDENTIALS`
   and `STAGING_BASE_URL` on the `staging` environment.
5. **Update `CODEOWNERS`** if review should sit with a team rather than an individual.
6. **Decide on the Super User dispatch token** and store it in the application secret store.
7. **Consider enabling GitHub secret scanning and CodeQL**, since `gitleaks` and `semgrep` are not
   installed on the runner and the built-in pattern scan is weaker.
8. **Configure production release secrets** `AZURE_WEBAPP_NAME`, `AZURE_CREDENTIALS`,
   `PRODUCTION_BASE_URL`, `AZURE_SQL_SERVER_NAME`, `AZURE_RESOURCE_GROUP` and
   `AZURE_SQL_DATABASE_NAME` on the `production` environment.
9. **Confirm Azure SQL point-in-time restore retention is at least seven days.** Production
   deployment fails closed if backup verification cannot prove this.
