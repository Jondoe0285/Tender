# Trade Tender repository health check

**Overall status: PASS WITH WARNINGS**
**Release recommendation: ELIGIBLE FOR FIX REVIEW**

## 1. Executive summary

The audit ran 18 discovered checks against `staging` at commit `b068190`.
0 critical, 4 high, 2 medium, 9 low and 0 informational findings are currently open.
No release-blocking condition was met.
This audit does not approve its own release and does not implement fixes.

## 2. Run metadata

| Field | Value |
| --- | --- |
| Repository | Jondoe0285/Tender |
| Branch | staging |
| Commit SHA | `b068190d513c1cf46b8f8f8d8895ab2a2531c83c` |
| Trigger type | local |
| Workflow run ID | local-1788156158672 |
| Started | 2026-08-31T06:02:38.672Z |
| Completed | 2026-08-31T06:04:11.618Z |
| Environment | Local workstation |
| Audit scope | full |

## 3. Check results

| Check | Command | Result | Duration |
| --- | --- | --- | --- |
| Production build | `npm run build` | PASSED | 56s |
| Type checking | `npm run type-check` | PASSED | 9s |
| Linting | `npm run lint` | PASSED | 5s |
| Unit tests | `npm run test` | PASSED | 7s |
| Formatting validation | `(no command available)` | UNAVAILABLE | — |
| Integration tests | `(no command available)` | UNAVAILABLE | — |
| Regression tests | `(no command available)` | UNAVAILABLE | — |
| End-to-end tests | `(no command available)` | UNAVAILABLE | — |
| Test coverage | `(no command available)` | UNAVAILABLE | — |
| Accessibility testing | `(no command available)` | UNAVAILABLE | — |
| Dependency vulnerability scan | `npm audit --audit-level=high` | FAILED | 6s |
| Secret scanning (external tool) | `(no command available)` | UNAVAILABLE | — |
| Static security analysis | `(no command available)` | UNAVAILABLE | — |
| Database schema validation | `npx prisma validate` | PASSED | 3s |
| Migration validation | `node scripts/health-check/validate-migrations.mjs` | PASSED | 7s |
| Dead-code and unused-export detection | `(no command available)` | UNAVAILABLE | — |
| Container validation | `(no command available)` | NOT APPLICABLE | — |
| Infrastructure-as-code validation | `(no command available)` | NOT APPLICABLE | — |

**Test summary.** Unit tests: PASSED. Integration: UNAVAILABLE. Regression: UNAVAILABLE. End-to-end: UNAVAILABLE.

**Coverage summary.** UNAVAILABLE — this repository has no coverage command, so coverage reductions cannot be detected.

**Build result.** PASSED

**Migration result.** PASSED (schema validation: PASSED, production schema drift: UNAVAILABLE)

**Security result.** Dependency audit: FAILED. Secret scanning: UNAVAILABLE. Static analysis: UNAVAILABLE.

## 4. Findings by severity

| Severity | Open |
| --- | ---: |
| CRITICAL | 0 |
| HIGH | 4 |
| MEDIUM | 2 |
| LOW | 9 |
| INFORMATIONAL | 0 |

## 5. Detailed findings and authorisation blocks

### HC-20260830-012 — No automated test covers Stripe webhook signature and idempotency

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** Stripe webhook signature and idempotency is a payment or confidentiality critical path with no matching automated test. A regression here would not be detected before release.

**Evidence.**

Implementation exists at `src/app/api/webhooks/stripe/route.ts` but no test file references this behaviour.

**Affected files.** `src/app/api/webhooks/stripe/route.ts`
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A regression could expose restricted information or mis-charge a user without detection.
**Business impact.** Release confidence is materially reduced for the platform's highest-risk workflows.
**Likely root cause.** See evidence.
**Recommended fix.** Add an integration or regression test covering stripe webhook signature and idempotency, including the failure path.
**Approved-scope recommendation.** New test files plus any test-only helpers. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes — this finding is the missing test.
**Acceptance criteria.** A test fails when stripe webhook signature and idempotency is deliberately broken, and passes on the current implementation.
**Validation commands.** `npm test`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1788156158672
Finding ID: HC-20260830-012
Severity: HIGH
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: New test files plus any test-only helpers. No application behaviour changes.
Expected files: src/app/api/webhooks/stripe/route.ts
Required regression test: Yes — this finding is the missing test.
Acceptance criteria: A test fails when stripe webhook signature and idempotency is deliberately broken, and passes on the current implementation.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1788156158672

APPROVED FINDING IDS:
HC-20260830-012

APPROVED SCOPE:
New test files plus any test-only helpers. No application behaviour changes.

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

### HC-20260830-013 — No automated test covers Payment creation and charged totals

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** Payment creation and charged totals is a payment or confidentiality critical path with no matching automated test. A regression here would not be detected before release.

**Evidence.**

Implementation exists at `src/server/payments/paymentService.ts` but no test file references this behaviour.

**Affected files.** `src/server/payments/paymentService.ts`
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A regression could expose restricted information or mis-charge a user without detection.
**Business impact.** Release confidence is materially reduced for the platform's highest-risk workflows.
**Likely root cause.** See evidence.
**Recommended fix.** Add an integration or regression test covering payment creation and charged totals, including the failure path.
**Approved-scope recommendation.** New test files plus any test-only helpers. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes — this finding is the missing test.
**Acceptance criteria.** A test fails when payment creation and charged totals is deliberately broken, and passes on the current implementation.
**Validation commands.** `npm test`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1788156158672
Finding ID: HC-20260830-013
Severity: HIGH
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: New test files plus any test-only helpers. No application behaviour changes.
Expected files: src/server/payments/paymentService.ts
Required regression test: Yes — this finding is the missing test.
Acceptance criteria: A test fails when payment creation and charged totals is deliberately broken, and passes on the current implementation.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1788156158672

APPROVED FINDING IDS:
HC-20260830-013

APPROVED SCOPE:
New test files plus any test-only helpers. No application behaviour changes.

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

### HC-20260830-014 — No automated test covers Retailer tender unlocking

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** Retailer tender unlocking is a payment or confidentiality critical path with no matching automated test. A regression here would not be detected before release.

**Evidence.**

Implementation exists at `src/server/domain/unlockService.ts` but no test file references this behaviour.

**Affected files.** `src/server/domain/unlockService.ts`
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A regression could expose restricted information or mis-charge a user without detection.
**Business impact.** Release confidence is materially reduced for the platform's highest-risk workflows.
**Likely root cause.** See evidence.
**Recommended fix.** Add an integration or regression test covering retailer tender unlocking, including the failure path.
**Approved-scope recommendation.** New test files plus any test-only helpers. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes — this finding is the missing test.
**Acceptance criteria.** A test fails when retailer tender unlocking is deliberately broken, and passes on the current implementation.
**Validation commands.** `npm test`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1788156158672
Finding ID: HC-20260830-014
Severity: HIGH
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: New test files plus any test-only helpers. No application behaviour changes.
Expected files: src/server/domain/unlockService.ts
Required regression test: Yes — this finding is the missing test.
Acceptance criteria: A test fails when retailer tender unlocking is deliberately broken, and passes on the current implementation.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1788156158672

APPROVED FINDING IDS:
HC-20260830-014

APPROVED SCOPE:
New test files plus any test-only helpers. No application behaviour changes.

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

### HC-20260830-015 — No automated test covers Quote acceptance and contact release

- **Severity:** HIGH
- **Confidence:** Confirmed
- **Lifecycle state:** Continuing
- **First seen:** 20260830

**Summary.** Quote acceptance and contact release is a payment or confidentiality critical path with no matching automated test. A regression here would not be detected before release.

**Evidence.**

Implementation exists at `src/server/domain/contactReleaseService.ts` but no test file references this behaviour.

**Affected files.** `src/server/domain/contactReleaseService.ts`
**Line numbers.** Not applicable.

**Reproduction steps.** Run the validation commands listed below on a clean checkout.
**User impact.** A regression could expose restricted information or mis-charge a user without detection.
**Business impact.** Release confidence is materially reduced for the platform's highest-risk workflows.
**Likely root cause.** See evidence.
**Recommended fix.** Add an integration or regression test covering quote acceptance and contact release, including the failure path.
**Approved-scope recommendation.** New test files plus any test-only helpers. No application behaviour changes.
**Expected files to change.** Within the approved scope above.
**Regression test required.** Yes — this finding is the missing test.
**Acceptance criteria.** A test fails when quote acceptance and contact release is deliberately broken, and passes on the current implementation.
**Validation commands.** `npm test`
**Dependencies.** None.
**Change risk.** Low
**Rollback considerations.** Revert the fix commit; no data migration is involved.


--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: local-1788156158672
Finding ID: HC-20260830-015
Severity: HIGH
Confidence: Confirmed
Lifecycle state: Continuing

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: New test files plus any test-only helpers. No application behaviour changes.
Expected files: src/server/domain/contactReleaseService.ts
Required regression test: Yes — this finding is the missing test.
Acceptance criteria: A test fails when quote acceptance and contact release is deliberately broken, and passes on the current implementation.
Maximum permitted change risk: Low
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
local-1788156158672

APPROVED FINDING IDS:
HC-20260830-015

APPROVED SCOPE:
New test files plus any test-only helpers. No application behaviour changes.

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
# npm audit report

deepmerge-ts  <8.0.0
Severity: high
DeepmergeTS has stack exhaustion when merging recursive object graphs - https://github.com/advisories/GHSA-ggr8-5vv4-36mx
fix available via `npm audit fix --force`
Will install prisma@6.12.0, which is a breaking change
node_modules/deepmerge-ts
  @prisma/config  >=6.13.0-dev.1
  Depends on vulnerable versions of deepmerge-ts
  node_modules/@prisma/config
    prisma  >=6.13.0-dev.1
    Depends on vulnerable versions of @prisma/config
    node_modules/prisma

glob  10.2.0 - 10.4.5
Severity: high
glob CLI: Command injection via -c/--cmd executes matches with shell:true - https://github.com/advisories/GHSA-5j98-mcp5-4vw2
fix available via `npm audit fix`
node_modules/glob
  @next/eslint-plugin-next  14.0.5-canary.0 - 15.0.0-rc.1
  Depends on vulnerable versions of glob
  node_modules/@next/eslint-plugin-next
    eslint-config-next  14.0.5-canary.0 - 15.0.0-rc.1
    Depends on vulnerable versions of @next/eslint-plugin-next
    node_modules/eslint-config-next

next  9.3.4-canary.0 - 16.3.0-preview.10
Severity: high
Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration - https://github.com/advisories/GHSA-9g9p-9gw9-jx7f
Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components - https://github.com/advisories/GHSA-h25m-26qc-wcjf
Next.js: HTTP request smuggling in rewrites - https://github.com/advisories/GHSA-ggv3-7p47-pfv8
Next.js: Unbounded next/image disk cache growth can exhaust storage - https://github.com/advisories/GHSA-3x4c-7xq6-9pq8
Next.js has a Denial of Service with Server Components - https://github.com/advisories/GHSA-q4gf-8mx6-v5v3
Next.js Vulnerable to Denial of Service with Server Components - https://github.com/advisories/GHSA-8h8q-6873-q5fj
Next.js's Middleware / Proxy redirects can be cache-poisoned - https://github.com/advisories/GHSA-3g8h-86w9-wvmq
Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces - https://github.com/advisories/GHSA-ffhc-5mcf-pf4q
Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting - https://github.com/advisories/GHSA-vfv6-92ff-j949
Next.js has cross-site scripting in beforeInteractive scripts with untrusted input - https://github.com/advisories/GHSA-gx5p-jg67-6x7h
Next.js has a Denial of Service in the Image Optimization API - https://github.com/advisories/GHSA-h64f-5h5j-jqjh
Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades - https://github.com/advisories/GHSA-c4j6-fc7j-m34r
Next.js vulnerable to cache poisoning in React Server Component responses - https://github.com/advisories/GHSA-wfc6-r584-vfw7
Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n - https://github.com/advisories/GHSA-36qx-fr4f-26g5
Next.js: Denial of Service in App Router using Server Actions - https://github.com/advisories/GHSA-m99w-x7hq-7vfj
Next.js: Server-Side Request Forgery in Server Actions on custom servers - https://github.com/advisories/GHSA-89xv-2m56-2m9x
Next.js: Cache confusion of response bodies for requests with bodies - https://github.com/advisories/GHSA-68g3-v927-f742
Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences - https://github.com/advisories/GHSA-4633-3j49-mh5q
Next.js: Unbounded Server Action payload in Edge runtime - https://github.com/advisories/GHSA-4c39-4ccg-62r3
Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname - https://github.com/advisories/GHSA-p9j2-gv94-2wf4
Next.js: Unauthenticated disclosure of internal Server Function endpoints - https://github.com/advisories/GHSA-955p-x3mx-jcvp
Depends on vulnerable versions of postcss
fix available via `npm audit fix --force`
Will install next@16.3.3, which is a breaking change
node_modules/next

postcss  <=8.5.22
Severity: high
PostCSS has XSS via Unescaped </style> in
… output truncated (919 more characters).
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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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

Health-check run: local-1788156158672
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
local-1788156158672

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
scripts/health-check/verify-deployment-approval.mjs:52 — return !value || /^\[.*\]$/.test(value.trim()) || /PASTE|<[A-Z_ ]+>|TODO|EXAMPLE/i.test(value);

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

Health-check run: local-1788156158672
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
local-1788156158672

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

- **New:** None
- **Continuing:** HC-20260830-012, HC-20260830-013, HC-20260830-014, HC-20260830-015, HC-20260830-007, HC-20260830-008, HC-20260830-001, HC-20260830-002, HC-20260830-003, HC-20260830-004, HC-20260830-005, HC-20260830-006, HC-20260830-009, HC-20260830-011, HC-20260830-016
- **Resolved since previous audit:** HC-20260830-010, HC-20260830-017, HC-20260830-018
- **Reopened:** None
- **Deferred:** None
- **Risk accepted:** None

## 7. Changes since the previous audit

Compared against `health-check-2026-08-30-0822-UTC.json`.


Commits since the previous audit:

```
b068190 Run migration gates against PostgreSQL and add sharp
6e97bea Document the migration dialect failure, redeploy action, and health-check blind spot
05b5fcc Rewrite migrations in PostgreSQL dialect
32685c4 Correct README: garbled Status text, wrong clone URL, incomplete env table
4643f45 Document NEXTAUTH_URL redirect dependency and remaining verification step
79aaf9f Resolve auth redirects against the configured public origin
4a869bf Add forgotten password email flow
e3b73b5 Clean README heading
c3e52be Fix post-login workspace redirect
09282fd Configure Neon database setup
```

## 8. Recommended priorities

1. **HC-20260830-012** (HIGH) — No automated test covers Stripe webhook signature and idempotency
2. **HC-20260830-013** (HIGH) — No automated test covers Payment creation and charged totals
3. **HC-20260830-014** (HIGH) — No automated test covers Retailer tender unlocking

## 9. Commands executed

- `npm run build` → PASSED
- `npm run type-check` → PASSED
- `npm run lint` → PASSED
- `npm run test` → PASSED
- `npm audit --audit-level=high` → FAILED
- `npx prisma validate` → PASSED
- `node scripts/health-check/validate-migrations.mjs` → PASSED

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
