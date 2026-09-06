# Trade Tender Repository Instructions

## Technology

- Use Next.js, TypeScript, and Tailwind CSS for the existing server and browser application.
- Target Render for hosting with Render PostgreSQL for persistence.
- Use Stripe for payments and GitHub Actions for CI/CD.
- TypeScript only. Do not add JavaScript application files.

## Mobile Application Architecture

- The mobile app shall be a genuinely packaged native application built with React Native and Expo in `mobile/`.
- React Native with Expo is the mandatory development method for every mobile-client task. Do not use Flutter, a Progressive Web App, Capacitor, a browser wrapper, a WebView, or any other web-based mobile implementation unless the user explicitly overrides this instruction.
- Treat the existing Next.js application as the server/API implementation while native mobile workflow parity is delivered. For every user-facing mobile workflow, implement or update the React Native client rather than adding a browser-only alternative.
- Before enabling a protected workflow in the mobile client, implement and test a dedicated mobile authentication and authorization path. Store device credentials only in platform-secure storage; never reuse browser session cookies or weaken server-side validation, payment, audit, or contact-release controls.
- Build Android and iOS packages through the Expo/EAS configuration in `mobile/`. Keep package identifiers, signing configuration, API origins, and all environment-specific values out of committed source unless they are non-secret identifiers explicitly approved for release.
- The approved working name and existing brand assets may be used for internal development. Do not register a final package identifier, configure release signing, publish a store listing, or make any other irreversible external identity commitment until the Founder explicitly approves the final name.

## Roles

- Support only the approved roles: Super User, Contractor, and Provider.
- Do not create features outside the approved Trade Tender business plan.

## Product And Security Rules

- Design mobile-first with a professional corporate construction-industry appearance.
- Require authentication on every protected route and enforce authorization server-side.
- Validate all untrusted input on the server, even when client-side validation exists.
- Create and apply database migrations for every schema change.
- Maintain audit logs for payment events and Contractor or Provider contact-release events.
- Never expose Contractor or Provider details before the required payment trigger.
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
- The active Year 1 revenue model is a £10 Provider tender unlock fee and a £10 Contractor Accepted Quote Release Fee.
- Keep Provider subscriptions and tiered Contractor release fees inactive and excluded from current forecasts unless explicitly approved by the Super User.
- Keep tender creation, quote receipt, and quote comparison free for Contractors, subject to the approved payment and contact-release workflow.
- Treat Trade Tender as a connection and tender-management platform, not the supplier, contractor, broker, guarantor, or responsible party for the final Contractor-Provider transaction.
- Apply the documented 30-day formal quote retention and five-year accepted-quote, payment, contact-release, and audit-record retention requirements unless a valid hold or investigation requires otherwise.
- Keep partner advertising separate from tender matching, quote ranking, supplier selection, and Contractor decision-making.

## Brand Rules

- Treat [docs/branding/Trade_Tender_Brand_Guide_Construction_Edition.pdf](../docs/branding/Trade_Tender_Brand_Guide_Construction_Edition.pdf) as the Brand Authority and [docs/branding/TradeTender-Brand-Rules.md](../docs/branding/TradeTender-Brand-Rules.md) as its machine-readable implementation companion.
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

## Source Repository Synchronization

- Treat the Git `origin` repository (`https://github.com/Jondoe0285/Tender.git`) as the authoritative source repository.
- When the user explicitly asks to track or synchronize the source repository, fetch and review `origin/staging` and compare it with this repository's local `staging` branch.
- For an explicit source-tracking request, transpose every applicable difference from `origin/staging` into this repository's `staging` branch, including code, database migrations, configuration, tests, documentation, security controls, and workflow updates. Do not stop after configuring Git tracking; review the source material and make the required local `staging` changes.
- After source changes are aligned in local `staging`, the user may make additional local changes in `staging` before release. Treat local `staging` as the source for changes promoted to local `main`, and promote to `main` only through the protected pull-request and release workflow.
- Do not overwrite local work blindly. Resolve conflicts by preserving the source repository's intended behavior, this workspace's explicit requirements, and all security controls; raise an irreconcilable conflict before proceeding.
- Validate every transposed change using the source repository's relevant checks before considering the local update complete.