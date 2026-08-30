# Trade Tender — Production Readiness Review (2026-08-28)

Structured full-system review performed by the Lead Architect, Security Reviewer, Secure Backend Developer,
QA Engineer, Corporate Frontend Developer, and Release Engineer agents. This document tracks findings
that were **fixed** in this pass and items that remain **outstanding** and require a human/product decision
before the platform can be considered production ready.

## Business Plan Alignment Assessment (2026-08-28)

Assessment of the current implementation against [docs/TradeTender-Business-Plan.md](TradeTender-Business-Plan.md).
This is a point-in-time gap analysis, not a repeat of the earlier technical review above.

### Confirmed aligned with the business plan

- Roles, workflow order (Raise Tender → Retailers Tender → Compare Prices → Award Contract), and the
  £10 Retailer unlock fee / £10 Client Accepted Quote Release Fee model (§5, §5.1) match the implementation.
- Retailer subscriptions (§5.2) and tiered Client release fees (§5.1) are built but correctly gated inactive
  behind Owner-controlled platform settings, matching "must not be included in the current revenue forecast."
- Staged visibility rules (§4.7): pre-unlock summary only, full detail after unlock, contact identities hidden
  until the release fee is confirmed — verified server-side and in rendered markup in the earlier security review.
- Tender/quote identifier format (`TND-YYYYMMDD-000001`, `-Q01`) (§4.9) matches exactly.
- 30-day quote retention / five-year accepted-quote-and-audit retention (§4.10) is implemented and tested.
- All 12 required footer/policy documents (§10, "Website Footer and Public Policy Documents") exist on
  `/policies`, including the Marketplace Disclaimer and Platform Role Statement.
- Retailer accreditations field, category/coverage-area matching, and email notifications (§4.3–§4.4) exist.

### Gaps found — recommended additions

1. **No misuse/fraud monitoring (§4.9 — Critical, recommended for launch readiness).** The business plan
   requires monitoring for "repeated parties, unusual payment behaviour, repeated cancellations, duplicate or
   near-duplicate tenders, and other potential misuse." No such detection exists today — `contentModeration.ts`
   only screens for premature contact/company disclosure in free-text fields, which is a different control.
   **Recommendation:** add a lightweight monitoring service (e.g. flag tenders with near-identical
   description/category/location from the same Client within a short window, flag Retailers with an unusually
   high ratio of unlocks-to-quotes, surface both as a Super User "Flags" panel) before scaling past pilot volume.

2. **Super User analytics filtering is incomplete against §4.6.** The plan requires filtering by "Client,
   Retailer, tender identifier, quote identifier, category, geographical area, status, date range, value band,
   subscription plan, and payment status." The current `getAnalytics`/`parseAnalyticsFilters`
   ([src/server/domain/analyticsService.ts](../src/server/domain/analyticsService.ts)) only supports date
   range, category, and region. **Recommendation:** extend the filter set to include tender/quote status,
   value band, and a free-text Client/Retailer/identifier search; expose subscription plan and payment status
   filters once membership/subscription usage data exists to filter against.

3. **Partner advertising is static, not Super-User-managed (§10).** The plan requires the Super User to
   "manage partner names, locations, destination links, active status, and display positions." Sinclair Safety
   Solutions Ltd and Smart Works Civils Ltd are currently hardcoded in
   [src/components/layout/SiteFooter.tsx](../src/components/layout/SiteFooter.tsx). This was already tracked
   as an outstanding README item; re-confirmed here as a direct business-plan requirement, not just a "nice to
   have."

4. **No formal Retailer approval/vetting gate (§10, Phase Three).** The plan lists "Retailer approval"
   alongside Super User suspension as a Phase Three control. Today, Retailer accounts are self-serve and active
   immediately after email verification; there is no admin review step before a new Retailer can receive
   matched opportunities or submit quotes. **Recommendation:** clarify with the business owner whether this
   means (a) a formal pre-activation approval queue, or (b) the existing suspend/activate control is sufficient
   post-launch moderation. If (a), add a `pendingApproval` state to `RetailerProfile` and a Super User approval
   queue before matching/notification begins.

5. **No performance/load testing evidence for the "1,000 concurrent users" target (§4.10).** No load-testing
   scripts, results, or CI job exist in the repository. This is an operational/QA task, not a code gap, but
   should be scheduled before the funded pre-launch assurance budget (§7.5, £770–£2,150) is spent.

6. **Retailer confirmation step (§4.6) is not implemented.** The plan lists "Retailer confirmations where a
   confirmation step is used" as an analytics metric, implying an optional post-acceptance confirmation from
   the Retailer (e.g. confirming they will fulfil the awarded work). No such step exists; quote lifecycle stops
   at `ACCEPTED`. **Recommendation:** treat as an optional Phase Seven enhancement — confirm with the business
   owner whether this is required for the Year 1 launch or a later refinement.

7. **Launch-credit window is a fixed field (`launchCreditsLeft`), not a time-boxed 90-day window (§Executive
   Summary, §5, §9.4).** The plan describes a 90-day Retailer launch credit window, extendable "selectively by
   category, region, or Retailer group." The current implementation grants a flat credit count per Retailer
   with no start/end date or category/region-scoped extension mechanism. **Recommendation:** clarify whether
   the flat-credit model is an accepted simplification for Year 1, or whether a dated window with
   category/region overrides is required before the marketing launch begins.

None of the above are security defects; they are business-requirement gaps and are listed here so they can be
prioritized alongside the technical outstanding items below.

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

1. ~~**Azure SQL migration story is unverified.**~~ **Resolved 2026-08-30 by the move to Render.**
   The application now uses a single PostgreSQL datasource in every environment. `prisma/schema.prisma`
   targets `postgresql`, `prisma/schema.sqlserver.prisma` and its generator script were deleted, and the
   SQLite-dialect migration history was replaced by one `0_init` PostgreSQL migration that has been
   applied and seeded successfully. Render runs `prisma migrate deploy` during every build.
2. ~~**No CI/CD pipeline to Azure App Service.**~~ **Resolved 2026-08-30.** `.github/workflows/ci.yml`
   gates lint, type-check, tests, and build against a PostgreSQL service container on `main` and
   `staging`. Deployment is handled by Render from the connected branch, described in `render.yaml`.
3. ~~**Two differently-timestamped migrations share the name `link_unlock_payment_to_tender`**~~
   **Resolved 2026-08-30.** The ambiguous history was collapsed into the single `0_init` migration.

### High

4. **No rate limiting / brute-force protection** on `/api/auth/*` (login via NextAuth `authorize()`, and
   registration). Needs an app-level limiter (e.g. per-IP/per-email counter) or an infra-level control.
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
12. ~~**No CI check that `prisma/schema.sqlserver.prisma` stays in sync**~~ **Resolved 2026-08-30** — there is
    now only one schema file, so the drift risk no longer exists.
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

### Business plan gaps (see full assessment above)

21. **Critical for launch:** no misuse/fraud monitoring (duplicate tenders, repeated parties, unusual payment
    behaviour) per business plan §4.9.
22. **High:** Super User analytics filters are missing status, value band, payment status, subscription plan,
    and Client/Retailer/identifier search per §4.6.
23. **High:** partner advertising (Sinclair Safety Solutions Ltd, Smart Works Civils Ltd) is hardcoded rather
    than Super-User-managed per §10.
24. **Medium:** no formal Retailer approval/vetting gate before matching begins — clarify against §10 Phase
    Three intent.
25. **Medium:** no evidence of load testing against the 1,000-concurrent-user target in §4.10.
26. **Low:** optional Retailer confirmation step from §4.6 is not implemented — confirm whether required for
    Year 1.
27. **Low:** the 90-day, category/region-extendable launch credit window from the Executive Summary/§9.4 is
    currently a flat per-Retailer credit count with no time window or scoped extension mechanism.

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
