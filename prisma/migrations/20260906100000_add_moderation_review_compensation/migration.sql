ALTER TABLE "ModerationEvent" ADD COLUMN "reviewOutcome" TEXT;
ALTER TABLE "ModerationEvent" ADD COLUMN "compensationAwardedAt" TIMESTAMP(3);
ALTER TABLE "ModerationEvent" ADD COLUMN "compensationCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ModerationEvent" ADD COLUMN "compensationType" TEXT;