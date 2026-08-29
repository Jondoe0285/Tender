| `RESEND_API_KEY` | Server-only Resend API key. Never commit this value. |
| `RESEND_FROM_EMAIL` | Sender using a verified Resend domain/address. |
# Trade Tender

A UK construction tendering marketplace connecting Clients with registered Retailers, built with
Next.js, TypeScript, Tailwind CSS, Prisma, and NextAuth. See [docs/TradeTender-Business-Plan.md](docs/TradeTender-Business-Plan.md)
for the full product and business specification.

## Status

This repository has a working backend vertical slice for the approved Trade Tender flow: authentication,
tender creation and matching, staged visibility, Retailer unlock, quote submission/comparison,
Client acceptance, and a contact-release workflow with audit logging.

The application now includes a server-side moderation layer that blocks or reviews suspicious content
before it is shared, including contact details, direct outside-platform communication attempts,
company identifiers, URLs, and other information that should stay within the platform until the
correct payment or authorization conditions are met. Content moderation events are recorded to the
append-only moderation audit trail, and the Contact-Release workflow only exposes the counterparty's
contact details after the server has confirmed the release payment.

Client quote comparison supports sortable side-by-side fields, best-value indicators, and a
server-generated PDF export. Payments are scaffolded against Stripe but run in a **dev-only
fallback** until real Stripe keys are configured (see [Payments](#payments) below). The UI follows
an enterprise-SaaS visual standard using a shared component kit in `src/components/ui/`, and each
role has its own dedicated sidebar navigation (`src/components/layout/AppShell.tsx`, configured in
`src/lib/navigation.ts`) grouped into logical sections using construction-industry terms.

The Super User area includes an executive analytics dashboard with filters, decision insights, charts
for tender volume/conversion/regional activity, category performance, CSV export, and drill-down
links. First-time Client and Retailer flows include clearer role onboarding, explicit fee/privacy
explanations, and resumable accepted-quote payment state after refresh. Sign-in uses a single
server-authorized routing path to exactly one workspace (`/client`, `/retailer`, or `/super-user`).
Accounts with both Client and Retailer memberships see a workspace selector in the authenticated
dashboard header, and switching is revalidated against persisted role membership on the server.
Tender saving preserves the draft and reports actionable validation, server, or connection errors.
Retailer profile and team management is available from the Retailer workspace, including company
details, operational counties, service categories, master-user designation, and team permissions.
Transactional email uses a central corporate template library for retailer invitations, matched
tender alerts, quote events, payment events, contact release, account updates, password reset, and
failed-payment recovery. Resend delivery is server-only and controlled by environment variables.
New account registrations notify `info@sinclairsafetysolutions.co.uk` when Resend is configured;
the notification contains role and contact details but never a password or authentication secret.
New Client and Retailer accounts receive a single-use email-verification link that expires after 24
hours. Unverified accounts cannot sign in
Super Users can edit categories, payment fees, Client acceptance fee mode, membership tiers,
annual subscription plans, and Retailer assignments. Client acceptance fees support a fixed amount
or separate percentage rules for quote values up to £10,000 and above £10,000. Retailers and Clients
can use tender-scoped internal messaging after a Retailer unlocks an opportunity; messages are
moderated for contact, company, contract, and off-platform information. Client companies receive a
unique Trade Tender ID for retailer quoting, and retention jobs delete unpurchased quotes and
documents after 30 days while purchased records are retained for five years.
Super Users can also activate a paid sponsored-placement product for Retailers; purchased placements
appear in a separate labelled area on Client quote pages and do not change quote ranking or sorting.
| `REGISTRATION_NOTIFICATION_EMAIL` | Internal recipient for new-account notifications; defaults to `info@sinclairsafetysolutions.co.uk` in `.env.example`. |

Within the Super User role, an **Owner** flag gates the most critical controls — fees, adspace,
membership tiers, sponsored placement, and creating or managing other Super Userlogout button still does not go to landing accounts — from the
Owner Console at `/super-user/owner`. An **Accountant** flag restricts a Super User sub-account to a
read-only Accounting Space (`/super-user/accounting`) with receipts, invoices, and performance
reporting only, with no access to Super User settings or user management. Both are attributes on the
existing Super User role, not additional roles, and both account types are created only by a full
Super User. The Retailer Performance dashboard now surfaces trends, category/regional performance,
quote value, response time, and platform benchmark sections, each independently toggleable from Site
Settings.

A structured production-readiness review (architecture, security, backend correctness, QA, brand/UI,
and deployment) was completed on 2026-08-28; see
[docs/PRODUCTION-READINESS-REVIEW.md](docs/PRODUCTION-READINESS-REVIEW.md) for fixed findings and
remaining outstanding items, most notably the unresolved Azure SQL migration path and missing CI/CD
deploy pipeline.

See [Outstanding Tasks](#outstanding-tasks) for the remaining production-hardening work.

## Roles

- **Client** — creates tenders, receives and compares quotes, accepts a quote, and pays the
  Accepted Quote Release Fee.
- **Retailer** — manages categories and coverage, receives matched tender summaries, unlocks full
  tender details, and submits quotes.
- **Super User** — manages platform activity, categories, fees, memberships, subscriptions, and
  partner advertising. Two attributes on this role narrow access further: **Owner** (critical
  settings and Super User account management) and **Accountant** (read-only Accounting Space only).

## Navigation

Each role has its own sidebar (`src/lib/navigation.ts`), grouped by task:

| Client | Retailer | Super User |
| --- | --- | --- |
| Dashboard | Dashboard | Dashboard |
| Create Tender | New Opportunities | Tender Management |
| My Tenders | Unlocked Tenders | Retailer Management |
| Quotes Received | Submitted Quotes | Client Management |
| Awarded Projects | Performance | Payment Monitoring |
| Billing | Billing | Analytics |
| Profile | Profile | Categories |
| | | Site Settings |
| | | Accountant Management |
| | | Accounting Space |
| | | Owner Console (Owner only) |

An Accountant sub-account only ever sees Accounting Space; every other Super User page redirects it there.

## Outstanding Tasks

The core product flow is now implemented and verified. See
[docs/PRODUCTION-READINESS-REVIEW.md](docs/PRODUCTION-READINESS-REVIEW.md) for the full, prioritized
list from the latest structured production-readiness review, including a dedicated
[Business Plan Alignment Assessment](docs/PRODUCTION-READINESS-REVIEW.md#business-plan-alignment-assessment-2026-08-28).
Highlights:

- [ ] **Critical:** verify/build a working Azure SQL migration path (current migrations are SQLite-only)
- [x] **CI/CD baseline implemented:** GitHub Actions gates lint, type-check, tests, and production build on PRs and pushes to `main`; Azure deployment workflow is scaffolded and requires Azure secrets and live environment validation.
- [x] **Auth abuse hardening in repo:** login and registration routes now enforce a simple in-app rate limit using source IP headers.
- [ ] **Critical (business plan §4.9):** misuse/fraud monitoring — repeated parties, unusual payment
  behaviour, duplicate/near-duplicate tenders — is not implemented
- [x] Super User management actions for users and waivers, plus Owner/Accountant governance tiers
- [x] Data retention job for 30-day non-accepted quote deletion and five-year accepted quote locks (SEC-100/101)
- [ ] Configure real Stripe keys and test signed webhooks, refunds, and chargebacks against a live/test Stripe account
- [ ] Partner advertising management (currently static placeholders; business plan §10 requires this to be
  Super-User-managed, not hardcoded)
- [ ] Super User analytics filters are missing status, value band, payment status, subscription plan, and
  Client/Retailer/identifier search required by business plan §4.6
- [ ] Clarify whether a formal Retailer approval/vetting gate is required before matching begins (§10 Phase Three)
- [ ] Visual/accessibility QA pass with real screen readers and devices
- [ ] Standalone toast/notification system for success/error feedback beyond inline button and form states
- [ ] First-time journey usability testing with real Clients and Retailers
- [ ] Suspend/edit actions on the new Super User Retailer/Client/Tender management pages
- [ ] Manual QA of the mobile sidebar drawer on real devices
- [ ] Secure supporting-document storage and downloads for Retailer quote documents
- [ ] Load/performance testing evidence against the 1,000-concurrent-user target (§4.10)
- [x] Retailer analytics expansion (trends, category, regional, quote value, response time, benchmark)
- [ ] Integration/E2E test coverage for unlock, payment, webhook, and contact-release journeys
  (see docs/PRODUCTION-READINESS-REVIEW.md for the specific gaps)

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS, next/font (Archivo + Inter)
- **Database**: Prisma ORM — SQLite for local development, Azure SQL (SQL Server) for production
- **Auth**: NextAuth (Auth.js) credentials provider, bcrypt-hashed passwords, JWT sessions
- **Payments**: Stripe (checkout sessions + signature-verified webhook)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20.x (pinned via `engines` in `package.json`)
- npm

### Installation

```bash
git clone https://github.com/TenantSpace/Tender.git
cd Tender
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` for local SQLite. Points at Azure SQL in production. |
| `NEXTAUTH_SECRET` | Long random string. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `NEXTAUTH_URL` | `http://localhost:3000` locally. |
| `RESEND_API_KEY` | Required to deliver email-verification links to self-registered users. |
| `RESEND_FROM_EMAIL` | Required verified Resend sender used for verification emails. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Leave blank locally — payment flows fall back to a dev-only confirmation endpoint when unset. Required in production. |
| `RETENTION_JOB_SECRET` | Secret used by the scheduled retention endpoint and CLI job. Required in production. |

### Database setup

```bash
npm run db:generate   # generate the Prisma client
npm run db:migrate    # create/apply local SQLite migrations
npm run db:seed       # create local development accounts
```

### CI/CD and release status

The repository now includes GitHub Actions workflows for validation and Azure deployment:

- `.github/workflows/ci.yml` runs `npm run lint`, `npm run type-check`, `npm test`, and `npm run build` on PRs and pushes to `main`.
- `.github/workflows/deploy-azure.yml` builds the app and deploys to Azure App Service when the required Azure secrets are present.

This closes the missing pipeline scaffolding, but live Azure deployment still requires:

- Azure App Service app name and credentials stored as GitHub repository secrets
- a verified Azure SQL migration path for production
- post-deployment smoke checks for auth, payment, and privacy flows

### Quote retention job

`npm run retention:purge` deletes non-accepted quotes and their unpurchased tender documents submitted
more than 30 days ago and records each deletion in the audit log. In production, schedule that command
or `POST /api/internal/retention` daily with the `Authorization: Bearer $RETENTION_JOB_SECRET` header.
Documents linked to an accepted purchase remain locked for five years. The included GitHub Actions workflow runs daily; configure repository secrets
`RETENTION_JOB_URL` and `RETENTION_JOB_SECRET` to enable it.

### Seeded users

`npm run db:seed` creates or refreshes the following local-only accounts. It refuses to run when
`NODE_ENV=production`.

| Role | Email | Password |
| --- | --- | --- |
| Super User | `PLATFORM_OWNER_EMAIL` from `.env` | `PLATFORM_OWNER_PASSWORD` from `.env` |
| Client | `client@example.test` | `TradeTenderDev!2026` |
| Retailer | `retailer@example.test` | `TradeTenderDev!2026` |

Set `PLATFORM_OWNER_EMAIL` and `PLATFORM_OWNER_PASSWORD` in the ignored `.env` file before
running the seed. The Retailer account includes a basic company profile and launch credits. The
seed command does not create tenders, quotes, payments, or production data.

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account from `/register`.

### Building for production

```bash
npm run build
npm start
```

### Azure deployment notes

A production deployment is expected to run behind Azure Front Door, App Service, Azure SQL, and Blob Storage. The repository includes the deployment workflow scaffolding, but Azure secrets and a verified SQL Server migration strategy remain required before a live release is production-safe.

## Payments

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not set in this environment. Without them:

- Retailer unlock and Client release-fee payments are created as `PENDING` records with no Stripe
  checkout session.
- A dev-only endpoint (`/api/dev/confirm-payment`) lets you simulate payment confirmation locally.
  It refuses to run once Stripe is configured or `NODE_ENV=production`.
- The production webhook (`/api/webhooks/stripe`) verifies signatures against the raw payload and
  is the only path allowed to confirm payments in a real deployment.

## Database: local SQLite vs. production Azure SQL

`prisma/schema.prisma` is the source of truth and targets SQLite for local development.
`prisma/schema.sqlserver.prisma` is a generated copy targeting Azure SQL for production — do not
edit it by hand. After changing `prisma/schema.prisma`, regenerate it:

```bash
npm run db:sync-prod-schema
```

## Project Structure

```
prisma/
├── schema.prisma           # Local dev datasource (SQLite)
├── schema.sqlserver.prisma # Generated production datasource (Azure SQL)
├── seed.ts                 # Creates local Super User, Client, and Retailer development accounts
└── migrations/
src/
├── app/                    # Next.js routes and role portals
│   ├── page.tsx            # Role selection landing page
│   ├── login/, register/   # Auth pages
│   ├── client/              # Client portal (dashboard, tender creation/detail)
│   ├── retailer/            # Retailer portal (dashboard, tender detail/unlock/quote)
│   ├── super-user/          # Super User dashboard (read-only)
│   └── api/                 # Route handlers (auth, tenders, quotes, payments, webhooks)
├── components/
│   ├── ui/                  # Reusable UI primitives (Button, Card, StatusBadge)
│   ├── layout/              # Shared header, footer, account controls
│   └── providers/           # Client-side context providers (NextAuth session)
├── server/
│   ├── auth/                 # NextAuth config, session helpers, password hashing
│   ├── data/                  # Prisma client singleton
│   ├── domain/                 # Business rules: tenders, matching, unlock, quotes, contact release
│   ├── payments/                # Stripe client and payment service
│   ├── audit/                    # Append-only audit log writer
│   └── http/                      # Shared API error mapping
├── lib/                     # Categories, identifier generators, Zod schemas
└── middleware.ts            # Role-based route protection
```

## Documentation

- [docs/TradeTender-Business-Plan.md](docs/TradeTender-Business-Plan.md) — business model, roles, and pricing
- [docs/Product-Requirements.md](docs/Product-Requirements.md) — functional requirements
- [docs/Architecture.md](docs/Architecture.md) — target architecture and trust boundaries
- [docs/Security-Requirements.md](docs/Security-Requirements.md) — security requirements
- [docs/branding/TradeTender-Brand-Rules.md](docs/branding/TradeTender-Brand-Rules.md) — brand and UI standards

## License

MIT
