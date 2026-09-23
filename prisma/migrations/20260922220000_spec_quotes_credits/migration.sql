-- Specified line attributes, unit-rate quote lines, attested launch credits.
ALTER TABLE "RetailerProfile" ADD COLUMN IF NOT EXISTS "launchCreditsExpireAt" TIMESTAMP(3);
ALTER TABLE "RetailerProfile" ADD COLUMN IF NOT EXISTS "launchCreditsReason" TEXT;
UPDATE "RetailerProfile"
SET "launchCreditsExpireAt" = NOW() + INTERVAL '90 days',
    "launchCreditsReason" = COALESCE("launchCreditsReason", 'Legacy grant')
WHERE "launchCreditsLeft" > 0 AND "launchCreditsExpireAt" IS NULL;

ALTER TABLE "TenderItem" ADD COLUMN IF NOT EXISTS "specJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "TenderPackage" ADD COLUMN IF NOT EXISTS "specJson" TEXT NOT NULL DEFAULT '{}';

ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "unitRateGbp" DOUBLE PRECISION;
ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "quantityValue" DOUBLE PRECISION;
ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "pricingKind" TEXT NOT NULL DEFAULT 'LUMP';
