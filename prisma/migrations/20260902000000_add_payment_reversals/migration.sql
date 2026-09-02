-- Preserve the checkout-session value previously stored in the misnamed Payment Intent column.
ALTER TABLE "Payment" ADD COLUMN "stripeCheckoutSessionId" TEXT;
UPDATE "Payment"
SET "stripeCheckoutSessionId" = "stripePaymentIntentId"
WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

CREATE TYPE "PaymentReversalType" AS ENUM ('REFUND', 'DISPUTE');

CREATE TABLE "PaymentReversal" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "type" "PaymentReversalType" NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "providerObjectId" TEXT,
  "reversedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentReversal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentReversal_stripeEventId_key" ON "PaymentReversal"("stripeEventId");
CREATE INDEX "PaymentReversal_paymentId_reversedAt_idx" ON "PaymentReversal"("paymentId", "reversedAt");
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;