ALTER TABLE "ClientCompany" ADD COLUMN "branchIdentifier" TEXT;

UPDATE "ClientCompany"
SET "branchIdentifier" = 'Head Office - ' || right("id", 12)
WHERE "branchIdentifier" IS NULL;

ALTER TABLE "ClientCompany"
  ALTER COLUMN "branchIdentifier" SET NOT NULL,
  ALTER COLUMN "branchIdentifier" SET DEFAULT 'Head Office';

CREATE UNIQUE INDEX "ClientCompany_companyName_branchIdentifier_key"
  ON "ClientCompany"("companyName", "branchIdentifier");