CREATE TYPE "IndependentReviewStatus" AS ENUM ('NOT_PURCHASED', 'PURCHASED', 'APPROVED', 'DECLINED');

ALTER TABLE "RetailerProfile"
  ADD COLUMN "independentReviewStatus" "IndependentReviewStatus" NOT NULL DEFAULT 'NOT_PURCHASED',
  ADD COLUMN "independentReviewPurchasedAt" TIMESTAMP(3),
  ADD COLUMN "independentReviewDecidedAt" TIMESTAMP(3),
  ADD COLUMN "independentReviewNote" TEXT;
