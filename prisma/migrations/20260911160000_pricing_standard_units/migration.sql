ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "standardUnit" TEXT NOT NULL DEFAULT 'unit';
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "standardUnitSize" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "QuoteEstimateBaseline" ADD COLUMN "observedUnitPriceGbp" DOUBLE PRECISION;