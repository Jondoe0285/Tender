-- TEST ENVIRONMENT ONLY: realign the temporary legacy role recovery with the current USER-role application.
CREATE TYPE "Role_user" AS ENUM ('SUPER_USER', 'USER');

DELETE FROM "UserRole" duplicate_role
USING "UserRole" retained_role
WHERE duplicate_role."userId" = retained_role."userId"
  AND duplicate_role."id" > retained_role."id";

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_user"
  USING CASE WHEN "role"::text = 'SUPER_USER' THEN 'SUPER_USER'::"Role_user" ELSE 'USER'::"Role_user" END;

ALTER TABLE "UserRole"
  ALTER COLUMN "role" TYPE "Role_user"
  USING CASE WHEN "role"::text = 'SUPER_USER' THEN 'SUPER_USER'::"Role_user" ELSE 'USER'::"Role_user" END;

DROP TYPE "Role";
ALTER TYPE "Role_user" RENAME TO "Role";