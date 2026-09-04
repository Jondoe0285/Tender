# Trade Tender

Trade Tender is a UK construction-tender marketplace that connects Contractors with Providers through tender creation, matching, quote comparison, unlock payments, and contact-release workflows.

## Current Build

- Version: 0.1.0
- Build number: 010d623
- Build timestamp: 2026-09-04 07:24:46 +0100
- Platform: Next.js 16, React 19, TypeScript, Prisma 6.19.3, Postgres/Neon, Stripe, Resend, Sentry

## Product Brief

The application is designed to support the full commercial workflow for Construction Tendering:

- Contractors create and manage tender opportunities
- Providers discover and compare relevant tenders
- Matching is constrained by category, geography, and approval rules
- Providers can unlock tender details and submit quotes
- Payment, audit, retention, and release controls enforce the protected workflow
- Super User administration supports partner management, compliance, and operational reporting

## Delivery Scope

This build follows the approved Trade Tender business plan and prioritises a secure, mobile-first, construction-industry workflow with explicit role separation for Super User, Contractor, and Provider.

## Key Project Documents

- [Business plan](docs/TradeTender-Business-Plan.md)
- [Architecture](docs/Architecture.md)
- [Security requirements](docs/Security-Requirements.md)
- [Implementation Change Register](docs/Implementation-Change-Register.md)
- [Action tracker](docs/Action-Tracker.md)
- [Health check and release workflow](docs/health-check/README.md)

## Release Notes

The repository is set up for branch-based delivery with staging and production safeguards, protected deployment checks, and migration-aware release validation.
