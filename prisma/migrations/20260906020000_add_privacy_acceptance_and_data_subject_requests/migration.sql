ALTER TABLE "User"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyVersion" TEXT;

CREATE TYPE "DataSubjectRequestRight" AS ENUM ('ACCESS_EXPORT', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'OBJECTION');

ALTER TABLE "SupportRequest"
  ADD COLUMN "dataSubjectRight" "DataSubjectRequestRight",
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "resolutionEvidence" TEXT;

CREATE INDEX "SupportRequest_dataSubjectRight_dueAt_idx" ON "SupportRequest"("dataSubjectRight", "dueAt");

ALTER TABLE "SupportRequest"
  ADD CONSTRAINT "SupportRequest_data_subject_right_check"
  CHECK (("type" = 'DATA_PRIVACY') = ("dataSubjectRight" IS NOT NULL));