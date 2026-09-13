# Trade Tender repository health check

**Overall status: FAIL**
**Release recommendation: RELEASE BLOCKED**

## 1. Executive summary

The audit ran 18 discovered checks against `staging` at commit `462b9e2`.
0 critical, 5 high, 3 medium, 9 low and 0 informational findings are currently open.
One or more release-blocking conditions were met.
This audit does not approve its own release and does not implement fixes.

## 2. Run metadata

| Field | Value |
| --- | --- |
| Repository | local |
| Branch | staging |
| Commit SHA | `462b9e20e05e9d2b9182a5c21b9e2a80ad6e5a43` |
| Trigger type | local |
| Workflow run ID | local-1789290222505 |
| Started | 2026-09-13T09:03:42.505Z |
| Completed | 2026-09-13T09:03:43.001Z |
| Environment | Local workstation |
| Audit scope | full |

## 3. Check results

| Check | Command | Result | Duration |
| --- | --- | --- | --- |
| Production build | `npm run build` | FAILED | 0s |
| Type checking | `npm run type-check` | FAILED | 0s |
| Linting | `npm run lint` | FAILED | 0s |
| Unit tests | `npm run test` | FAILED | 0s |
| Formatting validation | `(no command available)` | UNAVAILABLE | — |
| Integration tests | `(no command available)` | UNAVAILABLE | — |
| Regression tests | `(no command available)` | UNAVAILABLE | — |
| End-to-end tests | `(no command available)` | UNAVAILABLE | — |
| Test coverage | `(no command available)` | UNAVAILABLE | — |
| Accessibility testing | `(no command available)` | UNAVAILABLE | — |
| Dependency vulnerability scan | `npm audit --audit-level=high` | FAILED | 0s |
| Secret scanning (external tool) | `(no command available)` | UNAVAILABLE | — |
| Static security analysis | `(no command available)` | UNAVAILABLE | — |
| Database schema validation | `npx prisma validate` | FAILED | 0s |
| Migration validation | `node scripts/health-check/validate-migrations.mjs` | FAILED | 0s |
| Dead-code and unused-export detection | `(no command available)` | UNAVAILABLE | — |
| Container validation | `(no command available)` | NOT APPLICABLE | — |
| Infrastructure-as-code validation | `(no command available)` | NOT APPLICABLE | — |

**Test summary.** Unit tests: FAILED. Integration: UNAVAILABLE. Regression: UNAVAILABLE. End-to-end: UNAVAILABLE.

**Coverage summary.** UNAVAILABLE — this repository has no coverage command, so coverage reductions cannot be detected.

**Build result.** FAILED

**Migration result.** FAILED (schema validation: FAILED, production schema drift: UNAVAILABLE)

**Security result.** Dependency audit: FAILED. Secret scanning: UNAVAILABLE. Static analysis: UNAVAILABLE.

## 4. Findings by severity

| Severity | Open |
| --- | ---: |
| CRITICAL | 0 |
| HIGH | 5 |
| MEDIUM | 3 |
| LOW | 9 |
| INFORMATIONAL | 0 |

## 5. Detailed findings and authorisation blocks

### HC-20260913-001 — Production build did not pass

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Production build" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npm ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A defect could reach users through an unverified release.
**Business impact.** Release must be blocked until resolved.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Production build" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Production build" completes with status PASSED.
**Validation commands.** `npm run build`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-001
Severity: HIGH
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Production build" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Production build" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-001

APPROVED SCOPE:
Only the files required to make "Production build" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260913-002 — Type checking did not pass

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Type checking" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npm ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A defect could reach users through an unverified release.
**Business impact.** Release must be blocked until resolved.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Type checking" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Type checking" completes with status PASSED.
**Validation commands.** `npm run type-check`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-002
Severity: HIGH
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Type checking" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Type checking" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-002

APPROVED SCOPE:
Only the files required to make "Type checking" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260913-004 — Unit tests did not pass

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Unit tests" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npm ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A defect could reach users through an unverified release.
**Business impact.** Release must be blocked until resolved.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Unit tests" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Unit tests" completes with status PASSED.
**Validation commands.** `npm run test`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-004
Severity: HIGH
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Unit tests" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Unit tests" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-004

APPROVED SCOPE:
Only the files required to make "Unit tests" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260913-005 — Database schema validation did not pass

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Database schema validation" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npx ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A defect could reach users through an unverified release.
**Business impact.** Release must be blocked until resolved.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Database schema validation" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Database schema validation" completes with status PASSED.
**Validation commands.** `npx prisma validate`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-005
Severity: HIGH
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Database schema validation" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Database schema validation" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-005

APPROVED SCOPE:
Only the files required to make "Database schema validation" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260913-006 — Migration validation did not pass

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Migration validation" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
Migration validation requires a PostgreSQL DATABASE_URL. Replaying the history into SQLite cannot detect PostgreSQL dialect errors, so it would report a false pass.
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A defect could reach users through an unverified release.
**Business impact.** Release must be blocked until resolved.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Migration validation" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Migration validation" completes with status PASSED.
**Validation commands.** `node scripts/health-check/validate-migrations.mjs`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-006
Severity: HIGH
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Migration validation" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Migration validation" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-006

APPROVED SCOPE:
Only the files required to make "Migration validation" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260913-003 — Linting did not pass

- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Lifecycle state:** New
- **First seen:** 20260913

**Summary.** The repository check "Linting" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npm ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** Indirect: reduced confidence in release quality.
**Business impact.** Increased maintenance risk.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Linting" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Linting" completes with status PASSED.
**Validation commands.** `npm run lint`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260913-003
Severity: MEDIUM
Confidence: Confirmed
Lifecycle state: New

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Linting" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Linting" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260913-003

APPROVED SCOPE:
Only the files required to make "Linting" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-007 — Dependency vulnerability scan did not pass

- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** The repository check "Dependency vulnerability scan" reported FAILED. This is a release-blocking quality gate.

**Evidence.**

```
spawnSync npm ENOENT
```

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** Indirect: reduced confidence in release quality.
**Business impact.** Increased maintenance risk.
**Likely root cause.** See evidence.
**Recommended fix.** Reproduce with the command below, correct the underlying cause, and re-run the audit.
**Approved-scope recommendation.** Only the files required to make "Dependency vulnerability scan" pass.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes
**Acceptance criteria.** "Dependency vulnerability scan" completes with status PASSED.
**Validation commands.** `npm audit --audit-level=high`
**Dependencies.** None.
**Change risk.** Medium
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-007
Severity: MEDIUM
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Only the files required to make "Dependency vulnerability scan" pass.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: Yes
Acceptance criteria: "Dependency vulnerability scan" completes with status PASSED.
Maximum permitted change risk: Medium
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-007

APPROVED SCOPE:
Only the files required to make "Dependency vulnerability scan" pass.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-008 — Secret scanning (external tool): no repository command is available

- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** gitleaks is not installed on the runner. Committed credentials could go undetected by a dedicated scanner.

**Evidence.**

Check id: `secret-scan`. Reason: gitleaks is not installed on the runner.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Committed credentials could go undetected by a dedicated scanner.
**Likely root cause.** See evidence.
**Recommended fix.** Install gitleaks in the workflow or enable GitHub secret scanning for the repository. The audit falls back to a built-in pattern scan, which is weaker.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Secret scanning (external tool)" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-008
Severity: MEDIUM
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Secret scanning (external tool)" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-008

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-001 — Formatting validation: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "format:check" script is defined in package.json. Formatting drift is not enforced automatically.

**Evidence.**

Check id: `format`. Reason: No "format:check" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Formatting drift is not enforced automatically.
**Likely root cause.** See evidence.
**Recommended fix.** Add a formatter (for example Prettier) and a "format:check" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Formatting validation" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-001
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Formatting validation" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-001

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-002 — Integration tests: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "test:integration" script is defined in package.json. Payment, unlock and contact-release paths have no automated integration coverage.

**Evidence.**

Check id: `integration-tests`. Reason: No "test:integration" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Payment, unlock and contact-release paths have no automated integration coverage.
**Likely root cause.** See evidence.
**Recommended fix.** Add integration tests against a disposable test database and a "test:integration" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Integration tests" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-002
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Integration tests" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-002

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-003 — Regression tests: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "test:regression" script is defined in package.json. Previously fixed defects could silently reappear.

**Evidence.**

Check id: `regression-tests`. Reason: No "test:regression" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Previously fixed defects could silently reappear.
**Likely root cause.** See evidence.
**Recommended fix.** Add a "test:regression" script covering fixed defects.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Regression tests" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-003
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Regression tests" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-003

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-004 — End-to-end tests: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "test:e2e" script is defined in package.json. Role separation and payment-gated journeys are not verified end to end.

**Evidence.**

Check id: `e2e-tests`. Reason: No "test:e2e" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Role separation and payment-gated journeys are not verified end to end.
**Likely root cause.** See evidence.
**Recommended fix.** Add Playwright or Cypress and a "test:e2e" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "End-to-end tests" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-004
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "End-to-end tests" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-004

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-005 — Test coverage: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "test:coverage" script is defined in package.json. Coverage cannot be measured, so coverage reductions cannot be detected.

**Evidence.**

Check id: `coverage`. Reason: No "test:coverage" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Coverage cannot be measured, so coverage reductions cannot be detected.
**Likely root cause.** See evidence.
**Recommended fix.** Add a coverage runner and a "test:coverage" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Test coverage" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-005
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Test coverage" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-005

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-006 — Accessibility testing: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "test:a11y" script is defined in package.json. Accessibility regressions are not detected automatically.

**Evidence.**

Check id: `accessibility`. Reason: No "test:a11y" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Accessibility regressions are not detected automatically.
**Likely root cause.** See evidence.
**Recommended fix.** Add automated accessibility checks and a "test:a11y" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Accessibility testing" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-006
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Accessibility testing" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-006

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-009 — Static security analysis: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** semgrep is not installed on the runner. Code-level security weaknesses are only detected by review and the built-in pattern analysis.

**Evidence.**

Check id: `sast`. Reason: semgrep is not installed on the runner.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Code-level security weaknesses are only detected by review and the built-in pattern analysis.
**Likely root cause.** See evidence.
**Recommended fix.** Enable GitHub CodeQL or add semgrep to the workflow.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Static security analysis" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-009
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Static security analysis" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-009

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-011 — Dead-code and unused-export detection: no repository command is available

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** No "lint:dead-code" script is defined in package.json. Unused code accumulates and hides real defects.

**Evidence.**

Check id: `dead-code`. Reason: No "lint:dead-code" script is defined in package.json.

**Affected files.** Not file specific.
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Unused code accumulates and hides real defects.
**Likely root cause.** See evidence.
**Recommended fix.** Add knip or ts-prune and a "lint:dead-code" script.
**Approved-scope recommendation.** Tooling configuration and a new package script only. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** No — this adds verification capability rather than fixing behaviour.
**Acceptance criteria.** The audit reports "Dead-code and unused-export detection" as PASSED rather than UNAVAILABLE.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-011
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Tooling configuration and a new package script only. No application behaviour changes.
Expected files: To be determined during implementation, within the approved scope above.
Required regression test: No — this adds verification capability rather than fixing behaviour.
Acceptance criteria: The audit reports "Dead-code and unused-export detection" as PASSED rather than UNAVAILABLE.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-011

APPROVED SCOPE:
Tooling configuration and a new package script only. No application behaviour changes.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


---

### HC-20260830-016 — 2 unresolved TODO/FIXME markers

- **Severity:** LOW
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** Unresolved markers indicate known incomplete work in tracked source files.

**Evidence.**

scripts/health-check/lib/findings.mjs:234 — title: `${markers.length} unresolved TODO/FIXME marker${markers.length === 1 ? '' : 's'}`,
scripts/health-check/verify-deployment-approval.mjs:53 — return !value || /^\[.*\]$/.test(value.trim()) || /PASTE|<[A-Z_ ]+>|TODO|EXAMPLE/i.test(value);

**Affected files.** `scripts/health-check/lib/findings.mjs`, `scripts/health-check/verify-deployment-approval.mjs`
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** None directly.
**Business impact.** Accumulating technical debt.
**Likely root cause.** See evidence.
**Recommended fix.** Resolve the marker or convert it into a tracked issue with an owner.
**Approved-scope recommendation.** Individual markers only, one finding at a time.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Only where behaviour changes.
**Acceptance criteria.** The marker is removed and the described work is either completed or tracked.
**Validation commands.** `npm run type-check`, `npm test`, `npm run build`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1789290222505
Finding ID: HC-20260830-016
Severity: LOW
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: Individual markers only, one finding at a time.
Expected files: scripts/health-check/lib/findings.mjs, scripts/health-check/verify-deployment-approval.mjs
Required regression test: Only where behaviour changes.
Acceptance criteria: The marker is removed and the described work is either completed or tracked.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1789290222505

APPROVED FINDING IDS:
HC-20260830-016

APPROVED SCOPE:
Individual markers only, one finding at a time.

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------


## 6. Finding lifecycle

- **New:** HC-20260913-001, HC-20260913-002, HC-20260913-004, HC-20260913-005, HC-20260913-006, HC-20260913-003
- **Continuing:** HC-20260830-007, HC-20260830-008, HC-20260830-001, HC-20260830-002, HC-20260830-003, HC-20260830-004, HC-20260830-005, HC-20260830-006, HC-20260830-009, HC-20260830-011, HC-20260830-016
- **Resolved since previous audit:** HC-20260830-012, HC-20260830-013, HC-20260830-014, HC-20260830-015
- **Reopened:** None
- **Deferred:** None
- **Risk accepted:** None

## 7. Changes since the previous audit

Compared against `health-check-2026-08-31-0602-UTC.json`.


Commits since the previous audit:

```
462b9e2 docs(tracker): remove completed actions and historical progress entries
2f83fa3 refactor(verification): resolve third-party verification URL and secrets exclusively from environmental secrets
873d888 fix(verification): enforce required status precedence across multiple categories and ensure sole trader certificate exemption
f493f82 fix(ui): use unicode arrow symbol for Proceed to Enhanced Review button text
d738d4d docs(verification): clarify single purchase model and auditor-assessed outcome tiers
b582727 feat(verification): ask users to select AI Verification or Enhanced Verification on Become Verified page
bdb52f8 fix(types): correct state setter name in SponsoredPlacementCard
a9efa10 fix(payments): surface specific API error message on dev payment simulation failures
5ef3924 feat(verification): map third-party verification platform environment variables to shared secret resolution
33dd3dc feat(verification): add shared secret management and inbound partner status callback API
```

## 8. Recommended priorities

1. **HC-20260913-001** (HIGH) — Production build did not pass
2. **HC-20260913-002** (HIGH) — Type checking did not pass
3. **HC-20260913-004** (HIGH) — Unit tests did not pass

## 9. Commands executed

- `npm run build` → FAILED
- `npm run type-check` → FAILED
- `npm run lint` → FAILED
- `npm run test` → FAILED
- `npm audit --audit-level=high` → FAILED
- `npx prisma validate` → FAILED
- `node scripts/health-check/validate-migrations.mjs` → FAILED

## 10. Checks skipped, unavailable, blocked or timed out

| Check | Status | Reason | Risk created | Required corrective action |
| --- | --- | --- | --- | --- |
| Formatting validation | UNAVAILABLE | No "format:check" script is defined in package.json. | Formatting drift is not enforced automatically. | Add a formatter (for example Prettier) and a "format:check" script. |
| Integration tests | UNAVAILABLE | No "test:integration" script is defined in package.json. | Payment, unlock and contact-release paths have no automated integration coverage. | Add integration tests against a disposable test database and a "test:integration" script. |
| Regression tests | UNAVAILABLE | No "test:regression" script is defined in package.json. | Previously fixed defects could silently reappear. | Add a "test:regression" script covering fixed defects. |
| End-to-end tests | UNAVAILABLE | No "test:e2e" script is defined in package.json. | Role separation and payment-gated journeys are not verified end to end. | Add Playwright or Cypress and a "test:e2e" script. |
| Test coverage | UNAVAILABLE | No "test:coverage" script is defined in package.json. | Coverage cannot be measured, so coverage reductions cannot be detected. | Add a coverage runner and a "test:coverage" script. |
| Accessibility testing | UNAVAILABLE | No "test:a11y" script is defined in package.json. | Accessibility regressions are not detected automatically. | Add automated accessibility checks and a "test:a11y" script. |
| Secret scanning (external tool) | UNAVAILABLE | gitleaks is not installed on the runner. | Committed credentials could go undetected by a dedicated scanner. | Install gitleaks in the workflow or enable GitHub secret scanning for the repository. The audit falls back to a built-in pattern scan, which is weaker. |
| Static security analysis | UNAVAILABLE | semgrep is not installed on the runner. | Code-level security weaknesses are only detected by review and the built-in pattern analysis. | Enable GitHub CodeQL or add semgrep to the workflow. |
| Dead-code and unused-export detection | UNAVAILABLE | No "lint:dead-code" script is defined in package.json. | Unused code accumulates and hides real defects. | Add knip or ts-prune and a "lint:dead-code" script. |

## 11. Delivery status

| Item | Value |
| --- | --- |
| Report writing status | WRITTEN |
| Email delivery status | PENDING |
| Workflow run URL | Not applicable (local run). |
| Report pull request URL | Created by a later job in this workflow run. |

---

_Generated by the Trade Tender repository health check. This report is evidence for a human decision; it does not authorise a release._
