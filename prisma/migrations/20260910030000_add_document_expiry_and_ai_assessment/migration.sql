ALTER TABLE "VerificationDocument" ADD COLUMN "expiryDate" TIMESTAMP(3);
UPDATE "VerificationDocument" SET "expiryDate" = CURRENT_TIMESTAMP + INTERVAL '1 day' WHERE "expiryDate" IS NULL;
ALTER TABLE "VerificationDocument" ALTER COLUMN "expiryDate" SET NOT NULL;

ALTER TABLE "VerificationDocument"
  ADD COLUMN "aiConfidencePercent" INTEGER,
  ADD COLUMN "aiSummary" TEXT,
  ADD COLUMN "aiRequiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiAssessedAt" TIMESTAMP(3),
  ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RetailerProfile"
  ADD COLUMN "verificationConfidencePercent" INTEGER,
  ADD COLUMN "verificationReport" TEXT;
