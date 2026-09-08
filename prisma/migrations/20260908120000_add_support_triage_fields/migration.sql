ALTER TYPE "SupportRequestStatus" ADD VALUE 'INFORMATION_REQUESTED';
ALTER TABLE "SupportRequest" ADD COLUMN "triageCategory" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "escalationLevel" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "informationRequestedAt" TIMESTAMP(3);