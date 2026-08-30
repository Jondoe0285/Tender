# Trade Tender Brand Rules

**Source authority:** [Trade Tender Brand Guide PDF](Trade_Tender_Brand_Guide.pdf)
**Date:** August 2026
**Approved artwork:** `Trade_Tender_*_Logo.png` files in this directory. The application copies the approved serving variants to `public/images/brand/`.

## Brand Positioning

Trade Tender connects construction buyers and retailers through a clear tender and quotation process.

Construction buying is often opaque, slow, and relationship-driven. Trade Tender exists to make the process transparent, fast, and fair.

The platform is:

- Trust.
- Simplicity.
- Collaboration.
- Efficiency.
- Professionalism.

## Core Brand Personality

### Grounded

Use plain, practical language.

### Precise

Lead with numbers, specifications, and facts.

### Impartial

Remain neutral between Clients and Retailers.

### Assured

Be confident but never arrogant.

## Tone of Voice

Always be clear, professional, practical, construction-focused, and concise.

Use:

- Fixed price
- Trade pricing
- Lead time
- Specification
- Tender
- Schedule

Avoid:

- Revolutionary
- Game changing
- Disruptive
- Synergy
- Amazing savings

Never use excessive marketing language or imply that Trade Tender sells materials directly.

## Primary Messaging

| Message | Approved wording |
| --- | --- |
| Primary tagline | **Connect. Compare. Construct.** |
| Short descriptor | **The tender platform for construction supply.** |
| Client message | Clear requirements. Comparable formal quotes. |
| Retailer message | Qualified construction demand, clearly specified. |

## Visual Direction

- Use a clean, corporate, construction-sector appearance.
- Design mobile-first and maintain the same visual logic across narrow and wide layouts.
- Use the approved colours, typography, controls, status states, and component patterns consistently.
- Lead with practical information hierarchy rather than decoration.
- Use reusable components to prevent inconsistent layouts between Super User, Client, and Retailer portals.
- Keep dashboards, forms, navigation, tables, quote panels, dialogs, and notifications easy to scan.
- Never let branding obscure payment state, data-visibility state, warnings, validation, or required actions.

## Colour Palette

| Colour | Hex | Approved use |
| --- | --- | --- |
| Navy | `#0D1B2A` | Primary brand and structural elements |
| Trade Blue | `#1D6FB8` | Primary actions and emphasis |
| Sky Blue | `#6EB1E4` | Supporting accent and hover states |
| Steel Grey | `#6B7280` | Muted text and neutral UI |
| Light Grey | `#F2F4F7` | Primary background |

### 4.1 Colour Rules

- Use Navy for structure and high-contrast surfaces, Trade Blue for primary actions, and Light Grey for application backgrounds.
- Use Sky Blue for supporting emphasis and interaction states, never as a substitute for readable body text.
- Use Steel Grey for secondary copy and neutral UI.
- Use functional colours consistently for status messaging.
- Maintain sufficient contrast for text, controls, focus states, disabled states, and status indicators.
- Do not use colour alone to communicate a status or required action.

## Typography

### Headlines

- Font: Montserrat.
- Allowed weights: Bold and SemiBold.

### Body

- Font: Source Sans 3.
- Allowed weights: Regular, Medium, and SemiBold.

### Fallback

- Arial.

## UI Standards

### Product Goals

- Corporate
- Professional
- Construction-focused
- Fast
- Mobile-first

### Interface Application

- **Dashboard sidebar:** Navy.
- **Primary buttons:** Trade Blue.
- **Secondary buttons:** Sky Blue or outlined Navy.
- **Background:** Light Grey.
- **Primary text:** Navy.
- **Muted text:** Steel Grey.

All visual states must remain understandable when viewed without colour and must not expose protected information prematurely.

### Component and Layout Rules

- Build reusable TypeScript components for repeated controls and patterns.
- Keep navigation consistent across role portals while making role-specific actions clear.
- Keep form labels, help text, validation messages, and action buttons aligned and predictable.
- Maintain stable dimensions for buttons, tables, status badges, form controls, and loading states so content does not shift unexpectedly.
- Use clear status badges for tender, quote, payment, account, and contact-release state.
- Provide loading, empty, validation-error, server-error, success, and permission-denied states.
- Avoid nested cards and unnecessary decorative containers.
- Do not create inconsistent layouts between comparable screens.
- Keep content readable on mobile without horizontal scrolling for ordinary workflows.
- Preserve visible focus, keyboard access, semantic structure, and meaningful labels.

## Logo Rules

Never recolour, stretch, rotate, add shadows to, change spacing around, or recreate the logo.

Use `Trade_Tender_Horizontal_Logo.png` on light navigation and header surfaces. Use `Trade_Tender_Dark_Background_Logo.png` on Navy surfaces. Use the stacked, primary, icon, blue-background, or monochrome variants only where their approved context fits. Always use approved artwork and respect clear space.

## Icon Rules

- Use line icons with square caps.
- Keep icons minimal and professional.
- Use one Safety Amber accent only.

## Image Rules

Always show real construction projects, materials, trades, sites, PPE-compliant workers, and natural light. Prefer grey, navy, construction-material, and Safety Amber or high-visibility elements.

Never show handshake stock photography, generic offices, heavy filters, or incorrect PPE.

## Trade Tender UX Principles

Every workflow should support and reinforce these steps:

1. Connect
2. Compare
3. Construct

## Trust and Privacy Presentation

The UI must clearly communicate staged access without revealing restricted data:

- Before Retailer unlock, show only approved non-sensitive tender summary information.
- Do not show Client contact details, precise site information, full specifications, attachments, or direct communication details before unlock.
- Keep Client and Retailer identities anonymous until the Client Accepted Quote Release Fee is confirmed or an approved waiver applies.
- Explain what a payment unlocks before the payment action.
- Show payment confirmation only after trusted server-side confirmation.
- Never use a client-side visual state to imply authorization or payment when the server has not confirmed it.

## 8. Tone of Voice

Use wording that is clear, direct, helpful, practical, and free of unnecessary jargon. Prefer action labels such as:

- Create tender
- Unlock full details
- Submit quote
- Accept quote
- Payment complete
- Action required

Explain fees, visibility, responsibilities, and next actions near the relevant workflow step. Do not describe Trade Tender as the supplier, contractor, broker, guarantor, or responsible party for the final Client-Retailer transaction.

## 9. Partner Branding and Advertising

Partner branding and advertising links for Sinclair Safety Solutions Ltd and Smart Works Civils Ltd must be clearly labelled as advertising, sponsorship, or partner information.

Partner visibility must remain separate from:

- Tender matching.
- Quote ranking.
- Supplier selection.
- Client decision-making.

The Super User may manage partner names, display locations, destination links, active state, and labels. Partner placement must not imply that payment or sponsorship affects tender results.

## 10. Brand Acceptance Checklist

A branded interface is acceptable only when:

- It follows the approved palette and construction-sector visual direction.
- Comparable screens use consistent layouts and reusable components.
- The layout works on mobile and desktop.
- Text and controls remain accessible and readable.
- Status colours are used consistently and are not the sole source of meaning.
- Payment, workflow, permission, and privacy states are clear.
- Restricted Client and Retailer details are not exposed.
- Partner advertising is clearly separated from tender and quote decisions.
- The design remains within the approved Trade Tender business plan.
