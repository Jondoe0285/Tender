# Trade Tender

A UK construction tendering marketplace connecting Clients with registered Retailers, built with
Next.js, TypeScript, Tailwind CSS, Prisma, and NextAuth. See [docs/TradeTender-Business-Plan.md](docs/TradeTender-Business-Plan.md)
for the full product and business specification.

## Status

This repository has a working backend vertical slice: authentication, tender creation and
matching, staged visibility, Retailer unlock, quote submission/comparison, Client acceptance, and
a contact-release workflow with audit logging. Client quote comparison now supports sortable
side-by-side fields, best-value indicators, and a server-generated PDF export. Payments are scaffolded against Stripe but run in a
**dev-only fallback** until real Stripe keys are configured (see [Payments](#payments) below). The
UI follows an enterprise-SaaS visual standard (soft shadows, consistent spacing, accessible
searchable dropdowns, loading/success button states) using a shared component kit in
`src/components/ui/`. Each role has its own dedicated sidebar navigation (`src/components/layout/AppShell.tsx`,
configured in `src/lib/navigation.ts`) grouped into logical sections using construction-industry terms.
The Super User area now includes an executive analytics dashboard with filters, decision insights,
charts for tender volume/conversion/regional activity, category performance, CSV export, and
drill-down links.
First-time Client and Retailer flows now include clearer role onboarding, explicit fee/privacy
explanations, and resumable accepted-quote payment state after refresh.
Sign-in is a single mechanism: after successful authentication, the server-issued approved role
routes the user to exactly one workspace (`/client`, `/retailer`, or `/super-user`).

See [Outstanding Tasks](#outstanding-tasks) for what is not yet built.

## Roles

- **Client** — creates tenders, receives and compares quotes, accepts a quote, and pays the
  Accepted Quote Release Fee.
- **Retailer** — manages categories and coverage, receives matched tender summaries, unlocks full
  tender details, and submits quotes.
- **Super User** — reviews platform activity, categories, fees, and partner advertising (currently
  read-only).

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

## Outstanding Tasks

Not yet built — tracked here and kept current as work progresses:

- [x] Core unit tests for identifiers, tender/quote validation, and same-origin protection
- [ ] Super User management actions (categories, fees, users, waivers) — dashboard is currently read-only
- [ ] Email notifications to matched Retailers (currently only an audit event + DB row is created)
- [ ] File/attachment upload for tenders and quotes — the tender creation wizard's "Upload Files" step lets Clients select files, but they are not yet persisted anywhere (no storage backend)
- [ ] Rate limiting and abuse monitoring on sensitive endpoints (SEC-084/096)
- [ ] Data retention and deletion jobs for 30-day quote retention / 5-year audit retention (SEC-100/101)
- [x] Basic same-origin protection for browser mutation requests (SEC-085); production review of CSRF strategy still required
- [ ] Real Stripe keys wired up and webhook tested against a live/test Stripe account
- [ ] Public policy pages (Terms, Privacy, Cookie, Refund, Contact-Release, etc.) linked from the footer
- [ ] Partner advertising management (currently static placeholders on the Super User dashboard)
- [ ] Visual/accessibility QA pass with real screen readers and devices (no screenshot/visual-regression tooling in this sandbox)
- [ ] Standalone toast/notification system for success/error feedback beyond inline button and form states
- [ ] First-time journey usability testing with real Clients and Retailers to validate completion time and abandonment assumptions
- [x] Single sign-in routing to the authenticated user&rsquo;s approved workspace; password reset and MFA remain outstanding
- [ ] Suspend/edit actions on the new Super User Retailer/Client/Tender management pages (currently read-only lists)
- [ ] Manual QA of the mobile sidebar drawer on real devices (code-reviewed only in this sandbox)
- [ ] Secure supporting-document storage and downloads for quotes (comparison currently records a document filename only)
- [ ] Analytics trend data and regional/category reporting should be expanded with richer date-grain and postcode normalisation before production scale
- [ ] Integration/E2E coverage for authenticated tender, unlock, quote, payment, and contact-release journeys

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS, next/font (Archivo + Inter)
- **Database**: Prisma ORM — SQLite for local development, Azure SQL (SQL Server) for production
- **Auth**: NextAuth (Auth.js) credentials provider, bcrypt-hashed passwords, JWT sessions
- **Payments**: Stripe (checkout sessions + signature-verified webhook)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ (recommended 20)
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
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Leave blank locally — payment flows fall back to a dev-only confirmation endpoint when unset. Required in production. |

### Database setup

```bash
npm run db:generate   # generate the Prisma client
npm run db:migrate    # create/apply local SQLite migrations
npm run db:seed       # seed demo accounts (see "Demo accounts" below)
```

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the
[demo accounts](#demo-accounts) below, or register your own from `/register`.

## Demo accounts

`npm run db:seed` creates these accounts (local/dev only — change or remove before any real
deployment):

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Super User | `admin@tradetender.test` | `ChangeMe123!` | Platform overview dashboard |
| Client | `demo.client@tradetender.test` | `Demo1234!` | Has one seeded tender (`Bricks and blocks`, Leeds) already matched to the materials Retailer |
| Retailer | `demo.retailer.materials@tradetender.test` | `Demo1234!` | Northern Builders Merchants Ltd — Materials, Waste; covers Leeds, Manchester, Sheffield |
| Retailer | `demo.retailer.plant@tradetender.test` | `Demo1234!` | Pennine Plant Hire Ltd — Plant hire; covers Leeds, York |

Sign in as `demo.retailer.materials@tradetender.test` to see the seeded tender as a matched
opportunity, unlock it (a free launch credit is applied automatically), and submit a quote back to
`demo.client@tradetender.test`.

### Building for production

```bash
npm run build
npm start
```

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
├── seed.ts                 # Seeds a Super User account
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
