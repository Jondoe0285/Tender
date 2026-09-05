CREATE TABLE "ProfessionalInterest" (
  "id" TEXT NOT NULL,
  "tenderId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "interestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "ProfessionalInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalInterest_tenderId_retailerId_key" ON "ProfessionalInterest"("tenderId", "retailerId");
CREATE INDEX "ProfessionalInterest_tenderId_releasedAt_idx" ON "ProfessionalInterest"("tenderId", "releasedAt");
ALTER TABLE "ProfessionalInterest" ADD CONSTRAINT "ProfessionalInterest_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalInterest" ADD CONSTRAINT "ProfessionalInterest_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;