# Trade Tender: SaaS Tendering Platform

**Working plan for building, testing, and launching Trade Tender, a construction tendering platform**

**Business proposition by:** Thomas Osborne
**Prepared by:** James Sinclair

> **Status:** This is the baseline business plan (received 2026-09-03). The Super User has resolved the open conflicts raised on first review; see "Baseline Change Notes" at the end of this document for the decisions that govern implementation.

## 1. Executive Summary

### What Trade Tender Is

Trade Tender is a proposed SaaS tendering platform for the UK construction market. It is designed to help Contractors build job-based tender packages and request quotes for contractors, subcontractors, professional services, plant, equipment, materials, waste services, trades, and specialist construction support through one organised online process, rather than contacting providers manually one by one.

### How the Platform Works

A Contractor creates a job using a guided online form with dropdown boxes and tick-box selections. The Contractor then selects whether the job requires contractors, subcontractors, professional services, materials, plant hire, waste removal, logistics, or other support. The platform separates the job into relevant tender packages and matches each package with suitable Providers based on category, capability, and geographical coverage. Each Provider receives only the part of the tender relevant to their service area, decides whether to unlock the full relevant details, and can then upload a formal quote. Contractors compare quotes inside their portal and choose which quote they want to accept.

### 90-Day Provider Launch Credit Window

The plan assumes a 90-day launch credit window focused on Provider onboarding rather than a platform-wide free period. Contractors can register, create tenders, receive quotes, and compare responses for free. Providers receive limited free unlock credits during the first 90 days to encourage onboarding, quote activity, and national coverage building. The launch credit window can be extended selectively by category, region, or Provider group if supply coverage or quote activity has not reached the required standard.

### Revenue Model

Year 1 revenue is based on two fees: a **£5 Provider quote participation fee** for accessing the full relevant tender package details and submitting a quote, and a **Tender Creator Accepted Quote Release Fee** based on a percentage of the accepted quote value. Provider subscription functionality, partner income, sponsorship, advertising, and additional premium revenue streams remain future options and should only be activated if later usage data supports them.

> Resolved: fee amounts are not being changed as part of this baseline. The platform keeps its current £10 Provider unlock fee and £10 Contractor Accepted Quote Release Fee, with the existing Super-User fee-setting controls. See Baseline Change Notes.

### Launch Funding Requirement

The funding requirement is organised into three categories: pre-launch setup and assurance costs of approximately £770–£2,150; UK-wide marketing costs of £2,500–£5,000 for a Lean UK-wide Launch, £5,000–£10,000 for a Standard UK-wide Launch, or £10,000–£20,000 for a Hard UK-wide Release; and monthly platform running costs of approximately £190–£316 per month, equal to approximately £570–£948 across the initial 90-day launch credit window.

### Year 1 Revenue Scenarios

The Year 1 forecast has been conservatively remodelled around job-package tendering, a lower £5 Provider quote participation fee, and a percentage-based Tender Creator Accepted Quote Release Fee. A Lean UK-wide Launch produces an indicative Year 1 revenue estimate of £12,500, a Standard UK-wide Launch produces approximately £28,500, and a Hard UK-wide Release produces approximately £54,500. These figures assume modest Tender Creator job volumes, an average of 2–3 tender packages per job, limited paid Provider participation after launch credits, conservative accepted quote release activity, and no Provider subscription, partner, sponsorship, affiliate, or advertising revenue in Year 1.

### Critical Risks

The main risks are insufficient UK-wide Provider coverage, limited Contractor tender activity, weak Provider willingness to pay after launch credits are used, poor quote response quality, and failure of the payment/contact-release controls. The platform must also clearly state that Trade Tender is a connection and tender-management platform, not the contractor, supplier, consultant, adviser, broker, guarantor, or party responsible for the final transaction, works, delivery, advice, or professional service outcome.

### Competitive Landscape

Similar construction tendering, procurement, supplier marketplace, and lead-generation platforms already operate in the UK and wider construction market. This validates the wider market need, but it also means Trade Tender must compete through simplicity, low-friction pricing, UK-wide category coverage, quote response quality, and a clear controlled contact-release process.

### Overall Summary

Trade Tender is a credible SaaS marketplace concept with a clear commercial purpose: to simplify construction job-package tendering, improve access to relevant quotes, and create a controlled process for releasing project and contact details. The first 90 days should be treated as a funded market-entry period focused on building UK-wide Provider coverage, generating Contractor tender activity, testing quote response quality, and validating the post-launch fee model. The 90-day credit window can be extended selectively where specific categories or regions require additional Provider onboarding.

## 2. Business Description

The platform is structured around three primary sections: the Super User, the Provider, and the Contractor. Each section serves a different role in the tendering process, allowing the platform owner to manage the system, providers to receive and respond to relevant tender packages, and contractors to build jobs, issue tender requests, and compare quotes efficiently.

## 3. Problem and Opportunity

In the building trade, it can often be difficult to organise contractors, subcontractors, professional services, materials, labour, specialist services, waste removal, and equipment so they are in the right place at the right time. This creates delays, cost uncertainty, wasted time, and pressure on contractors who need reliable providers quickly. The tendering platform addresses this by allowing contractors to build a job once, identify the services, materials, plant, waste, and professional support required, and request quotes from relevant businesses through one organised digital process.

## 4. Product Overview

The platform enables contractors to create a job-based tender request, define the works, services, materials, equipment, waste removal, professional services, or support they need, and distribute each relevant part of that request to a large network of suitable Providers. Providers can respond with availability, pricing, supporting information, and quotes, allowing the Contractor to compare responses in one place and make faster, better-informed procurement decisions.

### 4.1 Contractor Job Creation and Package Tendering Workflow

The Contractor completes an online form that uses dropdown boxes and tick boxes to build a job quickly and easily. The first stage captures the overall job description, location, timescales, access constraints, attachments, and headline requirements. The Contractor then selects which parts of the job need to be tendered, such as contractors or subcontractors to complete works, professional services, materials, plant hire, waste removal, delivery, logistics, or other site support. The platform then guides the Contractor through the relevant detail screens for each selected package, such as service type, material quantities, waste stream, plant type, hire duration, delivery needs, or technical/professional service requirements. Once submitted, the platform separates the job into relevant tender packages and matches each package to Providers that fit the same category, capability, and location criteria.

### 4.2 High-Level Tender Categories

At a high level, job requirements are initially grouped into practical construction-focused categories, including contractors and subcontractors, professional services, plant hire equipment, job site hire, construction materials, waste streams, construction services and trades, delivery and logistics, specialist subcontractor services, concrete and groundworks extras, regulated services, selection filters, and reinstatement or finishing works. These categories provide the structure for the Contractor form and allow each job element to be matched with relevant Providers who operate in the corresponding category.

### 4.3 Provider Account and Capability Management

Each prospective Provider signs up to the platform and manages their capabilities through their own online account. The Provider profile includes the services offered, provider type, contact email address, geographical locations served, coverage radius, accreditations where relevant, and the high-level categories they operate within. This enables the platform to match each tender package with the most relevant Providers based on category, capability, and location.

### 4.4 Automated Provider Notification and Segmented Tender Visibility

When a Contractor submits a job, the platform automatically identifies every Provider that offers the required service and operates within the required geographical region. The platform then sends each Provider only the part of the tender relevant to their category and capability. For example, a contractor or subcontractor may receive the job description, scope, location area, programme, and relevant works information; a materials supplier may receive the job overview and materials list; a plant hire Provider may receive the job overview, plant type, hire period, and delivery requirements; a waste Provider may receive the waste stream, quantity, collection requirements, and site conditions; and a professional service Provider may receive the job overview and specific technical or consultancy requirement. This reduces manual effort for the Contractor and helps ensure opportunities are sent only to relevant businesses with appropriate information visibility.

### 4.5 Super User Maintenance and Support

The Super User is responsible for general platform maintenance, support, and performance oversight. This includes managing system settings, supporting users, resolving basic platform issues, monitoring activity, maintaining Provider and Contractor access, reviewing platform analytics, managing partner and affiliate promotion settings, and ensuring the tendering process continues to operate smoothly.

### 4.6 Super User Analytics and Reporting

The Super User area should include a configurable analytics dashboard that gives platform owners clear visibility of tender and quote activity. At a minimum, the dashboard should show tenders submitted, tenders submitted by each Contractor, tenders accepted or unlocked by Providers, quotes submitted by Providers, quotes accepted by Contractors, and quotes confirmed or accepted by Providers where a provider-side confirmation step is used.

Analytics should be filterable by Contractor, Provider, tender identifier, quote identifier, category, geographical area, status, date range, value band, subscription plan, payment status, and partner or campaign source where relevant. The Super User should be able to export reports where required, review conversion rates between tender submission, provider unlock, quote submission, contractor acceptance, and provider confirmation, and use the data to monitor platform performance, commercial activity, category demand, user behaviour, partner promotion performance, and potential compliance concerns.

### 4.7 Restricted Project Details and Fee Release

The platform should keep sensitive project and contact information restricted until the correct payment stage has been completed. Before a Provider pays to unlock a tender package, they should receive enough summary information to decide whether the opportunity is relevant, such as broad category, location area, headline job requirement, relevant package summary, indicative timescale, and any non-sensitive project notes. Contractor contact details, precise site information, full specification, attachments, and any direct communication details should remain hidden until the unlock fee has been paid.

After the Provider pays the tender unlock fee, the platform should release the full details relevant to that Provider's package so they can prepare a formal quote. This should include the relevant job specification, package requirements, attachments applicable to that service area, precise delivery or site requirements where needed, response deadline, and any project conditions that are necessary for accurate pricing. The platform should record the unlock event against the tender identifier, package identifier, Provider account, payment status, date, time, and any Super User override.

Contractor and Provider identities should remain anonymous from each other until the Contractor accepts a quote and pays the Accepted Quote Release Fee. Once that fee is confirmed, the Provider's contact details are released to the Contractor and the Contractor's contact details are released to the Provider so the parties can complete the final transaction directly. Every release event should be logged so the Super User can review what was released, when it was released, who triggered it, and which payment event authorised it.

### 4.8 Contractor Quote Portal and Acceptance Workflow

The Contractor receives all submitted quotes through their personal portal. From this portal, the Contractor can review the available quotes by job and tender package, compare the responses, and accept the quote that best suits their requirements. The Contractor can create tenders and compare quotes for free. Acceptance of a quote triggers a £10 Contractor Accepted Quote Release Fee unless a launch promotion or Super User-controlled waiver is active. Once the fee has been confirmed, the Provider details are released to the Contractor and the Contractor's contact details are released to the Provider so the final transaction can be completed directly between the parties.

### 4.9 Quote Records, Unique Identifiers, and Monitoring

The platform should assign a unique identifier to each job, each tender package, and each formal quote uploaded through the system. These identifiers should allow the platform owner to trace the tender lifecycle, including when the job was created, which packages were generated, which Providers were notified, which Providers unlocked the details, which formal quotes were returned, which quote was accepted, what platform fees were paid, and when contact details were released.

The identifier structure should be consistent and easy to audit. For example, a job could use a format such as `JOB-YYYYMMDD-000001`, with tender packages using related identifiers such as `JOB-YYYYMMDD-000001-MAT`, `JOB-YYYYMMDD-000001-PLANT`, `JOB-YYYYMMDD-000001-WASTE`, or `JOB-YYYYMMDD-000001-SERV`. Formal quotes returned against each package could then use a linked format such as `JOB-YYYYMMDD-000001-MAT-Q01`, `JOB-YYYYMMDD-000001-PLANT-Q01`, and so on. The exact format can be finalised during technical design, but the principle should remain that jobs, tender packages, and formal quotes are clearly linked, searchable, and reportable.

The platform should retain only the records needed to operate the tender process, support quote retention, evidence contact-release events, and review unusual activity. Monitoring should focus on formal quote activity, repeated tender patterns, repeated use of the same parties, unusual payment behaviour, repeated cancellations, duplicate or near-duplicate tenders, and other indicators that may suggest misuse of the platform.

### 4.10 Platform Capacity and Data Retention Requirements

The early production platform should be designed and performance-tested to support up to 1,000 concurrent users. This means the infrastructure, database, payment flow, email notification process, quote submission workflow, and Contractor dashboard should remain usable when up to 1,000 users are active on the platform at the same time. Load testing should be completed before wider launch so the hosting setup, database tier, caching, background jobs, and monitoring can be adjusted before real usage grows.

The platform should apply a clear formal quote-retention policy. All formal quotes should be stored for 30 days from submission so Contractors can compare live responses and Providers can manage recent quote activity. Unsuccessful, expired, or non-accepted quotes should then be deleted or anonymised after 30 days unless there is a dispute, investigation, suspicious activity review, legal hold, or other valid reason to retain them. Successful or accepted formal quotes, together with the related tender identifier, payment records, contact-release events, and audit logs, should be retained for five years for operational audit, dispute support, fraud prevention, tax, regulatory, and platform governance purposes.

### 4.11 Platform Role and Transaction Responsibility

The platform acts as a connection and tender management tool between Contractors and Providers. Once Provider details are released and the Contractor chooses to proceed, the final transaction, delivery, fulfilment, professional advice, service quality, workmanship, payment arrangements, and any disputes are handled directly between the Contractor and the Provider. The platform does not act as the contractor, subcontractor, supplier, consultant, professional adviser, agent, broker, or guarantor for the end transaction and does not accept responsibility for the goods, services, works, advice, pricing, performance, or outcome agreed between the Contractor and Provider.

### 4.12 Primary Platform Sections

- **Super User:** The platform administrator or owner who manages the overall system, sets rules and parameters, controls access, oversees users, monitors activity across the platform, reviews analytics, manages partner and affiliate promotion settings, filters tender and quote activity, and provides general platform maintenance and support.
- **Provider:** The business that signs up to the platform, manages its own online account, records the services, products, works, professional services, plant, materials, waste, or support it offers, provides a contact email address, defines the geographical locations it serves, and receives tender package opportunities that match its categories, capabilities, and locations.
- **Contractor:** The customer, contractor, or organisation that creates job-based tender requests by completing an online form. Through dropdown boxes and tick boxes, the Contractor can quickly build a job, define each required package, and send categorised tender opportunities to relevant Providers for quotes.

## 5. Business Model and Pricing

The platform will generate revenue through a simple two-sided fee model. Providers can sign up for free and receive matched tender package summaries at no cost. During the initial 90-day launch credit window, Providers receive limited free unlock credits to encourage onboarding and quote participation. After those credits are used, or once the credit window ends, a Provider pays a fixed £10 tender unlock fee to view the full relevant job-package specification and the information required to prepare a formal quote. Contractors can create jobs, issue tender packages, receive quotes, and compare responses for free. Provider and Contractor details remain anonymous from each other until the Contractor accepts a quote and pays the £10 Contractor Accepted Quote Release Fee. Once paid, the Provider's contact details are released to the Contractor and the Contractor's contact details are released to the Provider so the parties can arrange formal payment and complete the transaction directly. Provider subscription functionality and tiered Contractor release-fee functionality should remain in the platform build as inactive future features, controlled by the Super User, and excluded from the current revenue forecast.

> Resolved: keep the current £10 fixed tender unlock fee and £10 Accepted Quote Release Fee; the £5/percentage-based figures elsewhere in this document do not apply. See Baseline Change Notes.

### 5.1 Current Contractor Accepted Quote Release Fee and Future Tiering Functionality

| Fee Element | Current Position | Purpose |
|---|---|---|
| Contractor Accepted Quote Release Fee | £10 fixed fee per accepted quote after the free launch period. | Keeps the Contractor payment simple, predictable, and low-friction while the platform validates demand, accepted quote behaviour, and package-based tender conversion. |
| Future tiered Contractor release-fee functionality | Built but inactive. | Allows the Super User to activate tiered pricing later if platform usage, quote values, and conversion data support a more developed pricing model. No tiered Contractor fee revenue is included in the current forecast. |

### 5.2 Future Provider Subscription Functionality

| Plan | Monthly Price | Included Tender Unlocks | Purpose |
|---|---|---|---|
| Free | £0 | 0 | Provider receives matched summaries and pays per tender unlock. |
| Starter | £29 per month | 1–10 tenders | Suitable for small local suppliers or occasional users. |
| Growth | £49 per month | 11–20 tenders | Suitable for active suppliers receiving regular enquiries. |
| Pro | £99 per month | 21+ tenders / unlimited fair-use allowance | Suitable for regional suppliers or higher-volume Providers. |
| Enterprise | £149–£199 per month | 21+ tenders / unlimited fair-use allowance | Suitable for larger businesses, multi-branch suppliers, or high-volume users. |

Provider subscription options should be included in the build as an inactive future feature, not as part of the current revenue model. The Super User should be able to keep subscriptions switched off during launch, then activate them later if Trade Tender has evidence of repeat Provider usage, sufficient job-package tender volume, and a clear demand for monthly plans. If activated, the plans can be structured around clear tender package bands: 1–10 tender packages, 11–20 tender packages, and 21 tender packages to unlimited, subject to fair-use or custom controls. The Super User should be able to set monthly prices, included tender bands, the standard unlock fee, free promotional unlocks, fair-use rules, and whether subscriptions are active or disabled.

## 6. Operations and Delivery

The business will operate as a digital marketplace and tender management platform, not as the supplier, contractor, consultant, professional adviser, or party responsible for the final transaction. Day-to-day operations will include platform hosting, user onboarding, account support, category maintenance, partner and affiliate promotion management, payment access controls, segmented email notification management, product updates, data management, and basic user support. Disputes relating to the final quote, purchase, delivery, service, workmanship, goods supplied, professional advice, payment between the parties, or project outcome will be handled directly between the Contractor and the Provider.

## 7. Financial Plan

The forecast below is based on the proposed conservative fee model: Providers pay a £5 quote participation fee to access the full relevant tender package details and submit a quote after launch credits are used or after the 90-day Provider launch credit window ends. Tender Creators pay an Accepted Quote Release Fee when accepting a quote and unlocking the exchange of contact details. The Tender Creator fee is expected to remain percentage-based and linked to the accepted quote value, with suitable minimum, maximum, waiver, and Super User control settings to be finalised during commercial testing. Provider subscription functionality, partner income, sponsorship, advertising, and other premium revenue streams are excluded from the current forecast.

### 7.1 Forecast Assumptions

- Provider quote participation fee: £5 per relevant tender package.
- Tender Creator Accepted Quote Release Fee: percentage-based and triggered only when a quote is accepted and contact details are released.
- The forecast assumes an initial 90-day Provider launch credit window, with the option to extend credits selectively by category, region, or Provider group where coverage or quote activity requires further support.
- Figures exclude VAT, payment processing fees, tax, operating costs, development costs, staff costs, Provider subscription revenue, partner income, sponsorship, and advertising revenue.
- Lean scenario assumes approximately 450 Contractor jobs in Year 1, averaging 2 tender packages per job.
- Standard scenario assumes approximately 800 Contractor jobs in Year 1, averaging 2.25 tender packages per job.
- Hard release scenario assumes approximately 1,200 Contractor jobs in Year 1, averaging 2.5 tender packages per job.
- The forecast assumes only a modest proportion of tender package opportunities convert into paid Provider unlocks after launch credits are used.
- Partner, affiliate, sponsorship, advertising, Provider subscription, and tiered Contractor fee revenue are excluded from the Year 1 forecast and treated as future upside only.

### 7.2 Year 1 Revenue Forecast by Launch Scenario

| Metric | Lean UK-wide Launch | Standard UK-wide Launch | Hard UK-wide Release |
|---|---|---|---|
| 90-day Provider launch credit window | Yes | Yes | Yes |
| Marketing budget | £2,500–£5,000 | £5,000–£10,000 | £10,000–£20,000 |
| Registered Providers by end of Year 1 | 300 | 600 | 1,000 |
| Estimated Tender Creator jobs submitted | 450 | 800 | 1,200 |
| Average tender packages per job | 2.0 | 2.25 | 2.5 |
| Estimated tender packages created | 900 | 1,800 | 3,000 |
| Paid Provider quote participation actions | 1,500 | 3,200 | 5,500 |
| Provider quote participation revenue | £7,500 | £16,000 | £27,500 |
| Accepted quote release events | 250 | 500 | 900 |
| Average Tender Creator release fee assumption | £20 | £25 | £30 |
| Tender Creator Accepted Quote Release Fee revenue | £5,000 | £12,500 | £27,000 |
| **Total Estimated Year 1 Revenue** | **£12,500** | **£28,500** | **£54,500** |

### 7.3 Forecast Rationale

Year one is presented as three conservative UK-wide launch scenarios. Each assumes an initial 90-day Provider launch credit window, with paid revenue beginning once Provider credits are used or the credit window ends, and with the option to extend credits selectively where specific categories or regions require further supply-side support. The Lean UK-wide Launch assumes approximately 450 Tender Creator jobs, 900 tender packages, 1,500 paid Provider quote participation actions, 250 accepted quote release events, and total Year 1 revenue of £12,500. The Standard UK-wide Launch assumes approximately 800 Tender Creator jobs, 1,800 tender packages, 3,200 paid Provider quote participation actions, 500 accepted quote release events, and total Year 1 revenue of £28,500. The Hard UK-wide Release assumes approximately 1,200 Tender Creator jobs, 3,000 tender packages, 5,500 paid Provider quote participation actions, 900 accepted quote release events, and total Year 1 revenue of £54,500. No Provider subscription, partner, sponsorship, affiliate, advertising, or other premium revenue is assumed in any current forecast scenario.

### 7.4 Revenue Model Validation

| Revenue Driver | Year 1 Validation | Year 3 Validation | Year 5 Validation |
|---|---|---|---|
| Provider quote participation revenue | Lean Year 1 revenue assumes 1,500 paid Provider quote participation actions at £5, equal to approximately £7,500 revenue. This is deliberately more attractive for Providers than a higher unlock fee and is intended to encourage quoting, repeat usage, and early marketplace liquidity. | Year 3 should be validated against actual Provider participation behaviour by package type, region, Provider category, repeat Provider usage, and quote conversion quality. | Year 5 should only be treated as a growth case if paid Provider participation has become repeatable across multiple categories and UK regions. |
| Tender Creator Accepted Quote Release Fee revenue | Lean Year 1 revenue assumes 250 accepted quote release events with an average release fee assumption of £20, equal to approximately £5,000 revenue. The actual fee should be percentage-based and linked to the accepted quote value, with suitable minimum, maximum, waiver, and Super User controls confirmed during testing. | Year 3 should be validated against accepted quote rates, average accepted quote values, release-fee conversion, package completion rates, quote quality, and Tender Creator willingness to pay. | Year 5 should be treated as ambitious unless supported by strong evidence of frequent job creation, repeat Tender Creator usage, reliable Provider response rates, and low payment friction. |
| Commercial interpretation | Year 1 is intentionally cautious. The model assumes that a £5 Provider fee improves participation but reduces revenue per Provider action, while the Tender Creator release fee captures value only when a quote is accepted. | Future forecasts should be updated using live platform data, including jobs created, average packages per job, Provider participation rate, quote submission rate, accepted quote rate, accepted quote value, and Provider repeat usage. | Longer-term forecasts should only include subscriptions, partner income, affiliate income, sponsorship, or advertising once traffic, Provider demand, and Tender Creator activity are proven. |

### 7.5 Funding Requirement Structure

The launch funding requirement is structured in three parts so the budget is easy to understand: pre-launch setup and assurance costs, UK-wide marketing costs, and monthly platform running costs. Pre-launch costs are one-off items needed before public launch. Marketing costs are separate because the amount depends on the chosen UK-wide launch intensity. Monthly running costs cover the core software and infrastructure required while the platform operates during the initial 90-day Provider launch credit window.

#### 7.5.1 Pre-Launch Setup and Assurance Costs

Estimated one-off pre-launch setup and assurance costs are approximately £770–£2,150. These costs cover independent technical review, managed load testing, payment/contact-release workflow checks, segmented job-package notification testing, and domain/email authentication setup before opening the platform to real Contractors and Providers.

#### 7.5.2 UK-Wide Marketing Costs

Marketing is funded separately because Trade Tender is targeting a UK-wide launch. Indicative marketing budgets are £2,500–£5,000 for a Lean UK-wide Launch, £5,000–£10,000 for a Standard UK-wide Launch, and £10,000–£20,000 for a Hard UK-wide Release.

#### 7.5.3 Monthly Platform Running Costs

Monthly core running costs are estimated at approximately £190–£316 per month. Over the initial 90-day Provider launch credit window, this creates an estimated running-cost requirement of approximately £570–£948.

| Cost Area | Planning Assumption | Indicative Cost |
|---|---|---|
| GitHub Enterprise and GitHub Copilot | One owner/developer account using GitHub Enterprise and Copilot-assisted development support. | Approximately £50 per month. |
| Azure hosting | Lean early production Azure setup, including App Service, managed database, Blob Storage, basic monitoring, backups, and load-testing readiness. | Approximately £125–£250 per month. |
| Resend email service | 50,000 transactional emails per month for alerts, confirmations, reminders, quote notifications, and contact-release emails. | Approximately £16 per month. |
| Indicative monthly total | Core operating baseline, excluding staff, development labour, marketing, insurance, accounting, legal advisory work, tax, and payment processing fees. | Approximately £190–£316 per month. |

> Resolved: this table's Azure hosting reference is a legacy carry-over. The platform stays on Render with Neon Lakebase Postgres. See Baseline Change Notes.

**Funding summary:** The funding requirement should be reviewed in the following order: pre-launch setup and assurance costs of approximately £770–£2,150; UK-wide marketing costs of approximately £2,500–£20,000 depending on launch intensity; and monthly platform running costs of approximately £190–£316 per month, equal to approximately £570–£948 across the initial 90-day launch credit window.

## 8. Build and Launch Plan

The build and launch plan should prioritise the core job-package workflow first, then validate the platform through testing, Provider onboarding, Contractor demand generation, segmented tender visibility, and controlled UK-wide launch activity.

### Risks and Mitigation Table

| Risk | Potential Impact | Mitigation |
|---|---|---|
| Low Contractor adoption | Not enough tenders are created to make the platform valuable for Providers. | Keep tender creation free during the initial launch window, make the form quick to complete, use UK-wide targeted marketing, and monitor conversion by category and region. |
| Low Provider uptake | Contractors may not receive enough quotes, reducing trust in the platform. | Allow free Provider registration, explain the fixed-fee model clearly, offer launch promotions, prioritise onboarding by category and geography, and keep future subscription functionality available but switched off until usage supports it. |
| Poor quote response rate | Contractors may receive too few useful quotes after submitting a tender. | Send tenders only to relevant Providers, add response deadlines, use reminder emails, monitor category performance, and identify categories or regions with weak coverage. |
| Inaccurate category matching | Tenders may be sent to unsuitable Providers, causing wasted emails and lower conversion. | Use structured categories and subcategories, require Providers to maintain their capability profiles, test matching rules during pilot launch, and allow Super Users to refine categories over time. |
| Payment friction | Providers or Contractors may abandon the process when asked to pay a fee. | Keep Provider unlock fees low and fixed, use a 90-day Provider launch credit window, cap the Contractor Accepted Quote Release Fee at £10, show exactly what is unlocked before payment, use a trusted payment provider, provide clear payment confirmation, and allow the Super User to extend credits selectively by category, region, or Provider group where justified by supply coverage or quote activity. |
| Disputes between Contractors and Providers | Users may expect the platform to resolve problems with delivery, workmanship, goods, or final payment. | Use clear terms stating that the platform only connects Contractors and Providers, make both parties responsible for the final transaction, and display responsibility wording before details are released. |
| Data protection and contact-release issues | Users may lose trust if contact details or restricted project information are shown too early. | Define clear visibility rules, restrict contact details until the correct payment stage, use secure account access, maintain privacy wording, and keep audit records of detail release events. |
| Weak document control or suspicious transaction monitoring | Without traceable tender and quote identifiers, the platform may struggle to investigate disputes, detect unusual behaviour, or evidence controls around potential misuse or money-laundering risk. | Assign every tender a unique identifier, link all returned quotes to that identifier, maintain immutable audit logs, create owner monitoring dashboards, flag unusual tender or quote patterns, and define escalation procedures for suspicious activity. |
| Provider quality concerns | Contractors may receive quotes from unsuitable or unverified businesses. | Introduce Provider verification, collect business details, allow relevant accreditations to be recorded, enable account suspension, and consider future ratings or feedback after completed jobs. |
| Regional coverage gaps | Some Contractor requests may not match enough Providers in the required area. | Track unmatched tenders, recruit Providers into weak locations and categories, and increase marketing spend only where supply coverage can support Contractor demand. |
| Technical failure or downtime | Users may be unable to submit tenders, unlock details, or respond to quotes. | Use reliable hosting, regular backups, monitoring, secure payment integration, basic support processes, and staged testing before public launch. |
| Email deliverability issues | Providers may not receive tender alerts, reducing quote volume. | Use a reputable email service, authenticate sending domains, monitor bounce rates, provide in-platform tender alerts, and allow Providers to manage notification preferences. |
| Pricing resistance | Providers or Contractors may feel the access or processing fees are too high. | Start with low fixed launch fees, use limited Provider launch credits, monitor conversion, provide targeted promotional credits where needed, allow the Super User to adjust pricing by platform stage, and only activate subscription plans later if usage data supports them. |

## 9. Targeted Marketing and User Acquisition Plan

Trade Tender is positioned for a UK-wide launch. The marketing plan is structured around three launch intensity options so the business can choose how aggressively to build national Provider coverage and Contractor demand. Each option uses the same core channels — direct outreach, trade-directory list building, LinkedIn, Google Search, referral introductions, partner affiliation promotion, and launch incentives — but differs in scale, volume, and speed of execution.

### 9.1 Target Contractor Segments

Initial Contractor targeting should focus on users who regularly need contractors, subcontractors, professional services, plant, materials, waste services, trades, transport, or site support and who feel the pain of chasing multiple providers manually. The strongest first Contractor groups are small and medium construction businesses, groundworks contractors, refurbishment contractors, site managers, property maintenance businesses, facilities managers, developers, landlords with repeat works, and local builders managing multiple jobs.

Contractor messaging should focus on speed, simplicity, choice, and control: build one job, split it into relevant tender packages, reach relevant Providers across the UK, compare quotes in one place, keep details controlled until acceptance, and reduce the time spent calling around. UK-wide campaigns should concentrate on high-frequency use cases such as plant hire, muck away, aggregates, skips, welfare hire, concrete, haulage, professional services, subcontractor packages, and common trades, using national search intent while still allowing users to filter by postcode, service area, and delivery requirements.

### 9.2 Target Provider Segments

Provider targeting should focus on businesses that benefit from receiving relevant local or national tender package opportunities and can respond quickly with clear pricing. Priority segments should include plant hire companies, skip and waste providers, aggregate and material suppliers, concrete suppliers, welfare and cabin hire providers, scaffolders, groundworkers, subcontractors, professional service providers, consultants, engineers, haulage and HIAB transport businesses, drainage contractors, and specialist construction support businesses.

Provider messaging should focus on low-risk access to new UK-wide tender package opportunities: free registration, matched tender summaries, no percentage commission on tender value, low fixed unlock fee in Year 1, anonymous Contractor details until the correct stage, and the ability to decide whether an opportunity is worth unlocking. Providers should be onboarded nationally by category and coverage area so Contractors can submit job packages from across the UK without creating immediate regional coverage gaps.

### 9.3 Recommended Direct Marketing Channels

| Channel | Target | How to Use It | Indicative Cost |
|---|---|---|---|
| Manual direct outreach | Providers first, then Contractors | Build targeted lists from trade directories, Google Maps, local supplier searches, existing contacts, construction networks, and category-specific searches. Contact each business with a short explanation, free registration offer, and clear category/location fit. | £0–£300 for list building tools, data checking, and basic outreach support. |
| LinkedIn outreach and small paid test | Contractors, site managers, owners, directors, and supplier decision-makers | Use founder-led LinkedIn posting, connection requests, direct messages, and a small sponsored test aimed at construction decision-makers. LinkedIn should be used carefully because B2B clicks and leads can be expensive. | £250–£1,000 test budget. |
| Google Search Ads pilot | Contractors with immediate quote intent | Run tightly controlled search ads for specific terms such as plant hire quotes, skip hire quotes, aggregate suppliers, muck away quotes, concrete quotes, or local construction supplier quotes. Start narrow by region and category. | £300–£1,000 test budget. |
| Trade directory and local supplier list building | Providers | Use category-by-category directory research to identify plant hire firms, waste companies, aggregate suppliers, scaffolders, transport firms, and subcontractors in the first launch area. Prioritise phone and email outreach over passive advertising. | £100–£500 depending on research/list/admin support used. |
| Direct mail or printed introduction campaign | Selected Providers and construction buyers | Send a simple postcard or letter to a small, targeted list in the launch area. Use only where the audience is highly relevant and follow up by phone or email. | £250–£1,250 for a focused 500–1,000 item campaign. |
| Launch incentives | Providers and Contractors | Offer limited free unlock credits to early Providers and waive or discount selected Contractor release fees during the pilot so the platform can prove response rates and collect feedback. | £0 cash cost if structured as waived platform fees, but reduces early revenue while improving adoption. |

### 9.4 90-Day Launch Marketing Sequence

| Period | Objective | Actions |
|---|---|---|
| Days 1–30 | Drive UK-wide Contractor demand | Build national Provider supply before public launch. Create UK-wide target lists by category, prioritise high-frequency services, contact Providers directly, explain free registration, offer launch credits, and track coverage by region, category, and service radius. |
| Days 31–60 | Test Contractor demand with controlled outreach | Approach Contractors nationally, including small and medium contractors, groundworkers, maintenance firms, developers, builders, facilities managers, landlords with repeat works, and site managers. Use Google Search Ads, LinkedIn outreach, direct email, trade groups, and referral introductions to encourage real tenders from multiple UK regions. |
| Days 61–90 | Refine and scale the best channel | Review national coverage, unlock rate, quote rate, accepted quote rate, cost per registered Provider, cost per Contractor tender, and response quality by region and category. Increase spend only where the channel produces real tenders, useful quotes, and clear conversion evidence across the UK. |

### 9.5 UK-Wide Launch Budget Options

| Launch Type | Indicative Budget | What It Involves | Expected Use Case |
|---|---|---|---|
| Lean UK-wide Launch | £2,500–£5,000 | Founder-led national outreach supported by UK-wide Provider list building, direct email, telephone follow-up, trade-directory research, small LinkedIn testing, small Google Search testing, and launch credits for early Providers and Contractors. | Suitable where funding is limited and the objective is to test UK-wide demand while keeping spend tightly controlled. |
| Standard UK-wide Launch | £5,000–£10,000 | Broader national Provider acquisition, more structured category-by-category list building, larger direct outreach volume, paid search across priority services, LinkedIn prospecting, selected direct mail, launch incentives, and weekly performance tracking by category and region. | Recommended baseline for a professional UK-wide market entry, balancing meaningful reach with cost control. |
| Hard UK-wide Release | £10,000–£20,000 | High-intensity national launch with larger Provider outreach volume, stronger paid search coverage, wider LinkedIn campaigns, industry list-building support, selected printed/direct mail activity, structured follow-up, launch incentives, and faster expansion across multiple service categories. | Suitable where the objective is rapid UK-wide visibility and faster marketplace coverage from day one. |

The recommended starting point for a hard UK-wide release is the Standard UK-wide launch budget, with the Hard UK-wide release campaign used if Trade Tender wants faster national visibility and broader category coverage from day one. Marketing spend should be reviewed against practical marketplace metrics, including registered Providers by category and region, verified service coverage, tender submissions, Provider unlocks, quote submissions, accepted quotes, response rates, and cost per converted Contractor or Provider.

## 10. Risks and Mitigation

A further strategic risk is that comparable tendering, construction procurement, and provider marketplace platforms already exist. Trade Tender should not be positioned as a completely new category. Its opportunity is to provide a simpler, lower-friction, construction-focused job-package quote marketplace with transparent fixed fees, segmented tender visibility, active but clearly labelled partner affiliation promotion, and controlled detail release. The platform should therefore monitor competitor pricing, provider coverage, ease of use, and contractor experience as part of its ongoing commercial review.

The platform should manage risk by defining its marketplace role clearly, keeping the user journey simple, using accurate category matching, segmenting tender package visibility correctly, and setting transparent rules for fees, data visibility, partner promotion, quote retention, and user responsibilities.

### 10.1 Phase One: Requirements and Platform Structure

- Finalise the three core user roles: Super User, Provider, and Contractor.
- Define the exact fields required for the Contractor job builder, including job description, package type, category, subcategory, location, quantity, delivery date, hire duration, urgency, access constraints, attachments, and supporting notes.
- Finalise Provider account fields, including service categories, subcategories, provider type, email address, trading area, coverage radius, accreditations, and contact preferences.
- Confirm which job and package details are visible before payment and which are restricted until the relevant fee is paid.
- Define Super User controls for fees, categories, users, email templates, platform settings, fee disablement, partner promotion, and affiliate display controls.
- Define Super User analytics requirements, including jobs submitted, tender packages created, filters by Contractor and Provider, tenders accepted or unlocked by Providers, quotes submitted, quotes accepted by Contractors, and quotes confirmed or accepted by Providers.

### 10.2 Phase Two: Minimum Viable Product Build

- Build secure registration and login for Contractors, Providers, and Super Users.
- Build the Contractor job creation form using dropdown boxes, tick boxes, and structured job fields.
- Build package selection screens so Contractors can select contractors, subcontractors, professional services, materials, plant hire, waste removal, logistics, and site support requirements.
- Build the Provider capability profile so Providers can manage services offered, categories, subcategories, email address, and geographical areas served.
- Build the matching engine so submitted job packages are matched to Providers by service category and geographical coverage.
- Build automated email notifications that send segmented tender details to matched Providers.
- Build the Provider unlock process so full relevant tender package details are released after launch credits are used or the unlock fee is paid.
- Build the Provider quote submission process inside the platform.
- Build the Contractor portal where quotes are received, reviewed, compared, and accepted by job and package.
- Build the Contractor Accepted Quote Release Fee mechanism and controlled contact-release process.

### 10.3 Partner Branding and Advertising Links

The platform build should include active promotion of selected partners, affiliates, sponsors, and related businesses through clearly labelled partner branding and clickable advertising links. Partner promotion may be shown in appropriate areas such as the footer, dashboard side panels, partner information areas, email footers, category pages, onboarding screens, or clearly labelled advertising spaces.

All partner links should be clearly presented as advertising, sponsorship, affiliate, or partner information. They should remain separate from tender matching, quote ranking, Provider selection, and Contractor decision-making so users do not assume that paid or partner visibility affects quote results unless this is expressly disclosed. The Super User should be able to manage partner names, display locations, destination links, status, campaign source, and whether each advert or partner link is active.

### 10.4 Website Footer Links and Public Policy Documents

The platform website should include a clear footer area that links to all public-facing terms, policies, and user information documents. These links should be available from the main website, login page, registration pages, Contractor portal, Provider portal, and any payment or contact-release screens so users can easily access the rules that govern use of the platform.

- Platform Terms and Conditions.
- Contractor Terms of Use.
- Provider Terms of Use.
- Marketplace Disclaimer and Platform Role Statement.
- Privacy Policy.
- Cookie Policy.
- Quote Retention Policy.
- Payment and Refund Policy.
- Contact-Release Policy.
- Acceptable Use Policy.
- Advertising, Affiliate, and Partner Links Policy.
- Complaints and Support Policy.
- Accessibility Statement.

Footer links should use clear labels and should open the relevant public document or policy page. Where a policy is directly relevant to a user action, such as paying a fee, accepting a quote, uploading a formal quote, or releasing contact details, the same policy should also be referenced near that action inside the platform.

### 10.5 Phase Three: Payments, Controls, and Quote Records

- Integrate a payment provider for Provider unlock fees and Contractor release fees.
- Define payment status, failed payment handling, refund rules, and fee disablement controls.
- Add data visibility rules so contact details and restricted project details are only released at the correct stage.
- Add quote-record rules so each tender receives a unique tender identifier and each returned formal quote receives a linked quote identifier.
- Add owner reporting tools to monitor tender and formal quote activity for unusual patterns, including repeated parties, abnormal values, duplicate tenders, repeated cancellations, unusual payment behaviour, or other indicators of potential misuse.
- Add basic terms acceptance for Contractors and Providers.
- Add Super User controls for user suspension, category editing, Provider approval, and support access.
- Build the Super User analytics dashboard with filters for Contractor, Provider, tender identifier, quote identifier, category, location, date range, status, payment status, and subscription status where the future subscription feature is enabled.
- Prepare privacy, data protection, and contact-release wording for the platform.
- Prepare platform terms that clearly state Contractors and Providers are responsible for their own final transaction, and that the platform is not responsible for disputes, fulfilment, workmanship, goods supplied, delivery, or final payment arrangements between the parties.

### 10.6 Phase Four: Testing and Pilot Launch

- Test the full workflow from Contractor project creation to Provider notification, payment, quote submission, Contractor acceptance, and detail release.
- Test category matching accuracy using plant hire, job site hire, materials, waste, trades, logistics, and compliance categories.
- Invite a small initial group of Providers to create profiles and confirm their service categories and coverage areas.
- Invite a small group of Contractors to submit test projects and provide feedback on the online form.
- Collect feedback on form speed, category clarity, quote quality, payment friction, and notification accuracy.
- Fix priority issues before opening the platform to a wider market.

### 10.7 Phase Five: Provider Onboarding

- Create a simple Provider onboarding process explaining how opportunities are matched and how the unlock fee works.
- Recruit Providers across the core categories first: plant hire, job site hire, construction materials, waste services, construction trades, delivery and logistics, and specialist subcontractor services.
- Prioritise Providers by geographical coverage so the platform can support real Contractor enquiries from launch.
- Prepare email templates for Provider invitations, tender alerts, payment confirmation, quote reminders, and account updates.
- Check that Providers understand what information they receive before payment and what is released after payment.

### 10.8 Phase Six: Public Launch

- Prepare for a hard UK-wide release, supported by category and regional coverage tracking so supply gaps are visible before and after launch.
- Promote the platform to Contractors who regularly need plant, materials, waste services, trades, and site support.
- Use UK-wide direct outreach, construction networks, trade groups, LinkedIn, paid search testing, and referral introductions to attract early Contractors and Providers.
- Monitor the number of tenders submitted, tenders submitted by each Contractor, Provider matches, emails opened, release fees paid, tenders accepted or unlocked by Providers, quotes submitted, quotes accepted by Contractors, Provider confirmations, and Contractor acceptances.
- Review whether the fee amounts are low enough to encourage participation while still creating a sustainable revenue stream.

### 10.9 Phase Seven: Post-Launch Improvement

- Review tender conversion rates, including tender submissions, Provider unlocks, quote submissions, and Contractor acceptances.
- Improve category and subcategory matching based on real platform usage.
- Add Provider performance insights, such as response rate, average quote time, and accepted quote history.
- Review the fixed-fee pricing model and adjust fees, promotional credits, or future subscription activation where supported by real platform usage.
- Improve dashboards for Contractors, Providers, and Super Users.
- Add reporting tools for platform activity, revenue, category demand, and regional coverage gaps.
- Expand into additional regions once Provider coverage is strong enough to support Contractor demand.

## 11. Brand Guide

> Resolved: the Super User has confirmed the platform keeps its current approved brand palette and identity ([docs/branding/Trade_Tender_Brand_Guide.pdf](branding/Trade_Tender_Brand_Guide.pdf) and [docs/branding/TradeTender-Brand-Rules.md](branding/TradeTender-Brand-Rules.md)). The colour palette and personality proposed below are **not adopted**; they are retained in this document for reference only. See Baseline Change Notes.

The brand should feel practical, robust, trustworthy, and construction-ready. It should appeal to contractors, suppliers, site managers, and clients by using a visual identity that feels familiar to the construction trade while still looking clean and professional as a modern SaaS platform.

### 11.1 Brand Personality

- **Reliable:** The platform should feel dependable and organised.
- **Direct:** Language and design should be clear, simple, and easy to understand.
- **Trade-focused:** The brand should feel relevant to construction, plant hire, materials, site services, and waste management.
- **Efficient:** The visual identity should support speed, clarity, and quick decision-making.
- **Professional:** The platform should feel credible enough for business use without becoming overly corporate.

### 11.2 Recommended Brand Colour Palette (proposed, not yet approved)

| Colour Name | Hex Code | Recommended Use |
|---|---|---|
| Construction Navy | #1F2A33 | Main brand colour, dashboard navigation, headers, footer, login screens, and primary structural elements. |
| Safety Orange | #F28C28 | Main call-to-action colour for buttons, tender unlock actions, quote acceptance, payment prompts, and key alerts. |
| Concrete Grey | #6B7280 | Secondary text, form labels, dividing lines, borders, table lines, and neutral interface elements. |
| Steel Blue | #2F5D7C | Secondary buttons, links, dashboard highlights, Provider profile accents, and information panels. |
| High-Vis Yellow | #F5C542 | Urgent tender markers, warning highlights, action-required notices, and limited site-safety style accents. |
| Off-White | #F7F5F0 | Page backgrounds, form areas, portal screens, and soft interface backgrounds. |
| Success Green | #2E7D32 | Accepted quotes, payment complete status, approved Provider accounts, and successful submissions. |
| Warning Amber | #D97706 | Pending payments, quote expiry warnings, incomplete profiles, and required actions. |
| Error Red | #B91C1C | Failed payments, expired tenders, rejected actions, account issues, and validation errors. |

### 11.3 Colour Usage Guidance

- Use Construction Navy as the primary base colour to create a strong, reliable, trade-focused identity.
- Use Safety Orange for actions that move the user forward, such as unlocking a tender, submitting a quote, or accepting a quote.
- Use Concrete Grey and Off-White to keep long forms and dashboard screens clean, readable, and practical.
- Use High-Vis Yellow sparingly so it remains effective for urgent or important platform messages.
- Use Success Green, Warning Amber, and Error Red consistently for platform status messages so users can quickly understand what action is needed.

### 11.4 Suggested Interface Application

- Dashboard sidebar: Construction Navy.
- Primary buttons: Safety Orange.
- Secondary buttons and links: Steel Blue.
- Page background: Off-White.
- Cards, forms, and quote panels: White with Concrete Grey borders.
- Urgent tenders: High-Vis Yellow markers.
- Accepted quotes and completed payments: Success Green.
- Expired tenders and failed payments: Error Red.

### 11.5 Tone of Voice

The written tone should be clear, direct, helpful, and practical. Platform wording should avoid unnecessary jargon and should guide users through each action quickly. Example wording should include phrases such as "Create tender", "Unlock full details", "Submit quote", "Accept quote", "Payment complete", and "Action required".

## Appendix A: Construction Industry Tender Selection Categories

This appendix provides an initial list of selectable options that a Contractor could choose from when building a construction project tender. The categories are designed to support fast project creation, accurate matching, and targeted tender distribution to relevant Providers.

### A.1 Plant Hire Equipment

- Excavators: mini excavator 1 tonne, 1.5 tonne, 3 tonne, 5 tonne; tracked excavator 8 tonne, 13 tonne, 20 tonne, 30 tonne; wheeled excavator 14 tonne, 18 tonne.
- Dumpers: forward tipping dumper 1 tonne, 3 tonne, 6 tonne, 9 tonne; tracked dumper 1 tonne, 3 tonne, 6 tonne.
- Compaction equipment: ride-on rollers 80cm, 120cm, 135cm drum width; plate compactors small, medium, heavy-duty; trench rammers.
- Lifting and handling: telehandlers 6m, 9m, 12m, 17m reach; forklifts 2.5 tonne, 3 tonne, 5 tonne; rough-terrain forklifts.
- Access equipment: scissor lifts 6m, 8m, 10m, 12m working height; boom lifts/cherry pickers 12m, 16m, 20m, 26m working height; scaffold towers 2m, 4m, 6m, 8m platform height.
- Cranes: mobile cranes 25 tonne, 35 tonne, 50 tonne, 80 tonne, 100 tonne; spider cranes 2.8 tonne, 4 tonne, 6 tonne; tower cranes including self-erecting, flat-top, and luffing-jib tower cranes; HIAB lorry cranes on 7.5 tonne, 18 tonne, and 26 tonne vehicles.
- Power and site services: generators 10kVA, 20kVA, 40kVA, 60kVA, 100kVA; compressors single-tool, twin-tool, high-output; lighting towers standard diesel, hybrid, solar.
- Concrete equipment: 110V electric mixers, petrol mixers, towable mixers; line pumps, boom pumps up to 24m, up to 36m, and above 36m.
- Small plant and tools: breakers, floor saws, disc cutters, pumps, pressure washers, cutting equipment, drilling equipment, and demolition tools.

### A.2 Job Site Hire

- Welfare facilities hire: mobile welfare units, static welfare units, canteen cabins, drying rooms, toilet blocks, portable toilets, mains-connected toilets, shower units, first aid rooms, site offices, meeting rooms, storage containers, secure tool stores, and changing facilities.
- Barriers, fencing, and site security: standard temporary fencing panels, anti-climb fencing, pedestrian barriers, crowd control barriers, water-filled barriers, Chapter 8 barriers, hoarding panels, acoustic barriers, edge protection, gate panels, vehicle access gates, pedestrian access gates, site signage, and traffic cones.
- Temporary site access and safety: temporary walkways, ground protection mats, trench covers, road plates, temporary ramps, safety signage, cones, anti-slip mats, and pedestrian segregation equipment.
- Site storage and accommodation: secure storage containers, tool vaults, material storage units, temporary offices, meeting cabins, drying rooms, changing facilities, and canteen units.

### A.3 Construction Materials

- Sands: building sand, sharp sand, plastering sand, washed grit sand, fill sand; available as bulk bag, tonne bag, or loose load where applicable.
- Aggregates and sub-base: 10mm ballast, 20mm ballast, 10mm pea gravel, 20mm gravel, 40mm gravel, MOT Type 1 limestone, MOT Type 1 granite, recycled Type 1, Type 3 open graded sub-base, 6F2 recycled limestone, 6F2 crushed concrete, Type 1 crushed concrete.
- Concrete and screed: ready-mix concrete grades C10, C15, C20, C25, C30, C35, C40; fibre-reinforced screed, fast-drying screed, liquid screed.
- Cement and mortar: ordinary Portland cement, rapid-setting cement, sulphate-resistant cement, M4 mortar, M6 mortar, lime mortar, coloured mortar.
- Bricks and blocks: facing bricks, engineering bricks Class A, engineering bricks Class B, common bricks, 100mm dense concrete blocks, 140mm dense concrete blocks, lightweight blocks, aerated blocks.
- Steel and reinforcement: A142 mesh, A193 mesh, A252 mesh, A393 mesh, H10 rebar, H12 rebar, H16 rebar, H20 rebar, universal beams, universal columns, parallel flange channels, steel angles, steel plates.
- Timber and sheet materials: C16 treated timber, C24 treated timber, CLS timber, scaffold boards, OSB board, MDF board, chipboard flooring, marine plywood, shuttering plywood.
- Roofing and insulation: roof tiles, slates, breathable membrane, battens, lead flashing, flat roofing felt, PIR insulation board, mineral wool, acoustic insulation, cavity wall insulation, loft insulation.
- Internal board and finishes: standard plasterboard, moisture-resistant plasterboard, fire-resistant plasterboard, acoustic plasterboard, insulated plasterboard.
- Drainage and external works: 110mm soil pipe, 160mm sewer pipe, twinwall drainage pipe, inspection chambers, gullies, channel drains, block paving, concrete slabs, porcelain paving, edging kerbs, road kerbs, tactile paving.

### A.4 Waste Streams

- General construction waste: mixed construction and demolition waste, general builders' waste, mixed inert waste.
- Soil and muck away: clean soil waste, contaminated soil waste, inert muck away, mixed muck away, soil removal, 8-wheel grab lorry, 8-wheel tipper, articulated tipper.
- Hardcore and inert waste: inert hardcore waste, concrete waste, brick and block waste, tarmac and asphalt waste.
- Material-specific waste: plasterboard-only waste, clean timber, treated timber, ferrous metal, non-ferrous metal, mixed scrap metal, pallet waste.
- Packaging and light waste: plastic packaging waste, cardboard and paper packaging waste, green waste.
- Hazardous and controlled waste: paints, solvents, adhesives, oils, chemical containers, asbestos cement sheets, asbestos insulation board, asbestos-contaminated materials, electrical waste including cables, fittings, small appliances, and site electrical equipment.
- Skip and container services: 4-yard skips, 6-yard skips, 8-yard skips, 12-yard skips, 16-yard skips, 20-yard roll-on roll-off containers, 40-yard roll-on roll-off containers.
- Waste management services: waste transfer station services, construction waste recycling services, hazardous waste collection, hazardous waste disposal.

### A.5 Construction Services and Trades

- Groundworks: foundations, drainage trenches, reduced level dig, service trenches, oversite preparation, and external works.
- Building trades: bricklaying, blockwork, roofing, scaffolding, joinery, carpentry, plastering, drylining, decorating, tiling, flooring, and glazing.
- Mechanical and electrical: plumbing, heating, ventilation, electrical installation, temporary power, testing, commissioning, and maintenance.
- External and civil works: landscaping, fencing, surfacing, kerbing, paving, drainage installation, road works, and car park works.
- Demolition and enabling works: soft strip, demolition, site clearance, asbestos removal, temporary works, and site cleaning.

### A.6 Delivery, Transport, and Logistics

- Delivery timing: same-day delivery, next-day delivery, timed delivery slots, weekend delivery, and out-of-hours delivery.
- Offload requirements: crane offload, HIAB delivery, forklift offload, tail-lift delivery, manual offload, and customer offload.
- Vehicle access: small van, 7.5 tonne vehicle, 18 tonne rigid vehicle, 26 tonne vehicle, articulated lorry, restricted access delivery, and narrow access delivery.
- Transport services: haulage, abnormal load transport, low-loader transport, plant movement, collection from site, return transport, and multi-drop site deliveries.

### A.7 Specialist Subcontractor Services

- Surveys and investigation: structural surveys, condition surveys, site investigation, trial holes, ground investigation, drain surveys, CCTV drainage surveys, and utility tracing.
- Technical and safety services: temporary works design, lifting plans, traffic management design, fire stopping, passive fire protection, waterproofing, and resin flooring.
- Specialist site works: line marking, road marking, floor preparation, diamond drilling, core drilling, saw cutting, controlled demolition, and specialist cleaning.

### A.8 Concrete and Groundworks Extras

- Concrete services: concrete placing, concrete finishing, power floating, concrete pumping, concrete repair, and concrete sealing.
- Formwork and reinforcement: formwork installation, shuttering, reinforcement fixing, mesh installation, rebar bending, and rebar placement.
- Cutting and preparation: concrete cutting, floor sawing, wall sawing, core drilling, diamond drilling, floor scabbling, floor grinding, and surface preparation.

### A.9 Permissions, Compliance, and Regulated Services

- Licences and permits: waste carrier licence, asbestos licence, scaffold permits, road opening permits, skip permits, hoarding permits, traffic management permits, and street works permits.
- Documentation: RAMS documentation, method statements, risk assessments, lifting plans, insurance documentation, waste transfer notes, duty of care documentation, and COSHH documentation.
- Accreditations: CHAS, Constructionline, SafeContractor, SSIP accreditation, ISO 9001, ISO 14001, and ISO 45001.

### A.10 Contractor Selection Filters

- Project information: project name, project address, delivery postcode, site contact, required date, start date, hire duration, and expected completion date.
- Commercial information: quantity required, budget range, quote validity period, payment terms, VAT status, and whether partial fulfilment is acceptable.
- Access and site conditions: site access restrictions, height restrictions, weight restrictions, parking restrictions, delivery time windows, manual handling restrictions, and unloading requirements.
- Tender controls: urgency level, preferred response deadline, number of quotes requested, required documentation, preferred suppliers, and excluded suppliers.

### A.11 Reinstatement and Finishing Works

- Surface reinstatement: tarmac reinstatement, asphalt patching, block paving reinstatement, concrete reinstatement, slab reinstatement, and gravel reinstatement.
- Kerbs and edging: kerb replacement, edging replacement, tactile paving replacement, dropped kerb reinstatement, and road channel repairs.
- Landscaping reinstatement: topsoil, turfing, seeding, planting, hedge repairs, soft landscaping, and garden reinstatement.
- Line marking and finishing: road line marking, car park bay marking, pedestrian markings, safety markings, anti-slip surfacing, and final site cleaning.
- Boundary and access repairs: fencing repairs, gate repairs, bollards, posts, barriers, and access track reinstatement.

## Appendix B: Future Revenue Development Options

The current revenue forecast is based only on the fixed Provider tender package unlock fee and the fixed Contractor Accepted Quote Release Fee. The options below should be treated as future revenue development opportunities. They should not be included in the current forecast until Trade Tender has sufficient usage data, Provider coverage, Contractor demand, and evidence of repeat platform activity.

| Future Revenue Option | How It Could Work | When to Consider It |
|---|---|---|
| Provider membership with inclusive quote opportunities | Providers pay a monthly fee that includes a defined number of tender unlocks or quote opportunities. Pay-per-unlock remains available for non-members or for usage above the included allowance. | Once repeat Provider usage, regular tender volume, and willingness to pay have been proven. |
| Featured Provider placement | Providers pay for enhanced visibility in relevant categories, locations, or search results, without changing the underlying quote comparison rules. | Once there is enough Provider competition in key categories to make visibility valuable. |
| Marketing and advertising space | Relevant suppliers, manufacturers, finance providers, insurers, training providers, or construction service businesses pay for clearly labelled advertising space on dashboards, email footers, category pages, or account areas. | Once the platform has consistent traffic and advertising can be introduced without making tender results appear biased. |
| Sponsored categories or regions | A supplier or partner pays for sponsorship of a category or geographical area, such as plant hire, aggregates, skips, welfare hire, or concrete, with sponsorship clearly separated from quote ranking and selection. | Once category traffic is measurable and sponsorship can be managed transparently. |
| Premium supplier profiles | Providers pay for enhanced profile pages that show service coverage, company description, response performance, accreditations, branch coverage, and preferred service categories. | Once Providers see value in presenting themselves more professionally to Contractors after contact release. |
| Verified Provider status | Providers pay for an optional verification package covering basic business checks, insurance confirmation, accreditation records, or approved supplier status shown within the platform. | Once Contractor trust and quote quality become important differentiators. |
| Priority tender alerts | Providers pay for faster or enhanced notification options, such as priority email alerts, SMS alerts, or category-specific opportunity alerts. | Once high-value or time-sensitive tenders are being submitted regularly. |
| Analytics and reporting packages | Providers pay for insight into tender demand, category activity, regional opportunity trends, response performance, and conversion from unlock to quote. | Once enough platform activity exists to create meaningful commercial insights. |
| Enterprise and multi-branch Provider accounts | Larger suppliers pay for multiple users, branch-level coverage, territory management, central reporting, and account-level controls. | Once the platform attracts larger suppliers or multi-location businesses. |
| API or integration fees | Larger Providers pay for integrations that allow tender opportunities, quote submissions, or status updates to connect with CRM, quoting, or internal workflow systems. | Once larger suppliers require operational integration rather than manual platform use. |
| Trusted Partner status | A supplier becomes eligible to apply for Trusted Partner status after completing a defined number of valid quote submissions, such as 25, 50, or 100 submitted quotes. The application could be subject to platform review, quote quality checks, response performance, complaint history, and any additional business verification required by Trade Tender. | Once the platform has enough supplier activity to measure quote reliability, response quality, and Contractor outcomes. This should be introduced only if the status can be awarded transparently and kept separate from quote ranking unless clearly disclosed. |
| Future tiered Contractor release fees | The current £10 fixed Contractor fee remains the active model, but the platform retains inactive functionality to introduce tiered release fees later based on accepted quote value or platform usage rules. | Only after the business has evidence that higher Contractor fees will not reduce quote acceptance or drive users away from the platform. |

## Appendix C: Competitor Landscape and Positioning

Trade Tender sits within an established market that includes construction procurement platforms, tender opportunity databases, supplier and provider marketplaces, plant and materials sourcing platforms, professional service sourcing tools, and contractor lead-generation services. The presence of similar platforms supports the market need, but it also means Trade Tender must be positioned clearly and professionally rather than presented as entirely unique.

| Platform Type / Example | Similarity to Trade Tender | Difference from Trade Tender |
|---|---|---|
| Constructionline / Once For All Marketplace | Provides construction opportunities, supplier sourcing, and access to buyer and project information. | More established and broader in compliance, supplier qualification, tender sources, and marketplace intelligence. Trade Tender is positioned as a simpler quote-request and contact-release platform. |
| Autodesk BuildingConnected | Supports construction tendering, bid invitations, subcontractor networks, and bid comparison workflows. | More enterprise-focused and designed for managed tendering and bid administration. Trade Tender is intended to be lighter, lower-cost, and easier for smaller or mid-sized users. |
| EstimateOne / E1 | Provides tender bid management, trade package management, and tender workflow tools for commercial construction. | More focused on commercial tender management and document-heavy bid workflows. Trade Tender should remain focused on fast quote sourcing and formal quote upload rather than full tender document control. |
| The Build Chain | Connects construction buyers with suppliers and supports procurement visibility, quote comparison, and supplier communication. | Appears more focused on procurement and supply-chain purchasing. Trade Tender's differentiation is the two-stage anonymous unlock and contact-release model with low fixed fees. |
| YardLink | Operates in construction supply-chain sourcing, hire, buy, and supplier network access. | More focused on hire and procurement fulfilment through an existing supplier network. Trade Tender is positioned as a broader tender and quote marketplace across plant, materials, waste, trades, and site services. |
| PlantOnSite and plant/job marketplace models | Customers can post requirements and receive quotes from construction-related suppliers or plant hire businesses. | Closest to parts of the Trade Tender concept. Trade Tender should differentiate through broader category coverage, UK-wide positioning, formal quote records, fixed fees, and controlled anonymous contact-release. |
| General lead-generation marketplaces | Suppliers pay for access to potential customers or qualified opportunities. | Often less construction-specific and may charge higher lead fees or operate on shared lead models. Trade Tender should compete on relevance, transparency, and simple fixed pricing. |

The competitive position for Trade Tender should therefore be based on clarity and execution. The platform should not try to compete immediately with full enterprise procurement suites or broad tender-intelligence databases. Its strongest position is as a practical UK-wide job-package quote marketplace for construction users who want a faster way to request, receive, compare, and accept formal quotes from relevant Providers while keeping contact details and sensitive job information controlled until the appropriate payment stage.

## Baseline Change Notes (added 2026-09-03, resolved 2026-09-03, not part of the source document)

This document records the resolved baseline decisions that govern implementation:

1. **Role terminology alignment — RESOLVED and complete.** Contractor and Provider are the platform role names. This was a pure rename with no new roles or permission-model change; persisted role enum values and user-facing terminology now use the approved terms.
2. **Job-package tender splitting — RESOLVED, approved as specified.** The Super User has confirmed this is the intended direction: a job is split into multiple independently-matched tender packages by category, each with its own matching, unlock, and quote lifecycle. This requires a genuine data-model and matching-engine change (a `Tender`/job with one-to-many `TenderPackage` records), not a rename, and should be scoped as its own phase of work.
3. **Fee inconsistency — RESOLVED, no fee changes.** Fees are out of scope for this baseline. The platform keeps its current £10 Provider unlock fee and £10 Contractor Accepted Quote Release Fee (with existing VAT and Super-User fee-setting controls) unchanged. The £5/percentage-based figures in this document do not apply.
4. **Identifier scheme — RESOLVED, keep current format.** The platform keeps its existing tender/quote identifier format (`TND-YYYYMMDD-000001` style). The `JOB-YYYYMMDD-000001` scheme described in this document is not adopted.
5. **Active partner advertising — RESOLVED, approved.** The Super User has approved moving from static footer logos to an actively managed partner/advertising system (names, destination links, status, campaign source), since partners already own real businesses and this is "a good progression." This should be built as a genuine Super-User-managed feature, closing the gap already flagged in [docs/PRODUCTION-READINESS-REVIEW.md](PRODUCTION-READINESS-REVIEW.md).
6. **Provider confirmation step — RESOLVED, no change.** The Super User has confirmed the quote lifecycle stays as-is: a single Contractor action (`SUBMITTED → ACCEPTED/REJECTED`). No separate Provider confirmation/acceptance step is added.
7. **Provider approval gate — RESOLVED, keep self-serve.** Provider accounts remain self-serve and active immediately after email verification, as today. No pre-activation approval queue will be built.
8. **Brand palette — RESOLVED, keep current brand.** The platform keeps its current approved brand palette and identity ([docs/branding/Trade_Tender_Brand_Guide.pdf](branding/Trade_Tender_Brand_Guide.pdf), [docs/branding/TradeTender-Brand-Rules.md](branding/TradeTender-Brand-Rules.md)). Section 11's proposed Construction Navy/Safety Orange palette is not adopted.
9. **Hosting reference — RESOLVED, legacy reference only.** The Azure hosting mention in Section 7.5.3 is a leftover from an earlier version of the plan; the platform stays on Render with Neon Lakebase Postgres. No infrastructure migration is planned.
10. **Subscription tier pricing — RESOLVED, confirmed for future activation.** The Free/Starter £29/Growth £49/Pro £99/Enterprise £149–199 tiers in Section 5.2 are the confirmed pricing model for when Provider subscriptions are eventually activated, superseding any previously modelled tiers. This does not affect immediate development — the feature stays built-but-inactive under existing Super User controls until activated — but no further pricing debate is expected when that day comes.
