<!-- Never include secret values (API keys, tokens, connection strings, passwords) in this description. -->

## Summary

<!-- What changed and why. -->

## Business plan and security alignment

- [ ] Consulted `docs/TradeTender-Business-Plan.md`, role requirements, security requirements, and platform workflow requirements before implementation.
- [ ] No conflict with the approved business plan, or the conflict is flagged for the Super User.

## Environment resources and security permissions

- [ ] This change does **not** affect staging or production/main environment resources, integration settings, credentials, webhooks, storage, monitoring, authentication, DNS, or deployment configuration.
- [ ] This change **does** affect one or more of the above. The following is recorded in `docs/Implementation-Change-Register.md` (never secret values):
  - [ ] Explicit Founder/product-owner/release-owner approval
  - [ ] Affected environment and resource names
  - [ ] Backup, restore, rollback, or recovery evidence
  - [ ] Migration or change plan
  - [ ] Post-change validation evidence
  - [ ] Named release or rollback owner

## Database and migrations

- [ ] Schema changes include a reviewed migration.
- [ ] No live staging or production/main data or settings were changed as part of this PR.

## Validation

- [ ] `npm run type-check`
- [ ] `npm run build` (routing or production behavior changes)
- [ ] Tests added or updated for new/changed behavior
- [ ] `docs/Implementation-Change-Register.md` updated for every applicable implementation, migration, configuration, workflow, or environment requirement
