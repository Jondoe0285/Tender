-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "independentReviewTier" "IndependentReviewTier";

-- AlterTable
ALTER TABLE "RetailerProfile" ADD COLUMN "independentReviewPurchasedPaymentId" TEXT,
ADD COLUMN "independentReviewPurchasedTier" "IndependentReviewTier";

-- CreateIndex
CREATE INDEX "RetailerProfile_independentReviewPurchasedPaymentId_idx" ON "RetailerProfile"("independentReviewPurchasedPaymentId");

-- AddForeignKey
ALTER TABLE "RetailerProfile" ADD CONSTRAINT "RetailerProfile_independentReviewPurchasedPaymentId_fkey" FOREIGN KEY ("independentReviewPurchasedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
