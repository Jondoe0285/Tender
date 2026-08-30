# Trade Tender Security Requirements

**Status:** Approved working requirements  
**Source documents:** [TradeTender-Business-Plan.md](TradeTender-Business-Plan.md) and [Product-Requirements.md](Product-Requirements.md)

## 1. Purpose and Security Boundary

Trade Tender is a connection and tender-management platform for Clients and Retailers. It is not the supplier, contractor, broker, guarantor, payment intermediary, or responsible party for the final Client-Retailer transaction.

The platform processes account data, tender and quote data, payment state, project information, attachments, and contact-release events. Security controls must protect these assets throughout their lifecycle and must be enforced at trusted server boundaries.

These requirements apply to all Next.js routes, server actions, APIs, database operations, background jobs, webhooks, notifications, analytics, file handling, deployment workflows, and administrative tools.

## 2. Security Principles

- Deny access by default.
- Enforce identity, role, ownership, and payment conditions server-side.
- Treat all client input and client-reported state as untrusted.
- Minimise collected, returned, logged, and retained data.
- Use least privilege for users, services, database accounts, deployment identities, and integrations.
- Make security-sensitive state changes atomic, idempotent, observable, and auditable.
- Never bypass security controls for prototypes, demonstrations, support, testing, or operational convenience.
- Keep controls within the approved Trade Tender business plan.

## 3. Roles and Access Model

Only these roles are approved:

| Role | Permitted scope |
| --- | --- |
| Super User | Platform administration, approved support, user and category management, pricing and feature controls, analytics, audit review, and operational monitoring. |
| Client | Own account, own tenders, matched workflow state, received quotes, quote comparison, acceptance, and authorised contact release. |
| Retailer | Own account, own capabilities and coverage, matched summaries, paid or credited unlocks, unlocked tender details, and own quote submissions. |

Requirements:

- **SEC-001:** Every protected route, server action, API endpoint, background operation, and webhook-related state change shall have an explicit authorization decision.
- **SEC-002:** Role checks shall be performed server-side on every protected operation.
- **SEC-003:** Resource ownership shall be checked for every Client tender, Retailer profile, quote, attachment, payment, and audit query.
- **SEC-004:** A user shall not access another user’s data by changing an identifier, URL, request body, query parameter, or client-side state.
- **SEC-005:** Super User access shall be limited to documented administrative capabilities and audited.
- **SEC-006:** Support access shall not silently grant access to protected details or bypass payment conditions.
- **SEC-007:** Authorization shall fail closed when identity, role, ownership, payment state, or release state is missing or ambiguous.

## 4. Authentication and Sessions

- **SEC-010:** Registration shall validate all fields server-side and prevent duplicate or conflicting account identities.
- **SEC-011:** Login shall use a trusted authentication mechanism and shall not trust a client-provided role or account status.
- **SEC-012:** Passwords, where used, shall be stored only using a current, strong, one-way password hashing scheme.
- **SEC-013:** Sessions shall be protected against fixation, tampering, replay, and unintended persistence.
- **SEC-014:** Session cookies shall use secure, HttpOnly, and appropriate SameSite settings in production.
- **SEC-015:** Logout and session expiry shall invalidate access to protected resources.
- **SEC-016:** Authentication failures shall not reveal whether an account exists or disclose sensitive account information.
- **SEC-017:** Sensitive authentication events shall be rate-limited and monitored.
- **SEC-018:** Password reset or account recovery flows shall use single-use, expiring tokens and shall not disclose account existence.
- **SEC-019:** Authentication and authorization failures shall return safe, non-sensitive error responses.

## 5. Input Validation and Output Safety

- **SEC-020:** Every untrusted input shall be validated and normalised on the server.
- **SEC-021:** Validation shall enforce type, format, length, range, enum, relationship, and business-rule constraints.
- **SEC-022:** Client-side validation shall be treated only as a usability feature.
- **SEC-023:** Payment amounts, role claims, ownership, payment status, unlock state, waiver state, and contact-release state shall never be accepted from the client as authoritative.
- **SEC-024:** Database access shall use parameterised queries or an equivalent safe data-access abstraction.
- **SEC-025:** User-controlled content shall be safely encoded for HTML, email, logs, exports, and any other output context.
- **SEC-026:** Error responses shall not reveal secrets, connection details, internal identifiers, stack traces, or protected project or contact information.
- **SEC-027:** Request size, request frequency, pagination, sorting, filtering, and export limits shall prevent resource exhaustion.
- **SEC-028:** Validation failures shall not partially change payment, quote, release, account, or audit state.

## 6. Tender and Quote Confidentiality

The platform must preserve anonymity and staged disclosure:

- **SEC-030:** Before Retailer unlock, only approved non-sensitive summary information may be returned: broad category, location area, headline requirement, indicative timescale, and non-sensitive notes.
- **SEC-031:** Before Retailer unlock, hide Client identity, contact details, precise site information, full specification, attachments, and direct communication details.
- **SEC-032:** Full tender details shall be returned only after a server-confirmed launch-credit entitlement or verified £10 unlock payment.
- **SEC-033:** A Retailer shall only access details for tenders they are matched to and have legitimately unlocked.
- **SEC-034:** Client and Retailer identities shall remain anonymous to one another until the Client release condition is met.
- **SEC-035:** Contact details shall be released only to the authorised Client and Retailer after confirmed £10 Client Accepted Quote Release Fee payment or an explicitly approved waiver.
- **SEC-036:** Failed, cancelled, duplicate, replayed, refunded where release is revoked, or ambiguous payment events shall not release protected details.
- **SEC-037:** Restricted details shall not leak through API responses, server-rendered pages, client bundles, browser storage, notification previews, email summaries, analytics, exports, logs, error pages, metadata, or attachments.
- **SEC-038:** The server shall re-check release state on every request for protected tender, quote, attachment, or contact data.

## 7. Payments and Stripe

- **SEC-040:** Stripe secret keys and webhook secrets shall exist only in approved secret-management or environment configuration and never in source control or client bundles.
- **SEC-041:** Payment amounts and eligible payer or resource shall be calculated from server-controlled configuration and current authorization state.
- **SEC-042:** Stripe webhook signatures shall be verified against the raw request payload before processing.
- **SEC-043:** Webhook events shall be idempotent using trusted provider event identifiers and appropriate uniqueness constraints.
- **SEC-044:** Webhook processing shall tolerate retries, out-of-order delivery, duplicate notifications, and transient failures.
- **SEC-045:** A client redirect or success page shall never be treated as proof of payment.
- **SEC-046:** The platform shall reconcile release entitlement from verified Stripe state or an approved waiver, not from browser state.
- **SEC-047:** Payment, unlock, acceptance, refund, waiver, and contact-release transitions shall be atomic and have defined failure behavior.
- **SEC-048:** Payment records shall store only necessary metadata and provider references; prohibited payment secrets must not be stored.
- **SEC-049:** Refunds, disputes, failed payments, and chargebacks shall have explicit states and documented impact on access and release.
- **SEC-050:** Every payment event and payment-driven access change shall produce an audit record.
- **SEC-051:** VAT percentage, VAT amount, and the charged total shall be calculated server-side and shall never be accepted from the client.
- **SEC-052:** The VAT amount, percentage, and total charged shall be stored immutably with the payment so historic records remain reconcilable after a rate change.
- **SEC-053:** Webhook verification shall confirm the amount charged equals the stored VAT-inclusive total before a payment is treated as confirmed.
- **SEC-054:** VAT percentage changes shall be restricted to the Owner and shall be audit logged.

## 8. Database and Data Access

- **SEC-060:** Azure SQL access shall use parameterised queries and least-privilege credentials.
- **SEC-061:** Application roles and database permissions shall be separated where practical.
- **SEC-062:** Schema changes shall use reviewed, versioned, repeatable migrations.
- **SEC-063:** Migrations shall preserve authorization, uniqueness, referential integrity, payment consistency, and audit requirements.
- **SEC-064:** Payment and contact-release updates shall use transaction boundaries that prevent partial state.
- **SEC-065:** Sensitive queries shall require explicit authorization filters rather than relying only on caller-supplied identifiers.
- **SEC-066:** Database errors shall be handled without leaking schema, query, credentials, or infrastructure details.
- **SEC-067:** Backups shall be protected, access-controlled, monitored, and tested for recovery.
- **SEC-068:** Production data shall not be copied into development or test environments without approved minimisation and protection.

## 9. File Uploads and Attachments

- **SEC-070:** Uploads shall be allowed only for authenticated users authorized for the owning tender or quote.
- **SEC-071:** The server shall validate file size, extension, MIME type, content signature, and permitted business context.
- **SEC-072:** The platform shall allow only documented file types and shall reject executable or active content where not required.
- **SEC-073:** Uploaded files shall be stored outside executable web roots with private access by default.
- **SEC-074:** File access shall be issued through an authorized, expiring server-controlled mechanism.
- **SEC-075:** Before Retailer unlock, tender attachments shall not be downloadable, enumerable, previewable, or inferable.
- **SEC-076:** File names and metadata shall be normalised to prevent path traversal, injection, and data leakage.
- **SEC-077:** Upload processing shall enforce quotas and protect against decompression bombs, oversized archives, malware, and resource exhaustion.
- **SEC-078:** Failed, rejected, abandoned, and deleted uploads shall not remain accessible through stale URLs or caches.
- **SEC-079:** File upload, access, release, rejection, and deletion events shall be auditable where security-relevant.

## 10. API and Web Security

- **SEC-080:** APIs shall authenticate and authorize every protected request independently.
- **SEC-081:** API responses shall return the minimum data needed by the requesting role and workflow state.
- **SEC-082:** APIs shall use strict request schemas and reject unknown or unsafe fields where appropriate.
- **SEC-083:** Resource identifiers shall not be sufficient to obtain access without authorization and ownership checks.
- **SEC-084:** Sensitive endpoints shall use rate limits, pagination, abuse monitoring, and safe concurrency controls.
- **SEC-085:** State-changing requests shall have appropriate CSRF protections where cookie-based sessions are used.
- **SEC-086:** CORS, security headers, cache controls, and content policies shall prevent cross-origin or browser-based disclosure.
- **SEC-087:** Cache keys and server-rendered output shall include authorization and release context where protected data is involved.
- **SEC-088:** Notification and export endpoints shall apply the same role and payment controls as portal endpoints.

## 11. Audit Logging and Monitoring

- **SEC-090:** Payment events shall be logged with actor or system source, event, target, amount or relevant state, provider reference, timestamp, and correlation identifier.
- **SEC-091:** Every Client or Retailer contact-release event shall be logged with actor, parties, target tender or quote, released-data category, timestamp, authorizing payment or waiver, and correlation identifier.
- **SEC-092:** Unlock, quote submission, quote acceptance, authorization failure, account suspension, waiver, refund, migration, and security-relevant administrative events shall be logged where required for traceability.
- **SEC-093:** Logs shall not contain secrets, full payment credentials, unnecessary personal data, or unrestricted contact details.
- **SEC-094:** Audit records shall be append-only or otherwise protected against unauthorized alteration.
- **SEC-095:** Audit access shall be limited to authorized Super Users and operational systems.
- **SEC-096:** Monitoring shall identify repeated parties, unusual payment patterns, duplicate or near-duplicate tenders, repeated cancellations, excessive access failures, and suspicious release activity.
- **SEC-097:** Attempts to share contact details, business identifiers, or off-platform contact routes shall be blocked, recorded, and surfaced to the Super User for review.
- **SEC-098:** Repeated confidentiality-bypass attempts by the same actor shall be raised as a high-severity flag.
- **SEC-099:** Unlocking tender detail without submitting quotes shall be monitored as a possible project-data harvesting or off-platform contact pattern.
- **SEC-097:** Alerts shall have defined ownership, severity, investigation, escalation, and retention procedures.

## 12. Data Retention and Privacy

- **SEC-100:** Formal quotes shall be retained for 30 days from submission.
- **SEC-101:** Unsuccessful, expired, or non-accepted quotes shall then be deleted or anonymised unless a dispute, investigation, suspicious-activity review, legal hold, or other valid reason requires retention.
- **SEC-102:** Successful or accepted formal quotes, related tender identifiers, payment records, contact-release events, and audit logs shall be retained for five years.
- **SEC-103:** Retention jobs shall be authorized, repeatable, observable, and safe against accidental deletion of held records.
- **SEC-104:** Data exports, analytics, support tools, and notifications shall apply minimisation and role restrictions.
- **SEC-105:** The platform shall provide the public privacy, cookie, quote-retention, payment/refund, contact-release, acceptable-use, and marketplace policy documents required by the business plan.

## 13. Secrets and Deployment

- **SEC-110:** Credentials, tokens, connection strings, Stripe secrets, signing keys, and personal data shall never be committed.
- **SEC-111:** GitHub Actions shall use least-privilege permissions and protected secrets.
- **SEC-112:** Development, test, staging, and production configuration shall remain separated.
- **SEC-113:** Logs, build artifacts, previews, source maps, and diagnostics shall not expose secrets or restricted data.
- **SEC-114:** Production releases shall pass type checks, relevant tests, and a production build before deployment.
- **SEC-115:** Database backup and recovery readiness shall be verified before destructive migrations or releases.
- **SEC-116:** Post-deployment health checks shall verify authentication, role isolation, payment controls, and contact-release privacy.
- **SEC-117:** A scheduled maintenance pipeline shall run dependency vulnerability audits, schema-drift checks, and the full validation suite so degradation is detected without a code change.
- **SEC-117:** Security-relevant configuration changes shall be reviewed and auditable.

## 14. Security Testing Requirements

Security testing shall include:

- Authentication, logout, expiry, reset, and failed-login tests.
- Role-isolation and ownership tests for every protected resource.
- Attempts to bypass payment, launch credits, waivers, and contact release.
- Attempts to access restricted fields through direct IDs, altered requests, stale pages, caches, exports, notifications, and attachments.
- Server-side validation, injection, unsafe output, request-size, rate-limit, and concurrency tests.
- Stripe signature, duplicate-event, replay, out-of-order, failed-payment, refund, and chargeback tests.
- File type, content, size, path, access, stale-link, and malware-handling tests.
- Migration, transaction rollback, backup, restore, retention, legal-hold, and audit-integrity tests.
- Secret scanning and dependency or build checks in CI.
- Responsive UI checks that do not compromise protected-data visibility.

## 15. Security Release Gate

A release must not be approved when any of the following is true:

- A protected route or operation lacks a server-side authentication or authorization check.
- A user can access another role’s, another user’s, or another tender’s protected data.
- Client or Retailer details can be exposed before the required confirmed payment or approved waiver.
- Payment status relies on client-side state or an unverified webhook.
- A database change lacks a reviewed migration.
- Payment or contact-release events are not auditable.
- Secrets or sensitive data appear in source, client bundles, logs, artifacts, or test fixtures.
- Relevant tests fail, the database backup cannot be verified, or deployment health is unknown.
- The change conflicts with the approved business plan and the conflict has not been resolved.
