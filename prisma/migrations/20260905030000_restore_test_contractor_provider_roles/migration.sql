-- TEST ENVIRONMENT ONLY: approved recovery from the unified USER enum.
-- Users with configured matching services are restored as Providers; other users are Contractors.
CREATE TABLE "RoleRecoveryBackup" (
  "id" TEXT NOT NULL,
  "sourceTable" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "previousRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleRecoveryBackup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleRecoveryBackup_sourceTable_sourceId_key" ON "RoleRecoveryBackup"("sourceTable", "sourceId");

INSERT INTO "RoleRecoveryBackup" ("id", "sourceTable", "sourceId", "userId", "previousRole")
SELECT 'role-recovery-user-' || "id", 'User', "id", "id", "role"::text FROM "User";

INSERT INTO "RoleRecoveryBackup" ("id", "sourceTable", "sourceId", "userId", "previousRole")
SELECT 'role-recovery-user-role-' || "id", 'UserRole', "id", "userId", "role"::text FROM "UserRole";

CREATE TYPE "Role_legacy" AS ENUM ('SUPER_USER', 'CONTRACTOR', 'PROVIDER');

CREATE FUNCTION role_recovery_target(user_id TEXT, previous_role TEXT)
RETURNS "Role_legacy" AS $$
BEGIN
  IF previous_role = 'SUPER_USER' THEN RETURN 'SUPER_USER'::"Role_legacy"; END IF;
  IF EXISTS (SELECT 1 FROM "RetailerProfile" profile WHERE profile."userId" = user_id AND btrim(profile."categories") <> '') THEN
    RETURN 'PROVIDER'::"Role_legacy";
  END IF;
  RETURN 'CONTRACTOR'::"Role_legacy";
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_legacy"
  USING role_recovery_target("id", "role"::text);

ALTER TABLE "UserRole"
  ALTER COLUMN "role" TYPE "Role_legacy"
  USING role_recovery_target("userId", "role"::text);

DROP TYPE "Role";
ALTER TYPE "Role_legacy" RENAME TO "Role";
DROP FUNCTION role_recovery_target(TEXT, TEXT);