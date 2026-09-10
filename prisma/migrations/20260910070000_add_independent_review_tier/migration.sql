CREATE TYPE "IndependentReviewTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

ALTER TABLE "RetailerProfile" ADD COLUMN "independentReviewTier" "IndependentReviewTier";