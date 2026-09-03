# Advertising Space (Adspace) Governance

## Overview

Trade Tender's advertising space feature allows third-party advertising to be displayed on the platform. This document outlines the governance, policies, and requirements for adspace.

## Feature Status

**Default Status**: Disabled (deactivated by default)

Adspace can only be activated by a Super User through the platform settings panel. When deactivated, no advertising content is displayed or processed.

## Governance Principles

1. **User Transparency**: All users are informed that advertising may be present on the platform.
2. **Compliance**: All advertising content must comply with applicable UK and international regulations.
3. **Separation from Platform Function**: Advertising is kept separate from core platform operations (tender matching, quote ranking, supplier selection, and Contractor decision-making).
4. **Audit and Recording**: All adspace activations, deactivations, and content decisions are recorded in audit logs.

## Cookie and Privacy Requirements

When adspace is active, the following requirements apply:

1. **Cookie Warnings**: Users must be informed about third-party advertising cookies before they are deployed.
2. **Cookie Consent**: Explicit consent is required for non-essential advertising cookies.
3. **Privacy Policy Updates**: The privacy policy must be updated to include details about:
   - Third-party advertising services used
   - Types of cookies deployed
   - Data sharing practices with advertisers
   - User rights and opt-out mechanisms

## User Consent Flow

1. Cookie consent banner displays when adspace is active
2. Users can:
   - Accept all cookies (including advertising cookies)
   - Accept only essential cookies (no advertising)
   - Review detailed cookie information
3. Consent is recorded and respected across sessions

## Advertising Content Standards

- All advertising must comply with the [Advertising Guidelines](./ADVERTISING_GUIDELINES.md)
- No misleading or deceptive content
- No advertising from competitors or conflicting parties during tender periods
- Regular content moderation and compliance reviews

## Audit and Logging

All of the following events are logged:

- Adspace activation/deactivation
- Cookie consent decisions by users
- Advertising content impressions and interactions
- Compliance violations or content removals
- Configuration changes by Super Users

## Deactivation

If adspace is deactivated:

1. No new advertising is displayed
2. Existing advertising content is removed
3. No new advertising cookies are deployed
4. User cookie consent for adspace is archived
5. All audit records are retained for compliance purposes

## Terms and Conditions

Users must accept the [Advertising Terms](./ADVERTISING_TERMS.md) when adspace is active. These terms are automatically displayed and require affirmative acceptance.

## Data Retention

- Advertising audit logs: retained for 5 years
- User cookie preferences for adspace: retained for 2 years after account closure
- Advertising content: retained for 30 days post-removal

## Compliance Checklist

- [ ] Privacy policy updated with adspace details
- [ ] Cookie consent mechanism tested and verified
- [ ] Advertising guidelines established and published
- [ ] Terms of service updated
- [ ] Audit logging configured
- [ ] User communication prepared
- [ ] Advertising provider contracts reviewed
