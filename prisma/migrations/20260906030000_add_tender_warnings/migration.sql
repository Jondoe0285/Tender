CREATE TABLE "TenderWarning" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderWarning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenderWarning_recipientId_active_createdAt_idx" ON "TenderWarning"("recipientId", "active", "createdAt");
CREATE INDEX "TenderWarning_tenderId_createdAt_idx" ON "TenderWarning"("tenderId", "createdAt");

ALTER TABLE "TenderWarning" ADD CONSTRAINT "TenderWarning_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderWarning" ADD CONSTRAINT "TenderWarning_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderWarning" ADD CONSTRAINT "TenderWarning_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;