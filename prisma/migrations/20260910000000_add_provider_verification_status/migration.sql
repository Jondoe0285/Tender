CREATE TYPE "ProviderVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "RetailerProfile"
  ADD COLUMN "verificationStatus" "ProviderVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verificationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "verificationDecidedAt" TIMESTAMP(3),
  ADD COLUMN "verificationNote" TEXT;
