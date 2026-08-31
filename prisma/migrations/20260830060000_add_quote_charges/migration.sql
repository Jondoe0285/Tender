-- CreateTable
CREATE TABLE "QuoteCharge" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceGbp" INTEGER NOT NULL,

    CONSTRAINT "QuoteCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteCharge_quoteId_idx" ON "QuoteCharge"("quoteId");

-- AddForeignKey
ALTER TABLE "QuoteCharge" ADD CONSTRAINT "QuoteCharge_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: free-text additionalCharges is replaced by priced QuoteCharge rows.
ALTER TABLE "Quote" DROP COLUMN "additionalCharges";
