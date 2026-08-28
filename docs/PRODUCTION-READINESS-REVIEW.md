# Trade Tender — Production Readiness Review (2026-08-28)

Structured full-system review performed by the Lead Architect, Security Reviewer, Secure Backend Developer,
QA Engineer, Corporate Frontend Developer, and Azure Release Engineer agents. This document tracks findings
that were **fixed** in this pass and items that remain **outstanding** and require a human/product decision
before the platform can be considered production ready.

## Fixed in this review

- **Race condition on Retailer launch-credit unlocks** — concurrent unlock requests could both spend the same
  last credit. Now uses an atomic conditional `updateMany` guard. ([src/server/domain/unlockService.ts](../src/server/domain/unlockService.ts))
- **Duplicate `ContactRelease` rows possible under concurrent webhook/finalisation retries** — added a
  `@@unique` constraint on `ContactRelease.quoteId` (migration `20260828250000_add_contact_release_quote_unique`)
  and made `finalizeContactRelease` handle the race gracefully instead of relying on a non-atomic check-then-create.
- **`acceptQuote` threw a raw 500 on a concurrent duplicate release-payment creation** — now catches the
  unique-constraint conflict and returns the existing payment.
- **Accountant sub-accounts could grant free Retailer membership/subscription entitlements**, bypassing the
  payment flow — `/api/super-user/retailers/[id]/entitlements` now requires `requireFullSuperUser()` instead of
  plain `requireRole('SUPER_USER')`.
- **Tender match/item-match creation was not transactional** — wrapped in `prisma.$transaction` so a partial
  failure can't leave a tender half-matched.
- **Missing generic error handling** on `/api/internal/retention`, `/api/super-user/accountants/[id]`, and
  `/api/super-user/owner/super-users/[id]` — now use the shared `toErrorResponse` helper.
- **Off-brand, unused duplicate UI components** — deleted `src/components/ui/Input.tsx` and
  `src/components/ui/CardParts.tsx` (both unreferenced, both used non-approved gray/amber Tailwind colours
  instead of brand tokens; the actively-used `Input` lives in `src/components/ui/Field.tsx`).
- **No security headers** — added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Strict-Transport-Security`, `Permissions-Policy`, and `poweredByHeader: false` in [next.config.js](../next.config.js).
- **No Node engine pin** — added `"engines": { "node": ">=20 <21" }` to `package.json`.
- **No test coverage for Owner/Accountant permission gating** — added unit tests for
  `canManagePlatformOwnership` and `isAccountantOnly` in `tests/lib/admin-permissions.test.ts`.
- **Client tender detail page could spin on "Loading…" forever if the fetch failed** — added a persisted
  error message state in [src/app/client/tenders/[id]/page.tsx](../src/app/client/tenders/%5Bid%5D/page.tsx).
- **Retailer Performance dashboard ignored the Super-User-configurable analytics section toggles** — wired up
  in an earlier pass (`RetailerAnalyticsDashboard` + `retailerAnalyticsService`); confirmed still correct.

## Outstanding — requires product/human decision

### Critical

1. **Azure SQL migration story is unverified.** All 27 migrations under `prisma/migrations/` contain
   SQLite-dialect SQL (`PRAGMA`, `BOOLEAN`, `DATETIME`, `CURRENT_TIMESTAMP`). `prisma/schema.sqlserver.prisma`
   exists for the production datasource, but there is no SQL Server-flavoured migration history and no CI/CD
   step runs `prisma migrate deploy` against Azure SQL. **Running the current migrations as-is against Azure
   SQL will fail.** Decide and implement one of: (a) a parallel SQL Server migration set generated from the
   SQL Server schema, or (b) a single authoritative migration pipeline that targets Azure SQL directly with
   `prisma db push`/`migrate deploy` before first production deploy.
2. **No CI/CD pipeline to Azure App Service.** Only `.github/workflows/quote-retention.yml` (a scheduled purge
   job) exists. There is no workflow gating PRs on lint/type-check/tests/build, and no deploy workflow.
   Requires provisioning Azure publish credentials/service principal and authoring the pipeline.
3. **Two differently-timestamped migrations share the name `link_unlock_payment_to_tender`**
   (`20260828055907_...` and `20260828120000_...`), and 14+ migration folders are untracked in git
   (`git status --porcelain`). Confirm intended replay order, commit all migration folders, and verify a fresh
   database created from a clean checkout produces the same schema as the current dev database.

### High

4. **No rate limiting / brute-force protection** on `/api/auth/*` (login via NextAuth `authorize()`, and
   registration). Needs an app-level limiter (e.g. per-IP/per-email counter) or an infra-level control
   (Azure Front Door / API Management).
5. **`isOwner`/`isAccountant` sub-tiers and their Owner Console / Accounting Space pages are not documented**
   in `docs/TradeTender-Business-Plan.md`, `docs/Architecture.md`, or `docs/Product-Requirements.md`, even
   though the code correctly stays within the 3-role model (both are flags on the Super User role, not new
   Role enum values). Add a short section to the business plan/architecture docs describing this governance
   layer so it's auditable against the approved plan.
6. **Retention purge for tender attachments is age-based only** — `retentionService.ts` deletes attachments
   older than 30 days regardless of whether the tender is still `OPEN` or could still receive/accept a quote.
   Decide whether attachment retention should be tied to tender lifecycle state, not just upload age.
7. **Zero automated test coverage for the money-and-privacy-critical paths**: `unlockService`,
   `contactReleaseService`, `paymentService.confirmPayment` idempotency, the Stripe webhook handler, and the
   actual deletion behavior of `purgeExpiredUnpurchasedQuotes`. These need integration tests against a test
   database before this can be called production ready.
8. **Dev-only `/api/dev/confirm-payment` never finalises unlocks or contact releases** for
   `RETAILER_UNLOCK`/`CLIENT_RELEASE` payment types (unlike the real Stripe webhook), so local/dev testing of
   those flows without Stripe keys is currently broken. Confirm whether this route needs those code paths
   added, or whether it's intentionally scoped to sponsored-placement/membership testing only.

### Medium

9. **Owner/Accountant restriction is duplicated per-page** (`if (user.isAccountant) redirect(...)` repeated in
   every `src/app/super-user/**/page.tsx`) rather than centralized in middleware or a shared layout. Works
   today but has no structural guard against a future page omitting the check. Consider a
   `(super-user)` route-group layout or a `requireSuperUserPage()` helper.
10. **Duplicate-reference race under concurrent tender/quote submission** — `tenderService`/`quoteService`
    generate `reference` from a `count()` read then a separate `create()`; a concurrent collision throws an
    unhandled unique-constraint error surfaced as a generic 500. Add retry-on-conflict or a transactional
    sequence generator.
11. **Remaining API routes without `try/catch` around `toErrorResponse`**: `register`, `verify-email`,
    `super-user/users`, `super-user/users/[id]`, `super-user/analytics/export`, `tenders/[id]/quotes/pdf`.
    Lower risk (Next.js does not leak stack traces in production by default) but inconsistent with the app's
    own error-response contract. Recommend a follow-up pass once the above business-logic fixes are verified.
12. **No CI check that `prisma/schema.sqlserver.prisma` stays in sync** with `prisma/schema.prisma` — currently
    correct, but nothing prevents drift if someone edits the generated file directly or forgets
    `npm run db:sync-prod-schema`.
13. **No documented Stripe production webhook registration steps** (URL, secret rotation) — signature
    verification code is correct, but the operational runbook is missing from deployment docs.
14. **Membership monthly-allowance check in `unlockService`** (`monthlyUnlockCount < freeTenderOpportunitiesPerMonth`)
    is still read-then-write, not fully atomic like the credit-decrement fix above. Lower financial risk (bounded
    by the monthly allowance, not unlimited) — revisit if concurrent unlock abuse is observed.
15. **Retention purge job scheduling depends on `RETENTION_JOB_URL`/`RETENTION_JOB_SECRET` GitHub secrets**
    being correctly configured for the production environment target — not verified as part of this review.

### Low

16. Duplicate near-identical list markup between `super-user/tenders` and `AccountManagementTable` — candidate
    for a shared `DataTable`/`RecordList` component (design decision).
17. Loading states across the app are a bare `<p>Loading…</p>` with no stable-height skeleton, technically at
    odds with the brand rule "maintain stable dimensions … so content does not shift." Needs a shared skeleton
    component (design decision).
18. No `src/app/error.tsx` / per-portal `loading.tsx` App Router conventions in use — everything is hand-rolled
    per client component. Consider adding as a defence-in-depth safety net.
19. Recharts grid colour (`#E2E8F0`) in the analytics dashboards is a generic slate, not one of the approved
    palette hexes. Cosmetic; swap for `concrete-grey` at reduced opacity if desired.
20. No breached-password check (e.g. HaveIBeenPwned k-anonymity) beyond the existing 10-character minimum.
    Acceptable under NIST 800-63B guidance; flagged for awareness only.

## Verified secure / no action needed

- Stripe webhook signature verification, amount matching, and idempotency (event ID + `PENDING` guard).
- Contact details (Client/Retailer identity) are never exposed before a `CONFIRMED` `CLIENT_RELEASE` payment,
  both in API responses and rendered markup.
- No raw SQL (`$queryRaw`/`$executeRaw`) anywhere — all data access goes through Prisma.
- No hardcoded secrets/API keys found in source.
- IDOR ownership checks are consistent across quote accept/release, tender unlock/finalize, and quote
  submission/listing routes.
- `.env.example` documents all `process.env.*` usages found across `src/`, `scripts/`, and `prisma/seed.ts`.
- `prisma/dev.db` and other local artifacts are correctly git-ignored.
- Accessibility basics (image alt text, `aria-label` on icon-only buttons, labelled form fields) — no issues found.
- No `console.log`/`console.error` in client-side (`'use client'`) components.
