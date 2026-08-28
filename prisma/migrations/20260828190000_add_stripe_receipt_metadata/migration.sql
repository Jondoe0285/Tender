ALTER TABLE "Payment" ADD COLUMN "stripeEventId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "stripeReceiptUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "accountingRecordPath" TEXT;
CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");
