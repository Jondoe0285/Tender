CREATE TABLE "PaymentWaiver" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feeType" "PaymentType" NOT NULL,
  "reason" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "PaymentWaiver_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD COLUMN "paymentWaiverId" TEXT;
CREATE INDEX "Payment_paymentWaiverId_idx" ON "Payment"("paymentWaiverId");
CREATE INDEX "PaymentWaiver_userId_feeType_revokedAt_expiresAt_idx" ON "PaymentWaiver"("userId", "feeType", "revokedAt", "expiresAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentWaiverId_fkey" FOREIGN KEY ("paymentWaiverId") REFERENCES "PaymentWaiver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWaiver" ADD CONSTRAINT "PaymentWaiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWaiver" ADD CONSTRAINT "PaymentWaiver_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWaiver" ADD CONSTRAINT "PaymentWaiver_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;