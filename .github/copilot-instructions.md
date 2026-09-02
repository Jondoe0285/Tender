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
- Write tests for every new feature and update affected tests when behavior changes.
- Keep interfaces accessible, including keyboard navigation and meaningful labels.
- Run `npm run type-check` after TypeScript changes and `npm run build` for routing or production behavior changes.

## Source Repository Synchronization

- Treat the Git `origin` repository (`https://github.com/Jondoe0285/Tender.git`) as the authoritative source repository.
- Before implementing a change in this workspace, fetch and review relevant changes from `origin` so local work remains aligned with the source repository.
- Transpose every applicable source-repository change into this workspace, including code, database migrations, configuration, tests, documentation, security controls, and workflow updates.
- Do not overwrite local work blindly. Resolve conflicts by preserving the source repository's intended behavior, this workspace's explicit requirements, and all security controls; raise an irreconcilable conflict before proceeding.
- Validate every transposed change using the source repository's relevant checks before considering the local update complete.