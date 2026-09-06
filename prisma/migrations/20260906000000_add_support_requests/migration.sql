CREATE TYPE "SupportRequestType" AS ENUM ('SUPPORT', 'CHANGE', 'PAYMENT', 'DATA_PRIVACY');
CREATE TYPE "SupportRequestStatus" AS ENUM ('SUBMITTED', 'TRIAGED', 'APPROVED', 'REJECTED', 'RESOLVED');

CREATE TABLE "SupportRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "type" "SupportRequestType" NOT NULL,
  "status" "SupportRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportRequest_requesterId_createdAt_idx" ON "SupportRequest"("requesterId", "createdAt");
CREATE INDEX "SupportRequest_status_type_createdAt_idx" ON "SupportRequest"("status", "type", "createdAt");
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;