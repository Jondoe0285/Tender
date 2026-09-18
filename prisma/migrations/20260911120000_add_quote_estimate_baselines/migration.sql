CREATE TABLE "QuoteEstimateBaseline" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baselineGbp" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "effectiveWeekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteEstimateBaseline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuoteEstimateBaseline_category_key" ON "QuoteEstimateBaseline"("category");
CREATE INDEX "QuoteEstimateBaseline_effectiveWeekStart_idx" ON "QuoteEstimateBaseline"("effectiveWeekStart");
CREATE INDEX "QuoteEstimateBaseline_reviewedAt_idx" ON "QuoteEstimateBaseline"("reviewedAt");