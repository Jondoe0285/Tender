ALTER TABLE "ClientCompany" ADD COLUMN "tradeTenderId" TEXT;

UPDATE "ClientCompany"
SET "tradeTenderId" = 'TT-CL-' || upper(substr("id", -10))
WHERE "tradeTenderId" IS NULL;

CREATE UNIQUE INDEX "ClientCompany_tradeTenderId_key" ON "ClientCompany"("tradeTenderId");
