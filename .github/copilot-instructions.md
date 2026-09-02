# Trade Tender Repository Instructions

## Technology

- Use Next.js, TypeScript, and Tailwind CSS for the application.
- Target Render for hosting with Render PostgreSQL for persistence.
- Use Stripe for payments and GitHub Actions for CI/CD.
- TypeScript only. Do not add JavaScript application files.

## Roles

- Support only the approved roles: Super User, Client, and Retailer.
- Do not create features outside the approved Trade Tender business plan.

## Product And Security Rules

- Design mobile-first with a professional corporate construction-industry appearance.
- Require authentication on every protected route and enforce authorization server-side.
- Validate all untrusted input on the server, even when client-side validation exists.
- Create and apply database migrations for every schema change.
- Maintain audit logs for payment events and Client or Retailer contact-release events.
- Never expose Client or Retailer details before the required payment trigger.
- Never bypass authentication, authorization, validation, payment, or other security controls.

## Environment Resource Preservation

- Use local databases and local-only sandbox credentials and settings only on development and feature branches.
- Staging and production/main branches each have explicit, dedicated environment resources and branch-specific security permissions that must be preserved, including but not limited to: databases, payment providers such as Stripe, email providers such as Resend, error monitoring such as Sentry, DNS/CDN/WAF providers such as Cloudflare, authentication providers, analytics/product telemetry, object/file storage, monitoring and alerting, webhook endpoints, API credentials and service tokens, service URLs, access policies, role assignments, branch/environment deployment configuration, and any future supporting app, supplier, integration, or managed service setting.
- Never reset, reseed, overwrite, repoint, rotate, disable, downgrade, delete, replace, weaken, or otherwise destructively change a staging or production/main environment resource, integration setting, or security permission unless the change records: explicit Founder/product-owner/release-owner approval; the affected environment and resource names, without secret values; backup, restore, rollback, or recovery evidence; a migration or change plan; post-change validation evidence; and a named release or rollback owner. Log the record in [docs/Implementation-Change-Register.md](../docs/Implementation-Change-Register.md).
- Never print or commit secret values. Refer only to environment-variable names, provider names, service names, or configuration categories.
- See [docs/Security-Requirements.md](../docs/Security-Requirements.md) SEC-118 to SEC-122 for the full requirement.

## Business Plan

- Treat [docs/TradeTender-Business-Plan.md](../docs/TradeTender-Business-Plan.md) as the primary project documentation and source of truth for product scope, workflows, pricing, launch assumptions, risks, and future options.
- All development decisions must align with the approved business plan.
- Before implementing any feature, consult the business plan, check user role requirements, check security requirements, check payment requirements, and check platform workflow requirements.
- If a requested feature conflicts with the business plan, flag the conflict before implementation.
- The active Year 1 revenue model is a £10 Retailer tender unlock fee and a £10 Client Accepted Quote Release Fee.
- Keep Retailer subscriptions and tiered Client release fees inactive and excluded from current forecasts unless explicitly approved by the Super User.
- Keep tender creation, quote receipt, and quote comparison free for Clients, subject to the approved payment and contact-release workflow.
- Treat Trade Tender as a connection and tender-management platform, not the supplier, contractor, broker, guarantor, or responsible party for the final Client-Retailer transaction.
- Apply the documented 30-day formal quote retention and five-year accepted-quote, payment, contact-release, and audit-record retention requirements unless a valid hold or investigation requires otherwise.
- Keep partner advertising separate from tender matching, quote ranking, supplier selection, and Client decision-making.

## Brand Rules

- Treat [docs/branding/Trade_Tender_Brand_Guide.pdf](../docs/branding/Trade_Tender_Brand_Guide.pdf) as the Brand Authority and [docs/branding/TradeTender-Brand-Rules.md](../docs/branding/TradeTender-Brand-Rules.md) as its machine-readable implementation companion.
- Review both brand documents before generating React components, layouts, forms, dashboards, emails, or marketing pages.
- Follow the branding file's colour, typography, logo, and UX standards exactly.
- If generated UI conflicts with the branding document, the branding document takes precedence.
- Trade Tender branding is mandatory.
- Do not invent colours, fonts, layouts, or styles outside the approved branding.
- Use the approved Navy, Trade Blue, Sky Blue, Steel Grey, and Light Grey palette; Montserrat headlines; and Source Sans 3 body text.
- Use only the approved logo files in `public/images/brand/`; choose the horizontal logo on light surfaces and the dark-background logo on Navy surfaces unless a layout requires another approved variant.
- Preserve the neutral-intermediary position and the approved construction-focused tone; do not use exaggerated marketing language or imply Trade Tender sells materials directly.
- Keep every workflow aligned with the UX principles: Connect, Compare, Construct.
- Flag any visual or content change that conflicts with the brand rules before implementation.

## Engineering Standards

- Build reusable components and follow existing project patterns before introducing new abstractions.
- Keep changes focused and preserve the existing role-based portal structure.
- Treat [docs/Implementation-Change-Register.md](../docs/Implementation-Change-Register.md) as the operational source of truth for adapting repository changes to app environments. Update it in the same change set for every applicable implementation, migration, configuration, workflow, or environment requirement; never record secrets.
- Write tests for every new feature and update affected tests when behavior changes.
- Keep interfaces accessible, including keyboard navigation and meaningful labels.
- Run `npm run type-check` after TypeScript changes and `npm run build` for routing or production behavior changes.