ALTER TYPE "PaymentType" ADD VALUE 'PROFESSIONAL_INTEREST';

ALTER TABLE "ProfessionalInterest" ADD COLUMN "paymentId" TEXT;

CREATE UNIQUE INDEX "ProfessionalInterest_paymentId_key" ON "ProfessionalInterest"("paymentId");

ALTER TABLE "ProfessionalInterest" ADD CONSTRAINT "ProfessionalInterest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
