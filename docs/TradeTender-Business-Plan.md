# Trade Tender: SaaS Tendering Platform

**Working plan for building, testing, and launching Trade Tender, a construction tendering platform**

**Business proposition by:** Thomas Osborne  
**Prepared by:** James Sinclair

## 1. Executive Summary

### What Trade Tender Is

Trade Tender is a proposed SaaS tendering platform for the UK construction market. It helps Clients find quotes for plant, equipment, materials, waste services, trades, and specialist construction support through one organised online process rather than contacting suppliers manually one by one.

### How the Platform Works

A Client creates a tender using a guided online form with dropdown boxes and tick-box selections. The platform categorises the requirement and matches it with relevant Retailers based on service category and geographical coverage. Retailers receive summary opportunities by email, decide whether to unlock the full tender, and can upload a formal quote. Clients compare quotes inside their portal and choose which quote to accept.

### 90-Day Retailer Launch Credit Window

The launch plan assumes a 90-day launch credit window focused on Retailer onboarding rather than a platform-wide free period:

- Clients can register, create tenders, receive quotes, and compare responses for free.
- Retailers receive limited free unlock credits during the first 90 days.
- Credits encourage onboarding, quote activity, and national coverage building.
- The window may be extended selectively by category, region, or Retailer group where coverage or quote activity has not reached the required standard.

### Revenue Model

Year 1 revenue is based on two fixed fees:

- **£10 Retailer tender unlock fee** after launch credits are used or the credit window ends.
- **£10 Client Accepted Quote Release Fee** when a Client accepts a quote and releases contact details.

Retailer subscriptions and tiered Client fee functionality remain inactive future features controlled by the Super User. They must not be included in the current revenue forecast.

### Launch Funding Requirement

- **Pre-launch setup and assurance:** approximately £770–£2,150.
- **UK-wide marketing:** £2,500–£5,000 for a Lean launch, £5,000–£10,000 for a Standard launch, or £10,000–£20,000 for a Hard release.
- **Monthly platform running costs:** approximately £190–£316 per month, or £570–£948 across the initial 90-day window.

### Year 1 Revenue Scenarios

| Scenario | Indicative Year 1 revenue |
| --- | ---: |
| Lean UK-wide Launch | £24,000 |
| Standard UK-wide Launch | £48,000 |
| Hard UK-wide Release | £84,000 |

All scenarios assume the initial 90-day Retailer launch credit window and no Retailer subscription revenue in Year 1.

### Critical Risks

The main risks are insufficient UK-wide Retailer coverage, limited Client tender activity, weak Retailer willingness to pay after launch credits, poor quote response quality, and failure of payment or contact-release controls. Trade Tender must clearly state that it is a connection and tender-management platform, not the supplier, contractor, broker, guarantor, or party responsible for the final transaction.

### Competitive Landscape

Construction tendering, procurement, supplier marketplace, and lead-generation platforms already operate in the UK and wider construction market. This validates the market need but requires Trade Tender to compete through simplicity, low-friction pricing, UK-wide category coverage, quote response quality, and a controlled contact-release process.

### Overall Summary

The first 90 days should be treated as a funded market-entry period focused on building UK-wide Retailer coverage, generating Client tender activity, testing quote response quality, and validating the post-launch fee model. Credits may be extended selectively where specific categories or regions need additional Retailer onboarding.

## 2. Business Description

Trade Tender has three primary sections:

- **Super User:** manages the system, users, rules, settings, analytics, and support.
- **Retailer:** manages capabilities and geographical coverage, receives matched opportunities, unlocks tender details, and submits quotes.
- **Client:** creates tender requests, receives and compares quotes, and accepts a quote.

## 3. Problem and Opportunity

Construction users often struggle to organise materials, labour, specialist services, and equipment at the right time. This causes delays, cost uncertainty, wasted time, and pressure on Clients who need reliable suppliers quickly.

Trade Tender addresses this by allowing Clients to ask many relevant businesses for services, materials, or equipment through one structured digital process and compare formal quotes in one place.

## 4. Product Overview

The platform lets Clients define services, materials, equipment, or support requirements and distribute the request to a network of suitable businesses. Retailers respond with availability, pricing, supporting information, and formal quotes. Clients compare responses and make faster, better-informed procurement decisions.

### 4.1 Client Project Creation Workflow

The Client completes a guided form using dropdown boxes and tick boxes. The form captures services, materials, equipment, timescales, locations, quantities, and project details. Each project element is categorised and tendered to Retailers that match the category and location.

### 4.2 High-Level Tender Categories

Initial categories include plant hire equipment, job site hire, construction materials, waste streams, construction services and trades, delivery and logistics, specialist subcontractor services, concrete and groundworks extras, regulated services, client selection filters, and reinstatement or finishing works.

### 4.3 Retailer Account and Capability Management

Retailers manage services offered, contact email address, geographical locations served, and categories in their online account. Matching uses category, capability, and location.

### 4.4 Automated Retailer Notification

When a Client submits a project, matched Retailers receive an email containing a summary tender opportunity. They decide whether to provide a quote and whether the opportunity is worth unlocking.

### 4.5 Super User Maintenance and Support

The Super User manages system settings, user access, category and pricing controls, support, platform activity, analytics, retailer and Client access, and operational performance.

### 4.6 Super User Analytics and Reporting

The analytics dashboard should show:

- Tenders submitted, including by Client.
- Tenders accepted or unlocked by Retailers.
- Quotes submitted by Retailers.
- Quotes accepted by Clients.
- Retailer confirmations where a confirmation step is used.

Reports should be filterable by Client, Retailer, tender identifier, quote identifier, category, geographical area, status, date range, value band, subscription plan, and payment status. The Super User should be able to export reports and review conversion from tender submission through unlock, quote submission, Client acceptance, and Retailer confirmation.

### 4.7 Restricted Project Details and Fee Release

Sensitive project and contact information remains restricted until the correct payment stage.

Before a Retailer pays to unlock a tender, the platform may show only enough summary information to assess relevance, such as broad category, location area, headline requirement, indicative timescale, and non-sensitive notes. Client contact details, precise site information, the full specification, attachments, and direct communication details remain hidden.

After the £10 Retailer unlock fee is confirmed, the platform releases the full tender details needed to prepare a formal quote, including the job specification, relevant attachments, precise delivery or site requirements, response deadline, and project conditions. The unlock event records the tender identifier, Retailer account, payment status, date, time, and any Super User override.

Client and Retailer identities remain anonymous from one another until the Client accepts a quote and the £10 Client Accepted Quote Release Fee is confirmed. The platform then releases the relevant contact details to both parties so they can complete the final transaction directly. Every release event records what was released, when, who triggered it, and which payment event authorised it.

### 4.8 Client Quote Portal and Acceptance Workflow

Clients receive submitted quotes in their personal portal, compare responses, and accept the quote that best suits their requirements. Tender creation and quote comparison are free. Quote acceptance triggers the £10 release fee unless a launch promotion or Super User-controlled waiver is active.

### 4.9 Quote Records, Identifiers, and Monitoring

Every tender and formal quote receives a unique, searchable identifier. A proposed format is:

- Tender: `TND-YYYYMMDD-000001`
- Quotes: `TND-YYYYMMDD-000001-Q01`, `TND-YYYYMMDD-000001-Q02`

The platform should trace creation, notifications, unlocks, quote returns, acceptance, fees, and contact release. Monitoring should identify repeated parties, unusual payment behaviour, repeated cancellations, duplicate or near-duplicate tenders, and other potential misuse.

### 4.10 Platform Capacity and Data Retention

The early production platform should be performance-tested for up to 1,000 concurrent users across the infrastructure, database, payments, email notifications, quote submission, and dashboards.

Formal quotes are stored for 30 days from submission. Unsuccessful, expired, or non-accepted quotes are then deleted or anonymised unless a dispute, investigation, suspicious-activity review, legal hold, or other valid reason requires retention. Successful or accepted quotes, related tender identifiers, payment records, contact-release events, and audit logs are retained for five years for operational audit, dispute support, fraud prevention, tax, regulatory, and governance purposes.

### 4.11 Platform Role and Transaction Responsibility

Trade Tender is a connection and tender-management tool. After contact details are released, the final transaction, delivery, fulfilment, service quality, payment arrangements, and disputes are handled directly between Client and Retailer.

Trade Tender is not the contractor, supplier, agent, broker, or guarantor for the end transaction and does not accept responsibility for goods, services, works, pricing, performance, or outcomes agreed between the parties.

### 4.12 Primary Platform Sections

- **Super User:** platform administration, rules, access control, activity monitoring, analytics, maintenance, and support.
- **Retailer:** business account, services, categories, coverage areas, matched opportunities, and quote responses.
- **Client:** project and tender creation, quote receipt, comparison, and acceptance.

## 5. Business Model and Pricing

Retailers register for free and receive matched tender summaries at no cost. During the initial 90 days, limited free unlock credits encourage onboarding. After credits are used or the window ends, a Retailer pays £10 to view the full tender specification and details needed to prepare a quote.

Clients create projects, issue tenders, receive quotes, and compare responses for free. Client and Retailer details remain anonymous until a Client accepts a quote and pays the £10 Accepted Quote Release Fee. Subscription and tiered Client fee functionality may be built but remains inactive and excluded from current forecasts.

### 5.1 Client Accepted Quote Release Fee

| Fee element | Current position | Purpose |
| --- | --- | --- |
| Client Accepted Quote Release Fee | £10 fixed fee per accepted quote after the free launch period | Simple, predictable pricing while demand and accepted-quote behaviour are validated |
| Future tiered Client release-fee functionality | Built but inactive | May be activated by the Super User if usage, quote values, and conversion data support it |

### 5.2 VAT on Trade Tender Fees

All Trade Tender fees, membership prices, and sponsored placement prices are set and displayed exclusive of VAT. VAT is added at the prevailing platform rate when the payment is taken through Stripe, and the net fee, VAT percentage, VAT amount, and total charged are recorded against each payment.

The Super User controls the VAT percentage. A rate change applies only to new payments; VAT already recorded against an existing payment is unchanged so historic records stay reconcilable. The Super User dashboard reports VAT collected on confirmed payments for the current UK financial quarter (April to March).

Retailer quote prices remain a matter between Client and Retailer. Trade Tender displays those prices exclusive of VAT and does not collect or account for VAT on the final Client-Retailer transaction.

### 5.3 Future Retailer Subscription Functionality

| Plan | Monthly price | Included tender unlocks | Intended user |
| --- | ---: | --- | --- |
| Free | £0 | 0 | Matched summaries and pay-per-unlock usage |
| Starter | £29 | 1–10 | Small or occasional suppliers |
| Growth | £49 | 11–20 | Active suppliers |
| Pro | £99 | 21+ / fair use | Regional or higher-volume Retailers |
| Enterprise | £149–£199 | 21+ / fair use | Larger or multi-branch businesses |

Subscriptions remain inactive until repeat Retailer usage, sufficient tender volume, and demand for monthly plans are evidenced. The Super User controls prices, bands, promotional credits, fair-use rules, and activation.

## 6. Operations and Delivery

Trade Tender operates as a digital marketplace and tender-management platform. Day-to-day operations include hosting, onboarding, support, category maintenance, payment access controls, email notifications, product updates, data management, and user support.

Disputes over quotes, purchases, delivery, services, workmanship, goods, or final payment are handled directly between Client and Retailer.

## 7. Financial Plan

The forecast uses £10 per Retailer tender unlock and £10 per accepted Client quote release. These are net fees excluding VAT; applicable VAT is charged separately at payment. The forecast excludes VAT, payment processing fees, tax, operating costs, development costs, and staff costs.

### 7.1 Forecast Assumptions

- Retailer pay-per-unlock fee: £10 per tender.
- Client Accepted Quote Release Fee: £10 per accepted quote after launch.
- Initial 90-day Retailer launch credit window, extendable selectively by category, region, or Retailer group.
- No subscription or tiered Client fee revenue in the current forecast.

### 7.2 Year 1 Revenue Forecast

| Metric | Lean UK-wide Launch | Standard UK-wide Launch | Hard UK-wide Release |
| --- | ---: | ---: | ---: |
| 90-day Retailer credit window | Yes | Yes | Yes |
| Marketing budget | £2,500–£5,000 | £5,000–£10,000 | £10,000–£20,000 |
| Registered Retailers by end of Year 1 | 300 | 600 | 1,000 |
| Pay-per-unlock revenue | £18,000 | £36,000 | £60,000 |
| Client release-fee revenue | £6,000 | £12,000 | £24,000 |
| **Total estimated Year 1 revenue** | **£24,000** | **£48,000** | **£84,000** |

### 7.3 Forecast Rationale

The Lean scenario is the cautious case, Standard assumes stronger national outreach, and Hard assumes the highest marketing intensity and broader early coverage. All scenarios require sufficient UK-wide Retailer coverage and Client tender activity after credits are used. No scenario includes subscription revenue.

### 7.4 Revenue Model Validation

| Revenue driver | Year 1 validation | Year 3 validation | Year 5 validation |
| --- | --- | --- | --- |
| Pay-per-unlock | £18,000 requires 1,800 paid unlocks, about 150 per month | £120,000 requires 12,000, about 1,000 per month | £360,000 requires 36,000, about 3,000 per month |
| Client Accepted Quote Release Fee | £6,000 requires 600 accepted quotes, about 50 per month | £60,000 requires 6,000, about 500 per month | £240,000 requires 24,000, about 2,000 per month |
| Commercial interpretation | Realistic only with national coverage and regular activity | Validate against actual tender, unlock, quote, acceptance, and repeat-use data | Treat as ambitious unless supported by strong marketplace evidence |

### 7.5 Funding Requirement

- **Pre-launch setup and assurance:** £770–£2,150 for technical review, load testing, payment/contact-release checks, and domain/email authentication.
- **UK-wide marketing:** £2,500–£5,000 Lean, £5,000–£10,000 Standard, or £10,000–£20,000 Hard.
- **Monthly running costs:** £190–£316, or £570–£948 during the initial 90-day window.

Indicative monthly costs:

| Cost area | Planning assumption | Indicative cost |
| --- | --- | ---: |
| GitHub Enterprise and GitHub Copilot | One owner/developer account | Approximately £50/month |
| Render hosting | Web service, managed PostgreSQL, object storage, monitoring, backups, and load-test readiness | Approximately £125–£250/month |
| Resend email service | 50,000 transactional emails per month | Approximately £16/month |
| **Indicative monthly total** | Excludes staff, development, marketing, insurance, legal, tax, and payment processing | **£190–£316/month** |

## 8. Risks and Mitigation

| Risk | Potential impact | Mitigation |
| --- | --- | --- |
| Low Client adoption | Too few tenders for Retailers | Keep tender creation free, make forms quick, market nationally, and monitor category conversion |
| Low Retailer uptake | Clients receive too few quotes | Free registration, clear fees, launch credits, and onboarding by category and geography |
| Poor quote response | Too few useful quotes | Match relevant Retailers, set deadlines, send reminders, and monitor quality |
| Inaccurate matching | Wasted notifications and low conversion | Structured categories, maintained capabilities, pilot testing, and Super User refinement |
| Payment friction | Users abandon fee steps | Fixed low fees, credits, clear unlock value, trusted payment provider, confirmations, and selective waivers |
| Client/Retailer disputes | Users expect Trade Tender to resolve final-transaction disputes | Clear marketplace terms and responsibility wording before release |
| Data protection/contact release | Details shown too early | Explicit visibility rules, secure access, privacy wording, and release-event audits |
| Weak document control or monitoring | Difficult investigations and misuse detection | Unique identifiers, immutable logs, dashboards, flags, and escalation procedures |
| Retailer quality concerns | Unsuitable or unverified quotes | Business details, accreditations, verification, suspension controls, and future feedback |
| Regional coverage gaps | Too few matches | Track unmatched tenders and recruit in weak categories and locations |
| Technical failure or downtime | Users cannot tender, pay, or quote | Reliable hosting, backups, monitoring, secure payments, and staged testing |
| Email deliverability | Retailers miss opportunities | Authenticated sending domain, reputable provider, bounce monitoring, and in-platform alerts |
| Pricing resistance | Users reject access or release fees | Low fixed launch fees, targeted credits, monitoring, and evidence-based future pricing |
| Competitor pressure | Established platforms reduce differentiation | Focus on simple construction-specific quote sourcing, fixed fees, and controlled release |

## 9. Targeted Marketing and User Acquisition

Trade Tender is positioned for a UK-wide launch using direct outreach, trade-directory list building, LinkedIn, Google Search, referral introductions, and launch incentives.

### 9.1 Target Client Segments

Prioritise small and medium construction businesses, groundworks contractors, refurbishment contractors, site managers, property maintenance businesses, facilities managers, developers, landlords with repeat works, and local builders.

Messaging should focus on speed, simplicity, choice, and control: create one tender, reach relevant UK suppliers, compare quotes, keep details controlled until acceptance, and reduce calling time. High-frequency use cases include plant hire, muck away, aggregates, skips, welfare hire, concrete, haulage, and common trades.

### 9.2 Target Retailer Segments

Prioritise plant hire, skip and waste, aggregates and materials, concrete, welfare and cabin hire, scaffolding, groundworks, haulage and HIAB transport, drainage, and specialist subcontractors.

Messaging should focus on free registration, matched summaries, no percentage commission, a low fixed unlock fee, anonymous Client details until the correct stage, and the ability to choose whether to unlock.

### 9.3 Recommended Channels

| Channel | Target | Indicative cost |
| --- | --- | ---: |
| Manual direct outreach | Retailers first, then Clients | £0–£300 |
| LinkedIn outreach and paid test | Contractors, site managers, owners, and decision-makers | £250–£1,000 |
| Google Search Ads pilot | Clients with immediate quote intent | £300–£1,000 |
| Trade-directory list building | Retailers | £100–£500 |
| Direct mail or printed introduction | Selected Retailers and local buyers | £250–£1,250 |
| Launch incentives | Retailers and Clients | £0 cash cost where fees are waived |

### 9.4 90-Day Launch Sequence

1. **Days 1–30:** Build UK-wide Retailer supply, prioritise high-frequency categories, contact Retailers, offer credits, and track category and regional coverage.
2. **Days 31–60:** Test Client demand nationally through search, LinkedIn, direct email, trade groups, and referrals.
3. **Days 61–90:** Scale the best channel using coverage, unlock rate, quote rate, accepted quote rate, acquisition cost, and response quality.

### 9.5 Launch Budget Options

| Launch type | Budget | Use case |
| --- | ---: | --- |
| Lean UK-wide Launch | £2,500–£5,000 | Founder-led outreach and tightly controlled testing |
| Standard UK-wide Launch | £5,000–£10,000 | Recommended baseline for professional national entry |
| Hard UK-wide Release | £10,000–£20,000 | Faster national visibility and broader coverage |

The Standard launch is the recommended starting point. The Hard campaign can be used when faster visibility and coverage are required. Spend should be reviewed against registered and verified Retailers, tenders, unlocks, quotes, accepted quotes, response rates, and acquisition cost.

## 10. Build and Launch Plan

### Phase One: Requirements and Platform Structure

- Finalise Super User, Retailer, and Client roles.
- Define Client form fields: category, subcategory, location, quantity, delivery date, hire duration, urgency, and notes.
- Define Retailer fields: categories, subcategories, email, trading area, coverage radius, accreditations, and contact preferences.
- Confirm pre-payment and post-payment visibility rules.
- Define Super User controls for fees, categories, users, email templates, settings, and fee disablement.
- Define analytics for tenders, unlocks, quotes, acceptances, identifiers, locations, status, payments, and future subscriptions.

### Phase Two: Minimum Viable Product Build

- Secure registration and login for all roles.
- Client structured project creation form.
- Retailer capability and coverage profile.
- Category and geographic matching engine.
- Automated summary email notifications.
- Retailer unlock process using launch credits or the £10 fee.
- In-platform quote submission.
- Client quote review, comparison, and acceptance portal.
- £10 Client Accepted Quote Release Fee and contact-release process.

### Partner Branding and Advertising Links

Include basic partner branding and clearly labelled links for Sinclair Safety Solutions Ltd and Smart Works Civils Ltd. Partner visibility must remain separate from tender matching, quote ranking, supplier selection, and Client decision-making. The Super User manages partner names, locations, destination links, active status, and display positions.

### Website Footer and Public Policy Documents

The main website, login, registration, Client portal, Retailer portal, payment screens, and contact-release screens should link to:

- Platform Terms and Conditions
- Client Terms of Use
- Retailer Terms of Use
- Marketplace Disclaimer and Platform Role Statement
- Privacy Policy
- Cookie Policy
- Quote Retention Policy
- Payment and Refund Policy
- Contact-Release Policy
- Acceptable Use Policy
- Advertising and Partner Links Policy
- Complaints and Support Policy
- Accessibility Statement

Relevant policies should also be referenced near payment, quote upload, quote acceptance, and contact-release actions.

### Phase Three: Payments, Controls, and Quote Records

- Integrate payment processing for Retailer unlocks and Client release fees.
- Define payment states, failed payments, refunds, and fee disablement.
- Enforce restricted data visibility at each workflow stage.
- Assign linked tender and quote identifiers.
- Monitor unusual parties, values, duplicate tenders, cancellations, and payment behaviour.
- Add terms acceptance, Super User suspension, category editing, Retailer approval, and support access.
- Build filterable Super User analytics.
- Prepare privacy wording and marketplace responsibility terms.

### Phase Four: Testing and Pilot Launch

- Test Client creation through Retailer notification, payment, quote submission, Client acceptance, and detail release.
- Test category matching across plant, site hire, materials, waste, trades, logistics, and compliance.
- Invite a small group of Retailers and Clients to pilot the platform.
- Collect feedback on form speed, category clarity, quote quality, payment friction, and notifications.
- Fix priority issues before wider launch.

### Phase Five: Retailer Onboarding

- Explain matching and the release-fee model.
- Recruit plant hire, site hire, materials, waste, trades, logistics, and specialist subcontractors.
- Prioritise geographical coverage.
- Prepare retailer invitation, tender alert, payment confirmation, quote reminder, and account-update emails.
- Confirm Retailers understand pre-payment and post-payment visibility.

### Phase Six: Public Launch

- Prepare a UK-wide release with category and regional coverage tracking.
- Promote to Clients needing plant, materials, waste, trades, and site support.
- Use direct outreach, construction networks, trade groups, LinkedIn, paid search, and referrals.
- Monitor tenders, matches, email engagement, fees, unlocks, quotes, acceptances, confirmations, and release events.
- Review fees against participation and revenue evidence.

### Phase Seven: Post-Launch Improvement

- Review tender, unlock, quote, and acceptance conversion.
- Improve matching using real usage data.
- Add Retailer response-time and performance insights.
- Review fees, credits, and future subscription activation.
- Improve Client, Retailer, and Super User dashboards.
- Add revenue, demand, and regional coverage reports.
- Expand regions when coverage supports demand.

## 11. Brand Guide

Trade Tender should feel practical, robust, trustworthy, construction-ready, and professional as a modern SaaS platform.

### 11.1 Brand Personality

- **Reliable:** dependable and organised.
- **Direct:** clear, simple, and easy to understand.
- **Trade-focused:** relevant to construction, plant, materials, site services, and waste.
- **Efficient:** supports speed and quick decisions.
- **Professional:** credible for business use without being overly corporate.

### 11.2 Brand Colour Palette

| Colour | Hex | Recommended use |
| --- | --- | --- |
| Construction Navy | `#1F2A33` | Navigation, headers, footer, login, structure |
| Safety Orange | `#F28C28` | Primary actions, unlocks, acceptance, payments |
| Concrete Grey | `#6B7280` | Secondary text, labels, borders, tables |
| Steel Blue | `#2F5D7C` | Secondary actions, links, highlights |
| High-Vis Yellow | `#F5C542` | Urgent markers and action-required notices |
| Off-White | `#F7F5F0` | Page and form backgrounds |
| Success Green | `#2E7D32` | Accepted quotes, completed payments, approvals |
| Warning Amber | `#D97706` | Pending payments, expiry warnings, required actions |
| Error Red | `#B91C1C` | Failed payments, expired tenders, validation errors |

### 11.3 Colour Usage

Use Construction Navy as the base, Safety Orange for forward actions, Concrete Grey and Off-White for readable forms and dashboards, High-Vis Yellow sparingly, and consistent green, amber, and red status colours.

### 11.4 Interface Application

- Dashboard sidebar: Construction Navy.
- Primary buttons: Safety Orange.
- Secondary buttons and links: Steel Blue.
- Page background: Off-White.
- Cards, forms, and quote panels: white with Concrete Grey borders.
- Urgent tenders: High-Vis Yellow.
- Accepted quotes and completed payments: Success Green.
- Expired tenders and failed payments: Error Red.

### 11.5 Tone of Voice

Use clear, direct, helpful, and practical wording. Preferred action labels include **Create tender**, **Unlock full details**, **Submit quote**, **Accept quote**, **Payment complete**, and **Action required**.

## Appendix A: Construction Industry Tender Selection Categories

These initial selectable options support fast project creation, accurate matching, and targeted tender distribution.

### A.1 Plant Hire Equipment

- Excavators: mini, tracked, and wheeled excavators from 1 to 30 tonnes.
- Dumpers: forward-tipping and tracked dumpers from 1 to 9 tonnes.
- Compaction: ride-on rollers, plate compactors, and trench rammers.
- Lifting and handling: telehandlers, forklifts, and rough-terrain forklifts.
- Access: scissor lifts, boom lifts/cherry pickers, and scaffold towers.
- Cranes: mobile, spider, tower, and HIAB cranes.
- Power and site services: generators, compressors, and lighting towers.
- Concrete equipment: mixers, line pumps, and boom pumps.
- Small plant and tools: breakers, saws, pumps, pressure washers, drills, and demolition tools.

### A.2 Job Site Hire

- Welfare: mobile and static welfare units, canteens, drying rooms, toilets, showers, first-aid rooms, offices, meeting rooms, storage, and changing facilities.
- Barriers, fencing, and security: temporary fencing, anti-climb fencing, pedestrian and water-filled barriers, hoarding, gates, signage, and cones.
- Temporary access and safety: walkways, ground protection, trench covers, road plates, ramps, anti-slip mats, and segregation equipment.
- Site storage and accommodation: containers, tool vaults, offices, meeting cabins, drying rooms, changing facilities, and canteen units.

### A.3 Construction Materials

- Sands: building, sharp, plastering, washed grit, and fill sand.
- Aggregates and sub-base: ballast, gravel, MOT Type 1, recycled Type 1, Type 3, 6F2, crushed concrete, and related grades.
- Concrete and screed: ready-mix grades C10–C40, fibre-reinforced, fast-drying, and liquid screed.
- Cement and mortar: Portland, rapid-setting, sulphate-resistant, M4, M6, lime, and coloured mortar.
- Bricks and blocks: facing, engineering, common, dense, lightweight, and aerated blocks.
- Steel and reinforcement: mesh, rebar, beams, columns, channels, angles, and plates.
- Timber and sheet materials: C16/C24 timber, CLS, scaffold boards, OSB, MDF, chipboard, and plywood.
- Roofing and insulation: tiles, slates, membranes, battens, flashing, felt, PIR, mineral wool, acoustic, cavity, and loft insulation.
- Internal boards and finishes: standard, moisture-resistant, fire-resistant, acoustic, and insulated plasterboard.
- Drainage and external works: soil and sewer pipe, chambers, gullies, channel drains, paving, slabs, kerbs, and tactile paving.

### A.4 Waste Streams

- General construction and demolition waste.
- Clean, contaminated, inert, and mixed soil or muck-away services.
- Hardcore, concrete, brick, block, tarmac, and asphalt waste.
- Plasterboard, timber, metals, pallets, plastics, cardboard, paper, and green waste.
- Hazardous and controlled waste: paints, solvents, adhesives, oils, asbestos, and electrical waste.
- Skips and roll-on roll-off containers.
- Transfer stations, recycling, hazardous collection, and disposal services.

### A.5 Construction Services and Trades

- Groundworks: foundations, drainage trenches, reduced-level dig, service trenches, oversite preparation, and external works.
- Building trades: bricklaying, blockwork, roofing, scaffolding, joinery, carpentry, plastering, drylining, decorating, tiling, flooring, and glazing.
- Mechanical and electrical: plumbing, heating, ventilation, electrical installation, temporary power, testing, commissioning, and maintenance.
- External and civil works: landscaping, fencing, surfacing, kerbing, paving, drainage, roads, and car parks.
- Demolition and enabling works: soft strip, demolition, clearance, asbestos removal, temporary works, and site cleaning.

### A.6 Delivery, Transport, and Logistics

- Same-day, next-day, timed, weekend, and out-of-hours delivery.
- Crane, HIAB, forklift, tail-lift, manual, and customer offload.
- Van, 7.5 tonne, 18 tonne, 26 tonne, articulated, restricted-access, and narrow-access delivery.
- Haulage, abnormal loads, low loaders, plant movement, collection, return transport, and multi-drop delivery.

### A.7 Specialist Subcontractor Services

- Surveys: structural, condition, site, trial holes, ground, drainage CCTV, and utility tracing.
- Technical and safety: temporary works design, lifting plans, traffic management, fire stopping, passive fire protection, waterproofing, and resin flooring.
- Specialist works: line marking, road marking, floor preparation, diamond and core drilling, saw cutting, controlled demolition, and specialist cleaning.

### A.8 Concrete and Groundworks Extras

- Concrete placing, finishing, power floating, pumping, repair, and sealing.
- Formwork, shuttering, reinforcement fixing, mesh installation, rebar bending, and placement.
- Concrete cutting, floor sawing, wall sawing, core and diamond drilling, scabbling, grinding, and surface preparation.

### A.9 Permissions, Compliance, and Regulated Services

- Licences and permits: waste carrier, asbestos, scaffold, road opening, skip, hoarding, traffic management, and street works.
- Documentation: RAMS, method statements, risk assessments, lifting plans, insurance, waste transfer notes, duty of care, and COSHH.
- Accreditations: CHAS, Constructionline, SafeContractor, SSIP, ISO 9001, ISO 14001, and ISO 45001.

### A.10 Client Selection Filters

- Project: name, address, delivery postcode, site contact, dates, hire duration, and completion date.
- Commercial: quantity, budget, quote validity, payment terms, VAT status, and partial fulfilment.
- Access: site, height, weight, parking, delivery windows, handling, and unloading restrictions.
- Tender controls: urgency, response deadline, requested quote count, required documents, preferred and excluded suppliers.

### A.11 Reinstatement and Finishing Works

- Tarmac, asphalt, paving, concrete, slabs, and gravel reinstatement.
- Kerbs, edging, tactile paving, dropped kerbs, and road channels.
- Topsoil, turf, seeding, planting, hedge repairs, and soft landscaping.
- Road lines, car park bays, pedestrian and safety markings, anti-slip surfacing, and final cleaning.
- Fencing, gates, bollards, posts, barriers, and access-track repairs.

## Appendix B: Future Revenue Development Options

These options are future opportunities and must not be included in the current forecast until usage, coverage, demand, and repeat activity support them:

- Retailer memberships with inclusive quote opportunities.
- Clearly separated featured Retailer placement.
- Clearly labelled marketing and advertising space.
- Sponsored categories or regions separated from quote ranking.
- Premium supplier profiles.
- Optional Verified Retailer status.
- Priority tender alerts.
- Retailer analytics and reporting packages.
- Enterprise and multi-branch accounts.
- API or CRM integration fees.
- Transparent Trusted Partner status based on quote quality and performance.
- Future tiered Client release fees.

## Appendix C: Competitor Landscape and Positioning

Trade Tender operates in an established market containing construction procurement platforms, tender databases, supplier marketplaces, plant and materials sourcing services, and contractor lead-generation platforms.

| Platform type or example | Similarity | Positioning difference for Trade Tender |
| --- | --- | --- |
| Constructionline / Once For All Marketplace | Construction opportunities and supplier sourcing | Simpler quote-request and contact-release process |
| Autodesk BuildingConnected | Tender invitations, bids, and comparison | Lighter, lower-cost experience for smaller and mid-sized users |
| EstimateOne / E1 | Trade-package and bid management | Focus on fast quote sourcing rather than enterprise document workflows |
| The Build Chain | Procurement and supplier visibility | Two-stage anonymous unlock and contact-release model |
| YardLink | Construction supply-chain sourcing | Broader categories across plant, materials, waste, trades, and services |
| PlantOnSite and similar marketplaces | Construction requirements and supplier quotes | Wider UK-wide coverage, formal quote records, fixed fees, and controlled release |
| General lead-generation marketplaces | Paid supplier access to potential customers | Construction focus, relevance, transparent fixed fees, and privacy controls |

Trade Tender should be positioned as a practical UK-wide quote marketplace for construction users who want to request, receive, compare, and accept formal quotes while keeping contact details controlled until the appropriate payment stage. It should not attempt to compete immediately with full enterprise procurement suites or broad tender-intelligence databases.
