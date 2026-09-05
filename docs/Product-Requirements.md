# Trade Tender Product Requirements

**Status:** Approved working requirements  
**Primary source:** [TradeTender-Business-Plan.md](TradeTender-Business-Plan.md)

## 1. Purpose

Trade Tender is a UK construction tendering platform that lets Contractors create structured tenders, matches requirements with relevant Providers, collects formal quotes, and supports quote comparison and acceptance through a controlled payment and contact-release workflow.

These requirements translate the approved business plan into an implementation reference. All development decisions must remain within this scope. Any conflict with the business plan must be flagged before implementation.

## 2. Product Goals

- Reduce the time Contractors spend contacting construction suppliers manually.
- Help Contractors request and compare relevant quotes in one place.
- Give Providers access to matched tender opportunities with a clear fixed-fee model.
- Keep project and contact details restricted until the correct payment stage.
- Provide the Super User with operational control, reporting, and auditability.
- Validate the marketplace through a focused 90-day Provider launch credit window.

## 3. Approved Scope

### 3.1 Technology

- Next.js application.
- TypeScript only for application code.
- Tailwind CSS for styling.
- Render for hosting.
- Render PostgreSQL for persistence.
- Stripe for payments.
- GitHub Actions for CI/CD.

### 3.2 Roles

| Role | Purpose |
| --- | --- |
| Super User | Manages users, categories, pricing, settings, support, analytics, access, and operational oversight. |
| Contractor | Creates tenders, receives and compares quotes, accepts a quote, and pays the Accepted Quote Release Fee. |
| Provider | Manages capabilities and coverage, receives matched summaries, unlocks tenders, and submits quotes. |

Only these three roles are approved. New roles or unrelated product areas require explicit business-plan approval.

### 3.3 Active Commercial Model

- Contractor registration, tender creation, quote receipt, and quote comparison are free.
- Providers register for free and receive matched tender summaries for free.
- Providers receive limited free unlock credits during the initial 90-day launch window.
- After credits are used or the window ends, a Provider pays a fixed **£10 tender unlock fee**.
- A Contractor pays a fixed **£10 Contractor Accepted Quote Release Fee** when accepting a quote, unless an approved promotion or Super User waiver applies.
- Provider subscriptions and tiered Contractor release fees may exist as inactive future functionality but are excluded from the current revenue model.

## 4. Core User Journeys

### 4.1 Registration and Login

1. A user selects or is assigned one approved role.
2. The user registers with the required account details and accepts applicable terms.
3. The platform validates registration data on the server.
4. The platform authenticates the user at login and establishes a protected session.
5. Protected routes and APIs reject unauthenticated requests.
6. Every server operation verifies the authenticated user’s role and ownership or permitted scope.

### 4.2 Contractor Tender Creation

1. The Contractor starts a new tender.
2. The Contractor enters a project name, optional additional information, jobsite or delivery postcode, project urgency, and an optional planned works start date before selecting each required service group.
3. The selected service groups create sequential service-specific tender-package requirement screens, such as Materials or Waste. The form captures each package category, subcategory, quantity, delivery or start date, hire duration where relevant, urgency, response deadline, access conditions, required documentation, and supporting notes or attachments.
4. The server validates and normalises all submitted values.
5. The platform assigns a unique tender identifier, such as `TND-YYYYMMDD-000001`.
6. The platform stores the tender and its lifecycle state.
7. The platform matches each project element to Providers by category, capability, and geographical coverage.
8. Matched Providers receive a summary opportunity notification.
9. The Contractor can view the tender status in the Contractor portal.

### 4.3 Provider Capability Management

1. The Provider maintains services offered, categories, subcategories, email address, geographical areas, coverage radius, accreditations, and notification preferences.
2. The server validates capability and coverage changes.
3. The platform uses current approved capabilities and location coverage for matching.
4. The Provider can review matched tender summaries without seeing restricted Contractor identity, direct contact details, precise site information, full specification, or attachments.

### 4.4 Provider Tender Unlock

1. A matched Provider views the pre-payment summary.
2. The summary contains enough information to judge relevance: broad category, location area, headline requirement, indicative timescale, and non-sensitive notes.
3. The Provider uses an available launch credit or starts payment for the £10 unlock fee.
4. The server determines eligibility, current credit status, amount, and payment state. Contractor input cannot establish unlock entitlement.
5. Stripe payment completion is verified through a trusted server-side flow and signed webhook where applicable.
6. After confirmed entitlement, the platform releases the full tender job and all its packages, including complete specification, relevant attachments, precise delivery or site requirements, response deadline, and project conditions. One tender unlock covers every package in that tender; no additional package unlock fee applies.
7. The platform records the unlock against the tender, Provider, payment or credit event, timestamp, and any Super User override.
8. Failed, cancelled, incomplete, or ambiguous payments do not release restricted details.

### 4.5 Provider Quote Submission

1. An authorised Provider opens a tender they have unlocked.
2. The Provider submits a formal quote with required pricing, availability, validity, assumptions, delivery or service details, supporting information, and documents where applicable.
3. The server validates all quote fields, file types, sizes, and ownership of the unlocked tender.
4. The platform assigns a linked quote identifier, such as `TND-YYYYMMDD-000001-Q01`.
5. The Contractor receives the quote in the Contractor portal.
6. The quote lifecycle and submission event are auditable.
7. All Provider line prices, quote totals, additional charges, and platform fees are stated excluding VAT. Applicable VAT is calculated separately for Trade Tender platform payments and recorded with the payment.

### 4.6 Contractor Quote Comparison and Acceptance

1. The Contractor views formal quotes for their own tender.
2. The Contractor compares quote information without seeing the Provider's contact details before release.
3. The Contractor accepts one quote or leaves the tender unresolved.
4. Acceptance creates a pending Accepted Quote Release Fee state unless an approved waiver applies.
5. The Contractor pays the fixed £10 fee through the approved Stripe flow.
6. The server confirms the payment before releasing contact details.
7. The platform releases the Contractor and Provider contact details to the authorised parties only.
8. The platform records what was released, who triggered it, when it happened, and which payment event authorised it.

### 4.7 Super User Operations

The Super User can, subject to authorization and audit logging:

- Manage users, access, suspension, and support access.
- Manage categories, subcategories, matching parameters, and coverage data.
- Set fees, launch credits, promotional waivers, fee disablement, and future feature activation.
- Review tenders, quotes, payments, contact-release events, and audit records.
- Review analytics and export approved reports.
- Manage partner branding and clearly labelled advertising links.
- Manage email templates and platform settings.
- Investigate unusual activity and support operational compliance.

## 5. Functional Requirements

### 5.1 Accounts and Access

- **FR-001:** The platform shall support only Super User, Contractor, and Provider roles.
- **FR-002:** The platform shall require authentication on every protected route, server action, and API endpoint.
- **FR-003:** The platform shall enforce role and ownership checks server-side for every protected operation.
- **FR-004:** The platform shall support registration, login, logout, session expiry, and failed-login handling.
- **FR-005:** The platform shall record terms acceptance where required for Contractors and Providers.
- **FR-006:** The Super User shall be able to suspend or restrict accounts, subject to audit logging.

### 5.2 Contractor Tenders

- **FR-010:** A Contractor shall be able to create a tender using structured construction categories.
- **FR-011:** A Contractor shall be able to save and submit the required project, location, timing, quantity, access, and supporting information.
- **FR-012:** The server shall validate every tender field and reject invalid or unauthorised submissions.
- **FR-013:** Each tender shall receive a unique identifier and lifecycle status.
- **FR-014:** A Contractor shall be able to view their own submitted tenders and statuses.
- **FR-015:** The platform shall match tender elements using category, capability, and geographical coverage.
- **FR-016:** The platform shall notify matched Providers with a non-sensitive summary.

### 5.3 Provider Profiles and Matching

- **FR-020:** A Provider shall be able to manage services, categories, coverage, accreditations, and notification preferences.
- **FR-021:** The platform shall use approved Provider capabilities and coverage in matching.
- **FR-022:** The platform shall avoid sending opportunities to clearly irrelevant Providers.
- **FR-023:** The Super User shall be able to maintain categories and matching parameters.
- **FR-024:** The platform shall track unmatched tenders and coverage gaps for operational reporting.

### 5.4 Visibility and Payment Controls

- **FR-030:** Before Provider unlock, the platform shall show only approved non-sensitive tender summary data.
- **FR-031:** Before Provider unlock, the platform shall hide Contractor identity, contact details, precise site information, full specification, attachments, and direct communication details.
- **FR-032:** The platform shall support limited launch credits for Providers during the initial 90-day window.
- **FR-033:** The platform shall charge or waive the £10 Provider unlock fee according to server-controlled configuration.
- **FR-034:** A confirmed Provider tender unlock shall release full tender details and every package in that tender. One unlock shall not create an additional fee for another package in the same tender.
- **FR-035:** Contractor and Provider identities shall remain anonymous to one another until the Contractor Accepted Quote Release Fee is confirmed or an approved waiver applies.
- **FR-036:** The platform shall charge or waive the £10 Contractor Accepted Quote Release Fee according to server-controlled configuration.
- **FR-037:** The platform shall release contact details only to the authorised Contractor and Provider after the release condition is confirmed server-side.
- **FR-038:** Failed, cancelled, duplicate, replayed, or ambiguous payment events shall not release protected information.

### 5.5 Quotes

- **FR-040:** An authorised Provider shall be able to submit a formal quote only for an unlocked tender, pricing each tender item or marking it unavailable.
- **FR-041:** Each quote shall have a unique identifier linked to its tender.
- **FR-042:** The platform shall validate quote values, dates, required content, documents, and ownership server-side.
- **FR-043:** A Contractor shall be able to view and compare quotes for their own tender.
- **FR-044:** A Contractor shall be able to accept a quote and enter the release-fee workflow.
- **FR-045:** The platform shall retain quote lifecycle events needed for operational audit and reporting.

### 5.6 Payments and Stripe

- **FR-050:** Payment amounts and eligibility shall be calculated from server-controlled configuration.
- **FR-051:** Stripe webhook signatures shall be verified before events are processed.
- **FR-052:** Payment processing shall be idempotent and safe against duplicate or replayed events.
- **FR-053:** Payment records shall include the relevant tender or quote identifier, user or account, amount, currency, status, provider reference, and timestamps without storing prohibited payment secrets.
- **FR-054:** Failed payments, refunds, cancellations, and waivers shall have defined states and audit events.
- **FR-055:** Contact release shall depend on a trusted confirmed payment or approved waiver, never a client-provided status.
- **FR-056:** All Trade Tender fees shall be configured and displayed exclusive of VAT.
- **FR-057:** The Super User shall be able to set the platform VAT percentage between 0 and 100 with up to two decimal places, subject to Owner control and audit logging.
- **FR-058:** The server shall calculate VAT from the current VAT percentage, charge the VAT-inclusive total through Stripe, and store the net fee, VAT percentage, VAT amount, and total against each payment.
- **FR-059:** A later VAT percentage change shall not alter VAT already recorded against an existing payment.

### 5.7 Audit and Monitoring

- **FR-060:** The platform shall maintain audit records for payment events.
- **FR-061:** The platform shall maintain audit records for every Contractor or Provider contact-release event.
- **FR-062:** Audit records shall identify actor, event, target, timestamp, relevant tender or quote identifier, and authorising payment or waiver reference.
- **FR-063:** Audit logs shall not contain secrets or unnecessary personal data.
- **FR-064:** The Super User shall be able to review authorised audit information.
- **FR-065:** Monitoring shall support detection of repeated parties, unusual payment behaviour, duplicate tenders, repeated cancellations, and suspicious patterns.
- **FR-066:** The platform shall record every blocked or held content decision with the actor, content type, risk score, and detection reasons, and shall never store the blocked content itself.
- **FR-067:** The Super User shall have a tender monitoring view that flags confidentiality-bypass attempts, near-duplicate tenders, and Providers unlocking tender detail without quoting.
- **FR-068:** A full Super User shall be able to record a review outcome against a blocked or held content event, and that review shall be audit logged.
- **FR-069:** The platform shall expose an unauthenticated health endpoint reporting application and database availability without disclosing business data.

### 5.8 Reporting and Analytics

- **FR-070:** The Super User dashboard shall show tenders submitted, Provider unlocks, quotes submitted, Contractor acceptances, and Provider confirmations where used.
- **FR-071:** Reports shall support filtering by Contractor, Provider, tender identifier, quote identifier, category, geography, status, date range, value band, subscription state, and payment status.
- **FR-072:** The Super User shall be able to export approved reports without exposing unauthorised restricted details.
- **FR-073:** Analytics shall show conversion across tender submission, unlock, quote submission, Contractor acceptance, and Provider confirmation.
- **FR-074:** The Super User dashboard shall report VAT collected on confirmed Trade Tender payments for the current UK financial quarter.

### 5.9 Notifications

- **FR-080:** The platform shall email matched Providers with approved non-sensitive tender summaries.
- **FR-081:** The platform shall support tender alerts, quote reminders, payment confirmations, contact-release notifications, invitations, and account updates.
- **FR-082:** Notification content shall respect role, authorization, and payment-gated visibility rules.
- **FR-083:** The platform shall support notification preferences and monitor delivery failures.

### 5.10 Partners and Public Policies

- **FR-090:** The platform shall support clearly labelled partner or advertising links for Sinclair Safety Solutions Ltd, Smart Works Civils Ltd, and HSQE Consult Hub (displayed without a link until it has a website).
- **FR-091:** Partner visibility shall remain separate from matching, quote ranking, supplier selection, and Contractor decisions.
- **FR-092:** The Super User shall manage partner names, display positions, destination links, active state, and labels.
- **FR-093:** Public links shall be available to relevant users for platform, Contractor, Provider, privacy, cookie, quote retention, payment/refund, contact-release, acceptable-use, advertising, complaints, and accessibility policies.

### 5.11 Data Retention

- **FR-100:** Formal quotes shall be retained for 30 days from submission.
- **FR-101:** Unsuccessful, expired, or non-accepted quotes shall then be deleted or anonymised unless a valid dispute, investigation, suspicious-activity review, legal hold, or other approved reason requires retention.
- **FR-102:** Successful or accepted quotes and related tender identifiers, payment records, contact-release events, and audit logs shall be retained for five years.
- **FR-103:** Retention and deletion actions shall be auditable and shall respect legal holds.

## 6. Non-Functional Requirements

### 6.1 Security and Privacy

- **NFR-001:** All trust-boundary decisions shall be enforced server-side.
- **NFR-002:** All database queries shall be parameterised.
- **NFR-003:** Secrets shall be stored in approved environment or secret-management systems and never committed.
- **NFR-004:** Error responses, logs, email content, previews, and analytics shall not leak protected contact or project details.
- **NFR-005:** Every schema change shall use a reviewed, versioned database migration.
- **NFR-006:** Payment, contact-release, and related audit writes shall use appropriate transaction and consistency controls.

### 6.2 Usability and Accessibility

- **NFR-010:** The interface shall be mobile-first and usable on narrow and wide viewports.
- **NFR-011:** The interface shall use a clean, professional construction-sector appearance and consistent colours.
- **NFR-012:** Forms, tables, navigation, dialogs, loading states, empty states, and error states shall be accessible.
- **NFR-013:** Controls shall have meaningful labels, semantic HTML, keyboard support, and visible focus states.
- **NFR-014:** Reusable components shall prevent inconsistent layouts across role portals.

### 6.3 Performance and Capacity

- **NFR-020:** The early production platform shall be performance-tested for up to 1,000 concurrent users.
- **NFR-021:** Tender submission, matching, notifications, payment state transitions, quote submission, and dashboards shall remain usable under the target load.
- **NFR-022:** Monitoring shall identify application, database, payment, email, and infrastructure failures.

### 6.4 Reliability and Operations

- **NFR-030:** GitHub Actions shall run type checks, tests, and production builds before deployment.
- **NFR-031:** Database backups and recovery options shall be verified before destructive migrations or releases.
- **NFR-032:** Deployments shall have observable health checks and documented rollback preparation.
- **NFR-033:** Payment and webhook handling shall tolerate retries without creating duplicate releases, charges, quotes, or audit events.

## 7. Data Model Requirements

The implementation should provide versioned schema support for at least:

- Users, roles, sessions, terms acceptance, account status, and audit metadata.
- Provider capabilities, categories, geographical coverage, accreditations, and notification preferences.
- Tenders, project elements, categories, locations, attachments, deadlines, statuses, and unique identifiers.
- Tender-to-Provider matches, notifications, launch credits, unlocks, and visibility state.
- Quotes, quote documents, quote identifiers, lifecycle states, acceptance, and retention state.
- Payments, Stripe references, amounts, statuses, refunds, waivers, and idempotency keys.
- Contact-release events and authorising payment or waiver references.
- Audit logs, monitoring flags, partner links, policies, and configurable platform settings.

Every schema change requires a migration and appropriate data-integrity, authorization, and rollback consideration.

## 8. Acceptance Criteria

A release is acceptable only when:

- Login and registration work for approved roles and protected routes reject unauthenticated access.
- Role isolation and ownership checks prevent cross-role and cross-user access.
- Contractors can create tenders and view their own tender statuses.
- Matching uses category, capability, and geographical coverage.
- Providers receive only permitted summaries before unlock.
- Verified credit or payment unlocks the full tender details without exposing unauthorised data.
- Providers can submit linked formal quotes only after authorised unlock.
- Contractors can compare and accept quotes without premature contact disclosure.
- Stripe payments and webhooks are verified, idempotent, and correctly reflected in server-side state.
- Contact details are released only after the confirmed Contractor release payment or approved waiver.
- Payment and contact-release audit events are complete and reviewable.
- Quote retention and deletion or anonymisation rules are implemented.
- Super User analytics, filtering, and reporting respect authorization and privacy.
- Responsive and accessible states are verified on mobile and desktop.
- Relevant unit, integration, user-journey, regression, load, and security tests pass.
- Database migrations, backups, deployment health, and rollback preparation are verified for release.

## 9. Out of Scope Unless Approved

- New user roles beyond Super User, Contractor, and Provider.
- Trade Tender acting as supplier, contractor, broker, guarantor, payment intermediary, or dispute resolver for the final Contractor-Provider transaction.
- Provider subscriptions or tiered Contractor fees as active revenue before usage evidence and explicit approval.
- Features unrelated to construction tendering, quote management, controlled contact release, platform operations, or the approved business plan.
