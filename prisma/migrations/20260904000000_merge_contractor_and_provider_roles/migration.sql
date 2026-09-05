-- Approved product-model change: one operating User role can raise tenders and receive matched opportunities.
CREATE TYPE "Role_new" AS ENUM ('SUPER_USER', 'USER');

DELETE FROM "UserRole" provider_membership
USING "UserRole" contractor_membership
WHERE provider_membership."userId" = contractor_membership."userId"
  AND provider_membership."role" = 'PROVIDER'
  AND contractor_membership."role" = 'CONTRACTOR';

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING CASE WHEN "role"::text = 'SUPER_USER' THEN 'SUPER_USER'::"Role_new" ELSE 'USER'::"Role_new" END;

ALTER TABLE "UserRole"
  ALTER COLUMN "role" TYPE "Role_new"
  USING CASE WHEN "role"::text = 'SUPER_USER' THEN 'SUPER_USER'::"Role_new" ELSE 'USER'::"Role_new" END;

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Give legacy Provider accounts a tender-owning company record, and legacy Contractor accounts
-- an opportunity profile. Existing records are intentionally preserved unchanged.
INSERT INTO "ClientCompany" ("id", "tradeTenderId", "companyName", "primaryUserId", "createdAt", "updatedAt")
SELECT
  'migration-company-' || u."id",
  'USR-' || u."id",
  COALESCE(rp."companyName", u."contactName"),
  u."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "ClientCompany" cc ON cc."primaryUserId" = u."id"
LEFT JOIN "RetailerProfile" rp ON rp."userId" = u."id"
WHERE u."role" = 'USER' AND cc."id" IS NULL;

INSERT INTO "ClientCompanyMember" ("id", "companyId", "userId", "createdAt")
SELECT
  'migration-member-' || u."id",
  cc."id",
  u."id",
  CURRENT_TIMESTAMP
FROM "User" u
JOIN "ClientCompany" cc ON cc."primaryUserId" = u."id"
LEFT JOIN "ClientCompanyMember" ccm ON ccm."userId" = u."id"
WHERE u."role" = 'USER' AND ccm."id" IS NULL;

INSERT INTO "RetailerProfile" ("id", "userId", "companyName", "categories", "coverageAreas", "coverageScope", "counties", "regions", "createdAt", "updatedAt")
SELECT
  'migration-profile-' || u."id",
  u."id",
  cc."companyName",
  '',
  '',
  'COUNTY',
  '',
  '',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
JOIN "ClientCompany" cc ON cc."primaryUserId" = u."id"
LEFT JOIN "RetailerProfile" rp ON rp."userId" = u."id"
WHERE u."role" = 'USER' AND rp."id" IS NULL;