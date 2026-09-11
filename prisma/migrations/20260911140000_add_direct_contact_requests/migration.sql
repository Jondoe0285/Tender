ALTER TYPE "PaymentType" ADD VALUE 'DIRECT_CONTACT';

CREATE TABLE "DirectContactRequest" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "paymentId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DirectContactRequest_paymentId_key" ON "DirectContactRequest"("paymentId");
CREATE UNIQUE INDEX "DirectContactRequest_tenderId_requesterId_key" ON "DirectContactRequest"("tenderId", "requesterId");
CREATE INDEX "DirectContactRequest_tenderId_releasedAt_idx" ON "DirectContactRequest"("tenderId", "releasedAt");
CREATE INDEX "DirectContactRequest_requesterId_createdAt_idx" ON "DirectContactRequest"("requesterId", "createdAt");

ALTER TABLE "DirectContactRequest" ADD CONSTRAINT "DirectContactRequest_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectContactRequest" ADD CONSTRAINT "DirectContactRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectContactRequest" ADD CONSTRAINT "DirectContactRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;