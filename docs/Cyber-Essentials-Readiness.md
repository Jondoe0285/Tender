# Cyber Essentials Readiness

**Status:** Partially aligned; not certified.

This checklist records application evidence and the remaining operational evidence needed before Trade Tender can make a Cyber Essentials claim. It is not a certificate or an independent assessment.

## Application Controls In Place

- Server-side authentication, role, ownership, payment, waiver, and contact-release authorization.
- Password hashing, expiring single-use password-reset tokens, session invalidation, and authentication rate limiting.
- Input validation with Zod, parameterized Prisma access, output encoding, CSRF/origin checks, and security headers.
- Private attachment access, upload validation and quotas, staged tender confidentiality, and audit logging.
- Versioned Prisma migrations, isolated environment variables, protected CI permissions, and Node.js version pinning.
- CI migration, lint, type-check, test, production-build, and high-severity dependency-audit gates.

## Evidence Still Required

- Complete inventory of in-scope devices, cloud services, accounts, and software.
- Render, database, DNS, CDN/WAF, email, payment, authentication, and repository administrator MFA evidence.
- Firewall and network boundary configuration, including production database access restrictions.
- Supported operating-system and third-party software patching policy with current update evidence.
- Administrator account review, least-privilege evidence, joiner/mover/leaver records, and disabled-account checks.
- Malware protection and attachment-scanning evidence for the production hosting and endpoint environments.
- Backup, restore, incident-response, vulnerability-management, and annual review records.
- Independent Cyber Essentials self-assessment review and, where required, Cyber Essentials Plus testing.

## Current Limitations

- The repository cannot prove endpoint security, firewall configuration, cloud-account MFA, or operating-system patch status.
- No Cyber Essentials certification claim should appear in product, sales, or public materials until the external assessment is complete.
- Application-level evidence must be combined with the named hosting and operational owners' evidence for the final assessment scope.
