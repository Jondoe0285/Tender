-- Persist verification PDFs on the private object store instead of Postgres.

ALTER TABLE "VerificationDocument" ADD COLUMN IF NOT EXISTS "objectKey" TEXT;
ALTER TABLE "VerificationDocument" ALTER COLUMN "content" DROP NOT NULL;
