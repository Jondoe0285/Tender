# Trade Tender

Trade Tender is a UK construction tendering platform. Clients create tenders, matched Retailers
unlock opportunities and submit quotes, and Clients compare quotes before releasing contact
details through the required payment flow.

The product scope and rules are defined in the [business plan](docs/TradeTender-Business-Plan.md).
Architecture, security requirements, and the brand rules are documented in [docs](docs/).

## Stack

- Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL
- NextAuth credentials authentication with Client, Retailer, and Super User roles
- Stripe payments, Resend email, Sentry monitoring
- Render web services with Neon PostgreSQL

## Local Setup

Requirements: Node.js 20 and Docker.

```bash
git clone https://github.com/Jondoe0285/Tender.git
cd Tender
cp .env.example .env
npm ci
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Do not commit `.env` or production credentials.

## Configuration

Copy [.env.example](.env.example) and set the values appropriate to the environment.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection used by the application. |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL connection used by Prisma migrations. |
| `NEXTAUTH_SECRET` | Long, random authentication secret. |
| `NEXTAUTH_URL` | Required public origin for this deployment. It controls email links and server redirects. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Required for production payments and Stripe webhooks. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Required for verification and transactional email. `EMAIL_FROM` needs a verified Resend domain. |
| `RETENTION_JOB_SECRET` | Required by the scheduled retention endpoint. |

For Neon, use the pooled URL for `DATABASE_URL` and the non-pooler URL for
`DATABASE_URL_UNPOOLED`. Staging and production must have separate writable databases or Neon
branches.

## Deploying To Render

[render.yaml](render.yaml) defines two services:

| Service | Branch | Purpose |
| --- | --- | --- |
| `Tender Staging` | `staging` | Staging environment |
| `Trade Tender` | `main` | Production environment |

Render runs this build command for both services:

```bash
npm ci && npm run type-check && npm run lint && npx prisma migrate deploy && npm run build
```

Set every `sync: false` variable in the Render dashboard. In particular, set `NEXTAUTH_URL` to
the exact public URL of that service; resolving redirects from Render's internal request host can
otherwise send a browser to `localhost:10000`.

Each environment needs its own Stripe webhook at `/api/webhooks/stripe` and its own signing secret.

## Migration Recovery

If Prisma reports a missing column such as `Tender.supplyDate`, the database is behind the Prisma
schema. Confirm the service has deployed the branch containing the migration, then run this only
against that environment's direct database URL:

```bash
npx prisma migrate deploy
```

Check the deployment build log. A successful run lists each applied migration. If Prisma reports a
failed migration, inspect `_prisma_migrations` and use `prisma migrate resolve` only after reviewing
the failure and taking a backup. Never use `db push` against production.

## Checks

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run health:audit
npm run health:validate-workflows
```

The health audit runs the migration history against PostgreSQL and writes its report to
`docs/health-check/`. The workflow details and release process are in
[docs/health-check/README.md](docs/health-check/README.md).

## Important Constraints

- All protected routes require server-side authentication and authorization.
- Client and Retailer contact details must not be released until the required payment is confirmed.
- The current revenue model is a £10 Retailer tender unlock and a £10 Client Accepted Quote Release.
- Tender attachments need durable object storage before real documents are accepted; Render's local
  filesystem is ephemeral.

## Documentation

- [Business plan](docs/TradeTender-Business-Plan.md)
- [Architecture](docs/Architecture.md)
- [Security requirements](docs/Security-Requirements.md)
- [Product requirements](docs/Product-Requirements.md)
- [Brand rules](docs/branding/TradeTender-Brand-Rules.md)
- [Health-check and release workflow](docs/health-check/README.md)
