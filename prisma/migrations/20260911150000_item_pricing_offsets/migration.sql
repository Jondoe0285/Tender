ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "key" TEXT;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "service" TEXT;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "item" TEXT;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "automaticOffsetPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "manualOffsetPercent" DOUBLE PRECISION;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "offsetMode" TEXT NOT NULL DEFAULT 'AUTOMATIC';

UPDATE "QuoteEstimateBaseline"
SET "key" = "category",
    "service" = "category";

ALTER TABLE "QuoteEstimateBaseline" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "QuoteEstimateBaseline" ALTER COLUMN "service" SET NOT NULL;

DROP INDEX IF EXISTS "QuoteEstimateBaseline_category_key";
CREATE UNIQUE INDEX "QuoteEstimateBaseline_key_key" ON "QuoteEstimateBaseline"("key");
CREATE INDEX "QuoteEstimateBaseline_service_category_idx" ON "QuoteEstimateBaseline"("service", "category");